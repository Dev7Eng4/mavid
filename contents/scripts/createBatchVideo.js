import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CHANNELS_DIR = path.join(ROOT, 'channels');

/**
 * @param {Record<string, unknown>} props
 * @returns {number} 1..100, mặc định 5
 */
function resolveBatchLimit(props = {}) {
  const raw = props.maxVideosPerBatch ?? process.env.MAVID_MAX_VIDEOS_PER_BATCH;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(100, Math.floor(n));
}

/**
 * Phút tối thiểu (độ dài video trong Excel) — 0 = không lọc.
 * Env: MAVID_MIN_DURATION_MINUTES
 */
function resolveMinDurationMinutes(props = {}) {
  const raw = props.minDurationMinutes ?? process.env.MAVID_MIN_DURATION_MINUTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(10080, Math.floor(n));
}

/** Parse ô DURATION (HH:mm:ss, mm:ss, số giây) → giây, hoặc null. */
function parseDurationCellToSeconds(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const parts = s.split(':').map(p => p.trim());
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const sec = parseFloat(parts[2]);
    if (![h, m].every(x => Number.isFinite(x) && x >= 0) || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(h * 3600 + m * 60 + sec);
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (!Number.isFinite(m) || m < 0 || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(m * 60 + sec);
  }
  return null;
}

const DATA_FILE_PATHS = [
  path.join(ROOT, 'channels', '*', 'output.xlsx'),
  path.join(ROOT, 'channels', '*', 'output.csv'),
  path.join(ROOT, 'channels', 'output.xlsx'),
  path.join(ROOT, 'channels', 'output.csv'),
  path.join(ROOT, 'output.xlsx'),
  path.join(ROOT, 'output.csv'),
];

export async function findDataFile() {
  const glob = (await import('glob')).default;
  for (const pattern of DATA_FILE_PATHS) {
    const files = glob.sync(pattern.replace(/\\/g, '/'));
    if (files.length > 0) return files[0];
  }
  return null;
}

/**
 * Đọc file Excel/CSV và lấy danh sách URL từ cột Video
 * @param {string|null} [inputFile]
 * @param {{ minDurationMinutes?: number }} [options] — > 0: chỉ giữ dòng có cột DURATION ≥ số phút (cần cột DURATION)
 */
export async function readVideoUrlsFromFile(inputFile = null, options = {}) {
  let filePath = inputFile;
  if (!filePath) {
    filePath = await findDataFile();
  }

  if (!filePath) {
    throw new Error(`Không tìm thấy file output. Cần tạo từ "Lấy thông tin YouTube" trước.`);
  }

  if (filePath.endsWith('.xlsx')) {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) throw new Error('File Excel không có dữ liệu.');
    const headerRow = sheet.getRow(1);
    const videoIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'link video');
    if (videoIdx < 0) throw new Error('Không tìm thấy cột LINK VIDEO.');
    const trangThaiIdx = headerRow.values.findIndex(v =>
      String(v || '')
        .toLowerCase()
        .includes('status'),
    );
    const bgIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'background video');
    const startIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'start from');
    const durationIdx = headerRow.values.findIndex(v => String(v || '').trim().toLowerCase() === 'duration');

    const minMin = Number(options.minDurationMinutes);
    const filterByDuration = Number.isFinite(minMin) && minMin > 0;
    const minSeconds = filterByDuration ? minMin * 60 : 0;
    let warnedNoDuration = false;

    let hasFoundStart = startIdx < 0; // Nếu không có cột START FROM thì coi như đã bắt đầu ngay lập tức
    if (!hasFoundStart) {
      // Nếu có cột START FROM, kiểm tra xem thực tế có dòng nào được đánh dấu không.
      // Nếu toàn bộ cột trống, mặc định là bắt đầu luôn.
      let hasAnyMark = false;
      for (let j = 2; j <= sheet.rowCount; j++) {
        if (String(sheet.getRow(j).getCell(startIdx).value || '').trim()) {
          hasAnyMark = true;
          break;
        }
      }
      if (!hasAnyMark) hasFoundStart = true;
    }

    const items = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

      // Nếu chưa tìm thấy điểm bắt đầu và có cột START FROM
      if (!hasFoundStart) {
        const startVal = String(row.getCell(startIdx).value || '').trim();
        if (startVal) {
          hasFoundStart = true;
        }
      }
      if (!hasFoundStart) continue;

      if (trangThaiIdx >= 0) {
        const trangThai = String(row.getCell(trangThaiIdx).value || '').trim();
        if (trangThai) continue;
      }
      const rawVal = row.getCell(videoIdx).value;
      const val = rawVal && typeof rawVal === 'object' ? String(rawVal.text || rawVal.hyperlink || '').trim() : String(rawVal || '').trim();
      const defaultBg = process.env.MAVID_BACKGROUND || 'cat';
      const bgVal = bgIdx >= 0 ? String(row.getCell(bgIdx).value || '').trim() : defaultBg;
      if (val && (val.startsWith('http://') || val.startsWith('https://')) && !val.includes('(Không có video)')) {
        if (filterByDuration) {
          if (durationIdx < 0) {
            if (!warnedNoDuration) {
              console.warn('[MaVid] minDurationMinutes > 0 nhưng không có cột DURATION — bỏ qua lọc độ dài.');
              warnedNoDuration = true;
            }
          } else {
            const sec = parseDurationCellToSeconds(row.getCell(durationIdx).value);
            if (sec == null || sec < minSeconds) continue;
          }
        }
        items.push({
          url: val,
          background: bgVal || defaultBg,
        });
      }
    }
    return items;
  }

  const defaultBg = process.env.MAVID_BACKGROUND || 'cat';
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('File CSV không có dữ liệu.');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const videoIdx = headers.findIndex(h => h.toLowerCase() === 'link video');
  if (videoIdx < 0) throw new Error('Không tìm thấy cột LINK VIDEO trong CSV.');
  const trangThaiIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
  const bgIdx = headers.findIndex(h => h.toLowerCase() === 'background video');
  const startIdx = headers.findIndex(h => h.toLowerCase() === 'start from');
  const durationIdx = headers.findIndex(h => h.trim().toLowerCase() === 'duration');

  const minMinCsv = Number(options.minDurationMinutes);
  const filterByDurationCsv = Number.isFinite(minMinCsv) && minMinCsv > 0;
  const minSecondsCsv = filterByDurationCsv ? minMinCsv * 60 : 0;
  let warnedNoDurationCsv = false;

  let hasFoundStart = startIdx < 0;
  if (!hasFoundStart) {
    const hasAnyMark = lines.slice(1).some(line => {
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      return (cells[startIdx] || '').trim();
    });
    if (!hasAnyMark) hasFoundStart = true;
  }

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));

    if (!hasFoundStart) {
      const startVal = (cells[startIdx] || '').trim();
      if (startVal) {
        hasFoundStart = true;
      }
    }
    if (!hasFoundStart) continue;

    if (trangThaiIdx >= 0) {
      const trangThai = (cells[trangThaiIdx] || '').trim();
      if (trangThai) continue;
    }
    const val = cells[videoIdx] || '';
    const bgVal = bgIdx >= 0 ? (cells[bgIdx] || '').trim() : defaultBg;
    if (val && (val.startsWith('http://') || val.startsWith('https://')) && !val.includes('(Không có video)')) {
      if (filterByDurationCsv) {
        if (durationIdx < 0) {
          if (!warnedNoDurationCsv) {
            console.warn('[MaVid] minDurationMinutes > 0 nhưng CSV không có cột DURATION — bỏ qua lọc độ dài.');
            warnedNoDurationCsv = true;
          }
        } else {
          const sec = parseDurationCellToSeconds(cells[durationIdx]);
          if (sec == null || sec < minSecondsCsv) continue;
        }
      }
      items.push({
        url: val,
        background: bgVal || defaultBg,
      });
    }
  }
  return items;
}

