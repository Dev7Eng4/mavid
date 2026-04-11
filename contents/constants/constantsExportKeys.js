/** Các khóa export do Settings UI đọc/ghi — dùng chung main process và merge overlay. */

export const APP_SETTINGS_EXPORT_KEYS = [
  'flowSettings',
  'GEMINI_CONFIG',
  'GEMINI_CHUNK_SIZE',
  'STOCK_VIDEO',
  'SUBTITLE',
  'LOGO',
  'VIDEO_STORAGE_ROOT',
  'MAX_SCHEDULED_DAYS',
  'MAX_VIDEOS_PREPARE_AHEAD',
];

export const INDEX_ONLY_EXPORT_KEYS = [
  'MAKE_VIDEO_MODE',
  'VIDEO_TYPE',
  'LANGUAGES_NEED_UPDATE_TRANSCRIPT',
  'META_DATA',
  'DEFAULT_VIDEO',
  'AUDIO_SPEED',
];

export const CONSTANT_EXPORT_KEYS = [...APP_SETTINGS_EXPORT_KEYS, ...INDEX_ONLY_EXPORT_KEYS];
