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

export function YouTubeLinkPopup({ onCancel }: Props) {
  const [linkInput, setLinkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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

  async function handleSubmit() {
    if (!canSubmit || loading || done) return;
    const urls = validation.map(v => v.line);

    setLoading(true);
    setError('');

    try {
      setStatus('Đang lấy thông tin YouTube...');

      // Gọi trực tiếp script với URLs, không cần ghi vào input.txt
      const result = await window.runner.runScript<{ processedCount?: number }>('getInfoChannel', { urls });

      // Clear input sau khi hoàn tất
      setLinkInput('');

      const processedCount = result.data?.processedCount ?? urls.length;
      setStatus(`Hoàn tất! Đã xử lý ${processedCount} link.`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center'
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={loading ? undefined : onCancel}
    >
      <div
        className='rounded-xl p-4 w-full max-w-lg space-y-2'
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className='text-base font-semibold' style={{ color: 'var(--text-h)' }}>
          Nhập link YouTube
        </div>
        <p className='text-xs' style={{ color: 'var(--text)' }}>
          Mỗi dòng 1 link (channel, playlist hoặc video).
        </p>

        <textarea
          ref={textareaRef}
          value={linkInput}
          onChange={e => setLinkInput(e.target.value)}
          disabled={loading}
          rows={6}
          placeholder={'https://www.youtube.com/@channel\nhttps://www.youtube.com/playlist?list=...'}
          className='w-full rounded-lg px-3 py-2 mt-2 text-sm outline-none resize-y'
          style={{
            background: 'var(--code-bg)',
            color: 'var(--text-h)',
            border: `1px solid ${invalidCount > 0 ? '#ef4444' : 'var(--border)'}`,
            opacity: loading || done ? 0.6 : 1,
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !loading && !done) void handleSubmit();
          }}
        />

        {validation.length > 0 && !loading && !done && (
          <div className='space-y-1'>
            {invalidCount > 0 && (
              <div className='text-xs' style={{ color: '#ef4444' }}>
                {invalidCount} link không hợp lệ:
                {validation
                  .filter(v => !v.valid)
                  .map((v, i) => (
                    <div key={i} className='ml-2 truncate' style={{ opacity: 0.85 }}>
                      • {v.line}
                    </div>
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

        {loading && (
          <div className='flex items-center gap-2 text-xs' style={{ color: 'var(--accent)' }}>
            <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24' fill='none'>
              <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' strokeOpacity='0.25' />
              <path d='M12 2a10 10 0 0 1 10 10' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
            </svg>
            {status}
          </div>
        )}

        {done && (
          <div className='flex items-center gap-2 text-xs' style={{ color: '#22c55e' }}>
            <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <path d='M20 6L9 17l-5-5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            {status}
          </div>
        )}

        {error && (
          <div className='text-xs' style={{ color: '#ef4444' }}>
            Lỗi: {error}
          </div>
        )}

        <div className='flex gap-2 justify-end pt-1'>
          <button
            onClick={onCancel}
            disabled={loading}
            className='rounded-lg px-4 py-2 text-xs font-medium'
            style={{
              color: 'var(--text-h)',
              background: 'transparent',
              border: '1px solid var(--border)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Hủy
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || loading}
            className='rounded-lg px-4 py-2 text-xs font-medium'
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              opacity: canSubmit && !loading ? 1 : 0.5,
            }}
          >
            {loading ? 'Đang chạy...' : `Chạy ${validCount > 0 ? `(${validCount})` : ''} (Ctrl+Enter)`}
          </button>
        </div>
      </div>
    </div>
  );
}
