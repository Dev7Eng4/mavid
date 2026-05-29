/**
 * Đọc file .srt trong downloads/ → plain text (bỏ số cue và timeline).
 *
 * Dùng:
 *   node contents/transcript/convertToPlainText.js
 *   node contents/transcript/convertToPlainText.js path/to/file.srt
 *   node contents/transcript/convertToPlainText.js path/to/downloads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { PATHS } from '../constants/paths.js';
import { getSubtitleFile } from '../makeFromAudio/shared.js';
import { srtToPlainText } from '../utils/srt.util.js';

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] != null && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(__filename).href;

/** @param {string} srtPath */
export function plainTextOutputPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.plain.txt`);
}

/**
 * @param {string} srtContent
 * @returns {string}
 */
export function srtContentToPlainText(srtContent) {
  return srtToPlainText(srtContent);
}

/**
 * @param {string} srtPath
 * @returns {string}
 */
export function readSrtFileAsPlainText(srtPath) {
  const resolved = path.resolve(srtPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`readSrtFileAsPlainText: không tìm thấy file ${resolved}`);
  }
  if (!/\.srt$/i.test(resolved)) {
    throw new Error(`readSrtFileAsPlainText: cần file .srt, nhận được ${path.basename(resolved)}`);
  }

  const plain = srtToPlainText(fs.readFileSync(resolved, 'utf8'));
  if (!plain.trim()) {
    throw new Error(`readSrtFileAsPlainText: nội dung plain text rỗng — ${resolved}`);
  }

  return plain;
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
 * @param {string} srtPath
 * @param {{ writeFile?: boolean }} [options]
 * @returns {{ srtPath: string, plainText: string, outputPath?: string }}
 */
export function convertSrtFileToPlainText(srtPath, { writeFile = true } = {}) {
  const resolved = path.resolve(srtPath);
  const plainText = readSrtFileAsPlainText(resolved);
  const result = { srtPath: resolved, plainText };

  if (writeFile) {
    result.outputPath = savePlainText(resolved, plainText);
  }

  return result;
}

/**
 * Tìm file .srt trong thư mục downloads (ưu tiên .srt qua getSubtitleFile).
 * @param {string} [downloadsDir]
 * @returns {string}
 */
export function findSrtInDownloads(downloadsDir = PATHS.DOWNLOADS) {
  const dir = path.resolve(downloadsDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`findSrtInDownloads: không tìm thấy thư mục ${dir}`);
  }

  const srtPath = getSubtitleFile(dir);
  if (!srtPath) {
    throw new Error(`findSrtInDownloads: không có file .srt/.vtt trong ${dir}`);
  }
  if (!/\.srt$/i.test(srtPath)) {
    throw new Error(`findSrtInDownloads: cần file .srt, nhận được ${path.basename(srtPath)}`);
  }

  return srtPath;
}

/**
 * Lấy SRT từ downloads và chuyển sang plain text.
 * @param {string} [downloadsDir]
 * @param {{ writeFile?: boolean }} [options]
 * @returns {{ srtPath: string, plainText: string, outputPath?: string }}
 */
export function convertDownloadsSrtToPlainText(downloadsDir = PATHS.DOWNLOADS, options = {}) {
  const srtPath = findSrtInDownloads(downloadsDir);
  return convertSrtFileToPlainText(srtPath, options);
}

if (isMain) {
  const arg = process.argv[2]?.trim();

  let result;
  if (arg && /\.srt$/i.test(arg)) {
    result = convertSrtFileToPlainText(arg);
  } else if (arg) {
    result = convertDownloadsSrtToPlainText(path.resolve(arg));
  } else {
    result = convertDownloadsSrtToPlainText();
  }

  console.log(`SRT: ${result.srtPath}`);
  if (result.outputPath) {
    console.log(`Plain text: ${result.outputPath}`);
  }
}
