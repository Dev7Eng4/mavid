import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import util from 'util';

import { MAKE_VIDEO_MODE } from './constants/index.js';
import { GPU_INFO } from './utils/hardware.util.js';
import { OVERLAY_OPTIONS } from './constants/overlayOptions.js';
import { resolveChannelsDir } from './utils/channelsStoragePath.js';
import { unlinkProgressSidecarForSpreadsheet } from './syncProgressToSpreadsheet.js';

const execPromise = util.promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CHANNELS_DIR = resolveChannelsDir();
const DOWNLOADS_DIR = path.join(ROOT, 'downloads');

export { OVERLAY_OPTIONS };

function overlaySubdirFromOptionName(name) {
  if (!name || typeof name !== 'string') return 'default';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'default';
}

function opacityOrDefault(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function normalizeVideoCropPercent(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(49, Math.max(0, Math.floor(n))) : 0;
}

export function resolveOverlayByName(overlayKey) {
  if (!OVERLAY_OPTIONS.length) throw new Error('OVERLAY_OPTIONS không được rỗng.');

  const key = overlayKey != null && String(overlayKey).trim() !== '' ? String(overlayKey).trim() : 'Option 1';
  const opt = OVERLAY_OPTIONS.find(o => String(o.NAME).trim() === key);

  if (!opt) {
    throw new Error(`Không tìm thấy overlay "${key}". Các NAME hợp lệ: ${OVERLAY_OPTIONS.map(o => `"${o.NAME}"`).join(', ')}`);
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

async function getVideoResolutionAsync(filePath) {
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`;
    const { stdout } = await execPromise(cmd);
    const [w, h] = stdout.trim().split('x').map(Number);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch (err) {
    // Im lặng bỏ qua, dùng mặc định
  }
  return { width: 1920, height: 1080 };
}

async function ensureOverlayDirs(overlayDir, overlayCacheDir) {
  await fsPromises.mkdir(overlayDir, { recursive: true });
  await fsPromises.mkdir(overlayCacheDir, { recursive: true });
}

async function getPreprocessedImageOverlayAsync(imagePath, width, height, opacity, overlayCacheDir) {
  try {
    const srcStat = await fsPromises.stat(imagePath);
    const cacheKey = `img_${path.parse(imagePath).name}_${width}x${height}_a${Math.round(opacity * 100)}_${srcStat.mtimeMs}`;
    const cachePath = path.join(overlayCacheDir, `${cacheKey}.png`);

    if (fs.existsSync(cachePath)) return cachePath;

    const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${imagePath}" -vf "scale=${width}:${height},format=rgba,colorchannelmixer=aa=${opacity}" -frames:v 1 "${cachePath}"`;
    await execPromise(cmd);
    return cachePath;
  } catch (err) {
    return null;
  }
}

async function getPreprocessedVideoOverlayAsync(videoPath, width, height, opacity, overlayCacheDir) {
  try {
    const srcStat = await fsPromises.stat(videoPath);
    const cacheKey = `vid_${path.parse(videoPath).name}_${width}x${height}_a${Math.round(opacity * 100)}_${srcStat.mtimeMs}`;
    const cachePath = path.join(overlayCacheDir, `${cacheKey}.mov`);

    if (fs.existsSync(cachePath)) return cachePath;

    const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${videoPath}" -vf "scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${opacity}" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${cachePath}"`;
    await execPromise(cmd);
    return cachePath;
  } catch (err) {
    return null;
  }
}

function getFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => exts.some(ext => f.toLowerCase().endsWith(ext)))
    .map(f => path.join(dir, f));
}

function sanitizeFilename(name) {
  return name ? name.replace(/[\\/:*?"<>|]/g, '_').trim() : 'unknown';
}

async function remakeVideo(videoPath, imagePath, overlayVideoPath, outputPath, overlayRender) {
  const { imageOpacity, videoOpacity, overlayCacheDir, videoCropPercent = 0 } = overlayRender;

  const { width, height } = await getVideoResolutionAsync(videoPath);
  const cachedImage = await getPreprocessedImageOverlayAsync(imagePath, width, height, imageOpacity, overlayCacheDir);
  const cachedVideo = await getPreprocessedVideoOverlayAsync(overlayVideoPath, width, height, videoOpacity, overlayCacheDir);

  const useImageCache = cachedImage != null;
  const useVideoCache = cachedVideo != null;

  return new Promise((resolve, reject) => {
    const p = videoCropPercent;
    const inner = 100 - 2 * p;
    const headCrop = p > 0 && inner > 0 ? `[0:v]scale=iw*100/${inner}:ih*100/${inner},crop=iw*${inner}/100:ih*${inner}/100[v0];` : '';
    const vid0 = p > 0 && inner > 0 ? '[v0]' : '[0:v]';

    const imgFilter = useImageCache
      ? `${vid0}[1:v]overlay=0:0[base1];`
      : `[1:v]scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${imageOpacity}[timg];${vid0}[timg]overlay=0:0[base1];`;

    const vidOverlayFilter = useVideoCache
      ? `[base1][2:v]overlay=0:0:shortest=1,format=yuv420p[outv]`
      : `[2:v]scale=${width}:${height},format=yuva420p,colorchannelmixer=aa=${videoOpacity}[ova];[base1][ova]overlay=0:0:shortest=1,format=yuv420p[outv]`;

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
      '0:a:0?',
      '-shortest'
    );

    args.push(...GPU_INFO.reupVideoEncodeArgs);
    args.push('-c:a', 'copy', '-movflags', '+faststart', '-f', 'mp4', outputPath);

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

    // Khắc phục rò rỉ bộ nhớ (Memory Leak)
    let errorLog = '';
    const MAX_LOG_LENGTH = 5000;

    ffmpeg.stderr.on('data', data => {
      errorLog += data.toString();
      if (errorLog.length > MAX_LOG_LENGTH) {
        errorLog = errorLog.slice(-MAX_LOG_LENGTH);
      }
    });

    ffmpeg.on('error', err => reject(new Error(`FFmpeg spawn error: ${err.message}`)));

    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Mã lỗi ${code}. Log:\n${errorLog}`));
    });
  });
}

