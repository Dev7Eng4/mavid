import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_SCHEDULED_VIDEOS, MAX_VIDEOS_PREPARE_AHEAD } from '@contents/constants/appSettings.js';
import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect, type SelectOption } from '@/components/ui/CustomSelect';

export interface ChannelCreateVideoItem {
  folder: string;
  emails: string[];
  /** Hiển thị loại video từ index (vd. from_audio, reup_full). */
  videoTypesLabel: string;
}

export interface ChannelCreateVideoConfirmPayload {
  folderPick: '__all__' | string;
  /** Khi chọn một kênh: email đã chọn; với «Tất cả kênh» = null (không lọc theo email). */
  emailForSingleChannel: string | null;
  /** Giới hạn số video mỗi lần chạy script (MAVID_MAX_VIDEOS_PER_BATCH), 1..100. */
  maxVideosPerBatch: number;
}

export interface ChannelCreateVideoDialogProps {
  channels: ChannelCreateVideoItem[];
  onClose: () => void;
  onConfirm: (payload: ChannelCreateVideoConfirmPayload) => void | Promise<void>;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const MAX_VIDEOS_CAP = 100;

export function ChannelCreateVideoDialog({ channels, onClose, onConfirm }: ChannelCreateVideoDialogProps) {
  const [folderPick, setFolderPick] = useState<string>('');
  const [emailPick, setEmailPick] = useState<string>('');
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
    if (channels.length > 0 && !folderPick) {
      setFolderPick(channels.length > 1 ? '__all__' : channels[0].folder);
    } else if (folderPick && folderPick !== '__all__' && !channels.some(c => c.folder === folderPick)) {
      setFolderPick(channels.length > 1 ? '__all__' : channels[0]?.folder || '');
    }
  }, [channels, folderPick]);

  const channelOptions = useMemo<SelectOption[]>(() => {
    const opts = channels.map(c => ({
      value: c.folder,
      label: c.folder,
    }));
    if (channels.length >= 1) {
      opts.unshift({ value: '__all__', label: 'Tất cả kênh đủ điều kiện' });
    }
    return opts;
  }, [channels]);

  const activeChannel = useMemo(() => channels.find(c => c.folder === folderPick), [channels, folderPick]);

  const emailOptions = useMemo<SelectOption[]>(() => {
    if (!activeChannel) return [];
    return activeChannel.emails.map(e => ({ value: e, label: e }));
  }, [activeChannel]);

  useEffect(() => {
    if (emailOptions.length > 0) {
      if (!emailPick || !emailOptions.some(o => o.value === emailPick)) {
        setEmailPick(emailOptions[0].value);
      }
    } else {
      setEmailPick('');
    }
  }, [emailOptions, emailPick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const handleConfirm = useCallback(async () => {
    if (channels.length === 0) {
      setFormError('Không có kênh đủ điều kiện: cần ID/CHANNEL, EMAIL và LOẠI VIDEO (from_audio hoặc reup_full).');
      return;
    }
    if (!folderPick || (folderPick !== '__all__' && !channels.some(c => c.folder === folderPick))) {
      setFormError('Chọn một kênh.');
      return;
    }
    if (folderPick !== '__all__') {
      const email = emailPick.trim();
      if (!email) {
        setFormError('Vui lòng chọn email (thêm email vào index nếu chưa có).');
        return;
      }
    }

    const maxVideosPerBatch =
      maxVideosInput == null ? MAX_SCHEDULED_VIDEOS : clampInt(maxVideosInput, 1, MAX_VIDEOS_CAP);

    setFormError(null);
    setBusy(true);
    const payload: ChannelCreateVideoConfirmPayload = {
      folderPick: folderPick as '__all__' | string,
      emailForSingleChannel: folderPick === '__all__' ? null : emailPick.trim(),
      maxVideosPerBatch,
    };
    onClose();
    try {
      await onConfirm(payload);
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [channels, folderPick, emailPick, maxVideosInput, onClose, onConfirm]);

  const noChannels = channels.length === 0;
  const canSubmit = !noChannels;

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
          Tự động tạo video và upload lên YouTube
        </p>

        <div className='grid grid-cols-1 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div className='min-w-0 mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Kênh
            </div>
            {noChannels ? (
              <p className='text-sm' style={{ color: '#fecaca' }}>
                Không có kênh đủ điều kiện trong bảng index hiện tại.
              </p>
            ) : (
              <CustomSelect value={folderPick} options={channelOptions} onChange={setFolderPick} placeholder='Chọn kênh' menuZIndex={110} />
            )}
          </div>

          <div className='min-w-0 mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Email
            </div>
            {folderPick === '__all__' ? (
              <div
                className='w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150 cursor-not-allowed opacity-80'
                style={{ background: 'var(--code-bg)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                Tự động dùng email của kênh đã chọn
              </div>
            ) : emailOptions.length === 0 ? (
              <p className='text-sm' style={{ color: '#fecaca' }}>
                Kênh này chưa có email trong các dòng index đủ điều kiện.
              </p>
            ) : (
              <CustomSelect value={emailPick} options={emailOptions} onChange={setEmailPick} placeholder='Chọn email' menuZIndex={100} />
            )}
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
              placeholder={`Mặc định ${MAX_SCHEDULED_VIDEOS} (để trống)`}
              className='w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150'
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
          </div>

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
