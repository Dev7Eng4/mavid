import type { ChannelRow, ScriptId } from '../../../types';
import { buildMavidEnvForVideoFromAudio, defaultBackgroundFolder } from '../../../utils/videoFromAudioEnv';
import { buildMavidEnvForReupFull } from '../../../utils/reupFullEnv';

/** Khớp dropdown trong getInfoChannel / electron write-channel-index */
export const INDEX_VIDEO_TYPE_VALUES = ['from_audio', 'reup_full'] as const;
/** Giá trị phút (dropdown) khớp cột THỜI GIAN VIDEO trong index / getInfoChannel. */
export const INDEX_VIDEO_DURATION_MINUTES = [15, 20, 30, 60] as const;
/** @deprecated Dùng INDEX_VIDEO_DURATION_MINUTES */
export const INDEX_THOI_GIAN_MINUTES = INDEX_VIDEO_DURATION_MINUTES;

export const SCRIPT_FROM_AUDIO: ScriptId = 'tao-batch-video-tu-audio';
export const SCRIPT_REUP_FULL: ScriptId = 'tao-batch-video-reup-full';

export function headerNorm(h: string): string {
  return String(h).trim().toUpperCase();
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

export function buildExtraEnvForIndexChannelRow(
  row: ChannelRow,
  headers: string[],
  folder: string,
  videoType: 'from_audio' | 'reup_full',
  bgList: string[],
): Record<string, string> {
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
        maxVideosPerBatch: 5,
        minDurationMinutes: 0,
        showLogo: false,
      },
      bgList,
    );
  }
  return buildMavidEnvForReupFull({
    channel: folder,
    overlay: '',
    videoCropPercent: 0,
    maxVideosPerBatch: 5,
    minDurationMinutes: 0,
  });
}

/** Lựa chọn «số video update mỗi ngày» trong form; `1-2` = 1 suất ngày thường + 2 suất cuối tuần. */
export type VideoPerDayPreset = '1' | '2' | '3' | '1-2';

export function parseVideoPerDayCell(raw: unknown): VideoPerDayPreset {
  const s = String(raw ?? '')
    .trim()
    .replace(/\u2013/g, '-');
  if (s === '1-2') return '1-2';
  const n = parseInt(s, 10);
  if (n === 3) return '3';
  if (n === 2) return '2';
  return '1';
}

/** Số ô giờ cần nhập (preset `1-2` → 3 ô: 1 + 2). */
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
  videoType: 'from_audio' | 'reup_full';
  durationMinutes: number;
  background: string;
  videosPerDayPreset: VideoPerDayPreset;
  publishTimes: string[];
  /** Nếu có — ghi đè suy luận từ URL cho ID/CHANNEL */
  folderIdOverride: string;
}

