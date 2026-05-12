/**
 * Test `prepareStockVisualClip` (stock từ Excel assets → tải → crop/slowmo).
 *
 * Yêu cầu:
 *   - `assets/visual-resource/stock/<channelId>/<channelId>.xlsx` có ít nhất một dòng
 *     thỏa: (duration − skip đầu/cuối) × slowdown ≥ `targetDuration`.
 *   - Mạng để tải link YouTube; ffmpeg/GPU như pipeline chính.
 *
 * Chạy:
 *   node contents/makeFromAudio/testPrepareStock.js
 *   node contents/makeFromAudio/testPrepareStock.js 180
 *   MAVID_TEST_STOCK_DURATION=240 node contents/makeFromAudio/testPrepareStock.js
 *
 * Đối số / env là **độ dài target** tính bằng giây (sau slowdown), giống `prepareStockVisualClip(targetDuration)`.
 */

import { prepareStockVisualClip } from './prepare/stockVisual.js';

function resolveTargetDurationSec() {
  const arg = process.argv[2];
  if (arg != null && String(arg).trim() !== '') {
    return Number(arg);
  }
  const env = process.env.MAVID_TEST_STOCK_DURATION;
  if (env != null && String(env).trim() !== '') {
    return Number(env);
  }
  return 300;
}

async function main() {
  const targetDuration = 3500;

  if (!Number.isFinite(targetDuration) || targetDuration <= 0) {
    console.error('✗ targetDuration phải là số giây > 0 (argv[2] hoặc MAVID_TEST_STOCK_DURATION).');
    process.exit(1);
  }

  console.log('=== Test prepareStockVisualClip ===');
  console.log(`targetDuration: ${targetDuration}s (~${(targetDuration / 60).toFixed(1)} phút sau slowdown)`);

  const t0 = Date.now();
  const result = await prepareStockVisualClip(targetDuration);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log('\n--- kết quả ---');
  console.log(`stockTempDir:  ${result.stockTempDir}`);
  console.log(`stockClipPath: ${result.stockClipPath ?? '(null)'}`);
  console.log(`hasStock:      ${result.hasStock}`);
  console.log(`elapsed:       ${sec}s`);

  if (result.hasStock && result.stockClipPath) {
    console.log(`\n✓ OK — clip: ${result.stockClipPath}`);
    process.exit(0);
  }

  console.error('\n✗ Không tạo được stock clip (thiếu dòng Excel phù hợp, lỗi tải, hoặc ffmpeg).');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
