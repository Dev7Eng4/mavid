import type { Dispatch, SetStateAction } from 'react';

import type { ScriptDef } from './videoPipelineData';
import { SectionCard } from './SectionCard';
import { TabSwitcher, type TabKey } from './TabSwitcher';

type Props = {
  tab: TabKey;
  setTab: Dispatch<SetStateAction<TabKey>>;
  scriptDefs: ScriptDef[];
  selectedId: string;
  setSelectedId: Dispatch<SetStateAction<string>>;
  runningId: string | null;
  status: string;
  canRun: boolean;
  runSelected: () => void;
};

export function PipelineTab({
  tab,
  setTab,
  scriptDefs,
  selectedId,
  setSelectedId,
  runningId,
  status,
  canRun,
  runSelected,
}: Props) {
  const selected = scriptDefs.find(s => s.id === selectedId) || scriptDefs[0];

  return (
    <div className='min-h-svh w-full flex'>
      <aside className='w-[300px] shrink-0 border-r p-4' style={{ borderRightColor: 'var(--border)' }}>
        <TabSwitcher tab={tab} setTab={setTab} />

        <div className='space-y-2'>
          {scriptDefs.map(s => {
            const isActive = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                disabled={runningId !== null}
                className='w-full rounded px-3 py-2 text-left text-sm'
                style={{
                  background: isActive ? 'var(--accent-bg)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-h)',
                  border: isActive ? '1px solid var(--accent-border)' : `1px solid transparent`,
                  opacity: runningId !== null ? 0.7 : 1,
                }}
              >
                {s.title}
              </button>
            );
          })}
        </div>

        <div className='mt-4 text-xs' style={{ opacity: 0.8 }}>
          {runningId ? 'Đang chạy: vui lòng chờ.' : 'Chọn bước -> bấm Chạy.'}
        </div>
      </aside>

      <main className='flex-1 p-6 overflow-auto'>
        <div className='mb-4'>
          <div className='text-xl font-semibold' style={{ color: 'var(--text-h)' }}>
            {selected.title}
          </div>
          <div className='text-sm' style={{ opacity: 0.85, marginTop: 4 }}>
            {selected.summary}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <SectionCard title='Inputs (đọc từ đâu)'>
            <ul className='list-disc pl-5'>
              {selected.inputs.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title='Outputs (tạo ra gì)'>
            <ul className='list-disc pl-5'>
              {selected.outputs.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title='Thực thi'>
            <div className='mb-3 text-sm' style={{ opacity: 0.9 }}>
              Trạng thái:{' '}
              <span style={{ color: runningId ? 'var(--accent)' : 'var(--text-h)' }}>{status}</span>
            </div>

            <div className='flex gap-2 flex-wrap'>
              <button
                onClick={() => runSelected()}
                disabled={!canRun}
                className='rounded px-3 py-2 text-sm'
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  opacity: canRun ? 1 : 0.7,
                }}
              >
                {runningId === selected.id ? 'Đang chạy...' : 'Chạy script'}
              </button>

              <div className='text-xs' style={{ opacity: 0.85, alignSelf: 'center' }}>
                Lưu ý: log/prompt sẽ hiện ở terminal nơi bạn chạy `npm start`.
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}

