/**
 * @param {Record<string, any>} config
 * @param {string} email
 * @returns {Record<string, any> | null}
 */
export function findChannelRowByEmail(config, email) {
  const want = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!want) return null;
  const list = Array.isArray(config?.channels) ? config.channels : [];
  return (
    list.find(
      ch =>
        String(ch?.email ?? '')
          .trim()
          .toLowerCase() === want,
    ) ?? null
  );
}

export function findChannelRowById(config, id) {
  if (!id) return null;
  const list = Array.isArray(config?.channels) ? config.channels : [];
  return (
    list.find(
      ch =>
        String(ch?.id ?? '')
          .trim()
          .toLowerCase() === id,
    ) ?? null
  );
}

/**
 * Trích các trường lịch/upload từ một phần tử `channels[]`.
 * @param {Record<string, any>} row
 */
export function pickPublishFieldsFromChannelRow(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('Thiếu dòng cấu hình kênh (theo email).');
  }
  return {
    videosPerDayPreset: String(row.videosPerDayPreset ?? '1').trim() || '1',
    publishTimes: Array.isArray(row.publishTimes) ? row.publishTimes.map(x => String(x ?? '').trim()) : [],
    lastUpload: row.lastUpload != null ? String(row.lastUpload) : '',
    uploadedVideos: Number.isFinite(Number(row.uploadedVideos)) ? Math.max(0, Math.floor(Number(row.uploadedVideos))) : 0,
    latestUploadDate: row.latestUploadDate != null ? String(row.latestUploadDate).trim() : '',
    latestUploadTime: row.latestUploadTime != null ? String(row.latestUploadTime).trim() : '',
  };
}
