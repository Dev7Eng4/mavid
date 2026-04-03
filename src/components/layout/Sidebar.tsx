import type { Page } from '../../types';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: '▶' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'channels', label: 'Channels', icon: '☰' },
  { id: 'logs', label: 'Logs', icon: '⎙' },
];

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isRunning: boolean;
}

export function Sidebar({ activePage, onNavigate, isRunning }: Props) {
  return (
    <aside
      className='fixed left-0 top-0 bottom-0 w-56 flex flex-col z-10'
      style={{ background: 'var(--code-bg)', borderRight: '1px solid var(--border)' }}
    >
      <div className='px-5 py-5 flex items-center gap-2'>
        <div
          className='w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold'
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
        >
          M
        </div>
        <span className='text-base font-semibold' style={{ color: 'var(--text-h)' }}>
          MaVid
        </span>
      </div>

      <nav className='flex-1 px-3 mt-2 space-y-1'>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className='w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors'
              style={{
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                fontWeight: active ? 600 : 400,
              }}
            >
              <span className='text-base w-5 text-center'>{item.icon}</span>
              {item.label}
              {item.id === 'pipeline' && isRunning && (
                <span className='ml-auto w-2 h-2 rounded-full animate-pulse' style={{ background: 'var(--accent)' }} />
              )}
            </button>
          );
        })}
      </nav>

      <div className='px-5 py-4 text-xs' style={{ color: 'var(--text)', opacity: 0.5 }}>
        MaVid v0.1.0
      </div>
    </aside>
  );
}
