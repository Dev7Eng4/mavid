/**
 * Tải và chuẩn bị video stock làm nền (chỉ hình ảnh, không audio).
 *
 * Usage:
 *   node contents/process/prepareStockBackground.js [url] [output.mp4]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import youtubedl from 'youtube-dl-exec';

import { STOCK_VIDEO } from '../../../constants/videoPipelineDefaults.js';
import { ffmpegSpawnAsync } from '../../shared.js';
import { PATHS } from '../../../constants/paths.js';

/** URL stock mặc định (YouTube). */
export const STOCK_VIDEO_URL = 'https://www.youtube.com/watch?v=MPTBT4-r4Fs';

/** File nền stock đã chuẩn hóa trong downloads. */
export const STOCK_BG_OUTPUT_NAME = 'stock_bg.mp4';

/** File raw tạm khi tải YouTube. */
export const STOCK_BG_RAW_NAME = '_stock_raw.mp4';

/** Bỏ qua intro YouTube (giây). */
export const STOCK_BG_SKIP_SEC = 60;

/** Độ dài clip nền sau khi cắt — đủ để loop, tránh encode cả video dài. */
export const STOCK_BG_CLIP_SEC = 300;

const PREFERRED_VIDEO_FORMATS = [
  'bestvideo[height=720][ext=mp4]',
  'bestvideo[height=720]',
  'bestvideo[height=480][ext=mp4]',
  'bestvideo[height=480]',
  'bestvideo[ext=mp4]',
  'bestvideo',
];

/**
 * @param {string} url
 * @param {string} outputPath
 * @returns {Promise<string>}
 */
export async function downloadStockVideoOnly(url, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  for (const format of PREFERRED_VIDEO_FORMATS) {
    try {
      console.log(`[stock-bg] Thử format: ${format}`);
      await youtubedl(url, {
        format,
        output: outputPath,
        noAudio: true,
      });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`[stock-bg] Tải xong: ${outputPath}`);
        return outputPath;
      }
    } catch {
      console.warn(`[stock-bg] Format "${format}" không khả dụng, thử tiếp...`);
    }
  }

  throw new Error(`downloadStockVideoOnly: không tải được video từ ${url}`);
}

/**
 * Chuẩn hóa clip stock: scale/crop canvas, fps, bỏ audio.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} [opts]
 */
export async function normalizeStockBackgroundClip(inputPath, outputPath, opts = {}) {
  const w = opts.width ?? STOCK_VIDEO.CANVAS_W;
  const h = opts.height ?? STOCK_VIDEO.CANVAS_H;
  const fps = opts.fps ?? 24;
  const skipSec = opts.skipSec ?? STOCK_BG_SKIP_SEC;
  const clipSec = opts.clipSec ?? STOCK_BG_CLIP_SEC;

  const vf = [`scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos`, `crop=${w}:${h}`, `fps=${fps}`, 'format=yuv420p'].join(
    ',',
  );

  await ffmpegSpawnAsync([
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(skipSec),
    '-t',
    String(clipSec),
    '-i',
    inputPath,
    '-vf',
    vf,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ]);

  return outputPath;
}

/**
 * Filter ffmpeg: loop stock → full canvas (dùng làm lớp nền dưới cùng).
 * @param {number} fps
 * @param {number} [width]
 * @param {number} [height]
 * @returns {string}
 */
export function buildStockBackgroundPrepFilter(fps, width = STOCK_VIDEO.CANVAS_W, height = STOCK_VIDEO.CANVAS_H) {
  return (
    `loop=loop=-1:size=32767:start=0,fps=${fps},` +
    `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,` +
    `crop=${width}:${height},setsar=1,format=yuv420p`
  );
}

/**
 * Tải (nếu cần) và chuẩn hóa video stock làm nền.
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.stockUrl]
 * @param {string} [options.outputPath]
 * @param {boolean} [options.forceStock]
 * @returns {Promise<string>}
 */
export async function ensureStockBackground(options = {}) {
  const downloadsDir = options.downloadsDir ?? PATHS.DOWNLOADS;
  const stockUrl = options.stockUrl ?? STOCK_VIDEO_URL;
  const outputPath = path.resolve(options.outputPath ?? path.join(downloadsDir, STOCK_BG_OUTPUT_NAME));
  const urlMetaPath = `${outputPath}.url`;

  const urlChanged = fs.existsSync(urlMetaPath) && fs.readFileSync(urlMetaPath, 'utf8').trim() !== stockUrl;

  if (fs.existsSync(outputPath) && !options.forceStock && !urlChanged) {
    console.log(`[stock-bg] Dùng stock có sẵn: ${outputPath}`);
    return outputPath;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const rawPath = path.join(downloadsDir, STOCK_BG_RAW_NAME);
  console.log(`[stock-bg] Đang tải: ${stockUrl}`);
  await downloadStockVideoOnly(stockUrl, rawPath);

  console.log(`[stock-bg] Chuẩn hóa → ${outputPath}`);
  await normalizeStockBackgroundClip(rawPath, outputPath);

  fs.writeFileSync(urlMetaPath, stockUrl, 'utf8');

  try {
    fs.unlinkSync(rawPath);
  } catch {
    /* ignore */
  }

  return outputPath;
}

/**
 * @param {string} downloadsDir
 * @param {string} [stockPath]
 * @returns {string[]}
 */
export function listStockBackgroundTempPaths(downloadsDir, stockPath) {
  const stock = path.resolve(stockPath ?? path.join(downloadsDir, STOCK_BG_OUTPUT_NAME));
  return [stock, `${stock}.url`, path.join(downloadsDir, STOCK_BG_RAW_NAME)];
}

/**
 * Xóa file tạm stock sau khi đã ghép output.mp4.
 * @param {string} downloadsDir
 * @param {string} [stockPath]
 */
export function removeStockBackgroundTempFiles(downloadsDir, stockPath) {
  for (const filePath of listStockBackgroundTempPaths(downloadsDir, stockPath)) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[make-video] Đã xóa file tạm: ${path.basename(filePath)}`);
      }
    } catch {
      /* ignore */
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  ensureStockBackground({
    stockUrl: process.argv[2] || undefined,
    outputPath: process.argv[3] ? path.resolve(process.argv[3]) : undefined,
    forceStock: true,
  }).catch(err => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
