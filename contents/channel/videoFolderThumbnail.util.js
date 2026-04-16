/**
 * Kiểm tra thumbnail raster (png / jpg / jpeg) trong folder video — không tính .webp.
 */
import fs from 'fs';
import path from 'path';

const RASTER_THUMB_RE = /\.(png|jpe?g)$/i;

/**
 * @param {string} videoDir — đường dẫn tuyệt đối
 * @returns {boolean}
 */
export function hasRasterThumbnailInFolder(videoDir) {
  if (!videoDir || !fs.existsSync(videoDir)) return false;
  let names;
  try {
    names = fs.readdirSync(videoDir);
  } catch {
    return false;
  }
  return names.some(n => RASTER_THUMB_RE.test(n));
}
