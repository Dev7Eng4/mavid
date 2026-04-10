export declare const INDEX_ONLY_DEFAULTS: {
  MAKE_VIDEO_MODE: { FROM_AUDIO: string; REUP_FULL: string };
  VIDEO_TYPE: { '2CH': string; STORY: string };
  LANGUAGES_NEED_UPDATE_TRANSCRIPT: readonly string[];
  META_DATA: { NICHE: string; TITLE: string; DESCRIPTION: string; TAGS: string };
  DEFAULT_VIDEO: { BACKGROUND_VIDEO: string };
  AUDIO_SPEED: number;
};

/** Gộp appSettings + INDEX_ONLY_DEFAULTS (không overlay user). */
export declare function buildConstantsModuleBase(): Record<string, unknown>;
