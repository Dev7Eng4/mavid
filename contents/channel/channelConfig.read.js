import fs from 'fs';
import { promises as fsp } from 'fs';
import { resolveChannelConfigPath, resolveChannelConfigPathFromFolderPath, CHANNEL_CONFIG_FILENAME } from './channelConfig.paths.js';

/**
 * @param {string} configPath
 * @returns {Record<string, unknown>}
 */
function parseChannelConfigJsonAtPath(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Không tìm thấy ${CHANNEL_CONFIG_FILENAME} tại «${configPath}».`);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    throw new Error(`File ${CHANNEL_CONFIG_FILENAME} không đọc được (JSON hỏng).`);
  }
  if (!data || typeof data !== 'object') throw new Error('Cấu hình kênh không hợp lệ.');
  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * @param {{ channelFolder: string }} params
 * @returns {Record<string, unknown>}
 */
export function readChannelConfigSync({ channelFolder }) {
  const p = resolveChannelConfigPath({ channelFolder });
  return parseChannelConfigJsonAtPath(p);
}

/**
 * @param {{ channelFolder: string }} params
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readChannelConfig({ channelFolder }) {
  const p = resolveChannelConfigPath({ channelFolder });
  try {
    const raw = await fsp.readFile(p, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') throw new Error('Cấu hình kênh không hợp lệ.');
    return /** @type {Record<string, unknown>} */ (data);
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') {
      throw new Error(`Không tìm thấy ${CHANNEL_CONFIG_FILENAME} trong thư mục kênh «${String(channelFolder).trim()}».`);
    }
    if (e instanceof SyntaxError) {
      throw new Error(`File ${CHANNEL_CONFIG_FILENAME} không đọc được (JSON hỏng).`);
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

/**
 * @param {string} folderPath
 * @returns {Record<string, unknown> | null}
 */
export function readChannelConfigFromFolderSync(folderPath) {
  const p = resolveChannelConfigPathFromFolderPath(folderPath);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return /** @type {Record<string, unknown>} */ (data);
  } catch {
    return null;
  }
}

/**
 * @param {string} folderPath
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function readChannelConfigFromFolder(folderPath) {
  const p = resolveChannelConfigPathFromFolderPath(folderPath);
  try {
    const raw = await fsp.readFile(p, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return /** @type {Record<string, unknown>} */ (data);
  } catch {
    return null;
  }
}

