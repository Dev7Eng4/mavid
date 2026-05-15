/**
 * Đồng bộ dữ liệu sau khi upload YouTube thành công (GPM / script upload):
 * - `mavid-channel-config.json`: uploadedVideos, latestUploadDate, latestUploadTime (theo email hoặc `channels[]` chỉ có 1 phần tử).
 *   Có thể gọi từng bước: `successfulFolderNames` 1 phần tử + `latestScheduleSlot` mốc vừa xong → tăng +1 và ghi mốc mới ngay.
 * - Excel/CSV kênh: cột STATUS cho các dòng khớp LINK VIDEO ↔ thư mục video.
 * - `channels/index.xlsx`: cột LAST UPLOAD (bước cuối, sau khi xử lý STATUS ở file kênh).
 */

import fs from 'fs';
import path from 'path';
import { CHANNEL_CONFIG_FILENAME, getChannelDirPath, getListMappingPath } from '../api/urls/getListAllPaths.js';
import { CHANNELS } from '../constants/channel.js';
import { pickChronologicallyLatestSlot } from './publishScheduleByDuration.util.js';
import { getChannelConfig } from '../api/channels/getChannelConfig.js';

export const MAVID_CHANNEL_CONFIG_FILENAME = CHANNEL_CONFIG_FILENAME;

/** Giá trị ghi vào cột STATUS (khớp validation list trong file kênh). */
export const STATUS_DA_DANG_VIDEO = 'Đã đăng video';

const LOG = '[afterUpload]';

/**
 * Ghi cột LAST UPLOAD trên `channels/index.xlsx` cho đúng dòng kênh (cột ID hoặc CHANNEL).
 * @param {string} id
 * @param {string} lastUploadText — cùng nguồn với mavid-channel-config (DD/MM/YYYY [HH:mm])
 */
async function updateChannelsIndexLastUpload(id, lastUploadText) {
  const text = String(lastUploadText || '').trim();
  if (!text) return;

  const indexPath = getListMappingPath();
  if (!fs.existsSync(indexPath)) {
    console.warn(`${LOG} Không có channels/index.xlsx — bỏ qua LAST UPLOAD.`);
    return;
  }

  try {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(indexPath);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) return;

    const headerRow = sheet.getRow(1);
    const vals = headerRow.values || [];

    const idCol = CHANNELS.find(c => c.key === 'id').index;
    const lastUploadCol = CHANNELS.find(c => c.key === 'lastUpload').index;

    let updated = 0;
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      let cellVal = '';
      const v = row.getCell(idCol).value;
      cellVal = String(v ?? '').trim();

      if (cellVal !== id) continue;
      row.getCell(lastUploadCol).value = text;
      updated++;
    }

    if (updated === 0) {
      console.warn(`${LOG} index.xlsx: không có dòng ID/CHANNEL trùng «${channelFolder}» — không ghi LAST UPLOAD.`);
      return;
    }

    await workbook.xlsx.writeFile(indexPath);
    console.log(`${LOG} index.xlsx: LAST UPLOAD = «${text}» (${updated} dòng).`);
  } catch (e) {
    console.warn(`${LOG} index.xlsx LAST UPLOAD:`, e instanceof Error ? e.message : e);
  }
}

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

/**
 * @param {{ date?: string, time?: string } | null | undefined} slot
 * @returns {slot is { date: string, time: string }}
 */
function isNonEmptyScheduleSlot(slot) {
  if (!slot || typeof slot !== 'object') return false;
  return Boolean(String(slot.date ?? '').trim() && String(slot.time ?? '').trim());
}

/**
 * Gán `latestUploadDate` (DD/MM/YYYY) và `latestUploadTime` (HH:mm) từ mốc schedule (MM/DD/YYYY).
 * @param {Record<string, unknown>} ch
 * @param {{ date?: string, time?: string }} slot
 */
function applyLatestUploadFromScheduleSlot(ch, slot) {
  if (!isNonEmptyScheduleSlot(slot)) return;
  ch.latestUploadDate = mmDdYyyyToDdMmYyyy(String(slot.date).trim());
  const tm = String(slot.time).trim();
  const tp = tm.split(':');
  const hh = String(Math.min(23, Math.max(0, parseInt(tp[0], 10) || 0))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parseInt(tp[1] ?? '0', 10) || 0))).padStart(2, '0');
  ch.latestUploadTime = `${hh}:${mm}`;
}

/**
 * Chọn dòng `channels[]` để cập nhật sau upload: theo email nếu có; không có email thì chỉ khi đúng 1 phần tử.
 * @param {object} cfg
 * @param {string} id
 * @returns {{ idx: number, label: string }}
 */
function resolveChannelRowIndexForAfterUpload(cfg, id) {
  if (!Array.isArray(cfg.channels)) return -1;
  if (id) {
    const idx = cfg.channels.findIndex(
      ch =>
        String(ch?.id || '')
          .trim()
          .toLowerCase() === id
    );
    return idx >= 0 ? idx : -1;
  }
  return cfg.channels.length === 1 ? 0 : -1;
}

/**
 * Mốc schedule cho `latestUpload*`: ưu tiên `latestScheduleSlot` (video thành công cuối) nếu caller truyền key này;
 * nếu không truyền key — hành vi cũ: phần tử cuối của `publishSchedule`.
 * @param {SyncChannelAfterYoutubeUploadParams} p
 * @returns {{ date: string, time: string } | null}
 */
