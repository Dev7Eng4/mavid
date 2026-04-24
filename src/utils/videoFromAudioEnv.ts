import type { VideoFromAudioConfig } from '../types';

/** Ưu tiên folder tên "stock video" (không phân biệt hoa thường), không có thì phần tử đầu, fallback "cat". */
export function defaultBackgroundFolder(available: string[]): string {
  if (available.length === 0) return 'cat';
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const idx = available.findIndex(n => norm(n) === 'stock video');
  return idx >= 0 ? available[idx] : available[0];
}

/** Biến cấu hình UI thành biến môi trường cho script batch từ audio. */
export function buildMavidEnvForVideoFromAudio(config: VideoFromAudioConfig, availableBackgrounds: string[]): Record<string, string> {
  const source = config.backgroundSource ?? 'stock';
  let background = config.background;
  let stockCount = config.stockVideoCount;

  if (source === 'auto') {
    stockCount = 0;
    background = defaultBackgroundFolder(availableBackgrounds);
  } else {
    stockCount = Math.max(0, Math.min(50, Math.floor(stockCount)));
  }

  const maxBatch = config.maxVideosPerBatch ?? 5;
  const maxVideosPerBatch = Math.max(1, Math.min(100, Math.floor(Number(maxBatch) || 5)));
  const minDur = Math.max(0, Math.min(10080, Math.floor(Number(config.minDurationMinutes ?? 0) || 0)));

  const env: Record<string, string> = {
    MAVID_CHANNEL: config.channel,
    MAVID_BACKGROUND: background,
    MAVID_STOCK_COUNT: String(stockCount),
    MAVID_AUDIO_SPEED: String(config.audioSpeed),
    MAVID_SHOW_LOGO: config.showLogo ? '1' : '0',
    MAVID_MAX_VIDEOS_PER_BATCH: String(maxVideosPerBatch),
    /** 0 = tắt lọc tối thiểu; không gửi key thì createBatchVideo mặc định 18 phút. */
    MAVID_MIN_DURATION_MINUTES: minDur > 0 ? String(minDur) : '0',
  };
  if (config.email) {
    env.MAVID_EMAIL = config.email;
  }
  return env;
}
