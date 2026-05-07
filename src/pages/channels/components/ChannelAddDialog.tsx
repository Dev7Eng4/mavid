import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import type { BackgroundOption, ChannelRow, Group } from '@/types';
import { OPTIONS_CONTENT } from '@contents/makeFromAudio/constant.js';
import { PROMPTS_CREATE_THUMBNAIL_OPTIONS } from '@contents/prompts/index.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VIDEO_PER_DAY_OPTIONS } from '../constants';
import {
  CHANNEL_ADD_DURATION_SELECT_OPTIONS,
  defaultReupOverlayName,
  defaultThumbnailPrompt,
  isValidReupOverlayName,
  isValidthumbnailPrompt,
  labelForPublishTimeSlot,
  normalizeChannelIndexStatus,
  normalizeWallClockTimeToHHmm,
  reupOverlaySelectOptions,
  timeSlotCountForVideoPerDayPreset,
  type ChannelAddDialogInitialFields,
  type VideoPerDayPreset,
} from '../utils/channelIndexHelpers';

const videoTypeOptions = [
  { value: 'reup_full', label: 'Tạo video reup toàn bộ' },
  { value: 'from_audio', label: 'Tạo video từ audio' },
];

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
  id: '',
  channelName: '',
  channelId: '',
  channelLink: '',
  email: '',
  myChannel: '',
  group: '',
  videoType: 'reup_full',
  durationMinutes: '0_null',
  background: '',
  overlay: defaultReupOverlayName(),
  thumbnailPrompt: defaultThumbnailPrompt(),
  videosPerDayPreset: '1',
  publishTimes: ['09:00'],
  status: 'INIT',
};

export interface ChannelAddSavePayload {
  id?: string;
  channelLink: string;
  // folderIdOverride: string;
  // channels: {
  email: string;
  /** Cột index «KÊNH CỦA TÔI» + lưu trong mavid-channel-config. */
  myChannel?: string;
  /** ID nhóm trong `MaVidMedia/channels/group.json`. */
  groupId?: string;
  videoType: 'from_audio' | 'reup_full';
  durationMinuteFrom: number;
  durationMinuteTo: number | null;
  background: string;
  overlay?: string;
  thumbnailPrompt: string;
  videosPerDayPreset: VideoPerDayPreset;
  publishTimes: string[];
  status: 'INIT' | 'LIVE';
}

export interface ChannelAddDialogProps {
  channels?: ChannelRow[];
  backgroundOptions: BackgroundOption[];
  onClose: () => void;
  onMapping: (payload: ChannelAddSavePayload) => Promise<void>;
  /** Khi có — mở form sửa dòng; URL kênh chỉ đọc. */
  initialRow?: ChannelRow | null;
}

