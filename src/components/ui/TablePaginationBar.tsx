import { AppButton } from './AppButton';

export interface TablePaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  className?: string;
}

/**
 * Thanh Trước / Sau + khoảng hiển thị — đặt dưới bảng (cùng card).
 */
export function TablePaginationBar({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: TablePaginationBarProps) {
  if (totalItems <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t w-full min-w-0 ${className}`.trim()}
      style={{ borderColor: 'var(--border)' }}
    >
      <span className='text-sm tabular-nums' style={{ color: 'var(--text-muted)' }}>
        Hiển thị {from}–{to} / {totalItems}
      </span>
      <div className='flex items-center gap-2 shrink-0'>
        <AppButton
          type='button'
          variant='secondary'
          size='sm'
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className='min-w-0'
        >
          Trước
        </AppButton>
        <span className='text-sm tabular-nums px-1' style={{ color: 'var(--text-h)' }}>
          Trang {page} / {totalPages}
        </span>
        <AppButton
          type='button'
          variant='secondary'
          size='sm'
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className='min-w-0'
        >
          Sau
        </AppButton>
      </div>
    </div>
  );
}
