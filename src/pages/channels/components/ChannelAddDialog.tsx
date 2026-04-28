import { PROMPTS_CREATE_THUMBNAIL_OPTIONS } from '@contents/prompts/index.js';
import { OPTIONS_CONTENT } from '@contents/makeFromAudio/constant.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelRow, MavidGroupRow } from '@/types';
import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  buildChannelRowFromAddForm,
  CHANNEL_ADD_DURATION_SELECT_OPTIONS,
  channelAddDialogInitialFromIndexRow,
  channelFolderFromRow,
  defaultReupOverlayName,
  defaultthumbnailPrompt,
  durationLabelToOption,
  INDEX_VIDEO_TYPE_VALUES,
  indexHeadersMissingForAddChannel,
  isValidPublishScheduleTime,
  isValidReupOverlayName,
  isValidthumbnailPrompt,
  labelForPublishTimeSlot,
  normalizeChannelIndexStatus,
  normalizeWallClockTimeToHHmm,
  parseVideoPerDayCell,
  reupOverlaySelectOptions,
  timeSlotCountForVideoPerDayPreset,
  type ChannelAddDialogInitialFields,
  type VideoPerDayPreset,
} from '../utils/channelIndexHelpers';

function isDurationOverlap(opt1: string, opt2: string): boolean {
  if (!opt1 || !opt2) return false;
  const parseScale = (opt: string) => {
    const [fromStr, toStr] = opt.split('_');
    const from = fromStr === 'null' ? 0 : Number(fromStr);
    const to = toStr === 'null' ? Infinity : Number(toStr);
    return [from, to];
  };
  const [f1, t1] = parseScale(opt1);
  const [f2, t2] = parseScale(opt2);
  return f1 < t2 && f2 < t1;
}

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
  myChannel: '',
  mavidGroupId: '',
  videoType: 'reup_full',
  durationOption: '0_null',
  selectedBackground: '',
  reupOverlayOption: defaultReupOverlayName(),
  thumbnailPrompt: defaultthumbnailPrompt(),
  folderIdOverride: '',
  videosPerDayPreset: '1',
  publishTimes: ['09:00'],
  channelStatus: 'INIT',
};

const VIDEO_PER_DAY_OPTIONS: { value: VideoPerDayPreset; label: string }[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '1-2', label: '1–2 (2 suất cuối tuần)' },
];

/** Payload gửi tới `addChannelFromForm` (không ghi bảng nháp index). */
export interface ChannelAddSavePayload {
  channelUrl: string;
  folderIdOverride: string;
  channels: {
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
  }[];
}

