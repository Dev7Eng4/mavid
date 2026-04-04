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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'channels');
const INPUT_FILE = path.join(__dirname, '..', 'input.txt');
const INDEX_FILE = path.join(DEFAULT_OUTPUT_DIR, 'index.xlsx');

/** Options cho cột Trạng thái (dropdown) */
const TRANG_THAI_OPTIONS = ['', 'Đã tạo video', 'Đã đăng video'];

/** index.xlsx: loại video (dropdown) */
const INDEX_VIDEO_TYPE_OPTIONS = ['from_audio', 'reup_full'];

/** index.xlsx: thời lượng video phút (dropdown) */
const INDEX_THOI_GIAN_OPTIONS = [15, 20, 30, 60];

/** Headers cho file index.xlsx */
const INDEX_HEADERS = ['CHANNEL', 'LINK', 'ID', 'EMAIL', 'LOẠI VIDEO', 'THỜI GIAN VIDEO', 'BACKGROUND', 'LAST UPLOAD'];

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
  const backgroundsDir = path.join(__dirname, '..', 'assets', 'backgrounds');
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
 * Cập nhật hoặc thêm channel vào file index.xlsx
 */
async function updateIndexFile(channelData) {
  const { name, link, id, lastUpload } = channelData;

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

    // Đồng bộ dòng tiêu đề nếu thiếu (sau migrate hoặc file chỉnh tay)
    const r1 = sheet.getRow(1);
    if (String(r1.getCell(5).value || '').trim() !== 'LOẠI VIDEO') {
      r1.values = [undefined, ...INDEX_HEADERS];
    }

    // Tìm xem channel đã tồn tại chưa (theo ID - cột 3)
    let existingRowIndex = -1;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const rowId = sheet.getRow(i).getCell(3).value;
      if (rowId === id) {
        existingRowIndex = i;
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Cập nhật row hiện có
      const row = sheet.getRow(existingRowIndex);
      row.getCell(1).value = name;
      row.getCell(2).value = link;
      row.getCell(8).value = lastUpload;
      console.log(`Đã cập nhật channel "${name}" trong index.xlsx`);
    } else {
      // Thêm row mới
      sheet.addRow([name, link, id, '', '', '', '', lastUpload]);
      console.log(`Đã thêm channel "${name}" vào index.xlsx`);
    }

    applyIndexDataValidation(sheet);
  } else {
    // Tạo file mới
    workbook = new ExcelJS.Workbook();
    sheet = workbook.addWorksheet('Channels', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(INDEX_HEADERS);
    sheet.addRow([name, link, id, '', '', '', '', lastUpload]);

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
function detectUrlType(url) {
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
async function getChannelInfo(url) {
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
          .filter(e => e.id && e.id.length === 11)
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
      .filter(e => e.id && e.id.length === 11)
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
    if (!usernameId && result.metadata?.uploader_url) {
      const match = result.metadata.uploader_url.match(/@([a-zA-Z0-9_.-]+)/);
      if (match) usernameId = match[1];
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

    await updateIndexFile({
      name: result.name || '',
      link: channelLink,
      id: usernameId,
      lastUpload,
    });

    // Tạo dữ liệu: mỗi video một dòng (đảo ngược: cũ ở đầu, mới ở cuối)
    const headers = [
      'EMAIL',
      'CHANNEL NAME',
      'CHANNEL TAGS',
      'LINK VIDEO',
      'VIEWS',
      'DURATION',
      'STATUS',
      'BACKGROUND VIDEO',
      'START FROM',
    ];
    const videoLinks = [...(result.video_links || [])].reverse();

    const channelName = result.name || '';
    const channelTagsStr = (result.tags || []).join(', ');

    let excelFilename = 'unknown_id';
    const matchUrl = url.match(/@([a-zA-Z0-9_.-]+)/);
    if (matchUrl) {
      excelFilename = matchUrl[1];
    } else if (result.metadata?.uploader_url && result.metadata.uploader_url.includes('@')) {
      const m2 = result.metadata.uploader_url.match(/@([a-zA-Z0-9_.-]+)/);
      if (m2) excelFilename = m2[1];
    } else if (result.metadata?.uploader_id) {
      excelFilename = result.metadata.uploader_id;
      if (excelFilename.startsWith('@')) excelFilename = excelFilename.substring(1);
    } else if (result.metadata?.channel_id || result.metadata?.id) {
      excelFilename = result.metadata.channel_id || result.metadata.id;
    }

    // Thư mục lưu kết quả: channels/<Tên người dùng>/
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
          channelId: usernameId,
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
        sheet.addRow(['', '', '', url, views, duration, '', '', '']);
      });
    } else {
      const rows =
        videoLinks.length > 0
          ? videoLinks.map((video, i) => {
              const url = video?.url || '';
              const views = video?.viewCount || 0;
              const duration = video?.duration || '';
              return ['', i === 0 ? channelName : '', i === 0 ? channelTagsStr : '', url, views, duration, '', '', ''];
            })
          : [['', channelName, channelTagsStr, '(Không có video)', 0, '00:00:00', '', '', '']];

      if (!fs.existsSync(channelDir)) {
        fs.mkdirSync(channelDir, { recursive: true });
      }

      workbook = new ExcelJS.Workbook();
      sheet = workbook.addWorksheet('Kênh YouTube', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.addRow(headers);
      rows.forEach(row => sheet.addRow(row));

      // Độ rộng cột: email | CHANNEL NAME | CHANNEL TAGS | LINK VIDEO | STATUS | BACKGROUND VIDEO | START FROM
      sheet.columns = [
        { width: 20 }, // EMAIL
        { width: 25 }, // CHANNEL NAME
        { width: 20 }, // CHANNEL TAGS
        { width: 45 }, // LINK VIDEO
        { width: 12 }, // VIEWS
        { width: 12 }, // DURATION
        { width: 20 }, // STATUS
        { width: 22 }, // BACKGROUND VIDEO
        { width: 12 }, // START FROM
      ];
    }

    // Thêm hoặc cập nhật data validation cho tất cả các dòng dữ liệu (cả cũ và mới)
    const backgroundsDir = path.join(__dirname, '..', 'assets', 'backgrounds');
    let bgOptions = [];
    if (fs.existsSync(backgroundsDir)) {
      bgOptions = fs.readdirSync(backgroundsDir).filter(f => fs.statSync(path.join(backgroundsDir, f)).isDirectory());
    }

    const listFormula = `"${TRANG_THAI_OPTIONS.filter(Boolean).join(',')}"`;

    for (let i = 2; i <= sheet.rowCount; i++) {
      // Dropdown STATUS (cột G - index 7)
      sheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [listFormula],
      };

      // Dropdown Background Video (cột H - index 8)
      if (bgOptions.length > 0) {
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
      channelId: usernameId,
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
