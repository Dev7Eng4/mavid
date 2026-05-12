import type { ReactNode } from 'react';
import {
  DailymotionMiniIcon,
  LinkMiniIcon,
  VimeoMiniIcon,
  YoutubeMiniIcon,
} from '@/components/ui/Icons';

function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);

  const dm =
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (dm) {
    const d = Number(dm[1]);
    const m = Number(dm[2]) - 1;
    let y = Number(dm[3]);
    if (y < 100) y += 2000;
    const hh = dm[4] != null ? Number(dm[4]) : 0;
    const mm = dm[5] != null ? Number(dm[5]) : 0;
    const ss = dm[6] != null ? Number(dm[6]) : 0;
    const dt = new Date(y, m, d, hh, mm, ss);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

/** Hiển thị last upload: relative tiếng Việt nếu parse được thời gian; không thì chuỗi gốc. */
export function formatChannelLastUploadDisplay(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '—';
  const dt = parseFlexibleDate(s);
  if (!dt) return s;

  const diffMs = Date.now() - dt.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day} ngày trước`;
  const week = Math.floor(day / 7);
  if (week < 8) return `${week} tuần trước`;
  return s;
}

export type StatusBadgeStyle = {
  label: string;
  dotColor: string;
  textColor: string;
  bg: string;
};

export function channelStatusBadgeStyle(raw: unknown): StatusBadgeStyle {
  const s = String(raw ?? '').trim();
  const u = s.toUpperCase();
  const low = s.toLowerCase();

  const success =
    u === 'LIVE' ||
    u === 'ACTIVE' ||
    low.includes('đã tạo video') ||
    low.includes('hoạt động') ||
    low.includes('thành công');
  if (success) {
    return {
      label: s || '—',
      dotColor: 'var(--success)',
      textColor: 'var(--success)',
      bg: 'var(--success-bg)',
    };
  }

  const danger =
    low.includes('fail') ||
    low.includes('lỗi') ||
    low.includes('auth') ||
    low.includes('stopped') ||
    u === 'STOPPED';
  if (danger) {
    return {
      label: s || '—',
      dotColor: 'var(--error)',
      textColor: 'var(--error)',
      bg: 'var(--error-bg)',
    };
  }

  const pending = u === 'INIT' || low.includes('pending') || low.includes('chờ') || low.includes('verify');
  if (pending) {
    return {
      label: s || '—',
      dotColor: 'var(--warning)',
      textColor: 'var(--warning)',
      bg: 'var(--warning-bg)',
    };
  }

  return {
    label: s || '—',
    dotColor: 'var(--text-muted)',
    textColor: 'var(--text-muted)',
    bg: 'var(--hover-bg)',
  };
}

export function channelPlatformIcon(urlRaw: unknown): ReactNode {
  const u = String(urlRaw ?? '').trim().toLowerCase();
  if (!u) return <LinkMiniIcon className='w-4 h-4 shrink-0 opacity-60' />;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return <YoutubeMiniIcon className='w-4 h-4 shrink-0' />;
  if (u.includes('vimeo')) return <VimeoMiniIcon className='w-4 h-4 shrink-0' />;
  if (u.includes('dailymotion')) return <DailymotionMiniIcon className='w-4 h-4 shrink-0' />;
  return <LinkMiniIcon className='w-4 h-4 shrink-0 opacity-60' />;
}
