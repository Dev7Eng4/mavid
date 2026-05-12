import ExcelJS from 'exceljs';
import fs from 'fs';
import { mapIndexDataToProps } from '../../constants/indexColumnMapping.js';
import { getListMappingPath } from '../urls/getListAllPaths.js';
import { CHANNELS } from '../../constants/channel.js';

/**
 * Trích chuỗi an toàn từ một ô Excel (xử lý rich text / hyperlink / formula / object).
 * @param {import('exceljs').Cell} cell
 * @returns {string | number | boolean | Date | null}
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
 * Đọc toàn bộ dữ liệu của một worksheet thành `{ headers, rows }`.
 * Bảo toàn các cột rỗng ở header để tránh lệch dữ liệu (vd. STATUS rơi vào LAST UPLOAD).
 *
 * @param {import('exceljs').Worksheet} sheet
 * @returns {{ headers: string[], rows: Record<string, unknown>[] }}
 */
function extractSheetData(sheet) {
  if (!sheet) return { headers: [], rows: [] };

  let maxCol = 0;
  for (let rowNum = 1; rowNum <= sheet.rowCount; rowNum++) {
    sheet.getRow(rowNum).eachCell((_cell, colNumber) => {
      if (colNumber > maxCol) maxCol = colNumber;
    });
  }
  if (maxCol < 1) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers = [];
  for (let c = 1; c <= maxCol; c++) {
    const cell = headerRow.getCell(c);
    const raw = cell.text ?? cell.value;
    const text = raw == null ? '' : String(raw).trim();
    headers.push(text || `Col${c}`);
  }

  const rows = [];
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const obj = {};
    let hasAny = false;
    for (let c = 1; c <= maxCol; c++) {
      const key = headers[c - 1] || `Col${c}`;
      const cell = row.getCell(c);
      const val = readCellValue(cell);
      if (val !== '' && val != null) hasAny = true;
      obj[key] = val;
    }
    if (hasAny) rows.push(obj);
  }

  return { headers, rows };
}

export const convertChannelRowToObject = (row, columns = CHANNELS) => {
  return columns.reduce((result, column) => {
    result[column.key] = row[column.label] ?? '';
    return result;
  }, {});
};

export const convertChannelRowsToObjects = (rows, columns = CHANNELS) => {
  return rows.map(row => convertChannelRowToObject(row, columns));
};

/**
 * Đọc toàn bộ dữ liệu file `channels/index.xlsx`.
 *
 * @param {Object} [options]
 * @param {string} [options.filePath] — Đường dẫn tuỳ chọn; mặc định `channels/index.xlsx`.
 * @param {boolean} [options.mapToProps=true] — Map Excel header → camelCase prop.
 * @param {string | number} [options.sheet=0] — Index hoặc tên sheet cần đọc (mặc định sheet đầu).
 * @returns {Promise<{ filePath: string, headers: string[], rows: Record<string, unknown>[] }>}
 */
export async function getListAllMapping({ mapToProps = true, sheet = 0 } = {}) {
  const absPath = getListMappingPath();

  if (!fs.existsSync(absPath)) {
    return { filePath: absPath, headers: [], rows: [] };
  }
  if (fs.statSync(absPath).size === 0) {
    return { filePath: absPath, headers: [], rows: [] };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absPath);

  const ws = typeof sheet === 'string' ? workbook.getWorksheet(sheet) : workbook.worksheets[sheet] ?? workbook.worksheets[0];

  const raw = extractSheetData(ws);
  const data = mapToProps ? mapIndexDataToProps(raw) : raw;

  return {
    list: convertChannelRowsToObjects(data.rows),
  };
}

export default getListAllMapping;
