/** Biến cấu hình UI Reup Full → env cho createBatchVideo (npm). */
export function buildMavidEnvForReupFull(channel: string, videos: string[], maxVideosPerBatch?: number): Record<string, string> {
  const maxBatch = Math.max(1, Math.min(100, Math.floor(Number(maxVideosPerBatch) || 5)));
  const env: Record<string, string> = {
    MAVID_CHANNEL: channel.trim(),
    MAVID_VIDEOS: String(videos),
    MAVID_MAX_VIDEOS_PER_BATCH: String(maxBatch),
  };
  return env;
}
