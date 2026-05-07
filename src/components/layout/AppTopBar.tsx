import type { Page } from '@/types';
import { BellIcon, HelpCircleIcon, SearchIcon, UserCircleIcon } from '@/components/ui/Icons';

const PAGE_TITLE: Record<Page, string> = {
  pipeline: 'Pipeline',
  'create-video': 'Tạo video',
  settings: 'Settings',
  channels: 'Channels',
  visual: 'Visual',
  groups: 'Group',
  warnings: 'Warning',
  analyst: 'Analyst',
  gpm: 'GPM',
  logs: 'Logs',
};

interface Props {
  activePage: Page;
}

export function AppTopBar({ activePage }: Props) {
  const section = PAGE_TITLE[activePage];

  return (
    <header
      className='sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3 backdrop-blur-md sm:px-6'
      style={{
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        borderColor: 'var(--border)',
      }}
    >
      <div className='flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3'>
        <span className='truncate text-lg font-bold tracking-tight' style={{ color: 'var(--text-h)' }}>
          MaVid
        </span>
        <span className='truncate text-sm font-medium opacity-80' style={{ color: 'var(--text-muted)' }}>
          {section}
        </span>
      </div>

      <div className='flex flex-1 items-center justify-end gap-2 sm:gap-3'>
        <label className='relative hidden max-w-xs flex-1 sm:block lg:max-w-md'>
          <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45' />
          <input
            type='search'
            readOnly
            placeholder='Tìm tài nguyên…'
            aria-label='Tìm kiếm (sắp có)'
            className='w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-colors'
            style={{
              background: 'var(--code-bg)',
              color: 'var(--text-h)',
              border: '1px solid var(--border)',
            }}
          />
        </label>

        <div className='flex items-center gap-1'>
          <button
            type='button'
            className='rounded-xl p-2 opacity-80 transition-colors hover:opacity-100 cursor-pointer'
            style={{ color: 'var(--text-muted)' }}
            aria-label='Thông báo'
          >
            <BellIcon className='h-5 w-5' />
          </button>
          <button
            type='button'
            className='rounded-xl p-2 opacity-80 transition-colors hover:opacity-100 cursor-pointer'
            style={{ color: 'var(--text-muted)' }}
            aria-label='Trợ giúp'
          >
            <HelpCircleIcon className='h-5 w-5' />
          </button>
          <button
            type='button'
            className='rounded-xl p-2 opacity-80 transition-colors hover:opacity-100 cursor-pointer'
            style={{ color: 'var(--text-muted)' }}
            aria-label='Tài khoản'
          >
            <UserCircleIcon className='h-5 w-5' />
          </button>
        </div>
      </div>
    </header>
  );
}
