import type { ChannelRow, ScriptId } from '../../../types';
import { buildMavidEnvForVideoFromAudio, defaultBackgroundFolder } from '../../../utils/videoFromAudioEnv';
import { buildMavidEnvForReupFull } from '../../../utils/reupFullEnv';

/** Khớp dropdown trong getInfoChannel / electron write-channel-index */
export const INDEX_VIDEO_TYPE_VALUES = ['from_audio', 'reup_full'] as const;
export const INDEX_THOI_GIAN_MINUTES = [15, 20, 30, 60] as const;

export const SCRIPT_FROM_AUDIO: ScriptId = 'tao-batch-video-tu-audio';
export const SCRIPT_REUP_FULL: ScriptId = 'tao-batch-video-reup-full';

export function headerNorm(h: string): string {
  return String(h).trim().toUpperCase();
}

export function findIndexHeaderKey(headers: string[], normName: string): string | undefined {
  const n = normName.trim().toUpperCase();
  return headers.find(h => headerNorm(h) === n);
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
