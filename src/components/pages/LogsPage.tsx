import { useEffect, useRef } from 'react';
import { AppButton } from '../ui/AppButton';
import { PageHeader } from '../ui/PageHeader';

interface Props {
  logs: string[];
  clearLogs: () => void;
}

export function LogsPage({ logs, clearLogs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="space-y-6 flex flex-col w-full min-w-0" style={{ height: 'calc(100vh - 4rem)' }}>
      <PageHeader
        className="shrink-0"
        title="Logs"
        description={`Output của script đang/đã chạy (${logs.length} dòng)`}
        actions={
          <AppButton variant="danger" size="sm" onClick={clearLogs}>
            Xóa log
          </AppButton>
        }
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-2xl p-4 font-mono text-sm leading-relaxed min-h-0"
        style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text)', opacity: 0.5 }}>
            Chưa có log. Hãy chạy script trong Pipeline.
          </div>
        ) : (
          logs.map((line, i) => {
            let color = 'var(--text)';
            if (line.startsWith('[stderr]')) color = '#ef4444';
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
