/**
 * Thư mục kênh: `VIDEO_STORAGE_ROOT/channels` (MaVidMedia/channels).
 */
import path from 'path';
import { resolveVideoStorageRootFromConstants } from './stockBackgroundsPath.js';

export function resolveChannelsDir() {
  return path.join(resolveVideoStorageRootFromConstants(), 'channels');
}
