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
 */
export async function syncProgressStatusToSpreadsheet(inputFile, progressData) {
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.warn('[sync] Không có file spreadsheet, bỏ qua đồng bộ STATUS.');
    return;
  }
  const pd = progressData && typeof progressData === 'object' ? progressData : {};
  const hasAny = Object.keys(pd).some(k => pd[k]?.status);
  if (!hasAny) {
    console.log('[sync] progress không có status để ghi, bỏ qua.');
    return;
  }

  const lower = inputFile.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputFile);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      console.warn('[sync] Excel không có dữ liệu.');
      return;
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
      return;
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
    return;
  }

  if (lower.endsWith('.csv')) {
    const content = fs.readFileSync(inputFile, 'utf-8').replace(/^\uFEFF/, '');
    const lines = content.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
    if (lines.length < 2) return;
    const parseLine = line => line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const headers = parseLine(lines[0]);
    const videoIdx = headers.findIndex(h => h.toLowerCase() === 'link video');
    const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
    if (videoIdx < 0 || statusIdx < 0) {
      console.warn('[sync] CSV: không tìm thấy LINK VIDEO hoặc STATUS.');
      return;
    }
    const out = [lines[0]];
    let updated = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      while (cells.length < headers.length) cells.push('');
      const url = cells[videoIdx] || '';
      const entry = pd[url];
      if (entry?.status && (url.startsWith('http://') || url.startsWith('https://'))) {
        cells[statusIdx] = entry.status;
        updated++;
      }
      out.push(
        cells.map(c => {
          const s = String(c ?? '');
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','),
      );
    }
    fs.writeFileSync(inputFile, out.join('\n'), 'utf-8');
    console.log(`[sync] Đã đồng bộ STATUS từ progress → ${path.basename(inputFile)} (${updated} dòng CSV).`);
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
  await syncProgressStatusToSpreadsheet(inputFile, pd);
}
