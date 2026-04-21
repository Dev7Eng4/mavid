export declare const flowSettings: {
  FLOW_URL: string;
  FLOW_PROJECT_ID: string;
  FLOW_CHROME_PROFILE: number;
};

export declare const GEMINI_CONFIG: {
  URL: string;
  MAX_CONCURRENT: number;
  UPDATE_TRANSCRIPT_CHUNK_MAX_ATTEMPTS: number;
  UPDATE_TRANSCRIPT_CHUNK_RETRY_BASE_DELAY_MS: number;
  UPDATE_TRANSCRIPT_SRT_TIME_SHIFT_MS: number;
};

export declare const GEMINI_CHUNK_SIZE: {
  UPDATE_TRANSCRIPT: number;
  UPDATE_TRANSCRIPT_STEP2_CHUNK: number;
  UPDATE_TRANSCRIPT_STEP2_OVERLAP: number;
  SUMMARY_CONTENT: number;
};

export declare const STOCK_VIDEO: {
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

export declare const SUBTITLE: {
  BOX_HEIGHT: number;
  BOX_OPACITY: number;
  FONT_SIZE: number;
  PADDING_TOP: number;
  PADDING_HORIZONTAL: number;
  CHAR_SPACING: number;
};

export declare const LOGO: {
  SIZE: number;
  MARGIN_TOP: number;
  MARGIN_RIGHT: number;
};

export declare const VIDEO_STORAGE_ROOT: string;
export declare const MAX_SCHEDULED_DAYS: number;
export declare const MAX_VIDEOS_PREPARE_AHEAD: number;
