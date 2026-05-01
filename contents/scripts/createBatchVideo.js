import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CHANNELS_DIR = resolveChannelsDir();
const MAVID_CHANNEL_CONFIG_FILENAME = 'mavid-channel-config.json';

/**
 * Mặc định: chỉ chọn video có độ dài (cột DURATION) lớn hơn N phút (giây > N×60).
 * Ghi đè: `props.minDurationMinutes` hoặc env `MAVID_MIN_DURATION_MINUTES`; `0` = tắt lọc tối thiểu.
 */
export const MIN_VIDEO_DURATION_MINUTES = 8;

/**
 * Phút tối thiểu (suy ra ngưỡng lọc dưới) — 0 = không lọc theo tối thiểu.
 * Không ghi đè: dùng {@link MIN_VIDEO_DURATION_MINUTES}.
 * Env: MAVID_MIN_DURATION_MINUTES (0 = tắt lọc tối thiểu)
 */
function resolveMinDurationMinutes(props = {}) {
  const raw = props.minDurationMinutes ?? process.env.MAVID_MIN_DURATION_MINUTES;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return MIN_VIDEO_DURATION_MINUTES;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return MIN_VIDEO_DURATION_MINUTES;
  if (n === 0) return 0;
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
 * Số video tối đa mỗi lượt — 0 = không giới hạn (xử lý hết danh sách).
 * Env: MAVID_MAX_VIDEOS_PER_BATCH; props.maxVideosPerBatch ưu tiên hơn env.
 */
function resolveMaxVideosPerBatch(props = {}) {
  const raw = props.maxVideosPerBatch ?? process.env.MAVID_MAX_VIDEOS_PER_BATCH;
  if (raw === undefined || raw === null) return 0;
  const s = String(raw).trim();
  if (s === '') return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(100, Math.floor(n));
}

/**
 * Tự động tìm GPM Profile ID bằng cách khớp Name Profile = Email trong config.
 * @param {string} email
 * @returns {Promise<string | null>}
 */
async function resolveGpmProfileIdByEmail(email) {
  if (!email || !email.trim()) return null;
  const normEmail = email.trim().toLowerCase();
  const apiBase = process.env.GPM_API_BASE || 'http://localhost:9495';
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
            .toLowerCase() === normEmail,
      );
      return hit?.id || null;
    }
  } catch (e) {
    console.warn(`[gpm] Không thể tự động lấy danh sách profiles từ GPM Local API: ${e.message}`);
  }
  return null;
}

/**
 * @param {{ minDurationMinutes?: number; maxDurationMinutes?: number }} options — giá trị đã resolve (0 = tắt min)
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
  /* Min: dài hơn N phút tức sec > N×60 (trùng đúng hết N phút thì loại) */
  if (hasMin && sec <= minSec) return false;
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
 * Suy ra tên folder channel từ đường dẫn file dữ liệu (output.xlsx nằm trong MaVidMedia/channels/TênChannel/).
 * @param {string|null} inputFile
 * @param {string} channelsDir
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
 * Chia [0..n-1] thành 3 vùng (đầu / giữa / cuối file), luân phiên lấy chỉ số để phân bổ đều.
 * @param {number} n
 * @param {number} takeCount
 * @returns {number[]}
 */
function pickIndicesSpreadAcrossThreeZones(n, takeCount) {
  if (takeCount >= n) return Array.from({ length: n }, (_, i) => i);
  if (takeCount <= 0 || n <= 0) return [];

  const len0 = Math.ceil(n / 3);
  const rem = n - len0;
  const len1 = rem > 0 ? Math.ceil(rem / 2) : 0;
  const len2 = n - len0 - len1;
  const startPool = [];
  const midPool = [];
  const endPool = [];
  let idx = 0;
  for (let k = 0; k < len0; k++) startPool.push(idx++);
  for (let k = 0; k < len1; k++) midPool.push(idx++);
  for (let k = 0; k < len2; k++) endPool.push(idx++);
  const endFromBottom = endPool.slice().reverse();

  const pools = [startPool, midPool, endFromBottom];
  const ptrs = [0, 0, 0];
  const used = new Set();
  const out = [];

  let round = 0;
  while (out.length < takeCount && used.size < n) {
    let added = false;
    for (let t = 0; t < 3; t++) {
      const pk = (round + t) % 3;
      while (ptrs[pk] < pools[pk].length) {
        const i = pools[pk][ptrs[pk]++];
        if (!used.has(i)) {
          used.add(i);
          out.push(i);
          added = true;
          break;
        }
      }
      if (added) break;
    }
    round++;
    if (!added) {
      for (let i = 0; i < n && out.length < takeCount; i++) {
        if (!used.has(i)) {
          used.add(i);
          out.push(i);
        }
      }
      break;
    }
  }
  return out;
}

