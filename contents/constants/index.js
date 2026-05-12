// File path: contents/constants/index.js
// Hằng pipeline / video: import trực tiếp. APP_SETTINGS: resolveAppSettings() + appSettings.user.json (dev).
// Bản đóng gói: Electron gộp thêm userData/mavid-user-constants.json (chỉ APP_SETTINGS) sau khi import index.

import { INDEX_ONLY_DEFAULTS, expandAppSettingsIntoModule } from './constantsModuleBase.js';
import { resolveAppSettings } from './resolveAppSettings.js';
import { STOCK_VIDEO, SUBTITLE, LOGO } from './videoPipelineDefaults.js';

export { resolveAppSettings };

const derived = expandAppSettingsIntoModule({
  APP_SETTINGS: resolveAppSettings(),
  ...INDEX_ONLY_DEFAULTS,
  STOCK_VIDEO,
  SUBTITLE,
  LOGO,
});

export const APP_SETTINGS = derived.APP_SETTINGS;
export const flowSettings = derived.flowSettings;
export const VIDEO_STORAGE_ROOT = derived.VIDEO_STORAGE_ROOT;
export const MAX_SCHEDULED_DAYS = derived.MAX_SCHEDULED_DAYS;
export const MAX_VIDEOS_PREPARE_AHEAD = derived.MAX_VIDEOS_PREPARE_AHEAD;

export { STOCK_VIDEO, SUBTITLE, LOGO } from './videoPipelineDefaults.js';
export const MAKE_VIDEO_MODE = INDEX_ONLY_DEFAULTS.MAKE_VIDEO_MODE;
export const VIDEO_TYPE = INDEX_ONLY_DEFAULTS.VIDEO_TYPE;
export const LANGUAGES_NEED_UPDATE_TRANSCRIPT = INDEX_ONLY_DEFAULTS.LANGUAGES_NEED_UPDATE_TRANSCRIPT;
export const META_DATA = INDEX_ONLY_DEFAULTS.META_DATA;
export const DEFAULT_VIDEO = INDEX_ONLY_DEFAULTS.DEFAULT_VIDEO;
export const AUDIO_SPEED = INDEX_ONLY_DEFAULTS.AUDIO_SPEED;

export { DEFAULT_PROMPT_LANG } from './lang.js';
