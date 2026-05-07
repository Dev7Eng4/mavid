import { useCallback, useEffect, useState } from 'react';
import type { Group as MavidGroupRow } from '@/types';
import { AppButton } from '@/components/ui/AppButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { SpinnerIcon } from '@/components/ui/Icons';

const RANDOM_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** 12 ký tự: 6 ký tự ngẫu nhiên + 6 ký tự từ timestamp hiện tại (base36, lấy 6 ký tự cuối). */
function generateMavidGroupId12(): string {
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  const ts = Date.now().toString(36);
  const timePart = ts.length >= 6 ? ts.slice(-6) : ts.padStart(6, '0');
  return randomPart + timePart;
}

function newUniqueGroupId(existing: ReadonlyArray<MavidGroupRow>): string {
  const ids = new Set(existing.map(r => r.id));
  for (let n = 0; n < 40; n++) {
    const id = generateMavidGroupId12();
    if (!ids.has(id)) return id;
  }
  return generateMavidGroupId12();
}

export function GroupsPage() {
  const [items, setItems] = useState<MavidGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await window.runner?.getMavidGroups?.();
      setItems(Array.isArray(r?.items) ? r.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được danh sách nhóm.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: MavidGroupRow[]) => {
    setSaving(true);
    setError(null);
    try {
      await window.runner?.setMavidGroups?.({ items: next });
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được danh sách nhóm.');
    } finally {
      setSaving(false);
    }
  };

  const onAdd = async () => {
    const name = draftName.trim();
    const id = newUniqueGroupId(items);
    await persist([...items, { id, name }]);
    setDraftName('');
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(`Xóa nhóm "${id}"?`)) return;
    await persist(items.filter(x => x.id !== id));
  };

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        align='start'
        title='Group'
        description='Danh sách nhóm (ID tự tạo 12 ký tự: 6 ký tự ngẫu nhiên + 6 ký tự từ timestamp; tên do bạn nhập). Lưu trong file group.json thư mục MaVidMedia/channels (tự tạo nếu chưa có).'
      />

      {error && (
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
      )}

      <div
        className='rounded-2xl p-4 flex flex-wrap gap-3 items-end'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='flex flex-col gap-1 min-w-[140px]'>
          <label className='text-sm' style={{ color: 'var(--text-muted)' }}>
            Tên
          </label>
          <input
            type='text'
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            disabled={saving}
            className='rounded-xl px-3 py-2 text-base min-w-[200px]'
            style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-h)',
            }}
            placeholder='Tên hiển thị'
          />
        </div>
        <AppButton type='button' variant='primary' disabled={saving} onClick={() => void onAdd()}>
          Thêm
        </AppButton>
      </div>

      <div
        className='rounded-2xl w-full min-w-0 overflow-hidden'
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <div className='overflow-auto w-full min-w-0'>
          <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--code-bg)' }}>
                <th
                  className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  ID
                </th>
                <th
                  className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  Tên
                </th>
                <th
                  className='text-right px-4 py-3 font-medium uppercase text-base tracking-wider whitespace-nowrap w-1'
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className='px-4 py-8 text-center'>
                    <div className='flex items-center justify-center gap-3' style={{ color: 'var(--text)' }}>
                      <SpinnerIcon className='w-5 h-5' />
                      <span>Đang tải…</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                    Chưa có nhóm. Nhập Tên và bấm Thêm (ID gán tự động).
                  </td>
                </tr>
              ) : (
                items.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className='px-4 py-3 wrap-break-word font-mono text-base' style={{ color: 'var(--text-h)' }}>
                      {row.id}
                    </td>
                    <td className='px-4 py-3 wrap-break-word text-base' style={{ color: 'var(--text-h)' }}>
                      {row.name || '—'}
                    </td>
                    <td className='px-4 py-3 text-right whitespace-nowrap'>
                      <AppButton
                        type='button'
                        variant='danger'
                        size='md'
                        disabled={saving}
                        onClick={() => void onDelete(row.id)}
                        className='py-1.5'
                      >
                        Xóa
                      </AppButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
