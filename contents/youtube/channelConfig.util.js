/**
 * Đọc / tra cứu `mavid-channel-config.json` trong thư mục kênh.
 */
import fs from 'fs';
import path from 'path';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { CHANNEL_CONFIG_FILE } from '../constants/channel.js';
import { assertSafeChannelFolder } from './channelFolder.util.js';

/**
 * @param {string} channelFolder
 * @returns {object}
 */
export function readMavidChannelConfigFile(channelFolder) {
  const safe = assertSafeChannelFolder(channelFolder);
  const p = path.join(resolveChannelsDir(), safe, CHANNEL_CONFIG_FILE);
  if (!fs.existsSync(p)) throw new Error(`Không tìm thấy ${CHANNEL_CONFIG_FILE} trong thư mục kênh «${safe}».`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    throw new Error(`File ${CHANNEL_CONFIG_FILE} không đọc được (JSON hỏng).`);
  }
  if (!data || typeof data !== 'object') throw new Error('Cấu hình kênh không hợp lệ.');
  return data;
}

/**
 * @param {object} config
 * @param {string} email
 * @returns {object | null}
 */
export function findChannelRowByEmail(config, email) {
  const want = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!want) return null;
  const list = Array.isArray(config.channels) ? config.channels : [];
  return (
    list.find(
      ch =>
        String(ch?.email ?? '')
          .trim()
          .toLowerCase() === want
    ) ?? null
  );
}

/**
 * Trích các trường lịch/upload từ một phần tử `channels[]`.
 * @param {object} row
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
