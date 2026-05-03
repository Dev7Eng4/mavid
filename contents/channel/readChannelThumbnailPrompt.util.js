/**
 * Đọc thumbnailPrompt từ mavid-channel-config.json (entry đầu trong channels[]).
 */
import fs from 'fs';
import path from 'path';

const CONFIG_NAME = 'mavid-channel-config.json';

/**
 * @param {string} channelDir — MaVidMedia/channels/{folderId}
 * @returns {string} Tên hàm style (khớp export trong `createImage.js` của từng ngôn ngữ), hoặc chuỗi rỗng = tự động (`resolveThumbnailPromptBuilder`)
 */
export function readThumbnailPromptKeyFromChannelDir(channelDir, channelId) {
  const p = path.join(channelDir, CONFIG_NAME);

  if (!fs.existsSync(p)) return '';

  try {
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    const list = Array.isArray(cfg.channels) ? cfg.channels : [];

    const selectedChannel = list.find(c => c.id === channelId);

    if (!selectedChannel) return '';

    return selectedChannel.thumbnailPrompt;
  } catch {
    return '';
  }
}
