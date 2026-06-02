import fs from 'fs';
import os from 'os';
import path from 'path';

import { STOCK_VIDEO, SUBTITLE, LOGO } from '../../constants/index.js';
import { GPU_INFO } from '../../utils/hardware.util.js';

import {
  OUTPUT_DIR,
  ROOT,
  DOWNLOADS_DIR,
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
import { prepareNarratorReactionClip } from '../prepare/narrator.js';
import { GENERAL_IMAGE_FILENAME } from '../../video-info/prepareVideoInfo.js';
import { isIsolatedDownloadsJobDir, rmDirQuiet } from '../postRenderCleanup.util.js';

/** Kích thước hiển thị narrator (vuông), nằm dưới lớp noise */
const NARRATOR_DISPLAY_PX = 240;

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

/**
 * Xử lý tạo video dành riêng cho chế độ `imageNoise`:
 * Ảnh nền toàn màn hình + video noise bỏ nền đen + audio + phụ đề.
 * Nếu `showNarrator = true` → thêm narrator 240×240 dưới lớp noise (góc trái-trên).
 *
 * Lưu ý: hàm xoá `bgImgPath` ở cuối — nếu test với ảnh thật cần copy ra file tạm trước khi gọi.
 *
 * @param {object} [options]
 * @param {boolean} [options.showNarrator=false] - Hiển thị narrator reaction overlay
 */
export async function makeVideoWithImageNoise(options = {}) {
  const {
    perVideoDir,
    originalTitle,
    audioSpeed: speedIn,
    logoPath: logoPathOpt,
    downloadsDir = DOWNLOADS_DIR,
    videoLanguage,
    showNarrator = false,
  } = options;

  const bgImgPath = path.join(downloadsDir, GENERAL_IMAGE_FILENAME);

  const speed = speedIn != null && Number.isFinite(Number(speedIn)) && Number(speedIn) > 0 ? Number(speedIn) : resolveAudioSpeed({});
  const audioPath = getAudioFile(downloadsDir);

  const originalAudioDuration = await getAudioDurationSeconds(audioPath);
  const audioDurationAfterTempo = originalAudioDuration / speed;
  console.log(
    `Thời lượng audio: ${originalAudioDuration.toFixed(1)}s, sau atempo (SPEED=${speed}): ${formatClockDuration(audioDurationAfterTempo)}`
  );

  let subtitlePath = getSubtitleFile(downloadsDir);
  const useJaSubtitleStyle = resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage);
  let scaledSrtPath = null;
  if (subtitlePath && speed !== 1) {
    scaledSrtPath = path.join(OUTPUT_DIR, 'temp_scaled_sub' + path.extname(subtitlePath));
    scaleSrtTimestamps(subtitlePath, scaledSrtPath, speed);
    subtitlePath = scaledSrtPath;
  }

  const baseName = originalTitle ? sanitizeFilename(originalTitle) : path.basename(audioPath, path.extname(audioPath));
  const filterScriptPath = path.join(OUTPUT_DIR, 'filter_complex.txt');
  const tempSubPath = subtitlePath ? path.join(OUTPUT_DIR, 'temp_sub.ass') : null;
  const outputPath = path.join(OUTPUT_DIR, `${baseName}-with-bg.mp4`);

  const noisePath = path.join(ROOT, 'assets', 'audioVisual', 'noise.mp4');
  const hasNoise = fs.existsSync(noisePath);

  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const fps = STOCK_VIDEO.FPS;
  const NOISE_ALPHA = 0.6;

  // Pre-bake noise (1 lần): bake fps + scale + colorkey + alpha → bỏ 5 filter per-frame ở pipeline chính.
  const prebakedNoise = hasNoise ? await getPrebakedNoiseMov(noisePath, w, h, fps, NOISE_ALPHA) : null;
  const noiseInputPath = prebakedNoise || noisePath;
  const noiseIsPrebaked = Boolean(prebakedNoise);

  // ─── Narrator reaction overlay: chỉ tải + chuẩn bị khi showNarrator = true ───
  let reactionOverlayPath = null;
  let reactionTempDir = null;
  let hasReaction = false;
  if (showNarrator) {
    const result = await prepareNarratorReactionClip(audioDurationAfterTempo);
    reactionOverlayPath = result.reactionOverlayPath;
    reactionTempDir = result.reactionTempDir;
    hasReaction = result.hasReaction;
  }

  const mergeArgs = ['-y'];
  let inputIdx = 0;

  // Input 0: Image (no loop — zoompan generates frames)
  mergeArgs.push('-i', bgImgPath);
  const bgIndex = inputIdx++;

  // Input 1: Noise loop (bản đã prebake nếu có)
  let noiseIndex = -1;
  if (hasNoise) {
    mergeArgs.push('-stream_loop', '-1', '-i', noiseInputPath);
    noiseIndex = inputIdx++;
  } else {
    console.warn(`[Image Noise] Không tìm thấy noise video: ${noisePath}`);
  }

  // Input 2: Audio
  mergeArgs.push('-i', audioPath);
  const audioIndex = inputIdx++;

  // Input 3: Logo
  const logoPathOriginal = logoPathOpt != null && String(logoPathOpt).trim() && fs.existsSync(logoPathOpt) ? logoPathOpt : null;
  const prebakedLogo = logoPathOriginal ? await getPrebakedLogoPng(logoPathOriginal, LOGO.SIZE) : null;
  const logoPathForMerge = prebakedLogo || logoPathOriginal;
  const hasLogo = Boolean(logoPathForMerge);
  const logoIsPrebaked = Boolean(prebakedLogo);
  let logoIndex = -1;
  if (hasLogo) {
    mergeArgs.push('-i', logoPathForMerge);
    logoIndex = inputIdx++;
  }

  // Input 4: Reaction overlay
  let reactionIndex = -1;
  if (hasReaction) {
    mergeArgs.push('-stream_loop', '-1', '-i', reactionOverlayPath);
    reactionIndex = inputIdx++;
  }

  const filterParts = [];

  // Audio filter
  filterParts.push(`[${audioIndex}:a]atempo=${speed}[aout]`);

  // Image background filter (w/h/fps đã khai báo ở trên cho prebake noise)
  const ZOOM_DURATION_SEC = 15;
  const ZOOM_MAX = 1.3;
  const zoomFrames = ZOOM_DURATION_SEC * fps;
  const totalFrames = Math.ceil(audioDurationAfterTempo * fps) + fps;
  const zpW = Math.ceil((w * ZOOM_MAX) / 2) * 2;
  const zpH = Math.ceil((h * ZOOM_MAX) / 2) * 2;

  // 15s đầu: zoom-out từ 1.3x → 1.0x | Sau 15s → hết video: Burns (pan drift liên tục)
  const PAN_CYCLE_X_SEC = 13;
  const PAN_CYCLE_Y_SEC = 9;
  const panCycleXFrames = PAN_CYCLE_X_SEC * fps;
  const panCycleYFrames = PAN_CYCLE_Y_SEC * fps;
  const panRange = 0.4;

  const zoomExpr = `if(lte(on,${zoomFrames}),${ZOOM_MAX}-(${ZOOM_MAX}-1)*on/${zoomFrames},1)`;
  const cx = `iw/2-(iw/zoom/2)`;
  const burnsPanX = `sin(2*PI*(on-${zoomFrames})/${panCycleXFrames})*(iw-iw/zoom)*${panRange}`;
  const burnsPanY = `sin(2*PI*(on-${zoomFrames})/${panCycleYFrames})*(ih-ih/zoom)*${panRange}`;
  const panX = `if(lte(on,${zoomFrames}),${cx},${cx}+${burnsPanX})`;
  const panY = `if(lte(on,${zoomFrames}),ih/2-(ih/zoom/2),ih/2-(ih/zoom/2)+${burnsPanY})`;

  filterParts.push(
    `[${bgIndex}:v]scale=${zpW}:${zpH}:force_original_aspect_ratio=increase:flags=fast_bilinear,` +
      `crop=${zpW}:${zpH},` +
      `zoompan=z='${zoomExpr}':` +
      `d=${totalFrames}:x='${panX}':y='${panY}':s=${w}x${h}:fps=${fps},` +
      `format=yuv420p,setsar=1[bg]`
  );

  let currentVLabel = 'bg';

  // Narrator trước noise → noise phủ lên trên; kích thước cố định NARRATOR_DISPLAY_PX
  if (hasReaction && reactionIndex >= 0) {
    const reactionX = 50;
    const reactionY = 50;
    const n = NARRATOR_DISPLAY_PX;
    const rRadius = n / 2;
    const circleGeq = `if(lte(hypot(X-W/2,Y-H/2),${rRadius}),255,0)`;
    filterParts.push(
      `[${reactionIndex}:v]setpts=3*PTS,fps=${fps},scale=${n}:${n}:flags=fast_bilinear,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${circleGeq}'[reaction]`
    );
    filterParts.push(`[${currentVLabel}][reaction]overlay=${reactionX}:${reactionY}:shortest=1[v_under_noise]`);
    currentVLabel = 'v_under_noise';
  }

  if (hasNoise && noiseIndex >= 0) {
    if (noiseIsPrebaked) {
      filterParts.push(`[${noiseIndex}:v]null[noise]`);
    } else {
      filterParts.push(
        `[${noiseIndex}:v]fps=${fps},scale=${w}:${h}:flags=fast_bilinear,format=yuva420p,colorkey=0x000000:0.1:0.1,colorchannelmixer=aa=${NOISE_ALPHA}[noise]`
      );
    }
    filterParts.push(`[${currentVLabel}][noise]overlay=0:0:shortest=1[v_noised]`);
    currentVLabel = 'v_noised';
  }

  // Subtitle filter (gộp 1 chain — bỏ split/crop/overlay)
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
  } else {
    filterParts.push(`[${currentVLabel}]null[vpadded]`);
    currentVLabel = 'vpadded';
  }

  // Logo filter
  if (hasLogo) {
    if (logoIsPrebaked) {
      filterParts.push(`[${logoIndex}:v]null[logo]`);
    } else {
      const r = Math.floor(LOGO.SIZE / 2);
      const geqExpr = `if(lte(hypot(X-W/2,Y-H/2),${r}),255,0)`;
      filterParts.push(
        `[${logoIndex}:v]scale=${LOGO.SIZE}:${LOGO.SIZE}:flags=fast_bilinear,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${geqExpr}'[logo]`
      );
    }
    filterParts.push(`[${currentVLabel}][logo]overlay=main_w-overlay_w-${LOGO.MARGIN_RIGHT}:${LOGO.MARGIN_TOP}[vout_final]`);
    currentVLabel = 'vout_final';
  } else {
    filterParts.push(`[${currentVLabel}]copy[vout_final]`);
  }

  const fullGraph = filterParts.join(';');
  fs.writeFileSync(filterScriptPath, fullGraph, 'utf-8');

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
    outputPath
  );

  console.log(`Đang merge nội dung Image Noise Pipeline...`);
  await ffmpegSpawnAsync(mergeArgs);

  if (fs.existsSync(filterScriptPath)) fs.unlinkSync(filterScriptPath);
  if (tempSubPath && fs.existsSync(tempSubPath)) fs.unlinkSync(tempSubPath);
  if (scaledSrtPath && fs.existsSync(scaledSrtPath)) fs.unlinkSync(scaledSrtPath);

  // Dọn temp reaction
  if (reactionTempDir) {
    rmDirQuiet(reactionTempDir);
    console.log(`[Narrator] Đã xóa thư mục tạm: ${reactionTempDir}`);
  }

  console.log(`\nĐã tạo: ${outputPath}`);

  if (perVideoDir) {
    fs.mkdirSync(perVideoDir, { recursive: true });

    const destVideoPath = path.join(perVideoDir, `${baseName}.mp4`);
    fs.copyFileSync(outputPath, destVideoPath);
    console.log(`>>> Đã xuất video vào folder ID: ${destVideoPath}`);

    if (fs.existsSync(downloadsDir)) {
      const downloadFiles = fs.readdirSync(downloadsDir);

      for (const thumbBase of ['thumbnail', 'flow-thumbnail']) {
        const thumbSrc = findImageInDirByBasename(downloadsDir, thumbBase);
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
  } else if (fs.existsSync(bgImgPath)) {
    fs.unlinkSync(bgImgPath);
    console.log(`[Image Noise] Đã xóa ảnh background tạm: ${bgImgPath}`);
  }
}
