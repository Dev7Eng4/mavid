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
    ></header>
  );
}