export function ChannelAddDialog({ backgroundOptions, channels = [], onClose, onMapping, initialRow = null }: ChannelAddDialogProps) {
  const isEditMode = initialRow != null;

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ChannelAddDialogInitialFields>(() => {
    return isEditMode ? (initialRow as any) : ADD_FORM_DEFAULT;
  });

  const {
    channelLink,
    email,
    myChannel,
    group,
    videoType,
    durationMinutes,
    background,
    overlay,
    thumbnailPrompt,
    videosPerDayPreset,
    publishTimes,
  } = form;

  const resolvedBackground = useMemo(() => {
    const pick = background.trim();
    if (!pick) return '';
    if (backgroundOptions.some(bg => bg.id === pick)) return pick;
    return '';
  }, [backgroundOptions, background]);

  const reupOverlayOptionsList = useMemo(() => {
    if (videoType === 'from_audio') return OPTIONS_CONTENT;
    return reupOverlaySelectOptions();
  }, [videoType]);

  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await window.runner?.getMavidGroups?.();
        if (!cancelled) setGroups(Array.isArray(r?.items) ? r.items : []);
      } catch {
        if (!cancelled) setGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupSelectOptions = useMemo(() => {
    const fromFile = groups.map(g => ({
      value: g.id,
      label: (g.name?.trim() ? g.name.trim() : g.id) as string,
    }));
    const ids = new Set(fromFile.map(o => o.value));
    const out = [...fromFile];
    if (group.trim() && !ids.has(group.trim())) {
      out.unshift({ value: group.trim(), label: `${group.trim()} (đã lưu)` });
    }
    return [{ value: '', label: '—' }, ...out];
  }, [groups, group]);

  const thumbnailPromptOptionsList = useMemo(
    () =>
      PROMPTS_CREATE_THUMBNAIL_OPTIONS.map((o: any) => ({
        value: String(o.value),
        label: String(o.label),
      })),
    []
  );

  const resolvedReupOverlay = useMemo(() => {
    const pick = overlay.trim();
    if (videoType === 'from_audio') {
      if (pick && OPTIONS_CONTENT.some((o: any) => o.value === pick)) return pick;
      return OPTIONS_CONTENT[0]?.value ?? '';
    }
    if (pick && isValidReupOverlayName(pick)) return pick;
    return defaultReupOverlayName();
  }, [overlay, videoType]);

  const resolvedThumbnailPrompt = useMemo(() => {
    const pick = thumbnailPrompt.trim();
    if (pick && isValidthumbnailPrompt(pick)) return pick;
    return defaultThumbnailPrompt();
  }, [thumbnailPrompt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const slotCount = timeSlotCountForVideoPerDayPreset(videosPerDayPreset);

  const setPublishTimeAt = useCallback((index: number, value: string) => {
    const normalized = normalizeWallClockTimeToHHmm(value);
    setForm(f => {
      const next = [...f.publishTimes];
      next[index] = normalized;
      return { ...f, publishTimes: next };
    });
  }, []);

  const emailDuplicateWarning = useMemo(() => {
    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail) return '';

    const existingChannel = channels.find(channel => channel.email?.toLowerCase() === inputEmail);

    if (existingChannel && existingChannel.id !== initialRow?.id) return 'Email đã tồn tại trong index.xlsx.';

    return '';
  }, [email, channels, initialRow]);
  console.log('🚀 ~ ChannelAddDialog ~ emailDuplicateWarning:', emailDuplicateWarning);

  const durationMinuteOptions = CHANNEL_ADD_DURATION_SELECT_OPTIONS;

  const bgOptions = [{ value: '', label: 'Random' }, ...backgroundOptions.map(bg => ({ value: bg.id, label: bg.label }))];

  const showBackgroundField = videoType === 'from_audio';
  const showReupOverlayField = true; // Luôn hiển thị Option reup cho cả 2 loại video

  const handleConfirm = async () => {
    const [fromStr, toStr] = durationMinutes.split('_');
    console.log('🚀 ~ handleConfirm ~ durationMinutes:', durationMinutes);
    const from = Number(fromStr);
    const to = toStr === 'null' ? null : Number(toStr);

    const times = readPublishTimesFromTimeInputs(slotCount, publishTimes);

    const payload: any = {
      id: initialRow?.id,
      channelLink: channelLink.trim(),
      email: email.trim(),
      myChannel: myChannel.trim(),
      group,
      videoType: videoType as 'from_audio' | 'reup_full',
      durationMinuteFrom: from,
      durationMinuteTo: to,
      background: videoType === 'from_audio' ? resolvedBackground.trim() : '',
      overlay: resolvedReupOverlay.trim(),
      thumbnailPrompt: resolvedThumbnailPrompt.trim(),
      videosPerDayPreset,
      publishTimes: times,
      status: 'INIT' as 'INIT' | 'LIVE',
    };

    setSaving(true);
    setFormError(null);

    if (isEditMode) {
      const initialStatusNorm = initialRow ? normalizeChannelIndexStatus(initialRow.status) : ('INIT' as const);
      const initialEmailTrim = initialRow ? String(initialRow.email ?? '').trim() : '';
      const emailNowTrim = email.trim();
      const statusForIndex = initialStatusNorm === 'INIT' && !initialEmailTrim && emailNowTrim ? 'LIVE' : initialRow?.status;

      payload.status = statusForIndex;
      payload.channelId = initialRow?.channelId;
    }

    console.log('🚀 ~ handleConfirm ~ payload:', payload);
    await onMapping(payload);
    onClose();
  };

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
        className='w-full my-8 rounded-2xl p-6 sm:p-8 shadow-xl overflow-hidden relative z-1 max-h-[min(90vh,760px)] min-h-0 flex flex-col'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', maxWidth: '680px' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          {isEditMode ? 'Edit Mapping' : 'Mapping'}
        </h2>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 mt-4 overflow-y-auto min-h-0 flex-1 pr-1 content-start'>
          <div className='mb-4'>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='add-channel-url'>
              URL kênh
            </label>
            <input
              id='add-channel-url'
              type='url'
              inputMode='url'
              autoComplete='off'
              placeholder='https://www.youtube.com/@handler'
              value={channelLink}
              onChange={e => !isEditMode && setForm(f => ({ ...f, channelLink: e.target.value }))}
              readOnly={isEditMode}
              tabIndex={isEditMode ? -1 : undefined}
              aria-readonly={isEditMode || undefined}
              title={isEditMode ? channelLink : undefined}
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: isEditMode ? 'var(--text-muted)' : 'var(--text-h)',
                borderColor: 'var(--border)',
                cursor: isEditMode ? 'default' : undefined,
              }}
            />
          </div>

          <div className='mb-4 space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='add-email'>
                Email
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
                  borderColor: emailDuplicateWarning ? '#f87171' : 'var(--border)',
                }}
              />
              {emailDuplicateWarning ? (
                <p className='text-xs mt-1' style={{ color: '#fecaca' }}>
                  {emailDuplicateWarning}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='add-my-channel'>
              Kênh của tôi
            </label>
            <input
              id='add-my-channel'
              type='text'
              autoComplete='off'
              placeholder=''
              value={myChannel}
              onChange={e => setForm(f => ({ ...f, myChannel: e.target.value }))}
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
          </div>

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Nhóm
            </div>
            <CustomSelect
              value={group}
              options={groupSelectOptions}
              onChange={v => setForm(f => ({ ...f, group: v }))}
              placeholder='Chọn nhóm'
              menuZIndex={100}
            />
          </div>

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Loại video
            </div>
            <CustomSelect
              value={videoType}
              options={videoTypeOptions}
              onChange={v => setForm(f => ({ ...f, videoType: v }))}
              placeholder='Chọn'
              menuZIndex={100}
            />
          </div>

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
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
            <div className='mb-4'>
              <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
                Background
              </div>

              <CustomSelect
                value={resolvedBackground}
                options={bgOptions}
                onChange={v => setForm(f => ({ ...f, background: v }))}
                placeholder='Chọn background'
                menuZIndex={100}
              />
            </div>
          ) : null}

          {showReupOverlayField ? (
            <div className='mb-4'>
              <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
                Option reup
              </div>
              <CustomSelect
                value={resolvedReupOverlay}
                options={reupOverlayOptionsList}
                onChange={v => setForm(f => ({ ...f, overlay: v }))}
                placeholder='Chọn overlay'
                menuZIndex={100}
              />
            </div>
          ) : null}

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Style Thumbnail
            </div>
            <CustomSelect
              value={resolvedThumbnailPrompt}
              options={thumbnailPromptOptionsList}
              onChange={v => setForm(f => ({ ...f, thumbnailPrompt: v }))}
              placeholder='Chọn style'
              menuZIndex={100}
            />
          </div>

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
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

          <div className='lg:col-span-2 space-y-3'>
            <div className='text-sm font-medium' style={{ color: 'var(--text-h)' }}>
              Giờ upload
              {videosPerDayPreset === '1-2' ? ' — 1 suất ngày thường + 2 suất cuối tuần' : ` (${slotCount} suất/ngày)`}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-8'>
              {publishTimes.slice(0, slotCount).map((t, i) => (
                <div key={i} className='flex flex-col gap-1.5 mb-2'>
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

        <div
          className='flex flex-wrap justify-end gap-2 shrink-0 border-t'
          style={{ marginTop: '12px', paddingTop: '12px', borderColor: 'var(--border)' }}
        >
          <AppButton type='button' variant='neutral' onClick={() => onClose()}>
            Hủy
          </AppButton>
          <AppButton type='button' variant='primary' onClick={handleConfirm} disabled={saving || !!emailDuplicateWarning}>
            {saving ? 'Đang xử lý…' : isEditMode ? 'Cập nhật' : 'Lưu'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
