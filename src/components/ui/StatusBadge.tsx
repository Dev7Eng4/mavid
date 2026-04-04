type Status = 'idle' | 'running' | 'done' | 'error';

const CONFIG: Record<Status, { bg: string; text: string; label: string; glow?: string }> = {
  idle: { bg: 'var(--hover-bg)', text: 'var(--text-muted)', label: 'Sẵn sàng' },
  running: { bg: 'var(--accent-bg)', text: 'var(--accent)', label: 'Đang chạy', glow: 'var(--accent)' },
  done: { bg: 'var(--success-bg)', text: 'var(--success)', label: 'Hoàn thành' },
  error: { bg: 'var(--error-bg)', text: 'var(--error)', label: 'Lỗi' },
};

interface Props {
  status: Status;
}

export function StatusBadge({ status }: Props) {
  const c = CONFIG[status];
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      {status === 'running' && (
        <span 
          className="w-1.5 h-1.5 rounded-full animate-pulse" 
          style={{ background: c.text, boxShadow: c.glow ? `0 0 6px ${c.glow}` : 'none' }} 
        />
      )}
      {c.label}
    </span>
  );
}
