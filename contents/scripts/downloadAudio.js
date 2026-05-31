import fs from 'fs';
import path from 'path';
import { downloadAudio, getVideoInfo } from '../video-info/downloadVideo.js';
import { PATHS } from '../constants/paths.js';

const INPUT_FILE = path.join(PATHS.ROOT, 'input.txt');

function readUrlsFromInput() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('Không tìm thấy file input.txt');
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT_FILE, 'utf-8').trim();
  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && (l.startsWith('http://') || l.startsWith('https://')));

  if (lines.length === 0) {
    console.error('File input.txt không có link hợp lệ.');
    process.exit(1);
  }

  return lines;
}

const main = async () => {
  const urls = readUrlsFromInput();
  const outputDir = PATHS.DOWNLOADS;
  const audioFormat = process.env.AUDIO_FORMAT || 'mp3';

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const url of urls) {
    console.log(`Đang tải audio: ${url}`);

    let videoTitle = '';
    try {
      const info = await getVideoInfo(url);
      videoTitle = info?.title || '';
    } catch (err) {
      console.warn(`Không lấy được title (${url}):`, err.message);
    }

    try {
      await downloadAudio(url, { outputDir, audioFormat });
      console.log(`Đã tải audio: ${videoTitle || url}`);
    } catch (err) {
      console.error(`Lỗi tải audio ${url}:`, err.message);
    }
  }
};

main();
