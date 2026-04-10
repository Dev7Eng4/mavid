import { useEffect, useRef } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { PageHeader } from '@/components/ui/PageHeader';

interface Props {
  errorLogs: string[];
  clearErrorLogs: () => void | Promise<void>;
}

export function LogsPage({ errorLogs, clearErrorLogs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [errorLogs]);

  return (
    <div className='space-y-6 flex flex-col w-full min-w-0' style={{ height: 'calc(100vh - 4rem)' }}>
      <PageHeader
        className='shrink-0'
        title='Logs'
        description={`Lỗi từ script (contents / npm): stderr, console.error, cảnh báo, thoát mã khác 0 (${errorLogs.length} dòng). Lưu trong thư mục dữ liệu app (mavid-error-logs.json) — mở lại app vẫn thấy; chỉ mất khi bấm «Xóa log lỗi». Output đầy đủ vẫn xem ở terminal khi chạy Electron từ CLI.`}
        actions={
          <AppButton variant='danger' size='sm' onClick={() => void clearErrorLogs()}>
            Xóa log lỗi
          </AppButton>
        }
      />

      <div
        ref={containerRef}
        className='flex-1 overflow-auto rounded-2xl p-4 font-mono text-sm leading-relaxed min-h-0'
        style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
      >
        {errorLogs.length === 0 ? (
          <div style={{ color: 'var(--text)', opacity: 0.5 }}>
            Chưa có lỗi ghi nhận. Khi chạy Pipeline / Tạo video, chỉ các dòng lỗi (stderr, console.error, …) từ tiến trình
            Node hiện ở đây.
          </div>
        ) : (
          errorLogs.map((line, i) => {
            let color = '#f87171';
            if (line.startsWith('[warn]')) color = '#fbbf24';
            else if (line.startsWith('[MaVid]')) color = 'var(--accent)';

            return (
              <div key={i} style={{ color }}>
                {line}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
