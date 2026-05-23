/**
 * Đọc file .srt trong downloads/ → dạng [id] text (mỗi dòng một cue).
 *
 * Dùng:
 *   node contents/new/convertTranscript.js
 *   node contents/new/convertTranscript.js path/to/file.srt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../../../constants/paths.js';
import { getSubtitleFile } from '../../shared.js';
import { parseSrtToObjects } from '../../../utils/srt.util.js';

/** @param {string} srtPath */
export function transcriptOutputPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.transcript.txt`);
}

/**
 * @param {{ id: number, text: string }[]} transcript
 * @returns {string}
 */
export function transcriptToIdText(transcript) {
  return transcript.map(({ id, text }) => `[${id}] ${text}`).join('\n');
}

/**
 * @param {string} srtPath
 * @param {{ id: number, text: string }[]} transcript
 * @returns {string} đường dẫn file đã ghi
 */
export function saveTranscript(srtPath, transcript) {
  const outputPath = transcriptOutputPath(srtPath);
  fs.writeFileSync(outputPath, transcriptToIdText(transcript), 'utf8');
  return outputPath;
}

/**
 * @param {string} srtContent
 * @returns {{ id: number, text: string }[]}
 */
export function srtContentToTranscript(srtContent) {
  return parseSrtToObjects(srtContent).map((cue, index) => {
    const id = Number.parseInt(cue.id, 10);
    return {
      ...cue,
      id: Number.isFinite(id) ? id : index + 1,
    };
  });
}

/**
 * @param {string} srtPath
 * @returns {{ id: number, text: string }[]}
 */
export function convertSrtFile(srtPath) {
  const resolved = path.resolve(srtPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`convertSrtFile: không tìm thấy file ${resolved}`);
  }
  if (!/\.srt$/i.test(resolved)) {
    throw new Error(`convertSrtFile: cần file .srt, nhận được ${path.basename(resolved)}`);
  }
  return srtContentToTranscript(fs.readFileSync(resolved, 'utf8'));
}

/**
 * @param {string} [downloadsDir]
 * @returns {{ srtPath: string, transcript: { id: number, text: string }[] }}
 */
export function loadTranscriptFromDownloads(downloadsDir = PATHS.DOWNLOADS) {
  const dir = path.resolve(downloadsDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`loadTranscriptFromDownloads: không tìm thấy thư mục ${dir}`);
  }

  const srtPath = getSubtitleFile(dir);
  if (!srtPath) {
    throw new Error(`loadTranscriptFromDownloads: không có file .srt/.vtt trong ${dir}`);
  }

  const ext = path.extname(srtPath).toLowerCase();
  if (ext !== '.srt') {
    throw new Error(`loadTranscriptFromDownloads: hiện chỉ hỗ trợ .srt, nhận được ${path.basename(srtPath)}`);
  }

  const transcript = convertSrtFile(srtPath);
  if (transcript.length === 0) {
    throw new Error(`loadTranscriptFromDownloads: parse SRT rỗng — ${srtPath}`);
  }

  return { srtPath, transcript };
}
