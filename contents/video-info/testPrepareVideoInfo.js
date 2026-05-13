/**
 * Test pipeline `prepareVideoInfo`: tải transcript / media theo URL → LLM tạo video info → ghi `video-meta.json` / thumbnail (tùy cấu hình).
 *
 * Yêu cầu:
 * - URL video hợp lệ (YouTube hoặc theo `downloadVideo` / `getVideoInfo`).
 * - Chrome profile đã đăng nhập dịch vụ chat (giống các script LLM khác).
 *
 * Chạy:
 *   node contents/video-info/testPrepareVideoInfo.js "https://www.youtube.com/watch?v=..."
 *
 * Tuỳ chọn thư mục output (mặc định `downloads/` ở root repo):
 *   node contents/video-info/testPrepareVideoInfo.js "URL" "D:/path/to/output"
 *
 * Hoặc URL qua biến môi trường `TEST_PREPARE_VIDEO_URL` (khi chạy không truyền argv URL).
 */
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../constants/paths.js';
import prepareVideoInfo from './prepareVideoInfo.js';
import { MAKE_VIDEO_MODE } from '../constants/index.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * @param {object} [args]
 * @param {string} [args.url]
 * @param {object} [args.prepareOptions] — tham số `options` của `prepareVideoInfo` (outputDir, mode, visualStyle, …)
 * @returns {Promise<Awaited<ReturnType<typeof prepareVideoInfo>>>}
 */
export async function testPrepareVideoInfo({ url, prepareOptions = {} } = {}) {
  const resolvedUrl = 'https://www.youtube.com/watch?v=oLsEBs0eo9o';
  //  url ?? process.env.TEST_PREPARE_VIDEO_URL;
  if (!resolvedUrl || String(resolvedUrl).trim() === '') {
    throw new Error('testPrepareVideoInfo: thiếu URL — truyền argv[2], hoặc { url }, hoặc biến môi trường TEST_PREPARE_VIDEO_URL.');
  }

  const outputDir = prepareOptions.outputDir ?? PATHS.DOWNLOADS;
  console.log(`[testPrepareVideoInfo] url: ${resolvedUrl}`);
  console.log(`[testPrepareVideoInfo] outputDir: ${outputDir} (thư mục sẽ được làm sạch trước khi tải)`);

  return prepareVideoInfo({
    url: String(resolvedUrl).trim(),
    options: {
      ...prepareOptions,
      generateGeneralImage: true,
      generateSceneImages: false,
      onlyUpdateInfo: false,
      mode: MAKE_VIDEO_MODE.FROM_AUDIO,
    },
  });
}

async function main() {
  const urlArg = process.argv[2];
  const outputArg = process.argv[3];

  try {
    const prepareOpts = {};
    if (outputArg != null && String(outputArg).trim() !== '') {
      prepareOpts.outputDir = path.resolve(String(outputArg).trim());
    }

    const result = await testPrepareVideoInfo({
      url: urlArg != null && String(urlArg).trim() !== '' ? String(urlArg).trim() : undefined,
      prepareOptions: prepareOpts,
    });
    console.log('\n--- Kết quả (rút gọn trên console; `video-meta.json` và file tải về trong outputDir) ---\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] != null && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  main();
}
