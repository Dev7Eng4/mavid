import { useEffect, useRef } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SpinnerIcon } from '@/components/ui/Icons';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import type { ChannelsDetailSectionProps } from '../models/channelsDetailSectionShared';
import { DETAIL_STATUS_FILTER_OPTIONS } from '../models/channelsDetailSectionShared';
import { CHANNEL_DETAIL } from '../models/channelsIndexSection.model';

const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors duration-150';

export function ChannelsDetailSection({
  detailLoading,
  detailRowsLength,
  detailActionError,
  filterLink,
  onFilterLinkChange,
  filterDurationPreset,
  onFilterDurationPresetChange,
  filterStatusFixed,
  onFilterStatusFixedChange,
  durationSelectOptions,
  detailColCount,
  pageDetailRows,
  detailPag,
  detailSelectedRowIndices,
  onToggleDetailRowSelected,
  detailPageSelectAll,
  detailPageSelectSome,
  onToggleDetailSelectAllOnPage,
}: ChannelsDetailSectionProps) {
  console.log('🚀 ~ ChannelsDetailSection ~ pageDetailRows:', pageDetailRows);
  const headerSelectRef = useRef<HTMLInputElement>(null);
  const detailBulkSelectDisabled = detailLoading || pageDetailRows.length === 0;

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = detailPageSelectSome && !detailPageSelectAll;
  }, [detailPageSelectAll, detailPageSelectSome]);

  return (
    <div className='space-y-4 w-full min-w-0'>
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

      <div className='rounded-2xl p-4 w-full min-w-0 space-y-3' style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className='text-sm font-medium uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>
          Tìm & lọc
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
          <label className='block min-w-0'>
            <span className='block text-sm mb-2' style={{ color: 'var(--text-h)' }}>
              Link video
            </span>
            <input
              type='search'
              value={filterLink}
              onChange={e => onFilterLinkChange(e.target.value)}
              placeholder='Tìm trong URL / link…'
              autoComplete='off'
              className={inputClass}
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                borderColor: 'var(--border)',
              }}
            />
          </label>
          <div className='min-w-0'>
            <div className='text-sm mb-2' style={{ color: 'var(--text-h)' }}>
              Thời lượng (khoảng)
            </div>
            <CustomSelect
              value={filterDurationPreset}
              options={durationSelectOptions}
              onChange={onFilterDurationPresetChange}
              placeholder='Chọn khoảng'
              menuZIndex={100}
            />
          </div>
          <div className='min-w-0'>
            <div className='text-sm mb-2' style={{ color: 'var(--text-h)' }}>
              Status
            </div>
            <CustomSelect
              value={filterStatusFixed}
              options={DETAIL_STATUS_FILTER_OPTIONS}
              onChange={onFilterStatusFixedChange}
              placeholder='Status'
              menuZIndex={100}
            />
          </div>
        </div>
      </div>

      <div
        className='rounded-2xl w-full min-w-0 flex flex-col max-h-[min(70vh,720px)]'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0 min-h-0 flex-1'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead className='sticky top-0 z-1'>
              <tr style={{ background: 'var(--code-bg)' }}>
                <th className='w-12 px-2 py-3 text-center align-middle' style={{ borderBottom: '1px solid var(--border)' }} scope='col'>
                  <input
                    ref={headerSelectRef}
                    type='checkbox'
                    className='w-4 h-4 cursor-pointer rounded border align-middle'
                    style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                    checked={detailPageSelectAll}
                    onChange={() => onToggleDetailSelectAllOnPage()}
                    disabled={detailBulkSelectDisabled}
                    aria-label='Chọn tất cả video trên trang này'
                  />
                </th>
                {CHANNEL_DETAIL.map(h => (
                  <th
                    key={h.key}
                    className='text-center px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    {h.label}
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
                pageDetailRows.map((row, originalIndex) => (
                  <tr
                    key={row.link}
                    className='transition-colors duration-150 cursor-pointer'
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: detailSelectedRowIndices.has(row.link) ? 'var(--hover-bg)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--hover-bg)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = detailSelectedRowIndices.has(row.link) ? 'var(--hover-bg)' : 'transparent';
                    }}
                    onClick={() => {
                      onToggleDetailRowSelected(row.link);
                    }}
                  >
                    <td className='px-2 py-3 align-top text-center w-12' onClick={e => e.stopPropagation()}>
                      <input
                        type='checkbox'
                        className='mt-1 cursor-pointer w-4 h-4 shrink-0 rounded border align-middle'
                        style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                        checked={detailSelectedRowIndices.has(row.link)}
                        onChange={() => onToggleDetailRowSelected(row.link)}
                        aria-label={`Chọn dòng ${row.link}`}
                      />
                    </td>
                    <td className='px-2 py-3 align-top text-center w-12'>
                      {row.link}
                    </td>
                    <td className='px-2 py-3 align-top text-center w-12'>
                      {row.views}
                    </td>
                    <td className='px-2 py-3 align-top text-center w-12'>
                      {row.duration}
                    </td>
                    <td className='px-2 py-3 align-top text-center w-12'>
                      {row.status}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
        {!detailLoading && detailRowsLength > 0 ? (
          <TablePaginationBar
            page={detailPag.page}
            totalPages={detailPag.totalPages}
            onPageChange={detailPag.setPage}
            totalItems={detailRowsLength}
            pageSize={detailPag.pageSize}
          />
        ) : null}
      </div>
    </div>
  );
}