/**
 * Đưa `takeCount` video đầu (theo phân bổ đầu–giữa–cuối danh sách file) lên đầu mảng; còn lại giữ thứ tự cũ.
 * @template T
 * @param {T[]} items
 * @param {number} takeCount
 * @returns {T[]}
 */
function reorderVideoItemsForSpreadUpload(items, takeCount) {
  const n = items.length;
  if (n === 0 || takeCount < 1) return items.slice();
  const take = Math.min(takeCount, n);
  const pickIdx = pickIndicesSpreadAcrossThreeZones(n, take);
  const set = new Set(pickIdx);
  const first = pickIdx.map(i => items[i]);
  const rest = [];
  for (let i = 0; i < n; i++) {
    if (!set.has(i)) rest.push(items[i]);
  }
  return [...first, ...rest];
}

/**
 * `uploadedVideos` trong mavid-channel-config (entry khớp email hoặc phần tử đầu / root).
 * @param {string} channelsDir
 * @param {string|null|undefined} filePath
 * @param {{ channelFolder?: string; email?: string }} options
 */
function tryGetUploadedVideosForSelection(channelsDir, filePath, options) {
  const folder = (options.channelFolder && String(options.channelFolder).trim()) || inferChannelFolderName(filePath, channelsDir);
  if (!folder) return 0;
  const p = path.join(channelsDir, folder, MAVID_CHANNEL_CONFIG_FILENAME);
  if (!fs.existsSync(p)) return 0;
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return 0;
  }
  const list = Array.isArray(cfg.channels) ? cfg.channels : [];
  const want = String(options.email || '')
    .trim()
    .toLowerCase();
  let item = null;
  if (want && list.length > 0) {
    item =
      list.find(
        c =>
          c &&
          String(c.email || '')
            .trim()
            .toLowerCase() === want,
      ) || null;
  }
  if (!item && list.length > 0) item = list[0];
  if (item && item.uploadedVideos != null && Number.isFinite(Number(item.uploadedVideos))) {
    return Math.max(0, Math.floor(Number(item.uploadedVideos)));
  }
  if (cfg.uploadedVideos != null && Number.isFinite(Number(cfg.uploadedVideos))) {
    return Math.max(0, Math.floor(Number(cfg.uploadedVideos)));
  }
  return 0;
}

const UPLOADED_VIDEOS_SPREAD_THRESHOLD = 10;

/**
 * @param {Record<string, unknown>|null|undefined} cfg
 * @param {Record<string, unknown>|null|undefined} configItem — entry đã chọn trong channels[]
 */
function resolveUploadedVideosFromChannelEntry(cfg, configItem) {
  if (configItem && configItem.uploadedVideos != null && Number.isFinite(Number(configItem.uploadedVideos))) {
    return Math.max(0, Math.floor(Number(configItem.uploadedVideos)));
  }
  if (cfg && typeof cfg === 'object' && cfg.uploadedVideos != null && Number.isFinite(Number(cfg.uploadedVideos))) {
    return Math.max(0, Math.floor(Number(cfg.uploadedVideos)));
  }
  return 0;
}

/**
 * Chọn file .xlsx/.csv trong thư mục kênh để đọc link: mặc định file đầu;
 * nếu uploadedVideos ≥ ngưỡng và có nhiều file → chọn ngẫu nhiên một file.
 * @param {string} folderPath
 * @param {Record<string, unknown>|null} cfg
 * @param {Record<string, unknown>|null} configItem
 */
