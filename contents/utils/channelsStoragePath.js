/**
 * Thư mục kênh: `VIDEO_STORAGE_ROOT/channels` (MaVidMedia/channels).
 */
import path from 'path';
import { resolveVideoStorageRootFromConstants } from './stockBackgroundsPath.js';

export function resolveChannelsDir() {
  return path.join(resolveVideoStorageRootFromConstants(), 'channels');
}

/** Thư mục lưu video đã upload: `VIDEO_STORAGE_ROOT/videos` (MaVidMedia/videos). */
export function resolveVideosDir() {
  return path.join(resolveVideoStorageRootFromConstants(), 'videos');
}

/**
 * Thư mục archive video theo kênh: `VIDEO_STORAGE_ROOT/videos/{channelFolder}`.
 * @param {string} channelFolder — id thư mục kênh (đã assert an toàn ở caller)
 */
export function resolveChannelVideosArchiveDir(channelFolder) {
  return path.join(resolveVideosDir(), channelFolder);
}
