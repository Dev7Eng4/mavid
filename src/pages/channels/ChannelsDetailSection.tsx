import { CustomSelect } from '@/components/ui/CustomSelect';
import { SpinnerIcon } from '@/components/ui/Icons';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import type { ChannelsDetailSectionProps } from './channelsDetailSectionShared';
import { DETAIL_STATUS_FILTER_OPTIONS } from './channelsDetailSectionShared';

const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors duration-150';

export function ChannelsDetailSection({
  detailFileName,
  detailLoading,
  detailRowsLength,
  detailLayout,
  showDetailMetaAbove: _showDetailMetaAbove,
  detailActionError,
  filterLink,
  onFilterLinkChange,
  filterDurationPreset,
  onFilterDurationPresetChange,
  filterStatusFixed,
  onFilterStatusFixedChange,
  durationSelectOptions,
  detailTheadHeaders,
  detailColCount,
  pageDetailRows,
  filteredRowsCount,
  detailPag,
  canSetStartFrom,
  startMarkingIndex,
  onSetStartFromRow,
  detailSelectedRowIndices,
  onToggleDetailRowSelected,
}: ChannelsDetailSectionProps) {
  const lk = detailLayout.linkVideoKey;
  const dk = detailLayout.durationKey;
  const sk = detailLayout.statusKey;
  const showSearchBar =
    !detailLoading && detailRowsLength > 0 && detailLayout.tableHeaders.length > 0 && (Boolean(lk) || Boolean(dk) || Boolean(sk));

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

      {showSearchBar ? (
        <div
          className='rounded-2xl p-4 w-full min-w-0 space-y-3'
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <div className='text-sm font-medium uppercase tracking-wider' style={{ color: 'var(--text-muted)' }}>
            Tìm & lọc
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
            {lk ? (
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
            ) : null}
            {dk ? (
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
            ) : null}
            {sk ? (
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
            ) : null}
          </div>
        </div>
      ) : null}

      {!detailLoading && detailRowsLength > 0 && detailLayout.tableHeaders.length > 0 ? (
        <div
          className='rounded-2xl px-4 py-3 w-full min-w-0'
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <p className='text-sm min-w-0' style={{ color: 'var(--text-muted)' }}>
            Chọn một hoặc nhiều dòng video (checkbox / click dòng). Nút <strong style={{ color: 'var(--text-h)' }}>Cập nhật meta</strong> trên
            thanh tiêu đề chỉ chạy cho dòng có status «Đã tạo video» (thiếu Gemini hoặc thiếu ảnh thumbnail).
          </p>
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
                      Không có dòng nào khớp bộ lọc (link / thời lượng / status).
                    </td>
                  </tr>
                ) : (
                  pageDetailRows.map(({ row, originalIndex }) => (
                    <tr
                      key={originalIndex}
                      className='transition-colors duration-150 cursor-pointer'
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: detailSelectedRowIndices.has(originalIndex) ? 'var(--hover-bg)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = detailSelectedRowIndices.has(originalIndex)
                          ? 'var(--hover-bg)'
                          : 'transparent';
                      }}
                      onClick={e => {
                        if (window.getSelection()?.toString()) return;
                        if ((e.target as HTMLElement).closest('button, a')) return;
                        onToggleDetailRowSelected(originalIndex);
                      }}
                    >
                      {detailLayout.tableHeaders.map((h, colIndex) => {
                        const isStartCol = canSetStartFrom && detailLayout.startFromKey === h;
                        if (isStartCol) {
                          const marked = String(row[h] ?? '').trim();
                          return (
                            <td key={h} className='px-4 py-3 align-top min-w-28'>
                              <div className='flex items-start gap-2'>
                                {colIndex === 0 && (
                                  <input
                                    type='checkbox'
                                    className='mt-1 cursor-pointer w-4 h-4 shrink-0'
                                    checked={detailSelectedRowIndices.has(originalIndex)}
                                    readOnly
                                  />
                                )}
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
                            <div className='flex items-start gap-2'>
                              {colIndex === 0 && (
                                <input
                                  type='checkbox'
                                  className='mt-1 cursor-pointer w-4 h-4 shrink-0'
                                  checked={detailSelectedRowIndices.has(originalIndex)}
                                  readOnly
                                />
                              )}
                              <span className='flex-1 break-all'>{String(row[h] ?? '')}</span>
                            </div>
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
