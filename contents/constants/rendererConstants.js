/**
 * Constants dùng trong renderer Vite — không import fs/url/path.
 * Nguồn: defaults repo (buildConstantsModuleBase), không đọc appSettings.user.json.
 * Trong Electron, UI nên ưu tiên getConstantsUiModel để lấy overlay user.
 */
import { buildConstantsModuleBase } from './constantsModuleBase.js';

const m = buildConstantsModuleBase();

export const MAX_SCHEDULED_DAYS = m.MAX_SCHEDULED_DAYS;
export const MAX_VIDEOS_PREPARE_AHEAD = m.MAX_VIDEOS_PREPARE_AHEAD;
