import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-h)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
