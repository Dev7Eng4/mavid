/**
 * Script lấy thông tin kênh YouTube
 * Có thể chạy từ CLI (đọc input.txt) hoặc từ UI (nhận params)
 * Chỉ xử lý channel/playlist, không xử lý video
 * Xuất kết quả ra file Excel (.xlsx) với dropdown cột Trạng thái
 */

import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { resolveStockBackgroundsDir } from './utils/stockBackgroundsPath.js';
import { resolveChannelsDir } from './utils/channelsStoragePath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = resolveChannelsDir();
const INPUT_FILE = path.join(__dirname, '..', 'input.txt');
const INDEX_FILE = path.join(DEFAULT_OUTPUT_DIR, 'index.xlsx');

/** Options cho cột Trạng thái (dropdown) */
const TRANG_THAI_OPTIONS = ['', 'Đã tạo video', 'Đã đăng video'];

/** index.xlsx: loại video (dropdown) */
const INDEX_VIDEO_TYPE_OPTIONS = ['from_audio', 'reup_full'];

/** index.xlsx: thời lượng video phút (dropdown) */
const INDEX_THOI_GIAN_OPTIONS = ['Tất cả', '0 - 30 phút', '0 - 60 phút', '30 - 60 phút', 'Từ 30 phút', 'Từ 60 phút'];

/** Headers cho file index.xlsx — cột ID = tên thư mục kênh (MaVidMedia/channels/<ID>/) */
const INDEX_HEADERS = ['CHANNEL', 'LINK', 'ID', 'EMAIL', 'LOẠI VIDEO', 'THỜI GIAN VIDEO', 'BACKGROUND', 'LAST UPLOAD'];

/** Bản index từng có cột THƯ MỤC (cột 9): gộp về cột ID rồi bỏ cột 9. */
const UC_INDEX_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
function migrateDropThucMucColumnIfPresent(sheet) {
  const r1 = sheet.getRow(1);
  const h9 = String(r1.getCell(9).value || '')
    .trim()
    .toUpperCase();
  if (h9 !== 'THƯ MỤC' && h9 !== 'FOLDER') return;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const idVal = String(row.getCell(3).value || '').trim();
    const folderVal = String(row.getCell(9).value || '').trim();
    if (folderVal && (UC_INDEX_ID_RE.test(idVal) || !idVal)) {
      row.getCell(3).value = folderVal;
    }
    row.getCell(9).value = null;
  }
  r1.getCell(9).value = null;
}

/** Thời gian video tối thiểu để lấy vào danh sách (giây) */
const MIN_DURATION_SECONDS = 480;

/**
 * File index cũ (5 cột): LAST UPLOAD ở cột E → chèn 3 cột sau EMAIL, đẩy LAST UPLOAD sang cột H.
 */
function migrateIndexSheetIfNeeded(sheet) {
  const h1 = String(sheet.getRow(1).getCell(5).value || '').trim();
  const h8 = String(sheet.getRow(1).getCell(8).value || '').trim();
  if (h1 !== 'LAST UPLOAD' || h8 === 'LAST UPLOAD') return;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const lastUpload = row.getCell(5).value;
    row.getCell(5).value = '';
    row.getCell(6).value = '';
    row.getCell(7).value = '';
    row.getCell(8).value = lastUpload;
  }
  sheet.getRow(1).values = [undefined, ...INDEX_HEADERS];
}

/** Gắn dropdown cho index sheet (cột E–G: loại video, thời gian, background) */
function applyIndexDataValidation(sheet) {
  const backgroundsDir = resolveStockBackgroundsDir();
  let bgOptions = [];
  if (fs.existsSync(backgroundsDir)) {
    bgOptions = fs.readdirSync(backgroundsDir).filter(f => fs.statSync(path.join(backgroundsDir, f)).isDirectory());
  }

  const typeFormula = `"${INDEX_VIDEO_TYPE_OPTIONS.join(',')}"`;
  const thoiGianFormula = `"${INDEX_THOI_GIAN_OPTIONS.join(',')}"`;

  for (let i = 2; i <= sheet.rowCount; i++) {
    sheet.getCell(`E${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [typeFormula],
    };
    sheet.getCell(`F${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [thoiGianFormula],
    };
    if (bgOptions.length > 0) {
      const bgFormula = `"${bgOptions.join(',')}"`;
      sheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [bgFormula],
      };
    }
  }
}

