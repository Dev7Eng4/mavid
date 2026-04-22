import type { ChannelRow, ScriptId } from '@/types';
import { PROMPTS_CREATE_THUMBNAIL_OPTIONS } from '@contents/prompts/index.js';
import { OVERLAY_OPTIONS } from '@contents/constants/overlayOptions.js';
import { buildMavidEnvForVideoFromAudio, defaultBackgroundFolder } from '@/utils/videoFromAudioEnv';
import { buildMavidEnvForReupFull } from '@/utils/reupFullEnv';

/** Khớp dropdown trong getInfoChannel / electron write-channel-index */
export const INDEX_VIDEO_TYPE_VALUES = ['from_audio', 'reup_full'] as const;
/** Giá trị nhãn (dropdown) khớp cột THỜI GIAN VIDEO trong index / getInfoChannel. */
export const INDEX_VIDEO_DURATION_LABELS = ['Tất cả', '0 - 30 phút', '0 - 60 phút', '30 - 60 phút', 'Từ 30 phút', 'Từ 60 phút'] as const;
/** @deprecated Dùng INDEX_VIDEO_DURATION_LABELS */
export const INDEX_THOI_GIAN_MINUTES = INDEX_VIDEO_DURATION_LABELS as any;

export function durationLabelToOption(label: string): string {
  if (label === 'Tất cả') return '0_null';
  if (label === '0 - 30 phút') return '0_30';
  if (label === '0 - 60 phút') return '0_60';
  if (label === '30 - 60 phút') return '30_60';
  if (label === 'Từ 30 phút') return '30_null';
  if (label === 'Từ 60 phút') return '60_null';
  return '0_null'; // fallback
}

export function durationOptionToLabel(option: string): string {
  if (option === '0_null') return 'Tất cả';
  if (option === '0_30') return '0 - 30 phút';
  if (option === '0_60') return '0 - 60 phút';
  if (option === '30_60') return '30 - 60 phút';
  if (option === '30_null') return 'Từ 30 phút';
  if (option === '60_null') return 'Từ 60 phút';
  return 'Tất cả'; // fallback
}

/** Giống dropdown «Tạo video với thời gian» trong ChannelAddDialog — value dạng `0_30`, `0_null` = không lọc preset. */
export const CHANNEL_ADD_DURATION_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: '0_null', label: 'Tất cả' },
  { value: '0_30', label: '0 - 30 phút' },
  { value: '0_60', label: '0 - 60 phút' },
  { value: '30_60', label: '30 - 60 phút' },
  { value: '30_null', label: 'Từ 30 phút' },
  { value: '60_null', label: 'Từ 60 phút' },
];

export const SCRIPT_FROM_AUDIO: ScriptId = 'tao-batch-video-tu-audio';
export const SCRIPT_REUP_FULL: ScriptId = 'tao-batch-video-reup-full';

export function headerNorm(h: string): string {
  return String(h).trim().toUpperCase();
}

/** Trạng thái vòng đời kênh trong `index.xlsx` (cột STATUS). */
export type ChannelIndexLifecycleStatus = 'INIT' | 'LIVE' | 'STOPPED';

export function normalizeChannelIndexStatus(raw: unknown): ChannelIndexLifecycleStatus {
  const v = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (v === 'INIT' || v === 'LIVE' || v === 'STOPPED') return v;
  return 'INIT';
}

export function findIndexHeaderKey(headers: string[], normName: string): string | undefined {
  const n = normName.trim().toUpperCase();
  return headers.find(h => headerNorm(h) === n);
}

/** Trả về header đầu tiên khớp một trong các tên chuẩn hóa. */
export function findIndexHeaderKeyAny(headers: string[], normNames: string[]): string | undefined {
  for (const name of normNames) {
    const k = findIndexHeaderKey(headers, name);
    if (k) return k;
  }
  return undefined;
}

/**
 * Suy ra tên thư mục kênh (ID) từ URL YouTube — dùng cho cột ID/CHANNEL.
 */
/** Trích video ID từ URL watch YouTube (?v=…) — khớp thư mục con sau khi tạo video. */
export function extractYoutubeVideoIdFromUrl(url: string): string | null {
  const s = String(url ?? '').trim();
  if (!s) return null;
  try {
    const u = /^https?:\/\//i.test(s) ? new URL(s) : new URL(`https://${s}`);
    const v = u.searchParams.get('v');
    if (v?.trim()) return v.trim();
  } catch {
    /* ignore */
  }
  const m = s.match(/[?&]v=([^&]+)/);
  return m ? m[1].trim() : null;
}

