import type { VideoReupFullConfig } from '../types';

/** Biến cấu hình UI Reup Full → env cho createBatchVideo (npm). */
export function buildMavidEnvForReupFull(config: VideoReupFullConfig): Record<string, string> {
  const crop = Math.min(49, Math.max(0, Math.floor(Number(config.videoCropPercent) || 0)));
  const maxBatch = Math.max(1, Math.min(100, Math.floor(Number(config.maxVideosPerBatch) || 5)));
  const minDur = Math.max(0, Math.min(10080, Math.floor(Number(config.minDurationMinute ?? 0) || 0)));
  const maxDur = Math.max(0, Math.min(10080, Math.floor(Number(config.maxDurationMinute ?? 0) || 0)));
  return {
    MAVID_CHANNEL: config.channel.trim(),
    MAVID_OVERLAY: String(config.overlay ?? '').trim(),
    MAVID_VIDEO_CROP_PERCENT: String(crop),
    MAVID_MAX_VIDEOS_PER_BATCH: String(maxBatch),
    MAVID_MIN_DURATION_MINUTE: String(minDur),
    MAVID_MAX_DURATION_MINUTE: String(maxDur),
  };
}
