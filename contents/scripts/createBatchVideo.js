import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CHANNELS_DIR = resolveChannelsDir();

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

/**
 * Phút tối đa (độ dài video trong Excel) — 0 = không lọc.
 * Env: MAVID_MAX_DURATION_MINUTES (hoặc MAVID_MAX_DURATION_MINUTE)
 */
function resolveMaxDurationMinutes(props = {}) {
  const raw = props.maxDurationMinutes ?? process.env.MAVID_MAX_DURATION_MINUTES ?? process.env.MAVID_MAX_DURATION_MINUTE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(10080, Math.floor(n));
}

/**
 * Tự động tìm GPM Profile ID bằng cách khớp Name Profile = Email trong config.
 * @param {string} email
 * @returns {Promise<string | null>}
 */
async function resolveGpmProfileIdByEmail(email) {
  if (!email || !email.trim()) return null;
  const normEmail = email.trim().toLowerCase();
  const apiBase = process.env.GPM_API_BASE || 'http://127.0.0.1:19995';
  const url = apiBase.replace(/\/+$/, '') + '/api/v3/profiles?per_page=500';

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const hit = json.data.find(
        p =>
          String(p.name || '')
            .trim()
            .toLowerCase() === normEmail
      );
      return hit?.id || null;
    }
  } catch (e) {
    console.warn(`[gpm] Không thể tự động lấy danh sách profiles từ GPM Local API: ${e.message}`);
  }
  return null;
}

/**
 * @param {{ minDurationMinutes?: number; maxDurationMinutes?: number }} options — giá trị đã resolve (0 = tắt)
 * @returns {{ hasMin: boolean; hasMax: boolean; minSec: number; maxSec: number; needsColumn: boolean }}
 */
function resolveDurationFilterBounds(options = {}) {
  let minMin = Number(options.minDurationMinutes);
  let maxMax = Number(options.maxDurationMinutes);
  const hasMin = Number.isFinite(minMin) && minMin > 0;
  const hasMax = Number.isFinite(maxMax) && maxMax > 0;
  if (hasMin && hasMax && minMin > maxMax) {
    const t = minMin;
    minMin = maxMax;
    maxMax = t;
    console.warn('[MaVid] minDuration > maxDuration — đã đổi chỗ khi lọc cột DURATION.');
  }
  return {
    hasMin,
    hasMax,
    minSec: hasMin ? minMin * 60 : 0,
    maxSec: hasMax ? maxMax * 60 : 0,
    needsColumn: hasMin || hasMax,
  };
}

