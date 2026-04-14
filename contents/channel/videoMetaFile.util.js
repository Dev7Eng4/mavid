/**
 * Đọc/ghi video-meta.json trong thư mục từng video (MaVidMedia/channels/{channel}/{videoId}/).
 */
import fs from 'fs';
import path from 'path';

export const VIDEO_META_FILENAME = 'video-meta.json';

/** Các trường Gemini bắt buộc đầy đủ để coi là không cần refresh transcript. */
export const GEMINI_META_KEYS = ['titleGemini', 'descriptionGemini', 'tagsGemini', 'summaryGemini'];

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function isNonEmptyString(v) {
  return v != null && String(v).trim() !== '';
}

/**
 * @param {Record<string, unknown>|null|undefined} meta
 * @returns {boolean} true nếu cần chạy Gemini (thiếu ít nhất một trong 4 trường)
 */
export function geminiMetaFieldsIncomplete(meta) {
  if (!meta || typeof meta !== 'object') return true;
  return GEMINI_META_KEYS.some(k => !isNonEmptyString(meta[k]));
}

/**
 * @param {string} videoDir — đường dẫn tuyệt đối thư mục video
 * @returns {Record<string, unknown>|null}
 */
export function readVideoMetaFile(videoDir) {
  const p = path.join(videoDir, VIDEO_META_FILENAME);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} videoDir
 * @param {Record<string, unknown>} meta
 */
export function writeVideoMetaFile(videoDir, meta) {
  const p = path.join(videoDir, VIDEO_META_FILENAME);
  fs.mkdirSync(videoDir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * Gộp object Gemini vào meta hiện có, giữ title/description/tags gốc YouTube nếu đã có.
 * @param {Record<string, unknown>} base
 * @param {{ title?: string, description?: string, tags?: string, summary?: string }} gemini
 */
export function mergeGeminiIntoVideoMeta(base, gemini) {
  const out = { ...base };
  out.titleGemini = gemini.title != null ? String(gemini.title) : '';
  out.descriptionGemini = gemini.description != null ? String(gemini.description) : '';
  const tagsVal = gemini.tags;
  out.tagsGemini =
    typeof tagsVal === 'string' ? tagsVal : Array.isArray(tagsVal) ? tagsVal.join(', ') : String(tagsVal ?? '');
  out.summaryGemini = gemini.summary != null ? String(gemini.summary) : '';
  return out;
}
