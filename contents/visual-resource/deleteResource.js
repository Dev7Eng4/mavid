import path from 'path';
import fs from 'fs';
import { ASSETS_DIR, SUB_FOLDERS } from './constant.js';

/**
 * @param {string} channelId
 */
export default function deleteResource(channelId) {
  if (!channelId) throw new Error('Thiếu channelId.');

  let deleted = false;

  for (const subFolder of SUB_FOLDERS) {
    const targetDir = path.join(ASSETS_DIR, subFolder, channelId);
    if (!fs.existsSync(targetDir)) continue;

    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(`[visual-resource] Đã xóa: ${subFolder}/${channelId}`);
    deleted = true;
  }

  if (!deleted) {
    throw new Error(`Không tìm thấy folder cho channelId: ${channelId}`);
  }

  return { success: true, channelId };
}
