/**
 * Script lấy thông tin kênh YouTube
 * Có thể chạy từ CLI (đọc input.txt) hoặc từ UI (nhận params)
 * Chỉ xử lý channel/playlist, không xử lý video
 * File Excel kênh: bốn cột LINK VIDEO | VIEWS | DURATION | STATUS; dropdown STATUS từ VIDEO_STATUS_OPTIONS.
 */

import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { resolveChannelsDir } from './utils/channelsStoragePath.js';
import { CHANNEL_CONFIG_FILE, CHANNEL_DETAIL, CHANNELS, MIN_DURATION_VIDEO, VIDEO_STATUS_OPTIONS } from './constants/channel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = resolveChannelsDir();
const INPUT_FILE = path.join(__dirname, '..', 'input.txt');
const INDEX_FILE = path.join(DEFAULT_OUTPUT_DIR, 'index.xlsx');

/** Headers cho file index.xlsx — cột ID = tên thư mục kênh (MaVidMedia/channels/<ID>/) */
const INDEX_HEADERS = [
  'LINK',
  'ID',
  'EMAIL',
  'KÊNH CỦA TÔI',
  'LOẠI VIDEO',
  'THỜI GIAN VIDEO',
  'BACKGROUND',
  'LAST UPLOAD',
  'STATUS',
  'Group',
];

/** Chỉ số cột 1-based (khớp INDEX_HEADERS). Cột cuối = ID nhóm (group.json). */
const IDX = {
  LINK: 1,
  ID: 2,
  EMAIL: 3,
  MY_CHANNEL: 4,
  LOAI_VIDEO: 5,
  THOI_GIAN: 6,
  BACKGROUND: 7,
  LAST_UPLOAD: 8,
  STATUS: 9,
  GROUP: 10,
};

const IDX_CHANNELS = CHANNELS.reduce((acc, item) => {
  acc[item.key.toUpperCase()] = item.index;
  return acc;
}, {});

const IDX_CHANNEL_DETAIL = CHANNEL_DETAIL.reduce((acc, item) => {
  acc[item.key.toUpperCase()] = item;
  return acc;
}, {});

const getDefaultLastUpload = () => {
  const now = new Date();

  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);

  nextDay.setHours(0, 0, 0, 0);

  const pad = n => n.toString().padStart(2, '0');

  const dateFormatted = `${pad(nextDay.getDate())}/` + `${pad(nextDay.getMonth() + 1)}/` + `${nextDay.getFullYear()}`;

  const timeFormatted = `${pad(nextDay.getHours())}:` + `${pad(nextDay.getMinutes())}`;

  return { dateFormatted, timeFormatted, formatted: `${dateFormatted} ${timeFormatted}` };
};

/**
 * Ánh xạ cột file Excel trong thư mục kênh (hỗ trợ layout 4 cột chuẩn hoặc file cũ nhiều cột).
 * @param {import('exceljs').Row} headerRow
 */
function getChannelExcelColumnMap(headerRow) {
  const vals = headerRow.values || [];
  const label = i =>
    String(vals[i] ?? '')
      .trim()
      .toLowerCase();
  let maxUsed = 0;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] != null && String(vals[i]).trim() !== '') maxUsed = i;
  }
  const find = match => {
    for (let i = 1; i < vals.length; i++) {
      if (match(label(i))) return i;
    }
    return -1;
  };
  const link = find(l => l === IDX_CHANNEL_DETAIL.LINK.label.toLowerCase());
  const views = find(l => l === IDX_CHANNEL_DETAIL.VIEWS.label.toLowerCase());
  const duration = find(l => l === IDX_CHANNEL_DETAIL.DURATION.label.toLowerCase());
  const status = find(l => l.includes(IDX_CHANNEL_DETAIL.STATUS.label.toLowerCase()));
  const maxCol = Math.max(maxUsed, link, views, duration, status, 4);
  return { link, views, duration, status, maxCol };
}

/** @param {ReturnType<typeof getChannelExcelColumnMap>} map */
function appendChannelVideoRows(sheet, videos) {
  for (const video of videos) {
    const row = Array.from({ length: CHANNEL_DETAIL.length }, () => '');
    const set = (col1Based, val) => {
      if (col1Based >= 1) row[col1Based - 1] = val;
    };
    set(IDX_CHANNEL_DETAIL.LINK.index, video?.url || '');
    set(IDX_CHANNEL_DETAIL.VIEWS.index, video?.viewCount ?? 0);
    set(IDX_CHANNEL_DETAIL.DURATION.index, video?.duration || '');
    set(IDX_CHANNEL_DETAIL.STATUS.index, '');
    sheet.addRow(row);
  }
}

