import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { getVisualsDirPath } from '../urls/getListAllPaths.js';
import { getVideoInfo } from '../../video-info/downloadVideo.js';

/**
 * UC… → uploads playlist UU…
 * @param {string} channelId
 * @returns {string|null}
 */
function channelToUploadsPlaylistId(channelId) {
  if (!channelId || !channelId.startsWith('UC')) return null;
  return `UU${channelId.slice(2)}`;
}

/**
 * Giây → HH:mm:ss
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return '';
  const s = Math.max(0, Math.floor(Number(seconds)));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [hrs, mins, secs].map(v => (v < 10 ? `0${v}` : String(v))).join(':');
}

/**
 * @param {string} input
 * @returns {string} UC… hoặc rỗng
 */
function tryExtractUcChannelIdFromUrl(input) {
  const u = String(input ?? '').trim();
  const fromPath = u.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (fromPath?.[1]) return fromPath[1];
  const fromList = u.match(/[?&]list=(UU[a-zA-Z0-9_-]+)/i);
  if (fromList?.[1] && fromList[1].toUpperCase().startsWith('UU')) {
    const id = fromList[1];
    return `UC${id.slice(2)}`;
  }
  return '';
}

/**
 * @param {string} id
 * @returns {boolean}
 */
function isSafeChannelIdBasename(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id) && id.length > 0 && id.length < 512;
}

/**
 * @param {unknown[]} entries
 * @returns {Array<{ link: string, duration: string, used: string }>}
 */
function entriesToVisualVideos(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(e => e && typeof e === 'object' && !Array.isArray(e))
    .filter(e => {
      const id = /** @type {{ id?: string }} */ (e).id;
      return typeof id === 'string' && id.length > 0;
    })
    .map(e => {
      const x = /** @type {{ id: string, url?: string, duration?: number }} */ (e);
      return {
        link: x.url || `https://www.youtube.com/watch?v=${x.id}`,
        duration: x.duration,
        used: '',
      };
    });
}

const ytdlCommon = {
  dumpSingleJson: true,
  flatPlaylist: true,
  noCheckCertificates: true,
  noWarnings: true,
  addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
};

/**
 * Lấy metadata + danh sách video (link, duration) — tương tự getChannelInfo nhưng không lọc MIN_DURATION_VIDEO.
 *
 * @param {string} url
 * @returns {Promise<{ channelId: string, channelName: string, channelLink: string, videos: Array<{ link: string, duration: string, used: string }> }>}
 */
async function fetchYoutubeVisualPayload(url) {
  const rawMeta = await youtubedl(url, ytdlCommon);

  const channelId = rawMeta?.channel_id;
  let entries = [];

  if (channelId) {
    const playlistId = channelToUploadsPlaylistId(channelId);
    if (playlistId) {
      const plUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      try {
        const rawPlaylist = await youtubedl(plUrl, ytdlCommon);
        entries = Array.isArray(rawPlaylist.entries) ? rawPlaylist.entries : [];
      } catch (err) {
        console.warn('[addVisual] Không lấy được uploads playlist:', /** @type {Error} */ (err).message);
      }
    }
  }

  if (entries.length === 0 && Array.isArray(rawMeta.entries)) {
    entries = rawMeta.entries;
  }

  const videos = entriesToVisualVideos(entries);
  const channelName = String(rawMeta.channel || rawMeta.uploader || rawMeta.title || rawMeta.id || '').trim();
  const channelLink = String(
    rawMeta.uploader_url || rawMeta.channel_url || (channelId ? `https://www.youtube.com/channel/${channelId}` : url)
  ).trim();

  let resolvedChannelId = channelId;
  if (!resolvedChannelId && typeof rawMeta.id === 'string' && isSafeChannelIdBasename(rawMeta.id)) {
    resolvedChannelId = rawMeta.id;
  }

  return {
    channelId: resolvedChannelId,
    channelName,
    channelLink,
    videos,
  };
}

/**
 * Nhận URL kênh / playlist YouTube → lấy danh sách video (link, duration) → ghi `visuals/{channelId}.json`.
 * Nếu file đã tồn tại thì không ghi và không gọi yt-dlp khi đã suy ra được UC từ URL và file trùng tồn tại.
 *
 * @param {string} url
 * @returns {Promise<{ ok: boolean, skipped?: boolean, filePath?: string, channelId?: string, videoCount?: number, error?: string, message?: string }>}
 */
export async function addVisual(url) {
  const input = String(url ?? '').trim();
  if (!input) {
    return { ok: false, error: 'empty_url' };
  }

  const dir = getVisualsDirPath();

  const videoMeta = await getVideoInfo(url);

  const channelId = videoMeta?.metadata?.channel_id;

  const filePath = path.join(dir, `${channelId}.json`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return { ok: true, skipped: true };
  }

  /** @type {{ channelId: string, channelName: string, channelLink: string, videos: Array<{ link: string, duration: string, used: string }> }} */
  let payload;
  try {
    payload = await fetchYoutubeVisualPayload(input);
  } catch (e) {
    return { ok: false, error: 'fetch_failed' };
  }

  await fsp.mkdir(dir, { recursive: true });
  const out = {
    channelId,
    channelName: payload.channelName,
    channelLink: payload.channelLink,
    videos: payload.videos,
  };
  await fsp.writeFile(filePath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  return {
    ok: true,
    skipped: false,
  };
}

export default addVisual;
