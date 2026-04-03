import type { Dispatch, SetStateAction } from 'react';

export type TabKey = 'pipeline' | 'settings';

export function TabSwitcher({ tab, setTab }: { tab: TabKey; setTab: Dispatch<SetStateAction<TabKey>> }) {
  return (
    <div className='flex gap-2 mb-3'>
      <button
        onClick={() => setTab('pipeline')}
        className='flex-1 rounded px-3 py-2 text-sm'
        style={{
          color: tab === 'pipeline' ? 'var(--accent)' : 'var(--text-h)',
          background: tab === 'pipeline' ? 'var(--accent-bg)' : 'transparent',
          border: '1px solid',
          borderColor: tab === 'pipeline' ? 'var(--accent-border)' : 'transparent',
        }}
      >
        Pipeline
      </button>
      <button
        onClick={() => setTab('settings')}
        className='flex-1 rounded px-3 py-2 text-sm'
        style={{
          color: tab === 'settings' ? 'var(--accent)' : 'var(--text-h)',
          background: tab === 'settings' ? 'var(--accent-bg)' : 'transparent',
          border: '1px solid',
          borderColor: tab === 'settings' ? 'var(--accent-border)' : 'transparent',
        }}
      >
        Setting
      </button>
    </div>
  );
}

