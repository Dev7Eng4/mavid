import { useEffect, useState } from 'react';
import type { Page, ScriptId } from '../../../types';
import { scriptDefs } from '../../../types';
import { AlertIcon } from '../../ui/Icons';
import { CustomSelect } from '../../ui/CustomSelect';
import { PageBackLink } from '../../ui/PageBackLink';
import { PageHeader } from '../../ui/PageHeader';
import { buildMavidEnvForReupFull } from '../../../utils/reupFullEnv';

const REUP_FULL_SCRIPT_ID: ScriptId = 'tao-batch-video-reup-full';

const CHANNEL_ICON = (
  <svg className='shrink-0' width='14' height='14' viewBox='0 0 16 16' fill='none' style={{ opacity: 0.7 }}>
    <path d='M2 4h12M2 8h12M2 12h12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className='block text-sm font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
      {children}
    </label>
  );
}

export interface CreateVideoReupPanelProps {
  disabled: boolean;
  runningScript: ScriptId | null;
  setRunningScript: (id: ScriptId | null) => void;
  appendLog: (line: string) => void;
  onNavigate: (page: Page) => void;
  onBack: () => void;
}

export function CreateVideoReupPanel({
  disabled,
  runningScript,
  setRunningScript,
  appendLog,
  onNavigate,
  onBack,
}: CreateVideoReupPanelProps) {
  const [channels, setChannels] = useState<string[]>([]);
  const [overlayNames, setOverlayNames] = useState<string[]>([]);
  const [channel, setChannel] = useState('');
  const [overlay, setOverlay] = useState('');
  const [videoCropPercent, setVideoCropPercent] = useState(0);
  const [maxVideosPerBatch, setMaxVideosPerBatch] = useState(5);
  const [minDurationMinutes, setMinDurationMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isBusy = disabled || submitting || runningScript === REUP_FULL_SCRIPT_ID;

  useEffect(() => {
    window.runner
      .listChannelFolders()
      .then(list => {
        setChannels(list);
        if (list.length > 0) setChannel(c => c || list[0]);
      })
      .catch(() => {});

    void (window.runner?.getOverlayOptionNames?.() ?? Promise.resolve([] as string[]))
      .then(names => {
        setOverlayNames(names);
        if (names.length > 0) setOverlay(o => o || names[0]);
      })
      .catch(() => {});
  }, []);

  function adjustCrop(delta: number) {
    setVideoCropPercent(prev => Math.max(0, Math.min(49, prev + delta)));
  }

  function adjustMaxVideos(delta: number) {
    setMaxVideosPerBatch(prev => Math.max(1, Math.min(100, prev + delta)));
  }

  function adjustMinDuration(delta: number) {
    setMinDurationMinutes(prev => Math.max(0, Math.min(10080, prev + delta)));
  }

  async function handleStopBatch() {
    try {
      const r = await window.runner?.cancelRunningJob?.();
      if (r?.ok) appendLog('[MaVid] Đã gửi lệnh dừng batch.');
      else appendLog('[MaVid] Không có tiến trình npm để dừng.');
    } catch (e) {
      appendLog(`[MaVid] Lỗi khi dừng: ${e instanceof Error ? e.message : 'Không xác định'}`);
    }
  }

  async function handleRunBatch() {
    if (!channel || isBusy) return;
    if (!overlay.trim()) {
      appendLog('[MaVid] Chọn overlay option.');
      return;
    }

    const def = scriptDefs.find(s => s.id === REUP_FULL_SCRIPT_ID);
    if (!def || !window.runner?.runNpmScript) {
      appendLog('[MaVid] Runner chưa sẵn sàng.');
      return;
    }

    const config = {
      channel,
      overlay: overlay.trim(),
      videoCropPercent,
      maxVideosPerBatch,
      minDurationMinutes,
    };

    setSubmitting(true);
    setRunningScript(REUP_FULL_SCRIPT_ID);

    try {
      const extraEnv = buildMavidEnvForReupFull(config);
      const res = await window.runner.runNpmScript(def.npmScript, extraEnv);
      if (res.cancelled) {
        appendLog('[MaVid] Batch đã được dừng.');
        return;
      }
      if (res.code !== 0) throw new Error(`Exit code: ${res.code}`);
    } catch (e) {
      appendLog(`[MaVid] Lỗi: ${e instanceof Error ? e.message : 'Không xác định'}`);
    } finally {
      setRunningScript(null);
      setSubmitting(false);
    }
  }

  const chOptions = channels.map(n => ({ value: n }));
  const overlayOptions = overlayNames.map(n => ({ value: n }));

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageBackLink onClick={() => !isBusy && onBack()} disabled={isBusy} />

      <PageHeader title='Reup Full' description='Overlay lên video gốc theo file Excel trong folder channel (giống batch Pipeline).' />

      {disabled && (
        <div className='mavid-callout-warning'>
          <AlertIcon className='w-5 h-5 shrink-0' />
          <span>Đang có script khác chạy.</span>
        </div>
      )}

      <div className='rounded-2xl p-6' style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5'>
          <div className='min-w-0'>
            <FieldLabel>Channel</FieldLabel>
            <CustomSelect
              value={channel}
              options={chOptions}
              onChange={setChannel}
              placeholder='Chọn channel...'
              emptyText='Không có folder trong MaVidMedia/channels/'
              icon={CHANNEL_ICON}
            />
          </div>

          <div className='min-w-0'>
            <FieldLabel>Overlay option</FieldLabel>
            <CustomSelect
              value={overlay}
              options={overlayOptions}
              onChange={setOverlay}
              placeholder='Chọn preset...'
              emptyText='Không đọc được constants/overlayOptions.js / IPC Electron.'
            />
            <p className='text-sm mt-2' style={{ color: 'var(--text-muted)' }}>
              Khớp tên thư mục trong assets/overlay/&lt;NAME&gt;/ — danh sách từ contents/constants/overlayOptions.js.
            </p>
          </div>

          <div className='min-w-0'>
            <FieldLabel>Video crop percent</FieldLabel>
            <div
              className='flex items-center rounded-xl overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                type='button'
                disabled={isBusy}
                onClick={() => adjustCrop(-1)}
                className='px-3 py-2.5 text-sm font-medium cursor-pointer shrink-0 transition-colors duration-150'
                style={{ color: 'var(--text-h)', borderRight: '1px solid var(--border)' }}
              >
                −
              </button>
              <input
                type='number'
                min={0}
                max={49}
                disabled={isBusy}
                value={videoCropPercent}
                onChange={e => setVideoCropPercent(Math.max(0, Math.min(49, Number(e.target.value) || 0)))}
                className='flex-1 text-center text-sm outline-none py-2.5 min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none' }}
              />
              <button
                type='button'
                disabled={isBusy}
                onClick={() => adjustCrop(1)}
                className='px-3 py-2.5 text-sm font-medium cursor-pointer shrink-0 transition-colors duration-150'
                style={{ color: 'var(--text-h)', borderLeft: '1px solid var(--border)' }}
              >
                +
              </button>
            </div>
            <p className='text-sm mt-1.5' style={{ color: 'var(--text-muted)' }}>
              0 = tắt. 1–49: zoom tâm rồi cắt ~% mỗi phía (giống makeVideoFromFull).
            </p>
          </div>

          <div className='min-w-0'>
            <FieldLabel>Số video tối đa mỗi lần tạo</FieldLabel>
            <div
              className='flex items-center rounded-xl overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                type='button'
                disabled={isBusy}
                onClick={() => adjustMaxVideos(-1)}
                className='px-3 py-2.5 text-sm font-medium cursor-pointer shrink-0 transition-colors duration-150'
                style={{ color: 'var(--text-h)', borderRight: '1px solid var(--border)' }}
              >
                −
              </button>
              <input
                type='number'
                min={1}
                max={100}
                disabled={isBusy}
                value={maxVideosPerBatch}
                onChange={e => setMaxVideosPerBatch(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className='flex-1 text-center text-sm outline-none py-2.5 min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none' }}
              />
              <button
                type='button'
                disabled={isBusy}
                onClick={() => adjustMaxVideos(1)}
                className='px-3 py-2.5 text-sm font-medium cursor-pointer shrink-0 transition-colors duration-150'
                style={{ color: 'var(--text-h)', borderLeft: '1px solid var(--border)' }}
              >
                +
              </button>
            </div>
            <p className='text-sm mt-1.5' style={{ color: 'var(--text-muted)' }}>
              Giới hạn số link xử lý mỗi lần chạy (1–100), mặc định 5.
            </p>
          </div>

          <div className='min-w-0'>
            <FieldLabel>Độ dài tối thiểu (phút)</FieldLabel>
            <div
              className='flex items-center rounded-xl overflow-hidden'
              style={{ border: '1px solid var(--border)', background: 'var(--code-bg)' }}
            >
              <button
                type='button'
                disabled={isBusy}
                onClick={() => adjustMinDuration(-5)}
                className='px-3 py-2.5 text-sm font-medium cursor-pointer shrink-0 transition-colors duration-150'
                style={{ color: 'var(--text-h)', borderRight: '1px solid var(--border)' }}
              >
                −
              </button>
              <input
                type='number'
                min={0}
                max={10080}
                disabled={isBusy}
                value={minDurationMinutes}
                onChange={e => setMinDurationMinutes(Math.max(0, Math.min(10080, Number(e.target.value) || 0)))}
                className='flex-1 text-center text-sm outline-none py-2.5 min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none'
                style={{ background: 'transparent', color: 'var(--text-h)', border: 'none' }}
              />
              <button
                type='button'
                disabled={isBusy}
                onClick={() => adjustMinDuration(5)}
                className='px-3 py-2.5 text-sm font-medium cursor-pointer shrink-0 transition-colors duration-150'
                style={{ color: 'var(--text-h)', borderLeft: '1px solid var(--border)' }}
              >
                +
              </button>
            </div>
            <p className='text-sm mt-1.5' style={{ color: 'var(--text-muted)' }}>
              0 = không lọc. &gt;0 = chỉ dòng có cột DURATION ≥ số phút.
            </p>
          </div>

          <div className='flex flex-wrap gap-3 pt-2 lg:col-span-2'>
            {runningScript === REUP_FULL_SCRIPT_ID && (
              <>
                <button
                  type='button'
                  onClick={() => void handleStopBatch()}
                  className='rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200'
                  style={{
                    color: '#fecaca',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                  }}
                >
                  Dừng batch
                </button>
                <button
                  type='button'
                  onClick={() => onNavigate('logs')}
                  className='rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200'
                  style={{
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  Xem Logs
                </button>
              </>
            )}
            <button
              type='button'
              onClick={() => void handleRunBatch()}
              disabled={!channel || !overlay.trim() || isBusy}
              className='rounded-xl px-5 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: '1px solid var(--accent)',
              }}
            >
              {submitting || runningScript === REUP_FULL_SCRIPT_ID ? 'Đang chạy...' : 'Chạy batch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
