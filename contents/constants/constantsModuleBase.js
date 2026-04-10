/**
 * Module constants mặc định (repo) — không đọc overlay user.
 * Kết hợp appSettings.js + các hằng chỉ có trong index; dùng chung scripts, Electron fallback, và UI (Vite @contents).
 */
import * as appSettingsDefaults from './appSettings.js';

export const INDEX_ONLY_DEFAULTS = {
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

export function buildConstantsModuleBase() {
  return { ...appSettingsDefaults, ...INDEX_ONLY_DEFAULTS };
}
