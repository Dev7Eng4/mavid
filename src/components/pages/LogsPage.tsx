import { useEffect, useRef } from 'react';

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
    <div className="space-y-4 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-h)' }}>Logs</h1>
          <p className="text-sm" style={{ color: 'var(--text)' }}>
            Output của script đang/đã chạy ({logs.length} dòng)
          </p>
        </div>
        <button
          onClick={clearLogs}
          className="rounded-lg px-3 py-2 text-xs font-medium"
          style={{
            color: 'var(--text-h)',
            background: 'transparent',
            border: '1px solid var(--border)',
          }}
        >
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-xl p-4 font-mono text-xs leading-relaxed"
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
