/**
 * Duyệt mọi thư mục con trong MaVidMedia/channels; nếu có file dữ liệu (.xlsx/.csv) và *_progress.json tương ứng
 * thì đồng bộ cột STATUS vào Excel/CSV.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getChannelsDirPath } from '../api/urls/getListAllPaths.js';
import { syncProgressFromFileToSpreadsheet } from '../syncProgressToSpreadsheet.js';

const CHANNELS_DIR = getChannelsDirPath();

/** File .xlsx / .csv đầu tiên trong folder (ưu tiên .xlsx) — cùng quy tắc với batch/UI. */
function getChannelDataFile(channelDir) {
  if (!fs.existsSync(channelDir) || !fs.statSync(channelDir).isDirectory()) return null;
  const names = fs.readdirSync(channelDir);
  const dataFiles = names
    .filter(f => /\.xlsx$/i.test(f) || /\.csv$/i.test(f))
    .sort((a, b) => {
      const ax = /\.xlsx$/i.test(a);
      const bx = /\.xlsx$/i.test(b);
      if (ax && !bx) return -1;
      if (!ax && bx) return 1;
      return a.localeCompare(b);
    });
  if (dataFiles.length === 0) return null;
  return path.join(channelDir, dataFiles[0]);
}

async function main() {
  if (!fs.existsSync(CHANNELS_DIR)) {
    console.error('Không tìm thấy thư mục kênh (MaVidMedia/channels — kiểm tra VIDEO_STORAGE_ROOT trong constants).');
    process.exit(1);
  }

  const entries = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true });
  const dirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b));

  let synced = 0;
  let skipped = 0;

  for (const name of dirs) {
    const channelDir = path.join(CHANNELS_DIR, name);
    const dataFile = getChannelDataFile(channelDir);
    if (!dataFile) {
      skipped++;
      continue;
    }

    const progressPath = dataFile.replace(/\.(xlsx|csv)$/i, '_progress.json');
    if (!fs.existsSync(progressPath)) {
      skipped++;
      continue;
    }

    console.log(`\n→ Channel "${name}": ${path.basename(dataFile)} + ${path.basename(progressPath)}`);
    try {
      await syncProgressFromFileToSpreadsheet(dataFile);
      synced++;
    } catch (e) {
      console.error(`   Lỗi: ${e.message}`);
    }
  }

  console.log(`\nHoàn tất: đồng bộ ${synced} channel, bỏ qua ${skipped} (không có data file hoặc không có _progress.json).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export default main;
