/**
 * Narrator Reaction Overlay
 *
 * Đọc danh sách video narrator từ các file excel trong assets/visual-resource/narrator,
 * chọn video phù hợp (duration >= audio + 10 phút, USED thấp nhất),
 * tải về, cắt xen kẽ đoạn 5 phút + gap trên timeline, ghép đủ duration, crop vùng hiển thị.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import youtubedl from 'youtube-dl-exec';

import { OUTPUT_DIR, ROOT } from '../shared.js';

const execAsync = promisify(exec);

const NARRATOR_ASSETS_DIR = path.join(ROOT, 'assets', 'visual-resource', 'narrator');
/** File trong `public/` để web/UI đọc URL narrator đã chọn */
const NARRATOR_PUBLIC_TXT = path.join(ROOT, 'public', 'narrator.txt');
/** Bỏ bao nhiêu giây đầu video reaction */
const REACTION_SKIP_SEC = 120;
/** Video narrator phải dài hơn audio ít nhất bao nhiêu giây */
const MIN_EXTRA_DURATION_SEC = 10 * 60;
/** Kích thước crop reaction overlay (px) */
export const REACTION_CROP_W = 240;
export const REACTION_CROP_H = 240;
/** Margin trái của reaction overlay */
export const REACTION_MARGIN_LEFT = 20;
/** Mỗi lần lấy tối đa bao nhiêu giây liên tục từ source (mặc định 5 phút) */
const REACTION_SEGMENT_SEC = 5 * 60;
/** Khoảng thời gian trên timeline source bị bỏ qua giữa hai đoạn 5 phút (giây) */
const REACTION_SEGMENT_GAP_SEC = 120;

/**
 * Điểm kết thúc (giây) trên timeline video gốc cần có để cắt đủ các đoạn + gap.
 * @param {number} targetDurationSec
 * @returns {number}
 */
function computeReactionSourceSpanEndSec(targetDurationSec) {
  let srcPos = REACTION_SKIP_SEC;
  let remaining = targetDurationSec;
  let endSec = srcPos;
  while (remaining > 0) {
    const dur = Math.min(REACTION_SEGMENT_SEC, remaining);
    endSec = srcPos + dur;
    remaining -= dur;
    if (remaining <= 0) break;
    srcPos += REACTION_SEGMENT_SEC + REACTION_SEGMENT_GAP_SEC;
  }
  return endSec;
}

/**
 * Danh sách các đoạn cần cắt từ raw reaction (start + độ dài trên source).
 * @param {number} targetDurationSec
 * @returns {Array<{ srcStartSec: number, durSec: number }>}
 */
function buildReactionSegmentCuts(targetDurationSec) {
  let srcPos = REACTION_SKIP_SEC;
  let remaining = targetDurationSec;
  /** @type {Array<{ srcStartSec: number, durSec: number }>} */
  const cuts = [];
  while (remaining > 0) {
    const durSec = Math.min(REACTION_SEGMENT_SEC, remaining);
    cuts.push({ srcStartSec: srcPos, durSec });
    remaining -= durSec;
    if (remaining <= 0) break;
    srcPos += REACTION_SEGMENT_SEC + REACTION_SEGMENT_GAP_SEC;
  }
  return cuts;
}

