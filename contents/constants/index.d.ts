/** Khai báo khớp contents/constants/index.js (UI / MaVid). */

export const MAKE_VIDEO_MODE: {
  readonly FROM_AUDIO: string;
  readonly REUP_FULL: string;
};

export const VIDEO_TYPE: {
  readonly '2CH': string;
  readonly STORY: string;
};

export const flowSettings: {
  FLOW_URL: string;
  FLOW_PROJECT_ID: string;
  FLOW_CHROME_PROFILE: number;
};

export const GEMINI_CONFIG: {
  URL: string;
  MAX_CONCURRENT: number;
};

export const GEMINI_CHUNK_SIZE: {
  UPDATE_TRANSCRIPT: number;
  SUMMARY_CONTENT: number;
};

export const LANGUAGES_NEED_UPDATE_TRANSCRIPT: readonly string[];

export const META_DATA: {
  NICHE: string;
  TITLE: string;
  DESCRIPTION: string;
  TAGS: string;
};

export const DEFAULT_VIDEO: {
  BACKGROUND_VIDEO: string;
};

export const AUDIO_SPEED: number;

export const STOCK_VIDEO: {
  CROSSFADE_SEC: number;
  RENDER_EXTRA_SEC: number;
  SLOWMO_FACTOR: number;
  CANVAS_W: number;
  CANVAS_H: number;
  FPS: number;
  BITRATE: string;
  MAX_BITRATE: string;
  BUFSIZE: string;
};

export const SUBTITLE: {
  BOX_HEIGHT: number;
  BOX_OPACITY: number;
  FONT_SIZE: number;
  PADDING_TOP: number;
  PADDING_HORIZONTAL: number;
  CHAR_SPACING: number;
};

export const LOGO: {
  SIZE: number;
  MARGIN_TOP: number;
  MARGIN_RIGHT: number;
};

export const VIDEO_STORAGE_ROOT: string;

export const MAX_SCHEDULED_VIDEOS: number;

export const MAX_VIDEOS_PREPARE_AHEAD: number;

export const THUMBNAIL_STYLE: {
  readonly TEXT: string;
  readonly REMAKE: string;
  readonly NEW: string;
};

export const THUMBNAIL_STYLE_OPTIONS: readonly { label: string; value: string }[];
