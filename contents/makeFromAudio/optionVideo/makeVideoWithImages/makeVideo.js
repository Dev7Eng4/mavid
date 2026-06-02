/**

 * Tạo MP4 từ ảnh slideshow (duration theo transcript mapping) + overlay speaker.mov (alpha) — nền trong suốt, thấy ảnh phía sau.
 * Tổng thời lượng output = thời lượng audio; ảnh cuối kéo dài từ startTime đến hết video.

 *

 * Usage:

 *   node contents/process/makeVideo.js

 *   node contents/process/makeVideo.js [downloadsDir] [output.mp4]
 *
 * Ảnh slideshow lấy từ `downloads/images` (hoặc `{downloadsDir}/images`).
 * Nền stock (YouTube) tải về `downloads/stock_bg.mp4` — lớp dưới cùng.
 * Speaker tạm (speaker.mov) và stock (stock_bg.mp4) được xóa sau khi render xong output.

 */

import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

import path from 'path';

import { fileURLToPath } from 'url';

import {
  SPEAKER_FILTER_VERSION,
  SPEAKER_OUTPUT_NAME,
  buildSpeakerOverlayPrepFilter,
  findLatestSourceMp4,
  main as runMakeSpeaker,
  removeSpeakerTempFiles,
} from './makeSpeacker.js';

import {
  buildStockBackgroundPrepFilter,
  ensureStockBackground,
  removeStockBackgroundTempFiles,
  STOCK_VIDEO_URL,
} from './prepareStockBackground.js';
import { convertTranscript } from './convertTranscript.js';
import { main as runMappingImages } from './mappingImages.js';
import { STOCK_VIDEO } from '../../../constants/videoPipelineDefaults.js';
import { PATHS } from '../../../constants/paths.js';
import { ffmpegSpawnAsync, getAudioDurationSeconds, getAudioFile } from '../../shared.js';
import { srtTimestampToMs } from '../../../utils/srt.util.js';

export { STOCK_VIDEO_URL };

export const IMAGE_DURATION_SEC = 12;

export const OUTPUT_VIDEO_NAME = 'output.mp4';

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** Thư mục con chứa ảnh slideshow (bên trong downloads). */

export const SLIDESHOW_IMAGES_SUBDIR = 'images';

/**
 * @param {string} [downloadsDir]
 * @returns {string}
 */
export function resolveSlideshowImagesDir(downloadsDir = PATHS.DOWNLOADS) {
  return path.join(downloadsDir, SLIDESHOW_IMAGES_SUBDIR);
}

/**
 * Tìm file audio trong downloads (ưu tiên .mp3).
 * @param {string} downloadsDir
 * @returns {string}
 */
