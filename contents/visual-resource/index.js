import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { getChannelInfo } from '../video-info/getInfoChannel.js';
import { ASSETS_DIR, ROOT_DIR, VISUAL_RESOURCE_TYPES } from './constant.js';

const MIN_DURATION_SECONDS = 30 * 60;

function parseDurationToSeconds(duration) {
  if (!duration) return 0;
  const parts = String(duration).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/**
 * @param {Object} options
 * @param {string} options.link - Link kênh YouTube
 * @param {'N'|'S'} options.type - N = Narrator, S = Stock video
 */
async function main(options = {}) {
  const { link, type } = options;

  if (!link) throw new Error('Thiếu link kênh YouTube.');
  if (!type || ![VISUAL_RESOURCE_TYPES.NARRATOR, VISUAL_RESOURCE_TYPES.STOCK_VIDEO].includes(type)) {
    throw new Error(`Type không hợp lệ. Chỉ chấp nhận: ${Object.values(VISUAL_RESOURCE_TYPES).join(', ')}`);
  }

  console.log(`[visual-resource] Đang lấy thông tin kênh: ${link}`);
  const channelResult = await getChannelInfo(link);

  const channelId = channelResult.metadata?.channel_id;
  if (!channelId) throw new Error('Không tìm thấy ID kênh.');

  console.log(`[visual-resource] Kênh: ${channelResult.name} (${channelId}) — ${channelResult.video_count} video`);

  const longVideos = (channelResult.video_links || []).filter(v => parseDurationToSeconds(v.duration) > MIN_DURATION_SECONDS);

  console.log(`[visual-resource] Tìm thấy ${longVideos.length} video trên 30 phút`);

  if (longVideos.length === 0) {
    console.warn('[visual-resource] Không có video nào trên 30 phút.');
    return { success: true, channelId, videoCount: 0 };
  }

  const subFolder = type === VISUAL_RESOURCE_TYPES.NARRATOR ? 'narrator' : 'stock';
  const outputDir = path.join(ASSETS_DIR, subFolder, channelId);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${channelId}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Visual Resource', { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.addRow(['LINK', 'DURATION', 'USED']);
  for (const video of longVideos) {
    sheet.addRow([video.url, video.duration, '']);
  }

  sheet.columns = [{ width: 60 }, { width: 15 }, { width: 10 }];

  await workbook.xlsx.writeFile(outputPath);
  console.log(`[visual-resource] Đã lưu ${longVideos.length} video vào ${path.relative(ROOT_DIR, outputPath)}`);

  const configPath = path.join(outputDir, 'mavid-config.json');
  const config = {
    channelId,
    channelName: channelResult.name,
    type,
    typeLabel: type === VISUAL_RESOURCE_TYPES.NARRATOR ? 'narrator' : 'stock-video',
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`[visual-resource] Đã lưu config vào ${path.relative(ROOT_DIR, configPath)}`);

  return { success: true, channelId, channelName: channelResult.name, videoCount: longVideos.length, outputPath };
}

export default main;
