import type { ChannelRow } from '../../../types';
import { SpinnerIcon } from '../../ui/Icons';
import { TablePaginationBar } from '../../ui/TablePaginationBar';
import { formatSecondsAsDuration } from './channelDurationFormat';

export const DETAIL_TABLE_LOADING_HEADERS = ['LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS', 'START FROM'] as const;

export interface ChannelDetailLayoutModel {
  meta: { email: string; channelName: string; channelTags: string };
  tableHeaders: string[];
  showEmail: boolean;
  showChannelName: boolean;
  showTags: boolean;
  durationKey?: string;
  statusKey?: string;
  startFromKey?: string;
}

export interface DurationBoundsModel {
  min: number;
  max: number;
  hasData: boolean;
}

export interface ChannelsDetailPagination {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
}

export interface ChannelsDetailSectionProps {
  detailFileName: string | null | undefined;
  detailLoading: boolean;
  detailRowsLength: number;
  detailLayout: ChannelDetailLayoutModel;
  showDetailMetaAbove: boolean;
  detailActionError: string | null;
  durationBounds: DurationBoundsModel;
  durationSliderMin: number;
  durationSliderMax: number;
  onDurationSliderMinChange: (v: number) => void;
  onDurationSliderMaxChange: (v: number) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  statusOptions: string[];
  detailTheadHeaders: readonly string[];
  detailColCount: number;
  pageDetailRows: { row: ChannelRow; originalIndex: number }[];
  filteredRowsCount: number;
  detailPag: ChannelsDetailPagination;
  canSetStartFrom: boolean;
  startMarkingIndex: number | null;
  onSetStartFromRow: (dataRowIndex: number) => void;
}

