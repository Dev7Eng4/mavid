/**
 * Sau upload + sync: chuyển các thư mục video đã xử lý từ
 * `MaVidMedia/channels/{channel}/` → `MaVidMedia/videos/{channel}/`.
 */
import fs from 'fs';
import path from 'path';
import { resolveChannelsDir, resolveChannelVideosArchiveDir } from '../utils/channelsStoragePath.js';
import { assertSafeSubfolderName } from './uploadJobs.util.js';

const LOG = '[videosArchive]';

/** @param {string} dir */
function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Đích `.../videos/{channel}/{folderName}`; nếu đã tồn tại thì thêm hậu tố tránh ghi đè.
 * @param {string} archiveChannelAbs
 * @param {string} folderName
 */
function resolveUniqueDestDir(archiveChannelAbs, folderName) {
  const primary = path.join(archiveChannelAbs, folderName);
  if (!fs.existsSync(primary)) return primary;
  const stamp = Date.now();
  return path.join(archiveChannelAbs, `${folderName}_trung_${stamp}`);
}

/**
 * rename; nếu khác ổ đĩa (EXDEV) thì copy đệ quy rồi xóa nguồn.
 * @param {string} srcAbs
 * @param {string} destAbs
 */
function moveDirectorySync(srcAbs, destAbs) {
  try {
    fs.renameSync(srcAbs, destAbs);
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(/** @type {{ code?: string }} */ (e).code) : '';
    if (code === 'EXDEV') {
      fs.cpSync(srcAbs, destAbs, { recursive: true });
      fs.rmSync(srcAbs, { recursive: true, force: true });
      return;
    }
    throw e;
  }
}

/**
 * @param {string} channelFolder
 * @param {string} folderName
 */
function moveOneFolderFromChannelToVideos(channelFolder, folderName) {
  const safeName = assertSafeSubfolderName(folderName);
  if (!safeName) {
    console.warn(`${LOG} Bỏ qua tên thư mục không hợp lệ: «${folderName}».`);
    return { ok: false, reason: 'invalid_name' };
  }

  const srcAbs = path.join(resolveChannelsDir(), channelFolder, safeName);
  if (!fs.existsSync(srcAbs)) {
    console.warn(`${LOG} Không có nguồn: ${srcAbs}`);
    return { ok: false, reason: 'missing_source' };
  }
  if (!fs.statSync(srcAbs).isDirectory()) {
    console.warn(`${LOG} Không phải thư mục: ${srcAbs}`);
    return { ok: false, reason: 'not_directory' };
  }

  const archiveChannelAbs = resolveChannelVideosArchiveDir(channelFolder);
  ensureDirSync(archiveChannelAbs);

  const destAbs = resolveUniqueDestDir(archiveChannelAbs, safeName);
  moveDirectorySync(srcAbs, destAbs);
  console.log(`${LOG} Đã chuyển «${safeName}» → ${destAbs}`);
  return { ok: true, destAbs };
}

/**
 * @typedef {object} MoveUploadedFoldersParams
 * @property {string} channelFolder — thư mục kênh (id), đã assert an toàn
 * @property {string[]} successfulFolderNames — thư mục con đã upload + sync
 */

/**
 * Tạo `MaVidMedia/videos/{channel}` nếu chưa có, rồi di chuyển từng thư mục video tương ứng.
 * @param {MoveUploadedFoldersParams} p
 * @returns {{ moved: string[], skipped: string[], errors: Array<{ folder: string, message: string }> }}
 */
export function moveSuccessfulUploadFoldersToVideosArchive(p) {
  const names = Array.isArray(p.successfulFolderNames) ? p.successfulFolderNames.map(x => String(x ?? '').trim()).filter(Boolean) : [];

  const moved = [];
  const skipped = [];
  /** @type {Array<{ folder: string, message: string }>} */
  const errors = [];

  if (names.length === 0) {
    console.log(`${LOG} Bỏ qua — không có thư mục cần chuyển.`);
    return { moved, skipped, errors };
  }

  const channelFolder = String(p.channelFolder || '').trim();
  if (!channelFolder) {
    console.warn(`${LOG} Thiếu channelFolder.`);
    return { moved, skipped, errors };
  }

  for (const folderName of names) {
    try {
      const r = moveOneFolderFromChannelToVideos(channelFolder, folderName);
      if (r.ok && r.destAbs) moved.push(r.destAbs);
      else skipped.push(folderName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ folder: folderName, message: msg });
      console.warn(`${LOG} «${folderName}»:`, msg);
    }
  }

  console.log(
    `${LOG} Kênh «${channelFolder}»: chuyển ${moved.length}/${names.length} thư mục (bỏ qua ${skipped.length}, lỗi ${errors.length}).`
  );
  return { moved, skipped, errors };
}
