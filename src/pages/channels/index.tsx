import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelData, ChannelFolderDataResult, ChannelRow } from '@/types';
import { scriptDefs } from '@/types';
import { useClientPagination } from '@/hooks/useClientPagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChannelAddDialog } from './ChannelAddDialog';
import { ChannelCreateVideoDialog } from './ChannelCreateVideoDialog';
import { ChannelUploadVideoDialog, type ChannelUploadVideoPayload, type ChannelItem } from './ChannelUploadVideoDialog';
import { ChannelsDetailSection } from './ChannelsDetailSection';
import { DETAIL_TABLE_LOADING_HEADERS } from './channelsDetailSectionShared';
import { ChannelsIndexSection } from './ChannelsIndexSection';
import { ChannelsPageHeaderActions } from './ChannelsPageHeaderActions';
import { durationPresetToSecRange, parseDurationToSeconds } from './channelDurationFormat';
import { gpmApi } from '@/services';
import {
  buildExtraEnvForIndexChannelRow,
  CHANNEL_ADD_DURATION_SELECT_OPTIONS,
  channelFolderFromRow,
  findIndexHeaderKey,
  headerNorm,
  indexRowMatchesPickedEmail,
  resolveIndexRowVideoType,
  SCRIPT_FROM_AUDIO,
  SCRIPT_REUP_FULL,
} from './channelIndexHelpers';

