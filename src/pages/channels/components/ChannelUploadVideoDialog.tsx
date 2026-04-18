import { useCallback, useEffect, useState } from 'react';
import { fetchAllGpmProfileRows, resolveGpmProfileIdByEmail } from '../utils/gpmProfileHelpers';
import { AppButton } from '@/components/ui/AppButton';

export interface ChannelUploadVideoPayload {
  /** Một kênh cụ thể (thư mục MaVidMedia/channels/…). */
  channelFolder: string;
  /** Email kênh (index / config) — script upload dùng để lấy lịch publish. */
  email: string;
  /** `null` = mọi thư mục con đủ .mp4 + thumbnail ảnh (theo thứ tự từ Excel khi không truyền uploadFolderNames). */
  totalVideos: number | null;
  /** GPM profile id — suy ra từ email trong mavid-channel-config.json khớp `name` profile. */
  gpmProfileId: string;
  /** Chỉ upload các thư mục con (tên = video ID YouTube), đúng thứ tự — dùng từ màn chi tiết kênh. */
  uploadFolderNames?: string[];
}

export interface ChannelItem {
  folder: string;
  emails: string[];
}

export interface ChannelUploadVideoDialogProps {
  /** Kênh đủ điều kiện trong phần đã chọn (ID + EMAIL). */
  channels: ChannelItem[];
  /** Số dòng đã tick trên bảng. */
  selectedRowCount: number;
  /** Số luồng upload đang chạy nền (từ parent). */
  activeBackgroundUploadThreads?: number;
  onClose: () => void;
  /** Gọi khi đã có payloads hợp lệ; parent tự chạy upload nền (không cần await). */
  onConfirm: (payloads: ChannelUploadVideoPayload[]) => void;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function ChannelUploadVideoDialog({
  channels,
  selectedRowCount,
  activeBackgroundUploadThreads = 0,
  onClose,
  onConfirm,
}: ChannelUploadVideoDialogProps) {
  const [totalVideos, setTotalVideos] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const eligibleCount = channels.length;
  const skippedCount = Math.max(0, selectedRowCount - eligibleCount);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (channels.length === 0) {
      setFormError('Không có kênh đủ điều kiện trong phần đã chọn (cần ID/CHANNEL và EMAIL trong index).');
      return;
    }

    const total = totalVideos == null ? null : clampInt(totalVideos, 1, 99_999);
    setFormError(null);
    try {
      const profiles = await fetchAllGpmProfileRows();
      const payloads: ChannelUploadVideoPayload[] = [];

      for (const ch of channels) {
        const email = ch.emails[0];
        if (!email) continue;
        const gpmProfileId = resolveGpmProfileIdByEmail(profiles, email);
        if (!gpmProfileId) {
          setFormError(`Kênh ${ch.folder}: Không tìm thấy profile GPM có trường name trùng email «${email}».`);
          return;
        }
        payloads.push({ channelFolder: ch.folder, email, totalVideos: total, gpmProfileId });
      }

      if (payloads.length === 0) {
        setFormError('Không có kênh nào có email hợp lệ.');
        return;
      }

      if (typeof window.runner?.minimizeApp === 'function') {
        window.runner.minimizeApp();
      }
      onConfirm(payloads);
      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không chạy được upload.');
    }
  }, [channels, onClose, onConfirm, totalVideos]);

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150';

  const canSubmit = eligibleCount > 0;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden'
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => onClose()}
      role='presentation'
    >
      <div
        className='max-w-lg w-full my-8 rounded-2xl p-6 sm:p-8 shadow-xl overflow-visible relative z-1 max-h-[min(90vh,720px)] flex flex-col min-h-0'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby='upload-video-dialog-title'
      >
        <h2 id='upload-video-dialog-title' className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          Upload video
        </h2>
        <p className='text-sm leading-snug mt-2 shrink-0' style={{ color: 'var(--text-muted)' }}>
          Profile GPM được chọn theo <code className='text-xs'>name</code> = email (từ index). Upload lần lượt các thư mục con có .mp4{' '}
          <strong>và</strong> có ít nhất một ảnh thumbnail (.png, .jpg, .jpeg) — thư mục thiếu thumbnail sẽ bị bỏ qua.
        </p>

        <div className='grid grid-cols-1 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div
            className='rounded-xl px-3 py-2.5 text-sm border'
            style={{ background: 'var(--code-bg)', borderColor: 'var(--border)', color: 'var(--text-h)' }}
          >
            <p>
              Đã chọn <strong>{selectedRowCount}</strong> dòng trên index.
              {eligibleCount > 0 ? (
                <>
                  {' '}
                  Sẽ upload cho <strong>{eligibleCount}</strong> kênh có ID và EMAIL.
                </>
              ) : (
                <> Chưa có kênh đủ điều kiện.</>
              )}
            </p>
            {skippedCount > 0 ? (
              <p className='mt-2' style={{ color: 'var(--text-muted)' }}>
                {skippedCount} dòng bị bỏ qua (thiếu ID/CHANNEL hoặc EMAIL).
              </p>
            ) : null}
          </div>

          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }} htmlFor='upload-total-videos'>
              Số lượng video upload
            </label>
            <input
              id='upload-total-videos'
              type='number'
              min={1}
              max={99999}
              value={totalVideos ?? ''}
              onChange={e => {
                const v = e.target.value.trim();
                if (v === '') setTotalVideos(null);
                else setTotalVideos(clampInt(parseInt(v, 10), 1, 99_999));
              }}
              placeholder='Tất cả thư mục có .mp4 + thumbnail'
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
            <p className='text-xs mt-1.5' style={{ color: 'var(--text-muted)' }}>
              Để trống = lần lượt mọi thư mục con đủ .mp4 và thumbnail ảnh, theo thứ tự từ Excel (status Đã tạo video).
            </p>
          </div>

          {formError ? (
            <p className='text-sm' style={{ color: '#fecaca' }}>
              {formError}
            </p>
          ) : null}

          {activeBackgroundUploadThreads > 0 ? (
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
              Đang chạy nền: <strong style={{ color: 'var(--text-h)' }}>{activeBackgroundUploadThreads}</strong> luồng upload (mỗi email một
              profile GPM riêng). Có thể bấm Xác nhận thêm; email đang bận sẽ bị bỏ qua cho đến khi xong.
            </p>
          ) : null}
        </div>

        <div className='flex flex-wrap justify-end gap-2 mt-6 pt-4 shrink-0 border-t' style={{ borderColor: 'var(--border)' }}>
          <AppButton type='button' variant='neutral' onClick={() => onClose()}>
            Hủy
          </AppButton>
          <AppButton type='button' variant='primary' onClick={() => void handleConfirm()} disabled={!canSubmit}>
            Xác nhận
          </AppButton>
        </div>
      </div>
    </div>
  );
}
