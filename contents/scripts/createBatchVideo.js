import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHANNEL_CONFIG_FILENAME, getChannelsDirPath } from '../api/urls/getListAllPaths.js';
import { VIDEO_MAKE_MODE } from '../constant/index.js';
import { CHANNEL_DETAIL, MAX_VIDEOS_PER_BATCH } from '../constants/channel.js';
import { getChannelConfig } from '../api/channels/getChannelConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CHANNELS_DIR = getChannelsDirPath();
const MAVID_CHANNEL_CONFIG_FILENAME = CHANNEL_CONFIG_FILENAME;

/**
 * Mặc định: chỉ chọn video có độ dài (cột DURATION) lớn hơn N phút (giây > N×60).
 * Ghi đè: `props.minDurationMinutes` hoặc env `MAVID_MIN_DURATION_MINUTES`; `0` = tắt lọc tối thiểu.
 */
export const MIN_VIDEO_DURATION_MINUTES = 8;

function resolveMinDurationMinutes(props = {}) {
  const raw = props.minDurationMinutes ?? process.env.MAVID_MIN_DURATION_MINUTES;
  if (!raw) {
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
  const raw =
    process.env.MAVID_MAX_VIDEOS_PER_BATCH != null && String(process.env.MAVID_MAX_VIDEOS_PER_BATCH).trim() !== ''
      ? process.env.MAVID_MAX_VIDEOS_PER_BATCH
      : MAX_VIDEOS_PER_BATCH;
  if (!raw && raw !== 0) return 0;

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 0;

  return Math.min(3, Math.floor(n));
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
  path.join(CHANNELS_DIR, 'output.xlsx'),
  path.join(ROOT, 'output.xlsx'),
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
 * MAVID_ONLY_LINKS: JSON mảng URL hoặc mỗi URL một dòng.
 * Khi parse ra danh sách không rỗng, batch dùng trực tiếp các URL này (không đọc cột link trong Excel).
 * @returns {string[]|null}
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

/**
 * Chuẩn hóa link từ env: trim, chỉ giữ URL http(s), loại placeholder giống khi đọc Excel.
 * @param {string[]} list
 * @returns {string[]}
 */
function normalizeEnvOnlyVideoLinks(list) {
  return list
    .map(s => String(s ?? '').trim())
    .filter(s => s && (s.startsWith('http://') || s.startsWith('https://')) && !s.includes('(Không có video)'));
}

/**
 * Chọn `k` chỉ số 0..n-1 không trùng: vị trí đầu tương ứng số ngẫu nhiên 1..n,
 * các vị trí sau lấy ngẫu nhiên từ các chỉ số còn lại (không trùng).
 * @param {number} n
 * @param {number} k
 * @returns {number[]}
 */
function pickUniqueIndicesRandomFirst(n, k) {
  const take = Math.min(Math.max(0, k), n);
  if (take === 0 || n <= 0) return [];
  const firstIdx = Math.floor(Math.random() * n);
  const indices = [firstIdx];
  const rest = [];
  for (let i = 0; i < n; i++) {
    if (i !== firstIdx) rest.push(i);
  }
  while (indices.length < take && rest.length > 0) {
    const j = Math.floor(Math.random() * rest.length);
    indices.push(rest[j]);
    rest.splice(j, 1);
  }
  return indices;
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
 * Chọn file .xlsx trong thư mục kênh để đọc link: mặc định file đầu;
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

/** @param {string} key — `key` trong {@link CHANNEL_DETAIL} (cột 1-based giống Excel) */
function channelDetailColumnIndex(key) {
  const row = CHANNEL_DETAIL.find(c => c && c.key === key);
  const idx = row?.index;
  if (!row || !Number.isFinite(idx) || idx < 1) {
    throw new Error(`CHANNEL_DETAIL không có key "${key}" hoặc index không hợp lệ.`);
  }
  return Math.floor(idx);
}

/**
 * Đọc file Excel (.xlsx) và lấy danh sách URL theo cột trong {@link CHANNEL_DETAIL}
 * @param {string|null} [inputFile]
 * @param {{
 *   minDurationMinutes?: number;
 *   maxDurationMinutes?: number;
 *   channelFolder?: string;
 *   email?: string;
 * }} [options] — > 0: lọc cột DURATION
 */
export async function readVideoUrlsFromFile(inputFile = null, options = {}) {
  let filePath = inputFile;
  if (!filePath) {
    filePath = await findDataFile();
  }

  if (!filePath) {
    throw new Error(`Không tìm thấy file output. Cần tạo từ "Lấy thông tin YouTube" trước.`);
  }

  if (!filePath.endsWith('.xlsx')) {
    throw new Error('Chỉ hỗ trợ file Excel (.xlsx).');
  }

  const durBounds = resolveDurationFilterBounds(options);

  const videoCol = channelDetailColumnIndex('link');
  const statusCol = channelDetailColumnIndex('status');
  const durationCol = channelDetailColumnIndex('duration');

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new Error('File Excel không có dữ liệu.');

  const items = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);

    const status = String(row.getCell(statusCol).value || '').trim();
    if (status) continue;

    const rawVal = row.getCell(videoCol).value;
    const val = rawVal && typeof rawVal === 'object' ? String(rawVal.text || rawVal.hyperlink || '').trim() : String(rawVal || '').trim();
    if (val && (val.startsWith('http://') || val.startsWith('https://')) && !val.includes('(Không có video)')) {
      if (durBounds.needsColumn) {
        const sec = parseDurationCellToSeconds(row.getCell(durationCol).value);
        if (!durationWithinFilter(sec, durBounds)) continue;
      }
      items.push(val);
    }
  }
  return items;
}

/**
 * Chọn một entry trong `channels[]` theo MAVID_EMAIL / props.email, hoặc phần tử đầu / root cũ.
 * @param {Record<string, unknown>|null} config
 * @param {string} [emailFromProps]
 * @returns {Record<string, unknown>|null}
 */
function pickChannelConfigItem(config, mappingId) {
  if (!config || typeof config !== 'object') return null;

  const list = Array.isArray(config.channels) ? config.channels : [];

  if (mappingId && list.length > 0) {
    const found = list.find(c => c && typeof c === 'object' && c.id === mappingId);
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

  if (item.background != null && String(item.background).trim() !== '') {
    o.background = String(item.background).trim();
  }

  const overlayPropEmpty = o.overlay == null || String(o.overlay).trim() === '';
  if (overlayPropEmpty && item.overlay != null && String(item.overlay).trim() !== '') {
    o.overlay = String(item.overlay).trim();
  }

  const thumbEmpty = o.thumbnailPrompt == null || String(o.thumbnailPrompt).trim() === '';
  if (thumbEmpty && item.thumbnailPrompt != null && String(item.thumbnailPrompt).trim() !== '') {
    o.thumbnailPrompt = String(item.thumbnailPrompt).trim();
  }

  o.email = String(item?.email).trim();

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
 * @param {string} [props.channel] - Tên folder channel (skip prompt nếu có)
 * @param {string} [props.mapping] - Mapping ID
 *
 * Thứ tự nguồn link: nếu `MAVID_ONLY_LINKS` parse ra URL hợp lệ thì dùng trực tiếp; không thì đọc Excel (status trống + lọc độ dài).
 * Sau đó chọn ngẫu nhiên không trùng vị trí trong danh sách, tối đa `maxVideosPerBatch` link.
 */
async function main(props = {}) {
  console.log('🚀 ~ main ~ props:', props);
  const channelId = props.channel || process.env.MAVID_CHANNEL;
  console.log('🚀 ~ main ~ channelId:', channelId);
  const mappingId = props.mapping || process.env.MAVID_MAPPING;
  console.log('🚀 ~ main ~ mappingId:', mappingId);

  let mergedProps = { ...props };

  let inputFile = null;
  let effectiveChannelName = channelId || null;

  if (!channelId || !mappingId) return;

  const folderPath = path.join(CHANNELS_DIR, channelId);

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Không tìm thấy channel folder: ${channelId}`);
  }

  const cfg = await getChannelConfig(channelId);
  let configItem = null;

  if (cfg) {
    configItem = pickChannelConfigItem(cfg, mappingId);
    mergedProps = mergeChannelConfigIntoProps(mergedProps, configItem);
    console.log(`[MaVid] Đã đọc ${MAVID_CHANNEL_CONFIG_FILENAME} trong folder "${channelId}".`);
  }

  const pick = pickChannelDataFileForBatch(folderPath, cfg, configItem);
  if (pick.absPath) {
    inputFile = pick.absPath;
  } else {
    throw new Error(`Không tìm thấy file Excel (.xlsx) trong folder: ${channelId}`);
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

  const onlyLinksParsed = parseOnlyLinksFromEnv();
  const fromEnvLinks = onlyLinksParsed && onlyLinksParsed.length > 0 ? normalizeEnvOnlyVideoLinks(onlyLinksParsed) : null;

  /** @type {string[]} */
  let rawItems;
  /** @type {'MAVID_ONLY_LINKS'|'excel'} */
  let linkSource;

  if (fromEnvLinks != null && fromEnvLinks.length > 0) {
    rawItems = fromEnvLinks;
    linkSource = 'MAVID_ONLY_LINKS';
  } else {
    rawItems = await readVideoUrlsFromFile(inputFile, {
      minDurationMinutes,
      maxDurationMinutes,
      channelFolder: effectiveChannelName ?? undefined,
      email: mergedProps.email != null ? String(mergedProps.email) : undefined,
    });
    linkSource = 'excel';
    console.log(`[MaVid] Nguồn link: file Excel — ${rawItems.length} link thỏa điều kiện (status trống + lọc độ dài nếu có).`);
  }

  if (linkSource === 'excel' && (minDurationMinutes > 0 || maxDurationMinutes > 0)) {
    const parts = [];
    if (minDurationMinutes > 0) parts.push(`dài hơn ${minDurationMinutes} phút`);
    if (maxDurationMinutes > 0) parts.push(`≤ ${maxDurationMinutes} phút`);
    console.log(`[MaVid] Lọc độ dài: ${parts.join(' và ')} (cột DURATION).`);
  }

  if (rawItems.length === 0) {
    const filtered = minDurationMinutes > 0 || maxDurationMinutes > 0;
    throw new Error(
      filtered
        ? `Không có link video nào thỏa điều kiện độ dài (${minDurationMinutes > 0 ? `lớn hơn ${minDurationMinutes} phút` : ''}${
            minDurationMinutes > 0 && maxDurationMinutes > 0 ? ', ' : ''
          }${maxDurationMinutes > 0 ? `tối đa ${maxDurationMinutes} phút` : ''}) trong file Excel.`
        : 'Không có link video nào trong file Excel.'
    );
  }

  const n = rawItems.length;
  const k = maxVideosThisRun > 0 ? Math.min(maxVideosThisRun, n) : n;
  const pickedIndices = pickUniqueIndicesRandomFirst(n, k);
  const items = pickedIndices.map(i => rawItems[i]);
  console.log('🚀 ~ main ~ items:', items);

  if (k < n) {
    console.log(`[MaVid] Chọn ngẫu nhiên ${k}/${n} link (giới hạn batch: ${maxVideosThisRun || 'tắt'}).`);
  } else if (n > 1) {
    console.log(`[MaVid] Thứ tự xử lý: ngẫu nhiên không trùng vị trí (xử lý cả ${n} link).`);
  }

  console.log(`Bắt đầu xử lý tuần tự ${items.length} link...\n`);

  let result;
  try {
    if (videoType === VIDEO_MAKE_MODE.FROM_AUDIO) {
      const { default: makeVideoFromAudio } = await import('../makeFromAudio/index.js');
      result = await makeVideoFromAudio({
        inputFile,
        items,
        thumbnailPrompt: mergedProps.thumbnailPrompt,
        ...buildMakeVideoFromAudioOptions(mergedProps, effectiveChannelName),
      });
    } else if (videoType === VIDEO_MAKE_MODE.FROM_VIDEO) {
      const { default: makeVideoFromFull } = await import('../makeFromVideo/makeVideoFromFull.js');
      result = await makeVideoFromFull({
        inputFile,
        items,
        thumbnailPrompt: mergedProps.thumbnailPrompt,
        ...(mergedProps.overlay != null && String(mergedProps.overlay).trim() !== ''
          ? { overlay: String(mergedProps.overlay).trim() }
          : {}),
      });
    }
  } finally {
    try {
      const { syncProgressFromFileToSpreadsheet } = await import('../syncProgressToSpreadsheet.js');
      await syncProgressFromFileToSpreadsheet(inputFile);
    } catch (e) {
      console.warn('[sync] Đồng bộ STATUS từ progress → Excel:', e.message);
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
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export default main;