export function folderFromChannelUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const url = /^https?:\/\//i.test(s) ? new URL(s) : new URL(`https://${s}`);
    const path = url.pathname.replace(/\/+$/, '');
    const channel = path.match(/\/channel\/([^/]+)/i);
    if (channel?.[1]) return decodeURIComponent(channel[1]);
    const at = path.match(/\/@([^/]+)/);
    if (at?.[1]) return decodeURIComponent(at[1]);
    const c = path.match(/\/c\/([^/]+)/i);
    if (c?.[1]) return decodeURIComponent(c[1]);
    const user = path.match(/\/user\/([^/]+)/i);
    if (user?.[1]) return decodeURIComponent(user[1]);
    const parts = path.split('/').filter(Boolean);
    if (parts.length) return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    /* ignore */
  }
  return null;
}

/** Cột tối thiểu để thêm kênh từ form (không gồm cột lịch tùy chọn). */
export const INDEX_ADD_CHANNEL_REQUIRED_NORMS = ['LINK', 'EMAIL', 'LOẠI VIDEO', 'THỜI GIAN VIDEO', 'BACKGROUND'] as const;

export function indexHeadersMissingForAddChannel(headers: string[]): string[] {
  const missing: string[] = [];
  if (!headers.some(h => headerNorm(h) === 'ID') && !headers.some(h => headerNorm(h) === 'CHANNEL')) {
    missing.push('ID hoặc CHANNEL');
  }
  for (const n of INDEX_ADD_CHANNEL_REQUIRED_NORMS) {
    if (!findIndexHeaderKey(headers, n)) missing.push(n);
  }
  return missing;
}

/**
 * So khớp hai mảng dòng index. Dùng hợp key từ headers + Object.keys từng dòng
 * để không bỏ sót cột (tránh Lưu index vẫn disabled sau khi sửa popup khi headers/file lệch).
 */
export function indexRowsEqual(a: ChannelRow[], b: ChannelRow[], headers: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const keySet = new Set<string>(headers);
    for (const k of Object.keys(a[i] || {})) keySet.add(k);
    for (const k of Object.keys(b[i] || {})) keySet.add(k);
    for (const h of keySet) {
      if (String(a[i][h] ?? '') !== String(b[i][h] ?? '')) return false;
    }
  }
  return true;
}

export function resolveIndexRowVideoType(row: ChannelRow, headers: string[]): 'from_audio' | 'reup_full' | '' {
  const loaiKey = findIndexHeaderKey(headers, 'LOẠI VIDEO');
  const raw = loaiKey ? String(row[loaiKey] ?? '').trim() : '';
  if (raw === 'reup_full') return 'reup_full';
  if (raw === 'from_audio') return 'from_audio';
  return '';
}

/** Ô EMAIL index có thể chứa nhiều địa chỉ phân tách dấu phẩy. */
export function parseIndexEmailCell(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
}

/** So khớp một email đã chọn với dòng index (không phân biệt hoa thường). */
export function indexRowMatchesPickedEmail(row: ChannelRow, emailHeaderKey: string | undefined, pickedEmail: string): boolean {
  if (!emailHeaderKey) return false;
  const norm = pickedEmail.trim().toLowerCase();
  if (!norm) return false;
  return parseIndexEmailCell(row[emailHeaderKey]).some(e => e.toLowerCase() === norm);
}

export function buildExtraEnvForIndexChannelRow(
  row: ChannelRow,
  headers: string[],
  folder: string,
  videoType: 'from_audio' | 'reup_full',
  bgList: string[],
  opts?: { maxVideosPerBatch?: number },
): Record<string, string> {
  const maxBatch = opts?.maxVideosPerBatch ?? 5;

  const emailKey = findIndexHeaderKey(headers, 'EMAIL');
  const email = emailKey ? String(row[emailKey] ?? '').trim() : '';

  const bgKey = findIndexHeaderKey(headers, 'BACKGROUND');
  const bgRaw = bgKey ? String(row[bgKey] ?? '').trim() : '';
  const background = bgRaw || defaultBackgroundFolder(bgList);
  if (videoType === 'from_audio') {
    return buildMavidEnvForVideoFromAudio(
      {
        channel: folder,
        background,
        backgroundSource: 'stock',
        stockVideoCount: 0,
        audioSpeed: 0.91,
        maxVideosPerBatch: maxBatch,
        minDurationMinutes: 0,
        showLogo: false,
      },
      bgList,
    );
  }
  const overlayReup = videoType === 'reup_full' ? bgRaw : '';
  return buildMavidEnvForReupFull({
    channel: folder,
    email,
    maxVideosPerBatch: maxBatch,
    ...(overlayReup ? { overlay: overlayReup } : {}),
  });
}

