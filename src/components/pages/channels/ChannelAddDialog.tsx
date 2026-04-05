import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelRow } from '../../../types';
import { AppButton } from '../../ui/AppButton';
import { CustomSelect } from '../../ui/CustomSelect';
import {
  buildChannelRowFromAddForm,
  channelAddDialogInitialFromIndexRow,
  channelFolderFromRow,
  findIndexHeaderKey,
  INDEX_VIDEO_DURATION_MINUTES,
  INDEX_VIDEO_TYPE_VALUES,
  indexHeadersMissingForAddChannel,
  isValidPublishScheduleTime,
  labelForPublishTimeSlot,
  normalizeWallClockTimeToHHmm,
  parseVideoPerDayCell,
  timeSlotCountForVideoPerDayPreset,
  type ChannelAddDialogInitialFields,
  type VideoPerDayPreset,
} from './channelIndexHelpers';

/** Đọc giờ trực tiếp từ `<input type="time">` lúc submit — tránh state React lệch với DOM (Electron/Chromium). */
function readPublishTimesFromTimeInputs(slotCount: number, fallback: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < slotCount; i++) {
    const el = typeof document !== 'undefined' ? (document.getElementById(`add-time-${i}`) as HTMLInputElement | null) : null;
    const raw = (el?.value ?? fallback[i] ?? '').trim();
    out.push(normalizeWallClockTimeToHHmm(raw));
  }
  return out;
}

const ADD_FORM_DEFAULT: ChannelAddDialogInitialFields = {
  channelUrl: '',
  email: '',
  videoType: 'from_audio',
  durationMinutes: '15',
  selectedBackground: '',
  folderIdOverride: '',
  videosPerDayPreset: '1',
  publishTimes: ['09:00'],
};

const VIDEO_PER_DAY_OPTIONS: { value: VideoPerDayPreset; label: string }[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '1-2', label: '1–2 (2 suất cuối tuần)' },
];

/** Payload gửi tới `addChannelFromForm` (không ghi bảng nháp index). */
export interface ChannelAddSavePayload {
  channelUrl: string;
  email: string;
  videoType: 'from_audio' | 'reup_full';
  durationMinutes: number;
  background: string;
  videosPerDayPreset: VideoPerDayPreset;
  publishTimes: string[];
  folderIdOverride: string;
}

export interface ChannelAddDialogProps {
  indexHeaders: string[];
  backgroundFolders: string[];
  onClose: () => void;
  /** Chế độ sửa: merge `row` và lưu index (trả về Promise nếu ghi file). */
  onAdd?: (row: ChannelRow) => void | Promise<void>;
  /** Chế độ thêm mới: Save → getInfo + thư mục + JSON (không thêm dòng nháp). */
  onSaveNewChannel?: (payload: ChannelAddSavePayload) => Promise<void>;
  /** Khi có — mở form sửa dòng; URL kênh chỉ đọc. */
  initialRow?: ChannelRow | null;
}

