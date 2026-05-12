/**
 * Đọc thumbnailPrompt từ mavid-channel-config.json (entry đầu trong channels[]).
 */
import { getChannelConfig } from '../api/channels/getChannelConfig';

/**
 * @param {string} channelFolder — MaVidMedia/channels/{folderId}
 * @returns {string} Tên hàm style (khớp export trong `createImage.js` của từng ngôn ngữ), hoặc chuỗi rỗng = tự động (`resolveThumbnailPromptBuilder`)
 */
export async function readThumbnailPromptKeyFromChannelDir(channelFolder, channelId) {
  try {
    const cfg = await getChannelConfig(channelFolder);
    console.log('🚀 ~ readThumbnailPromptKeyFromChannelDir ~ cfg:', cfg);

    const list = Array.isArray(cfg.channels) ? cfg.channels : [];

    const selectedChannel = list.find(c => c.id === channelId);
    console.log('🚀 ~ readThumbnailPromptKeyFromChannelDir ~ selectedChannel:', selectedChannel);

    if (!selectedChannel) return '';

    return selectedChannel.thumbnailPrompt;
  } catch {
    return '';
  }
}
