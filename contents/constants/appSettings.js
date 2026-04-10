// File path: contents/constants/appSettings.js
// Bản DEFAULT (commit được). Không ghi đè khi Lưu Settings.
// Cấu hình đang dùng = defaults + contents/constants/appSettings.user.json (dev, gitignore).
// Dev: mở app Electron một lần sẽ tạo file rỗng {} nếu chưa có; Lưu Settings ghi đầy đủ.
// Cursor/VSCode có thể ẩn file trong .gitignore — bật "Explorer: Exclude Git Ignore" = false để thấy.
// Mẫu tham chiếu (commit): appSettings.user.example.json
// Bản đóng gói: userData/mavid-user-constants.json

export const flowSettings = {
  FLOW_URL: 'https://labs.google/fx/vi/tools/flow/project/',
  FLOW_PROJECT_ID: '3550d75f-a7ac-41ec-9ec7-0c23bc5efb95',
  FLOW_CHROME_PROFILE: 1,
};

export const GEMINI_CONFIG = {
  URL: 'https://gemini.google.com/app',
  MAX_CONCURRENT: 3,
};

export const GEMINI_CHUNK_SIZE = {
  UPDATE_TRANSCRIPT: 200,
  SUMMARY_CONTENT: 500,
};

export const STOCK_VIDEO = {
  CROSSFADE_SEC: 1,
  RENDER_EXTRA_SEC: 15,
  SLOWMO_FACTOR: 2,
  CANVAS_W: 1280,
  CANVAS_H: 720,
  FPS: 30,
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

export const VIDEO_STORAGE_ROOT = '';

/** Giới hạn số video được lên lịch đăng cùng lúc (YouTube / pipeline). */
export const MAX_SCHEDULED_VIDEOS = 4;

/** Giới hạn số video được tạo / chuẩn bị trước tối đa (buffer trước khi đăng). */
export const MAX_VIDEOS_PREPARE_AHEAD = 5;