export interface ChannelAddDialogProps {
  indexHeaders: string[];
  backgroundFolders: string[];
  indexRows?: ChannelRow[];
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
  indexRows,
  onClose,
  onAdd,
  onSaveNewChannel,
  initialRow = null,
}: ChannelAddDialogProps) {
  const isEditMode = initialRow != null;

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Chế độ sửa: đã thử đọc `mavid-channel-config.json` trong thư mục kênh (để không ghi đè form bằng fetch muộn). */
  const [configHydrated, setConfigHydrated] = useState(!isEditMode);

  const [form, setForm] = useState<ChannelAddDialogInitialFields>(() =>
    initialRow != null ? channelAddDialogInitialFromIndexRow(initialRow, indexHeaders) : ADD_FORM_DEFAULT
  );

  const {
    channelUrl,
    email,
    myChannel,
    mavidGroupId,
    videoType,
    durationOption,
    selectedBackground,
    reupOverlayOption,
    thumbnailPrompt,
    folderIdOverride,
    videosPerDayPreset,
    publishTimes,
    channelStatus,
  } = form;
  console.log('🚀 ~ ChannelAddDialog ~ folderIdOverride:', folderIdOverride);

  const resolvedBackground = useMemo(() => {
    const pick = selectedBackground.trim();
    if (backgroundFolders.length === 0) return pick;
    if (pick && backgroundFolders.includes(pick)) return pick;
    if (pick) return pick;
    return backgroundFolders[0] ?? '';
  }, [backgroundFolders, selectedBackground]);

  const reupOverlayOptionsList = useMemo(() => {
    if (videoType === 'from_audio') return OPTIONS_CONTENT;
    return reupOverlaySelectOptions();
  }, [videoType]);

  const [mavidGroupRows, setMavidGroupRows] = useState<MavidGroupRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await window.runner?.getMavidGroups?.();
        if (!cancelled) setMavidGroupRows(Array.isArray(r?.items) ? r.items : []);
      } catch {
        if (!cancelled) setMavidGroupRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupSelectOptions = useMemo(() => {
    const fromFile = mavidGroupRows.map(g => ({
      value: g.id,
      label: (g.name?.trim() ? g.name.trim() : g.id) as string,
    }));
    const ids = new Set(fromFile.map(o => o.value));
    const out = [...fromFile];
    if (mavidGroupId.trim() && !ids.has(mavidGroupId.trim())) {
      out.unshift({ value: mavidGroupId.trim(), label: `${mavidGroupId.trim()} (đã lưu)` });
    }
    return [{ value: '', label: '—' }, ...out];
  }, [mavidGroupRows, mavidGroupId]);

  const thumbnailPromptOptionsList = useMemo(
    () =>
      PROMPTS_CREATE_THUMBNAIL_OPTIONS.map((o: any) => ({
        value: String(o.value),
        label: String(o.label),
      })),
    []
  );

  const resolvedReupOverlay = useMemo(() => {
    const pick = reupOverlayOption.trim();
    if (videoType === 'from_audio') {
      if (pick && OPTIONS_CONTENT.some((o: any) => o.value === pick)) return pick;
      return OPTIONS_CONTENT[0]?.value ?? '';
    }
    if (pick && isValidReupOverlayName(pick)) return pick;
    return defaultReupOverlayName();
  }, [reupOverlayOption, videoType]);

  const resolvedthumbnailPrompt = useMemo(() => {
    const pick = thumbnailPrompt.trim();
    if (pick && isValidthumbnailPrompt(pick)) return pick;
    return defaultthumbnailPrompt();
  }, [thumbnailPrompt]);

  /** Chỉ khi sửa dòng index: cần đủ cột để build row. Thêm mới không cần file index — `addChannelFromForm` tạo/cập nhật index. */
  const missingHeaders = useMemo(() => (isEditMode ? indexHeadersMissingForAddChannel(indexHeaders) : []), [isEditMode, indexHeaders]);

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

    const folder = channelFolderFromRow(initialRow);
    if (!folder || typeof window.runner?.readMavidChannelConfig !== 'function') {
      setConfigHydrated(true);
      return;
    }

    let cancelled = false;
    setConfigHydrated(false);
    void (async () => {
      try {
        const cfg = await window.runner.readMavidChannelConfig(folder);
        console.log('🚀 ~ ChannelAddDialog ~ cfg:', cfg, initialRow);
        if (cancelled || !cfg || typeof cfg !== 'object') return;

        setForm(prev => {
          const next = { ...prev };
          const list = Array.isArray(cfg.channels) ? cfg.channels : [];
          let ch: any = null;
          if (list.length > 0) {
            const want = String(initialRow.email ?? '').trim().toLowerCase();
            ch = list.find((row: { email?: string }) => String(row?.email ?? '').trim() === String(initialRow.email ?? '').trim());
            if (!ch && want) {
              ch = list.find((row: { email?: string }) => String(row?.email ?? '').trim().toLowerCase() === want);
            }
            if (!ch && list.length === 1) ch = list[0];
          }

          if (!ch) return next;

          if (typeof ch.email === 'string' && ch.email.trim()) next.email = ch.email.trim();
          if (typeof ch.myChannel === 'string') next.myChannel = ch.myChannel.trim();
          if (ch.videoType === 'from_audio' || ch.videoType === 'reup_full') next.videoType = ch.videoType;

          if (ch.durationMinuteFrom !== undefined) {
            next.durationOption = `${ch.durationMinuteFrom}_${ch.durationMinuteTo === null ? 'null' : ch.durationMinuteTo}`;
          }

          if (typeof ch.background === 'string') next.selectedBackground = ch.background;
          if (typeof ch.overlay === 'string' && ch.overlay.trim() && isValidReupOverlayName(ch.overlay)) {
            next.reupOverlayOption = ch.overlay.trim();
          }
          if (typeof ch.thumbnailPrompt === 'string' && ch.thumbnailPrompt.trim() && isValidthumbnailPrompt(ch.thumbnailPrompt)) {
            next.thumbnailPrompt = ch.thumbnailPrompt.trim();
          }
          if (typeof ch.videosPerDayPreset === 'string' && ch.videosPerDayPreset.trim()) {
            next.videosPerDayPreset = parseVideoPerDayCell(ch.videosPerDayPreset);
          }
          if (Array.isArray(ch.publishTimes) && ch.publishTimes.length > 0) {
            const preset = next.videosPerDayPreset;
            const slots = timeSlotCountForVideoPerDayPreset(preset);
            let times = ch.publishTimes.map((t: string) => normalizeWallClockTimeToHHmm(String(t)));
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
    { value: 'reup_full', label: 'Tạo video reup toàn bộ' },
    { value: 'from_audio', label: 'Tạo video từ audio' },
  ];

  /** Email trùng lặp (reactive, hiển thị inline). */
  const emailDuplicateWarning = useMemo(() => {
    if (!indexRows?.length) return '';
    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail) return '';
    for (const r of indexRows) {
      if (isEditMode && initialRow === r) continue;
      const cell = String(r.email ?? '').toLowerCase();
      const existing = cell
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
      if (existing.includes(inputEmail)) {
        return 'Email đã tồn tại trong index.xlsx.';
      }
    }
    return '';
  }, [email, indexRows, isEditMode, initialRow]);

  /** Duration options đã dùng cho cùng URL trong index. */
  const usedDurationOptions = useMemo(() => {
    const used = new Set<string>();
    if (!indexRows?.length) return used;
    const normUrlRaw = channelUrl.trim();
    const normUrl = /^https?:\/\//i.test(normUrlRaw) ? normUrlRaw : normUrlRaw ? `https://${normUrlRaw}` : '';
    if (!normUrl) return used;
    for (const r of indexRows) {
      if (isEditMode && initialRow === r) continue;
      const rowUrlRaw = String(r.link ?? '').trim();
      const rowUrl = /^https?:\/\//i.test(rowUrlRaw) ? rowUrlRaw : rowUrlRaw ? `https://${rowUrlRaw}` : '';
      if (rowUrl === normUrl) {
        const label = String(r.videoDuration ?? '').trim();
        if (label) used.add(durationLabelToOption(label));
      }
    }
    return used;
  }, [channelUrl, indexRows, isEditMode, initialRow]);

  /** Luôn hiển thị đủ preset — cho phép chọn khoảng trùng; chỉ cảnh báo, không chặn lưu. */
  const durationMinuteOptions = CHANNEL_ADD_DURATION_SELECT_OPTIONS;

  /** Cảnh báo (không chặn submit): cùng URL đã có dòng với khoảng thời gian trùng. */
  const durationOverlapWarning = useMemo(() => {
    if (usedDurationOptions.size === 0) return '';
    for (const used of usedDurationOptions) {
      if (isDurationOverlap(durationOption, used)) {
        return 'Đã tồn tại — cùng URL và khoảng thời gian video đã có trong index (vẫn có thể lưu).';
      }
    }
    return '';
  }, [durationOption, usedDurationOptions]);

  const backgroundOptions = backgroundFolders.map(bg => ({ value: bg, label: bg }));

  const hasBackgroundColumn = indexHeaders.includes('background');
  const showBackgroundField = videoType === 'from_audio' && (!isEditMode || hasBackgroundColumn);
  const showReupOverlayField = true; // Luôn hiển thị Option reup cho cả 2 loại video
  const requireBackground = videoType === 'from_audio' && backgroundFolders.length > 0 && (!isEditMode || hasBackgroundColumn);
  const requireReupOverlay = reupOverlayOptionsList.length > 0;

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
      if (!durationOption) {
        setFormError('Chọn thời gian video (phút).');
        return;
      }
      const [fromStr, toStr] = durationOption.split('_');
      const from = Number(fromStr);
      const to = toStr === 'null' ? null : Number(toStr);
      if (requireBackground && !resolvedBackground.trim()) {
        setFormError('Chọn background.');
        return;
      }
      if (requireReupOverlay && !reupOverlayOptionsList.some((o: any) => o.value === resolvedReupOverlay)) {
        setFormError('Chọn Option reup (overlay).');
        return;
      }
      const times = readPublishTimesFromTimeInputs(slotCount, publishTimes);
      if (times.length !== slotCount || times.some(t => !t || !isValidPublishScheduleTime(t))) {
        setFormError(
          videosPerDayPreset === '1-2'
            ? 'Chọn đủ 3 giờ (HH:mm): 1 suất ngày thường + 2 suất cuối tuần.'
            : 'Chọn đủ giờ upload (HH:mm) cho từng video trong ngày.'
        );
        return;
      }

      if (indexRows && indexRows.length > 0) {
        let hasDuplicateEmail = false;
        const inputEmail = email.trim().toLowerCase();

        for (const r of indexRows) {
          if (isEditMode && initialRow === r) continue;

          if (inputEmail) {
            const cell = String(r.email ?? '').toLowerCase();
            const existingEmails = cell
              .split(',')
              .map(e => e.trim())
              .filter(Boolean);
            if (existingEmails.includes(inputEmail)) {
              hasDuplicateEmail = true;
            }
          }
        }

        if (hasDuplicateEmail) {
          setFormError('Email đã được sử dụng trong index.xlsx. Vui lòng chọn email khác hoặc để trống.');
          return;
        }
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
        const initialStatusNorm = initialRow ? normalizeChannelIndexStatus(initialRow.status) : ('INIT' as const);
        const initialEmailTrim = initialRow ? String(initialRow.email ?? '').trim() : '';
        const emailNowTrim = email.trim();
        const statusForIndex = initialStatusNorm === 'INIT' && !initialEmailTrim && emailNowTrim ? 'LIVE' : channelStatus;

        const { row, error } = buildChannelRowFromAddForm(
          indexHeaders,
          {
            channelUrl,
            email,
            myChannel,
            mavidGroupId: mavidGroupId.trim(),
            videoType: videoType as 'from_audio' | 'reup_full',
            durationOption,
            background: videoType === 'from_audio' ? resolvedBackground.trim() : '',
            overlay: videoType === 'reup_full' ? resolvedReupOverlay.trim() : '',
            thumbnailPrompt: resolvedthumbnailPrompt.trim(),
            videosPerDayPreset,
            publishTimes: times,
            folderIdOverride,
            channelStatus: statusForIndex,
          },
          { preserveChannelFromRow: initialRow }
        );
        if (error) {
          setFormError(error);
          return;
        }
        const folder = channelFolderFromRow(row);
        if (!folder?.trim()) {
          setFormError('Không xác định được thư mục kênh (cột ID).');
          return;
        }
        setSaving(true);
        setFormError(null);
        try {
          await onAdd(row);
          await window.runner.writeMavidChannelConfig({
            channelFolder: folder.trim(),
            mergeFromPreviousEmail: String(initialRow?.email ?? '').trim() || undefined,
            patch: {
              channels: [
                {
                  email: email.trim(),
                  myChannel: myChannel.trim(),
                  videoType: videoType as 'from_audio' | 'reup_full',
                  durationMinuteFrom: from,
                  durationMinuteTo: to,
                  background: videoType === 'from_audio' ? resolvedBackground.trim() : '',
                  overlay: resolvedReupOverlay.trim(),
                  thumbnailPrompt: resolvedthumbnailPrompt.trim(),
                  videosPerDayPreset,
                  publishTimes: times,
                },
              ],
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
        // Skip uniqueness warning if empty or if it was already handled locally
        if (normalizedEmail && registered.includes(normalizedEmail)) {
          // Double check since we only checked indexRows locally, there might be other channel config files without index.xlsx record
          setFormError('Email đã được dùng cho kênh khác (trong thư mục kênh). Chọn email khác.');
          return;
        }

        await onSaveNewChannel({
          channelUrl,
          folderIdOverride,
          channels: [
            {
              email: email.trim(),
              myChannel: myChannel.trim(),
              ...(mavidGroupId.trim() ? { groupId: mavidGroupId.trim() } : {}),
              videoType: videoType as 'from_audio' | 'reup_full',
              durationMinuteFrom: from,
              durationMinuteTo: to,
              background: videoType === 'from_audio' ? resolvedBackground.trim() : '',
              overlay: resolvedReupOverlay.trim(),
              thumbnailPrompt: resolvedthumbnailPrompt.trim(),
              videosPerDayPreset,
              publishTimes: times,
            },
          ],
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
    durationOption,
    email,
    myChannel,
    mavidGroupId,
    folderIdOverride,
    requireBackground,
    requireReupOverlay,
    reupOverlayOptionsList,
    resolvedReupOverlay,
    resolvedthumbnailPrompt,
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
    indexRows,
    initialRow,
    channelStatus,
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
        className='w-full my-8 rounded-2xl p-6 sm:p-8 shadow-xl overflow-hidden relative z-1 max-h-[min(90vh,760px)] min-h-0 flex flex-col'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', maxWidth: '680px' }}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className='text-lg font-semibold shrink-0' style={{ color: 'var(--text-h)' }}>
          {isEditMode ? 'Sửa channel' : 'Thêm channel'}
        </h2>
        <p className='text-sm leading-snug mt-2 shrink-0' style={{ color: 'var(--text-muted)' }}>
          Mỗi channel có thể có nhiều email, nhưng khoảng thời gian video khác nhau
        </p>

        {isEditMode && missingHeaders.length > 0 ? (
          <p className='text-sm mt-3 shrink-0' style={{ color: '#fecaca' }}>
            Thiếu cột trong index: {missingHeaders.join(', ')}. Thêm vào <code className='text-xs'>MaVidMedia/channels/index.xlsx</code> rồi
            Tải lại.
          </p>
        ) : null}

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

          <div className='mb-4 space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }} htmlFor='add-email'>
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
              value={mavidGroupId}
              options={groupSelectOptions}
              onChange={v => setForm(f => ({ ...f, mavidGroupId: v }))}
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
              placeholder='Chọn loại'
              menuZIndex={100}
            />
          </div>

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Tạo video với thời gian từ (thời lượng)
            </div>
            <CustomSelect
              value={durationOption}
              options={durationMinuteOptions}
              onChange={v => setForm(f => ({ ...f, durationOption: v }))}
              placeholder='Phút'
              menuZIndex={100}
            />
            {durationOverlapWarning ? (
              <p className='text-xs mt-1' style={{ color: '#f87171' }}>
                {durationOverlapWarning}
              </p>
            ) : null}
          </div>

          {showBackgroundField ? (
            <div className='mb-4'>
              <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
                Background
              </div>
              {backgroundFolders.length === 0 ? (
                <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                  Chưa có thư mục stocks (video/image) trong MaVidMedia/backgrounds (Settings → LƯU TRỮ VIDEO).
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

          {showReupOverlayField ? (
            <div className='mb-4'>
              <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
                Option reup
              </div>
              {reupOverlayOptionsList.length === 0 ? (
                <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                  Chưa có preset trong contents/constants/overlayOptions.js.
                </p>
              ) : (
                <CustomSelect
                  value={resolvedReupOverlay}
                  options={reupOverlayOptionsList}
                  onChange={v => setForm(f => ({ ...f, reupOverlayOption: v }))}
                  placeholder='Chọn overlay'
                  menuZIndex={100}
                />
              )}
            </div>
          ) : null}

          <div className='mb-4'>
            <div className='block text-sm font-medium mb-2' style={{ color: 'var(--text-h)' }}>
              Style Thumbnail
            </div>
            <CustomSelect
              value={resolvedthumbnailPrompt}
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
          <AppButton
            type='button'
            variant='primary'
            onClick={handleConfirm}
            disabled={(isEditMode && missingHeaders.length > 0) || saving || (isEditMode && !configHydrated)}
          >
            {saving ? 'Đang xử lý…' : isEditMode ? 'Cập nhật' : 'Lưu'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
