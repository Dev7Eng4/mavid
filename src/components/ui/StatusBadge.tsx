type Status = 'idle' | 'running' | 'done' | 'error';

const CONFIG: Record<Status, { bg: string; text: string; label: string }> = {
  idle: { bg: 'var(--social-bg)', text: 'var(--text)', label: 'Sẵn sàng' },
  running: { bg: 'var(--accent-bg)', text: 'var(--accent)', label: 'Đang chạy' },
  done: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: 'Hoàn thành' },
  error: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Lỗi' },
};

interface Props {
  status: Status;
}

export function StatusBadge({ status }: Props) {
  const c = CONFIG[status];
  return (
    <span
      className='shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium'
      style={{ background: c.bg, color: c.text }}
    >
      {status === 'running' && <span className='w-1.5 h-1.5 rounded-full animate-pulse' style={{ background: c.text }} />}
      {c.label}
    </span>
  );
}
