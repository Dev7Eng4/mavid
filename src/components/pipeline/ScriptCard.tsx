import type { ScriptDef } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';

export type ScriptStatus = 'idle' | 'running' | 'done' | 'error';

interface Props {
  script: ScriptDef;
  status: ScriptStatus;
  disabled: boolean;
  onRun: () => void;
}

export function ScriptCard({ script, status, disabled, onRun }: Props) {
  return (
    <div
      className='rounded-xl p-5 flex flex-col gap-3'
      style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-sm font-semibold truncate' style={{ color: 'var(--text-h)' }}>
            {script.title}
          </div>
          <div className='text-xs mt-1 leading-relaxed' style={{ color: 'var(--text)' }}>
            {script.summary}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <button
        onClick={onRun}
        disabled={disabled}
        className='self-start rounded-lg px-4 py-2 text-xs font-medium transition-opacity'
        style={{
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          border: '1px solid var(--accent-border)',
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'running' ? 'Đang chạy...' : 'Chạy'}
      </button>
    </div>
  );
}
