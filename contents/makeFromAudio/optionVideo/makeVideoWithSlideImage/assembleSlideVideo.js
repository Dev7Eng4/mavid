/**
 * Ghép ảnh slide theo timeline transcript + audio (Ken Burns nhẹ, phụ đề, logo).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { STOCK_VIDEO, SUBTITLE, LOGO } from '../../../constants/index.js';
import { GPU_INFO } from '../../../utils/hardware.util.js';
import { srtTimestampToMs } from '../../../utils/srt.util.js';
import {
  OUTPUT_DIR,
  getAudioDurationSeconds,
  formatClockDuration,
  sanitizeFilename,
  getAudioFile,
  getSubtitleFile,
  ffmpegSpawnAsync,
} from '../../shared.js';
import {
  SUBTITLE_MARGIN_BOTTOM_PX,
  SUBTITLE_FONT_FILE,
  SUBTITLE_FONT_DIR,
  scaleSrtTimestamps,
  escapePathForFfmpegSubtitles,
  convertSrtToAss,
  resolveJapaneseSubtitleStyle,
} from '../../subtitle.js';
import { getPrebakedLogoPng } from '../../prepare/logo.js';

const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;
const ZOOM_MAX = 1.08;

/**
 * @param {string} stem — tên file không extension, vd. "1" hoặc "5-7"
 * @returns {{ startId: number, endId: number }}
 */
export function parseImageStem(stem) {
  const s = String(stem ?? '').trim();
  const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const startId = Number.parseInt(rangeMatch[1], 10);
    const endId = Number.parseInt(rangeMatch[2], 10);
    if (!Number.isFinite(startId) || !Number.isFinite(endId) || startId > endId) {
      throw new Error(`parseImageStem: range không hợp lệ "${s}"`);
    }
    return { startId, endId };
  }

  const singleMatch = s.match(/^(\d+)$/);
  if (singleMatch) {
    const id = Number.parseInt(singleMatch[1], 10);
    return { startId: id, endId: id };
  }

  throw new Error(`parseImageStem: không parse được tên ảnh "${s}"`);
}

/**
 * @param {string} timeline — "00:00:00,719 --> 00:00:05,680"
 * @returns {{ startMs: number, endMs: number }}
 */
export function parseTimelineMs(timeline) {
  const parts = String(timeline ?? '').split('-->');
  if (parts.length !== 2) {
    throw new Error(`parseTimelineMs: timeline không hợp lệ "${timeline}"`);
  }
  const startMs = srtTimestampToMs(parts[0].trim());
  const endMs = srtTimestampToMs(parts[1].trim());
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error(`parseTimelineMs: timestamp không hợp lệ "${timeline}"`);
  }
  return { startMs, endMs };
}

/**
 * @param {Array<{ id: number, timeline?: string }>} transcriptObjects
 * @returns {Map<number, { startMs: number, endMs: number }>}
 */
export function buildTranscriptTimeMap(transcriptObjects) {
  const map = new Map();
  for (const item of transcriptObjects) {
    const id = Number(item?.id);
    if (!Number.isFinite(id)) continue;
    if (!item.timeline) {
      throw new Error(`buildTranscriptTimeMap: thiếu timeline cho id ${id}`);
    }
    map.set(id, parseTimelineMs(item.timeline));
  }
  return map;
}

/**
 * @param {string} imagesDir
 * @returns {Array<{ path: string, stem: string, startId: number, endId: number }>}
 */
export function listSlideImages(imagesDir) {
  const dir = path.resolve(imagesDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`listSlideImages: không tìm thấy thư mục ${dir}`);
  }

  const slides = fs
    .readdirSync(dir)
    .filter(f => IMAGE_EXT_RE.test(f))
    .map(f => {
      const stem = path.parse(f).name;
      const { startId, endId } = parseImageStem(stem);
      return { path: path.join(dir, f), stem, startId, endId };
    })
    .sort((a, b) => a.startId - b.startId);

  if (slides.length === 0) {
    throw new Error(`listSlideImages: không có ảnh trong ${dir}`);
  }

  return slides;
}

/**
 * @param {Array<{ path: string, stem: string, startId: number, endId: number }>} slides
 * @param {Map<number, { startMs: number, endMs: number }>} transcriptMap
 * @param {number} speed
 * @param {number} audioDurationAfterTempoSec
 * @param {number} fps
 */