async function main(options = {}) {
  const inputFile = options.inputFile || null;
  const items = options.items || [];

  if (items.length === 0) return { success: false, processedCount: 0, processedFolderNames: [] };

  const processedFolderNames = [];
  const overlayResolved = resolveOverlayByName(options.overlay);
  const { dir: OVERLAY_DIR, imageOpacity, videoOpacity, cacheDir: overlayCacheDir } = overlayResolved;

  await ensureOverlayDirs(OVERLAY_DIR, overlayCacheDir);
  const videoCropPercent = normalizeVideoCropPercent(options.videoCropPercent);
  const overlayRender = { imageOpacity, videoOpacity, overlayCacheDir, videoCropPercent };

  const { downloadSingleVideo } = await import('./downloadVideo.js');

  const actualInputFile = inputFile;
  const destFolder = actualInputFile ? path.dirname(actualInputFile) : CHANNELS_DIR;
  const progressFile = actualInputFile
    ? actualInputFile.replace(/\.(xlsx|csv)$/, '_progress.json')
    : path.join(CHANNELS_DIR, 'progress.json');

  let progressData = {};
  if (fs.existsSync(progressFile)) {
    try {
      progressData = JSON.parse(await fsPromises.readFile(progressFile, 'utf8'));
    } catch (e) {}
  }

  let syncProgressModule = null;
  async function flushProgressToSpreadsheet() {
    if (!actualInputFile) return;
    try {
      if (!syncProgressModule) syncProgressModule = await import('./syncProgressToSpreadsheet.js');
      await syncProgressModule.syncProgressStatusToSpreadsheet(actualInputFile, progressData);
    } catch (e) {}
  }

  const images = getFiles(OVERLAY_DIR, ['.png', '.jpg', '.jpeg', '.webp']);
  const overlayVideos = getFiles(OVERLAY_DIR, ['.mp4', '.webm', '.mov', '.mkv']);

  if (!images.length || !overlayVideos.length) {
    throw new Error(`Cần ít nhất 1 ảnh và 1 video overlay trong ${OVERLAY_DIR}`);
  }

  const overlayImage = images[0];
  const overlayClip = overlayVideos[0];
  const geminiByUrl = {};

  const startTimeGlobal = Date.now();
  console.log(`Bắt đầu xử lý ${items.length} videos...`);

  for (let i = 0; i < items.length; i++) {
    const { url } = items[i];
    const itemStartTime = Date.now();

    console.log(`[${i + 1}/${items.length}] Đang xử lý: ${url}`);

    const result = await downloadSingleVideo(url, {
      mode: MAKE_VIDEO_MODE.REUP_FULL,
      thumbnailChannelRoot: destFolder,
      thumbnailPrompt: options.thumbnailPrompt,
      callback: ({ title, description, tags, summary }) => {
        geminiByUrl[url] = {
          title: title || '',
          description: description || '',
          tags: Array.isArray(tags) ? tags.join(', ') : tags || '',
          summary: summary || '',
        };
      },
    });

    if (result && result.filePath && fs.existsSync(result.filePath)) {
      const videoId = result.metadata?.id || 'unknown_id';
      const perVideoDir = path.join(destFolder, videoId);
      await fsPromises.mkdir(perVideoDir, { recursive: true });

      const videoPath = result.filePath;
      const baseName = sanitizeFilename(result.title || path.basename(videoPath, path.extname(videoPath)));
      const finalVideoPath = path.join(perVideoDir, `${baseName}.mp4`);

      try {
        await remakeVideo(videoPath, overlayImage, overlayClip, finalVideoPath, overlayRender);

        // Copy Thumbnail
        if (fs.existsSync(DOWNLOADS_DIR)) {
          const downloadFiles = await fsPromises.readdir(DOWNLOADS_DIR);
          const thumbFile = downloadFiles.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
          if (thumbFile) {
            const thumbSrc = path.join(DOWNLOADS_DIR, thumbFile);
            await fsPromises.copyFile(thumbSrc, path.join(perVideoDir, `thumbnail${path.extname(thumbFile)}`));
            await fsPromises.unlink(thumbSrc).catch(() => {}); // Xóa ngay sau khi copy
          }
        }

        // Lưu Metadata (Không chặn Event Loop)
        const gem = geminiByUrl[url] || {};
        const metaPayload = {
          title: result.title || '',
          description: result.description || '',
          tags: Array.isArray(result.tags) ? result.tags.join(', ') : result.tags || '',
          titleGemini: gem.title,
          descriptionGemini: gem.description,
          tagsGemini: gem.tags,
          summaryGemini: gem.summary,
        };
        await fsPromises.writeFile(path.join(perVideoDir, 'video-meta.json'), JSON.stringify(metaPayload, null, 2), 'utf8');

        // Cập nhật Progress
        progressData[url] = { status: 'Đã tạo video' };
        await fsPromises.writeFile(progressFile, JSON.stringify(progressData, null, 2), 'utf8');
        await flushProgressToSpreadsheet();

        processedFolderNames.push(String(videoId).trim() || 'unknown_id');

        const timeTaken = ((Date.now() - itemStartTime) / 1000).toFixed(1);
        console.log(`=> Hoàn thành video [${timeTaken}s]: ${baseName}`);
      } catch (err) {
        console.error(`[X] Lỗi xử lý video ${url}:`, err.message);
      } finally {
        // Dọn dẹp AN TOÀN: Chỉ xóa đúng file video gốc của vòng lặp này
        try {
          if (fs.existsSync(videoPath)) {
            await fsPromises.unlink(videoPath);
          }
        } catch (e) {}
      }
    } else {
      console.error(`[X] Bỏ qua ${url}: Không tìm thấy file download.`);
    }
  }

  await flushProgressToSpreadsheet();
  unlinkProgressSidecarForSpreadsheet(actualInputFile);

  const totalTime = ((Date.now() - startTimeGlobal) / 1000).toFixed(1);
  console.log(`\n✅ Hoàn thành batch ${processedFolderNames.length}/${items.length} video (Tổng thời gian: ${totalTime}s)`);

  return {
    success: processedFolderNames.length > 0,
    processedCount: processedFolderNames.length,
    processedFolderNames,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.error('Lỗi: Script này chỉ chạy qua batch.');
  process.exit(1);
}

export default main;