/** Lựa chọn «số video update mỗi ngày» trong form; `1-2` = 1 suất ngày thường + 2 suất cuối tuần. */
export type VideoPerDayPreset = '1' | '2' | '3' | '4' | '5' | '1-2';

export function parseVideoPerDayCell(raw: unknown): VideoPerDayPreset {
  const s = String(raw ?? '')
    .trim()
    .replace(/\u2013/g, '-');
  if (s === '1-2') return '1-2';
  const n = parseInt(s, 10);
  if (n === 5) return '5';
  if (n === 4) return '4';
  if (n === 3) return '3';
  if (n === 2) return '2';
  return '1';
}

/** Số ô giờ cần nhập (`1`→1, `2`→2, `3`→3; preset `1-2` → 3 ô: 1 ngày thường + 2 cuối tuần). */
export function timeSlotCountForVideoPerDayPreset(p: VideoPerDayPreset): number {
  return p === '1-2' ? 3 : Number(p);
}

export function labelForPublishTimeSlot(preset: VideoPerDayPreset, index: number): string {
  if (preset === '1-2') {
    if (index === 0) return 'Ngày thường — 1 suất';
    if (index === 1) return 'Cuối tuần — suất 1';
    return 'Cuối tuần — suất 2';
  }
  return `Video ${index + 1} trong ngày`;
}

export interface ChannelAddFormInput {
  channelUrl: string;
  email: string;
  /** Cột index «KÊNH CỦA TÔI» (sau EMAIL). */
  myChannel: string;
  videoType: 'from_audio' | 'reup_full';
  durationOption: string;
  /** from_audio — tên folder trong MaVidMedia/backgrounds */
  background: string;
  /** reup_full — khớp OVERLAY_OPTIONS[].NAME */
  overlay: string;
  /** Khớp `PROMPTS_CREATE_THUMBNAIL_OPTIONS[].value` (contents/prompts/index.js). */
  thumbnailPrompt: string;
  videosPerDayPreset: VideoPerDayPreset;
  publishTimes: string[];
  /** Nếu có — ghi đè suy luận từ URL cho ID/CHANNEL */
  folderIdOverride: string;
  /** Cột STATUS index (INIT | LIVE | STOPPED). */
  channelStatus: string;
}

/** Giá trị khởi tạo form thêm/sửa kênh (map từ một dòng index). */
export interface ChannelAddDialogInitialFields {
  channelUrl: string;
  email: string;
  myChannel: string;
  videoType: string;
  /** Chuỗi cấu hình duration (vd. "0_30"). */
  durationOption: string;
  selectedBackground: string;
  /** reup_full — tên preset overlay */
  reupOverlayOption: string;
  /** Style thumbnail — `PROMPTS_CREATE_THUMBNAIL_OPTIONS` */
  thumbnailPrompt: string;
  folderIdOverride: string;
  videosPerDayPreset: VideoPerDayPreset;
  publishTimes: string[];
  channelStatus: ChannelIndexLifecycleStatus;
}

/** Danh sách NAME hợp lệ cho dropdown Reup (đồng bộ makeVideoFromFull). */
export function reupOverlaySelectOptions(): { value: string; label: string }[] {
  return OVERLAY_OPTIONS.map(o => {
    const name = String(o.NAME).trim();
    return { value: name, label: name };
  });
}

export function defaultReupOverlayName(): string {
  const first = OVERLAY_OPTIONS[0];
  return first ? String(first.NAME).trim() : 'Option 1';
}

export function isValidReupOverlayName(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  return OVERLAY_OPTIONS.some(o => String(o.NAME).trim() === t);
}

export function defaultthumbnailPrompt(): string {
  const first = PROMPTS_CREATE_THUMBNAIL_OPTIONS[0];
  return first ? String(first.value) : '';
}

export function isValidthumbnailPrompt(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  return PROMPTS_CREATE_THUMBNAIL_OPTIONS.some(o => String(o.value) === t);
}

/**
 * Chuẩn hóa giờ từ `<input type="time">` (HH:mm hoặc HH:mm:ss) → `HH:mm`.
 * Tránh lệch giữa UI và state / JSON khi trình duyệt trả về định dạng khác nhau.
 */
