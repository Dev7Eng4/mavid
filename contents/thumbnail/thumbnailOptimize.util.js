/**
 * Nén / thu nhỏ `flow-thumbnail.jpg` khi file quá lớn (sau khi Flow trả ảnh).
 */
import fs from 'fs';

/** Ngưỡng tối ưu JPEG flow-thumbnail (bytes). */
export const FLOW_THUMB_OPTIMIZE_MIN_BYTES = 1024 * 1024;

/**
 * Nếu `flow-thumbnail.jpg` ≥ 1MB — nén JPEG (giảm quality), vẫn lớn thì thu nhỏ chiều ngang.
 * @param {string} filePath
 */
export async function optimizeFlowThumbnailJpegIfLarge(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return;
    const before = fs.statSync(filePath).size;
    if (before < FLOW_THUMB_OPTIMIZE_MIN_BYTES) return;

    const sharp = (await import('sharp')).default;
    let buf;
    let quality = 85;
    while (quality >= 40) {
      buf = await sharp(filePath).jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();
      if (buf.length < FLOW_THUMB_OPTIMIZE_MIN_BYTES) break;
      quality -= quality > 55 ? 10 : 5;
    }

    if (buf.length >= FLOW_THUMB_OPTIMIZE_MIN_BYTES) {
      for (const maxW of [1280, 1024, 800, 640]) {
        buf = await sharp(buf)
          .resize(maxW, null, { withoutEnlargement: true })
          .jpeg({ quality: 72, mozjpeg: true, chromaSubsampling: '4:2:0' })
          .toBuffer();
        if (buf.length < FLOW_THUMB_OPTIMIZE_MIN_BYTES) break;
      }
    }

    if (buf.length < before) {
      fs.writeFileSync(filePath, buf);
      console.log(
        `[thumbnail-flow] Đã tối ưu flow-thumbnail: ${(before / FLOW_THUMB_OPTIMIZE_MIN_BYTES).toFixed(2)}MB → ${(
          buf.length / FLOW_THUMB_OPTIMIZE_MIN_BYTES
        ).toFixed(2)}MB (${before} → ${buf.length} bytes)`,
      );
    } else if (before >= FLOW_THUMB_OPTIMIZE_MIN_BYTES) {
      console.warn('[thumbnail-flow] Không giảm được kích thước flow-thumbnail sau tối ưu; giữ file gốc.');
    }
  } catch (e) {
    console.warn('[thumbnail-flow] Lỗi tối ưu kích thước thumbnail:', e.message);
  }
}
