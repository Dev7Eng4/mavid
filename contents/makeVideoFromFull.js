import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { MAKE_VIDEO_MODE } from './constants/index.js';
import { GPU_INFO } from './utils/hardware.util.js';
import { OVERLAY_OPTIONS } from './constants/overlayOptions.js';
import { resolveChannelsDir } from './utils/channelsStoragePath.js';
import { unlinkProgressSidecarForSpreadsheet } from './syncProgressToSpreadsheet.js';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CHANNELS_DIR = resolveChannelsDir();
const DOWNLOADS_DIR = path.join(ROOT, 'downloads');

/** Re-export để code cũ `import { OVERLAY_OPTIONS } from './makeVideoFromFull.js'` vẫn dùng được. */
export { OVERLAY_OPTIONS };

// ---------------------------------------------------------------------------
// Concurrency limit (số video encode song song). Mặc định 2 để cân bằng
// GPU/CPU + I/O. Có thể override qua env REMAKE_CONCURRENCY=3.
// ---------------------------------------------------------------------------
const REMAKE_CONCURRENCY = Math.max(1, parseInt(process.env.REMAKE_CONCURRENCY ?? '2', 10));

/**
 * Giới hạn số Promise chạy đồng thời (thay thế p-limit không cần thêm dep).
 * @param {number} concurrency
 * @returns {(fn: () => Promise<any>) => Promise<any>}
 */
function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return fn =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

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
 * FIX #7: Warn rõ ràng nếu fallback, tránh silent render sai resolution.
 */
async function getVideoResolution(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=s=x:p=0',
      filePath,
    ]);
    const [w, h] = stdout.trim().split('x').map(Number);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    // fallback bên dưới
  }
  console.warn(`⚠️  Không lấy được resolution của "${path.basename(filePath)}", fallback 1920×1080 — kiểm tra lại ffprobe.`);
  return { width: 1920, height: 1080 };
}

function ensureOverlayDirs(overlayDir, overlayCacheDir) {
  fs.mkdirSync(overlayDir, { recursive: true });
  fs.mkdirSync(overlayCacheDir, { recursive: true });
}

/**
 * Pre-process ảnh overlay: scale đúng WxH + nhân sẵn alpha → lưu cache PNG.
 * FIX #2: Dùng execFileAsync (async) thay execSync (blocking event loop).
 */
async function getPreprocessedImageOverlay(imagePath, width, height, opacity, overlayCacheDir) {
  const srcStat = fs.statSync(imagePath);
  const cacheKey = `img_${path.parse(imagePath).name}_${width}x${height}_a${Math.round(opacity * 100)}_${srcStat.mtimeMs}`;
  const cachePath = path.join(overlayCacheDir, `${cacheKey}.png`);

  if (fs.existsSync(cachePath)) {
    console.log(`Dùng cache ảnh overlay: ${path.basename(cachePath)}`);
    return cachePath;
  }

  console.log(`Pre-processing ảnh overlay → ${width}x${height}, alpha=${opacity}...`);
  try {
    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      imagePath,
      '-vf',
      `scale=${width}:${height},format=rgba,colorchannelmixer=aa=${opacity}`,
      '-frames:v',
      '1',
      cachePath,
    ]);
    console.log(`Đã tạo cache: ${path.basename(cachePath)}`);
  } catch (err) {
    console.warn('Không tạo được cache ảnh overlay, dùng pipeline cũ:', err.message);
    return null;
  }
  return cachePath;
}

/**
 * Pre-process video overlay: scale đúng WxH + nhân sẵn alpha → lưu cache ProRes 4444.
 * FIX #2: Dùng execFileAsync (async) thay execSync (blocking event loop).
 */
