import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GpmProfileRow } from '@/types';
import { gpmApi } from '@/services';
import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect, type SelectOption } from '@/components/ui/CustomSelect';

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function mapGpmApiProfileRow(row: unknown): GpmProfileRow | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  return {
    id: pickStr(o, ['id', 'Id', 'ID']),
    name: pickStr(o, ['name', 'Name']),
    profilePath: pickStr(o, ['profile_path', 'ProfilePath', 'profilePath']),
  };
}

/** Response list profiles GPM (có pagination ở root). */
type GpmListProfilesEnvelope = {
  data?: unknown;
  pagination?: { total_page?: number; page?: number; page_size?: number; total?: number };
};

async function fetchAllGpmProfileRows(): Promise<GpmProfileRow[]> {
  const rows: GpmProfileRow[] = [];
  let page = 1;
  let totalPage = 1;
  const perPage = 100;
  do {
    const res = await gpmApi.listProfiles({ page, per_page: perPage });
    const env = res as unknown as GpmListProfilesEnvelope;
    const list = Array.isArray(env.data) ? env.data : [];
    for (const item of list) {
      const m = mapGpmApiProfileRow(item);
      if (m?.id?.trim()) rows.push(m);
    }
    const tp = env.pagination?.total_page;
    totalPage = tp != null && Number.isFinite(Number(tp)) && Number(tp) >= 1 ? Math.floor(Number(tp)) : 1;
    page += 1;
  } while (page <= totalPage);
  return rows;
}

function resolveGpmProfileIdByEmail(profiles: GpmProfileRow[], email: string): string | null {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;
  const hit = profiles.find(p => p.name.trim().toLowerCase() === norm);
  return hit?.id?.trim() || null;
}

export interface ChannelUploadVideoPayload {
  /** Một kênh cụ thể (thư mục MaVidMedia/channels/…). */
  channelFolder: string;
  /** Email kênh (index / config) — script upload dùng để lấy lịch publish. */
  email: string;
  /** `null` = mọi thư mục con có .mp4 (theo thứ tự tên). */
  totalVideos: number | null;
  /** GPM profile id — suy ra từ email trong mavid-channel-config.json khớp `name` profile. */
  gpmProfileId: string;
}

export interface ChannelItem {
  folder: string;
  emails: string[];
}

