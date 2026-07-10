/**
 * Đọc file .srt (đã clean) → plain text (bỏ số cue và timeline), chỉ 25 phút đầu.
 *
 * Dùng:
 *   node contents/testTranscript/getPlainText.js
 *   node contents/testTranscript/getPlainText.js path/to/file.srt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { parseSrtToObjects, srtTimestampToMs } from '../utils/srt.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SRT = path.join(__dirname, 'transcript.srt');
const DEFAULT_MAX_MINUTES = 25;

const isMain =
  process.argv[1] != null && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(__filename).href;

/** @param {string} srtPath */
export function plainTextOutputPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.plain.txt`);
}

/**
 * @param {string} timeline — dạng `00:00:00,000 --> 00:00:03,560`
 * @returns {number}
 */
function getCueStartMs(timeline) {
  const start = timeline.split('-->')[0].trim();
  return srtTimestampToMs(start);
}

/**
 * @param {string} srtContent
 * @param {number} [maxMinutes=25] — chỉ lấy cue bắt đầu trước mốc này
 * @returns {string}
 */
export function srtContentToPlainText(srtContent, maxMinutes = DEFAULT_MAX_MINUTES) {
  const maxMs = maxMinutes * 60 * 1000;
  const cues = parseSrtToObjects(srtContent).filter(cue => getCueStartMs(cue.timeline) < maxMs);

  if (cues.length === 0) {
    throw new Error(`srtContentToPlainText: không có cue nào trong ${maxMinutes} phút đầu`);
  }

  return cues.map(cue => cue.text).join('\n');
}

/**
 * @param {string} srtPath
 * @param {number} [maxMinutes=25]
 * @returns {string}
 */
export function readSrtAsPlainText(srtPath, maxMinutes = DEFAULT_MAX_MINUTES) {
  const resolved = path.resolve(srtPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`readSrtAsPlainText: không tìm thấy file ${resolved}`);
  }
  if (!/\.srt$/i.test(resolved)) {
    throw new Error(`readSrtAsPlainText: cần file .srt, nhận được ${path.basename(resolved)}`);
  }

  const plainText = srtContentToPlainText(fs.readFileSync(resolved, 'utf8'), maxMinutes);
  if (!plainText.trim()) {
    throw new Error(`readSrtAsPlainText: nội dung rỗng — ${resolved}`);
  }

  return plainText;
}

/**
 * @param {string} srtPath
 * @param {string} plainText
 * @returns {string} đường dẫn file đã ghi
 */
export function savePlainText(srtPath, plainText) {
  const outputPath = plainTextOutputPath(srtPath);
  fs.writeFileSync(outputPath, plainText, 'utf8');
  return outputPath;
}

/**
 * @param {string} [srtPath] — mặc định `transcript.srt` trong thư mục này
 * @param {{ writeFile?: boolean, maxMinutes?: number }} [options]
 * @returns {{ srtPath: string, plainText: string, outputPath?: string }}
 */
export function getPlainText(srtPath = DEFAULT_SRT, { writeFile = true, maxMinutes = DEFAULT_MAX_MINUTES } = {}) {
  const resolved = path.resolve(srtPath);
  const plainText = readSrtAsPlainText(resolved, maxMinutes);
  const result = { srtPath: resolved, plainText };

  if (writeFile) {
    result.outputPath = savePlainText(resolved, plainText);
  }

  return result;
}

if (isMain) {
  const arg = process.argv[2]?.trim();
  const result = getPlainText(arg || DEFAULT_SRT);

  console.log(`SRT: ${result.srtPath}`);
  if (result.outputPath) {
    console.log(`Plain text: ${result.outputPath}`);
  }
}
