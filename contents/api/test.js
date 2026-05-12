import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { getListAllVideo } from './channels/getListAllVideo.js';

/**
 * Kiểm thử `getListAllVideo`: validation; tùy chọn đọc Excel thật khi truyền channelId (argv hoặc env).
 * Chạy: `node contents/api/test.js`
 * Chạy tích hợp: `node contents/api/test.js "<channelId>"`
 * Hoặc: `MAVID_TEST_CHANNEL_ID="UC..." node contents/api/test.js`
 */
export async function test() {
  await assert.rejects(() => getListAllVideo({ channelId: 'UCKDzTZBl4W3Z9Dj9oEo9k8Q' }), /Thiếu channelFolder/);

  const missing = await getListAllVideo({ channelId: 'UCzzzzzzzzzzzzzzzzzzzzzzzz' });
  assert.equal(missing.filePath, null);
  assert.deepEqual(missing.list, []);

  console.log('[getListAllVideo] OK — reject rỗng / path không hợp lệ; kênh không có Excel → list rỗng');

  const channelId = String(process.argv[2] ?? process.env.MAVID_TEST_CHANNEL_ID ?? '').trim();
  if (!channelId) {
    console.log('  (Bỏ qua tích hợp: `node contents/api/test.js "<UC...>"` hoặc MAVID_TEST_CHANNEL_ID)');
    return;
  }

  const r = await getListAllVideo({ channelId });
  assert.equal(r.channelId, channelId);

  if (r.list.length === 0) {
    console.log(
      '[getListAllVideo] tích hợp:',
      channelId,
      r.filePath ? `— có file nhưng không có dòng LINK: ${r.filePath}` : '— không có .xlsx trong thư mục kênh'
    );
    return;
  }

  assert.ok(r.filePath && fs.existsSync(r.filePath), `filePath hợp lệ: ${r.filePath}`);
  for (const row of r.list) {
    assert.ok(typeof row.link === 'string' && row.link.length > 0, 'mỗi dòng phải có link');
    assert.ok('views' in row && 'duration' in row && 'status' in row);
  }

  console.log('[getListAllVideo] tích hợp:', r.filePath, '—', r.list.length, 'video(s), ví dụ link đầu:', r.list[0].link);
}

const entry = process.argv[1];
const isMain =
  Boolean(entry) &&
  (() => {
    try {
      return import.meta.url === pathToFileURL(entry).href;
    } catch {
      return false;
    }
  })();

if (isMain) {
  test().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
