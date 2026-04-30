import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelData, ChannelFolderDataResult, ChannelRow, Group } from '@/types';
import { scriptDefs } from '@/types';
import { MAX_VIDEOS_PREPARE_AHEAD } from '@contents/constants/appSettings.js';
import { useClientPagination } from '@/hooks/useClientPagination';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChannelAddDialog } from './components/ChannelAddDialog';
import { ChannelCreateVideoDialog } from './components/ChannelCreateVideoDialog';
import { ChannelUploadVideoDialog } from './components/ChannelUploadVideoDialog';
import { fetchAllGpmProfileRows, resolveGpmProfileIdByEmail } from './utils/gpmProfileHelpers';
import { ChannelsDetailSection } from './components/ChannelsDetailSection';
import { DETAIL_TABLE_LOADING_HEADERS } from './models/channelsDetailSectionShared';
import { ChannelsIndexSection } from './components/ChannelsIndexSection';
import { CHANNELS_INDEX_VISIBLE_COLUMNS } from './models/channelsIndexSection.model';
import { ChannelsPageHeaderActions } from './components/ChannelsPageHeaderActions';
import { durationPresetToSecRange, parseDurationToSeconds } from './utils/channelDurationFormat';
import { gpmApi } from '@/services';
import {
  buildExtraEnvForIndexChannelRow,
  CHANNEL_ADD_DURATION_SELECT_OPTIONS,
  channelFolderFromRow,
  extractYoutubeVideoIdFromUrl,
  headerNorm,
  resolveIndexRowVideoType,
  SCRIPT_FROM_AUDIO,
  SCRIPT_REUP_FULL,
} from './utils/channelIndexHelpers';
import {
  convertIndexRowToChannel,
  MAX_CONCURRENT_YOUTUBE_UPLOAD_CHANNELS,
  type ChannelItem,
  type ChannelUploadVideoPayload,
} from './channelUploadVideoHelpers';

const INDEX_FILE = 'channels/index.xlsx';

const indexListFilterInputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors duration-150';

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
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set<string>());
  const [detail, setDetail] = useState<ChannelFolderDataResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLinkFilter, setDetailLinkFilter] = useState('');
  const [detailDurationPreset, setDetailDurationPreset] = useState('0_null');
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>('__all__');
  const [startMarkingIndex, setStartMarkingIndex] = useState<number | null>(null);
  const [detailUpdateMetaBusy, setDetailUpdateMetaBusy] = useState(false);
  const [detailActionError, setDetailActionError] = useState<string | null>(null);
  const [detailUploadPrepBusy, setDetailUploadPrepBusy] = useState(false);

  const [indexBackgrounds, setIndexBackgrounds] = useState<string[]>([]);
  const [indexBatchVideo, setIndexBatchVideo] = useState<{
    current: number;
    total: number;
    channelLabel: string;
  } | null>(null);

  const [indexEditRowIndex, setIndexEditRowIndex] = useState<string | null>(null);
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
  const [groups, setGroups] = useState<Group[]>([]);
  /** Lọc danh sách kênh (bảng index): email + nhóm. */
  const [indexListEmailFilter, setIndexListEmailFilter] = useState('');
  const [indexListGroupFilter, setIndexListGroupFilter] = useState('__all__');

  const groupNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of groups) {
      const id = String(g.id ?? '').trim();
      if (id) m[id] = String(g.name ?? '').trim();
    }
    return m;
  }, [groups]);

  const indexGroupFilterOptions = useMemo(() => {
    const base: { value: string; label: string }[] = [
      { value: '__all__', label: 'Tất cả' },
      { value: '__empty__', label: '— (chưa gán nhóm)' },
    ];
    const seen = new Set(base.map(b => b.value));
    for (const g of groups) {
      const id = String(g.id ?? '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      base.push({
        value: id,
        label: (g.name?.trim() ? g.name.trim() : id) as string,
      });
    }
    return base;
  }, [groups]);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const d = await window.runner.readChannelData(INDEX_FILE);
      setChannels(convertIndexRowToChannel(d.rows));
      setIndexSelectedRowIndices(new Set());
      setIndexEditRowIndex(null);
    } catch {
      setChannels([]);
      setIndexSelectedRowIndices(new Set());
      setIndexEditRowIndex(null);
    } finally {
      setLoading(false);
    }
    try {
      const r = await window.runner?.getMavidGroups?.();
      setGroups(Array.isArray(r?.items) ? r.items : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    window.runner
      .listBackgrounds()
      .then(setIndexBackgrounds)
      .catch(() => setIndexBackgrounds([]));
  }, []);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

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

  // const indexHeaders = useMemo(() => {
  //   if (indexData?.headers?.length) return indexData.headers;
  //   const first = indexData?.rows?.[0];
  //   if (first && typeof first === 'object') return Object.keys(first);
  //   return [...CHANNELS_INDEX_VISIBLE_COLUMNS];
  // }, [indexData]);

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
    [canWriteIndex, indexHeaders, loadIndex],
  );

  type IndexCreateVideoQueueEntry = {
    row: ChannelRow;
    folder: string;
    email: string;
    videoType: 'from_audio' | 'reup_full';
    /** Chỉ số dòng trong `indexDraftRows` — khớp checkbox bảng index. */
    draftRowIndex: number;
  };

  const indexCreateVideoQueue = useMemo((): IndexCreateVideoQueueEntry[] => {
    const queue: IndexCreateVideoQueueEntry[] = [];
    for (let i = 0; i < indexDraftRows.length; i++) {
      const row = indexDraftRows[i];
      const folder = channelFolderFromRow(row);
      const email = String(row.email ?? '').trim();
      const videoType = resolveIndexRowVideoType(row);
      // Tạo video: Khi render queue gốc thì không bắt buộc có email
      if (folder && videoType) {
        queue.push({
          row,
          folder,
          email,
          videoType: videoType as 'from_audio' | 'reup_full',
          draftRowIndex: i,
        });
      }
    }
    return queue;
  }, [indexDraftRows]);

  const createVideoQueueFromSelection = useMemo(() => {
    if (indexSelectedRowIndices.size === 0) {
      // Nếu không select dòng nào: tạo cho TẤT CẢ các dòng CÓ EMAIL
      return indexCreateVideoQueue.filter(q => q.email !== '');
    }
    // Nếu CÓ select dòng: chỉ tạo cho các dòng được select (KHÔNG cần quan tâm đến email, thư mục + loại video đã được check ở queue gốc)
    return indexCreateVideoQueue.filter(q => indexSelectedRowIndices.has(q.draftRowIndex));
  }, [indexCreateVideoQueue, indexSelectedRowIndices]);

  /** Dòng index khớp thư mục đang xem chi tiết — cần cho Tạo video / Upload từ chi tiết. */
  const indexRowForDetailChannel = useMemo((): IndexCreateVideoQueueEntry | null => {
    if (!selectedChannel?.trim()) return null;
    const target = selectedChannel.trim();
    for (let i = 0; i < indexDraftRows.length; i++) {
      const row = indexDraftRows[i];
      const folder = channelFolderFromRow(row);
      if (!folder?.trim() || folder.trim() !== target) continue;
      const videoType = resolveIndexRowVideoType(row);
      if (videoType !== 'from_audio' && videoType !== 'reup_full') return null;
      return {
        row,
        folder: folder.trim(),
        email: String(row.email ?? '').trim(),
        videoType,
        draftRowIndex: i,
      };
    }
    return null;
  }, [selectedChannel, indexDraftRows]);

  const indexSingleSelectedRowIndex = useMemo((): number | null => {
    if (indexSelectedRowIndices.size !== 1) return null;
    const [only] = indexSelectedRowIndices;
    return only ?? null;
  }, [indexSelectedRowIndices]);

  const indexSingleSelectedFolder = useMemo(() => {
    if (indexSingleSelectedRowIndex == null) return null;
    const row = indexDraftRows[indexSingleSelectedRowIndex];
    if (!row) return null;
    return channelFolderFromRow(row);
  }, [indexSingleSelectedRowIndex, indexDraftRows]);

  const indexChannelStatusToggle = useMemo(() => {
    if (indexSingleSelectedRowIndex == null) {
      return {
        nextStatus: null as 'LIVE' | 'STOPPED' | null,
        label: 'ACTIVE / DEACTIVE',
        enabled: false,
        title: 'Chọn đúng một dòng trên bảng (checkbox).',
      };
    }
    const hasStatus = indexHeaders.includes('status');
    if (!hasStatus) {
      return {
        nextStatus: null as 'LIVE' | 'STOPPED' | null,
        label: 'ACTIVE / DEACTIVE',
        enabled: false,
        title: 'File index chưa có cột STATUS. Cập nhật index (Thêm channel / script getInfoChannel) hoặc thêm cột STATUS ở cuối sheet.',
      };
    }
    const raw = String(indexDraftRows[indexSingleSelectedRowIndex]?.status ?? '')
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
    const hasStatusCol = indexHeaders.includes('status');
    const headersOut = hasStatusCol ? [...indexHeaders] : [...indexHeaders, 'status'];

    const nextRows = indexDraftRows.map((r, i) => {
      const copy: ChannelRow = { ...r };
      for (const h of headersOut) {
        if (copy[h] === undefined || copy[h] === null) copy[h] = '';
      }
      if (i === rowIdx) copy.status = nextStatus;
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

          const baseEnv = buildExtraEnvForIndexChannelRow(row, folder, videoType, bgList, {
            maxVideosPerBatch,
          });
          const extraEnv =
            opts?.onlyLinks?.length && queue.length === 1 ? { ...baseEnv, MAVID_ONLY_LINKS: JSON.stringify(opts.onlyLinks) } : baseEnv;
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
              : `Một số kênh lỗi (${failures.length}/${queue.length}): ${failures.slice(0, 4).join(' ')}${failures.length > 4 ? '…' : ''}`,
          );
        }
      } finally {
        setIndexBatchVideo(null);
      }
    },
    [indexBackgrounds],
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
    const tableHeaders = linkVideoKey && rest.includes(linkVideoKey) ? [linkVideoKey, ...rest.filter(h => h !== linkVideoKey)] : rest;

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

  const indexFilteredIndices = useMemo(() => {
    const emailQ = indexListEmailFilter.trim().toLowerCase();
    const groupF = indexListGroupFilter;
    const out: number[] = [];
    for (let i = 0; i < indexDraftRows.length; i++) {
      const row = indexDraftRows[i];
      if (emailQ) {
        const e = String(row.email ?? '').toLowerCase();
        if (!e.includes(emailQ)) continue;
      }
      if (groupF !== '__all__') {
        const gid = String(row.mavidGroupId ?? '').trim();
        if (groupF === '__empty__') {
          if (gid) continue;
        } else if (gid !== groupF) continue;
      }
      out.push(i);
    }
    return out;
  }, [indexDraftRows, indexListEmailFilter, indexListGroupFilter]);

  const {
    page: indexPage,
    setPage: setIndexPage,
    startIndex: indexStartIndex,
    totalPages: indexTotalPages,
    pageSize: indexPageSize,
  } = useClientPagination(channels.length);

  useEffect(() => {
    setIndexPage(1);
  }, [indexListEmailFilter, indexListGroupFilter, setIndexPage]);

  const pageIndexGlobalIndices = useMemo(
    () => channels.slice(indexStartIndex, indexStartIndex + indexPageSize),
    [channels, indexStartIndex, indexPageSize],
  );

  const pageIndexRows = useMemo(
    () => channels.slice(indexStartIndex, indexStartIndex + indexPageSize),
    [channels, indexStartIndex, indexPageSize],
  );

  const indexPageSelectionFlags = useMemo(() => {
    const all = pageIndexRows.length > 0 && pageIndexRows.every(row => selectedRows.has(row.id));
    const some = pageIndexRows.some(row => selectedRows.has(row.id));
    return { all, some };
  }, [pageIndexRows, selectedRows]);

  const toggleIndexRowSelected = useCallback((rowId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const toggleIndexSelectAllOnPage = useCallback(() => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      const allSelected = pageIndexRows.length > 0 && pageIndexRows.every(pageRow => next.has(pageRow.id));
      if (allSelected) pageIndexRows.forEach(pageRow => next.delete(pageRow.id));
      else pageIndexRows.forEach(pageRow => next.add(pageRow.id));
      return next;
    });
  }, [pageIndexRows]);

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
    [filteredRowsWithIndex, detailStartIndex, detailPageSize],
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
        const okLink = (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('(Không có video)');
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
    [selectedChannel, detail?.rows, detailLayout.linkVideoKey, detailLayout.statusKey],
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
      await fetchChannels();
    }
  }

  const refreshBusy = selectedChannel ? detailLoading : loading;
  const hasIndexRows = channels.length > 0;

  /** Kênh có ID + EMAIL trong các dòng đã tick hoặc tất cả dòng nếu không tick (popup Upload video). */
  const uploadChannelsFromSelection = useMemo((): ChannelItem[] => {
    const map = new Map<string, Set<string>>();

    // Nếu không chọn dòng nào, lấy toàn bộ dòng có email
    const activeIndices =
      indexSelectedRowIndices.size > 0 ? Array.from(indexSelectedRowIndices) : Array.from({ length: indexDraftRows.length }, (_, i) => i);

    for (const idx of activeIndices) {
      const row = indexDraftRows[idx];
      if (!row) continue;
      const f = channelFolderFromRow(row);
      if (!f?.trim()) continue;
      const emailRaw = String(row.email ?? '').trim();
      if (!emailRaw) continue; // Upload luôn yêu cầu có email

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
  }, [indexDraftRows, indexSelectedRowIndices]);

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
        `Bỏ qua ${uniq.length} email đang upload trên luồng khác: ${uniq.join(', ')}. Chờ xong rồi mới chạy lại cho các email đó.`,
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
          `${skipNote}Upload YouTube (${claimed.length} kênh, tối đa ${MAX_CONCURRENT_YOUTUBE_UPLOAD_CHANNELS} song song): ${parts.join(
            ' — ',
          )}. Kiểm tra GPM / YouTube Studio và tab Logs.`,
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
      setDetailActionError('Không tìm thấy kênh này trong index.xlsx (hoặc thiếu LOẠI VIDEO from_audio / reup_full).');
      return;
    }
    const onlyLinks: string[] = [];
    for (const i of detailSelectedRowIndices) {
      const row = detail.rows[i];
      if (!row) continue;
      if (!isDetailRowStatusEmpty(row[sk])) continue;
      const url = String(row[lk] ?? '').trim();
      if (!url || !(url.startsWith('http://') || url.startsWith('https://')) || url.includes('(Không có video)')) {
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
    const email = String(indexRowForDetailChannel.row.email ?? '').trim();
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
            loading={loading}
            indexBatchVideo={indexBatchVideo}
            indexSelectedRowCount={indexSelectedRowIndices.size}
            indexCreateVideoEligibleSelectedCount={createVideoQueueFromSelection.length}
            canRunIndexBatchVideo={canRunIndexBatchVideo}
            indexSingleSelectedRowIndex={indexSingleSelectedRowIndex}
            indexSingleSelectedFolder={indexSingleSelectedFolder}
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
                      detailLayout.linkVideoKey && detailLayout.statusKey && typeof window.runner?.runScript === 'function',
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
                    actionsLocked: startMarkingIndex !== null || loading,
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
          <div
            className='rounded-2xl p-4 w-full min-w-0 space-y-3'
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <div className='text-sm font-medium uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>
              Tìm & lọc
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-end'>
              <label className='block min-w-0'>
                <span className='block text-sm mb-2' style={{ color: 'var(--text-h)' }}>
                  Email
                </span>
                <input
                  type='search'
                  value={indexListEmailFilter}
                  onChange={e => setIndexListEmailFilter(e.target.value)}
                  placeholder='Tìm trong email kênh…'
                  autoComplete='off'
                  className={indexListFilterInputClass}
                  style={{
                    background: 'var(--code-bg)',
                    color: 'var(--text-h)',
                    borderColor: 'var(--border)',
                  }}
                />
              </label>
              <div className='min-w-0'>
                <div className='text-sm mb-2' style={{ color: 'var(--text-h)' }}>
                  Nhóm
                </div>
                <CustomSelect
                  value={indexListGroupFilter}
                  options={indexGroupFilterOptions}
                  onChange={setIndexListGroupFilter}
                  placeholder='Nhóm'
                  menuZIndex={100}
                />
              </div>
            </div>
          </div>

          <ChannelsIndexSection
            channels={channels}
            loading={loading}
            pageIndexRows={pageIndexRows}
            indexFilteredCount={indexFilteredIndices.length}
            groupNameById={groupNameById}
            indexPag={{
              page: indexPage,
              totalPages: indexTotalPages,
              setPage: setIndexPage,
              pageSize: indexPageSize,
              startIndex: indexStartIndex,
            }}
            indexColCount={indexColCount}
            selectedRows={selectedRows}
            onToggleRowSelected={toggleIndexRowSelected}
            onToggleSelectAllOnPage={toggleIndexSelectAllOnPage}
            onOpenEditRow={id => setIndexEditRowIndex(id)}
            onOpenDetailRow={id => {
              const row = channels.find(r => r.id === id);
              if (row) {
                const folder = channelFolderFromRow(row);
                if (folder?.trim()) setSelectedChannel(folder.trim());
              }
            }}
            pageSelectAll={indexPageSelectionFlags.all}
            pageSelectSome={indexPageSelectionFlags.some}
          />

          {indexEditRowIndex !== null && (
            <ChannelAddDialog
              key={`edit-${indexEditRowIndex}`}
              initialRow={pageIndexRows.find(r => r.id === indexEditRowIndex)}
              backgroundFolders={indexBackgrounds}
              onClose={() => setIndexEditRowIndex(null)}
              onAdd={async row => {
                if (indexEditRowIndex === null) return;
                const idx = indexEditRowIndex;
                // const nextRows = pageIndexRows.map((r, i) => (i === idx ? { ...r, ...row } : r));
                // const headersForSave = indexHeaders.includes('mavidGroupId') ? indexHeaders : [...indexHeaders, 'mavidGroupId'];
                // await persistIndexRows(nextRows, headersForSave);
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
          targetChannelFolder={createVideoQueueFromSelection.length === 1 ? createVideoQueueFromSelection[0].folder : undefined}
          onClose={() => setCreateVideoOpen(false)}
          onConfirm={async ({ maxVideosPerBatch, selectedEmail }) => {
            if (typeof window.runner?.minimizeApp === 'function') {
              window.runner.minimizeApp();
            }
            let queue = createVideoQueueFromSelection;
            if (selectedEmail && queue.length === 1) {
              queue = [{ ...queue[0], email: selectedEmail }];
            }
            await runCreateVideoForQueue(queue, maxVideosPerBatch);
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
            console.log('🚀 ~ ChannelsPage ~ payload:', payload);
            if (!window.runner?.runScript) throw new Error('Chỉ chạy trong Electron.');
            await window.runner.runScript('addChannelFromForm', {
              formData: payload,
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
