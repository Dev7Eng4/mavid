/**

 * Tạo MP4 từ ảnh (mỗi ảnh 12s) + overlay speaker.mov (alpha) — nền trong suốt, thấy ảnh phía sau.

 *

 * Usage:

 *   node contents/process/makeVideo.js

 *   node contents/process/makeVideo.js [downloadsDir] [output.mp4]
 *
 * Tự chạy makeSpeacker nếu chưa có speaker.webm hoặc video nguồn mới hơn.

 */



import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

import path from 'path';

import { fileURLToPath } from 'url';



import { STOCK_VIDEO } from '../constants/index.js';

import { PATHS } from '../constants/paths.js';

import { ffmpegSpawnAsync } from '../makeFromAudio/shared.js';

import {
  SPEAKER_FILTER_VERSION,
  SPEAKER_OUTPUT_NAME,
  buildSpeakerOverlayPrepFilter,
  findLatestSourceMp4,
  main as runMakeSpeaker,
} from './makeSpeacker.js';



export const IMAGE_DURATION_SEC = 12;

export const OUTPUT_VIDEO_NAME = 'output.mp4';



const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;



/** Chiều rộng tối đa overlay speaker (px) trên canvas 1280×720. */

export const SPEAKER_OVERLAY_MAX_W = 360;



/** Lề trái overlay speaker (px). */

export const SPEAKER_OVERLAY_MARGIN_LEFT = 8;



/** Lề dưới overlay speaker (px). */

export const SPEAKER_OVERLAY_MARGIN_BOTTOM = 20;



/** Khoảng cách từ khung bảng đến các mép canvas (px). */

export const FRAME_MARGIN_TOP = 20;

export const FRAME_MARGIN_LEFT = 20;

export const FRAME_MARGIN_BOTTOM = 20;

export const FRAME_MARGIN_RIGHT = 80;

/** Bề rộng vùng viền giữa hai đường (px). */

export const FRAME_BORDER_WIDTH = 20;

/** Màu vùng viền (cyan), dùng định dạng 0xRRGGBB cho ffmpeg drawbox. */

export const FRAME_BORDER_COLOR = '0x00BFFF';

/** Màu của hai đường viền mỏng (mép ngoài & mép trong). */

export const FRAME_OUTLINE_COLOR = 'black';

/** Bề dày của hai đường viền mỏng (px). */

export const FRAME_OUTLINE_THICKNESS = 2;



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

 * Ảnh slideshow trong thư mục, sort theo tên (1-7, 8-12, …).

 * @param {string} [dir]

 * @returns {string[]}

 */

