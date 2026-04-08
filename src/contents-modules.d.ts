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
  /** Key = id style lưu trong channel; value = hàm tạo prompt. */
  export const PROMPTS_CREATE_THUMBNAIL: Record<string, (...args: unknown[]) => string>;
  export const PROMPTS_CREATE_THUMBNAIL_OPTIONS: readonly { label: string; value: string }[];
}
