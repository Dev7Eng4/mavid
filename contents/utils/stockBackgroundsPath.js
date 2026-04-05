/**
 * Thư mục chứa các folder stock (cat, dog, …): `VIDEO_STORAGE_ROOT/backgrounds` (MaVidMedia/backgrounds).
 */
import path from 'path';
import { VIDEO_STORAGE_ROOT } from '../constants/index.js';
import { getDefaultVideoStorageRoot } from '../constants/defaultVideoStorageRoot.js';

export function resolveVideoStorageRootFromConstants() {
  const r = typeof VIDEO_STORAGE_ROOT === 'string' ? VIDEO_STORAGE_ROOT.trim() : '';
  return r || getDefaultVideoStorageRoot();
}

export function resolveStockBackgroundsDir() {
  return path.join(resolveVideoStorageRootFromConstants(), 'backgrounds');
}
