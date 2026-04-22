import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelData, ChannelFolderDataResult, ChannelRow } from '@/types';
import { scriptDefs } from '@/types';
import { MAX_VIDEOS_PREPARE_AHEAD } from '@contents/constants/appSettings.js';
import { useClientPagination } from '@/hooks/useClientPagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChannelAddDialog } from './ChannelAddDialog';
import { ChannelCreateVideoDialog } from './ChannelCreateVideoDialog';
import { ChannelUploadVideoDialog } from './ChannelUploadVideoDialog';
import {
  fetchAllGpmProfileRows,
  MAX_CONCURRENT_YOUTUBE_UPLOAD_CHANNELS,
  resolveGpmProfileIdByEmail,
  type ChannelItem,
  type ChannelUploadVideoPayload,
} from './channelUploadVideoHelpers';
import { ChannelsDetailSection } from './ChannelsDetailSection';
import { DETAIL_TABLE_LOADING_HEADERS } from './channelsDetailSectionShared';
import { ChannelsIndexSection } from './ChannelsIndexSection';
import { CHANNELS_INDEX_VISIBLE_COLUMNS } from './channelsIndexSection.model';
import { ChannelsPageHeaderActions } from './ChannelsPageHeaderActions';
import { durationPresetToSecRange, parseDurationToSeconds } from './channelDurationFormat';
import { gpmApi } from '@/services';
import {
  buildExtraEnvForIndexChannelRow,
  CHANNEL_ADD_DURATION_SELECT_OPTIONS,
  channelFolderFromRow,
  extractYoutubeVideoIdFromUrl,
  findIndexHeaderKey,
  headerNorm,
  resolveIndexRowVideoType,
  SCRIPT_FROM_AUDIO,
  SCRIPT_REUP_FULL,
} from './channelIndexHelpers';

const INDEX_FILE = 'channels/index.xlsx';

/** Khớp cột STATUS trong file chi tiết kênh (khi đã tạo file video). */
const DETAIL_STATUS_VIDEO_CREATED = 'Đã tạo video';

/** Status trống trong file chi tiết — ô trống hoặc chữ «empty». */
function isDetailRowStatusEmpty(raw: unknown): boolean {
  const s = String(raw ?? '').trim();
  if (!s) return true;
  return s.toLowerCase() === 'empty';
}

function normalizeYoutubeUploadEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function ChannelsPage() {
  const [indexData, setIndexData] = useState<ChannelData | null>(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChannelFolderDataResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLinkFilter, setDetailLinkFilter] = useState('');
  const [detailDurationPreset, setDetailDurationPreset] = useState('0_null');
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>('__all__');
  const [startMarkingIndex, setStartMarkingIndex] = useState<number | null>(null);
  const [detailUpdateMetaBusy, setDetailUpdateMetaBusy] = useState(false);
  const [detailActionError, setDetailActionError] = useState<string | null>(null);
  const [detailUploadPrepBusy, setDetailUploadPrepBusy] = useState(false);

  const [indexDraftRows, setIndexDraftRows] = useState<ChannelRow[]>([]);
  const [indexListError, setIndexListError] = useState<string | null>(null);
  const [indexSaving, setIndexSaving] = useState(false);
  const [indexBackgrounds, setIndexBackgrounds] = useState<string[]>([]);
  /** null = idle; khi chạy batch tạo video cho mọi kênh trong index */
  const [indexBatchVideo, setIndexBatchVideo] = useState<{
    current: number;
    total: number;
    channelLabel: string;
  } | null>(null);

  const [indexEditRowIndex, setIndexEditRowIndex] = useState<number | null>(null);
  const [uploadVideoOpen, setUploadVideoOpen] = useState(false);
  /** Số luồng upload YouTube (runScript) đang chạy — hiển thị trên header / dialog. */
  const [youtubeUploadActiveThreads, setYoutubeUploadActiveThreads] = useState(0);
  /** Email (chuẩn hóa) đang giữ bởi một runScript upload — không chạy trùng cho đến khi xong. */
  const uploadingYoutubeEmailsRef = useRef(new Set<string>());
  const [createVideoOpen, setCreateVideoOpen] = useState(false);
  const [uploadScheduleInfo, setUploadScheduleInfo] = useState<string | null>(null);
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [_addChannelInfo, setAddChannelInfo] = useState<string | null>(null);
  const [googleDriveSyncInfo, setGoogleDriveSyncInfo] = useState<string | null>(null);

  const loadIndex = useCallback(async () => {
    setIndexLoading(true);
    try {
      const d = await window.runner.readChannelData(INDEX_FILE);
      setIndexData(d);
      setIndexDraftRows(d.rows?.map(r => ({ ...r })) ?? []);
      setIndexSelectedRowIndices(new Set());
      setIndexListError(null);
      setIndexEditRowIndex(null);
    } catch {
      setIndexData({ headers: [], rows: [] });
      setIndexDraftRows([]);
      setIndexSelectedRowIndices(new Set());
      setIndexEditRowIndex(null);
    } finally {
      setIndexLoading(false);
    }
  }, []);

  useEffect(() => {
    window.runner
      .listBackgrounds()
      .then(setIndexBackgrounds)
      .catch(() => setIndexBackgrounds([]));
  }, []);

  useEffect(() => {
    void loadIndex();
  }, [loadIndex]);

  const loadDetail = useCallback(async (channelFolder: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await window.runner.readChannelFolderData(channelFolder);
      setDetail(d);
    } catch {
      setDetail({
        headers: [],
        rows: [],
        fileName: null,
        channelFolder,
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      void loadDetail(selectedChannel);
    } else {
      setDetail(null);
    }
  }, [selectedChannel, loadDetail]);

  useEffect(() => {
    setDetailLinkFilter('');
    setDetailDurationPreset('0_null');
    setDetailStatusFilter('__all__');
    setDetailActionError(null);
    setUploadVideoOpen(false);
    setCreateVideoOpen(false);
    setDetailSelectedRowIndices(new Set());
  }, [selectedChannel]);

  const indexHeaders = useMemo(() => {
    if (indexData?.headers?.length) return indexData.headers;
    const first = indexData?.rows?.[0];
    if (first && typeof first === 'object') return Object.keys(first);
    return [...CHANNELS_INDEX_VISIBLE_COLUMNS];
  }, [indexData]);

  /** Checkbox + các cột cố định (`CHANNELS_INDEX_VISIBLE_COLUMNS`) trên bảng index. */
  const indexColCount = 1 + CHANNELS_INDEX_VISIBLE_COLUMNS.length;

  const [indexSelectedRowIndices, setIndexSelectedRowIndices] = useState<Set<number>>(() => new Set());
  const [detailSelectedRowIndices, setDetailSelectedRowIndices] = useState<Set<number>>(() => new Set());

  const canWriteIndex = typeof window.runner?.writeChannelIndex === 'function';

  const closeIndexRowEdit = useCallback(() => {
    setIndexEditRowIndex(null);
  }, []);

  /** Ghi `MaVidMedia/channels/index.xlsx` (token UI: channels/index.xlsx). */
  const persistIndexRows = useCallback(
    async (rows: ChannelRow[], headersOverride?: string[]) => {
      if (!canWriteIndex) {
        throw new Error('Chỉ lưu index được trong app Electron.');
      }
      const headers = headersOverride?.length ? headersOverride : indexHeaders;
      setIndexSaving(true);
      setIndexListError(null);
      try {
        const normalized = rows.map(row => {
          const o: ChannelRow = {};
          for (const h of headers) {
            const v = row[h];
            o[h] = v == null || v === '' ? '' : v;
          }
          return o;
        });
        await window.runner.writeChannelIndex({
          filePath: INDEX_FILE,
          headers,
          rows: normalized,
        });
        await loadIndex();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Không lưu được index.xlsx.';
        setIndexListError(msg);
        throw e;
      } finally {
        setIndexSaving(false);
      }
    },
    [canWriteIndex, indexHeaders, loadIndex]
  );

  type IndexCreateVideoQueueEntry = {
    row: ChannelRow;
    folder: string;
    videoType: 'from_audio' | 'reup_full';
    /** Chỉ số dòng trong `indexDraftRows` — khớp checkbox bảng index. */
    draftRowIndex: number;
  };

  const indexCreateVideoQueue = useMemo((): IndexCreateVideoQueueEntry[] => {
    const queue: IndexCreateVideoQueueEntry[] = [];
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    for (let i = 0; i < indexDraftRows.length; i++) {
      const row = indexDraftRows[i];
      const folder = channelFolderFromRow(row, indexHeaders);
      const email = emailKey ? String(row[emailKey] ?? '').trim() : '';
      const videoType = resolveIndexRowVideoType(row, indexHeaders);
      if (folder && email && videoType) {
        queue.push({
          row,
          folder,
          videoType: videoType as 'from_audio' | 'reup_full',
          draftRowIndex: i,
        });
      }
    }
    return queue;
  }, [indexDraftRows, indexHeaders]);

  const createVideoQueueFromSelection = useMemo(
    () => indexCreateVideoQueue.filter(q => indexSelectedRowIndices.has(q.draftRowIndex)),
    [indexCreateVideoQueue, indexSelectedRowIndices]
  );

  /** Dòng index khớp thư mục đang xem chi tiết — cần cho Tạo video / Upload từ chi tiết. */
  const indexRowForDetailChannel = useMemo((): IndexCreateVideoQueueEntry | null => {
    if (!selectedChannel?.trim()) return null;
    const target = selectedChannel.trim();
    for (let i = 0; i < indexDraftRows.length; i++) {
      const row = indexDraftRows[i];
      const folder = channelFolderFromRow(row, indexHeaders);
      if (!folder?.trim() || folder.trim() !== target) continue;
      const videoType = resolveIndexRowVideoType(row, indexHeaders);
      if (videoType !== 'from_audio' && videoType !== 'reup_full') return null;
      return {
        row,
        folder: folder.trim(),
        videoType,
        draftRowIndex: i,
      };
    }
    return null;
  }, [selectedChannel, indexDraftRows, indexHeaders]);

  const indexSingleSelectedRowIndex = useMemo((): number | null => {
    if (indexSelectedRowIndices.size !== 1) return null;
    const [only] = indexSelectedRowIndices;
    return only ?? null;
  }, [indexSelectedRowIndices]);

  const indexSingleSelectedFolder = useMemo(() => {
    if (indexSingleSelectedRowIndex == null) return null;
    const row = indexDraftRows[indexSingleSelectedRowIndex];
    if (!row) return null;
    return channelFolderFromRow(row, indexHeaders);
  }, [indexSingleSelectedRowIndex, indexDraftRows, indexHeaders]);

  const indexChannelStatusToggle = useMemo(() => {
    if (indexSingleSelectedRowIndex == null) {
      return {
        nextStatus: null as 'LIVE' | 'STOPPED' | null,
        label: 'ACTIVE / DEACTIVE',
        enabled: false,
        title: 'Chọn đúng một dòng trên bảng (checkbox).',
      };
    }
    const sk = findIndexHeaderKey(indexHeaders, 'STATUS');
    if (!sk) {
      return {
        nextStatus: null as 'LIVE' | 'STOPPED' | null,
        label: 'ACTIVE / DEACTIVE',
        enabled: false,
        title: 'File index chưa có cột STATUS. Cập nhật index (Thêm channel / script getInfoChannel) hoặc thêm cột STATUS ở cuối sheet.',
      };
    }
    const raw = String(indexDraftRows[indexSingleSelectedRowIndex]?.[sk] ?? '')
      .trim()
      .toUpperCase();
    const st = raw === 'LIVE' || raw === 'STOPPED' || raw === 'INIT' ? raw : 'INIT';
    if (st === 'LIVE') {
      return {
        nextStatus: 'STOPPED' as const,
        label: 'DEACTIVE',
        enabled: true,
        title: 'Đặt trạng thái kênh thành STOPPED.',
      };
    }
    if (st === 'STOPPED') {
      return {
        nextStatus: 'LIVE' as const,
        label: 'ACTIVE',
        enabled: true,
        title: 'Đặt trạng thái kênh thành LIVE.',
      };
    }
    return {
      nextStatus: null as 'LIVE' | 'STOPPED' | null,
      label: 'ACTIVE / DEACTIVE',
      enabled: false,
      title: 'Chỉ kênh LIVE hoặc STOPPED mới bật/tắt từ đây (INIT: dùng Thêm channel hoặc chỉnh index).',
    };
  }, [indexSingleSelectedRowIndex, indexHeaders, indexDraftRows]);

  const onChannelStatusToggle = useCallback(async () => {
    const { nextStatus, enabled } = indexChannelStatusToggle;
    if (!enabled || !nextStatus || indexSingleSelectedRowIndex == null || indexSaving) return;

    const rowIdx = indexSingleSelectedRowIndex;
    const existingKey = findIndexHeaderKey(indexHeaders, 'STATUS');
    const headersOut = existingKey ? [...indexHeaders] : [...indexHeaders, 'STATUS'];
    const writeKey = existingKey ?? 'STATUS';

    const nextRows = indexDraftRows.map((r, i) => {
      const copy: ChannelRow = { ...r };
      for (const h of headersOut) {
        if (copy[h] === undefined || copy[h] === null) copy[h] = '';
      }
      if (i === rowIdx) copy[writeKey] = nextStatus;
      return copy;
    });

    try {
      await persistIndexRows(nextRows, headersOut);
    } catch {
      /* persistIndexRows đã set indexListError */
    }
  }, [indexChannelStatusToggle, indexSingleSelectedRowIndex, indexSaving, indexHeaders, indexDraftRows, persistIndexRows]);

  const openIndexEditForSingleSelection = useCallback(() => {
    if (indexSingleSelectedRowIndex == null) return;
    setIndexEditRowIndex(indexSingleSelectedRowIndex);
  }, [indexSingleSelectedRowIndex]);

  const openIndexDetailForSingleSelection = useCallback(() => {
    const folder = indexSingleSelectedFolder?.trim();
    if (!folder) return;
    setSelectedChannel(folder);
  }, [indexSingleSelectedFolder]);

  const canRunIndexBatchVideo = typeof window.runner?.runNpmScript === 'function';

  const runCreateVideoForQueue = useCallback(
    async (queue: IndexCreateVideoQueueEntry[], maxVideosPerBatch: number, opts?: { onlyLinks?: string[] }) => {
      if (!window.runner?.runNpmScript) {
        setIndexListError('Runner chưa sẵn sàng.');
        return;
      }
      if (queue.length === 0) {
        setIndexListError('Không có kênh nào đủ điều kiện: cần thư mục (cột ID hoặc CHANNEL), EMAIL.');
        return;
      }

      const bgList = indexBackgrounds.length > 0 ? indexBackgrounds : await window.runner.listBackgrounds().catch(() => []);
      setIndexListError(null);
      const failures: string[] = [];

      try {
        for (let i = 0; i < queue.length; i++) {
          const { row, folder, videoType } = queue[i];
          setIndexBatchVideo({ current: i + 1, total: queue.length, channelLabel: folder });
          const def = scriptDefs.find(s => s.id === (videoType === 'reup_full' ? SCRIPT_REUP_FULL : SCRIPT_FROM_AUDIO));
          if (!def) {
            failures.push(`${folder}: không tìm thấy script.`);
            continue;
          }

          const baseEnv = buildExtraEnvForIndexChannelRow(row, indexHeaders, folder, videoType, bgList, {
            maxVideosPerBatch,
          });
          const extraEnv =
            opts?.onlyLinks?.length && queue.length === 1
              ? { ...baseEnv, MAVID_ONLY_LINKS: JSON.stringify(opts.onlyLinks) }
              : baseEnv;
          try {
            const res = await window.runner.runNpmScript(def.npmScript, extraEnv);
            if (res.cancelled) {
              setIndexListError(`Đã dừng sau kênh ${folder} (${i + 1}/${queue.length}).`);
              return;
            }
            if (res.code !== 0) failures.push(`${folder}: thoát mã ${res.code}.`);
          } catch (e) {
            failures.push(`${folder}: ${e instanceof Error ? e.message : 'lỗi'}.`);
          }
        }

        if (failures.length > 0) {
          setIndexListError(
            failures.length === queue.length
              ? `Tất cả ${failures.length} kênh lỗi: ${failures.slice(0, 3).join(' ')}${failures.length > 3 ? '…' : ''}`
              : `Một số kênh lỗi (${failures.length}/${queue.length}): ${failures.slice(0, 4).join(' ')}${failures.length > 4 ? '…' : ''}`
          );
        }
      } finally {
        setIndexBatchVideo(null);
      }
    },
    [indexHeaders, indexBackgrounds]
  );

  const detailLayout = useMemo(() => {
    if (!detail) {
      return {
        meta: { email: '', channelName: '', channelTags: '' },
        tableHeaders: [] as string[],
        showEmail: false,
        showChannelName: false,
        showTags: false,
        linkVideoKey: undefined as string | undefined,
        durationKey: undefined as string | undefined,
        statusKey: undefined as string | undefined,
        startFromKey: undefined as string | undefined,
      };
    }
    const headers = detail.headers.length > 0 ? detail.headers : detail.rows[0] ? Object.keys(detail.rows[0]) : [];

    const findKey = (name: string) => headers.find(h => headerNorm(h) === headerNorm(name));
    const emailKey = findKey('EMAIL');
    const nameKey = findKey('CHANNEL NAME');
    const tagsKey = findKey('CHANNEL TAGS');

    const firstNonEmpty = (key: string | undefined) => {
      if (!key || !detail.rows?.length) return '';
      for (const row of detail.rows) {
        const v = row[key];
        if (v != null && String(v).trim()) return String(v).trim();
      }
      return '';
    };

    const meta = {
      email: firstNonEmpty(emailKey),
      channelName: firstNonEmpty(nameKey),
      channelTags: firstNonEmpty(tagsKey),
    };

    const skip = new Set([emailKey, nameKey, tagsKey].filter(Boolean) as string[]);
    const rest = headers.filter(h => !skip.has(h));
    const linkVideoKey = findKey('LINK VIDEO');
    /** Cột 2 (sau checkbox): LINK VIDEO nếu có, còn lại giữ thứ tự sheet. */
    const tableHeaders =
      linkVideoKey && rest.includes(linkVideoKey) ? [linkVideoKey, ...rest.filter(h => h !== linkVideoKey)] : rest;

    return {
      meta,
      tableHeaders,
      showEmail: Boolean(emailKey),
      showChannelName: Boolean(nameKey),
      showTags: Boolean(tagsKey),
      linkVideoKey,
      durationKey: findKey('DURATION'),
      statusKey: findKey('STATUS'),
      startFromKey: findKey('START FROM'),
    };
  }, [detail]);

  const filteredRowsWithIndex = useMemo(() => {
    if (!detail?.rows?.length) return [];
    const lk = detailLayout.linkVideoKey;
    const dk = detailLayout.durationKey;
    const sk = detailLayout.statusKey;
    const linkQ = detailLinkFilter.trim().toLowerCase();
    const durRange = durationPresetToSecRange(detailDurationPreset);
    return detail.rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        if (lk && linkQ) {
          const url = String(row[lk] ?? '').toLowerCase();
          if (!url.includes(linkQ)) return false;
        }
        if (dk && durRange) {
          const sec = parseDurationToSeconds(String(row[dk] ?? ''));
          if (sec == null || sec < durRange.min || sec > durRange.max) return false;
        }
        if (sk && detailStatusFilter !== '__all__') {
          const s = String(row[sk] ?? '').trim();
          if (s !== detailStatusFilter) return false;
        }
        return true;
      });
  }, [
    detail?.rows,
    detailLayout.linkVideoKey,
    detailLayout.durationKey,
    detailLayout.statusKey,
    detailLinkFilter,
    detailDurationPreset,
    detailStatusFilter,
  ]);

  const indexPag = useClientPagination(indexDraftRows.length);
  const pageIndexRows = useMemo(
    () => indexDraftRows.slice(indexPag.startIndex, indexPag.startIndex + indexPag.pageSize),
    [indexDraftRows, indexPag.startIndex, indexPag.pageSize]
  );

  const indexPageSelectionFlags = useMemo(() => {
    const start = indexPag.startIndex;
    const end = Math.min(start + indexPag.pageSize, indexDraftRows.length);
    const onPage: number[] = [];
    for (let i = start; i < end; i++) onPage.push(i);
    const all = onPage.length > 0 && onPage.every(i => indexSelectedRowIndices.has(i));
    const some = onPage.some(i => indexSelectedRowIndices.has(i));
    return { all, some };
  }, [indexPag.startIndex, indexPag.pageSize, indexDraftRows.length, indexSelectedRowIndices]);

  const toggleIndexRowSelected = useCallback((globalIndex: number) => {
    setIndexSelectedRowIndices(prev => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      return next;
    });
  }, []);

  const toggleIndexSelectAllOnPage = useCallback(() => {
    const start = indexPag.startIndex;
    const end = Math.min(start + indexPag.pageSize, indexDraftRows.length);
    const onPage: number[] = [];
    for (let i = start; i < end; i++) onPage.push(i);
    setIndexSelectedRowIndices(prev => {
      const next = new Set(prev);
      const allSelected = onPage.length > 0 && onPage.every(i => next.has(i));
      if (allSelected) onPage.forEach(i => next.delete(i));
      else onPage.forEach(i => next.add(i));
      return next;
    });
  }, [indexPag.startIndex, indexPag.pageSize, indexDraftRows.length]);

  const {
    page: detailPageNum,
    setPage: setDetailPage,
    startIndex: detailStartIndex,
    totalPages: detailTotalPages,
    pageSize: detailPageSize,
  } = useClientPagination(filteredRowsWithIndex.length);

  useEffect(() => {
    setDetailPage(1);
  }, [detailLinkFilter, detailDurationPreset, detailStatusFilter, selectedChannel, setDetailPage]);

  const pageDetailRows = useMemo(
    () => filteredRowsWithIndex.slice(detailStartIndex, detailStartIndex + detailPageSize),
    [filteredRowsWithIndex, detailStartIndex, detailPageSize]
  );

  const detailPageSelectionFlags = useMemo(() => {
    const onPage = pageDetailRows.map(({ originalIndex }) => originalIndex);
    const all = onPage.length > 0 && onPage.every(i => detailSelectedRowIndices.has(i));
    const some = onPage.some(i => detailSelectedRowIndices.has(i));
    return { all, some };
  }, [pageDetailRows, detailSelectedRowIndices]);

  const toggleDetailSelectAllOnPage = useCallback(() => {
    const onPage = pageDetailRows.map(({ originalIndex }) => originalIndex);
    setDetailSelectedRowIndices(prev => {
      const next = new Set(prev);
      const allSelected = onPage.length > 0 && onPage.every(i => next.has(i));
      if (allSelected) onPage.forEach(i => next.delete(i));
      else onPage.forEach(i => next.add(i));
      return next;
    });
  }, [pageDetailRows]);

  const canSetStartFrom = Boolean(detail?.fileName?.toLowerCase().endsWith('.xlsx') && detailLayout.startFromKey);

  const toggleDetailRowSelected = useCallback((originalRowIndex: number) => {
    setDetailSelectedRowIndices(prev => {
      const next = new Set(prev);
      if (next.has(originalRowIndex)) next.delete(originalRowIndex);
      else next.add(originalRowIndex);
      return next;
    });
  }, []);

  const detailMetaSelectionStats = useMemo(() => {
    const rows = detail?.rows;
    if (!rows?.length) {
      return {
        hasCreatedVideoInSelection: false,
        createdVideoSelectedCount: 0,
        emptyStatusSelectedCount: 0,
        hasEmptyStatusWithLinkInSelection: false,
        createdVideoWithYoutubeIdCount: 0,
        hasCreatedVideoWithYoutubeIdInSelection: false,
      };
    }
    const sk = detailLayout.statusKey;
    const lk = detailLayout.linkVideoKey;
    let hasCreatedVideoInSelection = false;
    let createdVideoSelectedCount = 0;
    let emptyStatusSelectedCount = 0;
    let hasEmptyStatusWithLinkInSelection = false;
    let createdVideoWithYoutubeIdCount = 0;
    let hasCreatedVideoWithYoutubeIdInSelection = false;
    for (const i of detailSelectedRowIndices) {
      const row = rows[i];
      if (!row) continue;
      const st = sk ? String(row[sk] ?? '').trim() : '';
      if (st === DETAIL_STATUS_VIDEO_CREATED) {
        hasCreatedVideoInSelection = true;
        createdVideoSelectedCount += 1;
        if (lk) {
          const url = String(row[lk] ?? '').trim();
          if (extractYoutubeVideoIdFromUrl(url)) {
            createdVideoWithYoutubeIdCount += 1;
            hasCreatedVideoWithYoutubeIdInSelection = true;
          }
        }
      }
      if (sk && lk && isDetailRowStatusEmpty(row[sk])) {
        const url = String(row[lk] ?? '').trim();
        const okLink =
          (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('(Không có video)');
        if (okLink) {
          emptyStatusSelectedCount += 1;
          hasEmptyStatusWithLinkInSelection = true;
        }
      }
    }
    return {
      hasCreatedVideoInSelection,
      createdVideoSelectedCount,
      emptyStatusSelectedCount,
      hasEmptyStatusWithLinkInSelection,
      createdVideoWithYoutubeIdCount,
      hasCreatedVideoWithYoutubeIdInSelection,
    };
  }, [detail?.rows, detailSelectedRowIndices, detailLayout.statusKey, detailLayout.linkVideoKey]);

  const handleDetailUpdateMeta = useCallback(
    async (originalIndices: number[]) => {
      if (!selectedChannel || !detail?.rows?.length || originalIndices.length === 0) return;
      const lk = detailLayout.linkVideoKey;
      const sk = detailLayout.statusKey;
      if (!lk) {
        setDetailActionError('File chi tiết không có cột LINK VIDEO.');
        return;
      }
      if (!sk) {
        setDetailActionError('File chi tiết không có cột STATUS — không lọc được «Đã tạo video».');
        return;
      }
      const items: { url: string }[] = [];
      for (const i of originalIndices) {
        const row = detail.rows[i];
        if (!row) continue;
        const status = String(row[sk] ?? '').trim();
        if (status !== DETAIL_STATUS_VIDEO_CREATED) continue;
        const url = String(row[lk] ?? '').trim();
        if (url) items.push({ url });
      }
      if (items.length === 0) {
        setDetailActionError('Không có dòng «Đã tạo video» nào (trong phần đã chọn) có link video hợp lệ.');
        return;
      }
      if (!window.runner?.runScript) {
        setDetailActionError('Chỉ chạy cập nhật meta trong app Electron.');
        return;
      }
      setDetailActionError(null);
      setDetailUpdateMetaBusy(true);
      try {
        if (typeof window.runner.minimizeApp === 'function') {
          window.runner.minimizeApp();
        }
        await window.runner.runScript('updateChannelVideosMeta', {
          channelFolder: selectedChannel,
          items,
        });
      } catch (e) {
        setDetailActionError(e instanceof Error ? e.message : String(e));
      } finally {
        setDetailUpdateMetaBusy(false);
      }
    },
    [selectedChannel, detail?.rows, detailLayout.linkVideoKey, detailLayout.statusKey]
  );

  async function handleSetStartFromRow(dataRowIndex: number) {
    if (!selectedChannel || startMarkingIndex !== null) return;
    if (!window.runner?.setChannelFolderStartFromRow) {
      setDetailActionError('Chỉ dùng đánh dấu Start trong app Electron.');
      return;
    }
    setDetailActionError(null);
    setStartMarkingIndex(dataRowIndex);
    try {
      await window.runner.setChannelFolderStartFromRow(selectedChannel, dataRowIndex);
      await loadDetail(selectedChannel);
    } catch (e) {
      setDetailActionError(e instanceof Error ? e.message : 'Không đánh dấu được START FROM.');
    } finally {
      setStartMarkingIndex(null);
    }
  }

  const detailTheadHeaders = detailLoading
    ? DETAIL_TABLE_LOADING_HEADERS
    : detailLayout.tableHeaders.length > 0
    ? detailLayout.tableHeaders
    : ['—'];

  /** Cột checkbox riêng (chỉ khi có bảng video hoặc đang load). */
  const detailShowSelectColumn = detailLoading || detailLayout.tableHeaders.length > 0;
  const detailColCount = Math.max(detailTheadHeaders.length, 1) + (detailShowSelectColumn ? 1 : 0);

  const showDetailMetaAbove =
    !detailLoading && detail != null && (detailLayout.showEmail || detailLayout.showChannelName || detailLayout.showTags);

  async function handleRefresh() {
    if (selectedChannel) {
      await loadDetail(selectedChannel);
    } else {
      await loadIndex();
    }
  }

  const refreshBusy = selectedChannel ? detailLoading : indexLoading;
  const hasIndexRows = (indexData?.rows?.length ?? 0) > 0;

  /** Kênh có ID + EMAIL trong các dòng đã tick (popup Upload video). */
  const uploadChannelsFromSelection = useMemo((): ChannelItem[] => {
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    const map = new Map<string, Set<string>>();
    for (const idx of indexSelectedRowIndices) {
      const row = indexDraftRows[idx];
      if (!row) continue;
      const f = channelFolderFromRow(row, indexHeaders);
      if (!f?.trim()) continue;
      if (!emailKey) continue;
      const emailRaw = String(row[emailKey] ?? '').trim();
      if (!emailRaw) continue;

      const emails = emailRaw
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
      if (emails.length > 0) {
        const folder = f.trim();
        if (!map.has(folder)) map.set(folder, new Set());
        emails.forEach(e => map.get(folder)!.add(e));
      }
    }
    const result: ChannelItem[] = Array.from(map.entries()).map(([folder, emails]) => ({
      folder,
      emails: Array.from(emails).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    }));
    return result.sort((a, b) => a.folder.localeCompare(b.folder, undefined, { sensitivity: 'base' }));
  }, [indexDraftRows, indexHeaders, indexSelectedRowIndices]);

  const handleYoutubeUploadConfirm = useCallback((payloads: ChannelUploadVideoPayload[]) => {
    if (!window.runner?.runScript) {
      setUploadScheduleInfo('Chỉ chạy upload trong app Electron.');
      return;
    }

    const claimed: ChannelUploadVideoPayload[] = [];
    const skippedBusy: string[] = [];
    const seenInRequest = new Set<string>();
    for (const p of payloads) {
      const k = normalizeYoutubeUploadEmailKey(p.email);
      if (!k) continue;
      if (seenInRequest.has(k)) continue;
      seenInRequest.add(k);
      if (uploadingYoutubeEmailsRef.current.has(k)) {
        skippedBusy.push(p.email);
        continue;
      }
      uploadingYoutubeEmailsRef.current.add(k);
      claimed.push(p);
    }

    if (skippedBusy.length > 0) {
      const uniq = [...new Set(skippedBusy)];
      setUploadScheduleInfo(
        `Bỏ qua ${uniq.length} email đang upload trên luồng khác: ${uniq.join(', ')}. Chờ xong rồi mới chạy lại cho các email đó.`
      );
    }

    if (claimed.length === 0) {
      if (skippedBusy.length === 0) {
        setUploadScheduleInfo('Không có kênh hợp lệ để upload.');
      }
      return;
    }

    if (skippedBusy.length === 0) {
      setUploadScheduleInfo(null);
    }

    const skipNote = skippedBusy.length > 0 ? `Đã bỏ qua email đang bận: ${[...new Set(skippedBusy)].join(', ')}. ` : '';

    void (async () => {
      const queue = [...claimed];
      const poolSize = Math.max(1, Math.min(MAX_CONCURRENT_YOUTUBE_UPLOAD_CHANNELS, queue.length));

      let ok = 0;
      let fail = 0;

      async function runOne(p: ChannelUploadVideoPayload) {
        const k = normalizeYoutubeUploadEmailKey(p.email);
        setYoutubeUploadActiveThreads(c => c + 1);
        try {
          await window.runner!.runScript('uploadYoutubeViaGpm', {
            gpmProfileId: p.gpmProfileId,
            channelFolder: p.channelFolder,
            email: p.email,
            maxUploads: p.totalVideos,
            gpmApiBase: gpmApi.getBaseUrl(),
            ...(p.uploadFolderNames?.length ? { uploadFolderNames: p.uploadFolderNames } : {}),
          });
          ok += 1;
        } catch {
          fail += 1;
        } finally {
          uploadingYoutubeEmailsRef.current.delete(k);
          setYoutubeUploadActiveThreads(c => Math.max(0, c - 1));
        }
      }

      async function worker() {
        while (queue.length) {
          const p = queue.shift();
          if (!p) break;
          await runOne(p);
        }
      }

      try {
        await Promise.all(Array.from({ length: poolSize }, () => worker()));
        const parts: string[] = [];
        if (ok > 0) parts.push(`${ok} kênh xong`);
        if (fail > 0) parts.push(`${fail} kênh lỗi`);
        setUploadScheduleInfo(
          `${skipNote}Upload YouTube (${claimed.length} kênh, tối đa ${MAX_CONCURRENT_YOUTUBE_UPLOAD_CHANNELS} song song): ${parts.join(' — ')}. Kiểm tra GPM / YouTube Studio và tab Logs.`
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setUploadScheduleInfo(`${skipNote}Upload YouTube lỗi: ${msg}`);
      }
    })();
  }, []);

  /** Giống mặc định trong ChannelCreateVideoDialog (input số video / lượt). */
  const defaultMaxVideosPerBatchDetail = useMemo(() => {
    const n = Number(MAX_VIDEOS_PREPARE_AHEAD);
    if (!Number.isFinite(n)) return 1;
    return Math.min(100, Math.max(1, Math.trunc(n)));
  }, []);

  const runDetailCreateVideoForSelection = useCallback(async () => {
    if (!selectedChannel || !detail?.rows?.length) return;
    const lk = detailLayout.linkVideoKey;
    const sk = detailLayout.statusKey;
    if (!lk || !sk) {
      setDetailActionError('File chi tiết cần cột LINK VIDEO và STATUS.');
      return;
    }
    if (!indexRowForDetailChannel) {
      setDetailActionError(
        'Không tìm thấy kênh này trong index.xlsx (hoặc thiếu LOẠI VIDEO from_audio / reup_full).'
      );
      return;
    }
    const onlyLinks: string[] = [];
    for (const i of detailSelectedRowIndices) {
      const row = detail.rows[i];
      if (!row) continue;
      if (!isDetailRowStatusEmpty(row[sk])) continue;
      const url = String(row[lk] ?? '').trim();
      if (
        !url ||
        !(url.startsWith('http://') || url.startsWith('https://')) ||
        url.includes('(Không có video)')
      ) {
        continue;
      }
      onlyLinks.push(url);
    }
    if (onlyLinks.length === 0) {
      setDetailActionError('Chọn ít nhất một dòng có status trống (hoặc empty) và link video hợp lệ.');
      return;
    }
    setDetailActionError(null);
    if (typeof window.runner?.minimizeApp === 'function') {
      window.runner.minimizeApp();
    }
    await runCreateVideoForQueue([indexRowForDetailChannel], defaultMaxVideosPerBatchDetail, { onlyLinks });
  }, [
    selectedChannel,
    detail?.rows,
    detailSelectedRowIndices,
    detailLayout.linkVideoKey,
    detailLayout.statusKey,
    indexRowForDetailChannel,
    defaultMaxVideosPerBatchDetail,
    runCreateVideoForQueue,
  ]);

  const runDetailUploadForSelection = useCallback(async () => {
    if (!selectedChannel || !detail?.rows?.length) return;
    const lk = detailLayout.linkVideoKey;
    const sk = detailLayout.statusKey;
    if (!lk || !sk) {
      setDetailActionError('File chi tiết cần cột LINK VIDEO và STATUS.');
      return;
    }
    const uploadFolderNames: string[] = [];
    for (const i of detailSelectedRowIndices) {
      const row = detail.rows[i];
      if (!row) continue;
      if (String(row[sk] ?? '').trim() !== DETAIL_STATUS_VIDEO_CREATED) continue;
      const id = extractYoutubeVideoIdFromUrl(String(row[lk] ?? '').trim());
      if (id) uploadFolderNames.push(id);
    }
    if (uploadFolderNames.length === 0) {
      setDetailActionError('Chọn ít nhất một dòng «Đã tạo video» có link YouTube dạng watch (?v=…).');
      return;
    }
    if (!indexRowForDetailChannel) {
      setDetailActionError('Không tìm thấy kênh này trong index.xlsx.');
      return;
    }
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    const email = emailKey ? String(indexRowForDetailChannel.row[emailKey] ?? '').trim() : '';
    if (!email) {
      setDetailActionError('Dòng index của kênh này cần có EMAIL để upload.');
      return;
    }
    if (!window.runner?.runScript) {
      setDetailActionError('Chỉ chạy upload trong app Electron.');
      return;
    }
    setDetailActionError(null);
    setDetailUploadPrepBusy(true);
    try {
      const profiles = await fetchAllGpmProfileRows();
      const gpmProfileId = resolveGpmProfileIdByEmail(profiles, email);
      if (!gpmProfileId) {
        setDetailActionError(`Không tìm thấy profile GPM có tên trùng email «${email}».`);
        return;
      }
      handleYoutubeUploadConfirm([
        {
          channelFolder: selectedChannel,
          email,
          totalVideos: uploadFolderNames.length,
          gpmProfileId,
          uploadFolderNames,
        },
      ]);
    } catch (e) {
      setDetailActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailUploadPrepBusy(false);
    }
  }, [
    selectedChannel,
    detail?.rows,
    detailSelectedRowIndices,
    detailLayout.linkVideoKey,
    detailLayout.statusKey,
    indexRowForDetailChannel,
    indexHeaders,
    handleYoutubeUploadConfirm,
  ]);

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        align='start'
        title='Channels'
        // description={selectedChannel ? `Chi tiết: MaVidMedia/channels/${selectedChannel}` : 'Danh sách từ MaVidMedia/channels/index.xlsx'}
        actions={
          <ChannelsPageHeaderActions
            selectedChannel={selectedChannel}
            hasIndexRows={hasIndexRows}
            indexSaving={indexSaving}
            indexLoading={indexLoading}
            indexBatchVideo={indexBatchVideo}
            indexSelectedRowCount={indexSelectedRowIndices.size}
            indexCreateVideoEligibleSelectedCount={createVideoQueueFromSelection.length}
            canRunIndexBatchVideo={canRunIndexBatchVideo}
            indexSingleSelectedRowIndex={indexSingleSelectedRowIndex}
            indexSingleSelectedFolder={indexSingleSelectedFolder}
            onOpenEditSelectedRow={openIndexEditForSingleSelection}
            onOpenDetailSelectedRow={openIndexDetailForSingleSelection}
            indexChannelStatusToggle={indexChannelStatusToggle}
            onChannelStatusToggle={() => void onChannelStatusToggle()}
            uploadEligibleSelectedCount={uploadChannelsFromSelection.length}
            youtubeUploadActiveThreads={youtubeUploadActiveThreads}
            refreshBusy={refreshBusy}
            onOpenCreateVideo={() => setCreateVideoOpen(true)}
            onOpenAddChannel={() => {
              setAddChannelInfo(null);
              setAddChannelOpen(true);
            }}
            onOpenUploadVideo={() => setUploadVideoOpen(true)}
            onUploadToGoogleDrive={() => {
              setGoogleDriveSyncInfo(null);
              void (async () => {
                if (!window.runner?.runNpmScript) {
                  setGoogleDriveSyncInfo('Chỉ chạy đồng bộ Drive trong app Electron.');
                  return;
                }
                setGoogleDriveSyncInfo('Đang chạy đồng bộ Google Drive (MaVidMedia/videos → Drive) trong nền…');
                try {
                  const r = await window.runner.runNpmScript('syncVideosToDrive');
                  if (r.cancelled) {
                    setGoogleDriveSyncInfo('Đồng bộ Google Drive đã bị dừng.');
                    return;
                  }
                  setGoogleDriveSyncInfo('Đồng bộ Google Drive đã xong. Kiểm tra thư mục trên Drive và tab Logs nếu có cảnh báo.');
                } catch (e) {
                  setGoogleDriveSyncInfo(e instanceof Error ? e.message : String(e));
                }
              })();
            }}
            onBackToIndex={() => setSelectedChannel(null)}
            onRefresh={handleRefresh}
            detailUpdateMeta={
              selectedChannel
                ? {
                    canUpdateMeta: Boolean(
                      detailLayout.linkVideoKey && detailLayout.statusKey && typeof window.runner?.runScript === 'function'
                    ),
                    updateMetaBusy: detailUpdateMetaBusy,
                    detailActionsLocked: startMarkingIndex !== null,
                    createdVideoSelectedCount: detailMetaSelectionStats.createdVideoSelectedCount,
                    hasCreatedVideoInSelection: detailMetaSelectionStats.hasCreatedVideoInSelection,
                    onUpdateMeta: () => void handleDetailUpdateMeta(Array.from(detailSelectedRowIndices)),
                  }
                : undefined
            }
            detailBulkVideo={
              selectedChannel && !detailLoading && detailLayout.tableHeaders.length > 0
                ? {
                    actionsLocked: startMarkingIndex !== null || Boolean(indexBatchVideo) || indexLoading,
                    createVideoBusy: Boolean(indexBatchVideo),
                    detailUploadPrepBusy,
                    emptyStatusSelectedCount: detailMetaSelectionStats.emptyStatusSelectedCount,
                    createdVideoSelectedCount: detailMetaSelectionStats.createdVideoWithYoutubeIdCount,
                    canCreateVideo:
                      canRunIndexBatchVideo &&
                      Boolean(detailLayout.linkVideoKey && detailLayout.statusKey) &&
                      Boolean(indexRowForDetailChannel) &&
                      detailMetaSelectionStats.hasEmptyStatusWithLinkInSelection,
                    canUploadVideo:
                      typeof window.runner?.runScript === 'function' &&
                      Boolean(detailLayout.linkVideoKey && detailLayout.statusKey) &&
                      Boolean(indexRowForDetailChannel) &&
                      detailMetaSelectionStats.hasCreatedVideoWithYoutubeIdInSelection,
                    onCreateVideo: () => void runDetailCreateVideoForSelection(),
                    onUploadVideo: runDetailUploadForSelection,
                  }
                : undefined
            }
          />
        }
      />

      {uploadScheduleInfo ? (
        <div
          className='rounded-2xl px-4 py-3 text-base wrap-break-word'
          style={{
            color: 'var(--text-h)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
          }}
        >
          {uploadScheduleInfo}
        </div>
      ) : null}

      {/* {addChannelInfo ? (
        <div
          className='rounded-2xl px-4 py-3 text-base wrap-break-word'
          style={{
            color: 'var(--text-h)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
          }}
        >
          {addChannelInfo}
        </div>
      ) : null} */}

      {googleDriveSyncInfo ? (
        <div
          className='rounded-2xl px-4 py-3 text-base wrap-break-word'
          style={{
            color: 'var(--text-h)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
          }}
        >
          {googleDriveSyncInfo}
        </div>
      ) : null}

      {!selectedChannel ? (
        <>
          <ChannelsIndexSection
            indexHeaders={indexHeaders}
            indexListError={indexListError}
            indexLoading={indexLoading}
            indexSaving={indexSaving}
            indexDraftRows={indexDraftRows}
            pageIndexRows={pageIndexRows}
            indexPag={{
              page: indexPag.page,
              totalPages: indexPag.totalPages,
              setPage: indexPag.setPage,
              pageSize: indexPag.pageSize,
              startIndex: indexPag.startIndex,
            }}
            indexColCount={indexColCount}
            selectedRowIndices={indexSelectedRowIndices}
            onToggleRowSelected={toggleIndexRowSelected}
            onToggleSelectAllOnPage={toggleIndexSelectAllOnPage}
            pageSelectAll={indexPageSelectionFlags.all}
            pageSelectSome={indexPageSelectionFlags.some}
          />

          {indexEditRowIndex !== null && indexDraftRows[indexEditRowIndex] != null && (
            <ChannelAddDialog
              key={`edit-${indexEditRowIndex}`}
              initialRow={indexDraftRows[indexEditRowIndex]}
              indexHeaders={indexHeaders}
              backgroundFolders={indexBackgrounds}
              indexRows={indexDraftRows}
              onClose={closeIndexRowEdit}
              onAdd={async row => {
                if (indexEditRowIndex === null) return;
                const idx = indexEditRowIndex;
                const nextRows = indexDraftRows.map((r, i) => (i === idx ? { ...r, ...row } : r));
                await persistIndexRows(nextRows);
              }}
            />
          )}
        </>
      ) : (
        <ChannelsDetailSection
          detailFileName={detail?.fileName}
          detailLoading={detailLoading}
          detailRowsLength={detail?.rows?.length ?? 0}
          detailLayout={detailLayout}
          showDetailMetaAbove={showDetailMetaAbove}
          detailActionError={detailActionError}
          filterLink={detailLinkFilter}
          onFilterLinkChange={setDetailLinkFilter}
          filterDurationPreset={detailDurationPreset}
          onFilterDurationPresetChange={setDetailDurationPreset}
          filterStatusFixed={detailStatusFilter}
          onFilterStatusFixedChange={setDetailStatusFilter}
          durationSelectOptions={CHANNEL_ADD_DURATION_SELECT_OPTIONS}
          detailTheadHeaders={detailTheadHeaders}
          detailColCount={detailColCount}
          pageDetailRows={pageDetailRows}
          filteredRowsCount={filteredRowsWithIndex.length}
          detailPag={{
            page: detailPageNum,
            totalPages: detailTotalPages,
            setPage: setDetailPage,
            pageSize: detailPageSize,
          }}
          canSetStartFrom={canSetStartFrom}
          startMarkingIndex={startMarkingIndex}
          onSetStartFromRow={handleSetStartFromRow}
          detailSelectedRowIndices={detailSelectedRowIndices}
          onToggleDetailRowSelected={toggleDetailRowSelected}
          detailPageSelectAll={detailPageSelectionFlags.all}
          detailPageSelectSome={detailPageSelectionFlags.some}
          onToggleDetailSelectAllOnPage={toggleDetailSelectAllOnPage}
        />
      )}

      {createVideoOpen ? (
        <ChannelCreateVideoDialog
          selectedRowCount={indexSelectedRowIndices.size}
          eligibleQueueLength={createVideoQueueFromSelection.length}
          onClose={() => setCreateVideoOpen(false)}
          onConfirm={async ({ maxVideosPerBatch }) => {
            if (typeof window.runner?.minimizeApp === 'function') {
              window.runner.minimizeApp();
            }
            await runCreateVideoForQueue(createVideoQueueFromSelection, maxVideosPerBatch);
          }}
        />
      ) : null}

      {uploadVideoOpen ? (
        <ChannelUploadVideoDialog
          channels={uploadChannelsFromSelection}
          selectedRowCount={indexSelectedRowIndices.size}
          activeBackgroundUploadThreads={youtubeUploadActiveThreads}
          onClose={() => setUploadVideoOpen(false)}
          onConfirm={handleYoutubeUploadConfirm}
        />
      ) : null}

      {addChannelOpen ? (
        <ChannelAddDialog
          indexHeaders={indexHeaders}
          indexRows={indexDraftRows}
          backgroundFolders={indexBackgrounds}
          onClose={() => setAddChannelOpen(false)}
          onSaveNewChannel={async payload => {
            if (!window.runner?.runScript) throw new Error('Chỉ chạy trong Electron.');
            await window.runner.runScript('addChannelFromForm', {
              url: payload.channelUrl.trim(),
              formMeta: {
                channels: payload.channels,
                folderIdOverride: payload.folderIdOverride.trim() || undefined,
              },
            });
            await loadIndex();
            setAddChannelInfo(`Đã tạo thư mục kênh, mavid-channel-config.json và cập nhật ${INDEX_FILE}.`);
          }}
        />
      ) : null}
    </div>
  );
}

export default ChannelsPage;
