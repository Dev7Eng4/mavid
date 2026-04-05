import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GpmProfileRow } from '../../types';
import { useClientPagination } from '../../hooks/useClientPagination';
import { gpmApi, GpmApiError, type GpmProfilesListQuery } from '../../services';
import { AppButton } from '../ui/AppButton';
import { PageHeader } from '../ui/PageHeader';
import { TablePaginationBar } from '../ui/TablePaginationBar';

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

/** Tham số list profile — đổi `group` / `page` / `per_page` tại đây hoặc nâng lên state sau. */
const GPM_PROFILES_LIST_QUERY: GpmProfilesListQuery = {
  group: 'Ebay',
  page: 1,
  per_page: 100,
};

function profileRowKey(row: GpmProfileRow, index: number): string {
  const id = row.id?.trim();
  return id ? id : `gpm-row-${index}`;
}

function mapGpmApiProfileRow(row: unknown): GpmProfileRow | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  return {
    id: pickStr(o, ['id', 'Id', 'ID']),
    name: pickStr(o, ['name', 'Name']),
    profilePath: pickStr(o, ['profile_path', 'ProfilePath', 'profilePath']),
  };
}

export function GpmPage() {
  const [profiles, setProfiles] = useState<GpmProfileRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Profile id (GPM) đã mở thành công qua API trong phiên này — GPM có thể đóng tay ngoài app. */
  const [openProfileIds, setOpenProfileIds] = useState<Set<string>>(() => new Set());
  const [busyKeys, setBusyKeys] = useState<Set<string>>(() => new Set());

  const gpmPag = useClientPagination(profiles.length);
  const pageProfiles = useMemo(
    () => profiles.slice(gpmPag.startIndex, gpmPag.startIndex + gpmPag.pageSize),
    [profiles, gpmPag.startIndex, gpmPag.pageSize],
  );

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await gpmApi.listProfiles(GPM_PROFILES_LIST_QUERY);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : [];
      const rows: GpmProfileRow[] = [];
      for (const item of list) {
        const m = mapGpmApiProfileRow(item);
        if (m) rows.push(m);
      }
      setProfiles(rows);
    } catch (e) {
      if (e instanceof GpmApiError) {
        setMessage(e.message);
      } else {
        setMessage(e instanceof Error ? e.message : 'Không tải được danh sách profile từ API GPM.');
      }
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const toggleOpenClose = async (row: GpmProfileRow, globalIndex: number) => {
    const key = profileRowKey(row, globalIndex);
    const profileId = row.id?.trim();
    if (!profileId) {
      setMessage('Dòng này không có Id — không gọi được API mở/đóng.');
      return;
    }

    const isOpen = openProfileIds.has(profileId);
    setBusyKeys(prev => new Set(prev).add(key));
    setMessage(null);
    try {
      if (isOpen) {
        await gpmApi.closeProfile(profileId);
        setOpenProfileIds(prev => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
      } else {
        await gpmApi.startProfile(profileId);
        setOpenProfileIds(prev => new Set(prev).add(profileId));
      }
    } catch (e) {
      if (e instanceof GpmApiError) {
        setMessage(e.message);
      } else {
        setMessage(e instanceof Error ? e.message : 'Lỗi khi gọi API GPM.');
      }
    } finally {
      setBusyKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className='space-y-6 w-full min-w-0'>
      <div className='space-y-4'>
        <PageHeader
          align='start'
          title='GPM'
          description={
            <>
              Danh sách profile lấy từ API Local GPM{' '}
              <code className='text-sm' style={{ color: 'var(--text-h)' }}>
                {gpmApi.getBaseUrl()}
              </code>
              . Cần mở ứng dụng GPM-Login và bật API (mặc định cổng 19995). Xem{' '}
              <a
                href='https://docs.gpmloginapp.com/api-document/danh-sach-profiles'
                target='_blank'
                rel='noreferrer'
                className='underline underline-offset-2'
                style={{ color: 'var(--accent)' }}
              >
                tài liệu danh sách profiles
              </a>
              .
            </>
          }
        />

        <div className='space-y-2'>
          {message ? (
            <p className='text-sm pl-0.5' style={{ color: 'var(--text-muted)' }}>
              {message}
            </p>
          ) : null}
        </div>
      </div>

      <div className='rounded-2xl w-full min-w-0' style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className='overflow-auto w-full min-w-0'>
        <table className='w-full min-w-0 text-base' style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--code-bg)' }}>
              <th
                className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
              >
                Id
              </th>
              <th
                className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
              >
                Name
              </th>
              <th
                className='text-left px-4 py-3 font-medium uppercase text-base tracking-wider'
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
              >
                Profile path
              </th>
              <th
                className='text-right px-4 py-3 font-medium uppercase text-base tracking-wider whitespace-nowrap w-1'
                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
              >
                API
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                  Đang tải…
                </td>
              </tr>
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan={4} className='px-4 py-8 text-center' style={{ color: 'var(--text-muted)' }}>
                  Không có profile. Kiểm tra GPM đang chạy và API Local hoạt động.
                </td>
              </tr>
            ) : (
              pageProfiles.map((row, i) => {
                const globalIndex = gpmPag.startIndex + i;
                const rowKey = profileRowKey(row, globalIndex);
                const pid = row.id?.trim();
                const isOpen = pid ? openProfileIds.has(pid) : false;
                const busy = busyKeys.has(rowKey);
                return (
                  <tr key={row.id ? `${row.id}-${globalIndex}` : `gpm-row-${globalIndex}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className='px-4 py-3 wrap-break-word font-mono text-base' style={{ color: 'var(--text-h)' }}>
                      {row.id || '—'}
                    </td>
                    <td className='px-4 py-3 wrap-break-word text-base' style={{ color: 'var(--text-h)' }}>
                      {row.name || '—'}
                    </td>
                    <td className='px-4 py-3 wrap-break-word font-mono text-base' style={{ color: 'var(--text-h)' }}>
                      {row.profilePath || '—'}
                    </td>
                    <td className='px-4 py-3 text-right whitespace-nowrap'>
                      <AppButton
                        type='button'
                        variant={isOpen ? 'danger' : 'primary'}
                        size='md'
                        disabled={busy || loading || !pid}
                        onClick={() => void toggleOpenClose(row, globalIndex)}
                        className='py-1.5'
                      >
                        {busy ? '…' : isOpen ? 'Đóng' : 'Mở'}
                      </AppButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
        {!loading && profiles.length > 0 ? (
          <TablePaginationBar
            page={gpmPag.page}
            totalPages={gpmPag.totalPages}
            onPageChange={gpmPag.setPage}
            totalItems={profiles.length}
            pageSize={gpmPag.pageSize}
          />
        ) : null}
      </div>
    </div>
  );
}