function pickChannelDataFileForBatch(folderPath, cfg, configItem) {
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) return { absPath: null, displayName: null, usedRandom: false };
  const uploaded = resolveUploadedVideosFromChannelEntry(cfg, configItem);
  if (files.length === 1 || uploaded < UPLOADED_VIDEOS_SPREAD_THRESHOLD) {
    const name = files[0];
    return { absPath: path.join(folderPath, name), displayName: name, usedRandom: false };
  }
  const idx = Math.floor(Math.random() * files.length);
  const name = files[idx];
  return { absPath: path.join(folderPath, name), displayName: name, usedRandom: true };
}

/**
 * @param {Array<{ url: string; background: string }>} items
 * @param {string} filePath
 * @param {{ batchLimit?: number; channelFolder?: string; email?: string }} options
 */
function finalizeVideoItemsOrder(items, filePath, options) {
  const batchLimit = Number(options.batchLimit);
  if (!Number.isFinite(batchLimit) || batchLimit < 1) return items;
  const uploaded = tryGetUploadedVideosForSelection(CHANNELS_DIR, filePath, options);
  if (uploaded < UPLOADED_VIDEOS_SPREAD_THRESHOLD) return items;
  const reordered = reorderVideoItemsForSpreadUpload(items, batchLimit);
  console.log(
    `[MaVid] uploadedVideos=${uploaded} (≥${UPLOADED_VIDEOS_SPREAD_THRESHOLD}) — sắp ${Math.min(
      batchLimit,
      items.length,
    )} video đầu theo đầu/giữa/cuối danh sách file.`,
  );
  return reordered;
}

/**
 * Đọc file Excel/CSV và lấy danh sách URL từ cột Video
 * @param {string|null} [inputFile]
 * @param {{
 *   minDurationMinutes?: number;
 *   maxDurationMinutes?: number;
 *   batchLimit?: number;
 *   channelFolder?: string;
 *   email?: string;
 * }} [options] — > 0: lọc cột DURATION; với uploadedVideos≥10 + batchLimit: batch đầu lấy đều đầu–giữa–cuối file
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
        .includes('status'),
    );
    const bgIdx = headerRow.values.findIndex(v => String(v || '').toLowerCase() === 'background video');
    const durationIdx = headerRow.values.findIndex(
      v =>
        String(v || '')
          .trim()
          .toLowerCase() === 'duration',
    );

    const items = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);

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
    return finalizeVideoItemsOrder(items, filePath, options);
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
  const durationIdx = headers.findIndex(h => h.trim().toLowerCase() === 'duration');

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));

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
  return finalizeVideoItemsOrder(items, filePath, options);
}

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
function pickChannelConfigItem(config, mappingParam) {
  if (!config || typeof config !== 'object') return null;

  const list = Array.isArray(config.channels) ? config.channels : [];

  if (mappingParam && list.length > 0) {
    const found = list.find(c => c && typeof c === 'object' && c.id === mappingParam);
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

  const emailEmpty = o.email == null || String(o.email).trim() === '';
  if (emailEmpty && item.email != null && String(item.email).trim() !== '') {
    o.email = String(item.email).trim();
  }

  const optionEmpty = o.option == null || String(o.option).trim() === '';
  const itemOption = item.videoOption || item.option;
  if (optionEmpty && itemOption != null && String(itemOption).trim() !== '') {
    o.option = String(itemOption).trim();
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
  if (props.overlay != null && String(props.overlay).trim() !== '') {
    o.overlay = String(props.overlay).trim();
  }
  if (props.option != null && String(props.option).trim() !== '') {
    o.option = String(props.option).trim();
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
 * @param {string} [props.overlay] — (reup_full) tên preset OVERLAY_OPTIONS
 * @param {string|number} [props.videoCropPercent] — (reup_full) VIDEO_CROP_PERCENT
 * @param {number} [props.minDurationMinutes] — chỉ xử lý video có độ dài (cột DURATION) lớn hơn N phút; 0 = không lọc; mặc định {@link MIN_VIDEO_DURATION_MINUTES}; env MAVID_MIN_DURATION_MINUTES
 * @param {number} [props.maxDurationMinutes] — chỉ xử lý video có độ dài (cột DURATION) ≤ N phút; 0 = không lọc; env MAVID_MAX_DURATION_MINUTES
 * @param {number} [props.maxVideosPerBatch] — tối đa N video mỗi lượt; env MAVID_MAX_VIDEOS_PER_BATCH; 0/không set = không giới hạn
 */
