import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { MAKE_VIDEO_MODE } from '../constants/index.js';
import { GPU_INFO } from '../utils/hardware.util.js';
import { OVERLAY_OPTIONS } from '../constants/overlayOptions.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { unlinkProgressSidecarForSpreadsheet } from '../syncProgressToSpreadsheet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CHANNELS_DIR = resolveChannelsDir();

const DOWNLOADS_DIR = path.join(ROOT, 'downloads');

/** Re-export để code cũ `import { OVERLAY_OPTIONS } from './makeVideoFromFull.js'` vẫn dùng được. */
export { OVERLAY_OPTIONS };

function overlaySubdirFromOptionName(name) {
  if (!name || typeof name !== 'string') return 'default';
  const s = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return s || 'default';
}

function opacityOrDefault(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Zoom trung tâm + cắt 4 phía trên video gốc (input 0) trước khi overlay.
 * 0 = tắt. Ví dụ 10 ≈ phóng to rồi cắt ~10% mỗi phía; giới hạn 0–49.
 * Truyền qua `main({ VIDEO_CROP_PERCENT })` hoặc `videoCropPercent` (mặc định 0).
 */
export function normalizeVideoCropPercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(49, Math.max(0, Math.floor(n)));
}

/**
 * @param {string} [overlayKey] - Mặc định "Option 1"
 * @returns {{ opt: object, dir: string, imageOpacity: number, videoOpacity: number, cacheDir: string }}
 */
export function resolveOverlayByName(overlayKey) {
  if (!OVERLAY_OPTIONS.length) {
    throw new Error('OVERLAY_OPTIONS không được rỗng.');
  }
  const key = overlayKey != null && String(overlayKey).trim() !== '' ? String(overlayKey).trim() : 'Option 1';
  const opt = OVERLAY_OPTIONS.find(o => String(o.NAME).trim() === key);
  if (!opt) {
    const names = OVERLAY_OPTIONS.map(o => `"${o.NAME}"`).join(', ');
    throw new Error(`Không tìm thấy overlay "${key}". Các NAME hợp lệ: ${names}`);
  }
  const dir = path.join(ROOT, 'assets', 'overlay', overlaySubdirFromOptionName(opt.NAME));
  return {
    opt,
    dir,
    imageOpacity: opacityOrDefault(opt.IMAGE_OVERLAY_OPACITY, 0.5),
    videoOpacity: opacityOrDefault(opt.VIDEO_OVERLAY_OPACITY, 0.5),
    cacheDir: path.join(dir, '.cache'),
  };
}

/**
 * Lấy resolution (width × height) của video bằng ffprobe.
 * Dùng để scale overlay chính xác thay vì scale2ref mỗi frame.
 */
function getVideoResolution(filePath) {
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`;
    const result = execSync(cmd, { encoding: 'utf-8' }).trim();
    const [w, h] = result.split('x').map(Number);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    // fallback
  }
  return { width: 1920, height: 1080 };
}

function ensureOverlayDirs(overlayDir, overlayCacheDir) {
  if (!fs.existsSync(overlayDir)) {
    fs.mkdirSync(overlayDir, { recursive: true });
  }
  if (!fs.existsSync(overlayCacheDir)) {
    fs.mkdirSync(overlayCacheDir, { recursive: true });
  }
}

/**
 * Pre-process ảnh overlay: scale đúng WxH + nhân sẵn alpha → lưu cache PNG.
 * Lần sau cùng resolution + opacity + ảnh gốc → dùng lại, không cần tính lại mỗi frame.
 * Trả về đường dẫn file cache (RGBA PNG, đã baked alpha).
 */
function getPreprocessedImageOverlay(imagePath, width, height, opacity, overlayCacheDir) {
  const srcStat = fs.statSync(imagePath);
  const cacheKey = `img_${path.parse(imagePath).name}_${width}x${height}_a${Math.round(opacity * 100)}_${srcStat.mtimeMs}`;
  const cachePath = path.join(overlayCacheDir, `${cacheKey}.png`);

  if (fs.existsSync(cachePath)) {
    console.log(`Dùng cache ảnh overlay: ${path.basename(cachePath)}`);
    return cachePath;
  }

  console.log(`Pre-processing ảnh overlay → ${width}x${height}, alpha=${opacity}...`);
  try {
    execSync(
      `ffmpeg -hide_banner -loglevel error -y -i "${imagePath}" -vf "scale=${width}:${height},format=rgba,colorchannelmixer=aa=${opacity}" -frames:v 1 "${cachePath}"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    console.log(`Đã tạo cache: ${path.basename(cachePath)}`);
  } catch (err) {
    console.warn('Không tạo được cache ảnh overlay, dùng pipeline cũ:', err.message);
    return null;
  }
  return cachePath;
}

