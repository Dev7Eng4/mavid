import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label?: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  icon?: ReactNode;
  /** z-index panel danh sách (mặc định 10; dùng cao hơn trong dialog/modal). */
  menuZIndex?: number;
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 16 16'
      fill='none'
      className='transition-transform duration-150'
      style={open ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d='M4 6l4 4 4-4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className='ml-auto shrink-0' width='14' height='14' viewBox='0 0 16 16' fill='none'>
      <path d='M3.5 8.5l3 3 6-6.5' stroke='var(--accent)' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

export function CustomSelect({ value, options, onChange, placeholder, emptyText, icon, menuZIndex }: Props) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function openDropdown() {
    const idx = options.findIndex(o => o.value === value);
    setHighlightIdx(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function toggleDropdown() {
    if (open) setOpen(false);
    else openDropdown();
  }

  const scrollToItem = useCallback((idx: number) => {
    itemRefs.current[idx]?.scrollIntoView({ block: 'nearest' });
  }, []);

  function move(delta: number) {
    if (options.length === 0) return;
    setHighlightIdx(prev => {
      const next = Math.max(0, Math.min(options.length - 1, prev + delta));
      scrollToItem(next);
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'PageDown':
        e.preventDefault();
        move(5);
        break;
      case 'PageUp':
        e.preventDefault();
        move(-5);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightIdx(0);
        scrollToItem(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightIdx(options.length - 1);
        scrollToItem(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < options.length) {
          onChange(options[highlightIdx].value);
          setOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <div className='relative' ref={ref} onKeyDown={handleKeyDown}>
      <button
        onClick={toggleDropdown}
        className='w-full flex items-center justify-between rounded-lg px-3 py-[9px] text-sm cursor-pointer transition-colors duration-150'
        style={{
          background: 'var(--code-bg)',
          color: value ? 'var(--text-h)' : 'var(--text)',
          border: `1px solid ${open ? 'var(--accent-border)' : 'var(--border)'}`,
        }}
      >
        <span className='flex items-center gap-2 min-w-0 truncate'>
          {icon ?? <span className='w-2 h-2 rounded-full shrink-0' style={{ background: 'var(--accent)', opacity: 0.8 }} />}
          {value ? selectedLabel : (placeholder ?? 'Chọn...')}
        </span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          ref={listRef}
          role='listbox'
          className='absolute mt-1 w-full rounded-lg py-1 overflow-auto'
          style={{
            zIndex: menuZIndex ?? 10,
            background: 'var(--code-bg)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            maxHeight: 180,
          }}
        >
          {options.map((opt, idx) => {
            const active = opt.value === value;
            const highlighted = idx === highlightIdx;
            let bg = 'transparent';
            if (active) bg = 'var(--accent-bg)';
            else if (highlighted) bg = 'rgba(255,255,255,0.06)';

            return (
              <button
                key={opt.value}
                ref={el => {
                  itemRefs.current[idx] = el;
                }}
                role='option'
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className='w-full flex items-center gap-2.5 px-3 py-[7px] text-sm text-left cursor-pointer transition-colors duration-100'
                style={{
                  background: bg,
                  color: active ? 'var(--accent)' : 'var(--text-h)',
                  border: 'none',
                }}
              >
                <span
                  className='w-1.5 h-1.5 rounded-full shrink-0'
                  style={{ background: active ? 'var(--accent)' : 'var(--text)', opacity: active ? 1 : 0.35 }}
                />
                {opt.label ?? opt.value}
                {active && <CheckIcon />}
              </button>
            );
          })}
          {options.length === 0 && (
            <div className='px-3 py-2 text-sm' style={{ color: 'var(--text)', opacity: 0.5 }}>
              {emptyText ?? 'Không có lựa chọn'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