export function resolveDownloadsAudioPath(downloadsDir) {
  if (!fs.existsSync(downloadsDir)) {
    throw new Error(`resolveDownloadsAudioPath: không tìm thấy ${downloadsDir}`);
  }

  const mp3s = fs
    .readdirSync(downloadsDir)
    .filter(name => /\.mp3$/i.test(name) && !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (mp3s.length) {
    return path.join(downloadsDir, mp3s[0]);
  }

  return getAudioFile(downloadsDir);
}

/** Chiều rộng tối đa overlay speaker (px) trên canvas 1280×720. */

export const SPEAKER_OVERLAY_MAX_W = 360;

/** Lề phải overlay speaker (px). */

/** Lệch từ mép phải (px). Giảm giá trị = speaker sang phải thêm. */
export const SPEAKER_OVERLAY_MARGIN_RIGHT = -25;

/** Lề dưới overlay speaker (px). */

export const SPEAKER_OVERLAY_MARGIN_BOTTOM = 20;

/** Khoảng cách từ khung bảng đến các mép canvas (px) — đều 4 phía. */

export const FRAME_MARGIN = 35;

/** Bề rộng vùng viền giữa hai đường (px). */

export const FRAME_BORDER_WIDTH = 20;

/** Màu vùng viền (cyan), dùng định dạng 0xRRGGBB cho ffmpeg drawbox. */

export const FRAME_BORDER_COLOR = '0x00BFFF';

/** Màu của hai đường viền mỏng (mép ngoài & mép trong). */

export const FRAME_OUTLINE_COLOR = 'black';

/** Bề dày của hai đường viền mỏng (px). */

export const FRAME_OUTLINE_THICKNESS = 2;

/** Tỷ lệ vùng ảnh trong bảng — khớp ảnh slideshow 16:9. */

export const SLIDE_ASPECT_W = 16;

export const SLIDE_ASPECT_H = 9;

/**
 * Tính layout khung bảng: vùng ảnh bên trong giữ 16:9, scale khít không méo.
 * Khung (viền cyan) căn giữa trong vùng margin.
 * @param {object} [opts]
 * @returns {{
 *   outerX: number, outerY: number, outerW: number, outerH: number,
 *   innerX: number, innerY: number, innerW: number, innerH: number,
 *   innerOutlineX: number, innerOutlineY: number, innerOutlineW: number, innerOutlineH: number,
 * }}
 */
export function computeFrameLayout(opts = {}) {
  const w = opts.width ?? STOCK_VIDEO.CANVAS_W;
  const h = opts.height ?? STOCK_VIDEO.CANVAS_H;
  const margin = opts.frameMargin ?? FRAME_MARGIN;
  const borderWidth = opts.frameBorderWidth ?? FRAME_BORDER_WIDTH;
  const outline = opts.frameOutlineThickness ?? FRAME_OUTLINE_THICKNESS;
  const aspectW = opts.aspectW ?? SLIDE_ASPECT_W;
  const aspectH = opts.aspectH ?? SLIDE_ASPECT_H;

  const availW = w - margin * 2;
  const availH = h - margin * 2;
  const maxInnerW = availW - 2 * borderWidth;
  const maxInnerH = availH - 2 * borderWidth;

  let innerW = maxInnerW;
  let innerH = Math.round((innerW * aspectH) / aspectW);
  if (innerH > maxInnerH) {
    innerH = maxInnerH;
    innerW = Math.round((innerH * aspectW) / aspectH);
  }
  innerW -= innerW % 2;
  innerH -= innerH % 2;

  const outerW = innerW + 2 * borderWidth;
  const outerH = innerH + 2 * borderWidth;
  const outerX = margin + Math.floor((availW - outerW) / 2);
  const outerY = margin + Math.floor((availH - outerH) / 2);
  const innerX = outerX + borderWidth;
  const innerY = outerY + borderWidth;

  return {
    outerX,
    outerY,
    outerW,
    outerH,
    innerX,
    innerY,
    innerW,
    innerH,
    innerOutlineX: innerX - outline,
    innerOutlineY: innerY - outline,
    innerOutlineW: innerW + 2 * outline,
    innerOutlineH: innerH + 2 * outline,
  };
}

/**

 * @param {string} name

 * @returns {boolean}

 */

export function isSlideshowImage(name) {
  if (!IMAGE_EXT.test(name)) return false;

  if (name.startsWith('_') || name.startsWith('.')) return false;

  return true;
}

/**

 * Ảnh slideshow trong `{downloadsDir}/images`, sort theo tên (1-7, 8-12, …).

 * @param {string} [dir] — thư mục chứa ảnh (mặc định downloads/images)

 * @returns {string[]}

 */

export function listSlideshowImages(dir = resolveSlideshowImagesDir()) {
  if (!fs.existsSync(dir)) {
    throw new Error(`listSlideshowImages: không tìm thấy ${dir}`);
  }

  return fs

    .readdirSync(dir)

    .filter(isSlideshowImage)

    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

    .map(name => path.join(dir, name));
}

/**

 * Nội dung ffconcat cho chuỗi ảnh tĩnh.

 * @param {string[]} imagePaths — đường dẫn tuyệt đối

 * @param {number} durationSec

 * @returns {string}

 */

/**
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number}
 */
export function sceneDurationSec(startTime, endTime) {
  const startMs = srtTimestampToMs(startTime);
  const endMs = srtTimestampToMs(endTime);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error(`sceneDurationSec: timestamp không hợp lệ (${startTime} → ${endTime})`);
  }

  const sec = (endMs - startMs) / 1000;
  if (sec <= 0) {
    throw new Error(`sceneDurationSec: thời lượng <= 0 (${startTime} → ${endTime})`);
  }

  return Math.round(sec * 1000) / 1000;
}

