import fs from 'fs';
import { CONSTANT_EXPORT_KEYS, INDEX_ONLY_EXPORT_KEYS } from './constantsExportKeys.js';
import { buildConstantsModuleBase, INDEX_ONLY_DEFAULTS } from './constantsModuleBase.js';
import { mergeConstantsBaseWithUserOverlay } from './mergeConstantsOverlay.js';
import { getAppSettingsUserJsonPath } from './userConstantsPaths.js';

function readUserJsonOverlay() {
  const p = getAppSettingsUserJsonPath();
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(
      '[MaVid] Không đọc/parse được appSettings.user.json:',
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * Defaults (appSettings.js + INDEX_ONLY) + overlay từ appSettings.user.json nếu có.
 * Bản Electron đóng gói: main process merge thêm mavid-user-constants.json (userData).
 */
export function loadResolvedConstantsModule() {
  const base = buildConstantsModuleBase();
  const overlay = readUserJsonOverlay();
  return mergeConstantsBaseWithUserOverlay(base, overlay, CONSTANT_EXPORT_KEYS);
}

export { INDEX_ONLY_EXPORT_KEYS, INDEX_ONLY_DEFAULTS };