/**
 * Header có thể là 4 cột chuẩn (A–D) trong khi file cũ ghi URL ở cột D (sau 3 ô tên/tag trống).
 * Dùng khi đọc URL hiện có và khi nối thêm dòng cho khớp layout thực tế.
 * @param {import('exceljs').Worksheet} sheet
 * @param {ReturnType<typeof getChannelExcelColumnMap>} headerMap
 */
function effectiveChannelColumnMap(sheet, headerMap) {
  if (sheet.rowCount < 2 || headerMap.link < 1) return headerMap;
  const r2 = sheet.getRow(2);
  const cellText = col => {
    const raw = r2.getCell(col).value;
    return raw && typeof raw === 'object' ? String(raw.text || raw.hyperlink || '').trim() : String(raw || '').trim();
  };
  const looksLikeYt = s => /youtube\.com|youtu\.be/i.test(String(s || ''));
  const atHeaderLink = cellText(headerMap.link);
  const atCol4 = cellText(4);
  if (!looksLikeYt(atHeaderLink) && looksLikeYt(atCol4) && headerMap.link === 1) {
    const off = 3;
    const bump = idx => (idx >= 1 ? idx + off : -1);
    const link = 4;
    const views = bump(headerMap.views);
    const duration = bump(headerMap.duration);
    const status = bump(headerMap.status);
    const maxCol = Math.max(headerMap.maxCol, link, views, duration, status, 8);
    return { link, views, duration, status, maxCol };
  }
  return headerMap;
}

function resolveIndexMetaColumns(channelData) {
  const colEmail = String(channelData.email ?? '').trim();
  const colMyChannel = String(channelData.myChannel ?? '').trim();
  const colVideoType = String(channelData.videoType ?? '').trim();
  const dm = channelData.durationMinutes;
  const colDurationMinutes = dm === '' || dm == null ? '' : String(dm);
  const colGroup = String(channelData.group ?? '').trim();
  const rawSt = String(channelData.channelStatus ?? '')
    .trim()
    .toUpperCase();
  const colStatus = rawSt === 'INIT' || rawSt === 'LIVE' || rawSt === 'STOPPED' ? rawSt : colEmail ? 'LIVE' : 'INIT';
  return { colEmail, colMyChannel, colVideoType, colDurationMinutes, colGroup, colStatus };
}

/**
 * Cập nhật hoặc thêm channel vào file index.xlsx
 * @param {Object} channelData
 * @param {string} [channelData.email] — nếu có (kể cả `''`), coi là luồng form: ghi đầy đủ cột meta (EMAIL … BACKGROUND)
 * @param {string} channelData.id — tên thư mục kênh (khớp thư mục trong MaVidMedia/channels/)
 */
