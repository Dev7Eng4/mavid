import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const DOWNLOADS_DIR = path.join(PROJECT_ROOT, 'downloads');
const inputData = [
  {
    rawStart: '00:19:00.000',
    rawEnd: '00:19:10.000',
    // Ví dụ một câu dài ngoẵng không hề có dấu câu
    text: '昨日友達と一緒に東京駅の近くにある美味しいラーメン屋に行って特製豚骨ラーメンを食べたんだけど本当に美味しかった',
  },
];

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

/** Đường dẫn luôn tính từ gốc repo (không phụ thuộc cwd). Chỉ tên file → thư mục downloads. */
function resolveVttPath(input) {
  if (input == null || String(input).trim() === '') {
    throw new TypeError('resolveVttPath: cần chuỗi đường dẫn (hoặc gọi filter() không đối số để quét downloads)');
  }
  if (path.isAbsolute(input)) return path.normalize(input);
  const rel = String(input).replace(/^[/\\]+/, '');
  if (!/[\\/]/.test(rel)) {
    return path.join(DOWNLOADS_DIR, rel);
  }
  return path.join(PROJECT_ROOT, rel);
}

/** Mọi file .vtt trong downloads, mới nhất trước (mtime). */
function listVttInDownloads() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return [];
  return fs
    .readdirSync(DOWNLOADS_DIR)
    .filter(name => /\.vtt$/i.test(name))
    .map(name => path.join(DOWNLOADS_DIR, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function filterFile(resolved) {
  console.log('🔄 Đang clean subtitle...', resolved);
  let text = fs.readFileSync(resolved, 'utf8').replace(/\r/g, '');

  // Bỏ header + timestamp + thẻ HTML
  text = text
    .replace(/^WEBVTT[\s\S]*?\n\n/, '')
    .replace(/align:start position:\d+%/g, '')
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?c[^>]*>/g, '')
    .replace(/\[.*?\]/g, '') // bỏ [nhạc], [vỗ tay] v.v.
    .replace(/&[a-z]+;/g, '')
    .trim();

  const filteredTextPath = resolved.replace(/\.vtt$/i, '.filtered.txt');
  fs.writeFileSync(filteredTextPath, text, 'utf-8');
  console.log('📝 Đã ghi text sau filter:', filteredTextPath);

  // Chia thành khối (mỗi khối phụ đề)
  const blocks = text
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean);

  const blocksPath = resolved.replace(/\.vtt$/i, '.blocks.json');
  fs.writeFileSync(blocksPath, JSON.stringify(blocks, null, 2), 'utf-8');
  console.log('📝 Đã ghi blocks:', blocksPath);

  let cleanedBlocks = [];
  let prevLines = [];
  let index = 1;

  for (const block of blocks) {
    const [timeLine, ...lines] = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (!timeLine || !timeLine.includes('-->') || lines.join(' ').trim() === '') continue;

    const parts = timeLine.split('-->').map(p => p.trim());
    const rawStart = parts[0];
    const rawEnd = parts[1];

    const newLines = lines.filter(line => !prevLines.includes(line));

    // Nếu có câu mới, tạo block chuẩn mới
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

  const cleanedBlocksPath = resolved.replace(/\.vtt$/i, '.cleaned-blocks.json');
  fs.writeFileSync(cleanedBlocksPath, JSON.stringify(finalBlocks, null, 2), 'utf-8');
  console.log('📝 Đã ghi cleanedBlocks:', cleanedBlocksPath);

  // const cleaned = [];
  // let prevLine = '';
  // const strBreak = '<break>';

  // for (const block of blocks) {
  //   // Tách timestamp + text
  //   const [timeLine, ...lines] = block
  //     .split('\n')
  //     .map(l => l.trim())
  //     .filter(Boolean);
  //   if (!timeLine || !timeLine.includes('-->')) continue;

  //   const subtitleText = lines
  //     .join(' ')
  //     .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
  //     .replace(/<\/?c[^>]*>/g, '')
  //     .replace(/\s+/g, ' ')
  //     .trim();

  //   const parts = timeLine.split('-->').map(p => p.trim());
  //   const rawStart = parts[0];
  //   const rawEnd = parts[1];

  //   const lastLine = lines[lines.length - 1];

  //   if (!prevLine) {
  //     cleaned.push({ rawStart, rawEnd, text: subtitleText });
  //     prevLine = subtitleText;
  //     continue;
  //   }

  //   if (/<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(lastLine) || /<\/?c[^>]*>/.test(lastLine)) {
  //     cleaned.push({
  //       rawStart,
  //       rawEnd,
  //       text: lastLine
  //         .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
  //         .replace(/<\/?c[^>]*>/g, '')
  //         .trim(),
  //     });
  //     prevLine = subtitleText;
  //     continue;
  //   }

  //   // Bỏ qua nếu lặp
  //   // if (!prevLine || prevLine.split(strBreak)[0] !== lines[0]) {
  //   if (!prevLine.includes(subtitleText) && !subtitleText.includes(prevLine)) {
  //     cleaned.push({ rawStart, rawEnd, text: subtitleText });
  //     prevLine = subtitleText;
  //   }

  //   cleaned[cleaned.length - 1].rawEnd = rawEnd;
  // }

  // const srt = cleaned
  //   .map((b, i, arr) => {
  //     const normalize = t => t.replace(/\./g, ',');

  //     const start = normalize(b.rawStart);
  //     const end = normalize(b.rawEnd);

  //     return `${i + 1}\n${start} --> ${end}\n${b.text}\n`;
  //   })
  //   .join('\n');

  // const srtPath = resolved.replace(/\.vtt$/i, '.srt');
  // fs.writeFileSync(srtPath, srt, 'utf-8');
  // console.log('✅ Clean subtitle xong:', srtPath);
}

/**
 * Không truyền đường dẫn → tự tìm mọi file .vtt trong downloads (xử lý từng file).
 * Có đường dẫn → chỉ file đó.
 */
function filter(vttPath) {
  const paths = vttPath == null || String(vttPath).trim() === '' ? listVttInDownloads() : [resolveVttPath(vttPath)];

  if (paths.length === 0) {
    console.error(`Không có file .vtt trong: ${DOWNLOADS_DIR}`);
    process.exitCode = 1;
    return;
  }

  for (const resolved of paths) {
    filterFile(resolved);
  }
}

function cleanRollingSrt(srtContent) {
  // Tách file thành các block dựa trên các khoảng trắng/xuống dòng liên tiếp
  const blocks = srtContent.trim().split(/\r?\n\s*\r?\n/);
}

filter();
