import type { ChannelRow } from '../../../types';
import { SpinnerIcon } from '../../ui/Icons';
import { TablePaginationBar } from '../../ui/TablePaginationBar';
import { channelFolderFromRow } from './channelIndexHelpers';

/** Cột hiển thị bảng index (cố định; khớp MaVidMedia/channels/index.xlsx). */
export const CHANNELS_INDEX_TABLE_HEADERS = ['ID', 'LINK', 'EMAIL', 'LOẠI VIDEO', 'THỜI GIAN VIDEO', 'LAST UPLOAD'] as const;

export interface ChannelsIndexPagination {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
  startIndex: number;
}

export interface ChannelsIndexSectionProps {
  indexListError: string | null;
  indexLoading: boolean;
  indexSaving: boolean;
  indexDraftRows: ChannelRow[];
  pageIndexRows: ChannelRow[];
  indexPag: ChannelsIndexPagination;
  /** colSpan ô trống / loading — giữ đồng bộ với logic indexHeaders ở page. */
  indexColCount: number;
  onEditRow: (globalIndex: number) => void;
  onOpenChannel: (folder: string) => void;
}

export function ChannelsIndexSection({
  indexListError,
  indexLoading,
  indexSaving,
  indexDraftRows,
  pageIndexRows,
  indexPag,
  indexColCount,
  onEditRow,
  onOpenChannel,
}: ChannelsIndexSectionProps) {
  const headers = CHANNELS_INDEX_TABLE_HEADERS;

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
                {headers.map(h => (
                  <th
                    key={h}
                    className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
                    style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    {h}
                  </th>
                ))}
                <th
                  className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider w-44 shrink-0'
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
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : indexDraftRows.length > 0 ? (
                pageIndexRows.map((row, i) => {
                  const globalIndex = indexPag.startIndex + i;
                  const folder = channelFolderFromRow(row, [...headers]);
                  return (
                    <tr
                      key={globalIndex}
                      className='transition-colors duration-150'
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
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

                      <td className='px-4 py-3 align-top'>
                        <div className='flex gap-1.5 items-stretch'>
                          <button
                            type='button'
                            onClick={() => onEditRow(globalIndex)}
                            disabled={indexSaving}
                            className='text-base font-medium rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150 whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed'
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
                              onClick={() => onOpenChannel(folder)}
                              className='text-base font-medium rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150 whitespace-nowrap'
                              style={{
                                color: 'var(--accent)',
                                background: 'var(--accent-bg)',
                                border: '1px solid var(--accent-border)',
                              }}
                            >
                              Chi tiết
                            </button>
                          ) : (
                            <span className='text-base' style={{ color: 'var(--text-muted)' }}>
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
