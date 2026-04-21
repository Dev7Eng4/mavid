import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

function timeToMs(timeStr) {
  const [hours, minutes, seconds] = timeStr.split(':');
  const [sec, ms] = seconds.split('.');
  return (+hours * 3600 + +minutes * 60 + +sec) * 1000 + +ms;
}

function msToTime(duration) {
  let milliseconds = Math.floor(duration % 1000)
    .toString()
    .padStart(3, '0');
  let seconds = Math.floor((duration / 1000) % 60)
    .toString()
    .padStart(2, '0');
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
    .toString()
    .padStart(2, '0');
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// Hàm mới: Ép tách các câu không có dấu mà vẫn quá dài
function forceSplit(str, maxLength, finalArray) {
  if (str.length <= maxLength) {
    if (str) finalArray.push(str);
    return;
  }

  // Ưu tiên tìm trợ từ từ vị trí thứ 15 đến maxLength để ngắt cho tự nhiên
  const singleParticles = ['は', 'が', 'に', 'で', 'を', 'て'];
  let splitIndex = -1;

  for (let i = maxLength - 1; i >= 15; i--) {
    // Check cụm 2 chữ trước
    if (i > 0 && (str.substring(i - 1, i + 1) === 'ので' || str.substring(i - 1, i + 1) === 'から')) {
      splitIndex = i + 1;
      break;
    }
    // Check trợ từ 1 chữ
    if (singleParticles.includes(str[i])) {
      splitIndex = i + 1; // Ngắt ngay SAU trợ từ
      break;
    }
  }

  // Nếu câu không hề có trợ từ nào, bắt buộc cắt ở giữa hoặc ở giới hạn maxLength
  if (splitIndex === -1) {
    splitIndex = Math.min(Math.floor(str.length / 2), maxLength);
  }

  finalArray.push(str.slice(0, splitIndex));
  forceSplit(str.slice(splitIndex), maxLength, finalArray); // Đệ quy xử lý nốt phần còn lại
}

function splitJapaneseText(text) {
  const MAX_LEN = 35;
  let finalChunks = [];

  // 1. Tách theo dấu câu lớn
  let chunks = text.match(/[^。？！]+[。？！]?/g) || [text];

  chunks.forEach(chunk => {
    chunk = chunk.trim();
    if (!chunk) return;

    if (chunk.length > MAX_LEN) {
      // 2. Nếu có dấu phẩy, tách bằng dấu phẩy trước
      if (chunk.includes('、')) {
        let subChunks = chunk.match(/[^、]+[、]?/g) || [chunk];
        subChunks.forEach(sub => {
          // 3. Sau khi tách dấu phẩy mà vẫn dài, đưa vào hàm ép tách
          forceSplit(sub.trim(), MAX_LEN, finalChunks);
        });
      } else {
        // 3. Không có cả dấu phẩy, đưa trực tiếp vào hàm ép tách
        forceSplit(chunk, MAX_LEN, finalChunks);
      }
    } else {
      finalChunks.push(chunk);
    }
  });

  return finalChunks;
}

function processSubtitles(subtitles) {
  const result = [];
  const MAX_LENGTH_PER_SCREEN = 35;

  subtitles.forEach(sub => {
    const textToSplit = sub.text.replace(/\n/g, '');

    if (textToSplit.length <= MAX_LENGTH_PER_SCREEN) {
      result.push({ rawStart: sub.rawStart, rawEnd: sub.rawEnd, text: textToSplit });
      return;
    }

    const startMs = timeToMs(sub.rawStart);
    const endMs = timeToMs(sub.rawEnd);
    const totalDuration = endMs - startMs;

    const textChunks = splitJapaneseText(textToSplit);
    const totalChars = textChunks.reduce((acc, chunk) => acc + chunk.length, 0);

    let currentStartMs = startMs;

    textChunks.forEach((chunk, index) => {
      const chunkDuration = Math.floor((chunk.length / totalChars) * totalDuration);
      let currentEndMs = currentStartMs + chunkDuration;

      if (index === textChunks.length - 1) currentEndMs = endMs;

      result.push({
        rawStart: msToTime(currentStartMs),
        rawEnd: msToTime(currentEndMs),
        text: chunk,
      });

      currentStartMs = currentEndMs;
    });
  });

  return result;
}

function cleanSrt(vttPath) {
  console.log('🔄 Đang clean subtitle...');
  let text = fs.readFileSync(vttPath, 'utf8').replace(/\r/g, '');

  // Bỏ header + timestamp + thẻ HTML
  text = text
    .replace(/^WEBVTT[\s\S]*?\n\n/, '')
    .replace(/align:start position:\d+%/g, '')
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?c[^>]*>/g, '')
    .replace(/\[.*?\]/g, '') // bỏ [nhạc], [vỗ tay] v.v.
    .replace(/&[a-z]+;/g, '')
    .trim();
  // console.log('🚀 ~ cleanSrt ~ text:', text);

  // Chia thành khối (mỗi khối phụ đề)
  const blocks = text
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean);
  // console.log('🚀 ~ cleanSrt ~ blocks:', blocks);

  let cleanedBlocks = [];
  let prevLines = [];

  for (const block of blocks) {
    // Tách timestamp + text
    const [timeLine, ...lines] = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (!timeLine || !timeLine.includes('-->') || lines.join(' ').trim() === '') continue;

    const parts = timeLine.split('-->').map(p => p.trim());
    const rawStart = parts[0];
    const rawEnd = parts[1];

    const newLines = lines.filter(line => !prevLines.includes(line));

    if (newLines.length > 0) {
      const cleanedText = newLines.join('\n');
      if (cleanedBlocks.length > 0) {
        cleanedBlocks[cleanedBlocks.length - 1].rawEnd = rawStart;
      }
      cleanedBlocks.push({ rawStart, rawEnd, text: cleanedText });
      index++;
    }

    prevLines = lines;
  }

  const finalBlocks = processSubtitles(cleanedBlocks);

  const srt = finalBlocks
    .map((b, i, arr) => {
      const normalize = t => t.replace(/\./g, ',');

      const start = normalize(b.rawStart);
      const end = normalize(b.rawEnd);

      return `${i + 1}\n${start} --> ${end}\n${b.text}\n`;
    })
    .join('\n');

  const srtPath = vttPath.replace(/\.vtt$/i, '.srt');
  fs.writeFileSync(srtPath, srt, 'utf-8');
  console.log('✅ Clean subtitle xong:', srtPath);
}

