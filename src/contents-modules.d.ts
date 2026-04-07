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
    readonly '2CH_PEOPLE_STYLE': string;
  };
  export const THUMBNAIL_STYLE_OPTIONS: readonly { label: string; value: string }[];
}
