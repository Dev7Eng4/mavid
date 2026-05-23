/**
 * Đường dẫn cố định dùng trong luồng Flow (thumbnail YouTube trong downloads).
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Thư mục `downloads/` ở root project. */
export const FLOW_DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

export const CREATE_IMAGE_TOOL_URI = 'tool/c28faaec-2222-4172-b2d6-29b8293642ba';
export const CREATE_IMAGE_VERSION_TOOL_URI = 'tool-version/8359c92a-3597-4760-9803-f79cbe88115d';
