export function parseSRT(srtText) {
  const blocks = srtText.replace(/\r/g, '').split('\n\n').filter(Boolean);

  const result = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);

    if (lines.length < 2) continue;

    // detect timeline line (usually line 1 or 2)
    let timeLine = '';
    let textLines = [];

    if (lines[0].includes('-->')) {
      timeLine = lines[0];
      textLines = lines.slice(1);
    } else if (lines[1] && lines[1].includes('-->')) {
      timeLine = lines[1];
      textLines = lines.slice(2);
    } else {
      continue;
    }

    const [startRaw, endRaw] = timeLine.split('-->').map(s => s.trim());

    const start = timeToSeconds(startRaw);
    const end = timeToSeconds(endRaw);

    const text = textLines.join(' ').replace(/\s+/g, ' ').trim();

    if (!text) continue;

    result.push({
      start,
      end,
      text,
    });
  }

  return result;
}

function timeToSeconds(timeStr) {
  // format: 00:00:05,359
  const [hms, ms] = timeStr.split(',');
  const [h, m, s] = hms.split(':').map(Number);

  return h * 3600 + m * 60 + s + (ms ? parseInt(ms, 10) / 1000 : 0);
}

export function mergeShortLines(data, minDuration = 2) {
  const merged = [];

  let buffer = null;

  for (const item of data) {
    if (!buffer) {
      buffer = { ...item };
      continue;
    }

    const duration = buffer.end - buffer.start;

    if (duration < minDuration) {
      buffer.end = item.end;
      buffer.text += ' ' + item.text;
    } else {
      merged.push(buffer);
      buffer = { ...item };
    }
  }

  if (buffer) merged.push(buffer);

  return merged;
}

export function cleanText(text) {
  return text
    .replace(/\[.*?\]/g, '') // remove [noise]
    .replace(/\(.*?\)/g, '') // remove (noise)
    .replace(/\s+/g, ' ')
    .trim();
}
export function chunkSubtitlesSmart(data, options = {}) {
  const { maxChars = 1200, minChars = 400 } = options;

  const chunks = [];
  let currentChunk = null;
  let chunkId = 1;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    if (!currentChunk) {
      currentChunk = {
        chunk_id: chunkId,
        start: item.start,
        end: item.end,
        text: item.text,
      };
      continue;
    }

    const nextText = currentChunk.text + ' ' + item.text;

    if (nextText.length > maxChars) {
      // nếu chunk quá nhỏ → cố gắng merge thêm
      if (currentChunk.text.length < minChars && i < data.length - 1) {
        currentChunk.text = nextText;
        currentChunk.end = item.end;
        continue;
      }

      chunks.push(currentChunk);

      chunkId++;
      currentChunk = {
        chunk_id: chunkId,
        start: item.start,
        end: item.end,
        text: item.text,
      };
    } else {
      currentChunk.text = nextText;
      currentChunk.end = item.end;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/** @returns {number} Giá trị trong [SPEED_MIN, SPEED_MAX) */
export function randomPlaybackSpeed() {
  return SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
}
