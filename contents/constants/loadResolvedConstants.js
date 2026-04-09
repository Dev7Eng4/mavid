import fs from 'fs';
import * as appSettingsDefaults from './appSettings.js';
import { CONSTANT_EXPORT_KEYS, INDEX_ONLY_EXPORT_KEYS } from './constantsExportKeys.js';
import { mergeConstantsBaseWithUserOverlay } from './mergeConstantsOverlay.js';
import { getAppSettingsUserJsonPath } from './userConstantsPaths.js';

/** Giá trị mặc định cho các hằng chỉ nằm trong index (không trong appSettings.js). */
const INDEX_ONLY_DEFAULTS = {
  MAKE_VIDEO_MODE: {
    FROM_AUDIO: 'from_audio',
    REUP_FULL: 'reup_full',
  },
  VIDEO_TYPE: {
    '2CH': '2ch',
    STORY: 'story',
  },
  LANGUAGES_NEED_UPDATE_TRANSCRIPT: ['ja'],
  META_DATA: {
    NICHE: 'Niche',
    TITLE: 'Title',
    DESCRIPTION: 'Description',
    TAGS: 'Tags',
  },
  DEFAULT_VIDEO: {
    BACKGROUND_VIDEO: 'cat',
  },
  AUDIO_SPEED: 0.91,
};

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
  const base = { ...appSettingsDefaults, ...INDEX_ONLY_DEFAULTS };
  const overlay = readUserJsonOverlay();
  return mergeConstantsBaseWithUserOverlay(base, overlay, CONSTANT_EXPORT_KEYS);
}

export { INDEX_ONLY_EXPORT_KEYS, INDEX_ONLY_DEFAULTS };