async function main(props = {}) {
  const { MAKE_VIDEO_MODE } = await import('../constants/index.js');
  console.time('createBatchVideo');

  const channelParam = props.channel || process.env.MAVID_CHANNEL;
  const mappingParam = props.mapping || process.env.MAVID_MAPPING;
  const email = props.email || process.env.MAVID_EMAIL;
  const videoCropReup = props.videoCropPercent ?? process.env.MAVID_VIDEO_CROP_PERCENT;

  let mergedProps = { ...props };
  if (email != null && String(email).trim() !== '' && (mergedProps.email == null || String(mergedProps.email).trim() === '')) {
    mergedProps = { ...mergedProps, email: String(email).trim() };
  }
  let inputFile = null;
  let effectiveChannelName = channelParam || null;

  if (channelParam) {
    const folderPath = path.join(CHANNELS_DIR, channelParam);
    if (fs.existsSync(folderPath)) {
      const cfg = readMavidChannelConfigFromFolder(folderPath);
      let configItem = null;
      if (cfg) {
        configItem = pickChannelConfigItem(cfg, mappingParam);
        mergedProps = mergeChannelConfigIntoProps(mergedProps, configItem);
        console.log(`[MaVid] Đã đọc ${MAVID_CHANNEL_CONFIG_FILENAME} trong folder "${channelParam}".`);
      }
      const pick = pickChannelDataFileForBatch(folderPath, cfg, configItem);
      if (pick.absPath) {
        inputFile = pick.absPath;
        if (pick.usedRandom) {
          console.log(
            `[MaVid] Channel: ${channelParam} → ${pick.displayName} (chọn ngẫu nhiên — uploadedVideos≥${UPLOADED_VIDEOS_SPREAD_THRESHOLD})`,
          );
        } else {
          console.log(`[MaVid] Channel: ${channelParam} → ${pick.displayName}`);
        }
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
      const cfgPick = readMavidChannelConfigFromFolder(folderPath);
      const itemPick = cfgPick ? pickChannelConfigItem(cfgPick, mappingParam) : null;
      const pick = pickChannelDataFileForBatch(folderPath, cfgPick, itemPick);
      if (pick.absPath) {
        inputFile = pick.absPath;
        if (pick.usedRandom) {
          console.log(
            `[MaVid] Channel: ${selectedFolder} → ${pick.displayName} (chọn ngẫu nhiên — uploadedVideos≥${UPLOADED_VIDEOS_SPREAD_THRESHOLD})`,
          );
        } else {
          console.log(`[MaVid] Channel: ${selectedFolder} → ${pick.displayName}`);
        }
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
  const minDurationMinutes = resolveMinDurationMinutes(mergedProps);
  const maxDurationMinutes = resolveMaxDurationMinutes(mergedProps);
  const maxVideosThisRun = resolveMaxVideosPerBatch(mergedProps);

  /**
   * MAVID_ONLY_LINKS: JSON mảng URL hoặc mỗi URL một dòng — chỉ giữ link có trong danh sách (sau khi đọc file).
   * Dùng UI chi tiết kênh khi user chọn một số dòng status trống.
   */
  function parseOnlyLinksFromEnv() {
    const raw = process.env.MAVID_ONLY_LINKS;
    if (!raw || !String(raw).trim()) return null;
    try {
      const j = JSON.parse(String(raw).trim());
      if (Array.isArray(j)) {
        const list = j.map(x => String(x ?? '').trim()).filter(Boolean);
        return list.length ? list : null;
      }
    } catch {
      /* fall through */
    }
    const list = String(raw)
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    return list.length ? list : null;
  }

  function filterItemsByOnlyLinksEnv(list) {
    const allowList = parseOnlyLinksFromEnv();
    if (!allowList) return list;
    const allow = new Set(allowList);
    const next = list.filter(it => allow.has(String(it.url ?? '').trim()));
    if (next.length !== list.length) {
      console.log(`[MaVid] MAVID_ONLY_LINKS — giữ ${next.length}/${list.length} link sau lọc.`);
    }
    return next;
  }

  const onlyLinksForRead = parseOnlyLinksFromEnv();

  let items = await readVideoUrlsFromFile(inputFile, {
    minDurationMinutes,
    maxDurationMinutes,
    channelFolder: effectiveChannelName ?? undefined,
    email: mergedProps.email != null ? String(mergedProps.email) : undefined,
    ...(maxVideosThisRun > 0 && !onlyLinksForRead ? { batchLimit: maxVideosThisRun } : {}),
  });
  items = filterItemsByOnlyLinksEnv(items);
  if (maxVideosThisRun > 0 && items.length > maxVideosThisRun) {
    console.log(
      `[MaVid] Giới hạn ${maxVideosThisRun} video/lượt (MAVID_MAX_VIDEOS_PER_BATCH) — xử lý ${maxVideosThisRun}/${items.length} link.`,
    );
    items = items.slice(0, maxVideosThisRun);
  }
  if (minDurationMinutes > 0 || maxDurationMinutes > 0) {
    const parts = [];
    if (minDurationMinutes > 0) parts.push(`dài hơn ${minDurationMinutes} phút`);
    if (maxDurationMinutes > 0) parts.push(`≤ ${maxDurationMinutes} phút`);
    console.log(`[MaVid] Lọc độ dài: ${parts.join(' và ')} (cột DURATION).`);
  }
  if (items.length === 0) {
    const filtered = minDurationMinutes > 0 || maxDurationMinutes > 0;
    throw new Error(
      filtered
        ? `Không có link video nào thỏa điều kiện độ dài (${minDurationMinutes > 0 ? `lớn hơn ${minDurationMinutes} phút` : ''}${
            minDurationMinutes > 0 && maxDurationMinutes > 0 ? ', ' : ''
          }${maxDurationMinutes > 0 ? `tối đa ${maxDurationMinutes} phút` : ''}) trong CSV/Excel.`
        : 'Không có link video nào trong CSV/Excel.',
    );
  }

  console.log(`Đọc được ${items.length} link từ file. Bắt đầu xử lý tuần tự...\n`);

  if (videoType !== MAKE_VIDEO_MODE.FROM_AUDIO && videoType !== MAKE_VIDEO_MODE.REUP_FULL) {
    throw new Error(
      'Thiếu hoặc không hợp lệ videoType (from_audio | reup_full). Truyền props.videoType hoặc ghi videoType trong mavid-channel-config.json khi chạy với MAVID_CHANNEL.',
    );
  }

  let result;
  try {
    if (videoType === MAKE_VIDEO_MODE.FROM_AUDIO) {
      const { default: makeVideoFromAudio } = await import('../makeFromAudio/index.js');
      result = await makeVideoFromAudio({
        inputFile,
        items,
        thumbnailPrompt: mergedProps.thumbnailPrompt,
        ...buildMakeVideoFromAudioOptions(mergedProps, effectiveChannelName),
      });
    } else if (videoType === MAKE_VIDEO_MODE.REUP_FULL) {
      const { default: makeVideoFromFull } = await import('../makeVideoFromFull.js');
      result = await makeVideoFromFull({
        inputFile,
        items,
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

  console.timeEnd('createBatchVideo');

  return {
    success: true,
    mode: 'batch',
    videoType,
    itemCount: items.length,
    inputFile,
    result,
  };

  console.log('result', result, mergedProps);
  console.log('effectiveChannelName', effectiveChannelName);
  console.log('email', mergedProps.email);

  if (result && result.success && result.processedCount > 0 && mergedProps.email) {
    try {
      // ──────── Tính số ngày đã schedule trước ────────
      let maxUploadsFromSchedule = result.processedCount; // mặc định = tất cả video vừa tạo
      let skipUploadReason = '';

      if (effectiveChannelName) {
        const folderPath = path.join(CHANNELS_DIR, effectiveChannelName);
        const cfg = readMavidChannelConfigFromFolder(folderPath);
        const item = cfg ? pickChannelConfigItem(cfg, mergedProps.email) : null;

        if (item) {
          const { MAX_SCHEDULED_DAYS } = await import('../constants/index.js');
          const latestUploadDateStr = String(item.latestUploadDate || '').trim();
          const videosPerDayPresetRaw = String(item.videosPerDayPreset || '1').trim();

          // Parse videosPerDayPreset → lấy số tối đa video/ngày
          // '1' → 1, '2' → 2, '3' → 3, '1-2' → 2 (max)
          let maxVideosPerDay = 1;
          if (videosPerDayPresetRaw === '1-2') {
            maxVideosPerDay = 2;
          } else {
            const parsed = parseInt(videosPerDayPresetRaw, 10);
            if (Number.isFinite(parsed) && parsed > 0) maxVideosPerDay = parsed;
          }

          // Parse latestUploadDate (DD/MM/YYYY) → Date
          let latestUploadDate = null;
          if (latestUploadDateStr) {
            const parts = latestUploadDateStr.split('/');
            if (parts.length === 3) {
              const [dd, mm, yyyy] = parts.map(Number);
              if (dd > 0 && mm > 0 && yyyy > 0) {
                latestUploadDate = new Date(yyyy, mm - 1, dd);
              }
            }
          }

          if (latestUploadDate && !isNaN(latestUploadDate.getTime())) {
            const now = new Date();
            // Chỉ tính theo ngày (bỏ giờ)
            const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const uploadDay = new Date(latestUploadDate.getFullYear(), latestUploadDate.getMonth(), latestUploadDate.getDate());

            const diffMs = uploadDay.getTime() - nowDay.getTime();
            const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));

            // Số ngày đã schedule = diffDays / maxVideosPerDay (phần nguyên)
            const scheduledDays = Math.floor(diffDays / maxVideosPerDay);
            const remainingDays = MAX_SCHEDULED_DAYS - scheduledDays;

            console.log(
              `[schedule] latestUploadDate: ${latestUploadDateStr} | videosPerDayPreset: ${videosPerDayPresetRaw} (max ${maxVideosPerDay}/ngày)`,
            );
            console.log(
              `[schedule] Ngày đã schedule trước: ${scheduledDays} | MAX_SCHEDULED_DAYS: ${MAX_SCHEDULED_DAYS} | Còn lại: ${remainingDays}`,
            );

            if (remainingDays <= 0) {
              skipUploadReason = `Đã schedule đủ ${MAX_SCHEDULED_DAYS} ngày (latestUploadDate: ${latestUploadDateStr}). Bỏ qua upload.`;
            } else {
              // Số video upload = remainingDays × maxVideosPerDay, không vượt quá số video đã tạo
              maxUploadsFromSchedule = Math.min(remainingDays * maxVideosPerDay, result.processedCount);
              console.log(
                `[schedule] Sẽ upload tối đa ${maxUploadsFromSchedule} video (${remainingDays} ngày × ${maxVideosPerDay} video/ngày).`,
              );
            }
          } else {
            console.log('[schedule] Không có latestUploadDate hợp lệ → upload tất cả video đã tạo.');
          }
        }
      }

      if (skipUploadReason) {
        console.log(`\n[upload] ${skipUploadReason}`);
      } else {
        const gpmProfileId = await resolveGpmProfileIdByEmail(mergedProps.email);
        if (gpmProfileId) {
          console.log(
            `\n[upload] Đã hoàn thành batch ${result.processedCount} video. Upload ${maxUploadsFromSchedule} video lên YouTube qua GPM profile: ${gpmProfileId}`,
          );
          const { default: uploadYoutubeViaGpm } = await import('../youtube/uploadViaGpm.js');

          // Giới hạn uploadFolderNames theo maxUploadsFromSchedule
          // let uploadFolderNames = Array.isArray(result.processedFolderNames) ? result.processedFolderNames : [];
          // if (uploadFolderNames.length > maxUploadsFromSchedule) {
          //   uploadFolderNames = uploadFolderNames.slice(0, maxUploadsFromSchedule);
          // }

          await uploadYoutubeViaGpm({
            gpmProfileId,
            channelFolder: effectiveChannelName,
            email: mergedProps.email,
            maxUploads: maxUploadsFromSchedule,
            // ...(uploadFolderNames.length > 0 ? { uploadFolderNames } : {}),
          });
        } else {
          console.warn(`[upload] Không tìm thấy Profile GPM có tên khớp với email «${mergedProps.email}». Bỏ qua tự động upload.`);
        }
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