/**
 * Cột D–G index (EMAIL, LOẠI VIDEO, THỜI GIAN, BACKGROUND) — chỉ dùng khi `channelData` có khóa `email`
 * (luồng addChannelFromForm). Luồng CLI getInfoChannel không truyền → giữ ô trống / không ghi đè cột 4–7 khi cập nhật dòng cũ.
 */
function resolveIndexMetaColumns(channelData) {
  if (!('email' in channelData)) {
    return { c4: '', c5: '', c6: '', c7: '' };
  }
  const c4 = String(channelData.email ?? '').trim();
  const c5 = String(channelData.videoType ?? '').trim();
  const dm = channelData.durationMinutes;
  const c6 = dm === '' || dm == null ? '' : String(dm);
  const c7 = String(channelData.background ?? '').trim();
  return { c4, c5, c6, c7 };
}

/**
 * Cập nhật hoặc thêm channel vào file index.xlsx
 * @param {Object} channelData
 * @param {string} [channelData.email] — nếu có (kể cả `''`), coi là luồng form: ghi đầy đủ cột D–G
 * @param {string} channelData.id — tên thư mục kênh (khớp thư mục trong MaVidMedia/channels/)
 */
async function updateIndexFile(channelData) {
  const { name, link, id, lastUpload } = channelData;
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
    migrateIndexSheetIfNeeded(sheet);
    migrateDropThucMucColumnIfPresent(sheet);

    // Đồng bộ dòng tiêu đề nếu lệch INDEX_HEADERS (sau migrate hoặc file chỉnh tay)
    const r1 = sheet.getRow(1);
    let headerMismatch = false;
    for (let c = 1; c <= INDEX_HEADERS.length; c++) {
      if (String(r1.getCell(c).value || '').trim() !== INDEX_HEADERS[c - 1]) {
        headerMismatch = true;
        break;
      }
    }
    if (headerMismatch) {
      r1.values = [undefined, ...INDEX_HEADERS];
    }

    // Tìm xem channel đã tồn tại chưa (mặc định theo ID - cột 3)
    let existingRowIndex = -1;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rowId = String(row.getCell(3).value || '').trim();
      const rowEmail = String(row.getCell(4).value || '').trim();

      if (rowId === id) {
        // Nếu luồng CLI (không có email), cập nhật dòng khớp ID đầu tiên
        if (!('email' in channelData)) {
          existingRowIndex = i;
          break;
        }
        // Nếu luồng app (có email/meta), chỉ cập nhật nếu EMAIL khớp
        if (rowEmail === meta.c4) {
          existingRowIndex = i;
          break;
        }
      }
    }

    if (existingRowIndex > 0) {
      // Cập nhật row hiện có
      const row = sheet.getRow(existingRowIndex);
      row.getCell(1).value = name;
      row.getCell(2).value = link;
      row.getCell(3).value = id;
      row.getCell(8).value = lastUpload;
      if ('email' in channelData) {
        row.getCell(4).value = meta.c4;
        row.getCell(5).value = meta.c5;
        row.getCell(6).value = meta.c6;
        row.getCell(7).value = meta.c7;
      }
      console.log(`Đã cập nhật channel "${name}" trong index.xlsx`);
    } else {
      // Thêm row mới
      sheet.addRow([name, link, id, meta.c4, meta.c5, meta.c6, meta.c7, lastUpload]);
      console.log(`Đã thêm channel "${name}" vào index.xlsx`);
    }

    applyIndexDataValidation(sheet);
  } else {
    // Tạo file mới
    workbook = new ExcelJS.Workbook();
    sheet = workbook.addWorksheet('Channels', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(INDEX_HEADERS);
    sheet.addRow([name, link, id, meta.c4, meta.c5, meta.c6, meta.c7, lastUpload]);

    sheet.columns = [
      { width: 45 }, // CHANNEL
      { width: 60 }, // LINK
      { width: 40 }, // ID
      { width: 45 }, // EMAIL
      { width: 18 }, // LOẠI VIDEO
      { width: 18 }, // THỜI GIAN VIDEO
      { width: 22 }, // BACKGROUND
      { width: 30 }, // LAST UPLOAD
    ];

    applyIndexDataValidation(sheet);

    console.log(`Đã tạo file index.xlsx và thêm channel "${name}"`);
  }

  await workbook.xlsx.writeFile(INDEX_FILE);
}

