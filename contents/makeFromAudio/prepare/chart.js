/**
 * Bar chart layer: file scanner + pre-bake .mov ProRes (loại nền đen).
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { ROOT, listVideoFilesInDir } from '../shared.js';

const execAsync = promisify(exec);

/** Thư mục chứa các file chart (mp4/mov) — overlay góc phải trên video. */
export const ASSET_CHART_DIR = path.join(ROOT, 'assets', 'chart');

/**
 * Liệt kê các file chart trong `dir` (mặc định `ASSET_CHART_DIR`).
 * @param {string} [dir]
 * @returns {string[]}
 */
export function getChartVideoFiles(dir = ASSET_CHART_DIR) {
  return listVideoFilesInDir(dir);
}

/**
 * Lấy file chart đầu tiên trong `ASSET_CHART_DIR`, hoặc null nếu trống.
 * @returns {string|null}
 */
export function pickFirstChartVideo() {
  const v = getChartVideoFiles(ASSET_CHART_DIR);
  return v[0] || null;
}

/**
 * Pre-bake chart MOV đã scale + colorkey (loại nền đen) + format yuva420p + fps. Cache theo wCap + fps + mtime.
 * Bỏ chuỗi filter chart realtime trong filter chính → input thẳng vào overlay.
 *
 * @param {string} sourcePath - File chart gốc (mp4/mov/...)
 * @param {number} wCap - Bề rộng tối đa khi thu chart
 * @param {number} fps - FPS đầu ra
 * @returns {Promise<string|null>} Đường dẫn .mov cache, hoặc `null` nếu thất bại.
 */
export async function getPrebakedChartVideo(sourcePath, wCap, fps) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  const cacheDir = path.join(path.dirname(sourcePath), '.cache');
  const st = fs.statSync(sourcePath);
  const cacheKey = `chart_${path.parse(sourcePath).name}_w${wCap}_f${fps}_${st.mtimeMs}.mov`;
  const cachePath = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cachePath)) return cachePath;
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const vf = `scale=${wCap}:-2:flags=fast_bilinear,colorkey=0x000000:0.1:0.1,format=yuva420p,fps=${fps}`;
  const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${sourcePath}" -vf "${vf}" -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le "${cachePath}"`;
  try {
    await execAsync(cmd, { maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    console.warn('[chart] Pre-bake thất bại, fallback xử lý realtime:', e.message);
    return null;
  }
  console.log(`[chart] Đã tạo cache: ${path.basename(cachePath)}`);
  return cachePath;
}