export function normalizeWallClockTimeToHHmm(raw: string): string {
  const s = String(raw ?? '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return s;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return s;
  h = Math.min(23, Math.max(0, h));
  min = Math.min(59, Math.max(0, min));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function isValidPublishScheduleTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(normalizeWallClockTimeToHHmm(s));
}

/** Phần thập phân ngày Excel (0..1) → `HH:mm` (local). */
function excelDayFractionToHHmm(frac: number): string {
  const f = ((frac % 1) + 1) % 1;
  const totalMinutes = Math.round(f * 24 * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Đưa giá trị ô index (sau read xlsx) về chuỗi có thể tách bởi `parseIndexPublishTimesCell`.
 * Excel thường trả `Date`, số serial (ngày + phần giờ), `HH:mm:ss`, hoặc object có `.text`.
 */
export function coercePublishTimesCellToParsableString(raw: unknown): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t && !t.includes(',') && !t.includes(';') && /^\d{4}-\d{2}-\d{2}/.test(t)) {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    }
    return t;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 0 && raw < 1e6) {
      return excelDayFractionToHHmm(raw);
    }
    return String(raw);
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as { text?: unknown; result?: unknown };
    if (typeof o.text === 'string' && o.text.trim()) return o.text.trim();
    if (typeof o.result === 'string' && o.result.trim()) return o.result.trim();
  }
  return String(raw ?? '').trim();
}

/** Parse ô «giờ update» (danh sách HH:mm hoặc HH:mm:ss, phân tách bởi dấu phẩy/chấm phẩy). */
export function parseIndexPublishTimesCell(raw: unknown): string[] {
  const s = coercePublishTimesCellToParsableString(raw);
  if (!s) return ['09:00'];
  const parts = s
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m) out.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  return out.length > 0 ? out : ['09:00'];
}

/** Điền form «Thêm/Sửa channel» từ một dòng bảng nháp. */
export function channelAddDialogInitialFromIndexRow(row: ChannelRow, headers: string[]): ChannelAddDialogInitialFields {
  const linkKey = findIndexHeaderKey(headers, 'LINK');
  const channelUrl = linkKey ? String(row[linkKey] ?? '').trim() : '';

  const emailKey = findIndexHeaderKey(headers, 'EMAIL');
  const email = emailKey ? String(row[emailKey] ?? '').trim() : '';

  const myChannelKey = findIndexHeaderKey(headers, 'KÊNH CỦA TÔI');
  const myChannel = myChannelKey ? String(row[myChannelKey] ?? '').trim() : '';

  let videoType = resolveIndexRowVideoType(row, headers);
  if (!videoType) videoType = 'from_audio';

  const durationColumnKey = findIndexHeaderKey(headers, 'THỜI GIAN VIDEO');
  let durationOption = '0_null';
  if (durationColumnKey != null && row[durationColumnKey] != null && row[durationColumnKey] !== '') {
    const v = String(row[durationColumnKey]);
    // It might be a label from the new format, or numbers from the old format
    if (['15', '20', '30', '60'].includes(v)) {
      durationOption = '0_null'; // Or mapping for legacy? "0_null" is safest
    } else {
      durationOption = durationLabelToOption(v);
    }
  }

  const bgKey = findIndexHeaderKey(headers, 'BACKGROUND');
  const bgCell = bgKey ? String(row[bgKey] ?? '').trim() : '';
  const overlayNames = new Set(OVERLAY_OPTIONS.map(o => String(o.NAME).trim()));
  const selectedBackground = videoType === 'reup_full' ? '' : bgCell;
  const reupOverlayOption = videoType === 'reup_full' && bgCell && overlayNames.has(bgCell) ? bgCell : defaultReupOverlayName();

  const folder = channelFolderFromRow(row, headers) ?? '';

  const videosPerDayColumnKey = findIndexHeaderKeyAny(headers, ['SỐ VIDEO MỖI NGÀY', 'VIDEO MỖI NGÀY', 'SỐ VIDEO UPDATE MỖI NGÀY']);
  const videosPerDayPreset =
    videosPerDayColumnKey != null && row[videosPerDayColumnKey] != null && String(row[videosPerDayColumnKey]).trim() !== ''
      ? parseVideoPerDayCell(row[videosPerDayColumnKey])
      : '1';

  const slotCount = timeSlotCountForVideoPerDayPreset(videosPerDayPreset);

  const publishTimesColumnKey = findIndexHeaderKeyAny(headers, ['GIỜ UPDATE', 'GIỜ UPLOAD MỖI NGÀY', 'GIỜ UPLOAD']);
  let publishTimes = publishTimesColumnKey ? parseIndexPublishTimesCell(row[publishTimesColumnKey]) : ['09:00'];
  while (publishTimes.length < slotCount) publishTimes.push('09:00');
  publishTimes = publishTimes.slice(0, slotCount);

  const statusKey = findIndexHeaderKey(headers, 'STATUS');

  return {
    channelUrl,
    email,
    myChannel,
    videoType,
    durationOption,
    selectedBackground,
    reupOverlayOption,
    thumbnailPrompt: defaultthumbnailPrompt(),
    folderIdOverride: folder,
    videosPerDayPreset,
    publishTimes,
    channelStatus: statusKey ? normalizeChannelIndexStatus(row[statusKey]) : 'INIT',
  };
}

