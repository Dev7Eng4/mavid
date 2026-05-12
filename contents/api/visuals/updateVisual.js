import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getVisualsDirPath } from '../urls/getListAllPaths.js';
import { parseVisualChannelJson } from './getListAllVisuals.js';

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function visualLinksMatch(a, b) {
  const na = String(a ?? '')
    .trim()
    .toLowerCase();
  const nb = String(b ?? '')
    .trim()
    .toLowerCase();
  if (na === nb) return true;
  return false;
}

/**
 * `used` là chuỗi số đếm; rỗng / không phải số → 0, sau đó +1 và ghi lại file.
 *
 * @param {string} channelId
 * @param {string} videoLink
 * @returns {Promise<{ ok: boolean, channelId: string, filePath?: string, used?: string, error?: string }>}
 */
export async function updateVisual(channelId, videoLink) {
  const id = String(channelId ?? '').trim();
  const link = String(videoLink ?? '').trim();

  if (!id) {
    return { ok: false, error: 'Empty channel ID' };
  }
  if (!link) {
    return { ok: false, error: 'Empty video link' };
  }

  const dir = getVisualsDirPath();
  const filePath = path.join(dir, `${id}.json`);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { ok: false, error: 'File not found' };
  }

  let raw;
  try {
    raw = await fsp.readFile(filePath, 'utf8');
  } catch {
    return { ok: false, error: 'Read failed' };
  }

  let payload;
  try {
    payload = parseVisualChannelJson(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }

  const idx = payload.videos.findIndex(v => visualLinksMatch(v.link, link));
  if (idx < 0) {
    return { ok: false, error: 'Video not found' };
  }

  const prev = String(payload.videos[idx].used ?? '').trim();
  const n = Number.parseInt(prev, 10);
  const next = Number.isFinite(n) ? n + 1 : 1;
  const usedStr = String(next);

  const out = {
    channelId: payload.channelId || id,
    channelName: payload.channelName,
    channelLink: payload.channelLink,
    videos: payload.videos.map((v, i) => (i === idx ? { ...v, used: usedStr } : v)),
  };

  try {
    await fsp.writeFile(filePath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  } catch {
    return { ok: false, error: 'Write failed' };
  }

  return { ok: true };
}

export default updateVisual;
