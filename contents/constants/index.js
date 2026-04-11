// File path: contents/constants/index.js
// Hằng “đã resolve”: defaults trong appSettings.js + chỉnh sửa trong appSettings.user.json (repo).
// Bản build đóng gói: Electron merge thêm userData/mavid-user-constants.json.

import { loadResolvedConstantsModule } from './loadResolvedConstants.js';

const m = loadResolvedConstantsModule();

export const flowSettings = m.flowSettings;
export const GEMINI_CONFIG = m.GEMINI_CONFIG;
export const GEMINI_CHUNK_SIZE = m.GEMINI_CHUNK_SIZE;
export const STOCK_VIDEO = m.STOCK_VIDEO;
export const SUBTITLE = m.SUBTITLE;
export const LOGO = m.LOGO;
export const VIDEO_STORAGE_ROOT = m.VIDEO_STORAGE_ROOT;
export const MAX_SCHEDULED_DAYS = m.MAX_SCHEDULED_DAYS;
export const MAX_VIDEOS_PREPARE_AHEAD = m.MAX_VIDEOS_PREPARE_AHEAD;
export const MAKE_VIDEO_MODE = m.MAKE_VIDEO_MODE;
export const VIDEO_TYPE = m.VIDEO_TYPE;
export const LANGUAGES_NEED_UPDATE_TRANSCRIPT = m.LANGUAGES_NEED_UPDATE_TRANSCRIPT;
export const META_DATA = m.META_DATA;
export const DEFAULT_VIDEO = m.DEFAULT_VIDEO;
export const AUDIO_SPEED = m.AUDIO_SPEED;

export { DEFAULT_PROMPT_LANG } from './defaultPromptLang.js';
