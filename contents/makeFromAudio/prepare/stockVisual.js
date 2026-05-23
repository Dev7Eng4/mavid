/**
 * Stock Visual Background
 *
 * Đọc danh sách stock video từ excel trong assets/visual-resource/stock,
 * chọn video phù hợp (phần usable × slowdown >= target, USED thấp nhất),
 * tải về, zoom 140% (+40%) → crop center + slowdown ×2 → trả path clip đã xử lý.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ExcelJS from 'exceljs';
import youtubedl from 'youtube-dl-exec';

import { DOWNLOADS_DIR, OUTPUT_DIR, ROOT } from '../shared.js';
import { STOCK_VIDEO } from '../../constants/index.js';
import { GPU_INFO } from '../../utils/hardware.util.js';
import { getListAllVisuals } from '../../api/visuals/getListAllVisuals.js';
import updateVisual from '../../api/visuals/updateVisual.js';

const execAsync = promisify(exec);

const STOCK_ASSETS_DIR = path.join(ROOT, 'assets', 'visual-resource', 'stock');
/** Bỏ bao nhiêu giây đầu video stock */
const SKIP_START_SEC = 120;
/** Bỏ bao nhiêu giây cuối video stock */
const SKIP_END_SEC = 120;
/** Hệ số slowdown stock clip (video gốc chậm đi bấy nhiêu lần; clip visual đã bake sẵn, segment dùng slowmoFactor=1) */
const SLOWMO_FACTOR = 2;
/** Hệ số zoom so với canvas trước khi crop (1.4 = phóng 140%, tương đương zoom ~+40%) */
const ZOOM_FACTOR = 1.4;

const CANVAS_W = STOCK_VIDEO.CANVAS_W;
const CANVAS_H = STOCK_VIDEO.CANVAS_H;
const FPS = STOCK_VIDEO.FPS;

/**
 * Kiểm tra tên background có phải channelId trong assets/visual-resource/stock/ hay không.
 * @param {string} name
 * @returns {boolean}
 */
export function isVisualResourceStock(name) {
  if (!name) return false;
  const configPath = path.join(ROOT, 'assets', 'visual-resource', 'stock', name, 'mavid-config.json');
  return fs.existsSync(configPath);
}

/**
 * Parse duration trong JSON/visuals:
 * - Số giây thuần (chuỗi hoặc số): `"3249"`, `2094`
 * - Hoặc `"HH:MM:SS"` / `"MM:SS"`
 *
 * @param {string|number} duration
 * @returns {number}
 */
