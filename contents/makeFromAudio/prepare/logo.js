/**
 * Pre-bake logo PNG (đã scale + bo tròn alpha) để bỏ filter `geq` per-pixel khỏi pipeline chính.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Pre-bake logo PNG đã scale + bo tròn (alpha mask). Cache theo size + mtime.
 * Bỏ filter `geq` per-pixel khỏi filter chính của render → chỉ chạy 1 lần ở đây.
 *
 * @param {string} sourcePath - File logo gốc (png/jpg/…)
 * @param {number} size - Cạnh ô vuông đầu ra (px)
 * @returns {Promise<string|null>} Đường dẫn PNG cache, hoặc `null` nếu thất bại.
 */
export async function getPrebakedLogoPng(sourcePath, size) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  const cacheDir = path.join(path.dirname(sourcePath), '.cache');
  const st = fs.statSync(sourcePath);
  const cacheKey = `logo_${path.parse(sourcePath).name}_${size}_${st.mtimeMs}.png`;
  const cachePath = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cachePath)) return cachePath;
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const r = Math.floor(size / 2);
  const geqExpr = `if(lte(hypot(X-W/2,Y-H/2),${r}),255,0)`;
  const vf = `scale=${size}:${size}:flags=fast_bilinear,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${geqExpr}'`;
  const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${sourcePath}" -vf "${vf}" -frames:v 1 "${cachePath}"`;
  try {
    await execAsync(cmd, { maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    console.warn('[logo] Pre-bake PNG thất bại, fallback geq trong filter chính:', e.message);
    return null;
  }
  console.log(`[logo] Đã tạo cache: ${path.basename(cachePath)}`);
  return cachePath;
}
