import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  onConfirm: (links: string) => void;
  onCancel: () => void;
}

const YT_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\//,
  /^https?:\/\/youtu\.be\//,
  /^https?:\/\/(www\.)?youtube\.com\/@/,
  /^https?:\/\/(music\.)?youtube\.com\//,
];

function isYouTubeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return YT_PATTERNS.some(p => p.test(trimmed));
}

interface LineValidation {
  line: string;
  valid: boolean;
}

export function YouTubeLinkPopup({ onConfirm, onCancel }: Props) {
  const [linkInput, setLinkInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.runner
      ?.readInputFile?.()
      .then(content => setLinkInput(content || ''))
      .catch(() => {});
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const validation = useMemo<LineValidation[]>(() => {
    return linkInput
      .split('\n')
      .filter(l => l.trim())
      .map(line => ({ line: line.trim(), valid: isYouTubeUrl(line) }));
  }, [linkInput]);

  const validCount = validation.filter(v => v.valid).length;
  const invalidCount = validation.filter(v => !v.valid).length;
  const canSubmit = validCount > 0 && invalidCount === 0;

  function handleSubmit() {
    if (!canSubmit) return;
    const validLinks = validation.map(v => v.line).join('\n');
    onConfirm(validLinks);
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center' style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onCancel}>
      <div
        className='rounded-xl p-4 w-full max-w-lg space-y-2'
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className='text-base font-semibold' style={{ color: 'var(--text-h)' }}>
          Nhập link YouTube
        </div>
        <p className='text-xs' style={{ color: 'var(--text)' }}>
          Mỗi dòng 1 link (channel, playlist hoặc video). Nội dung sẽ ghi vào input.txt.
        </p>

        <textarea
          ref={textareaRef}
          value={linkInput}
          onChange={e => setLinkInput(e.target.value)}
          rows={6}
          placeholder={'https://www.youtube.com/@channel\nhttps://www.youtube.com/playlist?list=...'}
          className='w-full rounded-lg px-3 py-2 mt-2 text-sm outline-none resize-y'
          style={{
            background: 'var(--code-bg)',
            color: 'var(--text-h)',
            border: `1px solid ${invalidCount > 0 ? '#ef4444' : 'var(--border)'}`,
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />

        {validation.length > 0 && (
          <div className='space-y-1'>
            {invalidCount > 0 && (
              <div className='text-xs' style={{ color: '#ef4444' }}>
                {invalidCount} link không hợp lệ:
                {validation.filter(v => !v.valid).map((v, i) => (
                  <div key={i} className='ml-2 truncate' style={{ opacity: 0.85 }}>• {v.line}</div>
                ))}
              </div>
            )}
            {validCount > 0 && (
              <div className='text-xs' style={{ color: '#22c55e' }}>
                {validCount} link hợp lệ
              </div>
            )}
          </div>
        )}

        <div className='flex gap-2 justify-end pt-1'>
          <button
            onClick={onCancel}
            className='rounded-lg px-4 py-2 text-xs font-medium'
            style={{
              color: 'var(--text-h)',
              background: 'transparent',
              border: '1px solid var(--border)',
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='rounded-lg px-4 py-2 text-xs font-medium'
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            Chạy {validCount > 0 ? `(${validCount})` : ''} (Ctrl+Enter)
          </button>
        </div>
      </div>
    </div>
  );
}
