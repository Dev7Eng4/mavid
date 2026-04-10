/**
 * Barrel export — API YouTube/GPM dùng từ app hoặc script khác.
 * Entry upload: `uploadViaGpm.js` (default export) được Electron `run-script` gọi trực tiếp.
 */
export { YOUTUBE_SELECTOR } from './studioSelectors.js';
export { assertSafeChannelFolder } from './channelFolder.util.js';
export {
  readMavidChannelConfigFile,
  findChannelRowByEmail,
  pickPublishFieldsFromChannelRow,
} from './channelConfig.util.js';
export { getYoutubePublishPlan } from './publishSchedule.util.js';
export {
  syncChannelAfterYoutubeUpload,
  resolveChannelSpreadsheetPath,
  STATUS_DA_DANG_VIDEO,
  updateChannelConfigInfo,
  MAVID_CHANNEL_CONFIG_FILENAME,
} from './uploadAfterSync.js';
export { apiRootForPlaywright, firstMp4InDir, assertSafeSubfolderName, listUploadJobs } from './uploadJobs.util.js';
