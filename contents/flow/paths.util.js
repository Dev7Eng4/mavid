/**
 * Đường dẫn cố định dùng trong luồng Flow (thumbnail YouTube trong downloads).
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Thư mục `downloads/` ở root project. */
export const FLOW_DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');
