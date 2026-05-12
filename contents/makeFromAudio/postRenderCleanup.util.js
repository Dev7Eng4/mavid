import fs from 'fs';
import path from 'path';

import { DOWNLOADS_DIR } from './shared.js';

/**
 * Thư mục làm việc từ pipeline batch (`downloads/job_<timestamp>_<index>`).
 *
 * @param {string|null|undefined} dir
 * @param {string} [downloadsRoot]
 * @returns {boolean}
 */
export function isIsolatedDownloadsJobDir(dir, downloadsRoot = DOWNLOADS_DIR) {
  if (!dir || !fs.existsSync(dir)) return false;
  const resolved = path.resolve(dir);
  const rootResolved = path.resolve(downloadsRoot);
  const rel = path.relative(rootResolved, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false;
  return /^job_\d+_\d+$/.test(path.basename(resolved));
}

/** Xóa thư mục đệ quy; lỗi chỉ log, không throw. */
export function rmDirQuiet(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    console.warn(`[cleanup] Không xóa được ${dir}: ${e.message}`);
  }
}
