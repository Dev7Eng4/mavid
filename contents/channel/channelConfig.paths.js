import path from 'path';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { CHANNEL_CONFIG_FILE } from '../constants/channel.js';
import { assertSafeChannelFolder } from '../youtube/channelFolder.util.js';

export const CHANNEL_CONFIG_FILENAME = CHANNEL_CONFIG_FILE;

/**
 * @param {{ channelFolder: string }} params
 */
export function resolveChannelConfigPath({ channelFolder }) {
  const safe = assertSafeChannelFolder(channelFolder);
  return path.join(resolveChannelsDir(), safe, CHANNEL_CONFIG_FILENAME);
}

/**
 * @param {string} folderPath
 */
export function resolveChannelConfigPathFromFolderPath(folderPath) {
  const p = String(folderPath ?? '').trim();
  if (!p) throw new Error('Thiếu folderPath.');
  return path.join(p, CHANNEL_CONFIG_FILENAME);
}

