/**
 * Quét thư mục kênh: danh sách job upload (.mp4 theo thư mục con).
 */
import fs from 'fs';
import path from 'path';

/**
 * Chuẩn hóa base GPM → origin cho Playwright (bỏ hậu tố /api/v3 nếu có).
 * Thứ tự: tham số → `GPM_API_BASE` → `GPM_API_ORIGIN` → mặc định.
 * @param {string} [explicitBase]
 */
export function apiRootForPlaywright(explicitBase) {
  const explicit = typeof explicitBase === 'string' ? explicitBase.trim() : '';
  const fromEnv = (process.env.GPM_API_BASE || '').trim();
  const s = (explicit || fromEnv).replace(/\/+$/, '');
  if (s.endsWith('/api/v3')) return s.slice(0, -'/api/v3'.length);
  if (s) return s;
  const origin = (process.env.GPM_API_ORIGIN || '').trim().replace(/\/+$/, '');
  return origin || 'http://127.0.0.1:19995';
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
export function firstMp4InDir(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  const files = fs
    .readdirSync(dir)
    .filter(f => /\.mp4$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return files.length ? path.join(dir, files[0]) : null;
}

/** @param {string} name */
export function assertSafeSubfolderName(name) {
  const t = String(name || '').trim();
  if (!t) return null;
  if (t.includes('..') || t.includes('/') || t.includes('\\')) return null;
  return t;
}

/**
 * Đọc cấu hình kênh → lấy durationMinuteFrom / durationMinuteTo theo email.
 * @param {string} channelAbs
 * @param {string} email
 * @returns {{ durationMinuteFrom: number, durationMinuteTo: number | null } | null}
 */
function getDurationBoundsFromConfig(channelAbs, email) {
  const cfgPath = path.join(channelAbs, 'mavid-channel-config.json');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    const list = Array.isArray(cfg.channels) ? cfg.channels : [];
    const norm = String(email || '')
      .trim()
      .toLowerCase();
    let item = null;
    if (norm && list.length > 0) {
      item = list.find(
        c =>
          c &&
          String(c.email || '')
            .trim()
            .toLowerCase() === norm
      );
    }
    if (!item && list.length > 0) item = list[0];
    if (!item) return null;
    const from = Number(item.durationMinuteFrom);
    const to = item.durationMinuteTo != null ? Number(item.durationMinuteTo) : null;
    return {
      durationMinuteFrom: Number.isFinite(from) && from > 0 ? from : 0,
      durationMinuteTo: to != null && Number.isFinite(to) && to > 0 ? to : null,
    };
  } catch {
    return null;
  }
}

/**
 * Parse ô DURATION (HH:mm:ss, mm:ss, số giây) → giây, hoặc null.
 */
function parseDurationCellToSeconds(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const parts = s.split(':').map(p => p.trim());
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const sec = parseFloat(parts[2]);
    if (![h, m].every(x => Number.isFinite(x) && x >= 0) || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(h * 3600 + m * 60 + sec);
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (!Number.isFinite(m) || m < 0 || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(m * 60 + sec);
  }
  return null;
}

/**
 * Trích video ID từ URL YouTube (?v=...).
 * @param {string} url
 * @returns {string | null}
 */
function extractVideoIdFromUrl(url) {
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    if (v && v.trim()) return v.trim();
  } catch {
    /* ignore */
  }
  // Fallback: regex
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1].trim() : null;
}

/**
 * Đọc Excel trong thư mục kênh, lấy danh sách video ID có status "Đã tạo video"
 * và thỏa durationMinuteFrom/durationMinuteTo.
 * @param {string} channelAbs
 * @param {{ durationMinuteFrom: number, durationMinuteTo: number | null } | null} durBounds
 * @returns {Promise<string[]>} — mảng video IDs
 */