/**
 * Pre-process video overlay: scale đúng WxH + nhân sẵn alpha → lưu cache ProRes 4444 (giữ alpha).
 * Video overlay là clip loop ngắn, chỉ xử lý 1 lần rồi dùng lại cho toàn bộ video dài.
 * Giảm ~30-40% thời gian render vì không cần scale+format+colorchannelmixer mỗi frame.
 */
function getPreprocessedVideoOverlay(videoPath, width, height, opacity, overlayCacheDir) {
  const srcStat = fs.statSync(videoPath);
  const cacheKey = `vid_${path.parse(videoPath).name}_${width}x${height}_a${Math.round(opacity * 100)}_${srcStat.mtimeMs}`;
  const cachePath = path.join(overlayCacheDir, `${cacheKey}.mov`);

  if (fs.existsSync(cachePath)) {
    console.log(`Dùng cache video overlay: ${path.basename(cachePath)}`);
    return cachePath;
  }

  console.log(`Pre-processing video overlay → ${width}x${height}, alpha=${opacity}...`);
  try {
    execSync(
      `ffmpeg -hide_banner -loglevel error -y -i "${videoPath}" -vf "scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${opacity}" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${cachePath}"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    console.log(`Đã tạo cache video overlay: ${path.basename(cachePath)}`);
  } catch (err) {
    console.warn('Không tạo được cache video overlay, dùng pipeline cũ:', err.message);
    return null;
  }
  return cachePath;
}

function getFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => exts.some(ext => f.toLowerCase().endsWith(ext)))
    .map(f => path.join(dir, f));
}

function sanitizeFilename(name) {
  if (!name) return '';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

async function remakeVideo(videoPath, imagePath, overlayVideoPath, outputPath, overlayRender) {
  const { imageOpacity, videoOpacity, overlayCacheDir, videoCropPercent = 0 } = overlayRender;
  return new Promise((resolve, reject) => {
    const encoderLabel = GPU_INFO.encoderLabel;
    console.log(`\nĐang xử lý: ${path.basename(videoPath)}`);
    console.log(`Encoder: ${encoderLabel}`);
    console.log(`Ảnh phủ (dưới, opacity ${imageOpacity}): ${path.basename(imagePath)}`);
    console.log(`Video phủ (trên, loop, opacity ${videoOpacity}): ${path.basename(overlayVideoPath)}`);

    const src = getVideoResolution(videoPath);
    const maxH = overlayRender.outputHeight ?? 720;
    // Tính effective output resolution: scale xuống nếu source cao hơn maxH
    const outH = src.height > maxH ? maxH : src.height;
    const outW = src.height > maxH ? Math.round((src.width * maxH) / src.height / 2) * 2 : src.width;
    const width = outW;
    const height = outH;
    if (src.height > maxH) {
      console.log(`[OPT-5] Downscale ${src.width}x${src.height} → ${outW}x${outH} (outputHeight=${maxH})`);
    }

    // [A] Pre-process ảnh overlay: scale + alpha 1 lần, dùng cache
    const cachedImage = getPreprocessedImageOverlay(imagePath, width, height, imageOpacity, overlayCacheDir);
    const useImageCache = cachedImage != null;

    // [OPT-1] Pre-process video overlay: scale + alpha 1 lần, dùng cache (giảm ~30-40% render)
    const cachedVideo = getPreprocessedVideoOverlay(overlayVideoPath, width, height, videoOpacity, overlayCacheDir);
    const useVideoCache = cachedVideo != null;

    // Scale xuống trước khi crop/overlay nếu source lớn hơn target
    const needsDownscale = src.height > maxH;
    const scaleStep = needsDownscale ? `[0:v]scale=${outW}:${outH}[v_ds];` : '';
    const baseInput = needsDownscale ? '[v_ds]' : '[0:v]';

    const p = videoCropPercent;
    const inner = 100 - 2 * p;
    const headCrop =
      p > 0 && inner > 0 ? `${baseInput}scale=iw*100/${inner}:ih*100/${inner},crop=iw*${inner}/100:ih*${inner}/100[v0];` : '';
    const vid0 = p > 0 && inner > 0 ? '[v0]' : baseInput;
    if (p > 0) {
      console.log(`Video gốc: zoom + crop ${p}% mỗi phía (4 phía), đầu ra ${width}x${height}.`);
    }

    // [A] Ảnh đã baked alpha → chỉ overlay thuần, không scale/format/colorchannelmixer mỗi frame
    const imgFilter = useImageCache
      ? `${vid0}[1:v]overlay=0:0[base1];`
      : `[1:v]scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${imageOpacity}[timg];` + `${vid0}[timg]overlay=0:0[base1];`;

    // [OPT-1] Video overlay đã baked alpha → chỉ overlay thuần, bỏ scale/format/colorchannelmixer mỗi frame
    const vidOverlayFilter = useVideoCache
      ? `[base1][2:v]overlay=0:0:shortest=1,format=yuv420p[outv]`
      : `[2:v]scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${videoOpacity}[ova];` +
        `[base1][ova]overlay=0:0:shortest=1,format=yuv420p[outv]`;

    const filterComplex = scaleStep + headCrop + imgFilter + vidOverlayFilter;

    // [OPT-3] Dùng -hwaccel auto: cho FFmpeg tự chọn HW decode tối ưu, không đổi filter graph
    const args = ['-y', '-hwaccel', 'auto', '-threads', '0'];

    args.push(
      '-i',
      videoPath,
      '-i',
      useImageCache ? cachedImage : imagePath,
      '-stream_loop',
      '-1',
      '-i',
      useVideoCache ? cachedVideo : overlayVideoPath,
      '-filter_complex',
      filterComplex,
      '-map',
      '[outv]',
      '-map',
      '0:a?',
      '-shortest',
    );

    // [OPT-4] Dùng encode args giảm bitrate cho reup (video đã overlay, không cần bitrate cao)
    args.push(...GPU_INFO.reupVideoEncodeArgs);

    args.push('-c:a', 'copy', '-movflags', '+faststart', '-f', 'mp4', outputPath);

    console.log(`[OPT] Image cache: ${useImageCache ? 'YES' : 'no'} | Video cache: ${useVideoCache ? 'YES' : 'no'} | HW decode: auto`);

    const ffmpeg = spawn('ffmpeg', args, { stdio: 'inherit' });

    ffmpeg.on('close', code => {
      if (code === 0) {
        console.log(`=> Hoàn thành: ${path.basename(outputPath)}`);
        resolve();
      } else {
        console.error(`Lỗi tạo video (mã thoát: ${code})`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

async function main(options = {}) {
  const inputFile = options.inputFile || null;
  const items = options.items || [];

  if (items.length === 0) {
    console.log('Không có items để xử lý batch.');
    return { success: false, processedCount: 0, processedFolderNames: [] };
  }

  /** Tên thư mục con trong kênh (video ID), theo thứ tự tạo thành công — dùng cho upload GPM. */
  const processedFolderNames = [];

  const overlayResolved = resolveOverlayByName(options.overlay);

  const { dir: OVERLAY_DIR, imageOpacity, videoOpacity, cacheDir: overlayCacheDir } = overlayResolved;
  ensureOverlayDirs(OVERLAY_DIR, overlayCacheDir);

  const videoCropPercent = normalizeVideoCropPercent(options.videoCropPercent);
  if (videoCropPercent > 0) {
    console.log(`[crop] VIDEO_CROP_PERCENT=${videoCropPercent}`);
  }

  const outputHeight = Number(options.outputHeight) || 720;
  console.log(`[OPT-5] outputHeight=${outputHeight} (giảm resolution để tăng tốc encode)`);

  const overlayRender = { imageOpacity, videoOpacity, overlayCacheDir, videoCropPercent, outputHeight };

  const { downloadSingleVideo } = await import('../video-info/downloadVideo.js');

  // Tìm file thực tế được dùng để lấy thư mục đích (folder channel)
  const actualInputFile = inputFile;
  let destFolder = CHANNELS_DIR;
  if (actualInputFile) {
    destFolder = path.dirname(actualInputFile);
  }

  const progressFile = actualInputFile
    ? actualInputFile.replace(/\.(xlsx|csv)$/, '_progress.json')
    : path.join(CHANNELS_DIR, 'progress.json');

  let progressData = {};
  if (fs.existsSync(progressFile)) {
    try {
      progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    } catch (e) {}
  }

  /** @type {{ syncProgressStatusToSpreadsheet?: (f: string, d: object) => Promise<void> } | null} */
  let syncProgressModule = null;
  async function flushProgressToSpreadsheet() {
    if (!actualInputFile) return;
    try {
      if (!syncProgressModule) {
        syncProgressModule = await import('../syncProgressToSpreadsheet.js');
      }
      await syncProgressModule.syncProgressStatusToSpreadsheet(actualInputFile, progressData);
    } catch (e) {
      console.warn('[sync] Đồng bộ STATUS → Excel/CSV:', e.message);
    }
  }

  const images = getFiles(OVERLAY_DIR, ['.png', '.jpg', '.jpeg', '.webp']);
  const overlayVideos = getFiles(OVERLAY_DIR, ['.mp4', '.webm', '.mov', '.mkv']);

  if (images.length === 0 || overlayVideos.length === 0) {
    throw new Error(`Cần ít nhất 1 ảnh và 1 video overlay trong ${OVERLAY_DIR}`);
  }

  const overlayImage = images[0];
  const overlayClip = overlayVideos[0];

  /** Metadata Gemini theo URL (callback downloadTranscript) — ghi vào video-meta.json sau render */
  const geminiByUrl = {};

  /** Thư mục cho 1 video: destFolder/<videoID> */
  function resolveVideoOutputDir(videoId) {
    const base = videoId || 'unknown_id';
    const dir = path.join(destFolder, base);
    return dir;
  }

  for (let i = 0; i < items.length; i++) {
    const { url } = items[i];
    console.log(`\n[${i + 1}/${items.length}] ${url} (Remake Full)`);

    const result = await downloadSingleVideo(url, {
      mode: MAKE_VIDEO_MODE.REUP_FULL, // Tải cả video
      thumbnailChannelRoot: destFolder,
      thumbnailPrompt: options.thumbnailPrompt,
      downloadMaxHeight: outputHeight,
      callback: ({ title: gemTitle, description: gemDesc, tags: gemTags, summary: gemSummary }) => {
        const tagsStr = typeof gemTags === 'string' ? gemTags : Array.isArray(gemTags) ? gemTags.join(', ') : '';
        geminiByUrl[url] = {
          title: gemTitle || '',
          description: gemDesc || '',
          tags: tagsStr,
          summary: gemSummary || '',
        };
        console.log('Đã nhận title/description/tags/summary từ Gemini (sẽ ghi video-meta.json sau khi render).');
      },
    });

    if (result) {
      const videoId = result.metadata?.id || 'unknown_id';
      const perVideoDir = resolveVideoOutputDir(videoId);
      fs.mkdirSync(perVideoDir, { recursive: true });

      const videoPath = result.filePath;
      if (!fs.existsSync(videoPath)) {
        console.error(`Không tìm thấy file video đã tải: ${videoPath}`);
        continue;
      }

      const baseName = sanitizeFilename(result.title || path.basename(videoPath, path.extname(videoPath)));
      const finalVideoPath = path.join(perVideoDir, `${baseName}.mp4`);

      try {
        await remakeVideo(videoPath, overlayImage, overlayClip, finalVideoPath, overlayRender);

        // Thumbnail YouTube (downloads) → thumbnail.{ext}; Flow → flow-thumbnail.jpg (cùng tồn tại)
        if (fs.existsSync(DOWNLOADS_DIR)) {
          const downloadFiles = fs.readdirSync(DOWNLOADS_DIR);
          const thumbFile = downloadFiles.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
          if (thumbFile) {
            const thumbExt = path.extname(thumbFile);
            const thumbDestPath = path.join(perVideoDir, `thumbnail${thumbExt}`);
            fs.copyFileSync(path.join(DOWNLOADS_DIR, thumbFile), thumbDestPath);
            console.log(`>>> Đã copy thumbnail YouTube: ${thumbDestPath}`);
          }
        }
        const flowThumbJpg = path.join(perVideoDir, 'flow-thumbnail.jpg');
        if (fs.existsSync(flowThumbJpg)) {
          console.log(`>>> Đã có thumbnail Flow: ${flowThumbJpg}`);
        }

        // Lưu metadata
        let gem = geminiByUrl[url] || {};
        const metaPayload = {
          title: result.title || '',
          description: result.description || '',
          tags: Array.isArray(result.tags) ? result.tags.join(', ') : result.tags || '',
          titleGemini: gem.title || '',
          descriptionGemini: gem.description || '',
          tagsGemini: gem.tags || '',
          summaryGemini: gem.summary || '',
        };
        const metaPath = path.join(perVideoDir, 'video-meta.json');
        fs.writeFileSync(metaPath, JSON.stringify(metaPayload, null, 2), 'utf8');

        progressData[url] = { status: 'Đã tạo video' };
        fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf8');
        await flushProgressToSpreadsheet();

        console.log(`ĐÃ HOÀN THÀNH VIDEO: ${url}`);
        processedFolderNames.push(String(videoId).trim() || 'unknown_id');
      } catch (err) {
        console.error('Lỗi remake video:', err.message);
      } finally {
        // Xóa file tạm trong downloads để video tiếp theo không bị lẫn
        if (fs.existsSync(DOWNLOADS_DIR)) {
          const files = fs.readdirSync(DOWNLOADS_DIR);
          for (const f of files) {
            try {
              fs.unlinkSync(path.join(DOWNLOADS_DIR, f));
            } catch (e) {}
          }
        }
      }
    }
  }

  await flushProgressToSpreadsheet();
  unlinkProgressSidecarForSpreadsheet(actualInputFile);

  console.log(`\nHoàn thành xử lý ${items.length} video.`);

  return {
    success: processedFolderNames.length > 0,
    processedCount: processedFolderNames.length,
    processedFolderNames,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.error('makeVideoFromFull: chỉ chạy qua batch — dùng npm run tao-batch-video-reup-full (createBatchVideo).');
  process.exit(1);
}

export default main;