async function updateIndexFile(channelData) {
  console.log('🚀 ~ updateIndexFile ~ channelData:', channelData);
  const { name, link, id, channelId } = channelData;
  const meta = resolveIndexMetaColumns(channelData);

  if (!fs.existsSync(DEFAULT_OUTPUT_DIR)) {
    fs.mkdirSync(DEFAULT_OUTPUT_DIR, { recursive: true });
  }

  let workbook;
  let sheet;

  if (fs.existsSync(INDEX_FILE)) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(INDEX_FILE);
    sheet = workbook.worksheets[0];

    // Đồng bộ dòng tiêu đề nếu lệch INDEX_HEADERS (sau migrate hoặc file chỉnh tay)
    // const r1 = sheet.getRow(1);
    // let headerMismatch = false;
    // for (let c = 1; c <= INDEX_HEADERS.length; c++) {
    //   if (String(r1.getCell(c).value || '').trim() !== INDEX_HEADERS[c - 1]) {
    //     headerMismatch = true;
    //     break;
    //   }
    // }
    // if (headerMismatch) {
    //   r1.values = [undefined, ...INDEX_HEADERS];
    // }

    // Tìm xem channel đã tồn tại chưa (mặc định theo ID - cột 3)
    let existingRowIndex = -1;
    for (let i = 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rowId = String(row.getCell(IDX_CHANNELS.ID).value || '').trim();
      if (rowId === id) {
        existingRowIndex = i;
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Cập nhật row hiện có
      const row = sheet.getRow(existingRowIndex);

      // row.getCell(IDX_CHANNELS.LINK).value = link;
      // row.getCell(IDX_CHANNELS.ID).value = id;
      // row.getCell(IDX_CHANNELS.LASTUPLOAD).value = lastUpload;
      if ('email' in channelData) {
        // row.getCell(IDX.EMAIL).value = meta.colEmail;
        row.getCell(IDX_CHANNELS.MYCHANNEL).value = meta.colMyChannel;
        row.getCell(IDX_CHANNELS.VIDEOTYPE).value = meta.colVideoType;
        row.getCell(IDX_CHANNELS.DURATIONMINUTES).value = meta.colDurationMinutes;
        row.getCell(IDX_CHANNELS.GROUP).value = meta.colGroup;
        row.getCell(IDX_CHANNELS.STATUS).value = meta.colStatus;
      }
      console.log(`Đã cập nhật channel "${name}" trong index.xlsx`);
    } else {
      // Thêm row mới
      sheet.addRow([
        id,
        channelId,
        link,
        name,
        meta.colEmail,
        meta.colMyChannel,
        meta.colVideoType,
        meta.colDurationMinutes,
        getDefaultLastUpload().formatted,
        meta.colGroup,
        meta.colStatus,
      ]);
      console.log(`Đã thêm channel "${name}" vào index.xlsx`);
    }
  } else {
    // Tạo file mới
    workbook = new ExcelJS.Workbook();
    sheet = workbook.addWorksheet('Channels', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(CHANNELS.map(item => item.label));
    sheet.addRow([
      id,
      channelId,
      link,
      name,
      meta.colEmail,
      meta.colMyChannel,
      meta.colVideoType,
      meta.colDurationMinutes,
      getDefaultLastUpload().formatted,
      meta.colGroup,
      meta.colStatus,
    ]);

    sheet.columns = [
      { width: 30 }, // TIME
      { width: 30 }, // ID
      { width: 50 }, // LINK
      { width: 36 }, // NAME
      { width: 35 }, // EMAIL
      { width: 24 }, // KÊNH CỦA TÔI
      { width: 25 }, // LOẠI VIDEO
      { width: 20 }, // THỜI GIAN VIDEO
      { width: 18 }, // LAST UPLOAD
      { width: 20 }, // GROUP
      { width: 18 }, // STATUS
    ];

    console.log(`Đã tạo file index.xlsx và thêm channel "${name}"`);
  }

  await workbook.xlsx.writeFile(INDEX_FILE);
}

export function detectUrlType(url) {
  const u = url.toLowerCase().trim();
  if (u.includes('/watch?v=') || u.includes('/shorts/') || u.includes('/live/')) {
    return 'video';
  }
  if (u.includes('/playlist?list=')) {
    return 'playlist';
  }
  if (u.includes('/channel/') || u.includes('/@') || u.includes('/c/') || u.includes('/user/')) {
    return 'channel';
  }
  return 'video';
}

/**
 * Chuyển channel ID sang uploads playlist ID (UC... -> UU...)
 */
function channelToUploadsPlaylistId(channelId) {
  if (!channelId || !channelId.startsWith('UC')) return null;
  return 'UU' + channelId.slice(2);
}

/**
 * Format duration từ giây sang HH:mm:ss
 */
function formatDuration(seconds) {
  if (!seconds) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map(v => (v < 10 ? '0' + v : v)).join(':');
}

/**
 * Lấy thông tin kênh (và video từ kênh)
 */
export async function getChannelInfo(url) {
  // Bước 1: Lấy metadata kênh
  const rawMeta = await youtubedl(url, {
    dumpSingleJson: true,
    flatPlaylist: true,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  const channelId = rawMeta.channel_id;
  let videoLinks = [];
  let entries = [];

  // Bước 2: Nếu là kênh, lấy danh sách video từ uploads
  if (channelId) {
    const playlistId = channelToUploadsPlaylistId(channelId);
    if (playlistId) {
      const plUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      try {
        const rawPlaylist = await youtubedl(plUrl, {
          dumpSingleJson: true,
          flatPlaylist: true,
          noCheckCertificates: true,
          noWarnings: true,
          addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
        });
        entries = rawPlaylist.entries || [];
        videoLinks = entries
          .filter(e => e.id && e.id.length === 11 && e.duration && e.duration > MIN_DURATION_VIDEO)
          .map(e => ({
            url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
            title: e.title || '',
            viewCount: e.view_count || 0,
            duration: e.duration_string || (e.duration ? formatDuration(e.duration) : '00:00:00'),
            upload_date: e.upload_date || '',
          }));
      } catch (err) {
        console.warn('Không lấy được danh sách video:', err.message);
      }
    }
  }

  // Nếu là playlist URL trực tiếp, dùng entries từ rawMeta
  if (entries.length === 0 && rawMeta.entries) {
    entries = rawMeta.entries;
    videoLinks = entries
      .filter(e => e.id && e.id.length === 11 && e.duration && e.duration > MIN_DURATION_VIDEO)
      .map(e => ({
        url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
        title: e.title || '',
        viewCount: e.view_count || 0,
        duration: e.duration_string || (e.duration ? formatDuration(e.duration) : '00:00:00'),
        upload_date: e.upload_date || '',
      }));
  }

  return {
    type: 'channel',
    name: rawMeta.channel || rawMeta.uploader || rawMeta.title || rawMeta.id,
    description: rawMeta.description || '',
    tags: rawMeta.tags || [],
    video_count: videoLinks.length,
    video_links: videoLinks,
    metadata: {
      id: rawMeta.id,
      channel_id: rawMeta.channel_id,
      channel_url: rawMeta.channel_url,
      uploader: rawMeta.uploader,
      uploader_id: rawMeta.uploader_id,
      uploader_url: rawMeta.uploader_url,
      entries_preview: entries
        .slice(0, 5)
        .map(e => ({
          id: e.id,
          title: e.title,
          url: e.url || (e.id?.length === 11 ? `https://www.youtube.com/watch?v=${e.id}` : null),
        }))
        .filter(e => e.url),
    },
  };
}

function decodeUrlTry(s) {
  try {
    return decodeURIComponent(String(s ?? '').trim());
  } catch {
    return String(s ?? '').trim();
  }
}

/** Handle sau `@` trong URL kênh (ASCII hoặc Unicode, vd. `@건강박사2025`). */
function handleFromYoutubeAtUrl(str) {
  const dec = decodeUrlTry(str);
  let m = dec.match(/@([a-zA-Z0-9_.-]+)/);
  if (m?.[1]) return m[1];
  m = dec.match(/@([^/@?#\s]+)/);
  return m?.[1] ? m[1] : '';
}

/**
 * Tên thư mục kênh (index cột ID / `MaVidMedia/channels/<tên>/`).
 * Trước đây: nếu `uploader_url` có `@` nhưng handle không khớp regex ASCII,
 * nhánh `else if` chặn → không dùng được `uploader_id` / `channel_id` → `unknown_id`.
 */
function resolveChannelFolderNameFromResult(url, result) {
  const meta = result?.metadata;

  if (meta.channel_id) return meta.channel_id;

  let name = handleFromYoutubeAtUrl(url);
  if (name) return name;

  if (meta?.uploader_url) {
    name = handleFromYoutubeAtUrl(meta.uploader_url);
    if (name) return name;
  }

  if (meta?.uploader_id) {
    let up = String(meta.uploader_id).trim();
    if (up.startsWith('@')) up = up.slice(1);
    if (up) return up;
  }

  const cid = meta?.channel_id || meta?.id;
  if (cid) return String(cid);

  return 'unknown_id';
}

const handleUpdateChannelConfigFile = async (channelDir, formData) => {
  console.log('🚀 ~ handleUpdateChannelConfigFile ~ formData:', formData);
  const { id, channelLink, channelId, channelName, groupId, ...restConfig } = formData;

  const configPath = path.join(channelDir, CHANNEL_CONFIG_FILE);
  let config;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn(`[addChannelFromForm] Lỗi đọc config cũ: ${e.message}`);
    }
  }

  const newChannelConfig = {
    ...restConfig,
    id,
    uploadedVideos: 0,
    latestUploadDate: getDefaultLastUpload().dateFormatted,
    latestUploadTime: getDefaultLastUpload().timeFormatted,
  };

  if (config) {
    const idxChannelConfig = config.channels.findIndex(cfg => cfg.id === id);

    if (idxChannelConfig !== -1) {
      const existedChannelCfg = config.channels[idxChannelConfig];

      config.channels[idxChannelConfig] = {
        ...existedChannelCfg,
        ...restConfig,
        id: existedChannelCfg.id,
        uploadedVideos: existedChannelCfg.email === formData.email ? existedChannelCfg.uploadedVideos : 0,
        latestUploadDate:
          existedChannelCfg.email === formData.email ? existedChannelCfg.latestUploadDate : getDefaultLastUpload().dateFormatted,
        latestUploadTime:
          existedChannelCfg.email === formData.email ? existedChannelCfg.latestUploadTime : getDefaultLastUpload().timeFormatted,
      };
    } else {
      config.channels.push(newChannelConfig);
      config.channelLink = channelLink;
      config.channelName = channelName;
    }
  } else {
    config = {
      version: 1,
      channels: [newChannelConfig],
      channelLink,
      channelName,
      folderId: channelId,
      createdAt: new Date().toISOString(),
    };
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`[ADD CHANNEL] Đã ghi/cập nhật ${configPath}`);
};

/**
 * Thêm kênh từ form app: gọi getChannelInfo, ghi `MaVidMedia/channels/index.xlsx` (giống luồng getInfoChannel),
 * tạo thư mục `MaVidMedia/channels/<folder>/`, file Excel kênh và `mavid-channel-config.json`.
 *
 * @param {Object} options
 * @param {Object} options.formData
 * @param {string} options.formData.channelLink - URL kênh / playlist
 * @param {string} options.formData.email
 * @param {string} [options.formData.myChannel] — cột «KÊNH CỦA TÔI» index (sau EMAIL)
 * @param {string} options.formData.videoType - from_audio | reup_full
 * @param {number} options.formData.durationMinuteFrom
 * @param {number} options.formData.durationMinuteTo
 * @param {string} options.formData.background
 * @param {string} options.formData.videosPerDayPreset - "1"…"24" | "1-2"
 * @param {string[]} options.formData.publishTimes
 * @param {string} [options.formData.folderIdOverride] - tên thư mục (ID kênh), tùy chọn
 */
export async function addChannelFromForm(options = {}) {
  const formData = options.formData;
  console.log('🚀 ~ addChannelFromForm ~ formData:', formData);
  const id = formData.id;
  const newId = uuidv4();

  if (!formData || !formData.channelLink) throw new Error('Thiếu thông tin form.');

  const urlType = detectUrlType(formData.channelLink);
  if (urlType !== 'channel') throw new Error('Chỉ hỗ trợ link kênh.');

  let channelId = formData.channelId || '';
  let channelLink = formData.channelLink || '';
  let channelName = formData.name || '';

  if (id) {
    if (!channelId) throw new Error('Không tìm thấy ID kênh');

    const channelDir = path.join(DEFAULT_OUTPUT_DIR, channelId);
    await handleUpdateChannelConfigFile(channelDir, formData);
  } else {
    // handle add channel information
    // consider validate email exists
    console.log(`[ADD CHANNEL] Đang lấy thông tin: ${formData.channelLink}`);
    const result = await getChannelInfo(formData.channelLink);

    channelId = result.metadata?.channel_id || result.metadata?.channel_url?.split('/')?.[4] || '';

    if (!channelId) throw new Error('Không tìm thấy ID kênh');

    let usernameId = result.metadata?.uploader_id || '';

    channelLink = usernameId.startsWith('@')
      ? `https://www.youtube.com/${usernameId}`
      : result.metadata?.uploader_url || result.metadata?.channel_url || formData.channelLink;
    channelName = result.name || '';

    const channelDir = path.join(DEFAULT_OUTPUT_DIR, channelId);
    const outputExcelPath = path.join(channelDir, `${channelId}.xlsx`);

    const videoLinks = [...(result.video_links || [])].reverse();

    let workbook;
    let sheet;

    if (fs.existsSync(outputExcelPath)) {
      console.log(`[ADD CHANNEL] File Excel đã tồn tại, đang kiểm tra video mới...`);
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(outputExcelPath);
      sheet = workbook.worksheets[0];

      const existingUrls = new Set();
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const val = String(row.getCell(IDX_CHANNEL_DETAIL.LINK.index).value || '').trim();
        if (val) existingUrls.add(val);
      }

      const newVideos = videoLinks.filter(v => !existingUrls.has(v.url));
      if (newVideos.length > 0) {
        console.log(`[ADD CHANNEL] Tìm thấy ${newVideos.length} video mới.`);
        appendChannelVideoRows(sheet, newVideos);
      }
    } else {
      fs.mkdirSync(channelDir, { recursive: true });
      workbook = new ExcelJS.Workbook();
      sheet = workbook.addWorksheet('Kênh YouTube', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.addRow(CHANNEL_DETAIL.map(item => item.label));
      if (videoLinks.length > 0) {
        videoLinks.forEach(video => {
          const vu = video?.url || '';
          const views = video?.viewCount || 0;
          const duration = video?.duration || '';
          sheet.addRow([vu, views, duration, '']);
        });
      }
    }

    sheet.columns = [{ width: 60 }, { width: 20 }, { width: 20 }, { width: 40 }];

    const listFormula = `"${VIDEO_STATUS_OPTIONS.filter(Boolean).join(',')}"`;
    for (let i = 2; i <= sheet.rowCount; i++) {
      sheet.getRow(i).getCell(IDX_CHANNEL_DETAIL.STATUS.index).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [listFormula],
      };
    }

    await workbook.xlsx.writeFile(outputExcelPath);
    console.log(`[ADD CHANNEL] Đã ghi/cập nhật ${outputExcelPath}`);

    await handleUpdateChannelConfigFile(channelDir, {
      ...formData,
      id: newId,
      channelId,
      channelName,
    });
  }

  await updateIndexFile({
    id: id || newId,
    name: channelName,
    link: channelLink,
    channelId,
    lastUpload: String(formData.lastUpload ?? '').trim(),
    email: String(formData.email || '').trim(),
    myChannel: String(formData.myChannel ?? '').trim(),
    group: String(formData.group ?? '').trim(),
    videoType: formData.videoType,
    durationMinutes: formData.durationMinuteFrom + '_' + formData.durationMinuteTo,
    background:
      formData.videoType === 'reup_full'
        ? String(formData.overlay ?? formData.background ?? '').trim()
        : String(formData.background ?? '').trim(),
    channelStatus: String(formData.email ?? '').trim() ? 'LIVE' : 'INIT',
  });
  console.log(`[ADD CHANNEL] Đã cập nhật ${path.relative(path.join(__dirname, '..'), INDEX_FILE)}`);

  return {
    success: true,
    processedCount: 1,
  };
}

const handleUpdateChannels = async () => {};

const handleAddChannel = async url => {
  const result = await getChannelInfo(url);
  console.log('🚀 ~ handleAddChannel ~ result:', result);

  const channelId = result.metadata?.channel_id || result.metadata?.channel_url?.split('/')?.[4] || '';

  if (!channelId) {
    console.error('Không tìm thấy ID kênh');
    return;
  }

  let usernameId = result.metadata?.uploader_id || '';

  const channelLink = usernameId.startsWith('@')
    ? `https://www.youtube.com/@${usernameId}`
    : result.metadata?.uploader_url || result.metadata?.channel_url || url;

  await updateIndexFile({
    name: result.name || '',
    link: channelLink,
    channelId,
    id: channelId,
  });

  // Tạo dữ liệu: mỗi video một dòng (đảo ngược: cũ ở đầu, mới ở cuối)
  const headers = ['LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS'];
  const videoLinks = [...(result.video_links || [])].reverse();

  // Thư mục lưu kết quả: MaVidMedia/channels/<Tên người dùng>/
  const channelDir = path.join(DEFAULT_OUTPUT_DIR, excelFilename);
  const outputExcelPath = path.join(channelDir, `${excelFilename}.xlsx`);

  let workbook;
  let sheet;

  if (fs.existsSync(outputExcelPath)) {
    console.log(`\nFILE EXCEL CHO KÊNH NÀY ĐÃ TỒN TẠI! (${excelFilename}/${excelFilename}.xlsx) Đang kiểm tra video mới...`);
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputExcelPath);
    sheet = workbook.worksheets[0];

    const headerRow = sheet.getRow(1);
    const colMap = effectiveChannelColumnMap(sheet, getChannelExcelColumnMap(headerRow));
    if (colMap.link < 1) throw new Error('Không tìm thấy cột LINK VIDEO trong file hiện tại.');

    const existingUrls = new Set();
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rawVal = row.getCell(colMap.link).value;
      const val = rawVal && typeof rawVal === 'object' ? String(rawVal.text || rawVal.hyperlink || '').trim() : String(rawVal || '').trim();
      if (val) existingUrls.add(val);
    }

    const newVideos = videoLinks.filter(v => {
      const u = typeof v === 'string' ? v : v?.url || '';
      return u && !existingUrls.has(u);
    });

    if (newVideos.length === 0) {
      console.log('Không có video mới nào.');
      return;
    }

    console.log(`Tìm thấy ${newVideos.length} video mới. Đang thêm vào cuối file...`);
    appendChannelVideoRows(sheet, newVideos);
  } else {
    const rows =
      videoLinks.length > 0
        ? videoLinks.map(video => {
            const u = video?.url || '';
            const views = video?.viewCount || 0;
            const duration = video?.duration || '';
            return [u, views, duration, ''];
          })
        : [['(Không có video)', 0, '00:00:00', '']];

    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    workbook = new ExcelJS.Workbook();
    sheet = workbook.addWorksheet('Kênh YouTube', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(headers);
    rows.forEach(row => sheet.addRow(row));

    // Độ rộng cột: LINK VIDEO | VIEWS | DURATION | STATUS
    sheet.columns = [
      { width: 45 }, // LINK VIDEO
      { width: 12 }, // VIEWS
      { width: 12 }, // DURATION
      { width: 20 }, // STATUS
    ];
  }

  // Thêm hoặc cập nhật data validation cho tất cả các dòng dữ liệu (cả cũ và mới)
  const backgroundsDirForSheet = resolveStockBackgroundsDir();
  let bgOptions = [];
  if (fs.existsSync(backgroundsDirForSheet)) {
    bgOptions = fs.readdirSync(backgroundsDirForSheet).filter(f => fs.statSync(path.join(backgroundsDirForSheet, f)).isDirectory());
  }

  const colMapVal = effectiveChannelColumnMap(sheet, getChannelExcelColumnMap(sheet.getRow(1)));
  const statusCol = colMapVal.status >= 1 ? colMapVal.status : 4;
  const listFormula = `"${VIDEO_STATUS_OPTIONS.filter(Boolean).join(',')}"`;
  const row1ForValidation = sheet.getRow(1);
  const legacyBgForValidation =
    String(row1ForValidation.getCell(8).value || '')
      .trim()
      .toUpperCase() === 'BACKGROUND VIDEO';

  for (let i = 2; i <= sheet.rowCount; i++) {
    sheet.getRow(i).getCell(statusCol).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [listFormula],
    };

    if (legacyBgForValidation && bgOptions.length > 0) {
      const bgFormula = `"${bgOptions.join(',')}"`;
      sheet.getCell(`H${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [bgFormula],
      };
    }
  }

  await workbook.xlsx.writeFile(outputExcelPath);

  console.log(`\nĐã lưu kết quả vào ${path.basename(outputExcelPath)} (${videoLinks.length} video)`);

  results.push({
    url,
    type: urlType,
    channelName: result.name,
    channelId: excelFilename,
    channelLink,
    videoCount: videoLinks.length,
    outputFile: outputExcelPath,
  });
};

const handleGetVideo = async url => {
  const { default: downloadVideo } = await import('./downloadVideo.js');
  const videoResult = await downloadVideo({ url });
};

/**
 * Main function - có thể gọi từ CLI hoặc UI
 * @param {Object} options - Tùy chọn
 * @param {string} [options.url] - URL YouTube (nếu có, bỏ qua input.txt)
 * @returns {Object} Kết quả xử lý
 */
async function main(options = {}) {
  let url = '';

  // Nếu có url/urls từ params, dùng trực tiếp
  if (options.url) {
    url = options.url;
  } else {
    // Fallback: đọc từ input.txt (cho CLI)
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Không tìm thấy file input.txt và không có URL trong params.');
    }
    const content = fs.readFileSync(INPUT_FILE, 'utf-8').trim();
    url =
      content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && (l.startsWith('http://') || l.startsWith('https://')))?.[0] || '';
  }

  if (!url) {
    throw new Error('Không có link hợp lệ. Chỉ chấp nhận link bắt đầu bằng http:// hoặc https://');
  }

  const urlType = detectUrlType(url);

  if (urlType === 'video') {
    await handleGetVideo(url);
  } else {
    handleAddChannel(url);
  }

  return {
    success: true,
  };
}

export default main;
