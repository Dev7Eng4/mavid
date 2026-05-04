/**
 * Narrator Reaction Overlay
 *
 * Đọc danh sách video narrator từ các file excel trong assets/visual-resource/narrator,
 * chọn video phù hợp (duration >= audio + 10 phút, USED thấp nhất),
 * tải về, crop thành hình tròn, overlay lên video chính.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import youtubedl from 'youtube-dl-exec';

import { OUTPUT_DIR, ROOT } from './shared.js';

const execAsync = promisify(exec);

const NARRATOR_ASSETS_DIR = path.join(ROOT, 'assets', 'visual-resource', 'narrator');
/** Bỏ bao nhiêu giây đầu video reaction */
const REACTION_SKIP_SEC = 120;
/** Video narrator phải dài hơn audio ít nhất bao nhiêu giây */
const MIN_EXTRA_DURATION_SEC = 10 * 60;
/** Kích thước crop reaction overlay (px) */
export const REACTION_CROP_W = 300;
export const REACTION_CROP_H = 300;
/** Margin trái của reaction overlay */
export const REACTION_MARGIN_LEFT = 20;

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
 * - Duration >= targetDuration + 10 phút (+ REACTION_SKIP_SEC vì bỏ đầu)
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

  if (allVideos.length === 0) {
    console.warn('[Narrator] Không tìm thấy video narrator nào trong assets.');
    return null;
  }

  const minRequired = targetDurationSec + MIN_EXTRA_DURATION_SEC + REACTION_SKIP_SEC;
  const eligible = allVideos.filter(v => v.durationSec >= minRequired);

  if (eligible.length === 0) {
    console.warn(
      `[Narrator] Không có video nào đủ dài (cần >= ${Math.ceil(minRequired / 60)} phút). ` +
        `Tổng ${allVideos.length} video, dài nhất: ${Math.ceil(Math.max(...allVideos.map(v => v.durationSec)) / 60)} phút.`,
    );
    return null;
  }

  const minUsed = Math.min(...eligible.map(v => v.used));
  const candidates = eligible.filter(v => v.used === minUsed);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  console.log(
    `[Narrator] Chọn video: ${chosen.link} (duration: ${Math.ceil(chosen.durationSec / 60)} phút, USED: ${chosen.used} → ${chosen.used + 1})`,
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
  return path.join(outputDir, files[0]);
}

/**
 * Chuẩn bị clip reaction overlay:
 * 1. Cắt bỏ REACTION_SKIP_SEC giây đầu
 * 2. Cắt chỉ lấy đủ thời gian video cần tạo
 * 3. Crop 300×300 từ phần giữa dưới video
 *
 * @param {string} rawVideoPath - Đường dẫn video reaction gốc
 * @param {number} targetDuration - Thời lượng video cần tạo (giây)
 * @param {string} outputDir - Thư mục lưu file tạm
 * @returns {Promise<string>} Đường dẫn file clip đã xử lý
 */
async function prepareReactionOverlay(rawVideoPath, targetDuration, outputDir) {
  const overlayPath = path.join(outputDir, 'reaction_overlay.mp4');

  console.log(
    `[Reaction] Chuẩn bị overlay: bỏ ${REACTION_SKIP_SEC}s đầu, lấy ${targetDuration.toFixed(1)}s, crop ${REACTION_CROP_W}x${REACTION_CROP_H} giữa dưới...`,
  );

  const cmd = [
    'ffmpeg',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(REACTION_SKIP_SEC),
    '-i',
    rawVideoPath,
    '-t',
    String(targetDuration),
    '-vf',
    `crop=${REACTION_CROP_W}:${REACTION_CROP_H}:(iw-${REACTION_CROP_W})/2:ih-${REACTION_CROP_H}`,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    overlayPath,
  ].map(String);

  await execAsync(cmd.join(' '), { maxBuffer: 64 * 1024 * 1024 });
  console.log(`[Reaction] Đã tạo overlay clip: ${overlayPath}`);
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
