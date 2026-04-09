/**
 * Đồng bộ dữ liệu sau khi upload YouTube thành công (GPM / script upload):
 * - `mavid-channel-config.json`: uploadedVideos, latestUploadDate, latestUploadTime (theo email).
 * - Excel/CSV kênh: cột STATUS cho các dòng khớp LINK VIDEO ↔ thư mục video.
 *
 * Tách khỏi `youtubeUploadViaGpm.js` để dễ bảo trì và tái sử dụng (CLI, test, script khác).
 */

import fs from 'fs';
import path from 'path';
import { resolveChannelsDir } from './channelsStoragePath.js';
import { readMavidChannelConfigFile } from './youtube.util.js';

export const MAVID_CHANNEL_CONFIG_FILENAME = 'mavid-channel-config.json';

/** Giá trị ghi vào cột STATUS (khớp validation list trong file kênh). */
export const STATUS_DA_DANG_VIDEO = 'Đã đăng video';

const LOG = '[afterUpload]';

/** @param {unknown} rawVal */
function extractUrlFromCell(rawVal) {
  if (rawVal == null) return '';
  if (typeof rawVal === 'object' && rawVal !== null) {
    const o = /** @type {{ text?: string; hyperlink?: string }} */ (rawVal);
    return String(o.text || o.hyperlink || '').trim();
  }
  return String(rawVal).trim();
}

/**
 * MM/DD/YYYY (schedule) → DD/MM/YYYY trong mavid-channel-config (đồng bộ getInfoChannel / `parseDdMmYyyy`).
 * @param {string} s
 */
