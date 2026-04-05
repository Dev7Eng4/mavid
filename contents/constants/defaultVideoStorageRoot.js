/**
 * Mặc định VIDEO_STORAGE_ROOT (thư mục MaVidMedia) khi constants rỗng — dùng chung main process và scripts.
 */
import fs from 'fs';
import path from 'path';

export const MAVID_MEDIA_FOLDER = 'MaVidMedia';

/**
 * Mặc định: ổ không phải hệ thống (Windows: không C:; macOS: ưu /Volumes/…).
 */
export function getDefaultVideoStorageRoot() {
  if (process.platform === 'win32') {
    for (const L of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
      if (L === 'C') continue;
      const root = `${L}:\\`;
      try {
        if (fs.existsSync(root)) {
          return path.join(root, MAVID_MEDIA_FOLDER);
        }
      } catch {
        /* ignore */
      }
    }
    return `D:\\${MAVID_MEDIA_FOLDER}`;
  }
  if (process.platform === 'darwin') {
    try {
      const vols = '/Volumes';
      if (fs.existsSync(vols)) {
        const names = fs
          .readdirSync(vols)
          .filter(n => n !== 'Macintosh HD' && n !== 'Mac HD' && !n.startsWith('.'));
        if (names.length > 0) {
          return path.join(vols, names[0], MAVID_MEDIA_FOLDER);
        }
      }
    } catch {
      /* ignore */
    }
    const home = process.env.HOME || '/tmp';
    return path.join(home, MAVID_MEDIA_FOLDER);
  }
  const home = process.env.HOME || '/tmp';
  return path.join(home, MAVID_MEDIA_FOLDER);
}