async function readVideoIdsWithStatusDone(channelAbs, durBounds) {
  const files = fs.readdirSync(channelAbs).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
  if (files.length === 0) return [];
  const filePath = path.join(channelAbs, files[0]);

  const minSec = durBounds && durBounds.durationMinuteFrom > 0 ? durBounds.durationMinuteFrom * 60 : 0;
  const maxSec = durBounds && durBounds.durationMinuteTo != null && durBounds.durationMinuteTo > 0 ? durBounds.durationMinuteTo * 60 : 0;
  const hasDurFilter = minSec > 0 || maxSec > 0;

  if (filePath.endsWith('.xlsx')) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) return [];

    const headerRow = sheet.getRow(1);
    const videoIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'link video');
    if (videoIdx < 0) return [];
    const statusIdx = headerRow.values.findIndex(v =>
      String(v || '')
        .toLowerCase()
        .includes('status')
    );
    const durationIdx = headerRow.values.findIndex(
      v =>
        String(v || '')
          .trim()
          .toLowerCase() === 'duration'
    );

    const ids = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      // Chỉ lấy dòng có status = "Đã tạo video"
      if (statusIdx >= 0) {
        const status = String(row.getCell(statusIdx).value || '').trim();
        if (status !== 'Đã tạo video') continue;
      } else {
        continue; // Nếu không có cột status thì bỏ qua
      }

      // Lọc theo duration nếu cần
      if (hasDurFilter && durationIdx >= 0) {
        const sec = parseDurationCellToSeconds(row.getCell(durationIdx).value);
        if (sec == null) continue;
        if (minSec > 0 && sec < minSec) continue;
        if (maxSec > 0 && sec > maxSec) continue;
      }

      const rawVal = row.getCell(videoIdx).value;
      const val = rawVal && typeof rawVal === 'object' ? String(rawVal.text || rawVal.hyperlink || '').trim() : String(rawVal || '').trim();

      if (!val || (!val.startsWith('http://') && !val.startsWith('https://'))) continue;

      const videoId = extractVideoIdFromUrl(val);
      if (videoId) ids.push(videoId);
    }
    return ids;
  }

  // CSV fallback
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const videoIdx = headers.findIndex(h => h.toLowerCase() === 'link video');
  if (videoIdx < 0) return [];
  const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
  const durationIdx = headers.findIndex(h => h.trim().toLowerCase() === 'duration');

  const ids = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    if (statusIdx >= 0) {
      const status = (cells[statusIdx] || '').trim();
      if (status !== 'Đã tạo video') continue;
    } else {
      continue;
    }

    if (hasDurFilter && durationIdx >= 0) {
      const sec = parseDurationCellToSeconds(cells[durationIdx]);
      if (sec == null) continue;
      if (minSec > 0 && sec < minSec) continue;
      if (maxSec > 0 && sec > maxSec) continue;
    }

    const val = cells[videoIdx] || '';
    if (!val || (!val.startsWith('http://') && !val.startsWith('https://'))) continue;

    const videoId = extractVideoIdFromUrl(val);
    if (videoId) ids.push(videoId);
  }
  return ids;
}

/**
 * Danh sách thư mục con có .mp4.
 * - Có `folderNamesOrder`: theo đúng thứ tự danh sách (chỉ thư mục có .mp4), tối đa `maxUploads` nếu có.
 * - Không có: đọc Excel lấy video ID có status "Đã tạo video" + lọc duration → kiểm tra folder + .mp4.
 * @param {string} channelAbs
 * @param {string} email
 * @param {number | null} maxUploads
 * @param {string[] | null | undefined} folderNamesOrder
 */
export async function listUploadJobs(channelAbs, email, maxUploads, folderNamesOrder) {
  if (!fs.existsSync(channelAbs)) throw new Error(`Không tìm thấy thư mục kênh: ${channelAbs}`);

  if (Array.isArray(folderNamesOrder) && folderNamesOrder.length > 0) {
    const jobs = [];
    for (const raw of folderNamesOrder) {
      const name = assertSafeSubfolderName(raw);
      if (!name) continue;
      const sub = path.join(channelAbs, name);
      const mp4 = firstMp4InDir(sub);
      if (!mp4) {
        console.warn(`[upload] Bỏ qua «${name}» — không có file .mp4 trong thư mục.`);
        continue;
      }
      jobs.push({ folderName: name, folderPath: sub, mp4Path: mp4 });
      if (maxUploads != null && Number.isFinite(maxUploads) && maxUploads > 0 && jobs.length >= maxUploads) break;
    }
    return jobs;
  }

  // ──── Logic mới: đọc Excel → status "Đã tạo video" + duration filter → video ID → folder + .mp4 ────
  const durBounds = getDurationBoundsFromConfig(channelAbs, email);
  if (durBounds) {
    console.log(
      `[upload-jobs] Duration filter: from ${durBounds.durationMinuteFrom} phút, to ${durBounds.durationMinuteTo ?? 'không giới hạn'} phút`
    );
  }

  const videoIds = await readVideoIdsWithStatusDone(channelAbs, durBounds);
  console.log(`[upload-jobs] Tìm thấy ${videoIds.length} video có status "Đã tạo video" trong Excel.`);

  const jobs = [];
  for (const videoId of videoIds) {
    const name = assertSafeSubfolderName(videoId);
    if (!name) continue;
    const sub = path.join(channelAbs, name);
    const mp4 = firstMp4InDir(sub);
    if (!mp4) continue;
    jobs.push({ folderName: name, folderPath: sub, mp4Path: mp4 });
    if (maxUploads != null && Number.isFinite(maxUploads) && maxUploads > 0 && jobs.length >= maxUploads) break;
  }
  return jobs;
}