async function getPreprocessedVideoOverlay(videoPath, width, height, opacity, overlayCacheDir) {
  const srcStat = fs.statSync(videoPath);
  const cacheKey = `vid_${path.parse(videoPath).name}_${width}x${height}_a${Math.round(opacity * 100)}_${srcStat.mtimeMs}`;
  const cachePath = path.join(overlayCacheDir, `${cacheKey}.mov`);

  if (fs.existsSync(cachePath)) {
    console.log(`Dùng cache video overlay: ${path.basename(cachePath)}`);
    return cachePath;
  }

  console.log(`Pre-processing video overlay → ${width}x${height}, alpha=${opacity}...`);
  try {
    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      videoPath,
      '-vf',
      `scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${opacity}`,
      '-c:v',
      'prores_ks',
      '-profile:v',
      '4444',
      '-pix_fmt',
      'yuva444p10le',
      cachePath,
    ]);
    console.log(`Đã tạo cache video overlay: ${path.basename(cachePath)}`);
  } catch (err) {
    console.warn('Không tạo được cache video overlay, dùng pipeline cũ:', err.message);
    return null;
  }
  return cachePath;
}

/**
 * FIX #4: Sort theo tên để đảm bảo deterministic (không phụ thuộc thứ tự filesystem).
 */
function getFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => exts.some(ext => f.toLowerCase().endsWith(ext)))
    .sort()
    .map(f => path.join(dir, f));
}