/**
 * @param {Array<{ start: number, end: number, startTime: string, endTime: string, file: string }>} objectImages
 * @param {string} imagesDir
 * @param {number} audioDurationSec
 * @returns {Array<{ path: string, durationSec: number }>}
 */
export function buildSlidesFromObjectImages(objectImages, imagesDir, audioDurationSec) {
  if (!objectImages?.length) {
    throw new Error('buildSlidesFromObjectImages: cần ít nhất một scene');
  }

  if (!Number.isFinite(audioDurationSec) || audioDurationSec <= 0) {
    throw new Error(`buildSlidesFromObjectImages: audioDurationSec không hợp lệ (${audioDurationSec})`);
  }

  const lastIndex = objectImages.length - 1;

  return objectImages.map((item, index) => {
    const abs = path.join(imagesDir, item.file);
    if (!fs.existsSync(abs)) {
      throw new Error(`buildSlidesFromObjectImages: không tìm thấy ${abs}`);
    }

    let durationSec;
    if (index === lastIndex) {
      const startMs = srtTimestampToMs(item.startTime);
      if (!Number.isFinite(startMs)) {
        throw new Error(`buildSlidesFromObjectImages: startTime không hợp lệ (${item.startTime})`);
      }
      durationSec = Math.round((audioDurationSec - startMs / 1000) * 1000) / 1000;
      if (durationSec <= 0) {
        throw new Error(
          `buildSlidesFromObjectImages: ảnh cuối (${item.file}) startTime=${item.startTime} vượt quá thời lượng audio (${audioDurationSec}s)`,
        );
      }
    } else {
      durationSec = sceneDurationSec(item.startTime, item.endTime);
    }

    return {
      path: abs,
      durationSec,
    };
  });
}

/**
 * @param {Array<{ path: string, durationSec: number }>} slides
 * @returns {string}
 */
