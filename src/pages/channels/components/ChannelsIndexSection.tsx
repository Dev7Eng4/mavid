import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChannelsIndexSectionProps } from '../models/channelsIndexSection.model';
import { CHANNELS, CHANNEL_TABLE_HEADER_DISPLAY } from '../models/channelsIndexSection.model';
import {
  DownloadIcon,
  FilterIcon,
  MoreVerticalIcon,
  SpinnerIcon,
} from '@/components/ui/Icons';
import { AppButton } from '@/components/ui/AppButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { TablePaginationBar } from '@/components/ui/TablePaginationBar';
import {
  channelPlatformIcon,
  channelStatusBadgeStyle,
  formatChannelLastUploadDisplay,
} from '../utils/channelTableDisplay';

function IndexRowActionsMenu({
  rowId,
  onEdit,
  onDetail,
}: {
  rowId: string;
  onEdit: (id: string) => void;
  onDetail: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={wrapRef} className='relative inline-flex justify-center' onClick={e => e.stopPropagation()}>
      <button
        type='button'
        aria-haspopup='menu'
        aria-expanded={open}
        className='rounded-lg p-2 opacity-85 transition-opacity hover:opacity-100 cursor-pointer'
        style={{ color: 'var(--text-muted)' }}
        title='Thao tác'
        onClick={() => setOpen(o => !o)}
      >
        <MoreVerticalIcon className='h-5 w-5' />
      </button>
      {open ? (
        <div
          role='menu'
          className='absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-xl py-1 shadow-lg'
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <button
            type='button'
            role='menuitem'
            className='block w-full px-3 py-2 text-left text-sm font-medium cursor-pointer transition-colors'
            style={{ color: 'var(--text-h)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--hover-bg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={() => {
              onEdit(rowId);
              setOpen(false);
            }}
          >
            Sửa
          </button>
          <button
            type='button'
            role='menuitem'
            className='block w-full px-3 py-2 text-left text-sm font-medium cursor-pointer transition-colors'
            style={{ color: 'var(--text-h)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--hover-bg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={() => {
              onDetail(rowId);
              setOpen(false);
            }}
          >
            Chi tiết
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
  toolbarSearch,
  onToolbarSearchChange,
  filterExpanded,
  onToggleFilterExpanded,
  groupFilter,
  groupFilterOptions,
  onGroupFilterChange,
  onExportCsv,
}: ChannelsIndexSectionProps) {
  const headerSelectRef = useRef<HTMLInputElement>(null);

  const visibleChannelCols = useMemo(() => CHANNELS.filter(c => c.show), []);

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = pageSelectSome && !pageSelectAll;
  }, [pageSelectAll, pageSelectSome]);

  function renderCell(colKey: string | undefined, rawCell: unknown): ReactNode {
    if (!colKey) return String(rawCell ?? '');

    if (colKey === 'channelLink') {
      const url = String(rawCell ?? '').trim();
      return (
        <div className='flex min-w-0 items-start gap-2'>
          <span className='mt-0.5 shrink-0'>{channelPlatformIcon(url)}</span>
          <span className='min-w-0 wrap-break-word leading-snug'>{url || '—'}</span>
        </div>
      );
    }

    if (colKey === 'lastUpload') {
      return <span className='leading-snug'>{formatChannelLastUploadDisplay(rawCell)}</span>;
    }

    if (colKey === 'status') {
      const st = channelStatusBadgeStyle(rawCell);
      return (
        <span
          className='inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold'
          style={{
            color: st.textColor,
            background: st.bg,
            border: `1px solid color-mix(in srgb, ${st.dotColor} 35%, transparent)`,
          }}
        >
          <span className='h-1.5 w-1.5 shrink-0 rounded-full' style={{ background: st.dotColor }} />
          {st.label}
        </span>
      );
    }

    if (colKey === 'group') {
      const raw = String(rawCell ?? '').trim();
      if (!raw) return '';
      const name = groupNameById[raw];
      return name?.trim() ? name.trim() : raw;
    }

    return String(rawCell ?? '');
  }

  const toolbarInputClass =
    'min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors duration-150 sm:min-w-[200px]';

  return (
    <div className='w-full min-w-0 space-y-4'>
      <div
        className='w-full min-w-0 overflow-hidden rounded-2xl'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div
          className='flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:gap-3'
          style={{ borderColor: 'var(--border)' }}
        >
          <input
            type='search'
            value={toolbarSearch}
            onChange={e => onToolbarSearchChange(e.target.value)}
            placeholder='Lọc theo URL hoặc email…'
            autoComplete='off'
            className={toolbarInputClass}
            style={{
              background: 'var(--code-bg)',
              color: 'var(--text-h)',
              borderColor: 'var(--border)',
            }}
          />
          <AppButton
            type='button'
            variant={filterExpanded ? 'secondary' : 'neutral'}
            size='sm'
            className='inline-flex items-center gap-2 shrink-0'
            onClick={onToggleFilterExpanded}
          >
            <FilterIcon className='h-4 w-4' />
            Lọc nhóm
          </AppButton>
          <AppButton
            type='button'
            variant='neutral'
            size='sm'
            className='inline-flex items-center gap-2 shrink-0'
            disabled={loading || indexFilteredCount === 0}
            onClick={onExportCsv}
          >
            <DownloadIcon className='h-4 w-4' />
            Xuất CSV
          </AppButton>
        </div>

        {filterExpanded ? (
          <div
            className='border-b px-4 py-3 sm:flex sm:max-w-md sm:items-center sm:gap-3'
            style={{ borderColor: 'var(--border)' }}
          >
            <span className='mb-2 block text-sm font-medium sm:mb-0 sm:w-28 shrink-0' style={{ color: 'var(--text-muted)' }}>
              Nhóm
            </span>
            <CustomSelect
              value={groupFilter}
              options={groupFilterOptions}
              onChange={onGroupFilterChange}
              placeholder='Nhóm'
              menuZIndex={100}
            />
          </div>
        ) : null}

        <div className='w-full min-w-0 overflow-auto'>
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
                    className='h-4 w-4 cursor-pointer rounded border align-middle'
                    style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                    checked={pageSelectAll}
                    onChange={() => onToggleSelectAllOnPage()}
                    disabled={loading || pageIndexRows.length === 0}
                    aria-label='Chọn tất cả kênh trên trang này'
                  />
                </th>
                {visibleChannelCols.map((col, colIdx) => (
                  <th
                    key={`idx-h-${colIdx}-${col.key}`}
                    className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap'
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    {CHANNEL_TABLE_HEADER_DISPLAY[col.key] ?? col.label}
                  </th>
                ))}
                <th
                  className='w-14 px-2 py-3 text-center align-middle text-xs font-semibold uppercase tracking-wider whitespace-nowrap'
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
                      <SpinnerIcon className='h-5 w-5' />
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : pageIndexRows.length === 0 && indexFilteredCount === 0 ? (
                <tr>
                  <td colSpan={indexColCount} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                    Không có dòng nào khớp bộ lọc (URL / email / nhóm).
                  </td>
                </tr>
              ) : (
                pageIndexRows.map(row => {
                  return (
                    <tr
                      key={row.id}
                      className='cursor-pointer transition-colors duration-150'
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
                          className='h-4 w-4 cursor-pointer rounded border align-middle'
                          style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                          checked={selectedRows.has(row.id)}
                          onChange={() => onToggleRowSelected(row.id)}
                          aria-label={`Chọn kênh dòng ${row.id}`}
                        />
                      </td>
                      {visibleChannelCols.map((col, colIdx) => {
                        const cell = col.key ? row[col.key] : '';
                        return (
                          <td
                            key={`idx-c-${colIdx}-${col.label}`}
                            className='min-w-0 px-4 py-3 align-middle wrap-break-word'
                            style={{ color: 'var(--text-h)' }}
                          >
                            {renderCell(col.key, cell)}
                          </td>
                        );
                      })}

                      <td
                        className='px-2 py-3 align-middle text-center'
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <IndexRowActionsMenu rowId={row.id} onEdit={onOpenEditRow} onDetail={onOpenDetailRow} />
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
