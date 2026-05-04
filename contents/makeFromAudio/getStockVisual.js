/**
 * Stock Visual Background
 *
 * Đọc danh sách stock video từ excel trong assets/visual-resource/stock,
 * chọn video phù hợp (phần usable × slowdown >= target, USED thấp nhất),
 * tải về, zoom 120% + crop center + slowdown ×2 → trả path clip đã xử lý.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import youtubedl from 'youtube-dl-exec';

import { OUTPUT_DIR, ROOT } from './shared.js';
import { STOCK_VIDEO } from '../constants/index.js';
import { GPU_INFO } from '../utils/hardware.util.js';

const execAsync = promisify(exec);

const STOCK_ASSETS_DIR = path.join(ROOT, 'assets', 'visual-resource', 'stock');
/** Bỏ bao nhiêu giây đầu video stock */
const SKIP_START_SEC = 120;
/** Bỏ bao nhiêu giây cuối video stock */
const SKIP_END_SEC = 120;
/** Hệ số slowdown (video gốc sẽ chậm đi bấy nhiêu lần) */
const SLOWMO_FACTOR = STOCK_VIDEO.SLOWMO_FACTOR || 2;
/** Hệ số zoom (1.2 = 120%) */
const ZOOM_FACTOR = 1.2;

const CANVAS_W = STOCK_VIDEO.CANVAS_W;
const CANVAS_H = STOCK_VIDEO.CANVAS_H;
const FPS = STOCK_VIDEO.FPS;

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
 * Tính thời gian hiệu dụng (sau slowdown) từ duration gốc.
 * usable = duration - skipStart - skipEnd
 * effective = usable × slowmoFactor
 *
 * @param {number} durationSec
 * @returns {number}
 */
function getEffectiveDuration(durationSec) {
  const usable = durationSec - SKIP_START_SEC - SKIP_END_SEC;
  return Math.max(0, usable) * SLOWMO_FACTOR;
}

/**
 * Đọc tất cả file excel stock trong assets/visual-resource/stock,
 * gộp thành 1 danh sách video kèm metadata.
 *
 * @returns {Promise<Array<{ link: string, durationSec: number, used: number, excelPath: string, rowNumber: number }>>}
 */
