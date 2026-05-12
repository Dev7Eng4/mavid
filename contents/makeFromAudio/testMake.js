/**
 * Test chế độ IN (Image Noise) — không qua Gemini/Flow.
 *
 * Yêu cầu trong `downloads/`:
 *   - 1 file audio  (mp3/m4a/wav/aac)
 *   - 1 file ảnh    (png/jpg/jpeg/webp) — ưu tiên `background.*`, nếu không có thì lấy file ảnh đầu tiên
 *   - (tuỳ chọn)   1 file phụ đề (.srt/.vtt) để burn‑in
 *
 * Pipeline: copy ảnh → file tạm → gọi `makeVideoWithImageNoise` (cùng hàm production dùng cho mode 'IN')
 * → output `outputs/<title>-with-bg.mp4` + bản copy `outputs/test_in_<ts>/`.
 *
 * Chạy:
 *   node contents/makeFromAudio/testMake.js
 *   node contents/makeFromAudio/testMake.js path/to/downloads
 *   MAVID_TEST_TITLE="custom_name" node contents/makeFromAudio/testMake.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { makeVideoWithImageNoise } from './optionVideo/makeVideoWithImageNoise.js';
import {
  DOWNLOADS_DIR,
  OUTPUT_DIR,
  getAudioFile,
  getImageFilesFromDir,
  getSubtitleFile,
} from './shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

/**
 * Chọn ảnh nền: ưu tiên file tên `background.*`, fallback ảnh đầu tiên trong thư mục.
 */
function pickBackgroundImage(dir) {
  const images = getImageFilesFromDir(dir);
  if (images.length === 0) return null;
  const bg = images.find(p => /^background\.(png|jpe?g|webp|gif)$/i.test(path.basename(p)));
  return bg || images[0];
}

async function main() {
  const argDir = process.argv[2];
  const downloadsDir = path.resolve(argDir || DOWNLOADS_DIR);

  console.log('=== Test Make Video — Mode IN (Image Noise) ===');
  console.log(`downloads: ${downloadsDir}`);

  if (!fs.existsSync(downloadsDir)) {
    console.error(`✗ Thư mục downloads không tồn tại: ${downloadsDir}`);
    process.exit(1);
  }

  let audioPath;
  try {
    audioPath = getAudioFile(downloadsDir);
  } catch (e) {
    console.error(`✗ Không tìm thấy audio: ${e.message}`);
    process.exit(1);
  }

  const sourceImage = pickBackgroundImage(downloadsDir);
  if (!sourceImage) {
    console.error('✗ Không tìm thấy ảnh (.png/.jpg/.jpeg/.webp) trong downloads.');
    process.exit(1);
  }

  const subtitlePath = getSubtitleFile(downloadsDir);

  console.log(`✓ audio:    ${path.relative(ROOT, audioPath)}`);
  console.log(`✓ image:    ${path.relative(ROOT, sourceImage)}`);
  console.log(`✓ subtitle: ${subtitlePath ? path.relative(ROOT, subtitlePath) : '(none)'}`);

  // makeVideoWithImageNoise sẽ XOÁ bgImgPath khi xong → copy ảnh nguồn ra file tạm để giữ ảnh gốc.
  const tempBgPath = path.join(downloadsDir, `_test_bg${path.extname(sourceImage)}`);
  fs.copyFileSync(sourceImage, tempBgPath);
  console.log(`→ copy ảnh test: ${path.basename(tempBgPath)}`);

  const ts = Date.now();
  const baseTitle =
    process.env.MAVID_TEST_TITLE ||
    `test_in_${path.basename(audioPath, path.extname(audioPath)).slice(0, 40)}_${ts}`;
  const perVideoDir = path.join(ROOT, 'outputs', `test_in_${ts}`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const t0 = Date.now();
  try {
    await makeVideoWithImageNoise(
      {
        downloadsDir,
        perVideoDir,
        originalTitle: baseTitle,
        description: '',
        tags: '',
        url: undefined,
        geminiByUrl: undefined,
        videoLanguage: process.env.MAVID_VIDEO_LANG || undefined,
        audioSpeed: process.env.MAVID_AUDIO_SPEED ? Number(process.env.MAVID_AUDIO_SPEED) : undefined,
        logoPath: process.env.MAVID_LOGO_PATH || null,
      },
      tempBgPath,
    );

    const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('\n=== KẾT QUẢ ===');
    console.log(`✓ Render xong sau ${elapsedSec}s`);
    console.log(`✓ Output:     ${path.join(OUTPUT_DIR, `${baseTitle}-with-bg.mp4`)}`);
    console.log(`✓ perVideoDir: ${perVideoDir}`);
  } catch (e) {
    console.error(`\n✗ Lỗi render IN: ${e.message}`);
    if (fs.existsSync(tempBgPath)) {
      try { fs.unlinkSync(tempBgPath); } catch {}
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled Error:', err.message || err);
  process.exit(1);
});
