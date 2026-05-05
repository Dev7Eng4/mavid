import fs from 'fs';
import { APP_SETTINGS as APP_SETTINGS_REPO } from './appSettings.js';
import { mergeAppSettingsObjects, normalizeUserConstantsOverlay } from './mergeConstantsOverlay.js';
import { getAppSettingsUserJsonPath } from './userConstantsPaths.js';

function readAppSettingsUserJsonRaw() {
  const p = getAppSettingsUserJsonPath();
  try {
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return raw && typeof raw === 'object' ? raw : null;
  } catch (e) {
    console.warn('[MaVid] Không đọc/parse được appSettings.user.json:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Mặc định từ `appSettings.js`; nếu `appSettings.user.json` có overlay (hoặc legacy keys) thì gộp lên.
 */
export function resolveAppSettings() {
  const defaults = JSON.parse(JSON.stringify(APP_SETTINGS_REPO));
  const raw = readAppSettingsUserJsonRaw();
  if (!raw) return defaults;
  const normalized = normalizeUserConstantsOverlay(raw);
  if (!normalized?.APP_SETTINGS) return defaults;
  return mergeAppSettingsObjects(defaults, normalized.APP_SETTINGS);
}