function ffmpegQuoteArg(p) {
  const s = String(p);
  if (/[\s"]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

function concatFileLineForFfmpeg(absPath) {
  const normalized = absPath.replace(/\\/g, '/').replace(/'/g, "'\\''");
  return `file '${normalized}'`;
}

/**
 * Parse chuỗi duration "HH:MM:SS" hoặc "MM:SS" thành giây.
 * @param {string} duration
 * @returns {number}
 */
function parseDurationToSeconds(duration) {
  if (!duration) return 0;
  const parts = String(duration).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/**
 * Đọc tất cả file excel narrator trong assets/visual-resource/narrator,
 * gộp thành 1 danh sách video kèm metadata để chọn.
 *
 * @returns {Promise<Array<{ link: string, durationSec: number, used: number, excelPath: string, rowNumber: number }>>}
 */
async function loadAllNarratorVideos() {
  if (!fs.existsSync(NARRATOR_ASSETS_DIR)) {
    console.warn(`[Narrator] Không tìm thấy thư mục narrator: ${NARRATOR_ASSETS_DIR}`);
    return [];
  }

  const channelDirs = fs.readdirSync(NARRATOR_ASSETS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  const allVideos = [];

  for (const dir of channelDirs) {
    const channelId = dir.name;
    const excelPath = path.join(NARRATOR_ASSETS_DIR, channelId, `${channelId}.xlsx`);
    if (!fs.existsSync(excelPath)) continue;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) continue;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const link = String(row.getCell(1).value || '').trim();
      const duration = String(row.getCell(2).value || '').trim();
      const usedRaw = row.getCell(3).value;
      const used = Number(usedRaw) || 0;

      if (!link) return;

      allVideos.push({
        link,
        durationSec: parseDurationToSeconds(duration),
        used,
        excelPath,
        rowNumber,
      });
    });
  }

  return allVideos;
}

/**
 * Chọn video narrator phù hợp nhất:
 * - Duration đủ để lấy các đoạn 5 phút xen kẽ gap trên timeline (+ buffer MIN_EXTRA)
 * - Trong các video đủ dài, chọn video có USED thấp nhất
 * - Nếu nhiều video cùng USED thấp nhất → chọn ngẫu nhiên
 *
 * Sau khi chọn xong → update cột USED +1 trong excel.
 *
 * @param {number} targetDurationSec - Thời lượng video cần tạo (giây)
 * @returns {Promise<string|null>} URL video được chọn, hoặc null nếu không tìm thấy
 */
async function selectAndMarkNarratorVideo(targetDurationSec) {
  const allVideos = await loadAllNarratorVideos();
  console.log('🚀 ~ selectAndMarkNarratorVideo ~ allVideos:', allVideos);

  if (allVideos.length === 0) {
    console.warn('[Narrator] Không tìm thấy video narrator nào trong assets.');
    return null;
  }

  const sourceSpanEnd = computeReactionSourceSpanEndSec(targetDurationSec);
  const minRequired = sourceSpanEnd + MIN_EXTRA_DURATION_SEC;
  const eligible = allVideos.filter(v => v.durationSec >= minRequired);

  if (eligible.length === 0) {
    console.warn(
      `[Narrator] Không có video nào đủ dài (cần >= ~${Math.ceil(minRequired / 60)} phút trên timeline; span đến ~${Math.ceil(sourceSpanEnd / 60)} phút). ` +
        `Tổng ${allVideos.length} video, dài nhất: ${Math.ceil(Math.max(...allVideos.map(v => v.durationSec)) / 60)} phút.`,
    );
    return null;
  }

  const minUsed = Math.min(...eligible.map(v => v.used));
  const candidates = eligible.filter(v => v.used === minUsed);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  console.log(
    `[Narrator] Chọn video: ${chosen.link} (duration: ${Math.ceil(chosen.durationSec / 60)} phút, USED: ${chosen.used} → ${
      chosen.used + 1
    })`,
  );

  // Update USED +1 trong excel
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(chosen.excelPath);
  const sheet = workbook.getWorksheet(1);
  if (sheet) {
    const row = sheet.getRow(chosen.rowNumber);
    row.getCell(3).value = chosen.used + 1;
    row.commit();
    await workbook.xlsx.writeFile(chosen.excelPath);
    console.log(`[Narrator] Đã update USED = ${chosen.used + 1} tại row ${chosen.rowNumber} trong ${path.basename(chosen.excelPath)}`);
  }

  return chosen.link;
}

/**
 * Tải video YouTube (chỉ video, không audio) ở chất lượng HD.
 * @param {string} url
 * @param {string} outputDir
 * @returns {Promise<string>} Đường dẫn file video đã tải
 */
async function downloadYoutubeVideoOnly(url, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Tránh dùng nhầm file raw cũ: yt-dlp có thể tạo đuôi khác nhau (.mp4 / .webm),
  // `readdir` không đảm bảo thứ tự → không được pick `files[0]` ngẫu nhiên.
  for (const name of fs.readdirSync(outputDir)) {
    if (name.startsWith('reaction_raw.')) {
      try {
        fs.unlinkSync(path.join(outputDir, name));
      } catch {
        /* ignore */
      }
    }
  }

  const outputTemplate = path.join(outputDir, 'reaction_raw.%(ext)s');

  console.log('[Reaction] Đang tải video reaction (video only, HD)...');

  const subprocess = youtubedl.exec(url, {
    output: outputTemplate,
    format: 'bestvideo[height<=720][vcodec^=avc1]/bestvideo[height<=720]/bestvideo[vcodec^=avc1]/bestvideo',
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  subprocess.stderr?.on('data', chunk => {
    const text = chunk.toString();
    const match = text.match(/(\d+\.?\d*)%/);
    if (match) process.stdout.write(`\r[Reaction] Đang tải: ${parseFloat(match[1]).toFixed(1)}%`);
  });

  await subprocess;
  process.stdout.write('\n');
  console.log('[Reaction] Tải video reaction xong!');

  const files = fs.readdirSync(outputDir).filter(f => f.startsWith('reaction_raw.'));
  if (files.length === 0) throw new Error('[Reaction] Không tìm thấy file reaction sau khi tải.');
  const newest = files.map(f => ({ f, mtimeMs: fs.statSync(path.join(outputDir, f)).mtimeMs })).sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return path.join(outputDir, newest.f);
}

/**
 * Chuẩn bị clip reaction overlay:
 * 1. Lần lượt lấy các đoạn tối đa REACTION_SEGMENT_SEC (5 phút) từ source,
 *    sau mỗi đoạn đầy đủ 5 phút thì nhảy qua REACTION_SEGMENT_GAP_SEC trên timeline gốc.
 * 2. Ghép các đoạn cho đủ targetDuration (đoạn cuối có thể ngắn hơn 5 phút).
 * 3. Crop REACTION_CROP_W×REACTION_CROP_H giữa–dưới cho từng đoạn.
 *
 * @param {string} rawVideoPath - Đường dẫn video reaction gốc
 * @param {number} targetDuration - Thời lượng video cần tạo (giây)
 * @param {string} outputDir - Thư mục lưu file tạm
 * @returns {Promise<string>} Đường dẫn file clip đã xử lý
 */
async function prepareReactionOverlay(rawVideoPath, targetDuration, outputDir) {
  const overlayPath = path.join(outputDir, 'reaction_overlay.mp4');
  const cropVf = `crop=${REACTION_CROP_W}:${REACTION_CROP_H}:(iw-${REACTION_CROP_W})/2:ih-${REACTION_CROP_H}`;
  const cuts = buildReactionSegmentCuts(targetDuration);

  for (const name of fs.readdirSync(outputDir)) {
    if (name.startsWith('reaction_seg_') && name.endsWith('.mp4')) {
      try {
        fs.unlinkSync(path.join(outputDir, name));
      } catch {
        /* ignore */
      }
    }
  }
  const concatListPath = path.join(outputDir, 'reaction_concat_list.txt');
  try {
    fs.unlinkSync(concatListPath);
  } catch {
    /* ignore */
  }

  console.log(
    `[Reaction] Chuẩn bị overlay: ${cuts.length} đoạn (tối đa ${REACTION_SEGMENT_SEC}s/đoạn, gap ${REACTION_SEGMENT_GAP_SEC}s), ` +
      `tổng ${targetDuration.toFixed(1)}s, crop ${REACTION_CROP_W}x${REACTION_CROP_H} giữa dưới...`,
  );

  /** @param {number} i */
  async function extractOneSegment(i, srcStartSec, durSec) {
    const segPath = path.join(outputDir, `reaction_seg_${i}.mp4`);
    const cmd = [
      'ffmpeg',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      String(srcStartSec),
      '-i',
      ffmpegQuoteArg(rawVideoPath),
      '-t',
      String(durSec),
      '-vf',
      cropVf,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      ffmpegQuoteArg(segPath),
    ].join(' ');
    await execAsync(cmd, { maxBuffer: 64 * 1024 * 1024 });
    return segPath;
  }

  if (cuts.length === 1) {
    await extractOneSegment(0, cuts[0].srcStartSec, cuts[0].durSec);
    const seg0 = path.join(outputDir, 'reaction_seg_0.mp4');
    try {
      if (fs.existsSync(overlayPath)) fs.unlinkSync(overlayPath);
    } catch {
      /* ignore */
    }
    fs.renameSync(seg0, overlayPath);
    console.log(`[Reaction] Đã tạo overlay clip (1 đoạn): ${overlayPath}`);
    return overlayPath;
  }

  const segmentPaths = [];
  for (let i = 0; i < cuts.length; i++) {
    const { srcStartSec, durSec } = cuts[i];
    console.log(`[Reaction] Đoạn ${i + 1}/${cuts.length}: source @${srcStartSec}s, dài ${durSec}s`);
    segmentPaths.push(await extractOneSegment(i, srcStartSec, durSec));
  }

  const listBody = segmentPaths.map(p => concatFileLineForFfmpeg(path.resolve(p))).join('\n');
  fs.writeFileSync(concatListPath, `${listBody}\n`, 'utf8');

  const concatCmd = [
    'ffmpeg',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    ffmpegQuoteArg(concatListPath),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    ffmpegQuoteArg(overlayPath),
  ].join(' ');

  await execAsync(concatCmd, { maxBuffer: 64 * 1024 * 1024 });

  for (const p of segmentPaths) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
  try {
    fs.unlinkSync(concatListPath);
  } catch {
    /* ignore */
  }

  console.log(`[Reaction] Đã ghép overlay clip: ${overlayPath}`);
  return overlayPath;
}

/**
 * Tải và chuẩn bị clip reaction overlay cho narrator.
 * Chọn video phù hợp từ excel → tải → crop → trả path overlay.
 *
 * @param {number} targetDuration - Thời lượng video cần tạo (giây)
 * @returns {Promise<{ reactionOverlayPath: string|null, reactionTempDir: string, hasReaction: boolean }>}
 */
export async function prepareNarratorReactionClip(targetDuration) {
  const reactionTempDir = path.join(OUTPUT_DIR, '_reaction_tmp');
  let reactionOverlayPath = null;

  try {
    const videoUrl = await selectAndMarkNarratorVideo(targetDuration);
    if (!videoUrl) {
      return { reactionOverlayPath: null, reactionTempDir, hasReaction: false };
    }

    fs.mkdirSync(path.dirname(NARRATOR_PUBLIC_TXT), { recursive: true });
    fs.writeFileSync(NARRATOR_PUBLIC_TXT, `${videoUrl}\n`, 'utf8');

    fs.mkdirSync(reactionTempDir, { recursive: true });
    const rawReactionPath = await downloadYoutubeVideoOnly(videoUrl, reactionTempDir);
    console.log('[Narrator] rawReactionPath:', rawReactionPath);
    reactionOverlayPath = await prepareReactionOverlay(rawReactionPath, targetDuration, reactionTempDir);
    console.log('[Narrator] reactionOverlayPath:', reactionOverlayPath);
  } catch (err) {
    console.warn(`[Narrator] Không thể chuẩn bị reaction overlay — bỏ qua: ${err.message}`);
    reactionOverlayPath = null;
  }

  const hasReaction = Boolean(reactionOverlayPath && fs.existsSync(reactionOverlayPath));
  console.log('[Narrator] hasReaction:', hasReaction);

  return { reactionOverlayPath, reactionTempDir, hasReaction };
}
