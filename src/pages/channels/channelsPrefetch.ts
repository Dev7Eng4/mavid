import type { ChannelRow, Group } from '@/types';
import { convertIndexRowToChannel } from './channelUploadVideoHelpers';

const INDEX_FILE = 'channels/index.xlsx';

type ChannelsIndexCache = {
  channels: ChannelRow[];
  groups: Group[];
  loadedAt: number;
};

let cache: ChannelsIndexCache | null = null;
let inflight: Promise<ChannelsIndexCache> | null = null;

export function getChannelsIndexCache(): ChannelsIndexCache | null {
  return cache;
}

export async function prefetchChannelsIndex(): Promise<ChannelsIndexCache> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const next: ChannelsIndexCache = {
      channels: [],
      groups: [],
      loadedAt: Date.now(),
    };

    try {
      const d = await window.runner?.readChannelData?.(INDEX_FILE);
      next.channels = convertIndexRowToChannel(Array.isArray(d?.rows) ? d.rows : []);
    } catch {
      next.channels = [];
    }

    try {
      const r = await window.runner?.getMavidGroups?.();
      next.groups = Array.isArray(r?.items) ? r.items : [];
    } catch {
      next.groups = [];
    }

    cache = next;
    inflight = null;
    return next;
  })();

  return inflight;
}

/** Giống `prefetchChannelsIndex` nhưng không throw, tiện gọi lúc app start. */
export async function ensureChannelsIndexPrefetched(): Promise<void> {
  try {
    await prefetchChannelsIndex();
  } catch {
    // ignore
  }
}