/**
 * Trích xuất phần text thuần từ nội dung SRT (bỏ số thứ tự cue và timeline).
 * Input: chuỗi SRT (có thể là 1 chunk nhiều block cách nhau bằng dòng trống).
 * Output: chuỗi chỉ chứa các dòng thoại, mỗi block cách nhau 1 dòng trống.
 */
export function srtToPlainText(srtContent) {
  if (!srtContent) return '';
  const timelineRe = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;

  return srtContent
    .split(/\n\n+/)
    .map(block => {
      const lines = block
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      const textLines = lines.filter(line => {
        if (/^\d+$/.test(line)) return false;
        if (timelineRe.test(line)) return false;
        return true;
      });
      return textLines.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

const SRT_TIMELINE_LINE_RE = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;

/**
 * Kiểm tra SRT sau merge: số thứ tự cue (dòng đầu mỗi block) phải liên tục 1..N, không thiếu, không trùng.
 * Chỉ tính các block có dòng 1 là số nguyên dương và dòng 2 khớp timeline SRT.
 *
 * @param {string} srtContent
 * @returns {{ ok: boolean, cueCount: number, maxIndex: number, missing: number[], duplicateIndices: number[], invalidBlockCount: number }}
 */
export function checkSrtMergedCueIndexSequence(srtContent) {
  const empty = {
    ok: false,
    cueCount: 0,
    maxIndex: 0,
    missing: [],
    duplicateIndices: [],
    invalidBlockCount: 0,
  };

  const raw = String(srtContent ?? '').replace(/\r/g, '');
  const blocks = raw
    .split(/\n\n+/)
    .map(b => b.trim())
    .filter(Boolean);

  let invalidBlockCount = 0;
  const indices = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length < 3) {
      invalidBlockCount++;
      continue;
    }
    const idxLine = lines[0];
    const timeLine = lines[1];
    if (!/^\d+$/.test(idxLine) || !SRT_TIMELINE_LINE_RE.test(timeLine)) {
      invalidBlockCount++;
      continue;
    }
    indices.push(parseInt(idxLine, 10));
  }

  if (indices.length === 0) {
    return { ...empty, invalidBlockCount };
  }

  const maxIndex = Math.max(...indices);
  const seen = new Map();
  for (const n of indices) {
    seen.set(n, (seen.get(n) || 0) + 1);
  }

  const missing = [];
  for (let i = 1; i <= maxIndex; i++) {
    if (!seen.has(i)) missing.push(i);
  }

  const duplicateIndices = [];
  for (const [k, count] of seen) {
    if (count > 1) duplicateIndices.push(k);
  }
  duplicateIndices.sort((a, b) => a - b);

  const cueCount = indices.length;
  const ok = missing.length === 0 && duplicateIndices.length === 0 && maxIndex === cueCount;

  return {
    ok,
    cueCount,
    maxIndex,
    missing,
    duplicateIndices,
    invalidBlockCount,
  };
}

/**
 * Đánh lại số thứ tự cue (dòng đầu mỗi block) thành 1..N theo thứ tự xuất hiện.
 * Block không đủ chuẩn SRT (số + timeline + thoại) được giữ nguyên.
 *
 * @param {string} srtContent
 * @returns {string}
 */
export function renumberSrtCueIndices(srtContent) {
  const raw = String(srtContent ?? '').replace(/\r/g, '');
  const blocks = raw
    .split(/\n\n+/)
    .map(b => b.trim())
    .filter(Boolean);

  let seq = 0;
  const out = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length < 3) {
      out.push(block);
      continue;
    }
    const idxLine = lines[0];
    const timeLine = lines[1];
    if (!/^\d+$/.test(idxLine) || !SRT_TIMELINE_LINE_RE.test(timeLine)) {
      out.push(block);
      continue;
    }
    seq += 1;
    out.push([String(seq), timeLine, ...lines.slice(2)].join('\n'));
  }

  return out.join('\n\n').trim();
}

/**
 * Đọc folder downloads, lấy file VTT và làm sạch → xuất SRT
 */
export default async function runCleanSrt() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    console.error('Không tìm thấy thư mục downloads/');
    return;
  }

  const vttFiles = fs.readdirSync(DOWNLOADS_DIR).filter(f => f.endsWith('.vtt'));
  if (vttFiles.length === 0) {
    console.error('Không tìm thấy file .vtt trong downloads/');
    return;
  }

  const vttPath = path.join(DOWNLOADS_DIR, vttFiles[0]);
  cleanSrt(vttPath);
}

export { cleanSrt };
