/**
 * Xử lý video speaker:
 * 1. Crop 2 bên CROP_SIDE_PX
 * 2. Chromakey nền đỏ → alpha thật (không ghép nền đen)
 * 3. Xuất speaker.mov (ProRes 4444 + alpha)
 *
 * Usage:
 *   node contents/process/makeSpeacker.js [video.mp4] [output.mov]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { STOCK_BG_OUTPUT_NAME } from './prepareStockBackground.js';
import { PATHS } from '../../../constants/paths.js';
import { ffmpegSpawnAsync } from '../../shared.js';

const SWS_FLAGS = 'lanczos+accurate_rnd+full_chroma_int';

export const RED_CHROMAKEY = '0xFF0000';
export const RED_SIMILARITY = '0.22';
/** blend=0 tránh viền đỏ bán trong suốt (bóng đỏ theo chuyển động). */
export const RED_BLEND = '0';

/** Tăng khi đổi filter — makeVideo tự tạo lại speaker. */
export const SPEAKER_FILTER_VERSION = 7;

export const CROP_SIDE_PX = 150;
export const SCALE_RATIO = 1;

/** ProRes 4444 giữ alpha ổn định hơn WebM VP9. */
export const SPEAKER_OUTPUT_NAME = 'speaker.mov';

const EXCLUDED_SOURCE_MP4 = new Set(['output.mp4', 'speaker.mp4', STOCK_BG_OUTPUT_NAME, '_stock_raw.mp4']);

const VIDEO_ENCODE_ARGS = ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le'];

/** Audio lấy từ nguồn trong makeVideo (tránh lỗi Opus khi loop). */
const AUDIO_ENCODE_ARGS = ['-an'];

/**
 * @returns {string}
 */
export function buildSpeakerChromakeyFilter() {
  return `chromakey=${RED_CHROMAKEY}:${RED_SIMILARITY}:${RED_BLEND}`;
}

/**
 * Làm mượt alpha theo không gian (không tmix — tránh bóng đỏ/lag theo chuyển động).
 * @returns {string}
 */
export function buildSmoothSpeakerAlphaFilter() {
  return (
    'split[sp_a][sp_b];' +
    "[sp_b]alphaextract,boxblur=1:1,lut=y='min(255,val*2)',format=gray[sp_mask];" +
    '[sp_a][sp_mask]alphamerge,format=yuva420p'
  );
}

/** @deprecated Dùng buildSmoothSpeakerAlphaFilter */
export function buildHardenSpeakerAlphaFilter() {
  return buildSmoothSpeakerAlphaFilter();
}

/**
 * Chuỗi filter chuẩn bị overlay speaker trong makeVideo.
 * @param {number} fps
 * @param {number} speakerMaxW
 * @returns {string}
 */
export function buildSpeakerOverlayPrepFilter(fps, speakerMaxW) {
  return (
    `loop=loop=-1:size=32767:start=0,fps=${fps},` +
    `format=yuva420p,${buildSmoothSpeakerAlphaFilter()},` +
    `scale=${speakerMaxW}:-1:flags=lanczos`
  );
}

/**
 * @param {object} [opts]
 * @param {number} [opts.cropSidePx]
 * @param {number} [opts.scaleRatio]
 * @returns {string}
 */
export function buildSpeakerVideoFilter(opts = {}) {
  const cropSide = opts.cropSidePx ?? CROP_SIDE_PX;
  const scaleRatio = opts.scaleRatio ?? SCALE_RATIO;
  const cropSides = `crop=iw-${cropSide * 2}:ih:${cropSide}:0`;
  const core = `${cropSides},${buildSpeakerChromakeyFilter()},despill=mix=0.4:red=1,format=yuva420p`;

  if (scaleRatio >= 1) {
    return core;
  }

  return `${core},${buildScaleDownFilter(scaleRatio)}`;
}

/**
 * @param {number} ratio
 * @returns {string}
 */
export function buildScaleDownFilter(ratio) {
  const step = Math.sqrt(ratio);
  const s = step.toFixed(4).replace(/\.?0+$/, '');
  const once = `scale=trunc(iw*${s}/2)*2:trunc(ih*${s}/2)*2:flags=lanczos`;
  return `${once},${once}`;
}

/**
 * @param {string} inputPath
 * @returns {{ width: number, height: number, bitRate: number } | null}
 */
