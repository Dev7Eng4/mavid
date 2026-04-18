import type { GpmProfileRow } from '@/types';
import { gpmApi } from '@/services';

export function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

export function mapGpmApiProfileRow(row: unknown): GpmProfileRow | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  return {
    id: pickStr(o, ['id', 'Id', 'ID']),
    name: pickStr(o, ['name', 'Name']),
    profilePath: pickStr(o, ['profile_path', 'ProfilePath', 'profilePath']),
  };
}

/** Response list profiles GPM (có pagination ở root). */
export type GpmListProfilesEnvelope = {
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
    const list = Array.isArray(env.data) ? env.data : [];
    for (const item of list) {
      const m = mapGpmApiProfileRow(item);
      if (m?.id?.trim()) rows.push(m);
    }
    const tp = env.pagination?.total_page;
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
