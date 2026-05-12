import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelData, ChannelRow } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { RefreshIcon, SpinnerIcon } from '@/components/ui/Icons';

const INDEX_FILE = 'channels/index.xlsx';

export default function AnalystPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexData, setIndexData] = useState<ChannelData | null>(null);

  const loadIndex = useCallback(async () => {
    if (!window.runner?.readChannelData) {
      setError('Chỉ đọc index trong app Electron.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await window.runner.readChannelData(INDEX_FILE);
      setIndexData(d);
    } catch {
      setIndexData({ headers: [], rows: [] });
      setError('Không đọc được MaVidMedia/channels/index.xlsx.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIndex();
  }, [loadIndex]);

  const rows = useMemo(() => {
    const rawRows = indexData?.rows ?? [];
    return rawRows.map((r: ChannelRow) => ({
      email: String(r.email ?? '').trim(),
      myChannel: String(r.myChannel ?? '').trim(),
    }));
  }, [indexData]);

  const headers = indexData?.headers ?? [];
  const missingCols: string[] = [];
  if (!loading && indexData && (indexData.rows?.length ?? 0) > 0) {
    if (!headers.includes('email')) missingCols.push('email');
    if (!headers.includes('myChannel')) missingCols.push('myChannel');
  }

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        align='start'
        title='Analyst'
        description='EMAIL và KÊNH CỦA TÔI lấy từ MaVidMedia/channels/index.xlsx'
        actions={
          <AppButton type='button' variant='secondary' onClick={() => void loadIndex()} disabled={loading}>
            {loading ? <SpinnerIcon className='w-4 h-4' /> : <RefreshIcon className='w-4 h-4' />}
            <span>{loading ? 'Đang tải…' : 'Tải lại'}</span>
          </AppButton>
        }
      />

      {error ? (
        <div
          className='rounded-2xl px-4 py-3 text-base wrap-break-word'
          style={{
            color: '#fecaca',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          {error}
        </div>
      ) : null}

      {missingCols.length > 0 ? (
        <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
          File index thiếu cột: <strong style={{ color: 'var(--text-h)' }}>{missingCols.join(', ')}</strong> — thêm vào dòng tiêu đề
          index.xlsx rồi Tải lại. Cột thiếu sẽ hiển thị trống.
        </p>
      ) : null}

      <div
        className='rounded-2xl w-full min-w-0 overflow-hidden'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--code-bg)' }}>
                <th
                  className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  EMAIL
                </th>
                <th
                  className='text-left px-4 py-3 font-medium whitespace-nowrap uppercase text-base tracking-wider'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  KÊNH CỦA TÔI
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} className='px-4 py-8 text-center'>
                    <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                      <SpinnerIcon className='w-5 h-5' />
                      <span>Đang tải index…</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className='px-4 py-3 align-top wrap-break-word min-w-0' style={{ color: 'var(--text-h)' }} title={r.email}>
                      {r.email || '—'}
                    </td>
                    <td className='px-4 py-3 align-top wrap-break-word min-w-0' style={{ color: 'var(--text-h)' }} title={r.myChannel}>
                      {r.myChannel || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                    Chưa có dòng nào trong index.xlsx.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
