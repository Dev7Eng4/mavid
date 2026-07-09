/**
 * Clean VTT YouTube → SRT chuẩn (bỏ thẻ HTML, dedupe cue trùng, tách dòng tiếng Nhật).
 *
 * Dùng:
 *   node contents/testTranscript/cleanTranscript.js
 *   node contents/testTranscript/cleanTranscript.js path/to/file.vtt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { cleanSrt } from '../utils/srt.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_VTT = path.join(__dirname, 'transcript.ja.vtt');

const isMain =
  process.argv[1] != null && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(__filename).href;

/**
 * Clean file VTT → ghi file .srt cùng thư mục.
 * @param {string} [vttPath] — mặc định `transcript.ja.vtt` trong thư mục này
 * @returns {string} đường dẫn file .srt đã ghi
 */
export function cleanTestTranscript(vttPath = DEFAULT_VTT) {
  const resolved = path.resolve(vttPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`cleanTestTranscript: không tìm thấy file ${resolved}`);
  }
  if (!/\.vtt$/i.test(resolved)) {
    throw new Error(`cleanTestTranscript: cần file .vtt, nhận được ${path.basename(resolved)}`);
  }

  cleanSrt(resolved);
  return resolved.replace(/\.vtt$/i, '.srt');
}

if (isMain) {
  const arg = process.argv[2]?.trim();
  const srtPath = cleanTestTranscript(arg || DEFAULT_VTT);
  console.log(`SRT: ${srtPath}`);
}
