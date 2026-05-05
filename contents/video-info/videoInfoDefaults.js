// Mặc định pipeline nghiệp vụ video (transcript + meta), không trộn vào module Gemini thuần.

export const VIDEO_INFO_CONFIG = {
  /** Số lần thử tối đa mỗi chunk khi chỉnh transcript (lỗi hoặc phản hồi rỗng). */
  UPDATE_TRANSCRIPT_CHUNK_MAX_ATTEMPTS: 3,
  /** Độ trễ nền (ms); lần thử k chờ k × giá trị này (tuyến tính). */
  UPDATE_TRANSCRIPT_CHUNK_RETRY_BASE_DELAY_MS: 2000,
};

export const VIDEO_INFO_CHUNK_SIZE = {
  UPDATE_TRANSCRIPT: 100,
  /** Số cue mỗi window Step2 (sliding). */
  UPDATE_TRANSCRIPT_STEP2_CHUNK: 40,
  /** Số cue overlap làm PREVIOUS CONTEXT; 0 = không overlap (vd. 1000 cue → 50 window). */
  UPDATE_TRANSCRIPT_STEP2_OVERLAP: 10,
  SUMMARY_CONTENT: 500,
};
