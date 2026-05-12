import type { Page } from '../../types';
import {
  PlayIcon,
  VideoIcon,
  SettingsIcon,
  ListIcon,
  VisualIcon,
  GroupIcon,
  AlertIcon,
  TerminalIcon,
  FilmIcon,
  GpmIcon,
  ChartBarsIcon,
} from '../ui/Icons';
import type { ReactNode } from 'react';

const NAV_ITEMS: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: <PlayIcon className='w-[18px] h-[18px]' /> },
  { id: 'create-video', label: 'Tạo video', icon: <FilmIcon className='w-[18px] h-[18px]' /> },
  { id: 'channels', label: 'Channels', icon: <ListIcon className='w-[18px] h-[18px]' /> },
  { id: 'visual', label: 'Visual', icon: <VisualIcon className='w-[18px] h-[18px]' /> },
  { id: 'groups', label: 'Group', icon: <GroupIcon className='w-[18px] h-[18px]' /> },
  { id: 'warnings', label: 'Warning', icon: <AlertIcon className='w-[18px] h-[18px]' /> },
  { id: 'analyst', label: 'Analyst', icon: <ChartBarsIcon className='w-[18px] h-[18px]' /> },
  { id: 'gpm', label: 'GPM', icon: <GpmIcon className='w-[18px] h-[18px]' /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className='w-[18px] h-[18px]' /> },
  { id: 'logs', label: 'Logs', icon: <TerminalIcon className='w-[18px] h-[18px]' /> },
];

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isRunning: boolean;
  /** Dừng tiến trình npm đang chạy (batch script); không thoát app. */
  onStopRunningJob?: () => void;
}

export function Sidebar({ activePage, onNavigate, isRunning, onStopRunningJob }: Props) {
  return (
    <aside
      className='fixed left-0 top-0 bottom-0 w-56 flex flex-col z-10'
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
    >
      <div className='px-5 py-5 flex items-center gap-3'>
        <div
          className='w-9 h-9 rounded-sm flex items-center justify-center text-sm font-bold shadow-lg shrink-0'
          style={{
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          <VideoIcon className='w-5 h-5' />
        </div>
        <div className='min-w-0 flex flex-col gap-0.5'>
          <span className='text-lg font-semibold tracking-tight leading-tight' style={{ color: 'var(--text-h)' }}>
            MaVid
          </span>
        </div>
      </div>

      <nav className='flex-1 px-2 mt-4 space-y-1'>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className='relative w-full flex items-center gap-3 pl-3 pr-3 py-2.5 text-sm cursor-pointer transition-all duration-200 overflow-hidden'
              style={{
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                fontWeight: active ? 500 : 400,
                boxShadow: active ? '0 0 20px rgba(0, 0, 0, 0.55)' : 'none',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-h)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
            >
              <span
                aria-hidden
                className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] transition-opacity duration-200'
                style={{
                  height: active ? '100%' : '0%',
                  opacity: active ? 1 : 0,
                  background: 'var(--accent)',
                  boxShadow: active ? '0 0 12px var(--accent-glow)' : 'none',
                }}
              />
              <span className='w-5 flex items-center justify-center opacity-80 shrink-0'>{item.icon}</span>
              {item.label}
              {item.id === 'pipeline' && isRunning && (
                <span
                  className='ml-auto w-2 h-2 rounded-full animate-pulse'
                  style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {isRunning && onStopRunningJob && (
        <div className='px-3 pb-3'>
          <button
            type='button'
            onClick={onStopRunningJob}
            className='w-full rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200'
            style={{
              color: '#fecaca',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
          >
            Dừng job (npm)
          </button>
        </div>
      )}

      <div className='px-5 py-4 text-sm font-medium' style={{ color: 'var(--text)', opacity: 0.4 }}>
        v0.1.0
      </div>
    </aside>
  );
}
