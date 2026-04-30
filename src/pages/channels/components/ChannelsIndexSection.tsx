import { useEffect, useMemo, useRef } from 'react';
import type { ChannelsIndexSectionProps } from '../models/channelsIndexSection.model';
import { SpinnerIcon } from '@/components/ui/Icons';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import { CHANNELS_INDEX_VISIBLE_COLUMNS, CHANNELS_INDEX_COLUMN_LABELS, CHANNELS } from '../models/channelsIndexSection.model';

export function ChannelsIndexSection({
  loading,
  pageIndexRows,
  indexFilteredCount,
  indexPag,
  indexColCount,
  selectedRows,
  onToggleRowSelected,
  onToggleSelectAllOnPage,
  onOpenEditRow,
  onOpenDetailRow,
  pageSelectAll,
  pageSelectSome,
  groupNameById = {},
}: ChannelsIndexSectionProps) {
  console.log('🚀 ~ ChannelsIndexSection ~ pageIndexRows:', pageIndexRows);
  /** Prop name = row key trực tiếp; label lấy từ CHANNELS_INDEX_COLUMN_LABELS. */
  const indexDisplayColumns = useMemo(() => {
    return CHANNELS_INDEX_VISIBLE_COLUMNS.map(prop => ({
      label: CHANNELS_INDEX_COLUMN_LABELS[prop] ?? prop,
      rowKey: prop,
    }));
  }, []);
  const headerSelectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = pageSelectSome && !pageSelectAll;
  }, [pageSelectAll, pageSelectSome]);

  return (
    <div className='space-y-4 w-full min-w-0'>
      <div
        className='rounded-2xl w-full min-w-0 overflow-hidden'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--code-bg)' }}>
                <th className='w-12 px-2 py-3 text-center align-middle' style={{ borderBottom: '1px solid var(--border)' }} scope='col'>
                  <input
                    ref={headerSelectRef}
                    type='checkbox'
                    className='w-4 h-4 cursor-pointer rounded border align-middle'
                    style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                    checked={pageSelectAll}
                    onChange={() => onToggleSelectAllOnPage()}
                    disabled={loading || pageIndexRows.length === 0}
                    aria-label='Chọn tất cả kênh trên trang này'
                  />
                </th>
                {CHANNELS.map((col, colIdx) =>
                  col.show ? (
                    <th
                      key={`idx-h-${colIdx}-${col.key}`}
                      className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
                      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                    >
                      {col.label}
                    </th>
                  ) : null,
                )}
                <th
                  className='text-center px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider w-28'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={indexColCount} className='px-4 py-8 text-center'>
                    <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                      <SpinnerIcon className='w-5 h-5' />
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : pageIndexRows.length === 0 && indexFilteredCount === 0 ? (
                <tr>
                  <td colSpan={indexColCount} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                    Không có dòng nào khớp bộ lọc (email / nhóm).
                  </td>
                </tr>
              ) : (
                pageIndexRows.map((row, i) => {
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-150cursor-pointer`}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => {
                        onToggleRowSelected(row.id);
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td className='px-2 py-3 align-middle text-center' onClick={e => e.stopPropagation()}>
                        <input
                          type='checkbox'
                          className='w-4 h-4 cursor-pointer rounded border align-middle'
                          style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                          checked={selectedRows.has(row.id)}
                          onChange={() => onToggleRowSelected(row.id)}
                          aria-label={`Chọn kênh dòng ${row.id}`}
                        />
                      </td>
                      {CHANNELS.map((col, colIdx) => {
                        if (!col.show) return null;

                        const cell = col.key ? row[col.key] : '';
                        const raw = String(cell ?? '').trim();
                        const isGroupCol = col.key === 'group';
                        const displayText = (() => {
                          if (!isGroupCol) return String(cell ?? '');
                          if (!raw) return '';
                          const name = groupNameById[raw];
                          return name?.trim() ? name.trim() : raw;
                        })();

                        return (
                          <td
                            key={`idx-c-${colIdx}-${col.label}`}
                            className='px-4 py-3 align-top wrap-break-word min-w-0'
                            style={{ color: 'var(--text-h)' }}
                          >
                            {displayText}
                          </td>
                        );
                      })}

                      <td
                        className='px-4 py-3 align-top whitespace-nowrap text-center space-x-3'
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation();
                            onOpenEditRow(row.id);
                          }}
                          className='text-sm font-medium hover:underline transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
                          style={{ color: 'var(--accent)' }}
                        >
                          Sửa
                        </button>
                        <button
                          type='button'
                          onClick={e => {
                            e.stopPropagation();
                            onOpenDetailRow(row.id);
                          }}
                          className='text-sm font-medium hover:underline transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
                          style={{ color: 'var(--accent)' }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && indexFilteredCount > 0 ? (
          <TablePaginationBar
            page={indexPag.page}
            totalPages={indexPag.totalPages}
            onPageChange={indexPag.setPage}
            totalItems={indexFilteredCount}
            pageSize={indexPag.pageSize}
          />
        ) : null}
      </div>
    </div>
  );
}