/**
 * Suy ra tên folder channel từ đường dẫn file dữ liệu (output.xlsx nằm trong channels/TênChannel/).
 */
function inferChannelFolderName(inputFile, channelsDir) {
  if (!inputFile) return null;
  const dir = path.dirname(path.resolve(inputFile));
  const base = path.resolve(channelsDir);
  const rel = path.relative(base, dir);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const first = rel.split(/[/\\]/)[0];
  return first || null;
}

/**
 * Props giống `main(options)` của makeVideoFromAudio — chỉ gói field có truyền (còn lại makeVideoFromAudio đọc MAVID_* / mặc định).
 * @param {Record<string, unknown>} props
 * @param {string|null} channelFolderName
 * @returns {{ stockVideoCount?: number; audioSpeed?: number; stockFolder?: string; showLogo?: boolean; channel?: string }}
 */
function buildMakeVideoFromAudioOptions(props, channelFolderName) {
  /** @type {Record<string, unknown>} */
  const o = {};
  if (props.stockVideoCount !== undefined) {
    o.stockVideoCount = props.stockVideoCount;
  }
  if (props.audioSpeed != null && Number.isFinite(Number(props.audioSpeed)) && Number(props.audioSpeed) > 0) {
    o.audioSpeed = Number(props.audioSpeed);
  }
  if (props.stockFolder != null && String(props.stockFolder).trim() !== '') {
    o.stockFolder = String(props.stockFolder).trim();
  }
  if (props.showLogo === true) o.showLogo = true;
  else if (props.showLogo === false) o.showLogo = false;

  if (channelFolderName && String(channelFolderName).trim()) {
    o.channel = String(channelFolderName).trim();
  }
  return o;
}

