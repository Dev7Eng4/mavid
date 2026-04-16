import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelFolderDataResult, ChannelRow } from '@/types';
import { scriptDefs } from '@/types';
import { MAX_VIDEOS_PREPARE_AHEAD } from '@contents/constants/appSettings.js';
import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { RefreshIcon, SpinnerIcon } from '@/components/ui/Icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import { useClientPagination } from '@/hooks/useClientPagination';
import {
  fetchAllGpmProfileRows,
  resolveGpmProfileIdByEmail,
  type ChannelUploadVideoPayload,
} from '@/pages/channels/ChannelUploadVideoDialog';
import { gpmApi } from '@/services';
import { durationPresetToSecRange, parseDurationToSeconds } from '@/pages/channels/channelDurationFormat';
import { DETAIL_STATUS_FILTER_OPTIONS } from '@/pages/channels/channelsDetailSectionShared';
import {
  buildExtraEnvForIndexChannelRow,
  CHANNEL_ADD_DURATION_SELECT_OPTIONS,
  extractYoutubeVideoIdFromUrl,
  findIndexHeaderKey,
  headerNorm,
  resolveIndexRowVideoType,
  SCRIPT_FROM_AUDIO,
  SCRIPT_REUP_FULL,
} from '../utils/channelIndexHelpers';
import { DETAIL_PAGE_SIZE, VIDEO_MAKE_TYPE, VIDEO_STATUS } from '../constants';

const searchInputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors duration-150';

function isDetailRowStatusEmpty(raw: unknown): boolean {
  const s = String(raw ?? '').trim();
  if (!s) return true;
  return s.toLowerCase() === 'empty';
}

function normalizeYoutubeUploadEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

export interface ListVideoDetailProps {
  /** Một dòng từ bảng index (Tạo video) — cần cột `ID` để đọc thư mục kênh. */
  row: ChannelRow;
  /** Header index (đủ cột như file `index.xlsx`) — dùng cho `buildExtraEnvForIndexChannelRow` / EMAIL. */
  indexHeaders: string[];
  /** Quay về trang danh sách kênh (index). */
  onBack: VoidFunction;
}

/**
 * Trang đọc file Excel/CSV đầu tiên trong `MaVidMedia/channels/<ID>/` và hiển thị danh sách video (dòng dữ liệu).
 */
