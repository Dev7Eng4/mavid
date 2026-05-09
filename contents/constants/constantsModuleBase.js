/**
 * APP_SETTINGS mặc định (clone từ appSettings.js) + các hằng pipeline cố định;
 * `expandAppSettingsIntoModule` thêm flowSettings / VIDEO_STORAGE_ROOT / MAX_*.
 * Không đọc appSettings.user.json — dùng factory / fallback khi import index lỗi.
 */
import { APP_SETTINGS as APP_SETTINGS_DEFAULT } from './appSettings.js';
import { STOCK_VIDEO, SUBTITLE, LOGO } from './videoPipelineDefaults.js';

export const INDEX_ONLY_DEFAULTS = {
  MAKE_VIDEO_MODE: {
    FROM_AUDIO: 'audio',
    REUP_FULL: 'video',
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

export function cloneDefaultAppSettings() {
  return JSON.parse(JSON.stringify(APP_SETTINGS_DEFAULT));
}

/**
 * Gắn các export tương thích cũ vào module (sau khi merge APP_SETTINGS xong gọi lại hàm này).
 * @param {Record<string, unknown>} mod
 */
export function expandAppSettingsIntoModule(mod) {
  const AS = mod.APP_SETTINGS;
  if (!AS || typeof AS !== 'object') return mod;

  const flow = AS.FLOW && typeof AS.FLOW === 'object' ? AS.FLOW : {};
  const video = AS.VIDEO && typeof AS.VIDEO === 'object' ? AS.VIDEO : {};

  return {
    ...mod,
    flowSettings: {
      FLOW_PROJECT_ID: typeof flow.PROJECT_ID === 'string' ? flow.PROJECT_ID : '',
      FLOW_CHROME_PROFILE: typeof flow.CHROME_PROFILE === 'number' && Number.isFinite(flow.CHROME_PROFILE) ? flow.CHROME_PROFILE : 1,
    },
    VIDEO_STORAGE_ROOT: typeof AS.STORAGE === 'string' ? AS.STORAGE : '',
    MAX_SCHEDULED_DAYS:
      typeof video.MAX_SCHEDULED_DAYS === 'number' && Number.isFinite(video.MAX_SCHEDULED_DAYS) ? video.MAX_SCHEDULED_DAYS : 4,
    MAX_VIDEOS_PREPARE_AHEAD:
      typeof video.MAX_VIDEOS_PREPARE_AHEAD === 'number' && Number.isFinite(video.MAX_VIDEOS_PREPARE_AHEAD)
        ? video.MAX_VIDEOS_PREPARE_AHEAD
        : 5,
  };
}

export function buildConstantsModuleBase() {
  const mod = {
    APP_SETTINGS: cloneDefaultAppSettings(),
    ...INDEX_ONLY_DEFAULTS,
    STOCK_VIDEO,
    SUBTITLE,
    LOGO,
  };
  return expandAppSettingsIntoModule(mod);
}