const INDEX_FILE = 'channels/index.xlsx';

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
  const [detailActionError, setDetailActionError] = useState<string | null>(null);

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
  const [createVideoOpen, setCreateVideoOpen] = useState(false);
  const [uploadScheduleInfo, setUploadScheduleInfo] = useState<string | null>(null);
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [addChannelInfo, setAddChannelInfo] = useState<string | null>(null);

  const loadIndex = useCallback(async () => {
    setIndexLoading(true);
    try {
      const d = await window.runner.readChannelData(INDEX_FILE);
      setIndexData(d);
      setIndexDraftRows(d.rows?.map(r => ({ ...r })) ?? []);
      setIndexListError(null);
      setIndexEditRowIndex(null);
    } catch {
      setIndexData({ headers: [], rows: [] });
      setIndexDraftRows([]);
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
  }, [selectedChannel]);

  const indexHeaders = useMemo(() => {
    if (indexData?.headers?.length) return indexData.headers;
    const first = indexData?.rows?.[0];
    if (first && typeof first === 'object') return Object.keys(first);
    return ['ID', 'LINK', 'EMAIL', 'LAST UPLOAD'];
  }, [indexData]);

  const indexColCount = Math.max(indexHeaders.length, 1) + 1;

  const canWriteIndex = typeof window.runner?.writeChannelIndex === 'function';

  const closeIndexRowEdit = useCallback(() => {
    setIndexEditRowIndex(null);
  }, []);

  /** Ghi `MaVidMedia/channels/index.xlsx` (token UI: channels/index.xlsx). */
  const persistIndexRows = useCallback(
    async (rows: ChannelRow[]) => {
      if (!canWriteIndex) {
        throw new Error('Chỉ lưu index được trong app Electron.');
      }
      setIndexSaving(true);
      setIndexListError(null);
      try {
        const normalized = rows.map(row => {
          const o: ChannelRow = {};
          for (const h of indexHeaders) {
            const v = row[h];
            o[h] = v == null || v === '' ? '' : v;
          }
          return o;
        });
        await window.runner.writeChannelIndex({
          filePath: INDEX_FILE,
          headers: indexHeaders,
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

  type IndexCreateVideoQueueEntry = { row: ChannelRow; folder: string; videoType: 'from_audio' | 'reup_full' };

  const indexCreateVideoQueue = useMemo((): IndexCreateVideoQueueEntry[] => {
    const queue: IndexCreateVideoQueueEntry[] = [];
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    for (const row of indexDraftRows) {
      const folder = channelFolderFromRow(row, indexHeaders);
      const email = emailKey ? String(row[emailKey] ?? '').trim() : '';
      const videoType = resolveIndexRowVideoType(row, indexHeaders);
      if (folder && email && videoType) {
        queue.push({ row, folder, videoType: videoType as 'from_audio' | 'reup_full' });
      }
    }
    return queue;
  }, [indexDraftRows, indexHeaders]);

  const createVideoDialogChannels = useMemo(() => {
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    const byFolder = new Map<string, { types: Set<string>; emails: Set<string> }>();
    for (const q of indexCreateVideoQueue) {
      if (!byFolder.has(q.folder)) byFolder.set(q.folder, { types: new Set(), emails: new Set() });
      const rec = byFolder.get(q.folder)!;
      rec.types.add(q.videoType);
      if (emailKey) {
        const raw = String(q.row[emailKey] ?? '').trim();
        raw
          .split(',')
          .map(e => e.trim())
          .filter(Boolean)
          .forEach(e => rec.emails.add(e));
      }
    }
    return Array.from(byFolder.entries())
      .map(([folder, { types, emails }]) => ({
        folder,
        emails: Array.from(emails).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
        videoTypesLabel: [...types].sort((a, b) => a.localeCompare(b)).join(', '),
      }))
      .sort((a, b) => a.folder.localeCompare(b.folder, undefined, { sensitivity: 'base' }));
  }, [indexCreateVideoQueue, indexHeaders]);

  const canRunIndexBatchVideo = typeof window.runner?.runNpmScript === 'function';

  const runCreateVideoForQueue = useCallback(
    async (queue: IndexCreateVideoQueueEntry[], maxVideosPerBatch: number) => {
      console.log('🚀 ~ ChannelsPage ~ maxVideosPerBatch:', maxVideosPerBatch);
      console.log('🚀 ~ ChannelsPage ~ queue:', queue);
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
          console.log('runCreateVideoForQueue', queue[i]);
          const { row, folder, videoType } = queue[i];
          setIndexBatchVideo({ current: i + 1, total: queue.length, channelLabel: folder });
          const def = scriptDefs.find(s => s.id === (videoType === 'reup_full' ? SCRIPT_REUP_FULL : SCRIPT_FROM_AUDIO));
          if (!def) {
            failures.push(`${folder}: không tìm thấy script.`);
            continue;
          }

          const extraEnv = buildExtraEnvForIndexChannelRow(row, indexHeaders, folder, videoType, bgList, {
            maxVideosPerBatch,
          });
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
    [indexHeaders, indexBackgrounds],
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
    const tableHeaders = headers.filter(h => !skip.has(h));

    return {
      meta,
      tableHeaders,
      showEmail: Boolean(emailKey),
      showChannelName: Boolean(nameKey),
      showTags: Boolean(tagsKey),
      linkVideoKey: findKey('LINK VIDEO'),
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
    [indexDraftRows, indexPag.startIndex, indexPag.pageSize],
  );

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

  const canSetStartFrom = Boolean(detail?.fileName?.toLowerCase().endsWith('.xlsx') && detailLayout.startFromKey);

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

  const detailColCount = Math.max(detailTheadHeaders.length, 1);

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

  /** Chỉ kênh có EMAIL không rỗng trong index (popup Upload video). */
  const uploadChannels = useMemo(() => {
    const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
    const map = new Map<string, Set<string>>();
    for (const row of indexDraftRows) {
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
  }, [indexDraftRows, indexHeaders]);

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
            indexCreateVideoQueueLength={indexCreateVideoQueue.length}
            canRunIndexBatchVideo={canRunIndexBatchVideo}
            uploadChannelsLength={uploadChannels.length}
            refreshBusy={refreshBusy}
            onOpenCreateVideo={() => setCreateVideoOpen(true)}
            onOpenAddChannel={() => {
              setAddChannelInfo(null);
              setAddChannelOpen(true);
            }}
            onOpenUploadVideo={() => setUploadVideoOpen(true)}
            onBackToIndex={() => setSelectedChannel(null)}
            onRefresh={handleRefresh}
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

      {addChannelInfo ? (
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
      ) : null}

      {!selectedChannel ? (
        <>
          <ChannelsIndexSection
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
            onEditRow={setIndexEditRowIndex}
            onOpenChannel={setSelectedChannel}
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
        />
      )}

      {createVideoOpen ? (
        <ChannelCreateVideoDialog
          channels={createVideoDialogChannels}
          onClose={() => setCreateVideoOpen(false)}
          onConfirm={async ({ folderPick, emailForSingleChannel, maxVideosPerBatch }) => {
            if (typeof window.runner?.minimizeApp === 'function') {
              window.runner.minimizeApp();
            }
            const emailKey = findIndexHeaderKey(indexHeaders, 'EMAIL');
            let queue = folderPick === '__all__' ? indexCreateVideoQueue : indexCreateVideoQueue.filter(q => q.folder === folderPick);
            if (folderPick !== '__all__' && emailForSingleChannel && emailKey) {
              queue = queue.filter(q => indexRowMatchesPickedEmail(q.row, emailKey, emailForSingleChannel));
            }
            await runCreateVideoForQueue(queue, maxVideosPerBatch);
          }}
        />
      ) : null}

      {uploadVideoOpen ? (
        <ChannelUploadVideoDialog
          channels={uploadChannels}
          onClose={() => setUploadVideoOpen(false)}
          onConfirm={async (payloads: ChannelUploadVideoPayload[]) => {
            if (!window.runner?.runScript) throw new Error('Chỉ chạy upload trong app Electron.');
            for (const p of payloads) {
              await window.runner.runScript('uploadYoutubeViaGpm', {
                gpmProfileId: p.gpmProfileId,
                channelFolder: p.channelFolder,
                email: p.email,
                maxUploads: p.totalVideos,
                gpmApiBase: gpmApi.getBaseUrl(),
              });
            }
            if (payloads.length === 1) {
              const p = payloads[0];
              const n = p.totalVideos == null ? 'tất cả thư mục con có .mp4' : String(p.totalVideos);
              setUploadScheduleInfo(
                `Upload YouTube đã chạy xong — kênh «${p.channelFolder}», profile GPM ${p.gpmProfileId} (theo email ↔ name), tối đa ${n}. Kiểm tra GPM / YouTube Studio và tab Logs.`,
              );
            } else if (payloads.length > 1) {
              setUploadScheduleInfo(
                `Upload YouTube đồng loạt đã chạy xong cho ${payloads.length} kênh. Kiểm tra GPM / YouTube Studio và tab Logs.`,
              );
            }
          }}
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