export function listSlideshowImages(dir = PATHS.DOWNLOADS) {

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

export function buildImageConcatFileContent(imagePaths, durationSec = IMAGE_DURATION_SEC) {

  if (!imagePaths.length) {

    throw new Error('buildImageConcatFileContent: cần ít nhất một ảnh');

  }



  const lines = ['ffconcat version 1.0'];

  for (const abs of imagePaths) {

    const normalized = abs.replace(/\\/g, '/').replace(/'/g, "'\\''");

    lines.push(`file '${normalized}'`);

    lines.push(`duration ${durationSec}`);

  }

  const last = imagePaths[imagePaths.length - 1].replace(/\\/g, '/').replace(/'/g, "'\\''");

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
 * @param {boolean} [opts.withSpeakerAudio]

 * @returns {string}

 */

export function buildMakeVideoFilterComplex(opts = {}) {

  const w = opts.width ?? STOCK_VIDEO.CANVAS_W;

  const h = opts.height ?? STOCK_VIDEO.CANVAS_H;

  const fps = opts.fps ?? 24;

  const speakerMaxW = opts.speakerMaxW ?? SPEAKER_OVERLAY_MAX_W;

  const marginLeft = opts.speakerMarginLeft ?? SPEAKER_OVERLAY_MARGIN_LEFT;

  const marginBottom = opts.speakerMarginBottom ?? SPEAKER_OVERLAY_MARGIN_BOTTOM;

  const totalSec = opts.totalSec ?? 0;

  const withAudio = opts.withSpeakerAudio && totalSec > 0;



  const outerX = FRAME_MARGIN_LEFT;

  const outerY = FRAME_MARGIN_TOP;

  const outerW = w - FRAME_MARGIN_LEFT - FRAME_MARGIN_RIGHT;

  const outerH = h - FRAME_MARGIN_TOP - FRAME_MARGIN_BOTTOM;

  const innerX = outerX + FRAME_BORDER_WIDTH;

  const innerY = outerY + FRAME_BORDER_WIDTH;

  const innerW = outerW - 2 * FRAME_BORDER_WIDTH;

  const innerH = outerH - 2 * FRAME_BORDER_WIDTH;

  const innerOutlineX = innerX - FRAME_OUTLINE_THICKNESS;

  const innerOutlineY = innerY - FRAME_OUTLINE_THICKNESS;

  const innerOutlineW = innerW + 2 * FRAME_OUTLINE_THICKNESS;

  const innerOutlineH = innerH + 2 * FRAME_OUTLINE_THICKNESS;



  const padSlide =

    `scale=${innerW}:${innerH}:force_original_aspect_ratio=decrease:flags=lanczos,` +

    `pad=${w}:${h}:${innerX}+(${innerW}-iw)/2:${innerY}+(${innerH}-ih)/2:color=black,` +

    `setsar=1,fps=${fps},format=yuv420p,` +

    `drawbox=x=${outerX}:y=${outerY}:w=${outerW}:h=${outerH}:color=${FRAME_BORDER_COLOR}:t=${FRAME_BORDER_WIDTH},` +

    `drawbox=x=${outerX}:y=${outerY}:w=${outerW}:h=${outerH}:color=${FRAME_OUTLINE_COLOR}:t=${FRAME_OUTLINE_THICKNESS},` +

    `drawbox=x=${innerOutlineX}:y=${innerOutlineY}:w=${innerOutlineW}:h=${innerOutlineH}:color=${FRAME_OUTLINE_COLOR}:t=${FRAME_OUTLINE_THICKNESS}`;



  let fc =

    `[0:v]${padSlide}[slides];` +

    `[1:v]${buildSpeakerOverlayPrepFilter(fps, speakerMaxW)}[sp];` +

    `[slides][sp]overlay=${marginLeft}:main_h-overlay_h-${marginBottom}:shortest=1[vout]`;

  if (withAudio) {
    fc += `;[2:a]aloop=loop=-1:size=2e+09,atrim=0:${totalSec},asetpts=PTS-STARTPTS[aout]`;
  }

  return fc;

}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function probeHasAudio(filePath) {
  try {
    execSync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
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
    return execSync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
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
    sourcePath = options.speakerInputPath
      ? path.resolve(options.speakerInputPath)
      : findLatestSourceMp4(downloadsDir);
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

 * @param {string} [options.outputPath]

 * @param {string} [options.speakerPath]

 * @param {string[]} [options.imagePaths]

 * @param {number} [options.imageDurationSec]

 * @param {number} [options.speakerMaxW]
 * @param {string} [options.speakerInputPath]
 * @param {boolean} [options.forceSpeaker]

 */

export async function createVideoFromImages(options = {}) {

  const downloadsDir = options.downloadsDir ?? PATHS.DOWNLOADS;

  const outputPath = path.resolve(options.outputPath ?? path.join(downloadsDir, OUTPUT_VIDEO_NAME));

  const imagePaths = options.imagePaths ?? listSlideshowImages(downloadsDir);

  const imageDurationSec = options.imageDurationSec ?? IMAGE_DURATION_SEC;



  if (!imagePaths.length) {

    throw new Error(`createVideoFromImages: không có ảnh trong ${downloadsDir}`);

  }



  const { speakerPath, sourcePath } = await ensureSpeakerVideo({
    downloadsDir,
    speakerPath: options.speakerPath,
    speakerInputPath: options.speakerInputPath,
    forceSpeaker: options.forceSpeaker,
  });



  const totalSec = imagePaths.length * imageDurationSec;

  const concatContent = buildImageConcatFileContent(imagePaths, imageDurationSec);

  const concatPath = path.join(os.tmpdir(), `mavid-slideshow-${Date.now()}.ffconcat`);

  fs.writeFileSync(concatPath, concatContent, 'utf8');



  const hasSpeakerAudio = probeHasAudio(sourcePath);

  const filterComplex = buildMakeVideoFilterComplex({

    speakerMaxW: options.speakerMaxW,

    speakerMargin: options.speakerMargin,

    totalSec,

    withSpeakerAudio: hasSpeakerAudio,

  });



  console.log(`[make-video] Ảnh: ${imagePaths.length} × ${imageDurationSec}s ≈ ${totalSec}s`);

  console.log(`[make-video] Speaker: ${speakerPath} (loop)`);

  console.log(`[make-video] Output: ${outputPath}`);



  try {

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });



    const ffmpegArgs = [

      '-hide_banner',

      '-loglevel',

      'error',

      '-y',

      '-f',

      'concat',

      '-safe',

      '0',

      '-i',

      concatPath,

      '-i',

      speakerPath,

      '-i',

      sourcePath,

      '-filter_complex',

      filterComplex,

      '-map',

      '[vout]',
    ];

    if (hasSpeakerAudio) {
      ffmpegArgs.push('-map', '[aout]');
    }

    ffmpegArgs.push(

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

export async function main(options = {}) {

  const out = await createVideoFromImages(options);

  console.log(`[make-video] Hoàn tất: ${out}`);

  return out;

}



const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));



if (isMain) {

  const dirArg = process.argv[2];

  const outArg = process.argv[3];



  main({

    downloadsDir: dirArg ? path.resolve(dirArg) : undefined,

    outputPath: outArg ? path.resolve(outArg) : undefined,

  }).catch(err => {

    console.error(err.message ?? err);

    process.exit(1);

  });

}


