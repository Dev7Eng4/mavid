// Mặc định render stock / phụ đề / logo — import trực tiếp từ `contents/constants/index.js`; không overlay user.

export const STOCK_VIDEO = {
  CROSSFADE_SEC: 1,
  /** false (mặc định) = concat thuần (cut-cut, nhanh hơn nhiều); true = xfade chuỗi (đẹp hơn nhưng tốn CPU). */
  USE_XFADE: false,
  RENDER_EXTRA_SEC: 3,
  SLOWMO_FACTOR: 3,
  CANVAS_W: 1280,
  CANVAS_H: 720,
  FPS: 15,
  BITRATE: '4M',
  MAX_BITRATE: '5M',
  BUFSIZE: '8M',
};

export const SUBTITLE = {
  BOX_HEIGHT: 200,
  BOX_OPACITY: 0.5,
  FONT_SIZE: 80,
  PADDING_TOP: 15,
  PADDING_HORIZONTAL: 40,
  CHAR_SPACING: 2,
};

export const LOGO = {
  SIZE: 80,
  MARGIN_TOP: 20,
  MARGIN_RIGHT: 20,
};