export interface ChannelUploadVideoDialogProps {
  /** Danh sách kênh đủ điều kiện (có email trong index). */
  channels: ChannelItem[];
  onClose: () => void;
  onConfirm: (payloads: ChannelUploadVideoPayload[]) => void | Promise<void>;
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function ChannelUploadVideoDialog({ channels, onClose, onConfirm }: ChannelUploadVideoDialogProps) {
  const [folderPick, setFolderPick] = useState<string>('');
  const [emailPick, setEmailPick] = useState<string>('');
  const [totalVideos, setTotalVideos] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (channels.length > 0 && !folderPick) {
      setFolderPick(channels.length > 1 ? '__all__' : channels[0].folder);
    } else if (folderPick && folderPick !== '__all__' && !channels.some(c => c.folder === folderPick)) {
      setFolderPick(channels.length > 1 ? '__all__' : channels[0]?.folder || '');
    }
  }, [channels, folderPick]);

  const channelOptions = useMemo<SelectOption[]>(() => {
    const opts = channels.map(c => ({ value: c.folder, label: c.folder }));
    if (channels.length > 1) {
      opts.unshift({ value: '__all__', label: 'Tất cả kênh' });
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
      setFormError('Không có kênh đủ điều kiện: cần cột ID/CHANNEL và EMAIL có giá trị trong index.');
      return;
    }
    if (!folderPick || (folderPick !== '__all__' && !channels.some(c => c.folder === folderPick))) {
      setFormError('Chọn một kênh.');
      return;
    }

    const total = totalVideos == null ? null : clampInt(totalVideos, 1, 5);
    setFormError(null);
    setBusy(true);
    try {
      const profiles = await fetchAllGpmProfileRows();
      const payloads: ChannelUploadVideoPayload[] = [];

      if (folderPick === '__all__') {
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
      } else {
        const email = emailPick.trim();
        if (!email) {
          setFormError('Vui lòng chọn email (thêm email vào index nếu chưa có).');
          return;
        }
        const gpmProfileId = resolveGpmProfileIdByEmail(profiles, email);
        if (!gpmProfileId) {
          setFormError(`Không tìm thấy profile GPM có trường name trùng email «${email}». Trong GPM hãy đặt tên profile = email.`);
          return;
        }
        payloads.push({ channelFolder: folderPick, email, totalVideos: total, gpmProfileId });
      }

      if (typeof window.runner?.minimizeApp === 'function') {
        window.runner.minimizeApp();
      }
      await onConfirm(payloads);

      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Không chạy được upload.');
    } finally {
      setBusy(false);
    }
  }, [channels, folderPick, emailPick, onClose, onConfirm, totalVideos]);

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150';

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
        aria-labelledby='upload-video-dialog-title'
      >
        <h2 id='upload-video-dialog-title' className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          Upload video
        </h2>
        <p className='text-sm leading-snug mt-2 shrink-0' style={{ color: 'var(--text-muted)' }}>
          Profile GPM được chọn tự động theo <code className='text-xs'>email</code> của kênh trong{' '}
          <code className='text-xs'>index.xlsx</code>. Hệ thống sẽ tìm trong API <code className='text-xs'>listProfiles</code> dòng có{' '}
          <code className='text-xs'>name</code> trùng email (bạn cần cấu hình tên profile = email trong GPM). Sau đó mở YouTube và upload
          từng .mp4 trong các thư mục con của kênh (sắp xếp theo tên). Để trống «Số lượng» = tất cả thư mục có .mp4.
        </p>

        <div className='grid grid-cols-1 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div className='min-w-0'>
            <div className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }}>
              Kênh
            </div>
            {noChannels ? (
              <p className='text-sm' style={{ color: '#fecaca' }}>
                Không có kênh nào có email trong index (cần cột ID/CHANNEL và EMAIL).
              </p>
            ) : (
              <CustomSelect value={folderPick} options={channelOptions} onChange={setFolderPick} placeholder='Chọn kênh' menuZIndex={110} />
            )}
          </div>

          <div className='min-w-0'>
            <div className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }}>
              Email tải lên
            </div>
            {folderPick === '__all__' ? (
              <div
                className='w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150 cursor-not-allowed opacity-80'
                style={{ background: 'var(--code-bg)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                Tự động dùng email đầu tiên của từng kênh
              </div>
            ) : emailOptions.length === 0 ? (
              <p className='text-sm' style={{ color: '#fecaca' }}>
                Kênh này chưa có email trong index.
              </p>
            ) : (
              <CustomSelect value={emailPick} options={emailOptions} onChange={setEmailPick} placeholder='Chọn email' menuZIndex={100} />
            )}
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
              disabled={busy}
              onChange={e => {
                const v = e.target.value.trim();
                if (v === '') setTotalVideos(null);
                else setTotalVideos(clampInt(parseInt(v, 10), 1, 99_999));
              }}
              placeholder='Tất cả thư mục có .mp4'
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
            <p className='text-xs mt-1.5' style={{ color: 'var(--text-muted)' }}>
              Để trống = lần lượt mọi thư mục con (có .mp4), theo thứ tự tên.
            </p>
          </div>

          {formError ? (
            <p className='text-sm' style={{ color: '#fecaca' }}>
              {formError}
            </p>
          ) : null}
        </div>

        <div className='flex flex-wrap justify-end gap-2 mt-6 pt-4 shrink-0 border-t' style={{ borderColor: 'var(--border)' }}>
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
