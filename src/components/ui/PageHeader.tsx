import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** `start`: căn trên (mô tả dài + nút). `center`: một dòng tiêu đề gọn. */
  align?: 'center' | 'start';
  className?: string;
}

/**
 * Tiêu đề trang + mô tả + vùng action (nút) bên phải — dùng thống nhất trên các page.
 */
export function PageHeader({ title, description, actions, align = 'center', className = '' }: PageHeaderProps) {
  const rowAlign = align === 'start' ? 'sm:items-start' : 'sm:items-center';
  return (
    <div className={`flex flex-col gap-3 min-w-0 sm:flex-row ${rowAlign} sm:justify-between sm:gap-4 ${className}`.trim()}>
      <div className='min-w-0 flex-1 space-y-2'>
        <h1 className='font-bold tracking-tight' style={{ color: 'var(--text-h)' }}>
          {title}
        </h1>
        {description != null && description !== false ? (
          typeof description === 'string' ? (
            <p className='text-sm leading-relaxed' style={{ color: 'var(--text)' }}>
              {description}
            </p>
          ) : (
            <div className='text-sm leading-relaxed' style={{ color: 'var(--text)' }}>
              {description}
            </div>
          )
        ) : null}
      </div>
      {actions != null && actions !== false ? (
        <div className='flex flex-wrap items-center mt-auto gap-2 shrink-0 w-full sm:w-auto justify-end'>{actions}</div>
      ) : null}
    </div>
  );
}
