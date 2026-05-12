/**
 * Smoke / integration test cho `prepareStockVisualClip` (stockVisual.js).
 *
 * Chạy từ root repo:
 *   node contents/makeFromAudio/testMake.js [targetDurationGiây]
 *
 * Mặc định targetDuration = 180 (3 phút đầu ra sau slowdown — ffmpeg vẫn chạy đủ pipeline).
 *
 * Yêu cầu môi trường: visuals JSON có video đủ dài, yt-dlp, ffmpeg trong PATH.
 */

import { prepareStockVisualClip } from './prepare/stockVisual.js';

function parseTargetSeconds() {
  const raw = process.argv[2];
  if (raw == null || raw === '') return 180;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error('Tham số không hợp lệ: cần một số giây dương (ví dụ: node contents/makeFromAudio/testMake.js 120)');
    process.exit(1);
  }
  return n;
}

async function main() {
  const targetDuration = parseTargetSeconds();
  console.log('[testMake] Gọi prepareStockVisualClip(%s giây)...', targetDuration);

  const t0 = Date.now();
  const result = await prepareStockVisualClip(targetDuration);
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log('[testMake] Hoàn thành sau %s s', elapsedSec);
  console.log('[testMake] Kết quả:', JSON.stringify(result, null, 2));

  if (!result.hasStock) {
    console.warn('[testMake] hasStock=false — kiểm tra visuals JSON, yt-dlp, ffmpeg và log phía trên.');
    process.exitCode = 2;
    return;
  }

  console.log('[testMake] OK — clip:', result.stockClipPath);
}

main().catch((err) => {
  console.error('[testMake] Lỗi:', err);
  process.exit(1);
});
