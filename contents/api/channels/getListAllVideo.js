import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { CHANNEL_DETAIL } from '../../constants/channel.js';
import { getChannelDirPath } from '../urls/getListAllPaths.js';
import { assertSafeChannelFolder } from '../../youtube/channelFolder.util.js';

/**
 * @param {import('exceljs').Cell} cell
 * @returns {string | number | boolean | Date}
 */
function readCellValue(cell) {
  const raw = cell?.value;
  if (raw == null) return '';
  if (raw instanceof Date) return raw;
  if (typeof raw === 'object') {
    const o = /** @type {{ text?: string; hyperlink?: string; result?: unknown; richText?: Array<{ text?: string }> }} */ (raw);
    if (typeof o.result !== 'undefined' && o.result !== null) return /** @type {string | number | boolean} */ (o.result);
    if (Array.isArray(o.richText)) return o.richText.map(r => r?.text ?? '').join('');
    return String(o.text || o.hyperlink || '');
  }
  return raw;
}

/**
 * Chọn file .xlsx trong `MaVidMedia/channels/{channelId}/`.
 * Ưu tiên `{channelId}.xlsx`; không có thì lấy file .xlsx đầu sau khi sort tên.
 * @param {string} channelDir
 * @returns {string | null} đường dẫn tuyệt đối
 */
function pickChannelXlsxPath(channelDir) {
  if (!fs.existsSync(channelDir) || !fs.statSync(channelDir).isDirectory()) return null;
  const names = fs
    .readdirSync(channelDir)
    .filter(f => /\.xlsx$/i.test(f))
    .sort((a, b) => a.localeCompare(b));
  if (names.length === 0) return null;
  const base = path.basename(channelDir);
  const preferred = `${base}.xlsx`;
  const hit = names.find(n => n.toLowerCase() === preferred.toLowerCase());
  return path.join(channelDir, hit || names[0]);
}

/**
 * Đọc danh sách video từ Excel trong thư mục kênh (`MaVidMedia/channels/{channelId}/*.xlsx`).
 *
 * @param {Object} params
 * @param {string} params.channelId — tên thư mục kênh (id), an toàn: không `..` / `/` / `\`
 * @param {number | string} [params.sheet=0] — index hoặc tên sheet
 * @returns {Promise<{
 *   channelId: string;
 *   filePath: string | null;
 *   list: Array<{ link: string; views: string | number; duration: string | number; status: string }>;
 * }>}
 */
export async function getListAllVideo({ channelId, sheet = 0 }) {
  const id = assertSafeChannelFolder(channelId);
  const channelDir = getChannelDirPath(id);
  const filePath = pickChannelXlsxPath(channelDir);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    return { channelId: id, filePath: filePath || null, list: [] };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = typeof sheet === 'string' ? workbook.getWorksheet(sheet) : workbook.worksheets[sheet] ?? workbook.worksheets[0];
  if (!ws || ws.rowCount < 2) {
    return { channelId: id, filePath, list: [] };
  }

  const list = [];

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    /** @type {Record<string, string | number | boolean | Date>} */
    const item = {};
    let hasAny = false;
    for (const def of CHANNEL_DETAIL) {
      const val = readCellValue(row.getCell(def.index));
      item[def.key] = val;
      if (val !== '' && val != null) hasAny = true;
    }
    if (!hasAny) continue;
    const linkStr = String(item.link ?? '').trim();
    if (!linkStr) continue;

    list.push({
      link: linkStr,
      views: item.views ?? '',
      duration: item.duration ?? '',
      status: String(item.status ?? '').trim(),
    });
  }

  return { list };
}

export default getListAllVideo;
