import { getVisualsDirPath } from '../urls/getListAllPaths.js';
import { readAllVisualChannelFiles } from './getListAllVisuals.js';

/**
 * @typedef {{ channelId: string, channelLink: string, channelName: string }} ChannelVisualRow
 */

/**
 * Đọc mọi file kênh trong thư mục visuals (`.json`), trả về mảng `channelId`, `channelLink`, `channelName`.
 *
 * @returns {Promise<ChannelVisualRow[]>}
 */
export async function getListChannelVisuals() {
  const dirPath = getVisualsDirPath();
  const channels = await readAllVisualChannelFiles(dirPath);
  return channels.map(({ channelId, channelLink, channelName }) => ({
    channelId,
    channelLink,
    channelName,
  }));
}