export function ListVideoDetail({ row, indexHeaders, onBack }: ListVideoDetailProps) {
  const channelFolder = useMemo(() => String(row['ID'] ?? '').trim(), [row]);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ChannelFolderDataResult | null>(null);
  /** Chỉ số dòng trong toàn bộ `rows` (0-based). */
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set());
  const headerSelectRef = useRef<HTMLInputElement>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<string | null>(null);
  const [createVideoBusy, setCreateVideoBusy] = useState(false);
  const [updateMetaBusy, setUpdateMetaBusy] = useState(false);
  const [uploadPrepBusy, setUploadPrepBusy] = useState(false);
  const [youtubeUploadThreads, setYoutubeUploadThreads] = useState(0);
  const uploadingYoutubeEmailsRef = useRef(new Set<string>());

  const [filterLink, setFilterLink] = useState('');
  const [filterDurationPreset, setFilterDurationPreset] = useState('0_null');
  const [filterStatusFixed, setFilterStatusFixed] = useState('__all__');

  const indexChannelEntry = useMemo(() => {
    const folder = channelFolder.trim();
    const videoType = resolveIndexRowVideoType(row, indexHeaders);
    if (!folder || (videoType !== VIDEO_MAKE_TYPE.FROM_AUDIO && videoType !== VIDEO_MAKE_TYPE.REUP_FULL)) return null;
    return { row, folder, videoType: videoType as 'from_audio' | 'reup_full' };
  }, [row, indexHeaders, channelFolder]);

  const defaultMaxVideosPerBatch = useMemo(() => {
    const n = Number(MAX_VIDEOS_PREPARE_AHEAD);
    if (!Number.isFinite(n)) return 1;
    return Math.min(100, Math.max(1, Math.trunc(n)));
  }, []);

  const detailLayout = useMemo(() => {
    if (!detail) {
      return {
        linkVideoKey: undefined as string | undefined,
        statusKey: undefined as string | undefined,
        durationKey: undefined as string | undefined,
        tableHeaders: [] as string[],
      };
    }
    const hdrs = detail.headers.length > 0 ? detail.headers : detail.rows[0] ? Object.keys(detail.rows[0]) : [];
    const findKey = (name: string) => hdrs.find(h => headerNorm(h) === headerNorm(name));
    const skip = new Set([findKey('EMAIL'), findKey('CHANNEL NAME'), findKey('CHANNEL TAGS')].filter(Boolean) as string[]);
    const rest = hdrs.filter(h => !skip.has(h));
    const linkVideoKey = findKey('LINK VIDEO');
    const tableHeaders = linkVideoKey && rest.includes(linkVideoKey) ? [linkVideoKey, ...rest.filter(h => h !== linkVideoKey)] : rest;

    return {
      linkVideoKey,
      statusKey: findKey('STATUS'),
      durationKey: findKey('DURATION'),
      tableHeaders,
    };
  }, [detail]);

  const selectionStats = useMemo(() => {
    const dr = detail?.rows;
    const lk = detailLayout.linkVideoKey;
    const sk = detailLayout.statusKey;
    if (!dr?.length || !lk || !sk) {
      return {
        emptyStatusWithLink: 0,
        createdWithYoutubeId: 0,
        createdVideoCount: 0,
        hasCreatedVideoInSelection: false,
      };
    }
    let emptyStatusWithLink = 0;
    let createdWithYoutubeId = 0;
    let createdVideoCount = 0;
    let hasCreatedVideoInSelection = false;
    for (const i of selectedIndices) {
      const r = dr[i];
      if (!r) continue;
      const st = String(r[sk] ?? '').trim();
      const url = String(r[lk] ?? '').trim();
      if (isDetailRowStatusEmpty(r[sk])) {
        if (url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('(Không có video)')) {
          emptyStatusWithLink += 1;
        }
      }
      if (st === VIDEO_STATUS.CREATED) {
        hasCreatedVideoInSelection = true;
        createdVideoCount += 1;
        if (extractYoutubeVideoIdFromUrl(url)) createdWithYoutubeId += 1;
      }
    }
    return {
      emptyStatusWithLink,
      createdWithYoutubeId,
      createdVideoCount,
      hasCreatedVideoInSelection,
    };
  }, [detail?.rows, detailLayout.linkVideoKey, detailLayout.statusKey, selectedIndices]);

  const canRunNpm = typeof window.runner?.runNpmScript === 'function';
  const canRunScript = typeof window.runner?.runScript === 'function';
  const actionsLocked = loading || createVideoBusy || updateMetaBusy || uploadPrepBusy || youtubeUploadThreads > 0;

  const canCreateVideo =
    canRunNpm &&
    Boolean(detailLayout.linkVideoKey && detailLayout.statusKey) &&
    Boolean(indexChannelEntry) &&
    selectionStats.emptyStatusWithLink > 0;

  const canUploadVideo =
    canRunScript &&
    Boolean(detailLayout.linkVideoKey && detailLayout.statusKey) &&
    Boolean(indexChannelEntry) &&
    selectionStats.createdWithYoutubeId > 0;

  const canUpdateMeta =
    canRunScript && Boolean(detailLayout.linkVideoKey && detailLayout.statusKey) && selectionStats.hasCreatedVideoInSelection;

  const load = useCallback(async () => {
    if (!channelFolder) {
      setDetail(null);
      setLoading(false);
      return;
    }
    if (typeof window.runner?.readChannelFolderData !== 'function') {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }
  }, [channelFolder]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedIndices(new Set());
    setFilterLink('');
    setFilterDurationPreset('0_null');
    setFilterStatusFixed('__all__');
  }, [detail]);

  const rows = useMemo(() => detail?.rows ?? [], [detail]);
  const headers = useMemo(() => {
    if (detail?.headers?.length) return detail.headers;
    const first = detail?.rows?.[0];
    if (first && typeof first === 'object') return Object.keys(first);
    return [] as string[];
  }, [detail]);

  const filteredRowsWithIndex = useMemo(() => {
    if (!detail?.rows?.length) return [];
    const lk = detailLayout.linkVideoKey;
    const dk = detailLayout.durationKey;
    const sk = detailLayout.statusKey;
    const linkQ = filterLink.trim().toLowerCase();
    const durRange = durationPresetToSecRange(filterDurationPreset);
    return detail.rows
      .map((r, originalIndex) => ({ row: r, originalIndex }))
      .filter(({ row }) => {
        if (lk && linkQ) {
          const url = String(row[lk] ?? '').toLowerCase();
          if (!url.includes(linkQ)) return false;
        }
        if (dk && durRange) {
          const sec = parseDurationToSeconds(String(row[dk] ?? ''));
          if (sec == null || sec < durRange.min || sec > durRange.max) return false;
        }
        if (sk && filterStatusFixed !== '__all__') {
          const s = String(row[sk] ?? '').trim();
          if (s !== filterStatusFixed) return false;
        }
        return true;
      });
  }, [
    detail?.rows,
    detailLayout.linkVideoKey,
    detailLayout.durationKey,
    detailLayout.statusKey,
    filterLink,
    filterDurationPreset,
    filterStatusFixed,
  ]);

  const {
    page: listPage,
    setPage: setListPage,
    startIndex: listStartIndex,
    totalPages: listTotalPages,
    pageSize: listPageSize,
  } = useClientPagination(filteredRowsWithIndex.length, DETAIL_PAGE_SIZE);

  useEffect(() => {
    setListPage(1);
  }, [filterLink, filterDurationPreset, filterStatusFixed, channelFolder, setListPage]);

  const pageFilteredRows = useMemo(
    () => filteredRowsWithIndex.slice(listStartIndex, listStartIndex + listPageSize),
    [filteredRowsWithIndex, listStartIndex, listPageSize],
  );

  const pageSelectionFlags = useMemo(() => {
    const onPage = pageFilteredRows.map(({ originalIndex }) => originalIndex);
    const all = onPage.length > 0 && onPage.every(i => selectedIndices.has(i));
    const some = onPage.some(i => selectedIndices.has(i));
    return { all, some };
  }, [pageFilteredRows, selectedIndices]);

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = pageSelectionFlags.some && !pageSelectionFlags.all;
  }, [pageSelectionFlags.all, pageSelectionFlags.some]);

  const showSearchBar =
    !loading &&
    rows.length > 0 &&
    detailLayout.tableHeaders.length > 0 &&
    (Boolean(detailLayout.linkVideoKey) || Boolean(detailLayout.durationKey) || Boolean(detailLayout.statusKey));

  const toggleRowSelected = useCallback((globalIndex: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      return next;
    });
  }, []);

  const toggleSelectAllOnPage = useCallback(() => {
    const onPage = pageFilteredRows.map(({ originalIndex }) => originalIndex);
    setSelectedIndices(prev => {
      const next = new Set(prev);
      const allSelected = onPage.length > 0 && onPage.every(i => next.has(i));
      if (allSelected) onPage.forEach(i => next.delete(i));
      else onPage.forEach(i => next.add(i));
      return next;
    });
  }, [pageFilteredRows]);

  const handleYoutubeUploadConfirm = useCallback((payloads: ChannelUploadVideoPayload[]) => {
    if (!window.runner?.runScript) {
      setScheduleInfo('Chỉ chạy upload trong app Electron.');
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
      setScheduleInfo(
        `Bỏ qua ${uniq.length} email đang upload trên luồng khác: ${uniq.join(', ')}. Chờ xong rồi mới chạy lại cho các email đó.`,
      );
    }

    if (claimed.length === 0) {
      if (skippedBusy.length === 0) setScheduleInfo('Không có kênh hợp lệ để upload.');
      return;
    }

    if (skippedBusy.length === 0) setScheduleInfo(null);
    setYoutubeUploadThreads(n => n + claimed.length);

    const skipNote = skippedBusy.length > 0 ? `Đã bỏ qua email đang bận: ${[...new Set(skippedBusy)].join(', ')}. ` : '';

    void (async () => {
      const tasks = claimed.map(p => {
        const k = normalizeYoutubeUploadEmailKey(p.email);
        return window.runner
          .runScript('uploadYoutubeViaGpm', {
            gpmProfileId: p.gpmProfileId,
            channelFolder: p.channelFolder,
            email: p.email,
            maxUploads: p.totalVideos,
            gpmApiBase: gpmApi.getBaseUrl(),
            ...(p.uploadFolderNames?.length ? { uploadFolderNames: p.uploadFolderNames } : {}),
          })
          .finally(() => {
            uploadingYoutubeEmailsRef.current.delete(k);
            setYoutubeUploadThreads(c => Math.max(0, c - 1));
          });
      });

      try {
        const settled = await Promise.allSettled(tasks);
        let ok = 0;
        let fail = 0;
        for (const r of settled) {
          if (r.status === 'fulfilled') ok += 1;
          else fail += 1;
        }
        const parts: string[] = [];
        if (ok > 0) parts.push(`${ok} kênh xong`);
        if (fail > 0) parts.push(`${fail} kênh lỗi`);
        setScheduleInfo(
          `${skipNote}Upload YouTube (${claimed.length} luồng song song): ${parts.join(' — ')}. Kiểm tra GPM / YouTube Studio và tab Logs.`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setScheduleInfo(`${skipNote}Upload YouTube lỗi: ${msg}`);
      }
    })();
  }, []);

  const runCreateVideoForSelection = useCallback(async () => {
    if (!channelFolder || !detail?.rows?.length) return;
    const lk = detailLayout.linkVideoKey;
    const sk = detailLayout.statusKey;
    if (!lk || !sk) {
      setActionError('File chi tiết cần cột LINK VIDEO và STATUS.');
      return;
    }
    if (!indexChannelEntry) {
      setActionError('Kênh thiếu LOẠI VIDEO from_audio / reup_full trong index (hoặc thiếu ID).');
      return;
    }
    const onlyLinks: string[] = [];
    for (const i of selectedIndices) {
      const r = detail.rows[i];
      if (!r) continue;
      if (!isDetailRowStatusEmpty(r[sk])) continue;
      const url = String(r[lk] ?? '').trim();
      if (!url || !(url.startsWith('http://') || url.startsWith('https://')) || url.includes('(Không có video)')) {
        continue;
      }
      onlyLinks.push(url);
    }
    if (onlyLinks.length === 0) {
      setActionError('Chọn ít nhất một dòng có status trống (hoặc empty) và link video hợp lệ.');
      return;
    }
    if (!window.runner?.runNpmScript) {
      setActionError('Chỉ chạy tạo video trong app Electron.');
      return;
    }
    setActionError(null);
    setScheduleInfo(null);
    if (typeof window.runner.minimizeApp === 'function') {
      window.runner.minimizeApp();
    }
    setCreateVideoBusy(true);
    try {
      const bgList = typeof window.runner.listBackgrounds === 'function' ? await window.runner.listBackgrounds().catch(() => []) : [];
      const def = scriptDefs.find(s => s.id === (indexChannelEntry.videoType === 'reup_full' ? SCRIPT_REUP_FULL : SCRIPT_FROM_AUDIO));
      if (!def) {
        setActionError('Không tìm thấy script tạo video.');
        return;
      }
      const baseEnv = buildExtraEnvForIndexChannelRow(
        row,
        indexHeaders,
        channelFolder,
        indexChannelEntry.videoType,
        bgList.length > 0 ? bgList : [],
        { maxVideosPerBatch: defaultMaxVideosPerBatch },
      );
      const extraEnv = { ...baseEnv, MAVID_ONLY_LINKS: JSON.stringify(onlyLinks) };
      const res = await window.runner.runNpmScript(def.npmScript, extraEnv);
      if (res.cancelled) {
        setActionError('Đã dừng tạo video.');
        return;
      }
      if (res.code !== 0) setActionError(`Tạo video thoát mã ${res.code}.`);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreateVideoBusy(false);
    }
  }, [
    channelFolder,
    detail?.rows,
    selectedIndices,
    detailLayout.linkVideoKey,
    detailLayout.statusKey,
    indexChannelEntry,
    row,
    indexHeaders,
    defaultMaxVideosPerBatch,
    load,
  ]);

  const runUploadForSelection = useCallback(async () => {
    if (!channelFolder || !detail?.rows?.length) return;
    const lk = detailLayout.linkVideoKey;
    const sk = detailLayout.statusKey;
    if (!lk || !sk) {
      setActionError('File chi tiết cần cột LINK VIDEO và STATUS.');
      return;
    }
    const uploadFolderNames: string[] = [];
    for (const i of selectedIndices) {
      const r = detail.rows[i];
      if (!r) continue;
      if (String(r[sk] ?? '').trim() !== VIDEO_STATUS.CREATED) continue;
      const id = extractYoutubeVideoIdFromUrl(String(r[lk] ?? '').trim());
      if (id) uploadFolderNames.push(id);
    }
    if (uploadFolderNames.length === 0) {
      setActionError('Chọn ít nhất một dòng «Đã tạo video» có link YouTube dạng watch (?v=…).');
      return;
    }
    if (!indexChannelEntry) {
      setActionError('Thiếu cấu hình kênh (LOẠI VIDEO) trên index.');
      return;
    }
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    const email = emailKey ? String(row[emailKey] ?? '').trim() : '';
    if (!email) {
      setActionError('Dòng index của kênh cần có EMAIL để upload.');
      return;
    }
    if (!window.runner?.runScript) {
      setActionError('Chỉ chạy upload trong app Electron.');
      return;
    }
    setActionError(null);
    setScheduleInfo(null);
    setUploadPrepBusy(true);
    try {
      const profiles = await fetchAllGpmProfileRows();
      const gpmProfileId = resolveGpmProfileIdByEmail(profiles, email);
      if (!gpmProfileId) {
        setActionError(`Không tìm thấy profile GPM có tên trùng email «${email}».`);
        return;
      }
      handleYoutubeUploadConfirm([
        {
          channelFolder,
          email,
          totalVideos: uploadFolderNames.length,
          gpmProfileId,
          uploadFolderNames,
        },
      ]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadPrepBusy(false);
    }
  }, [
    channelFolder,
    detail?.rows,
    selectedIndices,
    detailLayout.linkVideoKey,
    detailLayout.statusKey,
    indexChannelEntry,
    row,
    indexHeaders,
    handleYoutubeUploadConfirm,
  ]);

  const runUpdateMetaForSelection = useCallback(async () => {
    if (!channelFolder || !detail?.rows?.length) return;
    const lk = detailLayout.linkVideoKey;
    const sk = detailLayout.statusKey;
    if (!lk) {
      setActionError('File chi tiết không có cột LINK VIDEO.');
      return;
    }
    if (!sk) {
      setActionError('File chi tiết không có cột STATUS — không lọc được «Đã tạo video».');
      return;
    }
    const items: { url: string }[] = [];
    for (const i of selectedIndices) {
      const r = detail.rows[i];
      if (!r) continue;
      const status = String(r[sk] ?? '').trim();
      if (status !== VIDEO_STATUS.CREATED) continue;
      const url = String(r[lk] ?? '').trim();
      if (url) items.push({ url });
    }
    if (items.length === 0) {
      setActionError('Không có dòng «Đã tạo video» nào (trong phần đã chọn) có link video hợp lệ.');
      return;
    }
    if (!window.runner?.runScript) {
      setActionError('Chỉ chạy cập nhật meta trong app Electron.');
      return;
    }
    setActionError(null);
    setScheduleInfo(null);
    setUpdateMetaBusy(true);
    try {
      if (typeof window.runner.minimizeApp === 'function') {
        window.runner.minimizeApp();
      }
      await window.runner.runScript('updateChannelVideosMeta', {
        channelFolder,
        items,
      });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdateMetaBusy(false);
    }
  }, [channelFolder, detail?.rows, selectedIndices, detailLayout.linkVideoKey, detailLayout.statusKey, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const linkPreview = String(row['LINK'] ?? '').trim();
  const emailPreview = String(row['EMAIL'] ?? '').trim();

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        title='Danh sách video kênh'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <AppButton
              type='button'
              variant='primary'
              disabled={!canCreateVideo || actionsLocked}
              title={
                !detailLayout.linkVideoKey || !detailLayout.statusKey
                  ? 'Cần cột LINK VIDEO + STATUS trong file kênh.'
                  : !indexChannelEntry
                    ? 'Cần LOẠI VIDEO from_audio / reup_full trên dòng index.'
                    : selectionStats.emptyStatusWithLink === 0
                      ? 'Chọn dòng có status trống và link video hợp lệ.'
                      : 'Tạo video cho các dòng đã chọn (status trống).'
              }
              onClick={() => void runCreateVideoForSelection()}
            >
              {createVideoBusy ? (
                <span className='inline-flex items-center gap-2'>
                  <SpinnerIcon className='w-4 h-4' />
                  Đang tạo video…
                </span>
              ) : selectionStats.emptyStatusWithLink > 0 ? (
                `Tạo Video (${selectionStats.emptyStatusWithLink})`
              ) : (
                'Tạo Video'
              )}
            </AppButton>
            <AppButton
              type='button'
              variant='secondary'
              disabled={!canUploadVideo || actionsLocked}
              title={
                !detailLayout.linkVideoKey || !detailLayout.statusKey
                  ? 'Cần cột LINK VIDEO + STATUS.'
                  : !indexChannelEntry
                    ? 'Thiếu LOẠI VIDEO trên index.'
                    : selectionStats.createdWithYoutubeId === 0
                      ? 'Chọn dòng «Đã tạo video» có link YouTube (?v=…).'
                      : 'Upload các video đã chọn.'
              }
              onClick={() => void runUploadForSelection()}
            >
              {uploadPrepBusy ? (
                <span className='inline-flex items-center gap-2'>
                  <SpinnerIcon className='w-4 h-4' />
                  Đang chuẩn bị…
                </span>
              ) : youtubeUploadThreads > 0 ? (
                <span className='inline-flex items-center gap-2'>
                  <SpinnerIcon className='w-4 h-4' />
                  Upload ({youtubeUploadThreads} luồng)
                </span>
              ) : selectionStats.createdWithYoutubeId > 0 ? (
                `Upload Video (${selectionStats.createdWithYoutubeId})`
              ) : (
                'Upload Video'
              )}
            </AppButton>
            <AppButton
              type='button'
              variant='secondary'
              disabled={!canUpdateMeta || actionsLocked}
              title={
                !detailLayout.linkVideoKey || !detailLayout.statusKey
                  ? 'Cần cột LINK VIDEO + STATUS.'
                  : !selectionStats.hasCreatedVideoInSelection
                    ? 'Chọn ít nhất một dòng có status «Đã tạo video».'
                    : 'Cập nhật meta (Gemini / thumbnail) cho các dòng đã chọn.'
              }
              onClick={() => void runUpdateMetaForSelection()}
            >
              {updateMetaBusy ? (
                <span className='inline-flex items-center gap-2'>
                  <SpinnerIcon className='w-4 h-4' />
                  Đang cập nhật meta…
                </span>
              ) : selectionStats.createdVideoCount > 0 ? (
                `Update Meta (${selectionStats.createdVideoCount})`
              ) : (
                'Update Meta'
              )}
            </AppButton>
            <AppButton type='button' variant='secondary' onClick={() => void load()} disabled={loading || !channelFolder || actionsLocked}>
              {loading ? <SpinnerIcon className='w-4 h-4' /> : <RefreshIcon className='w-4 h-4' />}
              <span>{loading ? 'Đang tải…' : 'Tải lại'}</span>
            </AppButton>
            <AppButton type='button' variant='secondary' onClick={onBack} disabled={actionsLocked}>
              ← Quay lại
            </AppButton>
          </div>
        }
      />

      {/* {actionError && (
        <div
          className='rounded-xl px-3 py-2 text-sm'
          style={{
            color: '#fecaca',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          {actionError}
        </div>
      )}

      {scheduleInfo && (
        <div
          className='rounded-xl px-3 py-2 text-sm wrap-break-word'
          style={{
            color: 'var(--text-h)',
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
          }}
        >
          {scheduleInfo}
        </div>
      )} */}

      {/* {error && (
        <div
          className='rounded-xl px-3 py-2 text-sm'
          style={{
            color: '#fecaca',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          {error}
        </div>
      )} */}

      {showSearchBar ? (
        <div
          className='rounded-2xl p-4 w-full min-w-0 space-y-3'
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <div className='text-sm font-medium uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>
            Tìm & lọc
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
            {detailLayout.linkVideoKey ? (
              <label className='block min-w-0'>
                <span className='block text-sm mb-2' style={{ color: 'var(--text-h)' }}>
                  Link video
                </span>
                <input
                  type='search'
                  value={filterLink}
                  onChange={e => setFilterLink(e.target.value)}
                  placeholder='Tìm trong URL / link…'
                  autoComplete='off'
                  className={searchInputClass}
                  style={{
                    background: 'var(--code-bg)',
                    color: 'var(--text-h)',
                    borderColor: 'var(--border)',
                  }}
                />
              </label>
            ) : null}
            {detailLayout.durationKey ? (
              <div className='min-w-0'>
                <div className='text-sm mb-2' style={{ color: 'var(--text-h)' }}>
                  Thời lượng (khoảng)
                </div>
                <CustomSelect
                  value={filterDurationPreset}
                  options={CHANNEL_ADD_DURATION_SELECT_OPTIONS}
                  onChange={setFilterDurationPreset}
                  placeholder='Chọn khoảng'
                  menuZIndex={100}
                />
              </div>
            ) : null}
            {detailLayout.statusKey ? (
              <div className='min-w-0'>
                <div className='text-sm mb-2' style={{ color: 'var(--text-h)' }}>
                  Status
                </div>
                <CustomSelect
                  value={filterStatusFixed}
                  options={DETAIL_STATUS_FILTER_OPTIONS}
                  onChange={setFilterStatusFixed}
                  placeholder='Status'
                  menuZIndex={100}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section
        className='rounded-2xl w-full min-w-0 overflow-hidden flex flex-col max-h-[min(75vh,800px)]'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        aria-label='Bảng video trong file kênh'
      >
        <div className='overflow-auto w-full min-w-0 flex-1 min-h-0'>
          {loading ? (
            <div className='flex items-center justify-center gap-2 py-16 text-sm' style={{ color: 'var(--text)' }}>
              <SpinnerIcon className='w-5 h-5' />
              Đang đọc file kênh…
            </div>
          ) : headers.length === 0 || rows.length === 0 ? (
            <p className='py-12 px-4 text-sm text-center' style={{ color: 'var(--text-muted)' }}>
              {channelFolder ? 'Không có dòng video trong file dữ liệu kênh.' : 'Thiếu ID kênh.'}
            </p>
          ) : filteredRowsWithIndex.length === 0 ? (
            <p className='py-12 px-4 text-sm text-center' style={{ color: 'var(--text-muted)' }}>
              Không có dòng khớp bộ lọc.
            </p>
          ) : (
            <table className='w-full min-w-0 text-sm' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead className='sticky top-0 z-1'>
                <tr style={{ background: 'var(--code-bg)' }}>
                  <th className='w-12 px-2 py-2 text-center align-middle' style={{ borderBottom: '1px solid var(--border)' }} scope='col'>
                    <input
                      ref={headerSelectRef}
                      type='checkbox'
                      className='w-4 h-4 cursor-pointer rounded border align-middle'
                      style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                      checked={pageSelectionFlags.all}
                      onChange={() => toggleSelectAllOnPage()}
                      disabled={loading || pageFilteredRows.length === 0 || actionsLocked}
                      aria-label='Chọn tất cả video trên trang này'
                    />
                  </th>
                  {headers.map(h => (
                    <th
                      key={h}
                      className='px-3 py-2 text-left font-semibold align-middle whitespace-nowrap'
                      style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-h)' }}
                      scope='col'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageFilteredRows.map(({ row: r, originalIndex }) => (
                  <tr
                    key={originalIndex}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    className={actionsLocked ? '' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'}
                    onClick={() => {
                      if (!actionsLocked) toggleRowSelected(originalIndex);
                    }}
                  >
                    <td className='px-2 py-2 align-middle text-center' onClick={e => e.stopPropagation()}>
                      <input
                        type='checkbox'
                        className='w-4 h-4 cursor-pointer rounded border align-middle'
                        style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                        checked={selectedIndices.has(originalIndex)}
                        onChange={() => toggleRowSelected(originalIndex)}
                        disabled={loading || actionsLocked}
                        aria-label={`Chọn video dòng ${originalIndex + 1}`}
                      />
                    </td>
                    {headers.map(h => (
                      <td
                        key={h}
                        className='px-3 py-2 align-middle wrap-break-word max-w-[min(320px,36vw)]'
                        style={{ color: 'var(--text)' }}
                        title={formatCell(r[h])}
                      >
                        {formatCell(r[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredRowsWithIndex.length > DETAIL_PAGE_SIZE ? (
          <TablePaginationBar
            page={listPage}
            totalPages={listTotalPages}
            onPageChange={setListPage}
            totalItems={filteredRowsWithIndex.length}
            pageSize={listPageSize}
          />
        ) : null}
      </section>
    </div>
  );
}
