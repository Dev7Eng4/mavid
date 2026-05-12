/**
 * Luồng: đảm bảo thư mục gốc MaVidMedia trên Drive → quét MaVidMedia/videos/{channel}/{video}/ →
 * upload từng folder video lên Drive MaVidMedia/{channel}/ → xóa folder video cục bộ khi thành công.
 */
import fs from 'fs';
import path from 'path';
import { resolveVideosDir } from '../utils/channelsStoragePath.js';
import { assertSafeSubfolderName } from '../youtube/uploadJobs.util.js';
import { getDrive } from './auth.util.js';
import { ensureChildFolder } from './driveFolders.util.js';
import { uploadLocalDirectoryTree } from './uploadLocalDir.util.js';
import { MAVID_MEDIA_FOLDER } from '../api/urls/getListAllPaths.js';

const LOG = '[syncVideosToDrive]';

/**
 * @typedef {object} SyncVideosToDriveOptions
 * @property {string} [videosRootAbs] — mặc định `resolveVideosDir()`
 * @property {string} [driveRootName] — mặc định
 */

/**
 * @param {SyncVideosToDriveOptions} [opts]
 */
export async function runSyncVideosToDrive(opts = {}) {
  const videosRoot = opts.videosRootAbs || resolveVideosDir();
  const driveRootName = opts.driveRootName || MAVID_MEDIA_FOLDER;

  if (!fs.existsSync(videosRoot) || !fs.statSync(videosRoot).isDirectory()) {
    console.warn(`${LOG} Không có thư mục videos: ${videosRoot}`);
    return { ok: false, reason: 'missing_videos_root' };
  }

  const drive = await getDrive();
  const rootFolderId = await ensureChildFolder(drive, 'root', driveRootName);
  console.log(`${LOG} Thư mục Drive gốc «${driveRootName}» id=${rootFolderId}`);

  const channelNames = fs
    .readdirSync(videosRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const summary = { channels: 0, videosUploaded: 0, videosSkipped: 0, invalidNames: 0, errors: [] };

  for (const channelRaw of channelNames) {
    const channel = assertSafeSubfolderName(channelRaw);
    if (!channel) {
      console.warn(`${LOG} Bỏ qua tên kênh không hợp lệ: «${channelRaw}»`);
      summary.invalidNames++;
      continue;
    }

    const channelLocalAbs = path.join(videosRoot, channel);
    const driveChannelId = await ensureChildFolder(drive, rootFolderId, channel);
    summary.channels++;
    console.log(`${LOG} Kênh «${channel}» → Drive folder id=${driveChannelId}`);

    const videoFolders = fs
      .readdirSync(channelLocalAbs, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const videoRaw of videoFolders) {
      const videoName = assertSafeSubfolderName(videoRaw);
      if (!videoName) {
        console.warn(`${LOG} Bỏ qua tên video không hợp lệ: «${videoRaw}» (${channel})`);
        summary.videosSkipped++;
        continue;
      }

      const videoLocalAbs = path.join(channelLocalAbs, videoName);
      try {
        const videoDriveParentId = await ensureChildFolder(drive, driveChannelId, videoName);
        await uploadLocalDirectoryTree(drive, videoLocalAbs, videoDriveParentId);
        fs.rmSync(videoLocalAbs, { recursive: true, force: true });
        console.log(`${LOG} Đã upload + xóa cục bộ: ${channel}/${videoName}`);
        summary.videosUploaded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`${LOG} Lỗi ${channel}/${videoName}: ${msg}`);
        summary.errors.push({ channel, video: videoName, message: msg });
      }
    }
  }

  return { ok: summary.errors.length === 0, summary };
}

export default runSyncVideosToDrive;