/** Giá trị khởi tạo form thêm/sửa kênh (map từ một dòng index). */
export interface ChannelAddDialogInitialFields {
  channelUrl: string;
  email: string;
  videoType: string;
  /** Chuỗi phút khớp dropdown (vd. "15"). */
  durationMinutes: string;
  selectedBackground: string;
  folderIdOverride: string;
  videosPerDayPreset: VideoPerDayPreset;
  publishTimes: string[];
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
    if (
      t &&
      !t.includes(',') &&
      !t.includes(';') &&
      /^\d{4}-\d{2}-\d{2}/.test(t)
    ) {
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
  const parts = s.split(/[,;]/).map(p => p.trim()).filter(Boolean);
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

  let videoType = resolveIndexRowVideoType(row, headers);
  if (!videoType) videoType = 'from_audio';

  const durationColumnKey = findIndexHeaderKey(headers, 'THỜI GIAN VIDEO');
  let durationMinutes = '15';
  if (durationColumnKey != null && row[durationColumnKey] != null && row[durationColumnKey] !== '') {
    const n = Number(row[durationColumnKey]);
    if (Number.isFinite(n) && (INDEX_VIDEO_DURATION_MINUTES as readonly number[]).includes(n)) {
      durationMinutes = String(n);
    }
  }

  const bgKey = findIndexHeaderKey(headers, 'BACKGROUND');
  const selectedBackground = bgKey ? String(row[bgKey] ?? '').trim() : '';

  const folder = channelFolderFromRow(row, headers) ?? '';
  const urlRaw = channelUrl.trim();
  const normalizedUrl = urlRaw && /^https?:\/\//i.test(urlRaw) ? urlRaw : urlRaw ? `https://${urlRaw}` : '';
  const inferred =
    folderFromChannelUrl(urlRaw) || (normalizedUrl ? folderFromChannelUrl(normalizedUrl) : null);
  const folderIdOverride = !folder ? '' : inferred === folder ? '' : folder;

  const videosPerDayColumnKey = findIndexHeaderKeyAny(headers, [
    'SỐ VIDEO MỖI NGÀY',
    'VIDEO MỖI NGÀY',
    'SỐ VIDEO UPDATE MỖI NGÀY',
  ]);
  const videosPerDayPreset =
    videosPerDayColumnKey != null &&
    row[videosPerDayColumnKey] != null &&
    String(row[videosPerDayColumnKey]).trim() !== ''
      ? parseVideoPerDayCell(row[videosPerDayColumnKey])
      : '1';

  const slotCount = timeSlotCountForVideoPerDayPreset(videosPerDayPreset);

  const publishTimesColumnKey = findIndexHeaderKeyAny(headers, ['GIỜ UPDATE', 'GIỜ UPLOAD MỖI NGÀY', 'GIỜ UPLOAD']);
  let publishTimes = publishTimesColumnKey ? parseIndexPublishTimesCell(row[publishTimesColumnKey]) : ['09:00'];
  while (publishTimes.length < slotCount) publishTimes.push('09:00');
  publishTimes = publishTimes.slice(0, slotCount);

  return {
    channelUrl,
    email,
    videoType,
    durationMinutes,
    selectedBackground,
    folderIdOverride,
    videosPerDayPreset,
    publishTimes,
  };
}

export function buildChannelRowFromAddForm(
  headers: string[],
  input: ChannelAddFormInput,
): { row: ChannelRow; error?: string } {
  const row: ChannelRow = {};
  for (const h of headers) row[h] = '';

  const urlRaw = input.channelUrl.trim();
  if (!urlRaw) return { row, error: 'Nhập URL kênh.' };

  const normalizedUrl = /^https?:\/\//i.test(urlRaw) ? urlRaw : `https://${urlRaw}`;

  const folder =
    input.folderIdOverride.trim() ||
    folderFromChannelUrl(urlRaw) ||
    folderFromChannelUrl(normalizedUrl);
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

  const videoTypeColumnKey = findIndexHeaderKey(headers, 'LOẠI VIDEO');
  if (videoTypeColumnKey) row[videoTypeColumnKey] = input.videoType;

  const durationColumnKey = findIndexHeaderKey(headers, 'THỜI GIAN VIDEO');
  if (durationColumnKey) row[durationColumnKey] = input.durationMinutes;

  const bgKey = findIndexHeaderKey(headers, 'BACKGROUND');
  if (bgKey) row[bgKey] = input.background.trim();

  const idKey = headers.find(h => headerNorm(h) === 'ID');
  if (idKey) row[idKey] = folder;
  const chKey = headers.find(h => headerNorm(h) === 'CHANNEL');
  if (chKey) row[chKey] = folder;

  const videosPerDayColumnKey = findIndexHeaderKeyAny(headers, [
    'SỐ VIDEO MỖI NGÀY',
    'VIDEO MỖI NGÀY',
    'SỐ VIDEO UPDATE MỖI NGÀY',
  ]);
  if (videosPerDayColumnKey) row[videosPerDayColumnKey] = input.videosPerDayPreset;

  const publishTimesColumnKey = findIndexHeaderKeyAny(headers, ['GIỜ UPDATE', 'GIỜ UPLOAD MỖI NGÀY', 'GIỜ UPLOAD']);
  if (publishTimesColumnKey) row[publishTimesColumnKey] = input.publishTimes.join(', ');

  return { row };
}

export function channelFolderFromRow(row: ChannelRow, headers: string[]): string | null {
  const idKey = headers.find(h => headerNorm(h) === 'ID');
  if (idKey) {
    const raw = row[idKey];
    if (raw != null) {
      const s = String(raw).trim();
      if (s) return s;
    }
  }
  const chKey = headers.find(h => headerNorm(h) === 'CHANNEL');
  if (!chKey) return null;
  const v = row[chKey];
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}
