import type { ChannelRow, GpmProfileRow } from '@/types';
import { gpmApi } from '@/services';
import { CHANNEL_DETAIL, CHANNELS } from './models/channelsIndexSection.model';

/** Số kênh upload YouTube tối đa chạy song song; kênh còn lại xếp hàng, khi một kênh xong sẽ tự chạy tiếp. */
export const MAX_CONCURRENT_YOUTUBE_UPLOAD_CHANNELS = 2;

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function mapGpmApiProfileRow(row: unknown): GpmProfileRow | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  return {
    id: pickStr(o, ['id', 'Id', 'ID']),
    name: pickStr(o, ['name', 'Name']),
    profilePath: pickStr(o, ['profile_path', 'ProfilePath', 'profilePath']),
  };
}

/** Response list profiles GPM (có pagination ở root). */
type GpmListProfilesEnvelope = {
  data?: unknown;
  pagination?: { total_page?: number; page?: number; page_size?: number; total?: number };
};

/** Dùng chung cho dialog Upload và nút upload từ màn chi tiết kênh. */
export async function fetchAllGpmProfileRows(): Promise<GpmProfileRow[]> {
  const rows: GpmProfileRow[] = [];
  let page = 1;
  let totalPage = 1;
  const perPage = 100;
  do {
    const res = await gpmApi.listProfiles({ page, per_page: perPage });
    const env = res as unknown as GpmListProfilesEnvelope;

    let list: unknown[] = [];
    if (Array.isArray(env.data)) {
      list = env.data;
    } else if (env.data && typeof env.data === 'object' && Array.isArray((env.data as any).data)) {
      list = (env.data as any).data;
    }

    for (const item of list) {
      const m = mapGpmApiProfileRow(item);
      if (m?.id?.trim()) rows.push(m);
    }

    let tp = env.pagination?.total_page;
    if (tp == null && env.data && typeof env.data === 'object' && 'last_page' in env.data) {
      tp = (env.data as any).last_page;
    }
    totalPage = tp != null && Number.isFinite(Number(tp)) && Number(tp) >= 1 ? Math.floor(Number(tp)) : 1;
    page += 1;
  } while (page <= totalPage);
  return rows;
}

export function resolveGpmProfileIdByEmail(profiles: GpmProfileRow[], email: string): string | null {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;
  const hit = profiles.find(p => p.name.trim().toLowerCase() === norm);
  return hit?.id?.trim() || null;
}

export interface ChannelUploadVideoPayload {
  /** Một kênh cụ thể (thư mục MaVidMedia/channels/…). */
  channelFolder: string;
  /** Email kênh (index / config) — script upload dùng để lấy lịch publish. */
  email: string;
  /** `null` = mọi thư mục con đủ .mp4 + thumbnail ảnh (theo thứ tự từ Excel khi không truyền uploadFolderNames). */
  totalVideos: number | null;
  /** GPM profile id — suy ra từ email trong mavid-channel-config.json khớp `name` profile. */
  gpmProfileId: string;
  /** Chỉ upload các thư mục con (tên = video ID YouTube), đúng thứ tự — dùng từ màn chi tiết kênh. */
  uploadFolderNames?: string[];
}

export interface ChannelItem {
  folder: string;
  emails: string[];
}

export interface ChannelUploadVideoDialogProps {
  channels: ChannelRow[];
  /** Số dòng đã tick trên bảng. */
  selectedRowCount: number;
  /** Số luồng upload đang chạy nền (từ parent). */
  activeBackgroundUploadThreads?: number;
  onClose: () => void;
  /** Gọi khi đã có payloads hợp lệ; parent tự chạy upload nền (không cần await). */
  onConfirm: (payloads: ChannelUploadVideoPayload[]) => void;
}

export const convertIndexRowToChannel = (rows: ChannelRow[]) => {
  const labelToKeyMap = Object.fromEntries(CHANNELS.map(item => [item.label, item.key]));

  const convertedData = rows.map(row => {
    const newRow: ChannelRow = {};

    for (const oldKey in row) {
      const newKey = labelToKeyMap[oldKey];
      if (newKey) {
        newRow[newKey] = row[oldKey];
      }
    }

    return newRow;
  });

  return convertedData;
};

export const convertChannelVideosRowToData = (rows: ChannelRow[]) => {
  const labelToKeyMap = Object.fromEntries(CHANNEL_DETAIL.map(item => [item.label, item.key]));

  const convertedData = rows.map(row => {
    const newRow: ChannelRow = {};

    for (const oldKey in row) {
      const newKey = labelToKeyMap[oldKey];
      if (newKey) {
        newRow[newKey] = row[oldKey];
      }
    }

    return newRow;
  });

  return convertedData;
};