/**
 * Main function - có thể gọi từ CLI hoặc UI
 * @param {Object} props - Tùy chọn
 * @param {string} [props.videoType] - Loại video ('from_audio' | 'reup_full')
 * @param {string} [props.channel] - Tên folder channel (skip prompt nếu có)
 * @param {number} [props.stockVideoCount] — (from_audio) giống makeVideoFromAudio: 0 / bỏ qua → dynamic
 * @param {number} [props.audioSpeed] — (from_audio) atempo, vd 0.91
 * @param {string} [props.stockFolder] — (from_audio) folder trong assets/backgrounds
 * @param {boolean} [props.showLogo] — (from_audio) true: ảnh đầu tiên trong channels/{channel}
 * @param {number} [props.maxVideosPerBatch] — tối đa số video mỗi lần chạy; env MAVID_MAX_VIDEOS_PER_BATCH; mặc định 5
 * @param {string} [props.overlay] — (reup_full) tên preset OVERLAY_OPTIONS
 * @param {string|number} [props.videoCropPercent] — (reup_full) VIDEO_CROP_PERCENT
 * @param {number} [props.minDurationMinutes] — chỉ xử lý video có độ dài (cột DURATION) ≥ N phút; 0 = không lọc; env MAVID_MIN_DURATION_MINUTES
 */