export function buildSlideSegments(slides, transcriptMap, speed, audioDurationAfterTempoSec, fps) {
  const minDuration = 1 / fps;

  function lookupId(id, context) {
    const entry = transcriptMap.get(id);
    if (!entry) {
      throw new Error(`buildSlideSegments: không tìm thấy id ${id} trong transcript (${context})`);
    }
    return entry;
  }

  function scaledStartSec(id) {
    return lookupId(id, `start id ${id}`).startMs / speed / 1000;
  }

  /** @type {Array<{ path: string, stem: string, startId: number, endId: number, startSec: number, endSec: number }>} */
  const raw = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    lookupId(slide.startId, `ảnh ${slide.stem}`);
    lookupId(slide.endId, `ảnh ${slide.stem}`);

    const startSec = scaledStartSec(slide.startId);
    let endSec;
    if (i < slides.length - 1) {
      endSec = scaledStartSec(slides[i + 1].startId);
    } else {
      endSec = audioDurationAfterTempoSec;
    }
    raw.push({ ...slide, startSec, endSec });
  }

  const segments = raw.filter(seg => {
    if (seg.startSec >= audioDurationAfterTempoSec) {
      console.warn(
        `[Slide] Bỏ qua ảnh "${seg.stem}": start ${seg.startSec.toFixed(2)}s >= audio ${audioDurationAfterTempoSec.toFixed(2)}s`,
      );
      return false;
    }
    return true;
  });

  if (segments.length === 0) {
    throw new Error('buildSlideSegments: không còn slide hợp lệ sau khi lọc theo thời lượng audio');
  }

  segments[segments.length - 1].endSec = audioDurationAfterTempoSec;

  for (const seg of segments) {
    seg.endSec = Math.min(seg.endSec, audioDurationAfterTempoSec);
    seg.durationSec = Math.max(seg.endSec - seg.startSec, minDuration);
  }

  return segments;
}

/**
 * @param {object} options
 * @param {Array<{ id: number, timeline?: string, text?: string }>} options.transcriptObjects
 * @param {string} options.imagesDir
 * @param {string} options.downloadsDir
 * @param {number} options.audioSpeed
 * @param {string} [options.perVideoDir]
 * @param {string} [options.originalTitle]
 * @param {string} [options.logoPath]
 * @param {string} [options.videoLanguage]
 */
