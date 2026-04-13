/**
 * Nạp `MaVid/.env` vào `process.env` (không ghi đè biến đã có).
 * Tiến trình `node …/syncVideosToDrive.cli.js` spawn từ Electron không kế thừa Vite.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

config({ path: path.join(repoRoot, '.env') });
