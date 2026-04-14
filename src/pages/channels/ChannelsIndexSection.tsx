import { useEffect, useMemo, useRef } from 'react';
import type { ChannelsIndexSectionProps } from './channelsIndexSection.model';
import { SpinnerIcon } from '@/components/ui/Icons';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import { findIndexHeaderKey, findIndexHeaderKeyAny } from './channelIndexHelpers';
import { CHANNELS_INDEX_VISIBLE_COLUMNS } from './channelsIndexSection.model';

export function ChannelsIndexSection({
  indexHeaders,
  indexListError,
  indexLoading,
  indexSaving,
  indexDraftRows,
  pageIndexRows,
  indexPag,
  indexColCount,
  selectedRowIndices,
  onToggleRowSelected,
  onToggleSelectAllOnPage,
  pageSelectAll,
  pageSelectSome,
}: ChannelsIndexSectionProps) {
  /** Nhãn cột cố định + khóa thực tế trên `row` (theo header file). */
  const indexDisplayColumns = useMemo(() => {
    const fileHeaders = indexHeaders;
    return CHANNELS_INDEX_VISIBLE_COLUMNS.map(label => {
      const rowKey =
        label === 'ID'
          ? findIndexHeaderKeyAny(fileHeaders, ['ID', 'CHANNEL'])
          : findIndexHeaderKey(fileHeaders, label);
      return { label, rowKey: rowKey ?? '' };
    });
  }, [indexHeaders]);
  const headerSelectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = pageSelectSome && !pageSelectAll;
  }, [pageSelectAll, pageSelectSome]);

  return (
    <div className='space-y-4 w-full min-w-0'>
      {indexListError && (
        <div
          className='rounded-2xl px-4 py-3 text-base wrap-break-word'
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
        className='rounded-2xl w-full min-w-0 overflow-hidden'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--code-bg)' }}>
                <th
                  className='w-12 px-2 py-3 text-center align-middle'
                  style={{ borderBottom: '1px solid var(--border)' }}
                  scope='col'
                >
                  <input
                    ref={headerSelectRef}
                    type='checkbox'
                    className='w-4 h-4 cursor-pointer rounded border align-middle'
                    style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                    checked={pageSelectAll}
                    onChange={() => onToggleSelectAllOnPage()}
                    disabled={indexLoading || indexSaving || pageIndexRows.length === 0}
                    aria-label='Chọn tất cả kênh trên trang này'
                  />
                </th>
                {indexDisplayColumns.map((col, colIdx) => (
                  <th
                    key={`idx-h-${colIdx}-${col.label}`}
                    className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {indexLoading ? (
                <tr>
                  <td colSpan={indexColCount} className='px-4 py-8 text-center'>
                    <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                      <SpinnerIcon className='w-5 h-5' />
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : indexDraftRows.length > 0 ? (
                pageIndexRows.map((row, i) => {
                  const globalIndex = indexPag.startIndex + i;
                  return (
                    <tr
                      key={globalIndex}
                      className={`transition-colors duration-150${indexSaving ? '' : ' cursor-pointer'}`}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => {
                        if (!indexSaving) onToggleRowSelected(globalIndex);
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td
                        className='px-2 py-3 align-middle text-center'
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type='checkbox'
                          className='w-4 h-4 cursor-pointer rounded border align-middle'
                          style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                          checked={selectedRowIndices.has(globalIndex)}
                          onChange={() => onToggleRowSelected(globalIndex)}
                          disabled={indexSaving}
                          aria-label={`Chọn kênh dòng ${globalIndex + 1}`}
                        />
                      </td>
                      {indexDisplayColumns.map((col, colIdx) => {
                        const cell = col.rowKey ? row[col.rowKey] : '';
                        return (
                          <td
                            key={`idx-c-${colIdx}-${col.label}`}
                            className='px-4 py-3 align-top wrap-break-word min-w-0'
                            style={{ color: 'var(--text-h)' }}
                            title={String(cell ?? '')}
                          >
                            {String(cell ?? '')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={indexDisplayColumns.length + 1} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                    Chưa có dữ liệu trong index. Hãy thêm channel từ Pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!indexLoading && indexDraftRows.length > 0 ? (
          <TablePaginationBar
            page={indexPag.page}
            totalPages={indexPag.totalPages}
            onPageChange={indexPag.setPage}
            totalItems={indexDraftRows.length}
            pageSize={indexPag.pageSize}
          />
        ) : null}
      </div>
    </div>
  );
}