export async function assembleSlideVideo(options = {}) {
  const {
    transcriptObjects,
    imagesDir,
    downloadsDir,
    audioSpeed: speed,
    perVideoDir,
    originalTitle,
    logoPath: logoPathOpt,
    videoLanguage,
  } = options;

  if (!Array.isArray(transcriptObjects) || transcriptObjects.length === 0) {
    throw new Error('assembleSlideVideo: transcriptObjects rỗng');
  }
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error('assembleSlideVideo: audioSpeed không hợp lệ');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const fps = STOCK_VIDEO.FPS;
  const zpW = Math.ceil((w * ZOOM_MAX) / 2) * 2;
  const zpH = Math.ceil((h * ZOOM_MAX) / 2) * 2;

  const audioPath = getAudioFile(downloadsDir);
  const originalAudioDuration = await getAudioDurationSeconds(audioPath);
  const audioDurationAfterTempo = originalAudioDuration / speed;
  console.log(
    `[Slide] Audio: ${originalAudioDuration.toFixed(1)}s → sau atempo (${speed}): ${formatClockDuration(audioDurationAfterTempo)}`,
  );

  const transcriptMap = buildTranscriptTimeMap(transcriptObjects);
  const slides = listSlideImages(imagesDir);
  const segments = buildSlideSegments(slides, transcriptMap, speed, audioDurationAfterTempo, fps);

  console.log('[Slide] Timing segments:');
  for (const seg of segments) {
    console.log(
      `  ${seg.stem}: ${seg.startSec.toFixed(2)}s → ${seg.endSec.toFixed(2)}s (duration ${seg.durationSec.toFixed(2)}s)`,
    );
  }

  let subtitlePath = getSubtitleFile(downloadsDir);
  const useJaSubtitleStyle = resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage);
  let scaledSrtPath = null;
  if (subtitlePath && speed !== 1) {
    scaledSrtPath = path.join(OUTPUT_DIR, 'temp_scaled_sub_slide' + path.extname(subtitlePath));
    scaleSrtTimestamps(subtitlePath, scaledSrtPath, speed);
    subtitlePath = scaledSrtPath;
  }

  const baseName = originalTitle ? sanitizeFilename(originalTitle) : path.basename(audioPath, path.extname(audioPath));
  const filterScriptPath = path.join(OUTPUT_DIR, 'filter_complex_slide.txt');
  const tempSubPath = subtitlePath ? path.join(OUTPUT_DIR, 'temp_sub_slide.ass') : null;
  const outputPath = path.join(OUTPUT_DIR, `${baseName}-slide.mp4`);

  const logoPathOriginal =
    logoPathOpt != null && String(logoPathOpt).trim() && fs.existsSync(logoPathOpt) ? logoPathOpt : null;
  const prebakedLogo = logoPathOriginal ? await getPrebakedLogoPng(logoPathOriginal, LOGO.SIZE) : null;
  const logoPathForMerge = prebakedLogo || logoPathOriginal;
  const hasLogo = Boolean(logoPathForMerge);
  const logoIsPrebaked = Boolean(prebakedLogo);

  const mergeArgs = ['-y'];
  let inputIdx = 0;

  for (const seg of segments) {
    mergeArgs.push('-loop', '1', '-t', String(seg.durationSec), '-i', seg.path);
    seg._inputIndex = inputIdx++;
  }

  mergeArgs.push('-i', audioPath);
  const audioIndex = inputIdx++;

  let logoIndex = -1;
  if (hasLogo) {
    mergeArgs.push('-i', logoPathForMerge);
    logoIndex = inputIdx++;
  }

  const filterParts = [];
  filterParts.push(`[${audioIndex}:a]atempo=${speed}[aout]`);

  const slideLabels = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const frames = Math.max(1, Math.ceil(seg.durationSec * fps));
    const zoomExpr = `1+0.08*on/${frames}`;
    const label = `v${i}`;
    slideLabels.push(`[${label}]`);

    filterParts.push(
      `[${seg._inputIndex}:v]scale=${zpW}:${zpH}:force_original_aspect_ratio=increase:flags=fast_bilinear,` +
        `crop=${zpW}:${zpH},` +
        `zoompan=z='${zoomExpr}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${w}x${h}:fps=${fps},` +
        `format=yuv420p,setsar=1,trim=duration=${seg.durationSec},setpts=PTS-STARTPTS[${label}]`,
    );
  }

  filterParts.push(`${slideLabels.join('')}concat=n=${segments.length}:v=1:a=0[slidev]`);
  let currentVLabel = 'slidev';

  const subtitleBoxHeight = Math.floor(h / 3);
  if (subtitlePath) {
    convertSrtToAss(subtitlePath, tempSubPath, useJaSubtitleStyle);
    const subPathEscaped = escapePathForFfmpegSubtitles(tempSubPath);
    const fontsDirEscaped = escapePathForFfmpegSubtitles(SUBTITLE_FONT_DIR);
    const boxY = h - subtitleBoxHeight - SUBTITLE_MARGIN_BOTTOM_PX;
    const drawboxFilter = `drawbox=x=0:y=${boxY}:w=iw:h=${subtitleBoxHeight}:color=black@${SUBTITLE.BOX_OPACITY}:t=fill`;
    const subFilter = fs.existsSync(SUBTITLE_FONT_FILE)
      ? `subtitles='${subPathEscaped}:fontsdir=${fontsDirEscaped}'`
      : `subtitles='${subPathEscaped}'`;

    filterParts.push(`[${currentVLabel}]${drawboxFilter},${subFilter}[v_subbed]`);
    currentVLabel = 'v_subbed';
  }

  if (hasLogo) {
    if (logoIsPrebaked) {
      filterParts.push(`[${logoIndex}:v]null[logo]`);
    } else {
      const r = Math.floor(LOGO.SIZE / 2);
      const geqExpr = `if(lte(hypot(X-W/2,Y-H/2),${r}),255,0)`;
      filterParts.push(
        `[${logoIndex}:v]scale=${LOGO.SIZE}:${LOGO.SIZE}:flags=fast_bilinear,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${geqExpr}'[logo]`,
      );
    }
    filterParts.push(
      `[${currentVLabel}][logo]overlay=main_w-overlay_w-${LOGO.MARGIN_RIGHT}:${LOGO.MARGIN_TOP}[vout_final]`,
    );
    currentVLabel = 'vout_final';
  } else {
    filterParts.push(`[${currentVLabel}]copy[vout_final]`);
  }

  fs.writeFileSync(filterScriptPath, filterParts.join(';'), 'utf-8');

  const cpuCount = os.cpus()?.length || 4;
  const filterThreads = String(Math.min(8, Math.max(2, cpuCount - 2)));

  mergeArgs.push(
    '-threads',
    '0',
    '-filter_complex_threads',
    filterThreads,
    '-filter_threads',
    filterThreads,
    '-filter_complex_script',
    filterScriptPath,
    '-map',
    '[vout_final]',
    '-map',
    '[aout]',
    ...GPU_INFO.makeAudioVideoEncodeArgs,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(audioDurationAfterTempo),
    outputPath,
  );

  console.log('[Slide] Đang ghép video...');
  await ffmpegSpawnAsync(mergeArgs);

  if (fs.existsSync(filterScriptPath)) fs.unlinkSync(filterScriptPath);
  if (tempSubPath && fs.existsSync(tempSubPath)) fs.unlinkSync(tempSubPath);
  if (scaledSrtPath && fs.existsSync(scaledSrtPath)) fs.unlinkSync(scaledSrtPath);

  console.log(`\n[Slide] Đã tạo: ${outputPath}`);

  if (perVideoDir) {
    fs.mkdirSync(perVideoDir, { recursive: true });
    const destVideoPath = path.join(perVideoDir, `${baseName}.mp4`);
    fs.copyFileSync(outputPath, destVideoPath);
    console.log(`>>> Đã xuất video vào folder ID: ${destVideoPath}`);
  }

  return { outputPath, segments, audioDurationAfterTempo };
}
