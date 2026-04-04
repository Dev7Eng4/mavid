import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelRow } from '../../../types';
import { CustomSelect } from '../../ui/CustomSelect';
import { findIndexHeaderKey, INDEX_THOI_GIAN_MINUTES, INDEX_VIDEO_TYPE_VALUES } from './channelIndexHelpers';

export interface ChannelIndexEditDialogProps {
  /** Dòng đang sửa (cha chỉ mount dialog khi có dòng hợp lệ; `key` trên component reset form khi đổi dòng). */
  initialRow: ChannelRow;
  indexHeaders: string[];
  backgroundFolders: string[];
  onClose: () => void;
  /** Gộp vào dòng index (bảng nháp); component gọi onClose sau khi bấm Cập nhật. */
  onApply: (mergedRow: ChannelRow) => void;
}

export function ChannelIndexEditDialog({ initialRow, indexHeaders, backgroundFolders, onClose, onApply }: ChannelIndexEditDialogProps) {
  const [form, setForm] = useState<ChannelRow>(() => ({ ...initialRow }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const keys = useMemo(
    () => ({
      link: findIndexHeaderKey(indexHeaders, 'LINK'),
      email: findIndexHeaderKey(indexHeaders, 'EMAIL'),
      loaiVideo: findIndexHeaderKey(indexHeaders, 'LOẠI VIDEO'),
      thoiGian: findIndexHeaderKey(indexHeaders, 'THỜI GIAN VIDEO'),
      background: findIndexHeaderKey(indexHeaders, 'BACKGROUND'),
    }),
    [indexHeaders],
  );

  const loaiOptions = useMemo(() => [{ value: '', label: '—' }, ...INDEX_VIDEO_TYPE_VALUES.map(v => ({ value: v, label: v }))], []);

  const thoiGianOptions = useMemo(
    () => [{ value: '', label: '—' }, ...INDEX_THOI_GIAN_MINUTES.map(m => ({ value: String(m), label: `${m} phút` }))],
    [],
  );

  const backgroundOptions = useMemo(
    () => [{ value: '', label: '—' }, ...backgroundFolders.map(bg => ({ value: bg, label: bg }))],
    [backgroundFolders],
  );

  const handleApply = useCallback(() => {
    onApply(form);
    onClose();
  }, [form, onApply, onClose]);

  const hasAnyField = keys.email || keys.loaiVideo || keys.thoiGian || keys.background;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden'
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => onClose()}
      role='presentation'
    >
      <div
        className='max-w-md w-full my-8 rounded-2xl p-6 shadow-xl overflow-visible relative z-1'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby='index-edit-title'
      >
        <h2 id='index-edit-title' className='text-lg font-semibold' style={{ color: 'var(--text-h)' }}>
          Sửa kênh
        </h2>

        <p className='text-[10px] leading-snug' style={{ color: 'var(--text-muted)' }}>
          Cập nhật chỉ ghi vào bảng nháp; bấm &quot;Lưu index&quot; phía trên để ghi file Excel.
        </p>

        <div className='space-y-4 mt-2'>
          {keys.link ? (
            <div>
              <label
                className='block text-[11px] font-medium uppercase tracking-wider mb-2'
                style={{ color: 'var(--text-muted)' }}
                htmlFor='idx-edit-channel-link'
              >
                Link kênh
              </label>
              <input
                id='idx-edit-channel-link'
                type='text'
                readOnly
                tabIndex={-1}
                aria-readonly
                title={String(form[keys.link] ?? '')}
                value={String(form[keys.link] ?? '')}
                className='w-full rounded-xl px-3 py-2.5 text-sm outline-none cursor-default min-w-0'
                style={{
                  background: 'var(--code-bg)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          ) : null}
          {keys.email ? (
            <div>
              <label
                className='block text-[11px] font-medium uppercase tracking-wider mb-2'
                style={{ color: 'var(--text-muted)' }}
                htmlFor='idx-edit-email'
              >
                Email
              </label>
              <input
                id='idx-edit-email'
                type='text'
                autoComplete='off'
                value={String(form[keys.email] ?? '')}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    [keys.email!]: e.target.value,
                  }))
                }
                className='w-full rounded-xl px-3 py-2.5 text-sm outline-none'
                style={{
                  background: 'var(--code-bg)',
                  color: 'var(--text-h)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          ) : null}
          {keys.loaiVideo ? (
            <div>
              <div className='block text-[11px] font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                Loại video
              </div>
              <CustomSelect
                value={String(form[keys.loaiVideo] ?? '')}
                options={loaiOptions}
                onChange={v =>
                  setForm(prev => ({
                    ...prev,
                    [keys.loaiVideo!]: v,
                  }))
                }
                placeholder='Chọn loại video'
                menuZIndex={100}
              />
            </div>
          ) : null}
          {keys.thoiGian ? (
            <div>
              <div className='block text-[11px] font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                Thời gian video (phút)
              </div>
              <CustomSelect
                value={(() => {
                  const raw = form[keys.thoiGian!];
                  return raw != null && raw !== '' && Number.isFinite(Number(raw)) ? String(Number(raw)) : '';
                })()}
                options={thoiGianOptions}
                onChange={v =>
                  setForm(prev => ({
                    ...prev,
                    [keys.thoiGian!]: v === '' ? '' : Number(v),
                  }))
                }
                placeholder='Chọn thời lượng'
                menuZIndex={100}
              />
            </div>
          ) : null}
          {keys.background ? (
            <div>
              <div className='block text-[11px] font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                Background
              </div>
              <CustomSelect
                value={String(form[keys.background] ?? '')}
                options={backgroundOptions}
                onChange={v =>
                  setForm(prev => ({
                    ...prev,
                    [keys.background!]: v,
                  }))
                }
                placeholder='Chọn background'
                emptyText='Chưa có thư mục trong assets/backgrounds'
                menuZIndex={100}
              />
            </div>
          ) : null}
          {!hasAnyField ? (
            <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
              File index không có cột EMAIL / LOẠI VIDEO / THỜI GIAN VIDEO / BACKGROUND để sửa.
            </p>
          ) : null}
        </div>

        <div className='flex flex-wrap justify-end gap-2 mt-6'>
          <button
            type='button'
            onClick={() => onClose()}
            className='text-sm font-medium rounded-xl px-4 py-2 cursor-pointer'
            style={{
              color: 'var(--text)',
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
            }}
          >
            Hủy
          </button>
          <button
            type='button'
            onClick={() => handleApply()}
            className='text-sm font-medium rounded-xl px-4 py-2 cursor-pointer'
            style={{
              color: '#fff',
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}