export function buildChannelRowFromAddForm(
  headers: string[],
  input: ChannelAddFormInput,
  opts?: { preserveChannelFromRow?: ChannelRow | null },
): { row: ChannelRow; error?: string } {
  const row: ChannelRow = {};
  for (const h of headers) row[h] = '';

  const urlRaw = input.channelUrl.trim();
  if (!urlRaw) return { row, error: 'Nhập URL kênh.' };

  const normalizedUrl = /^https?:\/\//i.test(urlRaw) ? urlRaw : `https://${urlRaw}`;

  const folder = input.folderIdOverride.trim() || folderFromChannelUrl(urlRaw) || folderFromChannelUrl(normalizedUrl);
  if (!folder) {
    return {
      row,
      error: 'Không suy ra được ID thư mục từ URL — nhập «ID thư mục (ID hoặc CHANNEL)» thủ công.',
    };
  }

  const linkKey = findIndexHeaderKey(headers, 'LINK');
  if (linkKey) row[linkKey] = normalizedUrl;

  const emailKey = findIndexHeaderKey(headers, 'EMAIL');
  if (emailKey) row[emailKey] = input.email.trim();

  const myChannelKey = findIndexHeaderKey(headers, 'KÊNH CỦA TÔI');
  if (myChannelKey) row[myChannelKey] = input.myChannel.trim();

  const videoTypeColumnKey = findIndexHeaderKey(headers, 'LOẠI VIDEO');
  if (videoTypeColumnKey) row[videoTypeColumnKey] = input.videoType;

  const durationColumnKey = findIndexHeaderKey(headers, 'THỜI GIAN VIDEO');
  if (durationColumnKey) row[durationColumnKey] = durationOptionToLabel(input.durationOption);

  const bgKey = findIndexHeaderKey(headers, 'BACKGROUND');
  if (bgKey) {
    if (input.videoType === 'reup_full') row[bgKey] = input.overlay.trim();
    else row[bgKey] = input.background.trim();
  }

  const idKey = headers.find(h => headerNorm(h) === 'ID');
  if (idKey) row[idKey] = folder;
  const chKey = headers.find(h => headerNorm(h) === 'CHANNEL');
  if (chKey) {
    const prev = opts?.preserveChannelFromRow ? String(opts.preserveChannelFromRow[chKey] ?? '').trim() : '';
    row[chKey] = prev || folder;
  }

  const videosPerDayColumnKey = findIndexHeaderKeyAny(headers, ['SỐ VIDEO MỖI NGÀY', 'VIDEO MỖI NGÀY', 'SỐ VIDEO UPDATE MỖI NGÀY']);
  if (videosPerDayColumnKey) row[videosPerDayColumnKey] = input.videosPerDayPreset;

  const publishTimesColumnKey = findIndexHeaderKeyAny(headers, ['GIỜ UPDATE', 'GIỜ UPLOAD MỖI NGÀY', 'GIỜ UPLOAD']);
  if (publishTimesColumnKey) row[publishTimesColumnKey] = input.publishTimes.join(', ');

  const statusKey = findIndexHeaderKey(headers, 'STATUS');
  if (statusKey) row[statusKey] = normalizeChannelIndexStatus(input.channelStatus);

  return { row };
}

export function channelFolderFromRow(row: ChannelRow, headers: string[]): string | null {
  const idKey = headers.find(h => headerNorm(h) === 'ID');

  if (!idKey) return null;

  const raw = row[idKey];
  if (raw != null) {
    const s = String(raw).trim();
    if (s) return s;
  }

  return null;
}
