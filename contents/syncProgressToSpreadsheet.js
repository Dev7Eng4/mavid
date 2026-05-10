/**
 * Ghi cột STATUS trong file Excel/CSV từ progressData (key = URL đầy đủ như trong *_progress.json).
 */
import fs from 'fs';
import path from 'path';

function extractUrlFromCell(rawVal) {
  if (rawVal == null) return '';
  if (typeof rawVal === 'object') {
    return String(rawVal.text || rawVal.hyperlink || '').trim();
  }
  return String(rawVal).trim();
}

/**
 * @param {string} inputFile - .xlsx hoặc .csv
 * @param {Record<string, { status?: string }>} progressData
 * @returns {Promise<boolean>} true nếu đã ghi file spreadsheet
 */
export async function syncProgressStatusToSpreadsheet(inputFile, progressData) {
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.warn('[sync] Không có file spreadsheet, bỏ qua đồng bộ STATUS.');
    return false;
  }
  const pd = progressData && typeof progressData === 'object' ? progressData : {};
  const hasAny = Object.keys(pd).some(k => pd[k]?.status);
  if (!hasAny) {
    console.log('[sync] progress không có status để ghi, bỏ qua.');
    return false;
  }

  const lower = inputFile.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputFile);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      console.warn('[sync] Excel không có dữ liệu.');
      return false;
    }
    const headerRow = sheet.getRow(1);
    const videoIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'link video');
    const statusIdx = headerRow.values.findIndex(v =>
      String(v || '')
        .toLowerCase()
        .includes('status'),
    );
    if (videoIdx < 1 || statusIdx < 1) {
      console.warn('[sync] Excel: không tìm thấy cột LINK VIDEO hoặc STATUS.');
      return false;
    }
    let updated = 0;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const url = extractUrlFromCell(row.getCell(videoIdx).value);
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) continue;
      const entry = pd[url];
      if (entry?.status) {
        row.getCell(statusIdx).value = entry.status;
        updated++;
      }
    }
    await workbook.xlsx.writeFile(inputFile);
    console.log(`[sync] Đã đồng bộ STATUS từ progress → ${path.basename(inputFile)} (${updated} dòng).`);
    return true;
  }

  return false;
}

/** Xóa `<tên>.xlsx|csv` → `<tên>_progress.json` sau khi đã ghi STATUS xong. */
export function unlinkProgressSidecarForSpreadsheet(inputFile) {
  if (!inputFile || typeof inputFile !== 'string') return;
  if (!/\.(xlsx|csv)$/i.test(inputFile)) return;
  const progressPath = inputFile.replace(/\.(xlsx|csv)$/i, '_progress.json');
  try {
    if (fs.existsSync(progressPath)) {
      fs.unlinkSync(progressPath);
      console.log(`[sync] Đã xóa ${path.basename(progressPath)}.`);
    }
  } catch (e) {
    console.warn('[sync] Không xóa được file progress:', e.message);
  }
}

/**
 * Đọc *_progress.json cạnh file dữ liệu rồi ghi STATUS vào Excel/CSV.
 * @param {string|null|undefined} inputFile
 */
export async function syncProgressFromFileToSpreadsheet(inputFile) {
  if (!inputFile || typeof inputFile !== 'string') return;
  if (!/\.(xlsx|csv)$/i.test(inputFile)) return;
  const progressPath = inputFile.replace(/\.(xlsx|csv)$/i, '_progress.json');
  if (!fs.existsSync(progressPath)) {
    console.log('[sync] Không có file progress, bỏ qua đồng bộ Excel.');
    return;
  }
  let pd = {};
  try {
    pd = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  } catch (e) {
    console.warn('[sync] Không đọc được progress.json:', e.message);
    return;
  }
  const wrote = await syncProgressStatusToSpreadsheet(inputFile, pd);
  if (wrote && fs.existsSync(progressPath)) {
    try {
      fs.unlinkSync(progressPath);
      console.log(`[sync] Đã xóa ${path.basename(progressPath)} sau khi ghi STATUS.`);
    } catch (e) {
      console.warn('[sync] Không xóa được file progress:', e.message);
    }
  }
}
