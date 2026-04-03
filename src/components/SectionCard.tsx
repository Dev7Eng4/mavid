import type { ReactNode } from 'react';

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='rounded-lg border p-3' style={{ borderColor: 'var(--border)' }}>
      <div className='text-sm font-semibold' style={{ color: 'var(--text-h)', marginBottom: 6 }}>
        {title}
      </div>
      <div className='text-sm' style={{ opacity: 0.92, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