function parseDurationToSeconds(duration) {
  if (duration == null || duration === '') return 0;
  const raw = String(duration).trim();
  if (!raw.includes(':')) {
    const sec = Number(raw);
    return Number.isFinite(sec) ? Math.max(0, sec) : 0;
  }
  const parts = raw.split(':').map(Number);
  if (parts.some(p => !Number.isFinite(p))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/**
 * Thời lượng đầu ra tối đa ước lượng (sau slowdown), từ tổng độ dài file (giây).
 * usable = duration − skip đầu − skip cuối; effective = usable × SLOWMO_FACTOR.
 *
 * @param {number} durationSec — tổng độ dài nguồn (giây), thường từ JSON dạng `"3249"`
 * @returns {number}
 */
function getEffectiveDuration(durationSec) {
  const n = Number(durationSec);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const usable = Math.max(0, n);
  return usable * SLOWMO_FACTOR;
}

/** @param {{ used?: string }} v */
function visualUsedCount(v) {
  const n = Number.parseInt(String(v.used ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Chọn video stock phù hợp nhất:
 * - (duration - 2min đầu - 2min cuối) × slowdown >= targetDuration
 * - USED thấp nhất, nếu bằng nhau → random
 *
 * Sau khi chọn → update USED +1 trong excel.
 *
 * @param {number} targetDurationSec - Thời lượng video cần tạo (giây)
 * @returns {Promise<string|null>}
 */
async function selectAndMarkStockVideo(targetDurationSec) {
  const allVideos = await getListAllVisuals();

  const withLink = allVideos.filter(v => v && String(v.link ?? '').trim());

  if (withLink.length === 0) {
    console.warn('[StockVisual] Không tìm thấy video stock nào.');
    return null;
  }

  const eligible = withLink.filter(v => {
    const durationSec = parseDurationToSeconds(v.duration);
    return getEffectiveDuration(durationSec) >= targetDurationSec;
  });

  if (eligible.length === 0) {
    console.warn(`[StockVisual] Không có video nào đủ dài (cần effective >= ${Math.ceil(targetDurationSec / 60)} phút). `);
    return null;
  }

  const minUsed = Math.min(...eligible.map(visualUsedCount));
  const candidates = eligible.filter(v => visualUsedCount(v) === minUsed);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  if (!chosen) {
    console.warn('[StockVisual] Không chọn được video (danh sách ứng viên rỗng).');
    return null;
  }

  console.log(`[StockVisual] Chọn video: ${chosen.link}`);

  await updateVisual(chosen.channelId, chosen.link);

  return chosen.link;
}

/** @param {string} name */
function isProbablyVideoFile(name) {
  return /\.(mp4|webm|mkv|mov|m4v|avi)$/i.test(name) && !/\.part$/i.test(name);
}

/**
 * File video mới xuất hiện trong thư mục sau khi yt-dlp chạy xong.
 * @param {string} outputDir
 * @param {Set<string>} namesBefore
 * @returns {string} đường dẫn tuyệt đối tới file
 */
function resolveDownloadedVideoPath(outputDir, namesBefore) {
  const namesAfter = fs.readdirSync(outputDir);
  const added = namesAfter.filter(f => !namesBefore.has(f) && isProbablyVideoFile(f));
  if (added.length === 1) {
    return path.join(outputDir, added[0]);
  }
  if (added.length > 1) {
    const scored = added.map(f => ({
      f,
      t: fs.statSync(path.join(outputDir, f)).mtimeMs,
    }));
    scored.sort((a, b) => b.t - a.t);
    return path.join(outputDir, scored[0].f);
  }
  /* yt-dlp ghi đè cùng tên file → không có tên mới: lấy file video mới sửa gần nhất (trừ output ffmpeg) */
  const skip = new Set(['stock_processed.mp4']);
  const candidates = namesAfter.filter(f => isProbablyVideoFile(f) && !skip.has(f));
  if (candidates.length === 0) {
    throw new Error(`[StockVisual] Không thấy file video trong ${outputDir} sau khi tải.`);
  }
  const scored = candidates.map(f => ({
    f,
    t: fs.statSync(path.join(outputDir, f)).mtimeMs,
  }));
  scored.sort((a, b) => b.t - a.t);
  return path.join(outputDir, scored[0].f);
}

async function downloadOverlayVisualVideo(url, options = {}) {
  const { outputDir = DOWNLOADS_DIR, format = 'best', maxHeight = 480 } = options;

  const preferredFormats = [
    // 480p không âm thanh
    'bestvideo[height=480][ext=mp4]',
    'bestvideo[height=480]',
    // Backup: 360p
    'bestvideo[height=360][ext=mp4]',
    'bestvideo[height=360]',
    // Backup: 720p (nếu không có 480 hoặc thấp hơn)
    'bestvideo[height=720][ext=mp4]',
    'bestvideo[height=720]',
    // Backup cuối: video tốt nhất không âm thanh
    'bestvideo[ext=mp4]',
    'bestvideo',
  ];

  for (const format of preferredFormats) {
    try {
      console.log(`Thử tải với format: ${format}`);

      const outPath = path.join(outputDir, 'overlay_visual.mp4');
      await youtubedl(url, {
        format,
        output: outPath,
        noAudio: true,
      });

      console.log(`✅ Tải thành công với format: ${format}`);
      return outPath;
    } catch (err) {
      console.warn(`⚠️ Format "${format}" không khả dụng, thử format tiếp theo...`);
    }
  }

  throw new Error('❌ Không thể tải video với bất kỳ format nào.');
}

/**
 * Xử lý video stock:
 * 1. Bỏ SKIP_START_SEC giây đầu
 * 2. Lấy đủ (targetDuration / SLOWMO_FACTOR) giây gốc
 * 3. Zoom 140% (+40%): scale lên rồi crop center về canvas size
 * 4. Slowdown ×2 (setpts=2*PTS)
 *
 * @param {string} rawVideoPath
 * @param {number} targetDuration - Thời lượng output mong muốn (giây, sau slowdown)
 * @param {string} outputDir
 * @returns {Promise<string>} Đường dẫn file clip đã xử lý
 */
async function prepareStockClip(rawVideoPath, targetDuration, outputDir) {
  console.log('🚀 ~ prepareStockClip ~ outputDir:', outputDir);
  console.log('🚀 ~ prepareStockClip ~ targetDuration:', targetDuration);
  console.log('🚀 ~ prepareStockClip ~ rawVideoPath:', rawVideoPath);
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

  // `-t` phải đứng trước `-i` để giới hạn độ dài **nguồn** (giây gốc sau -ss).
  // Nếu `-t` đặt sau `-i` thì ffmpeg coi là giới hạn **đầu ra** → với setpts slowmo,
  // file ra chỉ ~sourceDuration giây thay vì targetDuration (vd: 1800s → ~15 phút).
  const args = [
    'ffmpeg',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    String(SKIP_START_SEC),
    '-t',
    String(sourceDuration),
    '-i',
    rawVideoPath,
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
    const link = await selectAndMarkStockVideo(targetDuration);

    if (!link) {
      return { stockClipPath: null, stockTempDir, hasStock: false };
    }

    fs.mkdirSync(stockTempDir, { recursive: true });
    const rawPath = await downloadOverlayVisualVideo(link, { outputDir: stockTempDir });
    stockClipPath = await prepareStockClip(rawPath, targetDuration, stockTempDir);
  } catch (err) {
    console.warn(`[StockVisual] Không thể chuẩn bị stock clip — bỏ qua: ${err.message}`);
    stockClipPath = null;
  }

  const hasStock = Boolean(stockClipPath && fs.existsSync(stockClipPath));

  return { stockClipPath, stockTempDir, hasStock };
}
