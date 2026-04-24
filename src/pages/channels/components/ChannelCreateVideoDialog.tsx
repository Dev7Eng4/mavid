import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_SCHEDULED_DAYS, MAX_VIDEOS_PREPARE_AHEAD } from '@contents/constants/appSettings.js';
import { AppButton } from '@/components/ui/AppButton';

export interface ChannelCreateVideoConfirmPayload {
  maxVideosPerBatch: number;
  selectedEmail?: string;
}

export interface ChannelCreateVideoDialogProps {
  onClose: () => void;
  onConfirm: (payload: ChannelCreateVideoConfirmPayload) => void | Promise<void>;
  /** Số dòng đã tick checkbox trên bảng index. */
  selectedRowCount: number;
  /** Số dòng đã chọn đủ điều kiện chạy script (ID, EMAIL, LOẠI VIDEO). */
  eligibleQueueLength: number;
  targetChannelFolder?: string;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const MAX_VIDEOS_CAP = 100;

export function ChannelCreateVideoDialog({ onClose, onConfirm, selectedRowCount, eligibleQueueLength, targetChannelFolder }: ChannelCreateVideoDialogProps) {
  const [maxVideosInput, setMaxVideosInput] = useState<number | null>(MAX_VIDEOS_PREPARE_AHEAD);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configEmails, setConfigEmails] = useState<{ email: string; label: string }[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!targetChannelFolder) {
      setConfigEmails([]);
      return;
    }
    window.runner?.readMavidChannelConfig?.(targetChannelFolder).then(cfg => {
      if (mountedRef.current && cfg?.channels && cfg.channels.length > 1) {
        const emails = cfg.channels.map(c => {
          const e = c.email || '';
          const from = c.durationMinuteFrom != null ? c.durationMinuteFrom : '';
          const to = c.durationMinuteTo != null ? c.durationMinuteTo : '∞';
          const dur = from !== '' ? ` (${from} - ${to} phút)` : '';
          return { email: e, label: `${e}${dur}` };
        }).filter(e => e.email.trim() !== '');
        setConfigEmails(emails);
        if (emails.length > 0) setSelectedEmail(emails[0].email);
      }
    }).catch(console.error);
  }, [targetChannelFolder]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const handleConfirm = useCallback(async () => {
    if (eligibleQueueLength < 1) {
      setFormError('Không có kênh đủ điều kiện trong phần đã chọn (cần ID/CHANNEL, EMAIL và LOẠI VIDEO).');
      return;
    }

    const maxVideosPerBatch = maxVideosInput == null ? MAX_SCHEDULED_DAYS : clampInt(maxVideosInput, 1, MAX_VIDEOS_CAP);

    setFormError(null);
    setBusy(true);
    onClose();
    try {
      await onConfirm({ maxVideosPerBatch, selectedEmail: configEmails.length > 1 ? selectedEmail : undefined });
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [eligibleQueueLength, maxVideosInput, onClose, onConfirm, configEmails.length, selectedEmail]);

  const skippedCount = Math.max(0, selectedRowCount - eligibleQueueLength);
  const canSubmit = eligibleQueueLength > 0;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden'
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => !busy && onClose()}
      role='presentation'
    >
      <div
        className='max-w-lg w-full my-8 rounded-2xl p-6 sm:p-8 shadow-xl overflow-visible relative z-1 max-h-[min(90vh,720px)] flex flex-col min-h-0'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby='create-video-dialog-title'
      >
        <h2 id='create-video-dialog-title' className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          Tạo video
        </h2>
        <p className='text-sm leading-snug mt-2 shrink-0' style={{ color: 'var(--text-muted)' }}>
          Tự động tạo video và upload lên YouTube cho các kênh đã chọn trên bảng.
        </p>

        <div className='grid grid-cols-1 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div
            className='rounded-xl px-3 py-2.5 text-sm border'
            style={{ background: 'var(--code-bg)', borderColor: 'var(--border)', color: 'var(--text-h)' }}
          >
            <p>
              Đã chọn <strong>{selectedRowCount}</strong> dòng trên index.
              {eligibleQueueLength > 0 ? (
                <>
                  {' '}
                  Sẽ chạy tạo video cho <strong>{eligibleQueueLength}</strong> kênh đủ điều kiện.
                </>
              ) : (
                <> Chưa có dòng nào đủ điều kiện.</>
              )}
            </p>
            {skippedCount > 0 ? (
              <p className='mt-2' style={{ color: 'var(--text-muted)' }}>
                {skippedCount} dòng được chọn bị bỏ qua (thiếu ID/CHANNEL, EMAIL hoặc LOẠI VIDEO from_audio / reup_full).
              </p>
            ) : null}
          </div>

          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='create-max-videos'>
              Số lượng video tạo (mỗi lượt script)
            </label>
            <input
              id='create-max-videos'
              type='number'
              min={1}
              max={MAX_VIDEOS_CAP}
              value={maxVideosInput ?? ''}
              disabled={busy}
              onChange={e => {
                const v = e.target.value.trim();
                if (v === '') setMaxVideosInput(null);
                else setMaxVideosInput(clampInt(parseInt(v, 10), 1, MAX_VIDEOS_CAP));
              }}
              placeholder={`Mặc định ${MAX_SCHEDULED_DAYS} (để trống)`}
              className='w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150'
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
          </div>

          {configEmails.length > 1 ? (
            <div className='min-w-0 mt-2'>
              <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='create-email'>
                Chọn Email cấu hình
              </label>
              <select
                id='create-email'
                value={selectedEmail}
                disabled={busy}
                onChange={e => setSelectedEmail(e.target.value)}
                className='w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150'
                style={{
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  borderColor: 'var(--border)',
                }}
              >
                {configEmails.map(c => (
                  <option key={c.email} value={c.email}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}


          {formError ? (
            <p className='text-sm' style={{ color: '#fecaca' }}>
              {formError}
            </p>
          ) : null}
        </div>

        <div
          className='flex flex-wrap justify-end gap-2 shrink-0 border-t'
          style={{ marginTop: '16px', paddingTop: '16px', borderColor: 'var(--border)' }}
        >
          <AppButton type='button' variant='neutral' onClick={() => onClose()} disabled={busy}>
            Hủy
          </AppButton>
          <AppButton type='button' variant='primary' onClick={() => void handleConfirm()} disabled={!canSubmit || busy}>
            {busy ? 'Đang chạy…' : 'Xác nhận'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
