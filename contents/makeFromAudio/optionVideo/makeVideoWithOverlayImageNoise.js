/**
 * Option 1: Tạo video từ stock video + overlay + bar chart.
 * Được tách từ index.js để dễ maintain.
 */

import fs from 'fs';
import path from 'path';

import { STOCK_VIDEO, SUBTITLE, LOGO } from '../../constants/index.js';
import { resolveStockBackgroundsDir } from '../../utils/stockBackgroundsPath.js';
import { GPU_INFO } from '../../utils/hardware.util.js';

import {
  DOWNLOADS_DIR,
  OUTPUT_DIR,
  DEFAULT_STOCK_FOLDER,
  ROOT,
  resolveAudioSpeed,
  getAudioDurationSeconds,
  formatClockDuration,
  sanitizeFilename,
  getAudioFile,
  getSubtitleFile,
  ffmpegSpawnAsync,
} from '../shared.js';

import {
  SUBTITLE_MARGIN_BOTTOM_PX,
  SUBTITLE_FONT_FILE,
  SUBTITLE_FONT_DIR,
  scaleSrtTimestamps,
  escapePathForFfmpegSubtitles,
  convertSrtToAss,
  resolveJapaneseSubtitleStyle,
} from '../subtitle.js';

import { getPrebakedLogoPng } from '../prepare/logo.js';
import { getPrebakedNoiseMov } from '../prepare/noise.js';
import { ASSET_CHART_DIR, getPrebakedChartVideo, pickFirstChartVideo, getChartVideoFiles } from '../prepare/chart.js';
import {
  STOCK_OVERLAY_DIR,
  STOCK_OVERLAY_PTS_MULT,
  pickFirstOverlayVideo,
  getOverlayVideoFiles,
  getPrebakedStockOverlayVideo,
  stockOverlayScaleCropAlphaSubchain,
} from '../prepare/stockOverlay.js';
import { prepareStockVisualClip, isVisualResourceStock } from '../prepare/stockVisual.js';
import { getStockVideos, buildStockSegmentPlan, updateStockUsage } from '../prepare/stockSegment.js';
import { isIsolatedDownloadsJobDir, rmDirQuiet } from '../postRenderCleanup.util.js';

// ==========================================
// RENDER CONSTANTS (positioning, not prepare)
// ==========================================

/** Rộng tối đa (px) khi thu chart đặt góc phải trên. */
const CHART_CORNER_MAX_WIDTH = 400;
const CHART_MARGIN_TOP = 20;
const CHART_MARGIN_RIGHT = 20;

/** Khớp `GENERAL_IMAGE_NAME` trong prepareVideoInfo — Flow lưu `{name}.jpg` trong downloadsDir. */
const SI_GENERAL_BACKGROUND_BASENAME = 'background';

/** Ảnh trung tâm (SI): tỉ lệ rộng so với chiều rộng canvas (0–1). */
const SI_CENTER_IMAGE_WIDTH_RATIO = 0.9;

/** Ảnh trung tâm (SI): alpha khi overlay (0–1). */
const SI_CENTER_IMAGE_OPACITY = 0.85;

/**
 * Ảnh nền trung tâm cho SI: ưu tiên `options.centerImageOverlayPath`, không có thì tìm `background.{jpg,jpeg,png,webp}` trong `downloadsDir`.
 * @param {string|undefined|null} explicitPath
 * @param {string} downloadsDir
 * @returns {string|null}
 */
