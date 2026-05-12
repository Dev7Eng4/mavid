/**
 * CLI / Electron: cập nhật meta qua prepareVideoInfo (onlyUpdateInfo: SEO/summary + Flow thumbnail khi thiếu).
 * @param {{ channelFolder?: string, items?: { url: string }[] }} params
 */
import path from 'path';
import { getChannelDirPath } from '../api/urls/getListAllPaths.js';
import { readThumbnailPromptKeyFromChannelDir } from '../channel/readChannelThumbnailPrompt.util.js';
import { extractYoutubeVideoId } from '../utils/youtube.js';
import prepareVideoInfo from '../video-info/prepareVideoInfo.js';

export default async function updateChannelVideosMeta(params = { channelFolder: '', channelId: '', items: [] }) {
  const { channelFolder, channelId, items } = params;

  const channelDir = getChannelDirPath(channelFolder);
  const thumbnailPromptKey = await readThumbnailPromptKeyFromChannelDir(channelFolder, channelId);
  console.log('🚀 ~ updateChannelVideosMeta ~ thumbnailPromptKey:', thumbnailPromptKey);

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

    try {
      const r = await prepareVideoInfo({
        url,
        options: {
          onlyUpdateInfo: true,
          outputDir: videoDir,
          thumbnailOptions: {
            prompt: thumbnailPromptKey ?? '',
            // needImage: false,
          },
        },
      });
      const ok = r?.ok !== false;
      results.push({
        ok,
        url,
        videoId,
        reason: ok ? undefined : String(r?.reason ?? 'prepareVideoInfo onlyUpdateInfo thất bại'),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ ok: false, url, videoId, reason: msg });
    }
  }

  return { processed: results.length, results };
}
