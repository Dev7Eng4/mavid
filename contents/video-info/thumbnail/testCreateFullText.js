/**
 * Test `renderThumbnailFullTextToPath` (Playwright + thumbnailFullText.html).
 *
 * Chạy từ root repo:
 *   node contents/video-info/thumbnail/testCreateFullText.js
 *
 * Yêu cầu: Playwright browsers đã cài (`npx playwright install chromium` nếu cần).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { renderThumbnailFullTextToPath } from './jaFullText/thumbnail.cli.js';

/** Payload tối thiểu giống cấu trúc mergeThumbnailPayload trong HTML. */
const SAMPLE_LINES = {
  L1: '平凡な父が十年間守った家庭',
  L2: '結婚記念日に全員を呼び出す',
  L3: '旅館写真と十年分の証拠リスト',
  L4: '「友達なら同じ部屋に泊まる?」',
  L5: '十年不倫の代償が来た',
};

const SAMPLE_COLORS = {
  L1: {
    fill: '',
    stroke: '',
    stroke_width_role: 'normal',
    shadow: '#000000',
  },
  L2: {
    fill: '#FFFFFF',
    stroke: '#000000',
    stroke_width_role: 'normal',
    shadow: '#000000',
  },
  L3: {
    fill: '',
    stroke: '',
    stroke_width_role: 'shock',
    shadow: '#000000',
  },
  L4: {
    fill: '#FFFFFF',
    stroke: '#000000',
    stroke_width_role: 'normal',
    shadow: '#000000',
  },
  L5: {
    fill: '',
    stroke: '',
    stroke_width_role: 'punch',
    shadow: '#000000',
  },
};

const SAMPLE_BACKGROUND = {
  base_from: '#16223d',
  base_to: '#050a14',
  accent_color: '#FF66B2',
};

async function main() {
  const dir = path.join(os.homedir(), 'Downloads');
  fs.mkdirSync(dir, { recursive: true });
  const outPng = path.join(dir, 'thumb-test.png');
  const outJpeg = path.join(dir, 'thumb-test.jpg');

  console.log('=== Test renderThumbnailFullTextToPath ===');

  const t0 = Date.now();

  await renderThumbnailFullTextToPath({
    thumbnail_copy: SAMPLE_LINES,
    text_styles: SAMPLE_COLORS,
    background: SAMPLE_BACKGROUND,
    outPath: outPng,
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  for (const file of [outPng, outJpeg]) {
    if (!fs.existsSync(file)) {
      console.error(`✗ Thiếu file: ${file}`);
      process.exit(1);
    }
    const st = fs.statSync(file);
    if (st.size < 2048) {
      console.error(`✗ File quá nhỏ (có thể render lỗi): ${file} (${st.size} bytes)`);
      process.exit(1);
    }
  }

  console.log(`\n✓ PNG:  ${outPng} (${fs.statSync(outPng).size} bytes)`);
  console.log(`✓ JPEG: ${outJpeg} (${fs.statSync(outJpeg).size} bytes)`);
  console.log(`elapsed: ${elapsed}s`);
  console.log('\n(đã lưu vào thư mục Downloads)');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