/** @param {number|null} sec */
function durationWithinFilter(sec, bounds) {
  const { hasMin, hasMax, minSec, maxSec } = bounds;
  if (!hasMin && !hasMax) return true;
  if (sec == null) return false;
  if (hasMin && sec < minSec) return false;
  if (hasMax && sec > maxSec) return false;
  return true;
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
  path.join(CHANNELS_DIR, '*', 'output.xlsx'),
  path.join(CHANNELS_DIR, '*', 'output.csv'),
  path.join(CHANNELS_DIR, 'output.xlsx'),
  path.join(CHANNELS_DIR, 'output.csv'),
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
 * @param {{ minDurationMinutes?: number; maxDurationMinutes?: number }} [options] — > 0: lọc cột DURATION (phút → giây so sánh với ô)
 */
export async function readVideoUrlsFromFile(inputFile = null, options = {}) {
  let filePath = inputFile;
  if (!filePath) {
    filePath = await findDataFile();
  }

  if (!filePath) {
    throw new Error(`Không tìm thấy file output. Cần tạo từ "Lấy thông tin YouTube" trước.`);
  }

  const durBounds = resolveDurationFilterBounds(options);
  let warnedNoDurationColumn = false;

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
        .includes('status')
    );
    const bgIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'background video');
    const startIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'start from');
    const durationIdx = headerRow.values.findIndex(
      v =>
        String(v || '')
          .trim()
          .toLowerCase() === 'duration'
    );

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
        if (durBounds.needsColumn) {
          if (durationIdx < 0) {
            if (!warnedNoDurationColumn) {
              console.warn('[MaVid] Cần cột DURATION để lọc min/max độ dài nhưng không có cột — bỏ qua lọc độ dài.');
              warnedNoDurationColumn = true;
            }
          } else {
            const sec = parseDurationCellToSeconds(row.getCell(durationIdx).value);
            if (!durationWithinFilter(sec, durBounds)) continue;
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
      if (durBounds.needsColumn) {
        if (durationIdx < 0) {
          if (!warnedNoDurationColumn) {
            console.warn('[MaVid] Cần cột DURATION để lọc min/max độ dài nhưng CSV không có cột — bỏ qua lọc độ dài.');
            warnedNoDurationColumn = true;
          }
        } else {
          const sec = parseDurationCellToSeconds(cells[durationIdx]);
          if (!durationWithinFilter(sec, durBounds)) continue;
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
 * Suy ra tên folder channel từ đường dẫn file dữ liệu (output.xlsx nằm trong MaVidMedia/channels/TênChannel/).
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
const MAVID_CHANNEL_CONFIG_FILENAME = 'mavid-channel-config.json';

/**
 * Đọc JSON cấu hình kênh trong thư mục channel (Electron/UI cùng format).
 * @param {string} folderPath
 * @returns {Record<string, unknown>|null}
 */
function readMavidChannelConfigFromFolder(folderPath) {
  const p = path.join(folderPath, MAVID_CHANNEL_CONFIG_FILENAME);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[MaVid] Không đọc được ${MAVID_CHANNEL_CONFIG_FILENAME}: ${e.message}`);
    return null;
  }
}

function normalizeEmailForMatch(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Chọn một entry trong `channels[]` theo MAVID_EMAIL / props.email, hoặc phần tử đầu / root cũ.
 * @param {Record<string, unknown>|null} config
 * @param {string} [emailFromProps]
 * @returns {Record<string, unknown>|null}
 */
function pickChannelConfigItem(config, emailFromProps) {
  if (!config || typeof config !== 'object') return null;

  const list = Array.isArray(config.channels) ? config.channels : [];
  const want = normalizeEmailForMatch(emailFromProps);

  if (want && list.length > 0) {
    const found = list.find(c => c && typeof c === 'object' && normalizeEmailForMatch(c.email) === want);
    if (found) return /** @type {Record<string, unknown>} */ (found);
    console.warn(`[MaVid] Không tìm thấy email khớp trong ${MAVID_CHANNEL_CONFIG_FILENAME} — dùng phần tử đầu tiên.`);
  }
  if (list.length > 0) return /** @type {Record<string, unknown>} */ (list[0]);

  return null;
}

/**
 * Bổ sung field từ config kênh chỉ khi props/env chưa có (ưu tiên CLI/UI truyền vào).
 * @param {Record<string, unknown>} baseProps
 * @param {Record<string, unknown>|null} item
 */
function mergeChannelConfigIntoProps(baseProps, item) {
  if (!item || typeof item !== 'object') return baseProps;

  /** @type {Record<string, unknown>} */
  const o = { ...baseProps };
  const noVideoType = o.videoType == null || String(o.videoType).trim() === '';
  if (noVideoType && item.videoType != null && String(item.videoType).trim() !== '') {
    o.videoType = String(item.videoType).trim();
  }

  const hasMinProp = o.minDurationMinutes != null || o.minDurationMinute != null;
  if (!hasMinProp) {
    const from = item.durationMinuteFrom;
    if (from != null && Number.isFinite(Number(from)) && Math.floor(Number(from)) > 0) {
      o.minDurationMinutes = Math.floor(Number(from));
    }
  }
  const hasMaxProp = o.maxDurationMinutes != null || o.maxDurationMinute != null;
  if (!hasMaxProp) {
    const to = item.durationMinuteTo;
    if (to != null && Number.isFinite(Number(to)) && Math.floor(Number(to)) > 0) {
      o.maxDurationMinutes = Math.floor(Number(to));
    }
  }

  const stockEmpty = o.stockFolder == null || String(o.stockFolder).trim() === '';
  if (stockEmpty && item.background != null && String(item.background).trim() !== '') {
    o.stockFolder = String(item.background).trim();
  }

  const bgEnvEmpty = process.env.MAVID_BACKGROUND == null || String(process.env.MAVID_BACKGROUND).trim() === '';
  if (bgEnvEmpty && item.background != null && String(item.background).trim() !== '') {
    process.env.MAVID_BACKGROUND = String(item.background).trim();
  }

  const overlayPropEmpty = o.overlay == null || String(o.overlay).trim() === '';
  const overlayEnvEmpty = process.env.MAVID_OVERLAY == null || String(process.env.MAVID_OVERLAY).trim() === '';
  if (overlayPropEmpty && overlayEnvEmpty && item.overlay != null && String(item.overlay).trim() !== '') {
    o.overlay = String(item.overlay).trim();
  }

  const thumbEmpty = o.thumbnailPrompt == null || String(o.thumbnailPrompt).trim() === '';
  if (thumbEmpty && item.thumbnailPrompt != null && String(item.thumbnailPrompt).trim() !== '') {
    o.thumbnailPrompt = String(item.thumbnailPrompt).trim();
  }
  return o;
}

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
 * @param {number} [props.stockVideoCount] — (from_adio) giống makeVideoFromAudio: 0 / bỏ qua → dynamic
 * @param {number} [props.audioSpeed] — (from_audio) atempo, vd 0.91
 * @param {string} [props.stockFolder] — (from_audio) tên folder con trong MaVidMedia/backgrounds
 * @param {boolean} [props.showLogo] — (from_audio) true: ảnh đầu tiên trong MaVidMedia/channels/{channel}
 * @param {number} [props.maxVideosPerBatch] — tối đa số video mỗi lần chạy; env MAVID_MAX_VIDEOS_PER_BATCH; mặc định 5
 * @param {string} [props.overlay] — (reup_full) tên preset OVERLAY_OPTIONS
 * @param {string|number} [props.videoCropPercent] — (reup_full) VIDEO_CROP_PERCENT
 * @param {number} [props.minDurationMinutes] — chỉ xử lý video có độ dài (cột DURATION) ≥ N phút; 0 = không lọc; env MAVID_MIN_DURATION_MINUTES
 * @param {number} [props.maxDurationMinutes] — chỉ xử lý video có độ dài (cột DURATION) ≤ N phút; 0 = không lọc; env MAVID_MAX_DURATION_MINUTES
 */
async function main(props = {}) {
  const { MAKE_VIDEO_MODE } = await import('../constants/index.js');

  const channelParam = props.channel || process.env.MAVID_CHANNEL;
  const email = props.email || process.env.MAVID_EMAIL;
  const videoCropReup = props.videoCropPercent ?? process.env.MAVID_VIDEO_CROP_PERCENT;

  let mergedProps = { ...props };
  let inputFile = null;
  let effectiveChannelName = channelParam || null;

  if (channelParam) {
    const folderPath = path.join(CHANNELS_DIR, channelParam);
    if (fs.existsSync(folderPath)) {
      const cfg = readMavidChannelConfigFromFolder(folderPath);
      let configItem = null;
      if (cfg) {
        configItem = pickChannelConfigItem(cfg, email);
        mergedProps = mergeChannelConfigIntoProps(mergedProps, configItem);
        console.log(`[MaVid] Đã đọc ${MAVID_CHANNEL_CONFIG_FILENAME} trong folder "${channelParam}".`);
      }
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
      throw new Error('Không tìm thấy folder kênh nào trong MaVidMedia/channels');
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

  const { videoType } = mergedProps;
  const batchLimit = resolveBatchLimit(mergedProps);
  const minDurationMinutes = resolveMinDurationMinutes(mergedProps);
  const maxDurationMinutes = resolveMaxDurationMinutes(mergedProps);

  let items = await readVideoUrlsFromFile(inputFile, { minDurationMinutes, maxDurationMinutes });
  if (minDurationMinutes > 0 || maxDurationMinutes > 0) {
    const parts = [];
    if (minDurationMinutes > 0) parts.push(`≥ ${minDurationMinutes} phút`);
    if (maxDurationMinutes > 0) parts.push(`≤ ${maxDurationMinutes} phút`);
    console.log(`[MaVid] Lọc độ dài: ${parts.join(' và ')} (cột DURATION).`);
  }
  if (items.length === 0) {
    const filtered = minDurationMinutes > 0 || maxDurationMinutes > 0;
    throw new Error(
      filtered
        ? `Không có link video nào thỏa điều kiện độ dài (${minDurationMinutes > 0 ? `tối thiểu ${minDurationMinutes} phút` : ''}${
            minDurationMinutes > 0 && maxDurationMinutes > 0 ? ', ' : ''
          }${maxDurationMinutes > 0 ? `tối đa ${maxDurationMinutes} phút` : ''}) trong CSV/Excel.`
        : 'Không có link video nào trong CSV/Excel.'
    );
  }

  if (items.length > batchLimit) {
    console.log(`\t> Giới hạn tối đa ${batchLimit} video per batch, bỏ qua ${items.length - batchLimit} link còn lại.`);
    items = items.slice(0, batchLimit);
  }
  console.log(`Đọc được ${items.length} link từ file. Bắt đầu xử lý tuần tự...\n`);

  if (videoType !== MAKE_VIDEO_MODE.FROM_AUDIO && videoType !== MAKE_VIDEO_MODE.REUP_FULL) {
    throw new Error(
      'Thiếu hoặc không hợp lệ videoType (from_audio | reup_full). Truyền props.videoType hoặc ghi videoType trong mavid-channel-config.json khi chạy với MAVID_CHANNEL.'
    );
  }

  let result;
  try {
    if (videoType === MAKE_VIDEO_MODE.FROM_AUDIO) {
      const { default: makeVideoFromAudio } = await import('../makeVideoFromAudio.js');
      result = await makeVideoFromAudio({
        inputFile,
        items,
        batchLimit,
        thumbnailPrompt: mergedProps.thumbnailPrompt,
        ...buildMakeVideoFromAudioOptions(mergedProps, effectiveChannelName),
      });
    } else if (videoType === MAKE_VIDEO_MODE.REUP_FULL) {
      const { default: makeVideoFromFull } = await import('../makeVideoFromFull.js');
      result = await makeVideoFromFull({
        inputFile,
        items,
        batchLimit,
        thumbnailPrompt: mergedProps.thumbnailPrompt,
        ...(mergedProps.overlay != null && String(mergedProps.overlay).trim() !== ''
          ? { overlay: String(mergedProps.overlay).trim() }
          : {}),
        ...(videoCropReup !== undefined && videoCropReup !== null && String(videoCropReup).trim() !== ''
          ? { videoCropPercent: Number(videoCropReup) }
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

  if (result && result.success && result.processedCount > 0 && mergedProps.email) {
    try {
      const gpmProfileId = await resolveGpmProfileIdByEmail(mergedProps.email);
      if (gpmProfileId) {
        console.log(
          `\n[upload] Đã hoàn thành batch ${result.processedCount} video. Bắt đầu upload lên YouTube qua GPM profile: ${gpmProfileId}`
        );
        const { default: uploadYoutubeViaGpm } = await import('./youtubeUploadViaGpm.js');
        await uploadYoutubeViaGpm({
          gpmProfileId,
          channelFolder: effectiveChannelName,
          maxUploads: result.processedCount,
          ...(Array.isArray(result.processedFolderNames) && result.processedFolderNames.length > 0
            ? { uploadFolderNames: result.processedFolderNames }
            : {}),
        });
      } else {
        console.warn(`[upload] Không tìm thấy Profile GPM có tên khớp với email «${mergedProps.email}». Bỏ qua tự động upload.`);
      }
    } catch (e) {
      console.error('[upload] Lỗi trong quá trình tự động upload:', e.message);
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