function resolveLatestScheduleSlotForConfig(p) {
  if ('latestScheduleSlot' in p) {
    const s = p.latestScheduleSlot;
    return isNonEmptyScheduleSlot(s) ? /** @type {{ date: string, time: string }} */ (s) : null;
  }
  const arr = Array.isArray(p.publishSchedule) ? p.publishSchedule : [];
  const best = pickChronologicallyLatestSlot(arr);
  return isNonEmptyScheduleSlot(best) ? /** @type {{ date: string, time: string }} */ (best) : null;
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
 * @property {string} [email] — khớp `channels[].email`; nếu thiếu và `channels.length === 1` thì cập nhật phần tử đó
 * @property {string[]} successfulFolderNames — thư mục con video đã upload + schedule xong
 * @property {Array<{ date: string, time: string, iso?: string }> | null} [publishSchedule] — lịch theo từng job (GPM)
 * @property {{ date?: string, time?: string } | null} [latestScheduleSlot] — mốc schedule của video upload thành công **cuối cùng**; nếu có key (kể cả `null`) thì không dùng phần tử cuối của toàn bộ `publishSchedule`
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

  const channelAbs = getChannelDirPath(p.channelFolder);
  /** Chuỗi LAST UPLOAD cho `channels/index.xlsx` (DD/MM/YYYY [HH:mm]) — ghi ở bước cuối sau STATUS. */
  let indexLastUploadText = '';

  try {
    const cfg = await getChannelConfig(p.channelFolder);
    const idx = resolveChannelRowIndexForAfterUpload(cfg, p.id);
    if (idx < 0) {
      throw new Error(
        p.id
          ? `Không tìm thấy id «${p.id}» trong mavid-channel-config.`
          : 'Thiếu id và channels[] có ≠ 1 phần tử — không chọn được dòng để cập nhật uploadedVideos / latestUpload*.'
      );
    }
    const ch = { ...cfg.channels[idx] };
    const prev = Number.isFinite(Number(ch.uploadedVideos)) ? Math.max(0, Math.floor(Number(ch.uploadedVideos))) : 0;
    ch.uploadedVideos = prev + n;
    const slotForLatest = resolveLatestScheduleSlotForConfig(p);
    if (slotForLatest) applyLatestUploadFromScheduleSlot(ch, slotForLatest);
    cfg.channels[idx] = ch;
    const configPath = path.join(channelAbs, MAVID_CHANNEL_CONFIG_FILENAME);
    fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');

    /** Giống `latestUploadDate` / `latestUploadTime` vừa ghi vào JSON — chỉ khi có mốc schedule (không dùng giá trị cũ trong config). */
    indexLastUploadText =
      slotForLatest && ch.latestUploadDate != null && String(ch.latestUploadDate).trim()
        ? `${String(ch.latestUploadDate).trim()}${
            ch.latestUploadTime != null && String(ch.latestUploadTime).trim() ? ` ${String(ch.latestUploadTime).trim()}` : ''
          }`.trim()
        : '';
  } catch (e) {
    console.warn(`${LOG} JSON:`, e instanceof Error ? e.message : e);
  }

  const sheetPath = resolveChannelSpreadsheetPath(channelAbs);
  if (!sheetPath) {
    console.warn(`${LOG} Không tìm thấy .xlsx/.csv trong thư mục kênh — bỏ qua STATUS.`);
  } else {
    const wanted = new Set(p.successfulFolderNames.map(f => String(f).trim().toLowerCase()).filter(Boolean));

    try {
      const lower = sheetPath.toLowerCase();
      if (lower.endsWith('.xlsx')) {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(sheetPath);
        const sheet = workbook.worksheets[0];
        if (!sheet || sheet.rowCount < 2) {
          /* bỏ qua STATUS */
        } else {
          const headerRow = sheet.getRow(1);
          const videoIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'link video');
          const statusIdx = headerRow.values.findIndex(v =>
            String(v || '')
              .toLowerCase()
              .includes('status')
          );
          if (videoIdx < 1 || statusIdx < 1) {
            console.warn(`${LOG} Excel: không tìm thấy cột LINK VIDEO hoặc STATUS.`);
          } else {
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
          }
        }
      } else if (lower.endsWith('.csv')) {
        const content = fs.readFileSync(sheetPath, 'utf-8').replace(/^\uFEFF/, '');
        const lines = content
          .split('\n')
          .map(l => l.trimEnd())
          .filter(l => l.trim());
        if (lines.length < 2) {
          /* bỏ qua STATUS */
        } else {
          const parseLine = line => line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const headers = parseLine(lines[0]);
          const videoIdx = headers.findIndex(h => h.toLowerCase() === 'link video');
          const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
          if (videoIdx < 0 || statusIdx < 0) {
            console.warn(`${LOG} CSV: không tìm thấy cột LINK VIDEO hoặc STATUS.`);
          } else {
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
                cells
                  .map(c => {
                    const s = String(c ?? '');
                    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
                  })
                  .join(',')
              );
            }
            fs.writeFileSync(sheetPath, out.join('\n'), 'utf-8');
            console.log(`${LOG} CSV ${path.basename(sheetPath)}: ${updated} dòng STATUS = «${STATUS_DA_DANG_VIDEO}».`);
          }
        }
      }
    } catch (e) {
      console.warn(`${LOG} spreadsheet:`, e instanceof Error ? e.message : e);
    }
  }

  await updateChannelsIndexLastUpload(p.id, indexLastUploadText);
}

/** Alias tên cũ — tránh gãy code gọi trực tiếp. */
export const updateChannelConfigInfo = syncChannelAfterYoutubeUpload;
