/**
 * CLI / Electron: cập nhật video-meta.json + thumbnail Flow cho các video đã chọn (theo URL).
 * @param {{ channelFolder?: string, items?: { url: string }[] }} params
 */
import path from 'path';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { extractYoutubeVideoId } from '../channel/youtubeUrl.util.js';
import { readThumbnailPromptKeyFromChannelDir } from '../channel/readChannelThumbnailPrompt.util.js';
import { processOneVideoMetaUpdate } from '../channel/processOneVideoMetaUpdate.js';

export default async function updateChannelVideosMeta(params = { channelFolder: '', items: [] }) {
  const { channelFolder, items } = params;

  const channelsDir = resolveChannelsDir();
  const channelDir = path.join(channelsDir, channelFolder.trim());
  const thumbnailPromptKey = readThumbnailPromptKeyFromChannelDir(channelDir);

  const results = [];
  for (const item of items) {
    const url = String(item.url || '').trim();
    if (!url) {
      results.push({ ok: false, url: '', reason: 'Thiếu URL' });
      continue;
    }
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      results.push({ ok: false, url, reason: 'Không parse được video ID' });
      continue;
    }
    const videoDir = path.join(channelDir, videoId);
    console.log('🚀 ~ updateChannelVideosMeta ~ videoDir:', videoDir);
    const r = await processOneVideoMetaUpdate({ videoDir, url, thumbnailPromptKey });
    results.push({ ok: r.ok, url, videoId, reason: r.reason });
  }

  return { processed: results.length, results };
}