/**
 * Phát hiện loại URL: 'video' | 'channel' | 'playlist'
 */
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
          .filter(e => e.id && e.id.length === 11 && e.duration && e.duration > MIN_DURATION_SECONDS)
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
      .filter(e => e.id && e.id.length === 11 && e.duration && e.duration > MIN_DURATION_SECONDS)
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

/**
 * Thêm kênh từ form app: gọi getChannelInfo, ghi `MaVidMedia/channels/index.xlsx` (giống luồng getInfoChannel),
 * tạo thư mục `MaVidMedia/channels/<folder>/`, file Excel kênh và `mavid-channel-config.json`.
 *
 * @param {Object} options
 * @param {string} options.url - URL kênh / playlist
 * @param {Object} options.formMeta
 * @param {string} options.formMeta.email
 * @param {string} options.formMeta.videoType - from_audio | reup_full
 * @param {number} options.formMeta.durationMinutes
 * @param {string} options.formMeta.background
 * @param {string} options.formMeta.videosPerDayPreset - "1" | "2" | "3" | "1-2"
 * @param {string[]} options.formMeta.publishTimes
 * @param {string} [options.formMeta.folderIdOverride] - tên thư mục (ID kênh), tùy chọn
 */
export async function addChannelFromForm(options = {}) {
  const url = (options.url || '').trim();
  const formMeta = options.formMeta;
  if (!url) throw new Error('Thiếu URL kênh.');
  if (!formMeta) throw new Error('Thiếu formMeta.');
  const channelsConfig = Array.isArray(formMeta.channels) && formMeta.channels.length > 0 ? formMeta.channels : [formMeta];
  const channelItem = channelsConfig[0];
  const seedEmail = (channelItem.email || '').trim();

  const urlType = detectUrlType(url);
  if (urlType === 'video') {
    throw new Error('Chỉ hỗ trợ link kênh hoặc playlist, không phải link video đơn.');
  }

  console.log(`[addChannelFromForm] Đang lấy thông tin: ${url}`);
  const result = await getChannelInfo(url);
  console.log('🚀 ~ addChannelFromForm ~ result:', result);

  let usernameId = result.metadata?.uploader_id || '';
  if (usernameId.startsWith('@')) usernameId = usernameId.slice(1);
  if (!usernameId) {
    const uh = handleFromYoutubeAtUrl(url);
    if (uh) usernameId = uh;
  }
  if (!usernameId && result.metadata?.uploader_url) {
    const uh = handleFromYoutubeAtUrl(result.metadata.uploader_url);
    if (uh) usernameId = uh;
  }
  if (!usernameId) usernameId = result.metadata?.channel_id || '';

  const channelLink =
    usernameId && !usernameId.startsWith('UC')
      ? `https://www.youtube.com/@${usernameId}`
      : result.metadata?.uploader_url || result.metadata?.channel_url || url;

  let lastUpload = '';
  if (result.video_links && result.video_links.length > 0) {
    const latestVideo = result.video_links[0];
    if (latestVideo?.upload_date) {
      const d = latestVideo.upload_date;
      lastUpload = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    }
  }

  const excelFilename = resolveChannelFolderNameFromResult(url, result);

  const override = typeof formMeta.folderIdOverride === 'string' ? formMeta.folderIdOverride.trim() : '';
  const folderName = override || excelFilename;
  if (!folderName || folderName.includes('..') || folderName.includes('/') || folderName.includes('\\')) {
    throw new Error('Tên thư mục kênh không hợp lệ.');
  }

  const channelDir = path.join(DEFAULT_OUTPUT_DIR, folderName);
  const outputExcelPath = path.join(channelDir, `${folderName}.xlsx`);

  const headers = ['CHANNEL NAME', 'CHANNEL TAGS', 'LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS'];
  const videoLinks = [...(result.video_links || [])].reverse();
  const channelName = result.name || '';
  const channelTagsStr = (result.tags || []).join(', ');

  let workbook;
  let sheet;

  if (fs.existsSync(outputExcelPath)) {
    console.log(`[addChannelFromForm] File Excel đã tồn tại, đang kiểm tra video mới...`);
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputExcelPath);
    sheet = workbook.worksheets[0];

    // Tìm cột "LINK VIDEO" logic (thường là cột 4)
    const existingUrls = new Set();
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const val = String(row.getCell(4).value || '').trim();
      if (val) existingUrls.add(val);
    }

    const newVideos = videoLinks.filter(v => !existingUrls.has(v.url));
    if (newVideos.length > 0) {
      console.log(`[addChannelFromForm] Tìm thấy ${newVideos.length} video mới.`);
      newVideos.forEach(video => {
        sheet.addRow(['', '', '', video.url, video.viewCount || 0, video.duration || '', '', '']);
      });
    } else {
      console.log(`[addChannelFromForm] Không có video mới.`);
    }
  } else {
    fs.mkdirSync(channelDir, { recursive: true });
    workbook = new ExcelJS.Workbook();
    sheet = workbook.addWorksheet('Kênh YouTube', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(headers);
    const rows =
      videoLinks.length > 0
        ? videoLinks.map((video, i) => {
            const vu = video?.url || '';
            const views = video?.viewCount || 0;
            const duration = video?.duration || '';
            return [i === 0 ? channelName : '', i === 0 ? channelTagsStr : '', vu, views, duration, ''];
          })
        : [[channelName, channelTagsStr, '(Không có video)', 0, '00:00:00', '']];
    rows.forEach(row => sheet.addRow(row));
  }

  sheet.columns = [{ width: 25 }, { width: 20 }, { width: 45 }, { width: 20 }, { width: 20 }, { width: 25 }];

  const listFormula = `"${TRANG_THAI_OPTIONS.filter(Boolean).join(',')}"`;
  for (let i = 2; i <= sheet.rowCount; i++) {
    sheet.getCell(`F${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [listFormula],
    };
  }

  await workbook.xlsx.writeFile(outputExcelPath);
  console.log(`[addChannelFromForm] Đã ghi/cập nhật ${outputExcelPath}`);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDD = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowMM = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowYYYY = tomorrow.getFullYear();
  const latestUploadDate = `${tomorrowDD}/${tomorrowMM}/${tomorrowYYYY}`;

  const configPath = path.join(channelDir, 'mavid-channel-config.json');
  let config;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn(`[addChannelFromForm] Lỗi đọc config cũ: ${e.message}`);
    }
  }

  const newChannelsConfig = channelsConfig.map(ch => ({
    ...ch,
    lastUpload: lastUpload || '',
    uploadedVideos: 0,
    latestUploadDate,
    latestUploadTime: '00:00',
  }));

  if (config) {
    if (!Array.isArray(config.channels)) config.channels = [];
    config.channels.push(...newChannelsConfig);
    config.channelUrl = url;
    config.channelLink = channelLink;
    config.channelName = channelName;
  } else {
    config = {
      version: 1,
      channels: newChannelsConfig,
      channelUrl: url,
      channelLink,
      channelName,
      folderId: folderName,
      youtube: {
        usernameId,
        channelId: result.metadata?.channel_id || null,
      },
      createdAt: new Date().toISOString(),
    };
  }

  // Xóa các trường upload ở root-level (đã chuyển vào từng channel trong mảng)
  delete config.lastUpload;
  delete config.uploadedVideos;
  delete config.latestUploadDate;
  delete config.latestUploadTime;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`[addChannelFromForm] Đã ghi/cập nhật ${configPath}`);

  const f = channelItem.durationMinuteFrom;
  const t = channelItem.durationMinuteTo;
  let durationLabel = 'Tất cả';
  if (f === 0 && t === 30) durationLabel = '0 - 30 phút';
  else if (f === 0 && t === 60) durationLabel = '0 - 60 phút';
  else if (f === 30 && t === 60) durationLabel = '30 - 60 phút';
  else if (f === 30 && t === null) durationLabel = 'Từ 30 phút';
  else if (f === 60 && t === null) durationLabel = 'Từ 60 phút';

  await updateIndexFile({
    name: channelName,
    link: channelLink,
    id: folderName,
    lastUpload,
    email: seedEmail,
    videoType: channelItem.videoType,
    durationMinutes: durationLabel,
    background:
      channelItem.videoType === 'reup_full'
        ? String(channelItem.overlay ?? channelItem.background ?? '').trim()
        : String(channelItem.background ?? '').trim(),
  });
  console.log(`[addChannelFromForm] Đã cập nhật ${path.relative(path.join(__dirname, '..'), INDEX_FILE)}`);

  return {
    success: true,
    processedCount: 1,
    results: [
      {
        url,
        type: urlType,
        channelName: result.name,
        channelId: folderName,
        channelLink,
        videoCount: videoLinks.length,
        outputFile: outputExcelPath,
        configFile: configPath,
        channelFolder: folderName,
      },
    ],
  };
}

/**
 * Main function - có thể gọi từ CLI hoặc UI
 * @param {Object} options - Tùy chọn
 * @param {string} [options.url] - URL YouTube (nếu có, bỏ qua input.txt)
 * @param {string[]} [options.urls] - Danh sách URLs (nếu có, bỏ qua input.txt)
 * @returns {Object} Kết quả xử lý
 */
async function main(options = {}) {
  let urls = [];

  // Nếu có url/urls từ params, dùng trực tiếp
  if (options.url) {
    urls = [options.url];
  } else if (options.urls && Array.isArray(options.urls)) {
    urls = options.urls;
  } else {
    // Fallback: đọc từ input.txt (cho CLI)
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error('Không tìm thấy file input.txt và không có URL trong params.');
    }
    const content = fs.readFileSync(INPUT_FILE, 'utf-8').trim();
    urls = content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && (l.startsWith('http://') || l.startsWith('https://')));
  }

  if (urls.length === 0) {
    throw new Error('Không có link hợp lệ. Chỉ chấp nhận link bắt đầu bằng http:// hoặc https://');
  }

  const results = [];

  for (const url of urls) {
    const urlType = detectUrlType(url);

    if (urlType === 'video') {
      // Nếu là video, gọi downloadVideo
      const { default: downloadVideo } = await import('./downloadVideo.js');
      const videoResult = await downloadVideo({ url });
      results.push({ url, type: 'video', result: videoResult });
      continue;
    }

    console.log(`Đang xử lý: ${url}`);
    console.log(`Loại: ${urlType}`);

    const result = await getChannelInfo(url);

    // Cập nhật index.xlsx
    // ID người dùng (không có @)
    let usernameId = result.metadata?.uploader_id || '';
    if (usernameId.startsWith('@')) usernameId = usernameId.slice(1);
    if (!usernameId) {
      const uh = handleFromYoutubeAtUrl(url);
      if (uh) usernameId = uh;
    }
    if (!usernameId && result.metadata?.uploader_url) {
      const uh = handleFromYoutubeAtUrl(result.metadata.uploader_url);
      if (uh) usernameId = uh;
    }
    if (!usernameId) usernameId = result.metadata?.channel_id || '';

    // Link channel theo ID người dùng
    const channelLink =
      usernameId && !usernameId.startsWith('UC')
        ? `https://www.youtube.com/@${usernameId}`
        : result.metadata?.uploader_url || result.metadata?.channel_url || url;

    // Lấy ngày upload mới nhất (video đầu tiên trong list là mới nhất)
    let lastUpload = '';
    if (result.video_links && result.video_links.length > 0) {
      // video_links chưa reverse nên [0] là video mới nhất
      const latestVideo = result.video_links[0];
      if (latestVideo?.upload_date) {
        // Format: YYYYMMDD -> YYYY-MM-DD
        const d = latestVideo.upload_date;
        lastUpload = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      }
    }

    const excelFilename = resolveChannelFolderNameFromResult(url, result);

    await updateIndexFile({
      name: result.name || '',
      link: channelLink,
      id: excelFilename,
      lastUpload,
    });

    // Tạo dữ liệu: mỗi video một dòng (đảo ngược: cũ ở đầu, mới ở cuối)
    const headers = ['EMAIL', 'CHANNEL NAME', 'CHANNEL TAGS', 'LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS', 'START FROM'];
    const videoLinks = [...(result.video_links || [])].reverse();

    const channelName = result.name || '';
    const channelTagsStr = (result.tags || []).join(', ');

    // Thư mục lưu kết quả: MaVidMedia/channels/<Tên người dùng>/
    const channelDir = path.join(DEFAULT_OUTPUT_DIR, excelFilename);
    const outputExcelPath = path.join(channelDir, `${excelFilename}.xlsx`);

    let workbook;
    let sheet;
    let startRowIndex = 2;

    if (fs.existsSync(outputExcelPath)) {
      console.log(`\nFILE EXCEL CHO KÊNH NÀY ĐÃ TỒN TẠI! (${excelFilename}/${excelFilename}.xlsx) Đang kiểm tra video mới...`);
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(outputExcelPath);
      sheet = workbook.worksheets[0];

      const headerRow = sheet.getRow(1);
      const videoIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'link video');
      if (videoIdx < 0) throw new Error('Không tìm thấy cột LINK VIDEO trong file hiện tại.');
      const col8Header = String(headerRow.getCell(8).value || '')
        .trim()
        .toUpperCase();
      const legacyBackgroundColumn = col8Header === 'BACKGROUND VIDEO';

      const existingUrls = new Set();
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const rawVal = row.getCell(videoIdx).value;
        const val =
          rawVal && typeof rawVal === 'object' ? String(rawVal.text || rawVal.hyperlink || '').trim() : String(rawVal || '').trim();
        if (val) existingUrls.add(val);
      }

      const newVideos = videoLinks.filter(v => {
        const url = typeof v === 'string' ? v : v?.url || '';
        return url && !existingUrls.has(url);
      });

      if (newVideos.length === 0) {
        console.log('Không có video mới nào.');
        results.push({
          url,
          type: urlType,
          channelName: result.name,
          channelId: excelFilename,
          channelLink,
          videoCount: 0,
          newVideos: 0,
          message: 'Không có video mới',
        });
        continue;
      }

      console.log(`Tìm thấy ${newVideos.length} video mới. Đang thêm vào cuối file...`);
      startRowIndex = sheet.rowCount + 1;
      newVideos.forEach(video => {
        const url = video?.url || '';
        const views = video?.viewCount || 0;
        const duration = video?.duration || '';
        if (legacyBackgroundColumn) {
          sheet.addRow(['', '', '', url, views, duration, '', '', '']);
        } else {
          sheet.addRow(['', '', '', url, views, duration, '', '']);
        }
      });
    } else {
      const rows =
        videoLinks.length > 0
          ? videoLinks.map((video, i) => {
              const url = video?.url || '';
              const views = video?.viewCount || 0;
              const duration = video?.duration || '';
              return ['', i === 0 ? channelName : '', i === 0 ? channelTagsStr : '', url, views, duration, '', ''];
            })
          : [['', channelName, channelTagsStr, '(Không có video)', 0, '00:00:00', '', '']];

      if (!fs.existsSync(channelDir)) {
        fs.mkdirSync(channelDir, { recursive: true });
      }

      workbook = new ExcelJS.Workbook();
      sheet = workbook.addWorksheet('Kênh YouTube', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.addRow(headers);
      rows.forEach(row => sheet.addRow(row));

      // Độ rộng cột: EMAIL | CHANNEL NAME | CHANNEL TAGS | LINK VIDEO | VIEWS | DURATION | STATUS | START FROM
      sheet.columns = [
        { width: 20 }, // EMAIL
        { width: 25 }, // CHANNEL NAME
        { width: 20 }, // CHANNEL TAGS
        { width: 45 }, // LINK VIDEO
        { width: 12 }, // VIEWS
        { width: 12 }, // DURATION
        { width: 20 }, // STATUS
        { width: 12 }, // START FROM
      ];
    }

    // Thêm hoặc cập nhật data validation cho tất cả các dòng dữ liệu (cả cũ và mới)
    const backgroundsDirForSheet = resolveStockBackgroundsDir();
    let bgOptions = [];
    if (fs.existsSync(backgroundsDirForSheet)) {
      bgOptions = fs.readdirSync(backgroundsDirForSheet).filter(f => fs.statSync(path.join(backgroundsDirForSheet, f)).isDirectory());
    }

    const listFormula = `"${TRANG_THAI_OPTIONS.filter(Boolean).join(',')}"`;
    const row1ForValidation = sheet.getRow(1);
    const legacyBgForValidation =
      String(row1ForValidation.getCell(8).value || '')
        .trim()
        .toUpperCase() === 'BACKGROUND VIDEO';

    for (let i = 2; i <= sheet.rowCount; i++) {
      sheet.getCell(`G${i}`).dataValidation = {
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
  }

  return {
    success: true,
    processedCount: results.length,
    results,
  };
}

export default main;
