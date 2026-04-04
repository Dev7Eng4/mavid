interface Props {
  label: string;
  value: string | number;
  icon: string;
}

export function StatCard({ label, value, icon }: Props) {
  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-h)' }}>
          {value}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>
          {label}
        </div>
      </div>
    </div>
  );
}
