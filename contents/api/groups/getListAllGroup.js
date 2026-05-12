/**
 * Đọc danh sách nhóm từ `MaVidMedia/channels/group.json`.
 *
 * Cấu trúc file: `{ version?: number, items: { id: string, name: string }[] }`.
 * Mặc định resolve qua `resolveChannelsDir` (VIDEO_STORAGE_ROOT/channels).
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { resolveChannelsDir } from '../../utils/channelsStoragePath.js';
import { getListGroupsPath } from '../urls/getListAllPaths.js';

/**
 * @param {string} raw
 * @returns {{ items: { id: string, name: string }[] }}
 */
export function parseMavidGroupsJson(raw) {
  const j = JSON.parse(raw);
  const items = Array.isArray(j.items) ? j.items : [];
  return {
    items: items
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        id: String(x.id ?? '').trim(),
        name: String(x.name ?? '').trim(),
      }))
      .filter(x => x.id),
  };
}

/**
 * @param {Object} [options]
 * @param {string} [options.filePath] — Đường dẫn tuỳ chọn; mặc định `channels/group.json` dưới VIDEO_STORAGE_ROOT.
 * @returns {Promise<{ filePath: string, items: { id: string, name: string }[] }>}
 */
export async function getListAllGroup() {
  const absPath = getListGroupsPath();

  try {
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return { filePath: absPath, items: [] };
    }
    const raw = await fsp.readFile(absPath, 'utf8');
    const { items } = parseMavidGroupsJson(raw);
    return { list: items };
  } catch {
    return { list: [] };
  }
}

export default getListAllGroup;
