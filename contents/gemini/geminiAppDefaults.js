// Mặc định pipeline Gemini (không overlay Settings / không nằm trong contents/constants).

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
