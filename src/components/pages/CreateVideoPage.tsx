import { useState } from 'react';
import type { Page, ScriptId } from '../../types';
import { MusicIcon, RefreshIcon, SpinnerIcon, ArrowRightIcon, AlertIcon } from '../ui/Icons';
import { CreateVideoFromAudioPanel } from './create-video/CreateVideoFromAudioPanel';
import { CreateVideoReupPanel } from './create-video/CreateVideoReupPanel';

interface Props {
  disabled?: boolean;
  runningScript: ScriptId | null;
  setRunningScript: (id: ScriptId | null) => void;
  appendLog: (line: string) => void;
  onNavigate: (page: Page) => void;
}

type View = 'cards' | 'audio-form' | 'reup-form';

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

function ActionCard({ icon, title, description, disabled, loading, onClick }: ActionCardProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type='button'
      disabled={isDisabled}
      onClick={onClick}
      className='group relative rounded-2xl p-6 text-left cursor-pointer transition-all duration-300'
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        opacity: isDisabled ? 0.5 : 1,
      }}
      onMouseEnter={e => {
        if (!isDisabled) {
          e.currentTarget.style.borderColor = 'var(--accent-border)';
          e.currentTarget.style.boxShadow = 'var(--shadow-accent)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className='flex items-start gap-4'>
        <div
          className='w-12 h-12 rounded-xl flex items-center justify-center shrink-0'
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
        >
          {icon}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <h3 className='text-base font-semibold' style={{ color: 'var(--text-h)' }}>
              {title}
            </h3>
            <ArrowRightIcon className='w-4 h-4 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0' />
          </div>
          <p className='text-sm mt-1' style={{ color: 'var(--text)' }}>
            {description}
          </p>
        </div>
      </div>

      {loading && (
        <div className='absolute inset-0 rounded-2xl flex items-center justify-center' style={{ background: 'rgba(10, 10, 15, 0.8)' }}>
          <SpinnerIcon className='w-6 h-6' />
        </div>
      )}
    </button>
  );
}

export function CreateVideoPage({ disabled = false, runningScript, setRunningScript, appendLog, onNavigate }: Props) {
  const [view, setView] = useState<View>('cards');

  if (view === 'audio-form') {
    return (
      <CreateVideoFromAudioPanel
        disabled={disabled}
        runningScript={runningScript}
        setRunningScript={setRunningScript}
        appendLog={appendLog}
        onNavigate={onNavigate}
        onBack={() => setView('cards')}
      />
    );
  }

  if (view === 'reup-form') {
    return (
      <CreateVideoReupPanel
        disabled={disabled}
        runningScript={runningScript}
        setRunningScript={setRunningScript}
        appendLog={appendLog}
        onNavigate={onNavigate}
        onBack={() => setView('cards')}
      />
    );
  }

  return (
    <div className='space-y-8 w-full min-w-0'>
      <div>
        <h1 className='text-2xl font-bold mb-2' style={{ color: 'var(--text-h)' }}>
          Tạo video
        </h1>
        <p className='text-sm' style={{ color: 'var(--text)' }}>
          Chọn loại video và điền form tương ứng.
        </p>
      </div>

      {disabled && (
        <div
          className='flex items-center gap-3 text-sm rounded-xl px-4 py-3'
          style={{ color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
        >
          <AlertIcon className='w-5 h-5 shrink-0' />
          <span>Đang có script chạy. Vui lòng chờ hoàn tất.</span>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <ActionCard
          icon={<MusicIcon className='w-6 h-6' />}
          title='Tạo từ Audio'
          description='Ghép audio với stock video hoặc tự động tính số clip. Cấu hình channel, nền, speed, logo.'
          disabled={disabled}
          loading={false}
          onClick={() => !disabled && setView('audio-form')}
        />

        <ActionCard
          icon={<RefreshIcon className='w-6 h-6' />}
          title='Reup Full'
          description='Thêm overlay ảnh hoặc video lên video gốc.'
          disabled={disabled}
          loading={false}
          onClick={() => !disabled && setView('reup-form')}
        />
      </div>
    </div>
  );
}
