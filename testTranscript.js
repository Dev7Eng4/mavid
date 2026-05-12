import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import path from 'path';

const OUTPUTS_DIR = './demo';

// Tạo folder outputs nếu chưa có
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

const outputTemplate = path.join(OUTPUTS_DIR, '%(title)s-%(id)s.%(ext)s');

// ─── helpers ───

function timeToMs(timeStr) {
  const s = String(timeStr ?? '')
    .trim()
    .replace(',', '.');
  const parts = s.split(':');
  if (parts.length !== 3) return NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const secPart = parts[2];
  const [secStr, frac = '0'] = secPart.split('.');
  const sec = parseInt(secStr, 10);
  const ms = parseInt(String(frac).padEnd(3, '0').slice(0, 3), 10);
  if ([h, m, sec, ms].some(n => Number.isNaN(n))) return NaN;
  return ((h * 60 + m) * 60 + sec) * 1000 + ms;
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

function forceSplit(str, maxLength, finalArray) {
  if (str.length <= maxLength) {
    if (str) finalArray.push(str);
    return;
  }
  const singleParticles = ['は', 'が', 'に', 'で', 'を', 'て'];
  let splitIndex = -1;
  for (let i = maxLength - 1; i >= 15; i--) {
    if (i > 0 && (str.substring(i - 1, i + 1) === 'ので' || str.substring(i - 1, i + 1) === 'から')) {
      splitIndex = i + 1;
      break;
    }
    if (singleParticles.includes(str[i])) {
      splitIndex = i + 1;
      break;
    }
  }
  if (splitIndex === -1) {
    splitIndex = Math.min(Math.floor(str.length / 2), maxLength);
  }
  finalArray.push(str.slice(0, splitIndex));
  forceSplit(str.slice(splitIndex), maxLength, finalArray);
}

function splitJapaneseText(text) {
  const MAX_LEN = 35;
  let finalChunks = [];
  let chunks = text.match(/[^。？！]+[。？！]?/g) || [text];
  chunks.forEach(chunk => {
    chunk = chunk.trim();
    if (!chunk) return;
    if (chunk.length > MAX_LEN) {
      if (chunk.includes('、')) {
        let subChunks = chunk.match(/[^、]+[、]?/g) || [chunk];
        subChunks.forEach(sub => {
          forceSplit(sub.trim(), MAX_LEN, finalChunks);
        });
      } else {
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
  const MAX_LENGTH_PER_SCREEN = 25;
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

// ─── clean functions ───

function cleanSrtOne(vttPath, outputSrtPath) {
  console.log('🔄 [CleanOne] Đang clean subtitle...');
  let text = fs.readFileSync(vttPath, 'utf8').replace(/\r/g, '');

  text = text
    .replace(/^WEBVTT[\s\S]*?\n\n/, '')
    .replace(/align:start position:\d+%/g, '')
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
    .replace(/<\/?c[^>]*>/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/&[a-z]+;/g, '')
    .trim();

  const blocks = text
    .split(/(?=\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3})/)
    // .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean);

  // Debug: ghi blocks ra file để check
  fs.writeFileSync(path.join(OUTPUTS_DIR, 'blocks.json'), JSON.stringify(blocks, null, 2), 'utf-8');
  console.log('📝 [CleanOne] Đã ghi blocks vào', path.join(OUTPUTS_DIR, 'blocks.json'));

  let cleanedBlocks = [];
  let prevLines = [];

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

    if (newLines.length > 0) {
      const cleanedText = newLines.join('\n');
      if (cleanedBlocks.length > 0) {
        cleanedBlocks[cleanedBlocks.length - 1].rawEnd = rawStart;
      }
      cleanedBlocks.push({ rawStart, rawEnd, text: cleanedText });
    }

    prevLines = lines;
  }

  const finalBlocks = processSubtitles(cleanedBlocks);

  const srt = finalBlocks
    .map((b, i) => {
      const normalize = t => t.replace(/\./g, ',');
      const start = normalize(b.rawStart);
      const end = normalize(b.rawEnd);
      return `${i + 1}\n${start} --> ${end}\n${b.text}\n`;
    })
    .join('\n');

  fs.writeFileSync(outputSrtPath, srt, 'utf-8');
  console.log('✅ [CleanOne] Clean subtitle xong:', outputSrtPath);
}

function cleanSrtTwo(vttPath, outputSrtPath) {
  console.log('🔄 [CleanTwo] Đang clean subtitle...');
  let text = fs.readFileSync(vttPath, 'utf8').replace(/\r/g, '');

  text = text
    .replace(/^WEBVTT[\s\S]*?\n\n/, '')
    .replace(/align:start position:\d+%/g, '')
    // .replace(/\[.*?\]/g, '')
    .replace(/&[a-z]+;/g, '')
    .trim();

  const blocks = text
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean);

  const cleaned = [];
  let prevLine = '';

  for (const block of blocks) {
    const [timeLine, ...lines] = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (!timeLine || !timeLine.includes('-->')) continue;

    const subtitleText = lines
      .join(' ')
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
      .replace(/<\/?c[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const parts = timeLine.split('-->').map(p => p.trim());
    const rawStart = parts[0];
    const rawEnd = parts[1];

    const lastLine = lines[lines.length - 1];

    if (!prevLine) {
      cleaned.push({ rawStart, rawEnd, text: subtitleText });
      prevLine = subtitleText;
      continue;
    }

    if (/<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(lastLine) || /<\/?c[^>]*>/.test(lastLine)) {
      cleaned.push({
        rawStart,
        rawEnd,
        text: lastLine
          .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
          .replace(/<\/?c[^>]*>/g, '')
          .trim(),
      });
      prevLine = subtitleText;
      continue;
    }

    if (!prevLine.includes(subtitleText) && !subtitleText.includes(prevLine)) {
      cleaned.push({ rawStart, rawEnd, text: subtitleText });
      prevLine = subtitleText;
    }

    cleaned[cleaned.length - 1].rawEnd = rawEnd;
  }

  const srt = cleaned
    .map((b, i) => {
      const normalize = t => t.replace(/\./g, ',');
      const start = normalize(b.rawStart);
      const end = normalize(b.rawEnd);
      return `${i + 1}\n${start} --> ${end}\n${b.text}\n`;
    })
    .join('\n');

  fs.writeFileSync(outputSrtPath, srt, 'utf-8');
  console.log('✅ [CleanTwo] Clean subtitle xong:', outputSrtPath);
}

// ─── main ───

const testTranscript = async () => {
  console.log('🚀 Bắt đầu download VTT...');

  await youtubedl('https://www.youtube.com/watch?v=JAHVWR2RX6w', {
    output: outputTemplate,
    skipDownload: true,
    writeSub: false,
    writeAutoSub: true,
    convertSubs: 'vtt',
    subLangs: 'ja',
    sleepSubtitles: 5,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  console.log('✅ Download VTT xong!');

  // Tìm file VTT vừa tải trong outputs
  const vttFiles = fs.readdirSync(OUTPUTS_DIR).filter(f => f.endsWith('.vtt'));
  if (vttFiles.length === 0) {
    console.error('❌ Không tìm thấy file .vtt nào trong outputs/');
    return;
  }

  const vttPath = path.join(OUTPUTS_DIR, vttFiles[0]);
  console.log('📄 File VTT:', vttPath);

  // Clean với method 1 → cleanOne.srt
  const cleanOnePath = path.join(OUTPUTS_DIR, 'cleanOne.srt');
  cleanSrtOne(vttPath, cleanOnePath);

  // Clean với method 2 → cleanTwo.srt
  const cleanTwoPath = path.join(OUTPUTS_DIR, 'cleanTwo.srt');
  cleanSrtTwo(vttPath, cleanTwoPath);

  console.log('\n🎉 Hoàn tất! Files trong outputs/:');
  fs.readdirSync(OUTPUTS_DIR).forEach(f => {
    const size = fs.statSync(path.join(OUTPUTS_DIR, f)).size;
    console.log(`  - ${f} (${(size / 1024).toFixed(1)} KB)`);
  });
};

testTranscript();