function sanitizeFilename(name) {
  if (!name) return '';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

async function remakeVideo(videoPath, imagePath, overlayVideoPath, outputPath, overlayRender) {
  const { imageOpacity, videoOpacity, overlayCacheDir, videoCropPercent = 0 } = overlayRender;
  return new Promise(async (resolve, reject) => {
    const encoderLabel = GPU_INFO.encoderLabel;
    console.log(`\nĐang xử lý: ${path.basename(videoPath)}`);
    console.log(`Encoder: ${encoderLabel}`);
    console.log(`Ảnh phủ (dưới, opacity ${imageOpacity}): ${path.basename(imagePath)}`);
    console.log(`Video phủ (trên, loop, opacity ${videoOpacity}): ${path.basename(overlayVideoPath)}`);

    // FIX #2: getVideoResolution nay là async, await bình thường trong async wrapper
    const { width, height } = await getVideoResolution(videoPath);

    const cachedImage = await getPreprocessedImageOverlay(imagePath, width, height, imageOpacity, overlayCacheDir);
    const useImageCache = cachedImage != null;

    const cachedVideo = await getPreprocessedVideoOverlay(overlayVideoPath, width, height, videoOpacity, overlayCacheDir);
    const useVideoCache = cachedVideo != null;

    const p = videoCropPercent;
    const inner = 100 - 2 * p;
    const headCrop = p > 0 && inner > 0 ? `[0:v]scale=iw*100/${inner}:ih*100/${inner},crop=iw*${inner}/100:ih*${inner}/100[v0];` : '';
    const vid0 = p > 0 && inner > 0 ? '[v0]' : '[0:v]';
    if (p > 0) {
      console.log(`Video gốc: zoom + crop ${p}% mỗi phía (4 phía), đầu ra ${width}x${height}.`);
    }

    const imgFilter = useImageCache
      ? `${vid0}[1:v]overlay=0:0[base1];`
      : `[1:v]scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${imageOpacity}[timg];` + `${vid0}[timg]overlay=0:0[base1];`;

    const vidOverlayFilter = useVideoCache
      ? `[base1][2:v]overlay=0:0:shortest=1,format=yuv420p[outv]`
      : `[2:v]scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${videoOpacity}[ova];` +
        `[base1][ova]overlay=0:0:shortest=1,format=yuv420p[outv]`;

    const filterComplex = headCrop + imgFilter + vidOverlayFilter;

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
      '-shortest'
    );

    args.push(...GPU_INFO.reupVideoEncodeArgs);
    args.push('-c:a', 'copy', '-movflags', '+faststart', '-f', 'mp4', outputPath);

    console.log(`[OPT] Image cache: ${useImageCache ? 'YES' : 'no'} | Video cache: ${useVideoCache ? 'YES' : 'no'} | HW decode: auto`);

    const ffmpeg = spawn('ffmpeg', args, { stdio: 'inherit' });

    ffmpeg.on('close', code => {
      if (code === 0) {
        console.log(`=> Hoàn thành: ${path.basename(outputPath)}`);
        resolve();
      } else {
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

  const processedFolderNames = [];

  const overlayResolved = resolveOverlayByName(options.overlay);
  const { dir: OVERLAY_DIR, imageOpacity, videoOpacity, cacheDir: overlayCacheDir } = overlayResolved;
  ensureOverlayDirs(OVERLAY_DIR, overlayCacheDir);

  const videoCropPercent = normalizeVideoCropPercent(options.videoCropPercent);
  if (videoCropPercent > 0) {
    console.log(`[crop] VIDEO_CROP_PERCENT=${videoCropPercent}`);
  }

  const overlayRender = { imageOpacity, videoOpacity, overlayCacheDir, videoCropPercent };

  const { downloadSingleVideo } = await import('./downloadVideo.js');

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
    } catch (_) {}
  }

  // FIX #6: Import 1 lần duy nhất, dùng Promise để tránh double-import race condition
  const syncModulePromise = import('./syncProgressToSpreadsheet.js');

  async function flushProgressToSpreadsheet() {
    if (!actualInputFile) return;
    try {
      const mod = await syncModulePromise;
      await mod.syncProgressStatusToSpreadsheet(actualInputFile, progressData);
    } catch (e) {
      console.warn('[sync] Đồng bộ STATUS → Excel/CSV:', e.message);
    }
  }

  // Mutex nhỏ để ghi progressData + file an toàn khi chạy song song
  let progressLock = Promise.resolve();
  async function updateProgress(url, status, extra = {}) {
    progressLock = progressLock.then(async () => {
      progressData[url] = { status, ...extra };
      fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf8');
      await flushProgressToSpreadsheet();
    });
    return progressLock;
  }

  const images = getFiles(OVERLAY_DIR, ['.png', '.jpg', '.jpeg', '.webp']);
  const overlayVideos = getFiles(OVERLAY_DIR, ['.mp4', '.webm', '.mov', '.mkv']);

  if (images.length === 0 || overlayVideos.length === 0) {
    throw new Error(`Cần ít nhất 1 ảnh và 1 video overlay trong ${OVERLAY_DIR}`);
  }

  const overlayImage = images[0];
  const overlayClip = overlayVideos[0];

  const geminiByUrl = {};

  function resolveVideoOutputDir(videoId) {
    return path.join(destFolder, videoId || 'unknown_id');
  }

  console.log(`\nBắt đầu batch ${items.length} video | concurrency = ${REMAKE_CONCURRENCY}`);

  // FIX #1: Chạy song song với giới hạn concurrency
  const limit = createLimiter(REMAKE_CONCURRENCY);

  const tasks = items.map((item, i) =>
    limit(async () => {
      const { url } = item;
      console.log(`\n[${i + 1}/${items.length}] ${url} (Remake Full)`);

      let result;
      try {
        result = await downloadSingleVideo(url, {
          mode: MAKE_VIDEO_MODE.REUP_FULL,
          thumbnailChannelRoot: destFolder,
          thumbnailPrompt: options.thumbnailPrompt,
          callback: ({ title: gemTitle, description: gemDesc, tags: gemTags, summary: gemSummary }) => {
            const tagsStr = typeof gemTags === 'string' ? gemTags : Array.isArray(gemTags) ? gemTags.join(', ') : '';
            geminiByUrl[url] = {
              title: gemTitle || '',
              description: gemDesc || '',
              tags: tagsStr,
              summary: gemSummary || '',
            };
            console.log(`[${url}] Đã nhận title/description/tags/summary từ Gemini.`);
          },
        });
      } catch (err) {
        console.error(`[${url}] Lỗi download:`, err.message);
        // FIX #3: Ghi status lỗi để retry biết bỏ qua / xử lý lại
        await updateProgress(url, 'Lỗi download', { error: err.message });
        return;
      }

      if (!result) {
        console.error(`[${url}] downloadSingleVideo trả về null/undefined.`);
        await updateProgress(url, 'Lỗi download', { error: 'No result' });
        return;
      }

      const videoId = result.metadata?.id || 'unknown_id';
      const perVideoDir = resolveVideoOutputDir(videoId);
      fs.mkdirSync(perVideoDir, { recursive: true });

      const videoPath = result.filePath;
      if (!fs.existsSync(videoPath)) {
        console.error(`[${url}] Không tìm thấy file video đã tải: ${videoPath}`);
        await updateProgress(url, 'Lỗi download', { error: 'File not found after download' });
        return;
      }

      // FIX #5: Mỗi video có tempDir riêng → tránh race condition khi cleanup song song
      const tempDir = path.dirname(videoPath);

      const baseName = sanitizeFilename(result.title || path.basename(videoPath, path.extname(videoPath)));
      const finalVideoPath = path.join(perVideoDir, `${baseName}.mp4`);

      try {
        await remakeVideo(videoPath, overlayImage, overlayClip, finalVideoPath, overlayRender);

        // Copy thumbnail YouTube nếu có trong tempDir
        if (fs.existsSync(tempDir)) {
          const downloadFiles = fs.readdirSync(tempDir);
          const thumbFile = downloadFiles.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
          if (thumbFile) {
            const thumbExt = path.extname(thumbFile);
            const thumbDestPath = path.join(perVideoDir, `thumbnail${thumbExt}`);
            fs.copyFileSync(path.join(tempDir, thumbFile), thumbDestPath);
            console.log(`[${videoId}] Copy thumbnail YouTube: ${thumbDestPath}`);
          }
        }
        const flowThumbJpg = path.join(perVideoDir, 'flow-thumbnail.jpg');
        if (fs.existsSync(flowThumbJpg)) {
          console.log(`[${videoId}] Đã có thumbnail Flow: ${flowThumbJpg}`);
        }

        // Lưu metadata
        const gem = geminiByUrl[url] || {};
        const metaPayload = {
          title: result.title || '',
          description: result.description || '',
          tags: Array.isArray(result.tags) ? result.tags.join(', ') : result.tags || '',
          titleGemini: gem.title || '',
          descriptionGemini: gem.description || '',
          tagsGemini: gem.tags || '',
          summaryGemini: gem.summary || '',
        };
        fs.writeFileSync(path.join(perVideoDir, 'video-meta.json'), JSON.stringify(metaPayload, null, 2), 'utf8');

        // FIX #3: Ghi status thành công rõ ràng
        await updateProgress(url, 'Đã tạo video');

        console.log(`[${videoId}] ĐÃ HOÀN THÀNH VIDEO: ${url}`);
        processedFolderNames.push(String(videoId).trim() || 'unknown_id');
      } catch (err) {
        console.error(`[${url}] Lỗi remake video:`, err.message);
        // FIX #3: Ghi status lỗi + message để retry / debug dễ hơn
        await updateProgress(url, 'Lỗi render', { error: err.message });
      } finally {
        // FIX #5: Xóa tempDir riêng của từng video, không xóa global DOWNLOADS_DIR
        if (fs.existsSync(tempDir) && tempDir !== DOWNLOADS_DIR) {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (e) {
            console.warn(`[${videoId}] Không xóa được tempDir: ${e.message}`);
          }
        }
      }
    })
  );

  await Promise.all(tasks);

  await flushProgressToSpreadsheet();
  unlinkProgressSidecarForSpreadsheet(actualInputFile);

  console.log(`\nHoàn thành xử lý ${items.length} video (thành công: ${processedFolderNames.length}).`);

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
