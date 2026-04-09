import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseSRT, mergeShortLines, cleanText, chunkSubtitlesSmart } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

/**
 * Chọn file .srt trong downloads/: một file thì dùng luôn; nhiều file → mới nhất theo mtime.
 */
function resolveSrtPathInDownloads(outputDir) {
  if (!fs.existsSync(outputDir)) {
    throw new Error(`Không tìm thấy thư mục downloads/: ${outputDir}`);
  }
  const srts = fs.readdirSync(outputDir).filter(f => /\.srt$/i.test(f));
  if (!srts.length) {
    throw new Error('Không tìm thấy file .srt trong downloads/');
  }
  if (srts.length === 1) return path.join(outputDir, srts[0]);
  const withMtime = srts.map(name => ({
    name,
    mtime: fs.statSync(path.join(outputDir, name)).mtimeMs,
  }));
  withMtime.sort((a, b) => b.mtime - a.mtime);
  return path.join(outputDir, withMtime[0].name);
}

export async function main() {
  const srtPath = resolveSrtPathInDownloads(DOWNLOADS_DIR);
  const srtText = await fsPromises.readFile(srtPath, 'utf-8');

  const raw = parseSRT(srtText);
  const merged = mergeShortLines(raw);

  const final = merged.map(item => ({
    ...item,
    text: cleanText(item.text),
  }));

  const chunks = chunkSubtitlesSmart(final);
  console.log('🚀 ~ main ~ chunks:', chunks);

  return final;
}

main();
