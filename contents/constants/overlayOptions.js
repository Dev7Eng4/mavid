/**
 * Preset overlay — dùng chung cho makeVideoFromFull và UI (Electron).
 * Ảnh + video đặt trong `assets/overlay/<NAME đã sanitize>/`.
 * File tách riêng để không bị ghi đè khi Settings lưu `index.js`.
 */
export const OVERLAY_OPTIONS = [
  {
    NAME: 'Option 1',
    IMAGE_OVERLAY_OPACITY: 0.5,
    VIDEO_OVERLAY_OPACITY: 0.5,
  },
  {
    NAME: 'Option 2 (Show Subtitle)',
    IMAGE_OVERLAY_OPACITY: 0.5,
    VIDEO_OVERLAY_OPACITY: 0.5,
  },
];
