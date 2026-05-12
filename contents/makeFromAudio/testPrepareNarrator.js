/**
 * Test `prepareNarratorReactionClip` (Excel narrator → chọn URL → tải → crop overlay).
 *
 * Yêu cầu:
 *   - `assets/visual-resource/narrator/<channelId>/<channelId>.xlsx` có video đủ dài:
 *     duration ≥ targetDuration + 10 phút + 120s (bỏ đầu).
 *   - Mạng để tải YouTube; ffmpeg như pipeline chính.
 *
 * Chạy:
 *   node contents/makeFromAudio/testPrepareNarrator.js
 *   node contents/makeFromAudio/testPrepareNarrator.js 180
 *   MAVID_TEST_NARRATOR_DURATION=240 node contents/makeFromAudio/testPrepareNarrator.js
 *
 * Sau khi xử lý thành công, copy clip overlay vào `downloads/` (DOWNLOADS_DIR).
 */

import fs from 'fs';
import path from 'path';
import { prepareNarratorReactionClip } from './prepare/narrator.js';
import { DOWNLOADS_DIR } from './shared.js';

function resolveTargetDurationSec() {
  const arg = process.argv[2];
  if (arg != null && String(arg).trim() !== '') {
    return Number(arg);
  }
  const env = process.env.MAVID_TEST_NARRATOR_DURATION;
  if (env != null && String(env).trim() !== '') {
    return Number(env);
  }
  return 120;
}

async function main() {
  const targetDuration = 3500;

  if (!Number.isFinite(targetDuration) || targetDuration <= 0) {
    console.error('✗ targetDuration phải là số giây > 0 (argv[2] hoặc MAVID_TEST_NARRATOR_DURATION).');
    process.exit(1);
  }

  console.log('=== Test prepareNarratorReactionClip ===');
  console.log(`targetDuration: ${targetDuration}s (~${(targetDuration / 60).toFixed(1)} phút overlay)`);

  const t0 = Date.now();
  const result = await prepareNarratorReactionClip(targetDuration);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log('\n--- kết quả ---');
  console.log(`reactionTempDir:     ${result.reactionTempDir}`);
  console.log(`reactionOverlayPath: ${result.reactionOverlayPath ?? '(null)'}`);
  console.log(`hasReaction:         ${result.hasReaction}`);
  console.log(`elapsed:             ${sec}s`);

  if (result.hasReaction && result.reactionOverlayPath) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destName = `narrator_reaction_overlay_${stamp}.mp4`;
    const destPath = path.join(DOWNLOADS_DIR, destName);
    fs.copyFileSync(result.reactionOverlayPath, destPath);
    console.log(`\n✓ OK — đã copy vào downloads: ${destPath}`);
    process.exit(0);
  }

  console.error('\n✗ Không tạo được reaction clip (thiếu video Excel, lỗi tải, hoặc ffmpeg).');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
