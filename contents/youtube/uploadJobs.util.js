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
 * Danh sách thư mục con có .mp4.
 * - Có `folderNamesOrder`: theo đúng thứ tự danh sách (chỉ thư mục có .mp4), tối đa `maxUploads` nếu có.
 * - Không có: quét thư mục kênh, sắp xếp tên tăng dần, lấy từ trên xuống tới `maxUploads`.
 * @param {string} channelAbs
 * @param {number | null} maxUploads
 * @param {string[] | null | undefined} folderNamesOrder
 */
export function listUploadJobs(channelAbs, maxUploads, folderNamesOrder) {
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

  const entries = fs.readdirSync(channelAbs, { withFileTypes: true });
  const dirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const jobs = [];
  for (const name of dirs) {
    const sub = path.join(channelAbs, name);
    const mp4 = firstMp4InDir(sub);
    if (!mp4) continue;
    jobs.push({ folderName: name, folderPath: sub, mp4Path: mp4 });
    if (maxUploads != null && Number.isFinite(maxUploads) && maxUploads > 0 && jobs.length >= maxUploads) break;
  }
  return jobs;
}
