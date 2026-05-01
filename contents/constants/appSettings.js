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
  /** Số lần thử tối đa mỗi chunk khi chỉnh transcript (lỗi hoặc phản hồi rỗng). */
  UPDATE_TRANSCRIPT_CHUNK_MAX_ATTEMPTS: 3,
  /** Độ trễ nền (ms); lần thử k chờ k × giá trị này (tuyến tính). */
  UPDATE_TRANSCRIPT_CHUNK_RETRY_BASE_DELAY_MS: 3000,
  /**
   * Dịch toàn bộ timeline SRT sau Step2 (ms). Step2 không đổi mốc giờ từ ASR;
   * nếu phụ đề sớm hơn thoại (vd. ~2s), thử 2000; nếu muộn hơn thoại, thử -2000.
   */
  UPDATE_TRANSCRIPT_SRT_TIME_SHIFT_MS: 0,
};

export const GEMINI_CHUNK_SIZE = {
  UPDATE_TRANSCRIPT: 100,
  /** Số cue mỗi window Step2 (sliding). */
  UPDATE_TRANSCRIPT_STEP2_CHUNK: 40,
  /** Số cue overlap làm PREVIOUS CONTEXT; 0 = không overlap (vd. 1000 cue → 50 window). */
  UPDATE_TRANSCRIPT_STEP2_OVERLAP: 10,
  SUMMARY_CONTENT: 500,
};

export const STOCK_VIDEO = {
  CROSSFADE_SEC: 1,
  /** false (mặc định) = concat thuần (cut-cut, nhanh hơn nhiều); true = xfade chuỗi (đẹp hơn nhưng tốn CPU). */
  USE_XFADE: false,
  RENDER_EXTRA_SEC: 3,
  SLOWMO_FACTOR: 2,
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

export const VIDEO_STORAGE_ROOT = '';

/** Giới hạn số ngày lên lịch trước tối đa (YouTube / pipeline). */
export const MAX_SCHEDULED_DAYS = 4;

/** Giới hạn số video được tạo / chuẩn bị trước tối đa (buffer trước khi đăng). */
export const MAX_VIDEOS_PREPARE_AHEAD = 5;
