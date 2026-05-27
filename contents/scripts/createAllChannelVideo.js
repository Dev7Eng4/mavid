/**
 * Chạy createBatchVideo cho mọi mapping có EMAIL trong index mapping.
 *
 *   node contents/scripts/createAllChannelVideo.js
 *
 * Import:
 *   import createAllChannelVideo from './createAllChannelVideo.js';
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { getListAllMapping } from '../api/mapping/getListAllMapping.js';
import createBatchVideo from './createBatchVideo.js';

/** @param {unknown} value */
function hasNonEmptyEmail(value) {
  if (value == null) return false;
  return String(value).trim() !== '';
}

/**
 * @param {Record<string, unknown>} row
 */
function mappingRowToBatchProps(row) {
  const channelId = row.channelId != null ? String(row.channelId).trim() : '';
  const mappingId = row.id != null ? String(row.id).trim() : '';
  return { channelId, mappingId };
}

/**
 * Lấy mapping có email, gọi tuần tự createBatchVideo({ channel, mapping, ...extraProps }).
 *
 * @param {Object} [options]
 * @param {Object} [options.batchProps] — Props bổ sung truyền vào mỗi lần gọi createBatchVideo (vd. videoType).
 * @param {boolean} [options.stopOnError=false] — Dừng ngay khi một mapping lỗi.
 * @returns {Promise<{ total: number; processed: number; skipped: number; results: Array<{ channelId: string; mappingId: string; ok: boolean; result?: unknown; error?: string }> }>}
 */
export async function createAllChannelVideo(options = {}) {
  const { batchProps = {}, stopOnError = false } = options;

  const { list = [] } = await getListAllMapping();
  console.log('🚀 ~ createAllChannelVideo ~ list:', list);

  const withEmail = list.filter(row => hasNonEmptyEmail(row.email));
  console.log('🚀 ~ createAllChannelVideo ~ withEmail:', withEmail);

  /** @type {Array<{ channelId: string; mappingId: string; ok: boolean; result?: unknown; error?: string }>} */
  const results = [];
  let skipped = 0;

  console.log(`[createAllChannelVideo] Tổng mapping: ${list.length}, có email: ${withEmail.length}`);

  for (const row of withEmail) {
    const { channelId, mappingId } = mappingRowToBatchProps(row);

    if (!channelId || !mappingId) {
      skipped += 1;
      console.warn(`[createAllChannelVideo] Bỏ qua mapping thiếu channelId/id (id=${row.id ?? ''}, channelId=${row.channelId ?? ''}).`);
      continue;
    }

    const props = {
      ...batchProps,
      channel: channelId,
      mapping: mappingId,
    };

    console.log(`\n[createAllChannelVideo] Batch — channel="${channelId}", mapping="${mappingId}"`);

    try {
      const result = await createBatchVideo(props);
      results.push({ channelId, mappingId, ok: true, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[createAllChannelVideo] Lỗi channel="${channelId}", mapping="${mappingId}":`, message);
      results.push({ channelId, mappingId, ok: false, error: message });
      if (stopOnError) {
        throw err;
      }
    }
  }

  const processed = results.length;
  const okCount = results.filter(r => r.ok).length;

  console.log(`\n[createAllChannelVideo] Xong: ${okCount}/${processed} thành công, bỏ qua ${skipped}, tổng có email ${withEmail.length}.`);

  return {
    total: list.length,
    processed,
    skipped,
    results,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  createAllChannelVideo().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export default createAllChannelVideo;