async function main(props = {}) {
  const { MAKE_VIDEO_MODE } = await import('../constants/index.js');
  const { videoType } = props;
  const batchLimit = resolveBatchLimit(props);
  const minDurationMinutes = resolveMinDurationMinutes(props);

  const channelParam = props.channel || process.env.MAVID_CHANNEL;
  const overlayReup = props.overlay ?? process.env.MAVID_OVERLAY;
  const videoCropReup = props.videoCropPercent ?? process.env.MAVID_VIDEO_CROP_PERCENT;

  let inputFile = null;
  let effectiveChannelName = channelParam || null;

  if (channelParam) {
    const folderPath = path.join(CHANNELS_DIR, channelParam);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
      if (files.length > 0) {
        inputFile = path.join(folderPath, files[0]);
        console.log(`[MaVid] Channel: ${channelParam} → ${files[0]}`);
      } else {
        throw new Error(`Không tìm thấy file excel (.xlsx, .csv) trong folder: ${channelParam}`);
      }
    } else {
      throw new Error(`Không tìm thấy channel folder: ${channelParam}`);
    }
  } else if (fs.existsSync(CHANNELS_DIR)) {
    const entries = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);

    let selectedFolder = null;

    if (folders.length > 1) {
      const inquirer = (await import('inquirer')).default;
      const result = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedFolder',
          message: 'Chọn channel folder để chạy batch:',
          choices: folders,
        },
      ]);
      selectedFolder = result.selectedFolder;
    } else if (folders.length === 1) {
      selectedFolder = folders[0];
    } else {
      throw new Error('Không tìm thấy folder nào trong directories channels');
    }

    if (selectedFolder) {
      effectiveChannelName = selectedFolder;
      const folderPath = path.join(CHANNELS_DIR, selectedFolder);
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));

      if (files.length > 0) {
        inputFile = path.join(folderPath, files[0]);
      } else {
        throw new Error(`Không tìm thấy file excel (.xlsx, .csv) trong folder: ${selectedFolder}`);
      }
    }
  }

  if (!inputFile) {
    inputFile = await findDataFile();
  }
  if (!effectiveChannelName && inputFile) {
    effectiveChannelName = inferChannelFolderName(inputFile, CHANNELS_DIR);
  }

  let items = await readVideoUrlsFromFile(inputFile, { minDurationMinutes });
  if (minDurationMinutes > 0) {
    console.log(`[MaVid] Lọc độ dài: chỉ video ≥ ${minDurationMinutes} phút (cột DURATION).`);
  }
  if (items.length === 0) {
    throw new Error(
      minDurationMinutes > 0
        ? `Không có link video nào thỏa điều kiện (≥ ${minDurationMinutes} phút) trong CSV/Excel.`
        : 'Không có link video nào trong CSV/Excel.',
    );
  }

  if (items.length > batchLimit) {
    console.log(`\t> Giới hạn tối đa ${batchLimit} video per batch, bỏ qua ${items.length - batchLimit} link còn lại.`);
    items = items.slice(0, batchLimit);
  }
  console.log(`Đọc được ${items.length} link từ file. Bắt đầu xử lý tuần tự...\n`);

  let result;
  try {
    if (videoType === MAKE_VIDEO_MODE.FROM_AUDIO) {
      const { default: makeVideoFromAudio } = await import('../makeVideoFromAudio.js');
      result = await makeVideoFromAudio({
        inputFile,
        items,
        batchLimit,
        syncProgressToSpreadsheet: false,
        ...buildMakeVideoFromAudioOptions(props, effectiveChannelName),
      });
    } else if (videoType === MAKE_VIDEO_MODE.REUP_FULL) {
      const { default: makeVideoFromFull } = await import('../makeVideoFromFull.js');
      result = await makeVideoFromFull({
        inputFile,
        items,
        batchLimit,
        syncProgressToSpreadsheet: false,
        ...(overlayReup != null && String(overlayReup).trim() !== '' ? { overlay: String(overlayReup).trim() } : {}),
        ...(videoCropReup !== undefined && videoCropReup !== null && String(videoCropReup).trim() !== ''
          ? { VIDEO_CROP_PERCENT: videoCropReup }
          : {}),
      });
    }
  } finally {
    try {
      const { syncProgressFromFileToSpreadsheet } = await import('../syncProgressToSpreadsheet.js');
      await syncProgressFromFileToSpreadsheet(inputFile);
    } catch (e) {
      console.warn('[sync] Đồng bộ STATUS từ progress → Excel/CSV:', e.message);
    }
  }

  return {
    success: true,
    mode: 'batch',
    videoType,
    itemCount: items.length,
    inputFile,
    result,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export default main;
