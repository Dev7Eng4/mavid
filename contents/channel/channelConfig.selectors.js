export function findChannelRowById(config, id) {
  if (!id) return null;

  const list = Array.isArray(config?.channels) ? config.channels : [];

  return list.find(ch => ch.id === id) ?? null;
}

export function pickPublishFieldsFromChannelRow(row) {
  if (!row || typeof row !== 'object') {
    throw new Error('Thiếu dòng cấu hình kênh (theo email).');
  }

  return {
    videosPerDayPreset: String(row.videosPerDayPreset ?? '1').trim() || '1',
    publishTimes: Array.isArray(row.publishTimes) ? row.publishTimes.map(x => String(x ?? '').trim()) : [],
    lastUpload: row.lastUpload != null ? String(row.lastUpload) : '',
    uploadedVideos: 0,
    latestUploadDate: row.latestUploadDate != null ? String(row.latestUploadDate).trim() : '',
    latestUploadTime: row.latestUploadTime != null ? String(row.latestUploadTime).trim() : '',
  };
}
