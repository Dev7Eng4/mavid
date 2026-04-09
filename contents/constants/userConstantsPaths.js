import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** File JSON chồng lên defaults (dev / chạy script từ repo) — không commit, tạo khi Lưu Settings. */
export const APP_SETTINGS_USER_JSON_BASENAME = 'appSettings.user.json';

export function getAppSettingsUserJsonPath() {
  return path.join(__dirname, APP_SETTINGS_USER_JSON_BASENAME);
}
