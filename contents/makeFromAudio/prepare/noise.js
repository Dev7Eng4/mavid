/**
 * Pre-bake noise overlay (.mov ProRes 4444) để bỏ chuỗi 4 filter per-frame khỏi pipeline chính.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Pre-bake noise overlay MOV: scale → colorkey (loại nền đen) → alpha α → fps + size đúng output.
 * Bỏ 4 filter per-frame (fps, scale, format yuva420p, colorkey, colorchannelmixer) khỏi pipeline chính.
 * Cache theo (w, h, fps, alpha, mtime).
 *
 * @param {string} sourcePath - File noise gốc (mp4)
 * @param {number} w - Bề rộng đầu ra (px)
 * @param {number} h - Chiều cao đầu ra (px)
 * @param {number} fps - FPS đầu ra
 * @param {number} alpha - Alpha 0..1 (vd 0.6)
 * @returns {Promise<string|null>} Đường dẫn .mov cache, hoặc `null` nếu thất bại.
 */
export async function getPrebakedNoiseMov(sourcePath, w, h, fps, alpha) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  const cacheDir = path.join(path.dirname(sourcePath), '.cache');
  const st = fs.statSync(sourcePath);
  const aTag = String(Math.round(alpha * 1000)).padStart(4, '0');
  const cacheKey = `noise_${path.parse(sourcePath).name}_${w}x${h}_f${fps}_a${aTag}_${st.mtimeMs}.mov`;
  const cachePath = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cachePath)) return cachePath;
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const vf = `fps=${fps},scale=${w}:${h}:flags=fast_bilinear,format=yuva420p,colorkey=0x000000:0.1:0.1,colorchannelmixer=aa=${alpha}`;
  const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${sourcePath}" -vf "${vf}" -an -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le "${cachePath}"`;
  try {
    await execAsync(cmd, { maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    console.warn('[noise] Pre-bake thất bại, fallback xử lý realtime:', e.message);
    return null;
  }
  console.log(`[noise] Đã tạo cache: ${path.basename(cachePath)}`);
  return cachePath;
}