export function ChannelsDetailSection({
  detailFileName,
  detailLoading,
  detailRowsLength,
  detailLayout,
  showDetailMetaAbove,
  detailActionError,
  durationBounds,
  durationSliderMin,
  durationSliderMax,
  onDurationSliderMinChange,
  onDurationSliderMaxChange,
  filterStatus,
  onFilterStatusChange,
  statusOptions,
  detailTheadHeaders,
  detailColCount,
  pageDetailRows,
  filteredRowsCount,
  detailPag,
  canSetStartFrom,
  startMarkingIndex,
  onSetStartFromRow,
}: ChannelsDetailSectionProps) {
  const dk = detailLayout.durationKey;
  const sk = detailLayout.statusKey;
  const showFilterBar =
    !detailLoading &&
    detailRowsLength > 0 &&
    ((dk && durationBounds.hasData) || (sk && statusOptions.length > 0));

  return (
    <div className='space-y-4 w-full min-w-0'>
      {detailFileName ? (
        <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
          File: <span style={{ color: 'var(--text-h)' }}>{detailFileName}</span>
        </p>
      ) : null}

      {showDetailMetaAbove && (
        <div className='rounded-2xl p-5 w-full min-w-0' style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {detailLayout.showEmail && (
              <div className='min-w-0'>
                <div className='text-sm font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                  Email
                </div>
                <div className='text-base wrap-break-word' style={{ color: 'var(--text-h)' }}>
                  {detailLayout.meta.email || '—'}
                </div>
              </div>
            )}
            {detailLayout.showChannelName && (
              <div className='min-w-0'>
                <div className='text-sm font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                  Channel name
                </div>
                <div className='text-base wrap-break-word' style={{ color: 'var(--text-h)' }}>
                  {detailLayout.meta.channelName || '—'}
                </div>
              </div>
            )}
            {detailLayout.showTags && (
              <div className='min-w-0 md:col-span-1'>
                <div className='text-sm font-medium uppercase tracking-wider mb-2' style={{ color: 'var(--text-muted)' }}>
                  Channel tags
                </div>
                <div className='text-base wrap-break-word' style={{ color: 'var(--text-h)' }}>
                  {detailLayout.meta.channelTags || '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {detailActionError && (
        <div
          className='rounded-2xl px-4 py-3 text-base wrap-break-word'
          style={{
            color: '#fecaca',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          {detailActionError}
        </div>
      )}

      {showFilterBar ? (
        <div
          className='flex flex-wrap items-end gap-6 rounded-2xl p-4 w-full min-w-0'
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          {dk && durationBounds.hasData ? (
            <div className='min-w-56 flex-1 space-y-3'>
              <div className='text-sm font-medium uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>
                Lọc duration (kéo min / max)
              </div>
              <div className='flex flex-wrap items-center justify-between gap-2 text-base' style={{ color: 'var(--text-h)' }}>
                <span>
                  Từ <strong style={{ color: 'var(--accent)' }}>{formatSecondsAsDuration(durationSliderMin)}</strong>
                </span>
                <span>
                  Đến <strong style={{ color: 'var(--accent)' }}>{formatSecondsAsDuration(durationSliderMax)}</strong>
                </span>
              </div>
              <div className='space-y-1'>
                <label className='text-sm' style={{ color: 'var(--text-muted)' }} htmlFor='ch-dur-min'>
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
                    onDurationSliderMinChange(Math.min(v, durationSliderMax));
                  }}
                  className='w-full h-2 rounded-lg cursor-pointer'
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>
              <div className='space-y-1'>
                <label className='text-sm' style={{ color: 'var(--text-muted)' }} htmlFor='ch-dur-max'>
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
                    onDurationSliderMaxChange(Math.max(v, durationSliderMin));
                  }}
                  className='w-full h-2 rounded-lg cursor-pointer'
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>
              <p className='text-sm leading-snug' style={{ color: 'var(--text-muted)' }}>
                Phạm vi trong file: {formatSecondsAsDuration(durationBounds.min)} — {formatSecondsAsDuration(durationBounds.max)}. Dòng không đọc
                được duration chỉ hiện khi khoảng trùng toàn bộ phạm vi.
              </p>
            </div>
          ) : null}
          {sk && statusOptions.length > 0 && (
            <div className='min-w-44 flex-1'>
              <label
                className='block text-sm font-medium uppercase tracking-wider mb-2'
                style={{ color: 'var(--text-muted)' }}
                htmlFor='ch-filter-status'
              >
                Lọc status
              </label>
              <select
                id='ch-filter-status'
                value={filterStatus}
                onChange={e => onFilterStatusChange(e.target.value)}
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
        className='rounded-2xl w-full min-w-0 flex flex-col max-h-[min(70vh,720px)]'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0 min-h-0 flex-1'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead className='sticky top-0 z-1'>
              <tr style={{ background: 'var(--code-bg)' }}>
                {detailTheadHeaders.map(h => (
                  <th
                    key={h}
                    className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
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
              ) : detailRowsLength ? (
                detailLayout.tableHeaders.length === 0 ? (
                  <tr>
                    <td className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                      File chỉ có cột meta (email / tên / tags), không có cột bảng video.
                    </td>
                  </tr>
                ) : filteredRowsCount === 0 ? (
                  <tr>
                    <td colSpan={detailColCount} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                      Không có dòng nào khớp bộ lọc duration / status.
                    </td>
                  </tr>
                ) : (
                  pageDetailRows.map(({ row, originalIndex }) => (
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
                                  <span className='text-sm font-medium uppercase tracking-wider' style={{ color: 'var(--accent)' }}>
                                    Điểm bắt đầu
                                  </span>
                                ) : null}
                                <button
                                  type='button'
                                  disabled={startMarkingIndex !== null}
                                  onClick={() => void onSetStartFromRow(originalIndex)}
                                  className='rounded-lg px-3 py-1.5 text-base font-medium cursor-pointer transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
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
                    {detailFileName
                      ? 'File không có dòng dữ liệu hoặc không đọc được.'
                      : 'Không có file .xlsx / .csv trong thư mục channel này.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!detailLoading && filteredRowsCount > 0 ? (
          <TablePaginationBar
            page={detailPag.page}
            totalPages={detailPag.totalPages}
            onPageChange={detailPag.setPage}
            totalItems={filteredRowsCount}
            pageSize={detailPag.pageSize}
          />
        ) : null}
      </div>
    </div>
  );
}
