/** Khai báo module JS trong `contents/` (import qua alias Vite `@contents/...`). */
declare module '@contents/constants/overlayOptions.js' {
  export interface OverlayOptionPreset {
    NAME: string;
    IMAGE_OVERLAY_OPACITY?: number;
    VIDEO_OVERLAY_OPACITY?: number;
  }
  export const OVERLAY_OPTIONS: OverlayOptionPreset[];
}

declare module '@contents/constants/rendererConstants.js' {
  export const MAX_SCHEDULED_DAYS: number;
  export const MAX_VIDEOS_PREPARE_AHEAD: number;
}

declare module '@contents/constants/index.js' {
  export const APP_SETTINGS: {
    FLOW: { PROJECT_ID: string; CHROME_PROFILE: number };
    VIDEO: { MAX_SCHEDULED_DAYS: number; MAX_VIDEOS_PREPARE_AHEAD: number };
    STORAGE: string;
  };
  export const flowSettings: { FLOW_PROJECT_ID: string; FLOW_CHROME_PROFILE: number };
  export const STOCK_VIDEO: Record<string, unknown>;
  export const SUBTITLE: Record<string, unknown>;
  export const LOGO: Record<string, unknown>;
  export const VIDEO_STORAGE_ROOT: string;
  export const MAX_SCHEDULED_DAYS: number;
  export const MAX_VIDEOS_PREPARE_AHEAD: number;
  export const MAKE_VIDEO_MODE: { FROM_AUDIO: string; REUP_FULL: string };
  export const VIDEO_TYPE: { '2CH': string; STORY: string };
  export const LANGUAGES_NEED_UPDATE_TRANSCRIPT: readonly string[];
  export const META_DATA: {
    NICHE: string;
    TITLE: string;
    DESCRIPTION: string;
    TAGS: string;
  };
  export const DEFAULT_VIDEO: { BACKGROUND_VIDEO: string };
  export const AUDIO_SPEED: number;
  export const DEFAULT_PROMPT_LANG: string;
}

declare module '@contents/constants/constantsModuleBase.js' {
  export const INDEX_ONLY_DEFAULTS: Record<string, unknown>;
  export function cloneDefaultAppSettings(): {
    FLOW: { PROJECT_ID: string; CHROME_PROFILE: number };
    VIDEO: { MAX_SCHEDULED_DAYS: number; MAX_VIDEOS_PREPARE_AHEAD: number };
    STORAGE: string;
  };
  export function expandAppSettingsIntoModule(mod: Record<string, unknown>): Record<string, unknown>;
  export function buildConstantsModuleBase(): Record<string, unknown>;
}

declare module '@contents/constants/gpmApi.js' {
  export const GPM_API_VERSION: 'V1' | 'V2';
  export const GPM_API_DEFAULT_ORIGIN: string;
}

declare module '@contents/prompts/index.js' {
  export const PROMPTS_CREATE_THUMBNAIL_OPTIONS: readonly { label: string; value: string }[];
  export const PROMPTS_NEED_IMAGE: readonly string[];
  /** Key cũ (config) → tên export trong createImage */
  export const THUMBNAIL_PROMPT_KEY_ALIASES: Readonly<Record<string, string>>;
  export function resolveThumbnailPromptBuilder(
    prompts: Record<string, unknown>,
    styleKey: string | null | undefined
  ): {
    build: (title: string, summary: string) => string;
    isNeedImage: boolean;
    usedStyleKey: string;
    didFallback: boolean;
  };
  export function loadPromptByLanguage(
    language: string | null | undefined
  ): Promise<Record<string, unknown>>;
}

declare module '@contents/makeFromAudio/constant.js' {
  export const OPTIONS_CONTENT: readonly { label: string; value: string }[];
}
