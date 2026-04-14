import { useEffect, useRef } from 'react';
import type { ChannelsIndexSectionProps } from './channelsIndexSection.model';
import { SpinnerIcon } from '@/components/ui/Icons';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import { CHANNELS_INDEX_TABLE_HEADERS } from './channelsIndexSection.model';

export function ChannelsIndexSection({
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
  const headers = CHANNELS_INDEX_TABLE_HEADERS;
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
                {headers.map(h => (
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
                      {headers.map(h => (
                        <td
                          key={h}
                          className='px-4 py-3 align-top wrap-break-word min-w-0'
                          style={{ color: 'var(--text-h)' }}
                          title={String(row[h] ?? '')}
                        >
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={headers.length + 1} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
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
