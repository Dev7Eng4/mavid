import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelData, ChannelFolderDataResult, ChannelRow } from '../../types';
import { scriptDefs } from '../../types';
import { RefreshIcon, SpinnerIcon } from '../ui/Icons';
import { ChannelIndexEditDialog } from './channels/ChannelIndexEditDialog';
import {
  buildExtraEnvForIndexChannelRow,
  channelFolderFromRow,
  headerNorm,
  indexRowsEqual,
  resolveIndexRowVideoType,
  SCRIPT_FROM_AUDIO,
  SCRIPT_REUP_FULL,
} from './channels/channelIndexHelpers';

const INDEX_FILE = 'channels/index.xlsx';

/**
 * Parse duration từ ô Excel/text: `HH:mm:ss`, `mm:ss`, hoặc số (giây) → tổng giây.
 */
function parseDurationToSeconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const parts = s.split(':').map(p => p.trim());
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const sec = parseFloat(parts[2]);
    if (![h, m].every(x => Number.isFinite(x) && x >= 0) || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(h * 3600 + m * 60 + sec);
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (!Number.isFinite(m) || m < 0 || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(m * 60 + sec);
  }
  return null;
}

/** Hiển thị giây dạng đọc được (có giờ nếu ≥ 1h). */
function formatSecondsAsDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return '0:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ChannelsPage() {
  const [indexData, setIndexData] = useState<ChannelData | null>(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChannelFolderDataResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [durationSliderMin, setDurationSliderMin] = useState(0);
  const [durationSliderMax, setDurationSliderMax] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
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
    setFilterStatus('__all__');
    setDetailActionError(null);
  }, [selectedChannel]);

  const indexHeaders = useMemo(() => {
    if (indexData?.headers?.length) return indexData.headers;
    const first = indexData?.rows?.[0];
    if (first && typeof first === 'object') return Object.keys(first);
    return ['CHANNEL', 'LINK', 'ID', 'EMAIL', 'LAST UPLOAD'];
  }, [indexData]);

  const indexColCount = Math.max(indexHeaders.length, 1) + 1;

  const indexDirty = useMemo(() => {
    const base = indexData?.rows ?? [];
    if (base.length !== indexDraftRows.length) return true;
    return !indexRowsEqual(indexDraftRows, base, indexHeaders);
  }, [indexData?.rows, indexDraftRows, indexHeaders]);

  const canWriteIndex = typeof window.runner?.writeChannelIndex === 'function';

  const closeIndexRowEdit = useCallback(() => {
    setIndexEditRowIndex(null);
  }, []);

  const handleIndexCancel = useCallback(() => {
    const base = indexData?.rows ?? [];
    setIndexDraftRows(base.map(r => ({ ...r })));
    setIndexListError(null);
    closeIndexRowEdit();
  }, [indexData?.rows, closeIndexRowEdit]);

  const handleIndexSave = useCallback(async () => {
    if (!canWriteIndex) {
      setIndexListError('Chỉ lưu index được trong app Electron.');
      return;
    }
    setIndexSaving(true);
    setIndexListError(null);
    try {
      const normalized = indexDraftRows.map(row => {
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
      setIndexListError(e instanceof Error ? e.message : 'Không lưu được index.xlsx.');
    } finally {
      setIndexSaving(false);
    }
  }, [canWriteIndex, indexDraftRows, indexHeaders, loadIndex]);

  const indexBatchEligibleCount = useMemo(() => {
    let n = 0;
    for (const row of indexDraftRows) {
      const folder = channelFolderFromRow(row, indexHeaders);
      const vt = resolveIndexRowVideoType(row, indexHeaders);
      if (folder && vt) n += 1;
    }
    return n;
  }, [indexDraftRows, indexHeaders]);

  const canRunIndexBatchVideo = typeof window.runner?.runNpmScript === 'function';

  const handleCreateVideoAllChannels = useCallback(async () => {
    if (!window.runner?.runNpmScript) {
      setIndexListError('Runner chưa sẵn sàng.');
      return;
    }
    const queue: { row: ChannelRow; folder: string; videoType: 'from_audio' | 'reup_full' }[] = [];
    for (const row of indexDraftRows) {
      const folder = channelFolderFromRow(row, indexHeaders);
      const videoType = resolveIndexRowVideoType(row, indexHeaders);
      if (folder && videoType) queue.push({ row, folder, videoType });
    }
    if (queue.length === 0) {
      setIndexListError('Không có kênh nào đủ điều kiện: cần thư mục (cột ID hoặc CHANNEL) và LOẠI VIDEO là from_audio hoặc reup_full.');
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
        const extraEnv = buildExtraEnvForIndexChannelRow(row, indexHeaders, folder, videoType, bgList);
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
  }, [indexDraftRows, indexHeaders, indexBackgrounds]);

  /** Cột video trong file kênh — dùng làm skeleton khi đang tải. */
  const DETAIL_TABLE_LOADING_HEADERS = ['LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS', 'BACKGROUND VIDEO', 'START FROM'];

  const detailLayout = useMemo(() => {
    if (!detail) {
      return {
        meta: { email: '', channelName: '', channelTags: '' },
        tableHeaders: [] as string[],
        showEmail: false,
        showChannelName: false,
        showTags: false,
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
      durationKey: findKey('DURATION'),
      statusKey: findKey('STATUS'),
      startFromKey: findKey('START FROM'),
    };
  }, [detail]);

  const durationBounds = useMemo(() => {
    const key = detailLayout.durationKey;
    if (!key || !detail?.rows?.length) {
      return { min: 0, max: 0, hasData: false };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const row of detail.rows) {
      const sec = parseDurationToSeconds(String(row[key] ?? ''));
      if (sec != null) {
        min = Math.min(min, sec);
        max = Math.max(max, sec);
      }
    }
    if (min === Infinity) return { min: 0, max: 0, hasData: false };
    return { min, max, hasData: true };
  }, [detail?.rows, detailLayout.durationKey]);

  useEffect(() => {
    if (!durationBounds.hasData) return;
    setDurationSliderMin(durationBounds.min);
    setDurationSliderMax(durationBounds.max);
  }, [selectedChannel, detail?.fileName, durationBounds.min, durationBounds.max, durationBounds.hasData]);

  const statusOptions = useMemo(() => {
    const key = detailLayout.statusKey;
    if (!key || !detail?.rows?.length) return [] as string[];
    const set = new Set<string>();
    for (const row of detail.rows) {
      const v = String(row[key] ?? '').trim();
      if (v) set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [detail?.rows, detailLayout.statusKey]);

  const filteredRowsWithIndex = useMemo(() => {
    if (!detail?.rows?.length) return [];
    const dk = detailLayout.durationKey;
    const sk = detailLayout.statusKey;
    const slidersNotSyncedYet =
      durationBounds.hasData && durationSliderMin === 0 && durationSliderMax === 0 && (durationBounds.min > 0 || durationBounds.max > 0);
    const effDurMin = slidersNotSyncedYet ? durationBounds.min : durationSliderMin;
    const effDurMax = slidersNotSyncedYet ? durationBounds.max : durationSliderMax;
    const durationFullSpan = !durationBounds.hasData || (effDurMin <= durationBounds.min && effDurMax >= durationBounds.max);
    return detail.rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        if (dk && durationBounds.hasData) {
          const sec = parseDurationToSeconds(String(row[dk] ?? ''));
          if (sec == null) {
            if (!durationFullSpan) return false;
          } else if (sec < effDurMin || sec > effDurMax) {
            return false;
          }
        }
        if (sk && filterStatus !== '__all__') {
          const s = String(row[sk] ?? '').trim();
          if (s !== filterStatus) return false;
        }
        return true;
      });
  }, [
    detail?.rows,
    detailLayout.durationKey,
    detailLayout.statusKey,
    durationBounds.hasData,
    durationBounds.min,
    durationBounds.max,
    durationSliderMin,
    durationSliderMax,
    filterStatus,
  ]);

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

  return (
    <div className='space-y-6 w-full min-w-0'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='min-w-0 flex-1'>
          <h1 className='text-2xl font-bold mb-2' style={{ color: 'var(--text-h)' }}>
            Channels
          </h1>
          <p className='text-sm' style={{ color: 'var(--text)' }}>
            {selectedChannel
              ? `Chi tiết: channels/${selectedChannel}/`
              : `Danh sách từ ${INDEX_FILE} — chi tiết mở thư mục channels/{ID} (cột ID; nếu trống dùng CHANNEL)`}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2 shrink-0 justify-end'>
          {!selectedChannel && hasIndexRows && (
            <>
              <button
                type='button'
                onClick={() => void handleIndexSave()}
                disabled={!indexDirty || indexSaving || !canWriteIndex}
                className='text-sm font-medium rounded-xl px-4 py-2 cursor-pointer transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed'
                style={{
                  color: '#fff',
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                {indexSaving ? (
                  <span className='inline-flex items-center gap-2'>
                    <SpinnerIcon className='w-4 h-4' />
                    Đang lưu…
                  </span>
                ) : (
                  'Lưu index'
                )}
              </button>
              <button
                type='button'
                onClick={handleIndexCancel}
                disabled={!indexDirty || indexSaving}
                className='text-sm font-medium rounded-xl px-4 py-2 cursor-pointer transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed'
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
                onClick={() => void handleCreateVideoAllChannels()}
                disabled={
                  indexLoading || indexSaving || indexBatchVideo !== null || indexBatchEligibleCount === 0 || !canRunIndexBatchVideo
                }
                className='flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 cursor-pointer transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed'
                style={{
                  color: '#fff',
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
                title={
                  indexBatchEligibleCount === 0
                    ? 'Cần ít nhất một dòng có ID/CHANNEL và LOẠI VIDEO (from_audio hoặc reup_full).'
                    : `Chạy batch lần lượt cho ${indexBatchEligibleCount} kênh (theo bảng hiện tại).`
                }
              >
                {indexBatchVideo ? (
                  <span className='inline-flex items-center gap-2 max-w-[min(100vw-2rem,28rem)] min-w-0'>
                    <SpinnerIcon className='w-4 h-4 shrink-0' />
                    <span className='truncate'>
                      Tạo video {indexBatchVideo.current}/{indexBatchVideo.total}: {indexBatchVideo.channelLabel}
                    </span>
                  </span>
                ) : (
                  `Tạo video (${indexBatchEligibleCount} kênh)`
                )}
              </button>
              {!canWriteIndex && (
                <span className='text-xs max-w-48 leading-snug' style={{ color: 'var(--text-muted)' }}>
                  Lưu index chỉ trong Electron.
                </span>
              )}
            </>
          )}
          {selectedChannel && (
            <button
              type='button'
              onClick={() => setSelectedChannel(null)}
              className='text-sm font-medium rounded-xl px-4 py-2 cursor-pointer transition-all duration-200'
              style={{
                color: 'var(--text)',
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
              }}
            >
              ← Danh sách (index)
            </button>
          )}
          <button
            type='button'
            onClick={() => void handleRefresh()}
            disabled={refreshBusy}
            className='flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 cursor-pointer transition-all duration-200 disabled:opacity-50'
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
            }}
            onMouseEnter={e => {
              if (!refreshBusy) e.currentTarget.style.boxShadow = 'var(--shadow-accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {refreshBusy ? <SpinnerIcon className='w-4 h-4' /> : <RefreshIcon className='w-4 h-4' />}
            <span>{refreshBusy ? 'Đang tải...' : 'Tải lại'}</span>
          </button>
        </div>
      </div>

      {!selectedChannel ? (
        <div className='space-y-4 w-full min-w-0'>
          {indexListError && (
            <div
              className='rounded-xl px-4 py-3 text-sm wrap-break-word'
              style={{
                color: '#fecaca',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
              }}
            >
              {indexListError}
            </div>
          )}

          <div
            className='overflow-auto rounded-2xl w-full min-w-0'
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <table className='w-full min-w-0 text-sm' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ background: 'var(--code-bg)' }}>
                  {indexHeaders.map(h => (
                    <th
                      key={h}
                      className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-xs tracking-wider'
                      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-xs tracking-wider w-44 shrink-0'
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {indexLoading ? (
                  <tr>
                    <td colSpan={indexColCount} className='px-4 py-8 text-center'>
                      <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                        <SpinnerIcon className='w-5 h-5' />
                        <span>Đang tải index...</span>
                      </div>
                    </td>
                  </tr>
                ) : indexDraftRows.length > 0 ? (
                  indexDraftRows.map((row, i) => {
                    const folder = channelFolderFromRow(row, indexHeaders);
                    return (
                      <tr
                        key={i}
                        className='transition-colors duration-150'
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {indexHeaders.map(h => (
                          <td
                            key={h}
                            className='px-4 py-3 align-top wrap-break-word min-w-0'
                            style={{ color: 'var(--text-h)' }}
                            title={String(row[h] ?? '')}
                          >
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                        <td className='px-4 py-3 align-top'>
                          <div className='flex gap-1.5 items-stretch'>
                            <button
                              type='button'
                              onClick={() => setIndexEditRowIndex(i)}
                              className='text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150 whitespace-nowrap'
                              style={{
                                color: 'var(--text)',
                                background: 'var(--code-bg)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              Sửa
                            </button>
                            {folder ? (
                              <button
                                type='button'
                                onClick={() => setSelectedChannel(folder)}
                                className='text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150 whitespace-nowrap'
                                style={{
                                  color: 'var(--accent)',
                                  background: 'var(--accent-bg)',
                                  border: '1px solid var(--accent-border)',
                                }}
                              >
                                Chi tiết folder
                              </button>
                            ) : (
                              <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={indexColCount} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                      Chưa có dữ liệu trong index. Hãy thêm channel từ Pipeline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {indexEditRowIndex !== null && indexDraftRows[indexEditRowIndex] != null && (
            <ChannelIndexEditDialog
              key={indexEditRowIndex}
              initialRow={indexDraftRows[indexEditRowIndex]}
              indexHeaders={indexHeaders}
              backgroundFolders={indexBackgrounds}
              onClose={closeIndexRowEdit}
              onApply={merged => {
                if (indexEditRowIndex === null) return;
                const idx = indexEditRowIndex;
                setIndexDraftRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...merged } : r)));
              }}
            />
          )}
        </div>
      ) : (
        <div className='space-y-4 w-full min-w-0'>
          {detail?.fileName && (
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
              File: <span style={{ color: 'var(--text-h)' }}>{detail.fileName}</span>
            </p>
          )}

          {showDetailMetaAbove && (
            <div className='rounded-2xl p-5 w-full min-w-0' style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
                {detailLayout.showEmail && (
                  <div className='min-w-0'>
                    <div className='text-[11px] font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                      Email
                    </div>
                    <div className='text-sm wrap-break-word' style={{ color: 'var(--text-h)' }}>
                      {detailLayout.meta.email || '—'}
                    </div>
                  </div>
                )}
                {detailLayout.showChannelName && (
                  <div className='min-w-0'>
                    <div className='text-[11px] font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                      Channel name
                    </div>
                    <div className='text-sm wrap-break-word' style={{ color: 'var(--text-h)' }}>
                      {detailLayout.meta.channelName || '—'}
                    </div>
                  </div>
                )}
                {detailLayout.showTags && (
                  <div className='min-w-0 md:col-span-1'>
                    <div className='text-[11px] font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                      Channel tags
                    </div>
                    <div className='text-sm wrap-break-word' style={{ color: 'var(--text-h)' }}>
                      {detailLayout.meta.channelTags || '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {detailActionError && (
            <div
              className='rounded-xl px-4 py-3 text-sm wrap-break-word'
              style={{
                color: '#fecaca',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
              }}
            >
              {detailActionError}
            </div>
          )}

          {!detailLoading &&
          detail?.rows?.length &&
          ((detailLayout.durationKey && durationBounds.hasData) || (detailLayout.statusKey && statusOptions.length > 0)) ? (
            <div
              className='flex flex-wrap items-end gap-6 rounded-2xl p-4 w-full min-w-0'
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              {detailLayout.durationKey && durationBounds.hasData ? (
                <div className='min-w-56 flex-1 space-y-3'>
                  <div className='text-[11px] font-medium uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>
                    Lọc duration (kéo min / max)
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-2 text-xs' style={{ color: 'var(--text-h)' }}>
                    <span>
                      Từ <strong style={{ color: 'var(--accent)' }}>{formatSecondsAsDuration(durationSliderMin)}</strong>
                    </span>
                    <span>
                      Đến <strong style={{ color: 'var(--accent)' }}>{formatSecondsAsDuration(durationSliderMax)}</strong>
                    </span>
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px]' style={{ color: 'var(--text-muted)' }} htmlFor='ch-dur-min'>
                      Tối thiểu
                    </label>
                    <input
                      id='ch-dur-min'
                      type='range'
                      min={durationBounds.min}
                      max={durationBounds.max}
                      step={1}
                      value={durationSliderMin}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setDurationSliderMin(Math.min(v, durationSliderMax));
                      }}
                      className='w-full h-2 rounded-lg cursor-pointer'
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px]' style={{ color: 'var(--text-muted)' }} htmlFor='ch-dur-max'>
                      Tối đa
                    </label>
                    <input
                      id='ch-dur-max'
                      type='range'
                      min={durationBounds.min}
                      max={durationBounds.max}
                      step={1}
                      value={durationSliderMax}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setDurationSliderMax(Math.max(v, durationSliderMin));
                      }}
                      className='w-full h-2 rounded-lg cursor-pointer'
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </div>
                  <p className='text-[10px] leading-snug' style={{ color: 'var(--text-muted)' }}>
                    Phạm vi trong file: {formatSecondsAsDuration(durationBounds.min)} — {formatSecondsAsDuration(durationBounds.max)}. Dòng
                    không đọc được duration chỉ hiện khi khoảng trùng toàn bộ phạm vi.
                  </p>
                </div>
              ) : null}
              {detailLayout.statusKey && statusOptions.length > 0 && (
                <div className='min-w-44 flex-1'>
                  <label
                    className='block text-[11px] font-medium uppercase tracking-wider mb-2'
                    style={{ color: 'var(--text-muted)' }}
                    htmlFor='ch-filter-status'
                  >
                    Lọc status
                  </label>
                  <select
                    id='ch-filter-status'
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className='w-full rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer'
                    style={{
                      background: 'var(--code-bg)',
                      color: 'var(--text-h)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <option value='__all__'>Tất cả</option>
                    {statusOptions.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : null}

          <div
            className='overflow-auto rounded-2xl max-h-[min(70vh,720px)] w-full min-w-0'
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <table className='w-full min-w-0 text-sm' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead className='sticky top-0 z-1'>
                <tr style={{ background: 'var(--code-bg)' }}>
                  {detailTheadHeaders.map(h => (
                    <th
                      key={h}
                      className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-xs tracking-wider'
                      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailLoading ? (
                  <tr>
                    <td colSpan={detailColCount} className='px-4 py-8 text-center'>
                      <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                        <SpinnerIcon className='w-5 h-5' />
                        <span>Đang đọc dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                ) : detail?.rows?.length ? (
                  detailLayout.tableHeaders.length === 0 ? (
                    <tr>
                      <td className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                        File chỉ có cột meta (email / tên / tags), không có cột bảng video.
                      </td>
                    </tr>
                  ) : filteredRowsWithIndex.length === 0 ? (
                    <tr>
                      <td colSpan={detailColCount} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                        Không có dòng nào khớp bộ lọc duration / status.
                      </td>
                    </tr>
                  ) : (
                    filteredRowsWithIndex.map(({ row, originalIndex }) => (
                      <tr
                        key={originalIndex}
                        className='transition-colors duration-150'
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {detailLayout.tableHeaders.map(h => {
                          const isStartCol = canSetStartFrom && detailLayout.startFromKey === h;
                          if (isStartCol) {
                            const marked = String(row[h] ?? '').trim();
                            return (
                              <td key={h} className='px-4 py-3 align-top min-w-28'>
                                <div className='flex flex-col gap-2 items-start'>
                                  {marked ? (
                                    <span className='text-[10px] font-medium uppercase tracking-wider' style={{ color: 'var(--accent)' }}>
                                      Điểm bắt đầu
                                    </span>
                                  ) : null}
                                  <button
                                    type='button'
                                    disabled={startMarkingIndex !== null}
                                    onClick={() => void handleSetStartFromRow(originalIndex)}
                                    className='rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
                                    style={{
                                      color: '#fff',
                                      background: 'var(--accent)',
                                      border: '1px solid var(--accent)',
                                    }}
                                  >
                                    {startMarkingIndex === originalIndex ? (
                                      <span className='inline-flex items-center gap-2'>
                                        <SpinnerIcon className='w-3.5 h-3.5' />
                                        Đang lưu…
                                      </span>
                                    ) : (
                                      'Start'
                                    )}
                                  </button>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={h}
                              className='px-4 py-3 align-top wrap-break-word min-w-0'
                              style={{ color: 'var(--text-h)' }}
                              title={String(row[h] ?? '')}
                            >
                              {String(row[h] ?? '')}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan={detailColCount} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                      {detail?.fileName
                        ? 'File không có dòng dữ liệu hoặc không đọc được.'
                        : 'Không có file .xlsx / .csv trong thư mục channel này.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
