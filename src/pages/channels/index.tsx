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
  convertChannelVideosRowToData,
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

type IndexCreateVideoQueueEntry = {
  row: ChannelRow;
  folder: string;
  email: string;
  videoType: 'from_audio' | 'reup_full';
  /** Chỉ số dòng trong `indexDraftRows` — khớp checkbox bảng index. */
  draftRowIndex: number;
};

function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set<string>());
  const [detail, setDetail] = useState<ChannelFolderDataResult | null>(null);
  const [channelVideos, setChannelVideos] = useState<ChannelRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLinkFilter, setDetailLinkFilter] = useState('');
  const [detailDurationPreset, setDetailDurationPreset] = useState('0_null');
  const [detailStatusFilter, setDetailStatusFilter] = useState<string>('__all__');
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
  const [mappingStatus, setMappingStatus] = useState<{ type: 'edit' | 'add'; data: ChannelRow | null } | null>(null);

  const canRunNpmScript = typeof window.runner?.runNpmScript === 'function';

  const selectedChannelRow = useMemo(() => {
    if (!selectedChannel) return null;

    return channels.find(r => r.id === selectedChannel);
  }, [selectedChannel, channels]);

  const {
    page: indexPage,
    setPage: setIndexPage,
    startIndex: indexStartIndex,
    totalPages: indexTotalPages,
    pageSize: indexPageSize,
  } = useClientPagination(channels.length);

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
      setSelectedRows(new Set());
    } catch {
      setChannels([]);
      setSelectedRows(new Set());
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

  const loadDetail = useCallback(
    async (id: string) => {
      console.log('🚀 ~ ChannelsPage ~ id:', id);
      setDetailLoading(true);
      setChannelVideos([]);
      try {
        const selectedChannelFolder = channels.find(r => r.id === id)?.channelId;
        if (!selectedChannelFolder) return;

        const d = await window.runner.readChannelFolderData(selectedChannelFolder);
        setChannelVideos(convertChannelVideosRowToData(d.rows));
      } catch {
        setChannelVideos([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [channels],
  );

  useEffect(() => {
    if (selectedChannel) {
      void loadDetail(selectedChannel);
    } else {
      setChannelVideos([]);
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

  /** Checkbox + các cột cố định (`CHANNELS_INDEX_VISIBLE_COLUMNS`) trên bảng index. */
  const indexColCount = 1 + CHANNELS_INDEX_VISIBLE_COLUMNS.length;

  const [detailSelectedRowIndices, setDetailSelectedRowIndices] = useState<Set<string>>(() => new Set());

  const createVideoQueueFromSelection = useMemo(() => {
    if (selectedRows.size === 0) {
      // Nếu không select dòng nào: tạo cho TẤT CẢ các dòng CÓ EMAIL
      return channels.filter(channel => channel.email !== '');
    }
    // Nếu CÓ select dòng: chỉ tạo cho các dòng được select (KHÔNG cần quan tâm đến email, thư mục + loại video đã được check ở queue gốc)
    return channels.filter(channel => selectedRows.has(channel.id));
  }, [channels, selectedRows]);

  const indexSingleSelectedRowIndex = useMemo((): number | null => {
    if (selectedRows.size !== 1) return null;
    const [only] = Array.from(selectedRows)[0];
    return only ? parseInt(only, 10) : null;
  }, [selectedRows]);

  const runCreateVideoForQueue = useCallback(async (queue: ChannelRow[], maxVideosPerBatch: number) => {
    if (!window.runner?.runNpmScript) {
      return;
    }

    const failures: string[] = [];

    try {
      for (let i = 0; i < queue.length; i++) {
        const { videoType, channelId, id, videos } = queue[i];
        setIndexBatchVideo({ current: i + 1, total: queue.length, channelLabel: channelId });
        const def = scriptDefs.find(s => s.id === (videoType === 'reup_full' ? SCRIPT_REUP_FULL : SCRIPT_FROM_AUDIO));
        if (!def) {
          continue;
        }

        const baseEnv = buildExtraEnvForIndexChannelRow(id, channelId, videos, maxVideosPerBatch);
        try {
          const res = await window.runner.runNpmScript(def.npmScript, baseEnv);
          if (res.cancelled) {
            console.log(`Đã dừng sau kênh ${channelId} (${i + 1}/${queue.length}).`);
            return;
          }
          if (res.code !== 0) failures.push(`${channelId}: thoát mã ${res.code}.`);
        } catch (e) {
          failures.push(`${channelId}: ${e instanceof Error ? e.message : 'lỗi'}.`);
        }
      }

      if (failures.length > 0) {
        console.log(
          failures.length === queue.length
            ? `Tất cả ${failures.length} kênh lỗi: ${failures.slice(0, 3).join(' ')}${failures.length > 3 ? '…' : ''}`
            : `Một số kênh lỗi (${failures.length}/${queue.length}): ${failures.slice(0, 4).join(' ')}${failures.length > 4 ? '…' : ''}`,
        );
      }
    } finally {
      setIndexBatchVideo(null);
    }
  }, []);

  const filteredRowsWithIndex = useMemo(() => {
    if (!channelVideos.length) return [];

    const linkQ = detailLinkFilter.trim().toLowerCase();
    const durRange = durationPresetToSecRange(detailDurationPreset);
    return channelVideos.filter(row => {
      if (linkQ) {
        const url = String(row.link ?? '').toLowerCase();
        if (!url.includes(linkQ)) return false;
      }
      if (durRange) {
        const sec = parseDurationToSeconds(String(row.duration ?? ''));
        if (sec == null || sec < durRange.min || sec > durRange.max) return false;
      }
      if (detailStatusFilter !== '__all__') {
        const s = String(row.status ?? '').trim();
        if (s !== detailStatusFilter) return false;
      }
      return true;
    });
  }, [channelVideos, detailLinkFilter, detailDurationPreset, detailStatusFilter]);

  const indexFilteredIndices = useMemo(() => {
    const emailQ = indexListEmailFilter.trim().toLowerCase();
    const groupF = indexListGroupFilter;
    const out: number[] = [];
    for (let i = 0; i < channels.length; i++) {
      const row = channels[i];
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
  }, [channels, indexListEmailFilter, indexListGroupFilter]);

  useEffect(() => {
    setIndexPage(1);
  }, [indexListEmailFilter, indexListGroupFilter, setIndexPage]);

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
    const all = pageDetailRows.length > 0 && pageDetailRows.every(row => detailSelectedRowIndices.has(row.link));
    const some = pageDetailRows.some(row => detailSelectedRowIndices.has(row.link));
    return { all, some };
  }, [pageDetailRows, detailSelectedRowIndices]);

  const toggleDetailSelectAllOnPage = useCallback(() => {
    setDetailSelectedRowIndices(prev => {
      const next = new Set(prev);
      const allSelected = pageDetailRows.length > 0 && pageDetailRows.every(row => next.has(row.link));
      if (allSelected) pageDetailRows.forEach(row => next.delete(row.link));
      else pageDetailRows.forEach(row => next.add(row.link));
      return next;
    });
  }, [pageDetailRows]);

  const toggleDetailRowSelected = useCallback((originalRowLink: string) => {
    setDetailSelectedRowIndices(prev => {
      const next = new Set(prev);
      if (next.has(originalRowLink)) next.delete(originalRowLink);
      else next.add(originalRowLink);
      return next;
    });
  }, []);

  const detailMetaSelectionStats = useMemo(() => {
    if (!channelVideos?.length) {
      return {
        hasCreatedVideoInSelection: false,
        createdVideoSelectedCount: 0,
        emptyStatusSelectedCount: 0,
        hasEmptyStatusWithLinkInSelection: false,
        createdVideoWithYoutubeIdCount: 0,
        hasCreatedVideoWithYoutubeIdInSelection: false,
      };
    }
    let hasCreatedVideoInSelection = false;
    let createdVideoSelectedCount = 0;
    let emptyStatusSelectedCount = 0;
    let hasEmptyStatusWithLinkInSelection = false;
    let createdVideoWithYoutubeIdCount = 0;
    let hasCreatedVideoWithYoutubeIdInSelection = false;

    if (detailSelectedRowIndices.size === 0) {
      for (const row of channelVideos) {
        const status = String(row.status ?? '').trim();
        if (status === DETAIL_STATUS_VIDEO_CREATED) {
          hasCreatedVideoInSelection = true;
          createdVideoSelectedCount += 1;
          const url = String(row.link ?? '').trim();
          if (extractYoutubeVideoIdFromUrl(url)) {
            createdVideoWithYoutubeIdCount += 1;
            hasCreatedVideoWithYoutubeIdInSelection = true;
          }
        }
        if (isDetailRowStatusEmpty(row.status)) {
          emptyStatusSelectedCount += 1;
          hasEmptyStatusWithLinkInSelection = true;
        }
      }
    } else {
      for (const link of detailSelectedRowIndices) {
        const row = channelVideos.find(r => r.link === link);
        if (!row) continue;
        const st = String(row.status ?? '').trim();
        if (st === DETAIL_STATUS_VIDEO_CREATED) {
          hasCreatedVideoInSelection = true;
          createdVideoSelectedCount += 1;
          const url = String(row.link ?? '').trim();
          if (extractYoutubeVideoIdFromUrl(url)) {
            createdVideoWithYoutubeIdCount += 1;
            hasCreatedVideoWithYoutubeIdInSelection = true;
          }
        }
        if (isDetailRowStatusEmpty(row.status)) {
          const url = String(row.link ?? '').trim();
          const okLink = (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('(Không có video)');
          if (okLink) {
            emptyStatusSelectedCount += 1;
            hasEmptyStatusWithLinkInSelection = true;
          }
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
  }, [channelVideos, detailSelectedRowIndices]);

  const handleDetailUpdateMeta = useCallback(async () => {
    if (!selectedChannel || !channelVideos?.length) return;
    const selectedChannelFolder = channels.find(r => r.id === selectedChannel)?.channelId;
    if (!selectedChannelFolder) return;

    const items: { url: string }[] = [];

    if (detailSelectedRowIndices.size === 0) {
      for (const row of channelVideos) {
        const status = String(row.status ?? '').trim();
        if (status !== DETAIL_STATUS_VIDEO_CREATED) continue;
        const url = String(row.link ?? '').trim();
        if (url) items.push({ url });
      }
    } else {
      for (const link of detailSelectedRowIndices) {
        const row = channelVideos.find(r => r.link === link);
        if (!row) continue;
        const status = String(row.status ?? '').trim();
        if (status !== DETAIL_STATUS_VIDEO_CREATED) continue;
        const url = String(row.link ?? '').trim();
        if (url) items.push({ url });
      }
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
        channelFolder: selectedChannelFolder,
        channelId: selectedChannel,
        items,
      });
    } catch (e) {
      setDetailActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailUpdateMetaBusy(false);
    }
  }, [selectedChannel, channelVideos, detailSelectedRowIndices, channels]);

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
  const uploadChannelsFromSelection = useMemo((): ChannelRow[] => {
    const selectedChannels = selectedRows.size > 0 ? channels.filter(channel => selectedRows.has(channel.id)) : channels;

    return selectedChannels.filter(channel => channel.email !== '');
  }, [channels, selectedRows]);

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
    if (!selectedChannel || !channelVideos?.length) return;

    const selectedChannelRow = channels.find(r => r.id === selectedChannel);

    const onlyLinks: string[] = [];
    for (const link of detailSelectedRowIndices) {
      const row = channelVideos.find(r => r.link === link);
      if (!row) continue;

      if (!isDetailRowStatusEmpty(row.status)) continue;

      const url = String(row.link ?? '').trim();
      if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) {
        continue;
      }
      onlyLinks.push(url);
    }

    setDetailActionError(null);
    if (typeof window.runner?.minimizeApp === 'function') {
      window.runner.minimizeApp();
    }

    await runCreateVideoForQueue(
      [
        {
          ...selectedChannelRow,
          videos: onlyLinks,
        },
      ],
      defaultMaxVideosPerBatchDetail,
    );
  }, [selectedChannel, channelVideos, detailSelectedRowIndices, channels, defaultMaxVideosPerBatchDetail, runCreateVideoForQueue]);

  const runDetailUploadForSelection = useCallback(async () => {
    if (!selectedChannel || !channelVideos?.length) return;

    const uploadFolderNames: string[] = [];
    for (const link of detailSelectedRowIndices) {
      const row = channelVideos.find(r => r.link === link);
      if (!row) continue;
      if (String(row.status ?? '').trim() !== DETAIL_STATUS_VIDEO_CREATED) continue;
      const id = extractYoutubeVideoIdFromUrl(String(row.link ?? '').trim());
      if (id) uploadFolderNames.push(id);
    }

    if (uploadFolderNames.length === 0) {
      setDetailActionError('Chọn ít nhất một dòng «Đã tạo video» có link YouTube dạng watch (?v=…).');
      return;
    }

    const selectedChannelRow = channels.find(r => r.id === selectedChannel);
    const email = String(selectedChannelRow?.email ?? '').trim();

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
          channelFolder: selectedChannelRow?.channelId,
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
  }, [selectedChannel, channelVideos, channels, detailSelectedRowIndices, handleYoutubeUploadConfirm]);

  const handleOpenEditRow = useCallback(
    async (id: string) => {
      const selectedChannel = channels.find(r => r.id === id);

      if (!selectedChannel) return;

      try {
        const cfg = await window.runner.readMavidChannelConfig(selectedChannel.channelId);
        if (!cfg || typeof cfg !== 'object' || !Array.isArray(cfg.channels)) return;

        const configChannel = cfg.channels.find(c => c.id === selectedChannel.id) || {};
        const { durationMinuteFrom, durationMinuteTo, uploadedVideos, latestUploadDate, latestUploadTime, ...rest } = configChannel;

        setMappingStatus({
          type: 'edit',
          data: {
            ...selectedChannel,
            ...rest,
          },
        });
      } catch (e) {
        setMappingStatus(null);
      }
    },
    [channels],
  );

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        align='start'
        title='Channels'
        actions={
          <ChannelsPageHeaderActions
            selectedChannel={selectedChannel}
            hasIndexRows={hasIndexRows}
            loading={loading}
            indexBatchVideo={indexBatchVideo}
            indexSelectedRowCount={selectedRows.size}
            indexCreateVideoEligibleSelectedCount={createVideoQueueFromSelection.length}
            canRunIndexBatchVideo={canRunNpmScript}
            indexSingleSelectedRowIndex={indexSingleSelectedRowIndex}
            indexSingleSelectedFolder={selectedChannel}
            uploadEligibleSelectedCount={uploadChannelsFromSelection.length}
            youtubeUploadActiveThreads={youtubeUploadActiveThreads}
            refreshBusy={refreshBusy}
            onOpenCreateVideo={() => setCreateVideoOpen(true)}
            onOpenAddChannel={() => {
              setMappingStatus({
                type: 'add',
                data: null,
              });
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
                    updateMetaBusy: detailUpdateMetaBusy,
                    createdVideoSelectedCount: detailMetaSelectionStats.createdVideoSelectedCount,
                    hasCreatedVideoInSelection: detailMetaSelectionStats.hasCreatedVideoInSelection,
                    onUpdateMeta: () => void handleDetailUpdateMeta(),
                  }
                : undefined
            }
            detailBulkVideo={
              selectedChannel && !detailLoading
                ? {
                    createVideoBusy: Boolean(indexBatchVideo),
                    detailUploadPrepBusy,
                    emptyStatusSelectedCount: detailMetaSelectionStats.emptyStatusSelectedCount,
                    createdVideoSelectedCount: detailMetaSelectionStats.createdVideoWithYoutubeIdCount,
                    canCreateVideo: canRunNpmScript && detailMetaSelectionStats.hasEmptyStatusWithLinkInSelection,
                    canUploadVideo: detailMetaSelectionStats.hasCreatedVideoWithYoutubeIdInSelection,
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

      {!selectedChannelRow ? (
        <>
          {/* <div
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
          </div> */}

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
            onOpenEditRow={handleOpenEditRow}
            onOpenDetailRow={id => {
              const row = channels.find(r => r.id === id);
              if (row) {
                setSelectedChannel(row.id);
              }
            }}
            pageSelectAll={indexPageSelectionFlags.all}
            pageSelectSome={indexPageSelectionFlags.some}
          />
        </>
      ) : (
        <ChannelsDetailSection
          channel={selectedChannelRow}
          detailLoading={detailLoading}
          detailRowsLength={filteredRowsWithIndex.length}
          detailActionError={detailActionError}
          filterLink={detailLinkFilter}
          onFilterLinkChange={setDetailLinkFilter}
          filterDurationPreset={detailDurationPreset}
          onFilterDurationPresetChange={setDetailDurationPreset}
          filterStatusFixed={detailStatusFilter}
          onFilterStatusFixedChange={setDetailStatusFilter}
          durationSelectOptions={CHANNEL_ADD_DURATION_SELECT_OPTIONS}
          // detailColCount={detailColCount}
          detailColCount={1}
          pageDetailRows={pageDetailRows}
          detailPag={{
            page: detailPageNum,
            totalPages: detailTotalPages,
            setPage: setDetailPage,
            pageSize: detailPageSize,
          }}
          detailSelectedRowIndices={detailSelectedRowIndices}
          onToggleDetailRowSelected={toggleDetailRowSelected}
          detailPageSelectAll={detailPageSelectionFlags.all}
          detailPageSelectSome={detailPageSelectionFlags.some}
          onToggleDetailSelectAllOnPage={toggleDetailSelectAllOnPage}
        />
      )}

      {createVideoOpen ? (
        <ChannelCreateVideoDialog
          selectedRowCount={selectedRows.size}
          eligibleQueueLength={createVideoQueueFromSelection.length}
          targetChannelFolder={createVideoQueueFromSelection.length === 1 ? createVideoQueueFromSelection[0].folder : undefined}
          onClose={() => setCreateVideoOpen(false)}
          onConfirm={async ({ maxVideosPerBatch, selectedEmail }) => {
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
          selectedRowCount={selectedRows.size}
          activeBackgroundUploadThreads={youtubeUploadActiveThreads}
          onClose={() => setUploadVideoOpen(false)}
          onConfirm={handleYoutubeUploadConfirm}
        />
      ) : null}

      {(mappingStatus?.type === 'edit' || mappingStatus?.type === 'add') && (
        <ChannelAddDialog
          channels={channels}
          initialRow={mappingStatus.data}
          backgroundOptions={indexBackgrounds}
          onClose={() => setMappingStatus(null)}
          onMapping={async payload => {
            if (!window.runner?.runScript) throw new Error('Chỉ chạy trong Electron.');
            await window.runner.runScript('addChannelFromForm', {
              formData: payload,
            });

            await fetchChannels();
          }}
        />
      )}
    </div>
  );
}

export default ChannelsPage;
