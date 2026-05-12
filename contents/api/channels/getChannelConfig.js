import fsp from 'fs/promises';
import { getChannelConfigPath } from '../urls/getListAllPaths.js';

/**
 * Đọc `mavid-channel-config.json` trong thư mục kênh (`VIDEO_STORAGE_ROOT/channels/{channelId}/`).
 *
 * @param {string} channelId — tên thư mục kênh (id); không cho `..` / `/` / `\`
 * @returns {Promise<Record<string, unknown>>}
 * @throws {Error} tên folder không hợp lệ, không có file, hoặc JSON không hợp lệ
 */
export async function getChannelConfig(channelId) {
  const p = getChannelConfigPath(channelId);

  try {
    const raw = await fsp.readFile(p, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('Channel config is not valid.');

    return /** @type {Record<string, unknown>} */ (data);
  } catch (e) {
    throw new Error(`Failed to read channel config: ${e.message}`);
  }
}