async function loadAllStockVideos() {
  if (!fs.existsSync(STOCK_ASSETS_DIR)) {
    console.warn(`[StockVisual] Không tìm thấy thư mục stock: ${STOCK_ASSETS_DIR}`);
    return [];
  }

  const channelDirs = fs.readdirSync(STOCK_ASSETS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  const allVideos = [];

  for (const dir of channelDirs) {
    const channelId = dir.name;
    const excelPath = path.join(STOCK_ASSETS_DIR, channelId, `${channelId}.xlsx`);
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
 * Chọn video stock phù hợp nhất:
 * - (duration - 2min đầu - 2min cuối) × slowdown >= targetDuration
 * - USED thấp nhất, nếu bằng nhau → random
 *
 * Sau khi chọn → update USED +1 trong excel.
 *
 * @param {number} targetDurationSec - Thời lượng video cần tạo (giây)
 * @returns {Promise<{ link: string, durationSec: number } | null>}
 */
async function selectAndMarkStockVideo(targetDurationSec) {
  const allVideos = await loadAllStockVideos();

  if (allVideos.length === 0) {
    console.warn('[StockVisual] Không tìm thấy video stock nào trong assets.');
    return null;
  }

  const eligible = allVideos.filter(v => getEffectiveDuration(v.durationSec) >= targetDurationSec);

  if (eligible.length === 0) {
    const longestEffective = Math.max(...allVideos.map(v => getEffectiveDuration(v.durationSec)));
    console.warn(
      `[StockVisual] Không có video nào đủ dài (cần effective >= ${Math.ceil(targetDurationSec / 60)} phút). ` +
        `Tổng ${allVideos.length} video, effective dài nhất: ${Math.ceil(longestEffective / 60)} phút.`,
    );
    return null;
  }

  const minUsed = Math.min(...eligible.map(v => v.used));
  const candidates = eligible.filter(v => v.used === minUsed);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  console.log(
    `[StockVisual] Chọn video: ${chosen.link} ` +
      `(gốc: ${Math.ceil(chosen.durationSec / 60)} phút, ` +
      `effective: ${Math.ceil(getEffectiveDuration(chosen.durationSec) / 60)} phút, ` +
      `USED: ${chosen.used} → ${chosen.used + 1})`,
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(chosen.excelPath);
  const sheet = workbook.getWorksheet(1);
  if (sheet) {
    const row = sheet.getRow(chosen.rowNumber);
    row.getCell(3).value = chosen.used + 1;
    row.commit();
    await workbook.xlsx.writeFile(chosen.excelPath);
    console.log(`[StockVisual] Đã update USED = ${chosen.used + 1} tại row ${chosen.rowNumber} trong ${path.basename(chosen.excelPath)}`);
  }

  return { link: chosen.link, durationSec: chosen.durationSec };
}

/**
 * Tải video YouTube (chỉ video, không audio) ở chất lượng HD.
 * @param {string} url
 * @param {string} outputDir
 * @returns {Promise<string>} Đường dẫn file video đã tải
 */
async function downloadYoutubeVideoOnly(url, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputTemplate = path.join(outputDir, 'stock_raw.%(ext)s');

  console.log('[StockVisual] Đang tải video stock (video only, HD)...');

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
    if (match) process.stdout.write(`\r[StockVisual] Đang tải: ${parseFloat(match[1]).toFixed(1)}%`);
  });

  await subprocess;
  process.stdout.write('\n');
  console.log('[StockVisual] Tải video stock xong!');

  const files = fs.readdirSync(outputDir).filter(f => f.startsWith('stock_raw.'));
  if (files.length === 0) throw new Error('[StockVisual] Không tìm thấy file stock sau khi tải.');
  return path.join(outputDir, files[0]);
}

/**
 * Xử lý video stock:
 * 1. Bỏ SKIP_START_SEC giây đầu
 * 2. Lấy đủ (targetDuration / SLOWMO_FACTOR) giây gốc
 * 3. Zoom 120% (scale lên rồi crop center về canvas size)
 * 4. Slowdown ×2 (setpts=2*PTS)
 *
 * @param {string} rawVideoPath
 * @param {number} targetDuration - Thời lượng output mong muốn (giây, sau slowdown)
 * @param {string} outputDir
 * @returns {Promise<string>} Đường dẫn file clip đã xử lý
 */
async function prepareStockClip(rawVideoPath, targetDuration, outputDir) {
  const clipPath = path.join(outputDir, 'stock_processed.mp4');
  const sourceDuration = targetDuration / SLOWMO_FACTOR;

  const scaledW = Math.ceil((CANVAS_W * ZOOM_FACTOR) / 2) * 2;
  const scaledH = Math.ceil((CANVAS_H * ZOOM_FACTOR) / 2) * 2;

  const vf = [
    `fps=${FPS}`,
    `setpts=${SLOWMO_FACTOR}*PTS`,
    `scale=${scaledW}:${scaledH}:force_original_aspect_ratio=increase:flags=fast_bilinear`,
    `crop=${CANVAS_W}:${CANVAS_H}`,
    `format=yuv420p`,
  ].join(',');

  console.log(
    `[StockVisual] Xử lý clip: bỏ ${SKIP_START_SEC}s đầu, lấy ${sourceDuration.toFixed(1)}s gốc → ` +
      `slowdown ×${SLOWMO_FACTOR} = ${targetDuration.toFixed(1)}s, zoom ${ZOOM_FACTOR * 100}% → crop ${CANVAS_W}×${CANVAS_H}`,
  );

  const args = [
    'ffmpeg',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(SKIP_START_SEC),
    '-i',
    rawVideoPath,
    '-t',
    String(sourceDuration),
    '-vf',
    vf,
    '-an',
    ...GPU_INFO.videoEncodeArgs,
    clipPath,
  ];

  await execAsync(args.join(' '), { maxBuffer: 64 * 1024 * 1024 });
  console.log(`[StockVisual] Đã tạo clip: ${clipPath}`);
  return clipPath;
}

/**
 * Entry point: chọn video stock từ excel → tải → zoom + crop + slowdown → trả path.
 *
 * @param {number} targetDuration - Thời lượng video cần tạo (giây)
 * @returns {Promise<{ stockClipPath: string|null, stockTempDir: string, hasStock: boolean }>}
 */
export async function prepareStockVisualClip(targetDuration) {
  const stockTempDir = path.join(OUTPUT_DIR, '_stock_tmp');
  let stockClipPath = null;

  try {
    const chosen = await selectAndMarkStockVideo(targetDuration);
    if (!chosen) {
      return { stockClipPath: null, stockTempDir, hasStock: false };
    }

    fs.mkdirSync(stockTempDir, { recursive: true });
    const rawPath = await downloadYoutubeVideoOnly(chosen.link, stockTempDir);
    console.log('[StockVisual] rawPath:', rawPath);
    stockClipPath = await prepareStockClip(rawPath, targetDuration, stockTempDir);
    console.log('[StockVisual] stockClipPath:', stockClipPath);
  } catch (err) {
    console.warn(`[StockVisual] Không thể chuẩn bị stock clip — bỏ qua: ${err.message}`);
    stockClipPath = null;
  }

  const hasStock = Boolean(stockClipPath && fs.existsSync(stockClipPath));
  console.log('[StockVisual] hasStock:', hasStock);

  return { stockClipPath, stockTempDir, hasStock };
}
