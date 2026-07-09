/**
 * Đọc file .srt (đã clean) → dạng [id] text (mỗi dòng một cue).
 *
 * Dùng:
 *   node contents/testTranscript/convertToIdText.js
 *   node contents/testTranscript/convertToIdText.js path/to/file.srt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { objectsToIdTextFormat, parseSrtToObjects } from '../utils/srt.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SRT = path.join(__dirname, 'transcript.ja.srt');

const isMain =
  process.argv[1] != null && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(__filename).href;

/** @param {string} srtPath */
export function idTextOutputPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.id.txt`);
}

/**
 * @param {string} srtContent
 * @returns {string}
 */
export function srtContentToIdText(srtContent) {
  const objects = parseSrtToObjects(srtContent);
  if (objects.length === 0) {
    throw new Error('srtContentToIdText: không parse được cue nào từ SRT');
  }
  return objectsToIdTextFormat(objects);
}

/**
 * @param {string} srtPath
 * @returns {string}
 */
export function readSrtAsIdText(srtPath) {
  const resolved = path.resolve(srtPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`readSrtAsIdText: không tìm thấy file ${resolved}`);
  }
  if (!/\.srt$/i.test(resolved)) {
    throw new Error(`readSrtAsIdText: cần file .srt, nhận được ${path.basename(resolved)}`);
  }

  const idText = srtContentToIdText(fs.readFileSync(resolved, 'utf8'));
  if (!idText.trim()) {
    throw new Error(`readSrtAsIdText: nội dung rỗng — ${resolved}`);
  }

  return idText;
}

/**
 * @param {string} srtPath
 * @param {string} idText
 * @returns {string} đường dẫn file đã ghi
 */
export function saveIdText(srtPath, idText) {
  const outputPath = idTextOutputPath(srtPath);
  fs.writeFileSync(outputPath, idText, 'utf8');
  return outputPath;
}

/**
 * @param {string} [srtPath] — mặc định `transcript.ja.srt` trong thư mục này
 * @param {{ writeFile?: boolean }} [options]
 * @returns {{ srtPath: string, idText: string, outputPath?: string }}
 */
export function convertTestTranscriptToIdText(srtPath = DEFAULT_SRT, { writeFile = true } = {}) {
  const resolved = path.resolve(srtPath);
  const idText = readSrtAsIdText(resolved);
  const result = { srtPath: resolved, idText };

  if (writeFile) {
    result.outputPath = saveIdText(resolved, idText);
  }

  return result;
}

if (isMain) {
  const arg = process.argv[2]?.trim();
  const result = convertTestTranscriptToIdText(arg || DEFAULT_SRT);

  console.log(`SRT: ${result.srtPath}`);
  if (result.outputPath) {
    console.log(`ID text: ${result.outputPath}`);
  }
}
