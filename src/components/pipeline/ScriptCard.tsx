import type { ScriptDef } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { PlayIcon, SpinnerIcon } from '../ui/Icons';

export type ScriptStatus = 'idle' | 'running' | 'done' | 'error';

interface Props {
  script: ScriptDef;
  status: ScriptStatus;
  disabled: boolean;
  onRun: () => void;
}

export function ScriptCard({ script, status, disabled, onRun }: Props) {
  const isRunning = status === 'running';
  
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{ 
        background: 'var(--card-bg)', 
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--accent-border)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-h)' }}>
            {script.title}
          </div>
          <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text)' }}>
            {script.summary}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <button
        onClick={onRun}
        disabled={disabled}
        className="self-start flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-200"
        style={{
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          border: '1px solid var(--accent-border)',
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.boxShadow = 'var(--shadow-accent)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isRunning ? (
          <SpinnerIcon className="w-4 h-4" />
        ) : (
          <PlayIcon className="w-4 h-4" />
        )}
        <span>{isRunning ? 'Đang chạy...' : 'Chạy'}</span>
      </button>
    </div>
  );
}
