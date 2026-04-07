import type { VideoReupFullConfig } from '../types';

/** Biến cấu hình UI Reup Full → env cho createBatchVideo (npm). */
export function buildMavidEnvForReupFull(config: VideoReupFullConfig): Record<string, string> {
  const maxBatch = Math.max(1, Math.min(100, Math.floor(Number(config.maxVideosPerBatch) || 5)));
  const overlay = String(config.overlay ?? '').trim();
  const env: Record<string, string> = {
    MAVID_CHANNEL: config.channel.trim(),
    MAVID_EMAIL: String(config.email ?? '').trim(),
    MAVID_MAX_VIDEOS_PER_BATCH: String(maxBatch),
  };
  if (overlay) env.MAVID_OVERLAY = overlay;
  return env;
}