export function probeSourceVideo(inputPath) {
  try {
    const raw = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate -of csv=p=0 "${inputPath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const [width, height, bitRate] = raw.split(',').map(v => parseInt(v, 10));
    if (!width || !height) return null;
    return { width, height, bitRate: Number.isFinite(bitRate) && bitRate > 0 ? bitRate : 750_000 };
  } catch {
    return null;
  }
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isSpeakerSourceMp4(name) {
  if (!/\.mp4$/i.test(name)) return false;
  if (EXCLUDED_SOURCE_MP4.has(name)) return false;
  if (/\.speaker\.(mp4|webm|mov)$/i.test(name)) return false;
  if (name.startsWith('_')) return false;
  return true;
}

/**
 * @param {string} [dir]
 * @returns {string}
 */
export function findLatestSourceMp4(dir = PATHS.DOWNLOADS) {
  if (!fs.existsSync(dir)) {
    throw new Error(`findLatestSourceMp4: không tìm thấy thư mục ${dir}`);
  }

  const entries = fs
    .readdirSync(dir)
    .filter(isSpeakerSourceMp4)
    .map(name => {
      const full = path.join(dir, name);
      return { full, mtimeMs: fs.statSync(full).mtimeMs };
    });

  if (!entries.length) {
    throw new Error(`findLatestSourceMp4: không có file .mp4 nguồn trong ${dir}`);
  }

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries[0].full;
}

/** @deprecated */
export const findLatestMp4 = findLatestSourceMp4;

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} [options]
 */
export async function processSpeakerVideo(inputPath, outputPath, options = {}) {
  const resolvedIn = path.resolve(inputPath);
  if (!fs.existsSync(resolvedIn)) {
    throw new Error(`processSpeakerVideo: không tìm thấy ${resolvedIn}`);
  }

  const resolvedOut = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  const vf = buildSpeakerVideoFilter({
    cropSidePx: options.cropSidePx ?? CROP_SIDE_PX,
    scaleRatio: options.scaleRatio ?? SCALE_RATIO,
  });
  const source = probeSourceVideo(resolvedIn);
  const outW = source ? Math.max(2, source.width - (options.cropSidePx ?? CROP_SIDE_PX) * 2) : '?';
  const outH = source?.height ?? '?';

  console.log(`[make-speaker] Input:  ${resolvedIn}`);
  console.log(`[make-speaker] Output: ${resolvedOut} (${outW}×${outH}, ProRes + alpha)`);
  console.log(`[make-speaker] -vf ${vf}`);

  await ffmpegSpawnAsync([
    '-hide_banner',
    '-loglevel',
    'error',
    '-sws_flags',
    SWS_FLAGS,
    '-y',
    '-i',
    resolvedIn,
    '-vf',
    vf,
    ...VIDEO_ENCODE_ARGS,
    ...AUDIO_ENCODE_ARGS,
    resolvedOut,
  ]);

  return resolvedOut;
}

/**
 * @param {string} dir
 */
export function removeLegacySpeakerOutputs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (/^speaker\.(mp4|webm|mov)$/i.test(name) && name !== SPEAKER_OUTPUT_NAME) {
      try {
        fs.unlinkSync(path.join(dir, name));
        console.log(`[make-speaker] Đã xóa output cũ: ${name}`);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {string} speakerPath
 * @param {string} [downloadsDir]
 * @returns {string[]}
 */
export function listSpeakerTempPaths(speakerPath, downloadsDir = PATHS.DOWNLOADS) {
  const sp = path.resolve(speakerPath);
  return [sp, `${sp}.version`, path.join(downloadsDir, 'speaker.webm')];
}

/**
 * Xóa file tạm speaker sau khi đã ghép output.mp4.
 * @param {string} speakerPath
 * @param {string} [downloadsDir]
 */
export function removeSpeakerTempFiles(speakerPath, downloadsDir = PATHS.DOWNLOADS) {
  for (const filePath of listSpeakerTempPaths(speakerPath, downloadsDir)) {
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

/**
 * @param {object} [options]
 * @returns {Promise<{ speakerPath: string, sourcePath: string }>}
 */
export async function main(options = {}) {
  const downloadsDir = options.downloadsDir ?? PATHS.DOWNLOADS;
  const inputPath = options.inputPath ?? findLatestSourceMp4(downloadsDir);
  const outputPath = options.outputPath ?? path.join(downloadsDir, SPEAKER_OUTPUT_NAME);

  removeLegacySpeakerOutputs(downloadsDir);

  const speakerPath = await processSpeakerVideo(inputPath, outputPath, {
    cropSidePx: options.cropSidePx,
    scaleRatio: options.scaleRatio,
  });
  fs.writeFileSync(`${speakerPath}.version`, String(SPEAKER_FILTER_VERSION), 'utf8');
  console.log(`[make-speaker] Hoàn tất: ${speakerPath}`);
  return { speakerPath, sourcePath: inputPath };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main({
    inputPath: process.argv[2] ? path.resolve(process.argv[2]) : undefined,
    outputPath: process.argv[3] ? path.resolve(process.argv[3]) : undefined,
  }).catch(err => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
