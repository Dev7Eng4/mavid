import { useEffect, useState } from 'react';
import type { ChannelData, ChannelFile } from '../../types';

export function ChannelsPage() {
  const [files, setFiles] = useState<ChannelFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ChannelFile | null>(null);
  const [data, setData] = useState<ChannelData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    window.runner?.listChannels?.()
      .then(setFiles)
      .catch(() => setError('Không đọc được danh sách channels.'))
      .finally(() => setLoading(false));
  }, []);

  async function openChannel(file: ChannelFile) {
    setSelected(file);
    setData(null);
    setDataLoading(true);
    setError('');
    try {
      const d = await window.runner.readChannelData(file.path);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file.');
    } finally {
      setDataLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-h)' }}>Channels</h1>
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          Danh sách file Excel trong thư mục channels/.
        </p>
      </div>

      {error && (
        <div className="text-sm rounded-lg px-4 py-2" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      {!selected ? (
        <div className="space-y-2">
          {loading && <div className="text-sm" style={{ color: 'var(--text)' }}>Đang tải...</div>}
          {!loading && files.length === 0 && (
            <div className="text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>
              Chưa có file nào trong channels/. Hãy chạy "Lấy thông tin YouTube" trong Pipeline.
            </div>
          )}
          {files.map(f => (
            <button
              key={f.path}
              onClick={() => void openChannel(f)}
              className="w-full text-left rounded-xl p-4 flex items-center justify-between transition-colors"
              style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-h)' }}>{f.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>
                  {new Date(f.modifiedAt).toLocaleString('vi-VN')}
                </div>
              </div>
              <span className="text-sm" style={{ color: 'var(--accent)' }}>Mở →</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => { setSelected(null); setData(null); }}
            className="text-xs font-medium rounded-lg px-3 py-1.5"
            style={{ color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
          >
            ← Quay lại
          </button>

          <div className="text-sm font-semibold" style={{ color: 'var(--text-h)' }}>
            {selected.name}
          </div>

          {dataLoading && <div className="text-sm" style={{ color: 'var(--text)' }}>Đang đọc file...</div>}

          {data && data.rows.length === 0 && (
            <div className="text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>File rỗng.</div>
          )}

          {data && data.rows.length > 0 && (
            <div className="overflow-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--code-bg)' }}>
                    {data.headers.map(h => (
                      <th
                        key={h}
                        className="text-left px-3 py-2.5 font-semibold whitespace-nowrap"
                        style={{ color: 'var(--text-h)', borderBottom: '1px solid var(--border)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      {data.headers.map(h => (
                        <td
                          key={h}
                          className="px-3 py-2 max-w-[300px] truncate"
                          style={{ color: 'var(--text)' }}
                          title={String(row[h] ?? '')}
                        >
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