export function buildImageConcatFileContent(slides) {
  if (!slides.length) {
    throw new Error('buildImageConcatFileContent: cần ít nhất một ảnh');
  }

  const lines = ['ffconcat version 1.0'];

  for (const { path: abs, durationSec } of slides) {
    const normalized = abs.replace(/\\/g, '/').replace(/'/g, "'\\''");

    lines.push(`file '${normalized}'`);
    lines.push(`duration ${durationSec}`);
  }

  const last = slides[slides.length - 1].path.replace(/\\/g, '/').replace(/'/g, "'\\''");

  lines.push(`file '${last}'`);

  return `${lines.join('\n')}\n`;
}

/**

 * @param {object} [opts]

 * @param {number} [opts.width]

 * @param {number} [opts.height]

 * @param {number} [opts.fps]

 * @param {number} [opts.speakerMaxW]

 * @param {number} [opts.speakerMargin]
 * @param {number} [opts.totalSec]
 * @param {boolean} [opts.withAudio]
 * @param {number} [opts.audioInputIndex]

 * @returns {string}

 */

export function buildMakeVideoFilterComplex(opts = {}) {
  const w = opts.width ?? STOCK_VIDEO.CANVAS_W;

  const h = opts.height ?? STOCK_VIDEO.CANVAS_H;

  const fps = opts.fps ?? 24;

  const speakerMaxW = opts.speakerMaxW ?? SPEAKER_OVERLAY_MAX_W;

  const marginRight = opts.speakerMarginRight ?? SPEAKER_OVERLAY_MARGIN_RIGHT;

  const marginBottom = opts.speakerMarginBottom ?? SPEAKER_OVERLAY_MARGIN_BOTTOM;

  const totalSec = opts.totalSec ?? 0;

  const withAudio = opts.withAudio && totalSec > 0;
  const audioInputIndex = opts.audioInputIndex ?? 3;

  const { outerX, outerY, outerW, outerH, innerX, innerY, innerW, innerH } = computeFrameLayout({
    width: w,
    height: h,
  });

  const frameDrawboxes =
    `drawbox=x=${outerX}:y=${outerY}:w=${outerW}:h=${outerH}:color=${FRAME_BORDER_COLOR}:t=${FRAME_BORDER_WIDTH},` +
    `drawbox=x=${outerX}:y=${outerY}:w=${outerW}:h=${outerH}:color=${FRAME_OUTLINE_COLOR}:t=${FRAME_OUTLINE_THICKNESS}`;

  const slideScale = `scale=${innerW}:${innerH}:flags=lanczos,setsar=1,fps=${fps},format=yuv420p`;

  const stockPrep = buildStockBackgroundPrepFilter(fps, w, h);

  let fc =
    `[0:v]${stockPrep}[bg];` +
    `[1:v]${slideScale}[slide];` +
    `[bg][slide]overlay=${innerX}:${innerY}:shortest=1[base];` +
    `[base]${frameDrawboxes}[slides];` +
    `[2:v]${buildSpeakerOverlayPrepFilter(fps, speakerMaxW)}[sp];` +
    `[slides][sp]overlay=main_w-overlay_w-${marginRight}:main_h-overlay_h-${marginBottom}:shortest=1[vout]`;

  if (withAudio) {
    fc += `;[${audioInputIndex}:a]atrim=0:${totalSec},asetpts=PTS-STARTPTS[aout]`;
  }

  return fc;
}

/**
 * Xóa file tạm stock + speaker sau khi ghép output thành công.
 * @param {object} opts
 * @param {string} opts.downloadsDir
 * @param {string} opts.stockPath
 * @param {string} opts.speakerPath
 */
export function cleanupMakeVideoTempFiles(opts) {
  removeStockBackgroundTempFiles(opts.downloadsDir, opts.stockPath);
  removeSpeakerTempFiles(opts.speakerPath, opts.downloadsDir);
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function probeHasAudio(filePath) {
  try {
    execSync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function probeAudioCodec(filePath) {
  try {
    return execSync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Tạo hoặc tái tạo speaker.webm trước khi ghép video (gọi makeSpeacker).
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.speakerPath]
 * @param {string} [options.speakerInputPath]
 * @param {boolean} [options.forceSpeaker]
 * @returns {Promise<string>}
 */
/**
 * @param {string} downloadsDir
 * @param {string} [customPath]
 * @returns {string}
 */
export function resolveSpeakerAssetPath(downloadsDir, customPath) {
  const mov = path.resolve(customPath ?? path.join(downloadsDir, SPEAKER_OUTPUT_NAME));
  if (fs.existsSync(mov)) return mov;
  const webm = path.join(downloadsDir, 'speaker.webm');
  if (fs.existsSync(webm)) return webm;
  return mov;
}

/**
 * @returns {Promise<{ speakerPath: string, sourcePath: string }>}
 */
export async function ensureSpeakerVideo(options = {}) {
  const downloadsDir = options.downloadsDir ?? PATHS.DOWNLOADS;
  const speakerPath = resolveSpeakerAssetPath(downloadsDir, options.speakerPath);

  let sourcePath;
  try {
    sourcePath = options.speakerInputPath ? path.resolve(options.speakerInputPath) : findLatestSourceMp4(downloadsDir);
  } catch (err) {
    if (fs.existsSync(speakerPath)) {
      console.log(`[make-video] Dùng speaker có sẵn: ${speakerPath}`);
      return { speakerPath, sourcePath: speakerPath };
    }
    throw err;
  }

  const versionPath = `${speakerPath}.version`;
  const storedVersion = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8').trim() : '';
  const legacyWebm = path.join(downloadsDir, 'speaker.webm');
  const sourceMtime = fs.statSync(sourcePath).mtimeMs;
  const speakerMtime = fs.existsSync(speakerPath) ? fs.statSync(speakerPath).mtimeMs : 0;
  const needsRun =
    options.forceSpeaker ||
    !fs.existsSync(speakerPath) ||
    fs.existsSync(legacyWebm) ||
    storedVersion !== String(SPEAKER_FILTER_VERSION) ||
    sourceMtime > speakerMtime;

  if (!needsRun) {
    console.log(`[make-video] Dùng speaker có sẵn: ${speakerPath}`);
    return { speakerPath, sourcePath };
  }

  console.log('[make-video] Đang tạo speaker (makeSpeacker)...');
  return runMakeSpeaker({
    downloadsDir,
    inputPath: sourcePath,
    outputPath: path.join(downloadsDir, SPEAKER_OUTPUT_NAME),
  });
}

/**

 * @param {object} [options]

 * @param {string} [options.downloadsDir]

 * @param {string} [options.imagesDir]

 * @param {string} [options.outputPath]

 * @param {string} [options.speakerPath]

 * @param {string[]} [options.imagePaths]

 * @param {Array<{ start: number, end: number, startTime: string, endTime: string, file: string }>} [options.objectImages]

 * @param {number} [options.imageDurationSec]

 * @param {number} [options.speakerMaxW]
 * @param {string} [options.speakerInputPath]
 * @param {boolean} [options.forceSpeaker]
 * @param {string} [options.stockUrl]
 * @param {boolean} [options.forceStock]
 * @param {string} [options.audioPath]

 */

export async function createVideoFromImages(options = {}) {
  const downloadsDir = options.downloadsDir ?? PATHS.DOWNLOADS;

  const imagesDir = options.imagesDir ?? resolveSlideshowImagesDir(downloadsDir);

  const outputPath = path.resolve(options.outputPath ?? path.join(downloadsDir, OUTPUT_VIDEO_NAME));

  const audioPath = path.resolve(options.audioPath ?? resolveDownloadsAudioPath(downloadsDir));

  if (!fs.existsSync(audioPath)) {
    throw new Error(`createVideoFromImages: không tìm thấy audio ${audioPath}`);
  }

  if (!probeHasAudio(audioPath)) {
    throw new Error(`createVideoFromImages: file không có stream audio: ${audioPath}`);
  }

  const audioDurationSec = await getAudioDurationSeconds(audioPath);
  if (!Number.isFinite(audioDurationSec) || audioDurationSec <= 0) {
    throw new Error(`createVideoFromImages: không đọc được thời lượng audio: ${audioPath}`);
  }

  const totalSec = Math.round(audioDurationSec * 1000) / 1000;

  let slides;

  if (options.objectImages?.length) {
    slides = buildSlidesFromObjectImages(options.objectImages, imagesDir, totalSec);
  } else {
    const imagePaths = options.imagePaths ?? listSlideshowImages(imagesDir);
    const imageDurationSec = options.imageDurationSec ?? IMAGE_DURATION_SEC;

    if (!imagePaths.length) {
      throw new Error(`createVideoFromImages: không có ảnh trong ${imagesDir}`);
    }

    const lastIndex = imagePaths.length - 1;
    slides = imagePaths.map((p, index) => {
      let durationSec = imageDurationSec;
      if (index === lastIndex) {
        durationSec = Math.round((totalSec - (imagePaths.length - 1) * imageDurationSec) * 1000) / 1000;
        if (durationSec <= 0) {
          throw new Error(
            `createVideoFromImages: thời lượng audio (${totalSec}s) không đủ cho ${imagePaths.length} ảnh × ${imageDurationSec}s`,
          );
        }
      }
      return { path: p, durationSec };
    });
  }

  const { speakerPath } = await ensureSpeakerVideo({
    downloadsDir,
    speakerPath: options.speakerPath,
    speakerInputPath: options.speakerInputPath,
    forceSpeaker: options.forceSpeaker,
  });

  const stockPath = await ensureStockBackground({
    downloadsDir,
    stockUrl: options.stockUrl ?? STOCK_VIDEO_URL,
    forceStock: options.forceStock,
  });

  const concatContent = buildImageConcatFileContent(slides);

  const concatPath = path.join(os.tmpdir(), `mavid-slideshow-${Date.now()}.ffconcat`);

  fs.writeFileSync(concatPath, concatContent, 'utf8');

  const filterComplex = buildMakeVideoFilterComplex({
    speakerMaxW: options.speakerMaxW,

    speakerMargin: options.speakerMargin,

    totalSec,

    withAudio: true,
    audioInputIndex: 3,
  });

  const durationSummary = slides.map(s => `${s.durationSec}s`).join(', ');
  console.log(`[make-video] Ảnh: ${slides.length} slide — [${durationSummary}]`);
  console.log(`[make-video] Thời lượng audio: ${totalSec}s (output video)`);

  console.log(`[make-video] Stock nền: ${stockPath} (loop)`);

  console.log(`[make-video] Speaker: ${speakerPath} (loop)`);

  console.log(`[make-video] Audio: ${audioPath}`);

  console.log(`[make-video] Output: ${outputPath}`);

  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const ffmpegArgs = [
      '-hide_banner',

      '-loglevel',

      'error',

      '-y',

      '-i',

      stockPath,

      '-f',

      'concat',

      '-safe',

      '0',

      '-i',

      concatPath,

      '-i',

      speakerPath,
    ];

    ffmpegArgs.push('-i', audioPath);

    ffmpegArgs.push(
      '-filter_complex',

      filterComplex,

      '-map',

      '[vout]',
    );

    ffmpegArgs.push(
      '-map',
      '[aout]',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      'high',
      '-tag:v',
      'avc1',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',

      '+faststart',

      '-t',

      String(totalSec),

      outputPath,
    );

    await ffmpegSpawnAsync(ffmpegArgs);

    if (!options.keepTempFiles) {
      cleanupMakeVideoTempFiles({ downloadsDir, stockPath, speakerPath });
    }
  } finally {
    try {
      fs.unlinkSync(concatPath);
    } catch {
      /* ignore */
    }
  }

  return outputPath;
}

/**

 * @param {object} [options]

 */

/**
 * @param {Array<{ start: number, end: number, startTime: string, endTime: string, file: string }>} objectImages
 * @param {object} [options]
 */
export async function main(objectImages, folder) {
  const out = await createVideoFromImages({ downloadsDir: folder, objectImages });

  console.log(`[make-video] Hoàn tất: ${out}`);

  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const dirArg = process.argv[2];
  const outArg = process.argv[3];
  const downloadsDir = dirArg ? path.resolve(dirArg) : PATHS.DOWNLOADS;

  (async () => {
    const transcriptObjects = await convertTranscript(downloadsDir);
    const imagesDir = resolveSlideshowImagesDir(downloadsDir);
    const count = fs.readdirSync(imagesDir).filter(isSlideshowImage).length;
    const objectImages = await runMappingImages(transcriptObjects, downloadsDir, count);
    return main(objectImages, {
      downloadsDir,
      outputPath: outArg ? path.resolve(outArg) : undefined,
    });
  })().catch(err => {
    console.error(err.message ?? err);

    process.exit(1);
  });
}
