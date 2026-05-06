/**
 * Test script cho Option 2: processVideoWithImage.
 *
 * Chạy:
 *   node contents/makeFromAudio/test.js
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processVideoWithImage } from './imageOption.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

async function main() {
  console.log('=== Test Option 2: processVideoWithImage ===\n');
  console.log(`Downloads dir: ${DOWNLOADS_DIR}`);

  if (!fs.existsSync(DOWNLOADS_DIR)) {
    console.error('Không tìm thấy thư mục downloads/');
    process.exit(1);
  }

  const srtFiles = fs.readdirSync(DOWNLOADS_DIR).filter(f => /\.srt$/i.test(f));
  console.log(`Tìm thấy ${srtFiles.length} file SRT: ${srtFiles.join(', ') || '(không có)'}\n`);

  const result = await processVideoWithImage({
    downloadsDir: DOWNLOADS_DIR,
    videoLanguage: 'ja',
  });

  console.log('\n=== KẾT QUẢ ===');
  console.log(`Tổng objects: ${result.allObjects.length}`);
  console.log(`Tổng chapters: ${result.allChapters.length}`);
  console.log(`Tổng image prompts: ${result.chapterImagePrompts.length}`);
  console.log(`Visual Bible keys: ${Object.keys(result.visualBible).join(', ')}`);

  // Lưu kết quả ra file JSON để review (không lưu allObjects)
  const outputPath = path.join(DOWNLOADS_DIR, 'imageOption_result.json');
  const { allObjects, ...saveData } = result;
  fs.writeFileSync(outputPath, JSON.stringify(saveData, null, 2), 'utf-8');
  console.log(`\nĐã lưu kết quả: ${outputPath}`);
}

main().catch(err => {
  console.error('Lỗi:', err.message || err);
  process.exit(1);
});
