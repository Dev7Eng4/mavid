/** Khai báo module JS trong `contents/` (import qua alias Vite `@contents/...`). */
declare module '@contents/constants/overlayOptions.js' {
  export interface OverlayOptionPreset {
    NAME: string;
    IMAGE_OVERLAY_OPACITY?: number;
    VIDEO_OVERLAY_OPACITY?: number;
  }
  export const OVERLAY_OPTIONS: OverlayOptionPreset[];
}

declare module '@contents/constants/index.js' {
  export const THUMBNAIL_STYLE: {
    readonly TEXT: string;
    readonly REMAKE: string;
    readonly NEW: string;
  };
  export const THUMBNAIL_STYLE_OPTIONS: readonly { label: string; value: string }[];
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
