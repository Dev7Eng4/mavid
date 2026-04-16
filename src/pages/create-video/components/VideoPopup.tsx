import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_SCHEDULED_DAYS, MAX_VIDEOS_PREPARE_AHEAD } from '@contents/constants/appSettings.js';
import { AppButton } from '@/components/ui/AppButton';

export interface Props {
  type: 'make' | 'upload';
  onClose: () => void;
  onConfirm: (payload: number) => void;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const MAX_VIDEOS_CAP = 100;

export function VideoPopup({ type, onClose, onConfirm }: Props) {
  const [maxVideosInput, setMaxVideosInput] = useState<number | null>(MAX_VIDEOS_PREPARE_AHEAD);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const handleConfirm = useCallback(async () => {
    setFormError(null);
    setBusy(true);
    onClose();
    try {
      await onConfirm(maxVideosInput ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [maxVideosInput, onClose, onConfirm]);

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
          {type === 'make' ? 'Tạo video' : 'Upload video'}
        </h2>
        <p className='text-sm leading-snug mt-2 shrink-0' style={{ color: 'var(--text-muted)' }}>
          Tự động tạo video và upload lên YouTube cho các kênh đã chọn trên bảng.
        </p>

        <div className='grid grid-cols-1 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='create-max-videos'>
              Số lượng video
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
        </div>

        <div
          className='flex flex-wrap justify-end gap-2 shrink-0 border-t'
          style={{ marginTop: '16px', paddingTop: '16px', borderColor: 'var(--border)' }}
        >
          <AppButton type='button' variant='neutral' onClick={() => onClose()} disabled={busy}>
            Hủy
          </AppButton>
          <AppButton type='button' variant='primary' onClick={() => void handleConfirm()} disabled={busy}>
            Xác nhận
          </AppButton>
        </div>
      </div>
    </div>
  );
}
