/**
 * Stock Overlay Layer
 *
 * Lớp video phủ lên nền stock (chạy chậm, scale + crop + giảm opacity).
 * Tách helpers + prebake để dùng chung trong filter graph render.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { STOCK_VIDEO } from '../../constants/index.js';
import { listVideoFilesInDir } from '../shared.js';

const execAsync = promisify(exec);

/** Tên thư mục con cạnh `backgrounds/<stock>/`: `backgrounds/overlay/`. Nếu có file video, trộn lên nền stock. */
export const STOCK_OVERLAY_DIR = 'overlay';
/** Nhân `PTS` (3 = một lần phát gấp 3 thời lượng, tốc độ ~1/3). */
export const STOCK_OVERLAY_PTS_MULT = 3;
/** Scale 1.4 (≈ zoom 40%) rồi `crop` về `CANVAS` — cạnh dưới lớp cắt trùng đáy nguồn (lấy vùng phía dưới). */
export const STOCK_OVERLAY_ZOOM = 1.4;
export const STOCK_OVERLAY_OPACITY = 0.5;

/**
 * Liệt kê các video overlay (mp4/mov/mkv/webm) trong `overlayDir` đã sort theo tên.
 * @param {string} overlayDir
 * @returns {string[]}
 */
export function getOverlayVideoFiles(overlayDir) {
  return listVideoFilesInDir(overlayDir);
}

/**
 * Lấy video overlay đầu tiên trong `overlayDir`, hoặc null nếu folder trống.
 * @param {string} overlayDir
 * @returns {string|null}
 */
export function pickFirstOverlayVideo(overlayDir) {
  const v = getOverlayVideoFiles(overlayDir);
  return v[0] || null;
}

/**
 * Subchain filter: scale + crop (đáy lớp khớp đáy nguồn) + format yuva420p + giảm opacity.
 * Dùng trong filter graph chính (single-pass) hoặc khi prebake.
 * @returns {string}
 */
export function stockOverlayScaleCropAlphaSubchain() {
  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const z = STOCK_OVERLAY_ZOOM;
  const a = STOCK_OVERLAY_OPACITY;
  return `scale=w='iw*${z}':h='ih*${z}',crop=${w}:${h}:(iw-ow)/2:ih-oh,format=yuva420p,colorchannelmixer=aa=${a}`;
}

/**
 * Pre-bake stock overlay video (PTS mult + scale + crop + alpha) ra .mov ProRes 4444 cache.
 * Bỏ chuỗi filter overlay khỏi filter chính → input thẳng vào overlay.
 *
 * @param {string} sourcePath - File overlay gốc
 * @param {string} cacheDir - Thư mục cache
 * @returns {Promise<string|null>} Đường dẫn cache, hoặc `null` nếu thất bại.
 */
export async function getPrebakedStockOverlayVideo(sourcePath, cacheDir) {
  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const st = fs.statSync(sourcePath);
  const zTag = Math.round(STOCK_OVERLAY_ZOOM * 100);
  const aTag = Math.round(STOCK_OVERLAY_OPACITY * 100);
  const cacheKey = `ov_${path.parse(sourcePath).name}_${w}x${h}_s${STOCK_OVERLAY_PTS_MULT}_z${zTag}_a${aTag}_bot_${st.mtimeMs}.mov`;
  const cachePath = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cachePath)) {
    console.log(`[overlay] Dùng cache: ${path.basename(cachePath)}`);
    return cachePath;
  }
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const vf = `setpts=${STOCK_OVERLAY_PTS_MULT}*PTS,${stockOverlayScaleCropAlphaSubchain()}`;
  const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${sourcePath}" -vf "${vf}" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${cachePath}"`;
  try {
    await execAsync(cmd, { maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    console.warn('[overlay] Pre-cache thất bại, dùng bước trộn single-pass với bản gốc:', e.message);
    return null;
  }
  console.log(`[overlay] Đã tạo cache: ${path.basename(cachePath)}`);
  return cachePath;
}
