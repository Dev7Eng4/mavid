import { cloneDefaultAppSettings } from './constantsModuleBase.js';

/** Gộp hai object APP_SETTINGS (DEFAULT từ repo + phần chỉnh từ user). */
export function mergeAppSettingsObjects(base, overlay) {
  const b = base && typeof base === 'object' ? base : {};
  const o = overlay && typeof overlay === 'object' ? overlay : {};
  const bf = b.FLOW && typeof b.FLOW === 'object' ? b.FLOW : {};
  const of = o.FLOW && typeof o.FLOW === 'object' ? o.FLOW : {};
  const bv = b.VIDEO && typeof b.VIDEO === 'object' ? b.VIDEO : {};
  const ov = o.VIDEO && typeof o.VIDEO === 'object' ? o.VIDEO : {};
  const out = {
    ...b,
    FLOW: { ...bf, ...of },
    VIDEO: { ...bv, ...ov },
  };
  if (o.STORAGE !== undefined) out.STORAGE = o.STORAGE;
  return out;
}

/**
 * JSON user cũ (top-level flowSettings, VIDEO_STORAGE_ROOT, ...) → { APP_SETTINGS }.
 * JSON mới: { APP_SETTINGS } — trả về nguyên khối phần overlay hợp lệ.
 */
export function normalizeUserConstantsOverlay(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.APP_SETTINGS && typeof raw.APP_SETTINGS === 'object') {
    return { APP_SETTINGS: raw.APP_SETTINGS };
  }
  const legacyKeys = ['flowSettings', 'VIDEO_STORAGE_ROOT', 'MAX_SCHEDULED_DAYS', 'MAX_VIDEOS_PREPARE_AHEAD'];
  if (!legacyKeys.some(k => raw[k] !== undefined)) return null;

  const AS = cloneDefaultAppSettings();
  if (raw.flowSettings && typeof raw.flowSettings === 'object') {
    const fs = raw.flowSettings;
    if (typeof fs.FLOW_PROJECT_ID === 'string') AS.FLOW.PROJECT_ID = fs.FLOW_PROJECT_ID;
    if (typeof fs.FLOW_CHROME_PROFILE === 'number' && Number.isFinite(fs.FLOW_CHROME_PROFILE)) {
      AS.FLOW.CHROME_PROFILE = fs.FLOW_CHROME_PROFILE;
    }
  }
  if (typeof raw.VIDEO_STORAGE_ROOT === 'string') AS.STORAGE = raw.VIDEO_STORAGE_ROOT;
  if (typeof raw.MAX_SCHEDULED_DAYS === 'number' && Number.isFinite(raw.MAX_SCHEDULED_DAYS)) {
    AS.VIDEO.MAX_SCHEDULED_DAYS = raw.MAX_SCHEDULED_DAYS;
  }
  if (typeof raw.MAX_VIDEOS_PREPARE_AHEAD === 'number' && Number.isFinite(raw.MAX_VIDEOS_PREPARE_AHEAD)) {
    AS.VIDEO.MAX_VIDEOS_PREPARE_AHEAD = raw.MAX_VIDEOS_PREPARE_AHEAD;
  }
  return { APP_SETTINGS: AS };
}

