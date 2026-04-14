/**
 * Đọc thumbnailPrompt từ mavid-channel-config.json (entry đầu trong channels[]).
 */
import fs from 'fs';
import path from 'path';

const CONFIG_NAME = 'mavid-channel-config.json';

/**
 * @param {string} channelDir — MaVidMedia/channels/{folderId}
 * @returns {string} key trong PROMPTS_CREATE_THUMBNAIL
 */
export function readThumbnailPromptKeyFromChannelDir(channelDir) {
  const p = path.join(channelDir, CONFIG_NAME);
  if (!fs.existsSync(p)) return 'ja2CHFromOldThumbnail';
  try {
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    const list = Array.isArray(cfg.channels) ? cfg.channels : [];
    const first = list[0];
    const key = first && typeof first.thumbnailPrompt === 'string' ? first.thumbnailPrompt.trim() : '';
    return key || 'ja2CHFromOldThumbnail';
  } catch {
    return 'ja2CHFromOldThumbnail';
  }
}
