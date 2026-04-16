import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelData, ChannelRow, Page, ScriptId } from '../../types';
import { MusicIcon, RefreshIcon, SpinnerIcon, ArrowRightIcon, AlertIcon } from '@/components/ui/Icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import { useClientPagination } from '@/hooks/useClientPagination';
import { CreateVideoFromAudioPanel } from '@/pages/create-video/CreateVideoFromAudioPanel';
import { CreateVideoReupPanel } from '@/pages/create-video/CreateVideoReupPanel';
import { AppButton } from '@/components/ui/AppButton';
import { INDEX_FILE, TABLE_COLUMNS } from './constants';
import { ChannelAddDialog } from '../channels/ChannelAddDialog';
import { ListVideoDetail } from './components/ListVideoDetail';
import { MappingChannel } from './components/MappingChannel';

interface Props {
  disabled?: boolean;
  runningScript: ScriptId | null;
  setRunningScript: (id: ScriptId | null) => void;
  appendErrorLog: (line: string) => void;
  onNavigate: (page: Page) => void;
}

function formatIndexCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

function CreateVideoPage({ disabled = false, runningScript, setRunningScript, appendErrorLog, onNavigate }: Props) {
  const [data, setData] = useState<ChannelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<ChannelRow[]>([]);
  const [popupStatus, setPopupStatus] = useState<{ row: ChannelRow; status: 'edit' | 'add' } | null>(null);
  /** Trang danh sách video (full page), null = trang bảng index. */
  const [videoListRow, setVideoListRow] = useState<ChannelRow | null>(null);

  const headerSelectRef = useRef<HTMLInputElement>(null);

  const handleOpenEditRow = useCallback((row: ChannelRow) => {
    setPopupStatus({ row, status: 'edit' });
  }, []);

  const handleOpenDetailListVideos = useCallback((row: ChannelRow) => {
    setVideoListRow(row);
  }, []);

  const loadDataFromIndex = useCallback(async () => {
    if (typeof window.runner?.readChannelData !== 'function') {
      setData({ headers: [], rows: [] });
      setSelectedRows([]);
      return;
    }
    setIsLoading(true);
    try {
      const d = await window.runner.readChannelData(INDEX_FILE);
      setData(d);
      setSelectedRows([]);
    } catch (e) {
      setData({ headers: [], rows: [] });
      setSelectedRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (videoListRow == null) void loadDataFromIndex();
  }, [videoListRow, loadDataFromIndex]);

  const indexRows = useMemo(() => data?.rows ?? [], [data]);

  const indexPag = useClientPagination(indexRows.length);
  const pageIndexRows = useMemo(
    () => indexRows.slice(indexPag.startIndex, indexPag.startIndex + indexPag.pageSize),
    [indexRows, indexPag.startIndex, indexPag.pageSize]
  );

  const indexPageSelectionFlags = useMemo(() => {
    const selectedRowIndices = selectedRows.map(row => indexRows.indexOf(row));
    const start = indexPag.startIndex;
    const end = Math.min(start + indexPag.pageSize, indexRows.length);
    const onPage: number[] = [];
    for (let i = start; i < end; i++) onPage.push(selectedRowIndices[i]);
    const all = onPage.length > 0 && onPage.every(i => selectedRowIndices.includes(i));
    const some = onPage.some(i => selectedRowIndices.includes(i));
    return { all, some };
  }, [indexPag.startIndex, indexPag.pageSize, indexRows.length, selectedRows]);

  const toggleIndexRowSelected = useCallback((row: ChannelRow) => {
    setSelectedRows(prev => {
      const next = [...prev];
      if (next.includes(row)) next.splice(next.indexOf(row), 1);
      else next.push(row);
      return next;
    });
  }, []);

  const toggleIndexSelectAllOnPage = useCallback(() => {
    const start = indexPag.startIndex;
    const end = Math.min(start + indexPag.pageSize, indexRows.length);
    const onPage: number[] = [];
    for (let i = start; i < end; i++) onPage.push(i);
    setSelectedRows(prev => {
      const next = [...prev];
      const allSelected = onPage.length > 0 && onPage.every(i => next.includes(indexRows[i]));
      if (allSelected) onPage.forEach(i => next.splice(next.indexOf(indexRows[i]), 1));
      else onPage.forEach(i => next.push(indexRows[i]));
      return next;
    });
  }, [indexPag.startIndex, indexPag.pageSize, indexRows.length, indexRows]);

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = indexPageSelectionFlags.some && !indexPageSelectionFlags.all;
  }, [indexPageSelectionFlags.all, indexPageSelectionFlags.some]);

  if (videoListRow != null) {
    return (
      <ListVideoDetail
        row={videoListRow}
        indexHeaders={
          data?.headers?.length
            ? data.headers
            : Array.from(new Set([...TABLE_COLUMNS.map(h => h.key), ...Object.keys(videoListRow)]))
        }
        onBack={() => setVideoListRow(null)}
      />
    );
  }

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        title='Tạo video'
        description=''
        actions={
          <AppButton type='button' variant='secondary' onClick={() => void loadDataFromIndex()} disabled={isLoading}>
            {isLoading ? <SpinnerIcon className='w-4 h-4' /> : <RefreshIcon className='w-4 h-4' />}
            <span>{isLoading ? 'Đang tải...' : 'Tải lại'}</span>
          </AppButton>
        }
      />

      {disabled && (
        <div className='mavid-callout-warning'>
          <AlertIcon className='w-5 h-5 shrink-0' />
          <span>Đang có script chạy. Vui lòng chờ hoàn tất.</span>
        </div>
      )}

      <section className='space-y-3 w-full min-w-0' aria-label='Danh sách kênh từ index.xlsx'>
        <div
          className='rounded-2xl w-full min-w-0 overflow-hidden'
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <div className='overflow-auto w-full min-w-0 max-h-[min(420px,50vh)]'>
            {isLoading ? (
              <div className='flex items-center justify-center gap-2 py-16 text-sm' style={{ color: 'var(--text)' }}>
                <SpinnerIcon className='w-5 h-5' />
                Đang đọc index…
              </div>
            ) : data?.rows?.length === 0 ? (
              <p className='py-10 px-4 text-sm text-center' style={{ color: 'var(--text)' }}>
                Chưa có dữ liệu.
              </p>
            ) : (
              <table className='w-full min-w-0 text-sm' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ background: 'var(--code-bg)' }}>
                    <th className='w-12 px-2 py-2 text-center align-middle' style={{ borderBottom: '1px solid var(--border)' }} scope='col'>
                      <input
                        ref={headerSelectRef}
                        type='checkbox'
                        className='w-4 h-4 cursor-pointer rounded border align-middle'
                        style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                        checked={indexPageSelectionFlags.all}
                        onChange={() => toggleIndexSelectAllOnPage()}
                        disabled={isLoading || pageIndexRows.length === 0}
                        aria-label='Chọn tất cả kênh trên trang này'
                      />
                    </th>

                    {TABLE_COLUMNS.map(h => (
                      <th
                        key={h.key}
                        className='px-3 py-2 text-left font-semibold align-middle whitespace-nowrap'
                        style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-h)' }}
                        scope='col'
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={TABLE_COLUMNS.length + 1} className='px-4 py-8 text-center'>
                        <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                          <SpinnerIcon className='w-5 h-5' />
                          <span>Đang tải dữ liệu...</span>
                        </div>
                      </td>
                    </tr>
                  ) : indexRows.length > 0 ? (
                    pageIndexRows.map((row, i) => {
                      const globalIndex = indexPag.startIndex + i;
                      return (
                        <tr
                          key={globalIndex}
                          className='transition-colors duration-150 cursor-pointer'
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onClick={() => toggleIndexRowSelected(row)}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--hover-bg)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <td className='px-2 py-2 align-middle text-center' onClick={e => e.stopPropagation()}>
                            <input
                              type='checkbox'
                              className='w-4 h-4 cursor-pointer rounded border align-middle'
                              style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                              checked={selectedRows.includes(row)}
                              onChange={() => toggleIndexRowSelected(row)}
                              disabled={isLoading}
                              aria-label={`Chọn kênh dòng ${globalIndex + 1}`}
                            />
                          </td>

                          {TABLE_COLUMNS.map(h => (
                            <td
                              key={h.key}
                              className={`px-3 py-2 align-center wrap-break-word max-w-[min(280px,40vw)] ${
                                h.key === 'ACTIONS' ? 'w-[280px]' : ''
                              }`}
                              style={{ color: 'var(--text)' }}
                              title={formatIndexCell(row[h.key])}
                            >
                              {h.key === 'ACTIONS' ? (
                                <div className='flex items-center gap-2'>
                                  <AppButton type='button' variant='secondary' onClick={() => handleOpenEditRow(row)}>
                                    <span>Chỉnh sửa</span>
                                  </AppButton>
                                  <AppButton type='button' variant='secondary' onClick={() => handleOpenDetailListVideos(row)}>
                                    <span>Danh sách video</span>
                                  </AppButton>
                                </div>
                              ) : (
                                formatIndexCell(row[h.key])
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={TABLE_COLUMNS.length + 1} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                        Chưa có dữ liệu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {!isLoading && indexRows.length > 0 ? (
            <TablePaginationBar
              page={indexPag.page}
              totalPages={indexPag.totalPages}
              onPageChange={indexPag.setPage}
              totalItems={indexRows.length}
              pageSize={indexPag.pageSize}
            />
          ) : null}
        </div>
      </section>

      {popupStatus !== null && popupStatus.row != null && (
        <MappingChannel
          initialRow={popupStatus.status === 'edit' ? popupStatus.row : null}
          indexHeaders={TABLE_COLUMNS.map(h => h.key)}
          backgroundFolders={[]}
          indexRows={indexRows}
          onClose={() => setPopupStatus(null)}
        />
      )}
    </div>
  );
}

export default CreateVideoPage;
