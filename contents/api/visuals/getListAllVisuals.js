import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getVisualsDirPath } from '../urls/getListAllPaths.js';

/**
 * @typedef {{ link: string, duration: string, used: string }} VisualVideoItem
 * @typedef {{ channelId: string, channelName: string, channelLink: string, videos: VisualVideoItem[] }} VisualChannelPayload
 * @typedef {VisualVideoItem & { channelId: string, channelName: string, channelLink: string }} VisualVideoFlat
 */

/**
 * @param {string} id
 * @returns {boolean}
 */
function isSafeChannelIdBasename(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id) && id.length > 0 && id.length < 512;
}

/**
 * @param {unknown} raw
 * @returns {VisualChannelPayload}
 */
export function parseVisualChannelJson(raw) {
  const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!j || typeof j !== 'object' || Array.isArray(j)) {
    return { channelId: '', channelName: '', channelLink: '', videos: [] };
  }
  const o = /** @type {Record<string, unknown>} */ (j);
  const channelId = String(o.channelId ?? '').trim();
  const channelName = String(o.channelName ?? '').trim();
  const channelLink = String(o.channelLink ?? '').trim();
  const videosRaw = Array.isArray(o.videos) ? o.videos : [];
  const videos = videosRaw
    .filter(v => v && typeof v === 'object' && !Array.isArray(v))
    .map(v => {
      const x = /** @type {Record<string, unknown>} */ (v);
      return {
        link: String(x.link ?? '').trim(),
        duration: String(x.duration ?? '').trim(),
        used: String(x.used ?? '').trim(),
      };
    });
  return { channelId, channelName, channelLink, videos };
}

/**
 * @param {string} visualsDir
 * @returns {Promise<Array<VisualChannelPayload & { filePath: string, fileBasename: string }>>}
 */
async function readAllVisualChannelFiles(visualsDir) {
  if (!fs.existsSync(visualsDir) || !fs.statSync(visualsDir).isDirectory()) {
    return [];
  }

  const entries = await fsp.readdir(visualsDir, { withFileTypes: true });
  const jsonNames = entries.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.json')).map(e => e.name);

  const out = [];
  for (const name of jsonNames) {
    const filePath = path.join(visualsDir, name);
    const fileBasename = path.basename(name, '.json');
    try {
      const raw = await fsp.readFile(filePath, 'utf8');
      const parsed = parseVisualChannelJson(raw);
      if (!parsed.channelId) {
        parsed.channelId = fileBasename;
      }
      out.push({ ...parsed, filePath, fileBasename });
    } catch {
      /* bỏ qua file lỗi / JSON không hợp lệ */
    }
  }
  return out;
}

/**
 * Gộp toàn bộ `videos` từ mọi file `.json` trong thư mục visuals; mỗi phần tử kèm metadata kênh.
 *
 * @returns {Promise<{ dirPath: string, list: VisualVideoFlat[] }>}
 */
export async function getListAllVisuals() {
  const dirPath = getVisualsDirPath();
  const channels = await readAllVisualChannelFiles(dirPath);
  /** @type {VisualVideoFlat[]} */
  const list = [];
  for (const ch of channels) {
    for (const v of ch.videos) {
      list.push({
        channelId: ch.channelId,
        channelName: ch.channelName,
        channelLink: ch.channelLink,
        link: v.link,
        duration: v.duration,
        used: v.used,
      });
    }
  }
  return { dirPath, list };
}

/**
 * Đọc `visuals/{channelId}.json` và trả về danh sách video của kênh đó.
 *
 * @param {string} channelId — chỉ chấp nhận basename an toàn (tránh path traversal).
 * @returns {Promise<{ channelId: string, filePath: string, channelName: string, channelLink: string, list: VisualVideoItem[], error?: string }>}
 */
export async function getVisualsByChannelId(channelId) {
  const id = String(channelId ?? '').trim();
  if (!isSafeChannelIdBasename(id)) {
    return {
      channelId: id,
      filePath: '',
      channelName: '',
      channelLink: '',
      list: [],
      error: 'invalid_channel_id',
    };
  }

  const dirPath = getVisualsDirPath();
  const filePath = path.join(dirPath, `${id}.json`);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { channelId: id, filePath, channelName: '', channelLink: '', list: [] };
  }

  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const { channelId: cidInFile, channelName, channelLink, videos } = parseVisualChannelJson(raw);
    const resolvedChannelId = cidInFile || id;
    return {
      channelId: resolvedChannelId,
      filePath,
      channelName,
      channelLink,
      list: videos,
    };
  } catch {
    return { channelId: id, filePath, channelName: '', channelLink: '', list: [] };
  }
}

export default getListAllVisuals;