function mmDdYyyyToDdMmYyyy(s) {
  const m = String(s ?? '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return String(s ?? '').trim();
  const mm = parseInt(m[1], 10);
  const dd = parseInt(m[2], 10);
  const yyyy = m[3];
  if (!Number.isFinite(mm) || !Number.isFinite(dd)) return String(s ?? '').trim();
  return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
}

/** @param {string} url @param {string} folderName */
function linkUrlMatchesFolderId(url, folderName) {
  const u = String(url).trim().toLowerCase();
  const id = String(folderName).trim().toLowerCase();
  if (!id || (!u.startsWith('http://') && !u.startsWith('https://'))) return false;
  return u.includes(id);
}

/** File .xlsx / .csv đầu tiên trong thư mục kênh (ưu tiên .xlsx) — cùng quy tắc `read-channel-folder-data`. */
export function resolveChannelSpreadsheetPath(channelAbs) {
  if (!fs.existsSync(channelAbs) || !fs.statSync(channelAbs).isDirectory()) return null;
  const names = fs.readdirSync(channelAbs);
  const dataFiles = names
    .filter(f => /\.xlsx$/i.test(f) || /\.csv$/i.test(f))
    .sort((a, b) => {
      const ax = /\.xlsx$/i.test(a);
      const bx = /\.xlsx$/i.test(b);
      if (ax && !bx) return -1;
      if (!ax && bx) return 1;
      return a.localeCompare(b);
    });
  return dataFiles.length ? path.join(channelAbs, dataFiles[0]) : null;
}

/**
 * @typedef {object} SyncChannelAfterYoutubeUploadParams
 * @property {string} channelFolder — tên thư mục kênh (id), đã kiểm tra an toàn ở caller
 * @property {string} [email] — khớp `channels[].email` trong mavid-channel-config
 * @property {string[]} successfulFolderNames — thư mục con video đã upload + schedule xong
 * @property {Array<{ date: string, time: string }> | null} [publishSchedule] — mốc publish; phần tử cuối dùng cho latestUpload*
 */

/**
 * Cập nhật JSON config + spreadsheet kênh sau batch upload thành công.
 * @param {SyncChannelAfterYoutubeUploadParams} p
 */
export async function syncChannelAfterYoutubeUpload(p) {
  const n = p.successfulFolderNames.length;
  if (n === 0) {
    console.log(`${LOG} Bỏ qua — không có video upload thành công.`);
    return;
  }

  const channelAbs = path.join(resolveChannelsDir(), p.channelFolder);
  const email = String(p.email || '').trim();

  if (email) {
    try {
      const cfg = readMavidChannelConfigFile(p.channelFolder);
      if (!Array.isArray(cfg.channels)) throw new Error('channels không phải mảng.');
      const em = email.toLowerCase();
      const idx = cfg.channels.findIndex(ch => String(ch?.email || '').trim().toLowerCase() === em);
      if (idx < 0) throw new Error(`Không tìm thấy email «${email}» trong mavid-channel-config.`);
      const ch = { ...cfg.channels[idx] };
      const prev = Number.isFinite(Number(ch.uploadedVideos)) ? Math.max(0, Math.floor(Number(ch.uploadedVideos))) : 0;
      ch.uploadedVideos = prev + n;
      const last = Array.isArray(p.publishSchedule) && p.publishSchedule.length > 0 ? p.publishSchedule[p.publishSchedule.length - 1] : null;
      if (last && String(last.date || '').trim() && String(last.time || '').trim()) {
        ch.latestUploadDate = mmDdYyyyToDdMmYyyy(last.date);
        const tm = String(last.time).trim();
        const tp = tm.split(':');
        const hh = String(Math.min(23, Math.max(0, parseInt(tp[0], 10) || 0))).padStart(2, '0');
        const mm = String(Math.min(59, Math.max(0, parseInt(tp[1] ?? '0', 10) || 0))).padStart(2, '0');
        ch.latestUploadTime = `${hh}:${mm}`;
      }
      cfg.channels[idx] = ch;
      const configPath = path.join(channelAbs, MAVID_CHANNEL_CONFIG_FILENAME);
      fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
      console.log(
        `${LOG} mavid-channel-config «${email}»: uploadedVideos=${ch.uploadedVideos}, latestUploadDate=${ch.latestUploadDate ?? '—'}, latestUploadTime=${ch.latestUploadTime ?? '—'}`,
      );
    } catch (e) {
      console.warn(`${LOG} JSON:`, e instanceof Error ? e.message : e);
    }
  }

  const sheetPath = resolveChannelSpreadsheetPath(channelAbs);
  if (!sheetPath) {
    console.warn(`${LOG} Không tìm thấy .xlsx/.csv trong thư mục kênh — bỏ qua STATUS.`);
    return;
  }

  const wanted = new Set(p.successfulFolderNames.map(f => String(f).trim().toLowerCase()).filter(Boolean));

  try {
    const lower = sheetPath.toLowerCase();
    if (lower.endsWith('.xlsx')) {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(sheetPath);
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount < 2) return;
      const headerRow = sheet.getRow(1);
      const videoIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'link video');
      const statusIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase().includes('status'));
      if (videoIdx < 1 || statusIdx < 1) {
        console.warn(`${LOG} Excel: không tìm thấy cột LINK VIDEO hoặc STATUS.`);
        return;
      }
      let updated = 0;
      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const url = extractUrlFromCell(row.getCell(videoIdx).value);
        if (!url.startsWith('http://') && !url.startsWith('https://')) continue;
        let hit = false;
        for (const id of wanted) {
          if (linkUrlMatchesFolderId(url, id)) {
            hit = true;
            break;
          }
        }
        if (hit) {
          row.getCell(statusIdx).value = STATUS_DA_DANG_VIDEO;
          updated++;
        }
      }
      await workbook.xlsx.writeFile(sheetPath);
      console.log(`${LOG} Excel ${path.basename(sheetPath)}: ${updated} dòng STATUS = «${STATUS_DA_DANG_VIDEO}».`);
      return;
    }

    if (lower.endsWith('.csv')) {
      const content = fs.readFileSync(sheetPath, 'utf-8').replace(/^\uFEFF/, '');
      const lines = content.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
      if (lines.length < 2) return;
      const parseLine = line => line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const headers = parseLine(lines[0]);
      const videoIdx = headers.findIndex(h => h.toLowerCase() === 'link video');
      const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
      if (videoIdx < 0 || statusIdx < 0) {
        console.warn(`${LOG} CSV: không tìm thấy cột LINK VIDEO hoặc STATUS.`);
        return;
      }
      const out = [lines[0]];
      let updated = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = parseLine(lines[i]);
        while (cells.length < headers.length) cells.push('');
        const url = cells[videoIdx] || '';
        let hit = false;
        if (url.startsWith('http://') || url.startsWith('https://')) {
          for (const id of wanted) {
            if (linkUrlMatchesFolderId(url, id)) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          cells[statusIdx] = STATUS_DA_DANG_VIDEO;
          updated++;
        }
        out.push(
          cells.map(c => {
            const s = String(c ?? '');
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(','),
        );
      }
      fs.writeFileSync(sheetPath, out.join('\n'), 'utf-8');
      console.log(`${LOG} CSV ${path.basename(sheetPath)}: ${updated} dòng STATUS = «${STATUS_DA_DANG_VIDEO}».`);
    }
  } catch (e) {
    console.warn(`${LOG} spreadsheet:`, e instanceof Error ? e.message : e);
  }
}

/** Alias tên cũ — tránh gãy code gọi trực tiếp. */
export const updateChannelConfigInfo = syncChannelAfterYoutubeUpload;