export function ChannelAddDialog({
  indexHeaders,
  backgroundFolders,
  onClose,
  onAdd,
  onSaveNewChannel,
  initialRow = null,
}: ChannelAddDialogProps) {
  const isEditMode = initialRow != null;
  const [form, setForm] = useState<ChannelAddDialogInitialFields>(() =>
    initialRow != null ? channelAddDialogInitialFromIndexRow(initialRow, indexHeaders) : ADD_FORM_DEFAULT,
  );
  const { channelUrl, email, videoType, durationMinutes, selectedBackground, folderIdOverride, videosPerDayPreset, publishTimes } = form;

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Chế độ sửa: đã thử đọc `mavid-channel-config.json` trong thư mục kênh (để không ghi đè form bằng fetch muộn). */
  const [configHydrated, setConfigHydrated] = useState(!isEditMode);

  const resolvedBackground = useMemo(() => {
    const pick = selectedBackground.trim();
    if (backgroundFolders.length === 0) return pick;
    if (pick && backgroundFolders.includes(pick)) return pick;
    if (pick) return pick;
    return backgroundFolders[0] ?? '';
  }, [backgroundFolders, selectedBackground]);

  /** Chỉ khi sửa dòng index: cần đủ cột để build row. Thêm mới không cần file index — `addChannelFromForm` tạo/cập nhật index. */
  const missingHeaders = useMemo(
    () => (isEditMode ? indexHeadersMissingForAddChannel(indexHeaders) : []),
    [isEditMode, indexHeaders],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!isEditMode || !initialRow) {
      setConfigHydrated(true);
      return;
    }
    const folder = channelFolderFromRow(initialRow, indexHeaders);
    if (!folder || typeof window.runner?.readMavidChannelConfig !== 'function') {
      setConfigHydrated(true);
      return;
    }
    let cancelled = false;
    setConfigHydrated(false);
    void (async () => {
      try {
        const cfg = await window.runner.readMavidChannelConfig(folder);
        if (cancelled || !cfg || typeof cfg !== 'object') return;
        setForm(prev => {
          const next = { ...prev };
          if (typeof cfg.email === 'string' && cfg.email.trim()) next.email = cfg.email.trim();
          if (cfg.videoType === 'from_audio' || cfg.videoType === 'reup_full') next.videoType = cfg.videoType;
          if (
            typeof cfg.durationMinutes === 'number' &&
            Number.isFinite(cfg.durationMinutes) &&
            (INDEX_VIDEO_DURATION_MINUTES as readonly number[]).includes(cfg.durationMinutes)
          ) {
            next.durationMinutes = String(cfg.durationMinutes);
          }
          if (typeof cfg.background === 'string') next.selectedBackground = cfg.background;
          if (typeof cfg.videosPerDayPreset === 'string' && cfg.videosPerDayPreset.trim()) {
            next.videosPerDayPreset = parseVideoPerDayCell(cfg.videosPerDayPreset);
          }
          if (Array.isArray(cfg.publishTimes) && cfg.publishTimes.length > 0) {
            const preset = next.videosPerDayPreset;
            const slots = timeSlotCountForVideoPerDayPreset(preset);
            let times = cfg.publishTimes.map(t => normalizeWallClockTimeToHHmm(String(t)));
            while (times.length < slots) times.push('09:00');
            times = times.slice(0, slots);
            next.publishTimes = times;
          }
          return next;
        });
      } finally {
        if (!cancelled) setConfigHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, initialRow, indexHeaders]);

  const slotCount = timeSlotCountForVideoPerDayPreset(videosPerDayPreset);

  const setPublishTimeAt = useCallback((index: number, value: string) => {
    const normalized = normalizeWallClockTimeToHHmm(value);
    setForm(f => {
      const next = [...f.publishTimes];
      next[index] = normalized;
      return { ...f, publishTimes: next };
    });
  }, []);

  const videoTypeOptions = [
    { value: 'from_audio', label: 'from_audio' },
    { value: 'reup_full', label: 'reup_full' },
  ];

  const durationMinuteOptions = INDEX_VIDEO_DURATION_MINUTES.map(m => ({
    value: String(m),
    label: `${m} phút`,
  }));

  const backgroundOptions = backgroundFolders.map(bg => ({ value: bg, label: bg }));

  const hasBackgroundColumn = Boolean(findIndexHeaderKey(indexHeaders, 'BACKGROUND'));
  const showBackgroundField = !isEditMode || hasBackgroundColumn;
  const requireBackground = backgroundFolders.length > 0 && (!isEditMode || hasBackgroundColumn);

  const handleConfirm = useCallback(() => {
    void (async () => {
      if (isEditMode && missingHeaders.length > 0) {
        setFormError(`File index thiếu cột: ${missingHeaders.join(', ')}. Cập nhật index.xlsx rồi Tải lại.`);
        return;
      }
      if (!videoType || !INDEX_VIDEO_TYPE_VALUES.includes(videoType as 'from_audio' | 'reup_full')) {
        setFormError('Chọn loại video.');
        return;
      }
      const parsedMinutes = parseInt(durationMinutes, 10);
      const allowedMinutes = INDEX_VIDEO_DURATION_MINUTES as readonly number[];
      if (!Number.isFinite(parsedMinutes) || !allowedMinutes.includes(parsedMinutes)) {
        setFormError('Chọn thời gian video (phút).');
        return;
      }
      if (requireBackground && !resolvedBackground.trim()) {
        setFormError('Chọn background.');
        return;
      }
      const times = readPublishTimesFromTimeInputs(slotCount, publishTimes);
      if (times.length !== slotCount || times.some(t => !t || !isValidPublishScheduleTime(t))) {
        setFormError(
          videosPerDayPreset === '1-2'
            ? 'Chọn đủ 3 giờ (HH:mm): 1 suất ngày thường + 2 suất cuối tuần.'
            : 'Chọn đủ giờ upload (HH:mm) cho từng video trong ngày.',
        );
        return;
      }

      if (isEditMode) {
        if (!onAdd) {
          setFormError('Thiếu handler cập nhật.');
          return;
        }
        if (typeof window.runner?.writeMavidChannelConfig !== 'function') {
          setFormError('Cập nhật file config chỉ dùng trong app Electron.');
          return;
        }
        const { row, error } = buildChannelRowFromAddForm(indexHeaders, {
          channelUrl,
          email,
          videoType: videoType as 'from_audio' | 'reup_full',
          durationMinutes: parsedMinutes,
          background: resolvedBackground.trim(),
          videosPerDayPreset,
          publishTimes: times,
          folderIdOverride,
        });
        if (error) {
          setFormError(error);
          return;
        }
        const folder = channelFolderFromRow(row, indexHeaders);
        if (!folder?.trim()) {
          setFormError('Không xác định được thư mục kênh (cột ID hoặc CHANNEL).');
          return;
        }
        setSaving(true);
        setFormError(null);
        try {
          await onAdd(row);
          await window.runner.writeMavidChannelConfig({
            channelFolder: folder.trim(),
            patch: {
              email: email.trim(),
              videoType: videoType as 'from_audio' | 'reup_full',
              durationMinutes: parsedMinutes,
              background: resolvedBackground.trim(),
              videosPerDayPreset,
              publishTimes: times,
            },
          });
          onClose();
        } catch (e) {
          setFormError(e instanceof Error ? e.message : 'Không cập nhật được index hoặc mavid-channel-config.json.');
        } finally {
          setSaving(false);
        }
        return;
      }

      if (!onSaveNewChannel) {
        setFormError('Thiếu handler lưu kênh.');
        return;
      }
      if (!window.runner?.listRegisteredChannelEmails || !window.runner?.runScript) {
        setFormError('Lưu kênh chỉ dùng trong app Electron.');
        return;
      }

      setSaving(true);
      setFormError(null);
      try {
        const registered = await window.runner.listRegisteredChannelEmails();
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
          setFormError('Nhập email tạo kênh.');
          return;
        }
        if (registered.includes(normalizedEmail)) {
          setFormError('Email đã được dùng cho kênh khác (index hoặc file trong thư mục kênh). Chọn email khác.');
          return;
        }

        await onSaveNewChannel({
          channelUrl,
          email: email.trim(),
          videoType: videoType as 'from_audio' | 'reup_full',
          durationMinutes: parsedMinutes,
          background: resolvedBackground.trim(),
          videosPerDayPreset,
          publishTimes: times,
          folderIdOverride,
        });
        onClose();
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Không lưu được kênh.');
      } finally {
        setSaving(false);
      }
    })();
  }, [
    channelUrl,
    durationMinutes,
    email,
    folderIdOverride,
    requireBackground,
    indexHeaders,
    isEditMode,
    missingHeaders,
    onAdd,
    onClose,
    onSaveNewChannel,
    publishTimes,
    resolvedBackground,
    slotCount,
    videoType,
    videosPerDayPreset,
  ]);

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-base outline-none border transition-colors duration-150';

  const titleId = isEditMode ? 'channel-edit-title' : 'channel-add-title';

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden'
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => onClose()}
      role='presentation'
    >
      <div
        className='max-w-4xl w-full my-8 rounded-2xl p-6 sm:p-8 shadow-xl overflow-visible relative z-1 max-h-[min(90vh,760px)] flex flex-col min-h-0'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          {isEditMode ? 'Sửa channel' : 'Thêm channel'}
        </h2>
        <p className='text-sm leading-snug mt-2 shrink-0' style={{ color: 'var(--text-muted)' }}>
          {isEditMode
            ? 'Khi mở: đọc `MaVidMedia/channels/<ID>/mavid-channel-config.json` để điền form. «Cập nhật»: ghi `index.xlsx` rồi cập nhật JSON. URL kênh chỉ đọc.'
            : 'Save: kiểm tra email trùng, gọi addChannelFromForm — tạo thư mục kênh, Excel kênh, mavid-channel-config.json và tạo/cập nhật MaVidMedia/channels/index.xlsx (không cần có sẵn file index).'}
        </p>

        {isEditMode && missingHeaders.length > 0 ? (
          <p className='text-sm mt-3 shrink-0' style={{ color: '#fecaca' }}>
            Thiếu cột trong index: {missingHeaders.join(', ')}. Thêm vào <code className='text-xs'>MaVidMedia/channels/index.xlsx</code> rồi Tải lại.
          </p>
        ) : null}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }} htmlFor='add-channel-url'>
              URL kênh
            </label>
            <input
              id='add-channel-url'
              type='url'
              inputMode='url'
              autoComplete='off'
              placeholder='https://www.youtube.com/@handler'
              value={channelUrl}
              onChange={e => !isEditMode && setForm(f => ({ ...f, channelUrl: e.target.value }))}
              readOnly={isEditMode}
              tabIndex={isEditMode ? -1 : undefined}
              aria-readonly={isEditMode || undefined}
              title={isEditMode ? channelUrl : undefined}
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: isEditMode ? 'var(--text-muted)' : 'var(--text-h)',
                borderColor: 'var(--border)',
                cursor: isEditMode ? 'default' : undefined,
              }}
            />
          </div>

          <div className='min-w-0'>
            <label className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }} htmlFor='add-email'>
              Email tạo kênh
            </label>
            <input
              id='add-email'
              type='email'
              autoComplete='off'
              value={email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
          </div>

          <div className='min-w-0'>
            <div className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }}>
              Loại video
            </div>
            <CustomSelect
              value={videoType}
              options={videoTypeOptions}
              onChange={v => setForm(f => ({ ...f, videoType: v }))}
              placeholder='Chọn loại'
              menuZIndex={100}
            />
          </div>

          <div className='min-w-0'>
            <div className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }}>
              Tạo video với thời gian từ (thời lượng)
            </div>
            <CustomSelect
              value={durationMinutes}
              options={durationMinuteOptions}
              onChange={v => setForm(f => ({ ...f, durationMinutes: v }))}
              placeholder='Phút'
              menuZIndex={100}
            />
          </div>

          {showBackgroundField ? (
            <div className='min-w-0'>
              <div className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }}>
                Background
              </div>
              {backgroundFolders.length === 0 ? (
                <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                  Chưa có thư mục stock trong MaVidMedia/backgrounds (Settings → lưu trữ video).
                </p>
              ) : (
                <CustomSelect
                  value={resolvedBackground}
                  options={backgroundOptions}
                  onChange={v => setForm(f => ({ ...f, selectedBackground: v }))}
                  placeholder='Chọn background'
                  menuZIndex={100}
                />
              )}
            </div>
          ) : null}

          <div className='min-w-0'>
            <div className='block text-sm font-medium mb-1.5' style={{ color: 'var(--text-h)' }}>
              Số lượng video upload mỗi ngày
            </div>
            <CustomSelect
              value={videosPerDayPreset}
              options={VIDEO_PER_DAY_OPTIONS}
              onChange={v => {
                const preset = v as VideoPerDayPreset;
                const nextSlots = timeSlotCountForVideoPerDayPreset(preset);
                setForm(f => {
                  let nextTimes = [...f.publishTimes];
                  while (nextTimes.length < nextSlots) nextTimes.push('09:00');
                  nextTimes = nextTimes.slice(0, nextSlots);
                  return { ...f, videosPerDayPreset: preset, publishTimes: nextTimes };
                });
              }}
              placeholder='Chọn lịch'
              menuZIndex={100}
            />
          </div>

          <div className='md:col-span-2 min-w-0 space-y-3'>
            <div className='text-sm font-medium' style={{ color: 'var(--text-h)' }}>
              Giờ upload
              {videosPerDayPreset === '1-2' ? ' — 1 suất ngày thường + 2 suất cuối tuần' : ` (${slotCount} suất/ngày)`}
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3'>
              {publishTimes.slice(0, slotCount).map((t, i) => (
                <div key={i} className='flex flex-col gap-1.5 min-w-0'>
                  <label className='text-sm' style={{ color: 'var(--text-muted)' }} htmlFor={`add-time-${i}`}>
                    {labelForPublishTimeSlot(videosPerDayPreset, i)}
                  </label>
                  <input
                    id={`add-time-${i}`}
                    type='time'
                    value={t}
                    onChange={e => setPublishTimeAt(i, e.target.value)}
                    className={inputClass}
                    style={{
                      background: 'var(--code-bg)',
                      color: 'var(--text-h)',
                      borderColor: 'var(--border)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {formError ? (
            <p className='md:col-span-2 text-sm' style={{ color: '#fecaca' }}>
              {formError}
            </p>
          ) : null}
        </div>

        <div className='flex flex-wrap justify-end gap-2 mt-6 pt-4 shrink-0 border-t' style={{ borderColor: 'var(--border)' }}>
          <AppButton type='button' variant='neutral' onClick={() => onClose()}>
            Hủy
          </AppButton>
          <AppButton
            type='button'
            variant='primary'
            onClick={handleConfirm}
            disabled={(isEditMode && missingHeaders.length > 0) || saving || (isEditMode && !configHydrated)}
          >
            {saving ? 'Đang xử lý…' : isEditMode ? 'Cập nhật' : 'Save'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