function resolveSiCenterBackgroundImage(explicitPath, downloadsDir) {
  if (explicitPath != null && String(explicitPath).trim()) {
    const abs = path.resolve(String(explicitPath).trim());
    if (fs.existsSync(abs)) return abs;
    console.warn(`[SI] centerImageOverlayPath không tồn tại: ${abs} — thử ${SI_GENERAL_BACKGROUND_BASENAME}.* trong downloadsDir`);
  }
  if (!downloadsDir || !fs.existsSync(downloadsDir)) return null;
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(downloadsDir, `${SI_GENERAL_BACKGROUND_BASENAME}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Tìm file ảnh trong `dir` có tên file (không extension) khớp `basename`, không phân biệt hoa thường. */
function findImageInDirByBasename(dir, basename) {
  if (!dir || !fs.existsSync(dir)) return null;
  const lowerBase = basename.toLowerCase();
  const imageNameRe = /\.(jpe?g|png|webp)$/i;
  for (const f of fs.readdirSync(dir)) {
    if (!imageNameRe.test(f)) continue;
    if (path.parse(f).name.toLowerCase() === lowerBase) return path.join(dir, f);
  }
  return null;
}

// ==========================================
// FILTER HELPERS
// ==========================================

function stockNormalizeFilterInner(slowmoFactor, isFlip = false) {
  const { CANVAS_W: w, CANVAS_H: h, FPS: f, SLOWMO_FACTOR } = STOCK_VIDEO;
  const factor = slowmoFactor ?? SLOWMO_FACTOR;
  const slowmo = factor !== 1.0 ? `,setpts=${factor.toFixed(4)}*PTS` : '';
  const flipFilter = isFlip ? ',hflip' : '';
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p${flipFilter}${slowmo},fps=${f},setsar=1`;
}

function stockNormalizeFilterChain(inputLabel, outLabel, slowmoFactor, isFlip = false) {
  return `[${inputLabel}]${stockNormalizeFilterInner(slowmoFactor, isFlip)}[${outLabel}]`;
}

// ==========================================
// MAIN: makeVideoWithOverlayImageNoise
// ==========================================

/**
 * Option 1: Tạo video từ audio + stock video + overlay + bar chart
 * @param {string} bgNameArg - Tên background
 * @param {object} [options] - Tùy chọn
 * @param {string} [options.perVideoDir]
 * @param {string} [options.originalTitle]
 * @param {string} [options.description]
 * @param {string} [options.tags]
 * @param {string} [options.url]
 * @param {object} [options.geminiByUrl]
 * @param {number} [options.audioSpeed]
 * @param {number} [options.stockVideoCount]
 * @param {string|null} [options.logoPath]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.videoLanguage]
 * @param {string} [options.centerImageOverlayPath] - Ảnh ghép giữa khung; nếu thiếu sẽ tự tìm `background.jpg` (v.v.) trong downloadsDir như pipeline IN / Flow.
 */
export async function makeVideoWithOverlayImageNoise(bgNameArg, options = {}) {
  const {
    perVideoDir,
    originalTitle,
    audioSpeed: speedIn,
    stockVideoCount: stockCountOpt,
    logoPath: logoPathOpt,
    downloadsDir = DOWNLOADS_DIR,
    videoLanguage,
  } = options;
  const speed = speedIn != null && Number.isFinite(Number(speedIn)) && Number(speedIn) > 0 ? Number(speedIn) : resolveAudioSpeed({});
  const stockBgRoot = resolveStockBackgroundsDir();
  let backgroundName = bgNameArg;
  const useVisualStock = true;

  let backgroundsDir = null;
  // if (!useVisualStock) {
  //   backgroundsDir = path.join(stockBgRoot, backgroundName);
  //   if (!fs.existsSync(backgroundsDir)) {
  //     console.warn(`Không tìm thấy folder backgrounds/${backgroundName}/ (MaVidMedia/backgrounds), thử "${DEFAULT_STOCK_FOLDER}"`);
  //     backgroundName = DEFAULT_STOCK_FOLDER;
  //     backgroundsDir = path.join(stockBgRoot, backgroundName);
  //   }
  //   if (!fs.existsSync(backgroundsDir)) {
  //     throw new Error(
  //       `Không tìm thấy folder stock "${backgroundName}" trong ${stockBgRoot}/ — kiểm tra Settings (VIDEO_STORAGE_ROOT) và tạo thư mục con tương ứng.`,
  //     );
  //   }
  // }

  if (!fs.existsSync(downloadsDir)) {
    throw new Error('Không tìm thấy folder ' + downloadsDir);
  }

  const audioPath = getAudioFile(downloadsDir);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Chỉnh tốc độ audio trong Graph
  const originalAudioDuration = await getAudioDurationSeconds(audioPath);
  const audioDurationAfterTempo = originalAudioDuration / speed;
  console.log(
    `Thời lượng audio gốc: ${originalAudioDuration.toFixed(1)}s, sau atempo (SPEED=${speed}): ${formatClockDuration(
      audioDurationAfterTempo,
    )} (${audioDurationAfterTempo.toFixed(1)}s)`,
  );

  // 2. Lấy video stock — 2 trường hợp: local folder hoặc visual resource (YouTube)
  const stockRenderTarget = audioDurationAfterTempo + STOCK_VIDEO.RENDER_EXTRA_SEC;
  let stockSegments;
  let stockTempDir = null;

  if (useVisualStock) {
    console.log(`[StockVisual] Background "${backgroundName}" là visual resource stock — tải từ YouTube...`);
    const result = await prepareStockVisualClip(audioDurationAfterTempo);
    if (!result.hasStock) {
      throw new Error(`[StockVisual] Không thể tải/xử lý video stock từ visual resource "${backgroundName}".`);
    }
    stockTempDir = result.stockTempDir;
    stockSegments = [{ path: result.stockClipPath, duration: stockRenderTarget, slowmoFactor: 1.0, isFlip: false }];
  } else {
    const videoPaths = getStockVideos(backgroundsDir);
    console.log(`Đã nạp danh sách ${videoPaths.length} stock video từ thư mục (sẽ chọn ngẫu nhiên để ghép).`);
    stockSegments = await buildStockSegmentPlan(videoPaths, stockRenderTarget);
    updateStockUsage(stockSegments, backgroundsDir);
  }

  // 3. Xử lý phụ đề (scale timestamps nếu SPEED != 1)
  let subtitlePath = getSubtitleFile(downloadsDir);
  const useJaSubtitleStyle = resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage);
  let scaledSrtPath = null;
  if (subtitlePath && speed !== 1) {
    scaledSrtPath = path.join(OUTPUT_DIR, 'temp_scaled_sub' + path.extname(subtitlePath));
    scaleSrtTimestamps(subtitlePath, scaledSrtPath, speed);
    subtitlePath = scaledSrtPath;
    console.log(`Phụ đề (đã scale theo SPEED=${speed}): ${path.basename(scaledSrtPath)}`);
  } else if (subtitlePath) {
    console.log(`Phụ đề: ${path.basename(subtitlePath)}`);
  }

  const baseName = originalTitle ? sanitizeFilename(originalTitle) : path.basename(audioPath, path.extname(audioPath));
  const filterScriptPath = path.join(OUTPUT_DIR, 'filter_complex.txt');
  const tempSubPath = subtitlePath ? path.join(OUTPUT_DIR, 'temp_sub.ass') : null;
  const outputPath = path.join(OUTPUT_DIR, `${baseName}-with-bg.mp4`);

  console.log(`Đang dựng video Single-Pass Pipeline (${stockSegments.length} clip stock, encode: ${GPU_INFO.encoderLabel})...`);

  const logoPathOriginal = logoPathOpt != null && String(logoPathOpt).trim() && fs.existsSync(logoPathOpt) ? logoPathOpt : null;
  const prebakedLogo = logoPathOriginal ? await getPrebakedLogoPng(logoPathOriginal, LOGO.SIZE) : null;
  const logoPathForMerge = prebakedLogo || logoPathOriginal;
  const hasLogo = Boolean(logoPathForMerge);
  const logoIsPrebaked = Boolean(prebakedLogo);

  const stockOverlayDir = path.join(stockBgRoot, STOCK_OVERLAY_DIR);
  const stockOverlaySourcePath = pickFirstOverlayVideo(stockOverlayDir);
  const hasStockOverlay = Boolean(stockOverlaySourcePath);
  let usePrebakedOverlay = false;
  let pathForOverlayInput = null;
  if (hasStockOverlay) {
    const prebaked = await getPrebakedStockOverlayVideo(stockOverlaySourcePath, path.join(stockOverlayDir, '.cache'));
    usePrebakedOverlay = Boolean(prebaked);
    pathForOverlayInput = prebaked || stockOverlaySourcePath;
  } else {
    if (fs.existsSync(stockOverlayDir) && getOverlayVideoFiles(stockOverlayDir).length === 0) {
      console.log(`[overlay] Có thư mục ${STOCK_OVERLAY_DIR}/ nhưng không có file video (mp4/mov/mkv/webm) — bỏ qua lớp overlay.`);
    }
  }

  const chartSourcePath = pickFirstChartVideo();
  const hasChart = Boolean(chartSourcePath);
  const prebakedChart = hasChart ? await getPrebakedChartVideo(chartSourcePath, CHART_CORNER_MAX_WIDTH, STOCK_VIDEO.FPS) : null;
  const chartPathForMerge = prebakedChart || chartSourcePath;
  const chartIsPrebaked = Boolean(prebakedChart);
  if (fs.existsSync(ASSET_CHART_DIR) && getChartVideoFiles(ASSET_CHART_DIR).length === 0) {
    console.log('[chart] Thư mục assets/chart/ trống — bỏ qua lớp bar chart góc phải trên.');
  }

  // --- BUILD GRAPH ---
  const mergeArgs = ['-y'];
  let inputIdx = 0;

  const stockDecodeArgs = Array.isArray(GPU_INFO.stockDecodeArgs) ? GPU_INFO.stockDecodeArgs : [];

  for (const s of stockSegments) {
    if (!useVisualStock && stockDecodeArgs.length > 0) mergeArgs.push(...stockDecodeArgs);
    if (stockSegments.length === 1 && s.duration < stockRenderTarget - 0.01) {
      mergeArgs.push('-stream_loop', '-1', '-i', s.path);
    } else {
      mergeArgs.push('-i', s.path);
    }
    inputIdx++;
  }

  let overlayIndex = -1;
  if (hasStockOverlay && pathForOverlayInput) {
    overlayIndex = inputIdx++;
    mergeArgs.push('-stream_loop', '-1', '-i', pathForOverlayInput);
    console.log(
      `[overlay] Lớp phủ: ${path.basename(stockOverlaySourcePath)} (merge: ${
        usePrebakedOverlay ? 'cache ProRes' : 'single-pass trên bản gốc'
      })`,
    );
  }

  const audioIndex = inputIdx++;
  mergeArgs.push('-i', audioPath);

  let chartIndex = -1;
  if (hasChart) {
    chartIndex = inputIdx++;
    mergeArgs.push('-stream_loop', '-1', '-i', chartPathForMerge);
    console.log(
      `[chart] Góc phải trên: ${path.basename(chartSourcePath)} (max ${CHART_CORNER_MAX_WIDTH}px rộng, lặp theo hết video, ${
        chartIsPrebaked ? 'cache ProRes' : 'realtime'
      })`,
    );
  }

  let logoIndex = -1;
  if (hasLogo) {
    logoIndex = inputIdx++;
    mergeArgs.push('-i', logoPathForMerge);
  }

  const centerImageOverlayPath = resolveSiCenterBackgroundImage(options.centerImageOverlayPath, downloadsDir);
  const hasCenterImg = Boolean(centerImageOverlayPath);
  if (!hasCenterImg) {
    console.warn(
      `[SI] Không có ảnh nền trung tâm (${SI_GENERAL_BACKGROUND_BASENAME}.jpg|jpeg|png|webp trong downloads hoặc centerImageOverlayPath). ` +
        'Video chỉ dùng stock + các lớp overlay khác.',
    );
  }
  let centerImgIndex = -1;
  if (hasCenterImg) {
    centerImgIndex = inputIdx++;
    mergeArgs.push('-loop', '1', '-i', centerImageOverlayPath);
    console.log(
      `[overlay] Ảnh nền trung tâm: ${path.basename(centerImageOverlayPath)} (${Math.round(
        SI_CENTER_IMAGE_WIDTH_RATIO * 100,
      )}% rộng canvas, opacity ${SI_CENTER_IMAGE_OPACITY})`,
    );
  }

  // Noise overlay cho SI mode (chỉ khi có center image)
  const siNoisePath = path.join(ROOT, 'assets', 'noise', 'noise.mp4');
  const hasSiNoise = hasCenterImg && fs.existsSync(siNoisePath);
  const SI_NOISE_ALPHA = 0.6;
  let siNoiseIndex = -1;
  let prebakedSiNoise = null;
  if (hasSiNoise) {
    prebakedSiNoise = await getPrebakedNoiseMov(siNoisePath, STOCK_VIDEO.CANVAS_W, STOCK_VIDEO.CANVAS_H, STOCK_VIDEO.FPS, SI_NOISE_ALPHA);
    const siNoiseInputPath = prebakedSiNoise || siNoisePath;
    siNoiseIndex = inputIdx++;
    mergeArgs.push('-stream_loop', '-1', '-i', siNoiseInputPath);
    console.log(`[SI noise] Noise overlay: ${path.basename(siNoisePath)} (alpha ${SI_NOISE_ALPHA})`);
  }

  const filterParts = [];

  // Audio graph
  filterParts.push(`[${audioIndex}:a]atempo=${speed}[aout]`);

  // Video Background graph
  const useXfade = STOCK_VIDEO.USE_XFADE === true;
  let vBgLabel = 'vout_bg';
  if (stockSegments.length === 1) {
    filterParts.push(stockNormalizeFilterChain(`0:v`, vBgLabel, stockSegments[0].slowmoFactor, stockSegments[0].isFlip));
  } else if (useXfade) {
    const minDur = Math.min(...stockSegments.map(s => s.duration));
    const fade = Math.max(0.15, Math.min(STOCK_VIDEO.CROSSFADE_SEC, minDur * 0.45));
    for (let i = 0; i < stockSegments.length; i++) {
      filterParts.push(stockNormalizeFilterChain(`${i}:v`, `s${i}`, stockSegments[i].slowmoFactor, stockSegments[i].isFlip));
    }
    let accLen = stockSegments[0].duration;
    let cur = 's0';
    for (let i = 1; i < stockSegments.length; i++) {
      const offset = accLen - fade;
      const outTag = i === stockSegments.length - 1 ? vBgLabel : `xf${i}`;
      filterParts.push(`[${cur}][s${i}]xfade=transition=fade:duration=${fade.toFixed(4)}:offset=${offset.toFixed(4)}[${outTag}]`);
      cur = outTag;
      accLen += stockSegments[i].duration - fade;
    }
  } else {
    for (let i = 0; i < stockSegments.length; i++) {
      filterParts.push(stockNormalizeFilterChain(`${i}:v`, `s${i}`, stockSegments[i].slowmoFactor, stockSegments[i].isFlip));
    }
    const concatInputs = stockSegments.map((_, i) => `[s${i}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${stockSegments.length}:v=1:a=0[${vBgLabel}]`);
  }

  let currentVLabel = vBgLabel;
  if (hasStockOverlay && overlayIndex >= 0) {
    if (usePrebakedOverlay) {
      filterParts.push(`[${overlayIndex}:v]fps=${STOCK_VIDEO.FPS},setsar=1[ovlay]`);
    } else {
      const pm = STOCK_OVERLAY_PTS_MULT;
      const chain = stockOverlayScaleCropAlphaSubchain();
      filterParts.push(`[${overlayIndex}:v]setpts=${pm}*PTS,${chain},fps=${STOCK_VIDEO.FPS},setsar=1[ovlay]`);
    }
    filterParts.push(`[${currentVLabel}][ovlay]overlay=0:0[v_plated]`);
    currentVLabel = 'v_plated';
  }

  // SI mode: làm tối nền stock ~0.8 — dùng lutyuv (Y only) vì nguồn là yuv420p; lut r/g/b trên YUV lệch sắc độ
  if (hasCenterImg) {
    filterParts.push(`[${currentVLabel}]lutyuv=y='val*0.8':u='val':v='val'[v_dimmed]`);
    currentVLabel = 'v_dimmed';
  }

  if (hasCenterImg && centerImgIndex >= 0) {
    const targetW = Math.round(STOCK_VIDEO.CANVAS_W * SI_CENTER_IMAGE_WIDTH_RATIO);
    filterParts.push(
      `[${centerImgIndex}:v]fps=${STOCK_VIDEO.FPS},scale=${targetW}:-1,format=rgba,colorchannelmixer=aa=${SI_CENTER_IMAGE_OPACITY}[center_img]`,
    );
    filterParts.push(`[${currentVLabel}][center_img]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:shortest=1[v_centered_img]`);
    currentVLabel = 'v_centered_img';
  }

  // SI noise overlay (sau center image)
  if (hasSiNoise && siNoiseIndex >= 0) {
    if (prebakedSiNoise) {
      filterParts.push(`[${siNoiseIndex}:v]null[si_noise]`);
    } else {
      filterParts.push(
        `[${siNoiseIndex}:v]fps=${STOCK_VIDEO.FPS},scale=${STOCK_VIDEO.CANVAS_W}:${STOCK_VIDEO.CANVAS_H}:flags=fast_bilinear,format=yuva420p,colorkey=0x000000:0.1:0.1,colorchannelmixer=aa=${SI_NOISE_ALPHA}[si_noise]`,
      );
    }
    filterParts.push(`[${currentVLabel}][si_noise]overlay=0:0:shortest=1[v_si_noised]`);
    currentVLabel = 'v_si_noised';
  }

  // Drawbox + Subtitles Graph (gộp 1 chain — bỏ split/crop/overlay)
  if (subtitlePath) {
    convertSrtToAss(subtitlePath, tempSubPath, useJaSubtitleStyle);
    const subPathEscaped = escapePathForFfmpegSubtitles(tempSubPath);
    const fontsDirEscaped = escapePathForFfmpegSubtitles(SUBTITLE_FONT_DIR);
    const subtitleBoxHeight = Math.floor(STOCK_VIDEO.CANVAS_H / 3);
    const boxY = STOCK_VIDEO.CANVAS_H - subtitleBoxHeight - SUBTITLE_MARGIN_BOTTOM_PX;
    const drawboxFilter = `drawbox=x=0:y=${boxY}:w=iw:h=${subtitleBoxHeight}:color=black@${SUBTITLE.BOX_OPACITY}:t=fill`;
    const subFilter = fs.existsSync(SUBTITLE_FONT_FILE)
      ? `subtitles='${subPathEscaped}:fontsdir=${fontsDirEscaped}'`
      : `subtitles='${subPathEscaped}'`;

    filterParts.push(`[${currentVLabel}]${drawboxFilter},${subFilter}[v_subbed]`);

    currentVLabel = 'v_subbed';
  } else {
    filterParts.push(`[${currentVLabel}]null[vpadded]`);
    currentVLabel = 'vpadded';
  }

  // Bar chart (assets/chart) — TẠM THỜI TẮT
  // if (hasChart && chartIndex >= 0) {
  //   const wCap = CHART_CORNER_MAX_WIDTH;
  //   const mr = CHART_MARGIN_RIGHT;
  //   const h_box = Math.floor(STOCK_VIDEO.CANVAS_H / 3);
  //   const boxY = STOCK_VIDEO.CANVAS_H - h_box - SUBTITLE_MARGIN_BOTTOM_PX;
  //   const f = STOCK_VIDEO.FPS;
  //
  //   if (chartIsPrebaked) {
  //     filterParts.push(`[${chartIndex}:v]null[chartvid]`);
  //   } else {
  //     filterParts.push(
  //       `[${chartIndex}:v]scale=${wCap}:-2:flags=fast_bilinear,colorkey=0x000000:0.1:0.1,format=yuva420p,fps=${f}[chartvid]`
  //     );
  //   }
  //   filterParts.push(`[${currentVLabel}][chartvid]overlay=main_w-overlay_w-${mr}:${boxY}-overlay_h[v_charted]`);
  //   currentVLabel = 'v_charted';
  // }

  // Logo Graph
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
    filterParts.push(`[${currentVLabel}][logo]overlay=main_w-overlay_w-${LOGO.MARGIN_RIGHT}:${LOGO.MARGIN_TOP}[vout_final]`);
    currentVLabel = 'vout_final';
  } else {
    filterParts.push(`[${currentVLabel}]copy[vout_final]`);
  }

  const fullGraph = filterParts.join(';');
  fs.writeFileSync(filterScriptPath, fullGraph, 'utf-8');

  mergeArgs.push(
    '-filter_complex_script',
    filterScriptPath,
    '-map',
    '[vout_final]',
    '-map',
    '[aout]',
    ...GPU_INFO.videoEncodeArgs,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(audioDurationAfterTempo),
    outputPath,
  );

  console.log(`Đang merge nội dung Single-Pass Pipeline...`);
  await ffmpegSpawnAsync(mergeArgs);

  if (fs.existsSync(filterScriptPath)) fs.unlinkSync(filterScriptPath);
  if (tempSubPath && fs.existsSync(tempSubPath)) fs.unlinkSync(tempSubPath);
  if (scaledSrtPath && fs.existsSync(scaledSrtPath)) fs.unlinkSync(scaledSrtPath);

  if (stockTempDir) {
    rmDirQuiet(stockTempDir);
    console.log(`[StockVisual] Đã xóa thư mục stock tạm trong output: ${stockTempDir}`);
  }

  console.log(`\nĐã tạo: ${outputPath}`);

  // Nếu có perVideoDir (batch mode), copy kết quả và lưu metadata
  if (perVideoDir) {
    fs.mkdirSync(perVideoDir, { recursive: true });

    const destVideoPath = path.join(perVideoDir, `${baseName}.mp4`);
    fs.copyFileSync(outputPath, destVideoPath);
    console.log(`>>> Đã xuất video vào folder ID: ${destVideoPath}`);

    // Thumbnail YouTube, Flow và file Transcript (SRT/VTT)
    if (fs.existsSync(downloadsDir)) {
      const downloadFiles = fs.readdirSync(downloadsDir);

      for (const thumbBase of ['thumbnail', 'flow-thumbnail']) {
        const thumbSrc = findImageInDirByBasename(downloadsDir, thumbBase);
        console.log('🚀 ~ makeVideoWithOverlayImageNoise ~ thumbSrc:', thumbSrc);
        if (thumbSrc) {
          const thumbDestPath = path.join(perVideoDir, path.basename(thumbSrc));
          fs.copyFileSync(thumbSrc, thumbDestPath);
          console.log(`>>> Đã copy ảnh ${thumbBase}: ${thumbDestPath}`);
        }
      }

      const transcriptFiles = downloadFiles.filter(f => /\.(srt|vtt)$/i.test(f));
      for (const transcript of transcriptFiles) {
        const trDestPath = path.join(perVideoDir, transcript);
        fs.copyFileSync(path.join(downloadsDir, transcript), trDestPath);
        console.log(`>>> Đã lưu trữ file transcript gốc: ${trDestPath}`);
      }

      const metaFiles = downloadFiles.filter(f => /\.(json)$/i.test(f));
      for (const meta of metaFiles) {
        const metaDestPath = path.join(perVideoDir, meta);
        fs.copyFileSync(path.join(downloadsDir, meta), metaDestPath);
      }
    }
  }

  if (isIsolatedDownloadsJobDir(downloadsDir)) {
    rmDirQuiet(downloadsDir);
    console.log(`[cleanup] Đã xóa thư mục tạm downloads: ${downloadsDir}`);
  }
}
