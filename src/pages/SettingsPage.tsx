import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { buildConstantsModuleBase } from '@contents/constants/constantsModuleBase.js';
import type { ConstantsUiModel } from '@/types';
import { AppButton } from '@/components/ui/AppButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { constantsModuleToUiModel } from '@/utils/constantsUiModel';

interface Props {
  disabled: boolean;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className='block'>
      <div className='text-sm mb-1' style={{ opacity: 0.9 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

function toNum(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const inputStyle = {
  background: 'transparent',
  color: 'var(--text-h)',
  border: '1px solid var(--border)',
};

export function SettingsPage({ disabled }: Props) {
  const [model, setModel] = useState<ConstantsUiModel | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [constantsLoading, setConstantsLoading] = useState(true);

  const canEdit = !disabled && !saving;
  const canPickStorageFolder = typeof window.runner?.selectVideoStorageFolder === 'function';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (window.runner?.getConstantsUiModel) {
          const m = await window.runner.getConstantsUiModel();
          if (!cancelled) {
            setModel(m);
            setDirty(false);
          }
        } else {
          if (!cancelled) {
            setModel(constantsModuleToUiModel(buildConstantsModuleBase()));
            setDirty(false);
          }
        }
      } catch {
        if (!cancelled) setMsg('Không đọc được constants (index.js / overlay).');
      } finally {
        if (!cancelled) setConstantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (model == null || !window.runner?.saveConstantsUiModel) return;
    setSaving(true);
    setMsg('');
    try {
      await window.runner.saveConstantsUiModel(model);
      setDirty(false);
      setMsg('Đã lưu thành công.');
    } catch (e) {
      setMsg(`Lỗi: ${e instanceof Error ? e.message : 'Không lưu được.'}`);
    } finally {
      setSaving(false);
    }
  }

  function patchAppSettings(next: ConstantsUiModel['APP_SETTINGS']) {
    setModel(s => (s == null ? s : { APP_SETTINGS: next }));
    setDirty(true);
  }

  async function handleReset() {
    setMsg('');
    try {
      let m: ConstantsUiModel;
      if (window.runner?.getConstantsFactoryUiModel) {
        m = await window.runner.getConstantsFactoryUiModel();
      } else {
        m = constantsModuleToUiModel(buildConstantsModuleBase());
      }
      setModel(m);
      setDirty(false);
    } catch (e) {
      setMsg(`Lỗi: ${e instanceof Error ? e.message : 'Không tải mặc định.'}`);
    }
  }

  async function handleSelectVideoStorageRoot() {
    if (model == null) return;
    if (!window.runner?.selectVideoStorageFolder) {
      setMsg('Chỉ chọn thư mục được trong app Electron.');
      return;
    }
    setMsg('');
    try {
      const r = await window.runner.selectVideoStorageFolder(model.APP_SETTINGS.STORAGE?.trim() || null);
      if (!r?.ok || !r.path) return;
      const chosen = r.path;
      setModel(m =>
        m == null ? m : { APP_SETTINGS: { ...m.APP_SETTINGS, STORAGE: chosen } }
      );
      setMsg('Đã lưu: trong thư mục đã chọn tạo MaVidMedia với backgrounds, videos, channels.');
    } catch (e) {
      setMsg(`Lỗi: ${e instanceof Error ? e.message : 'Không chọn được thư mục.'}`);
    }
  }

  if (!model) {
    return (
      <div className='space-y-6 w-full min-w-0'>
        <PageHeader align='start' title='Settings' />
        <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
          {constantsLoading ? 'Đang tải cấu hình…' : 'Không có dữ liệu settings.'}
        </p>
      </div>
    );
  }

  const a = model.APP_SETTINGS;

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        align='start'
        title='Settings'
        actions={
          <>
            {msg ? (
              <span
                className='text-sm max-w-56 sm:max-w-xs leading-snug text-right'
                style={{ color: msg.startsWith('Lỗi') ? 'var(--error)' : 'var(--accent)' }}
              >
                {msg}
              </span>
            ) : null}
            <AppButton variant='ghost' onClick={() => void handleReset()} disabled={!dirty || disabled}>
              Reset
            </AppButton>
            <AppButton variant='secondary' onClick={() => void handleSave()} disabled={!dirty || saving || disabled || constantsLoading}>
              {saving ? 'Đang lưu...' : 'Lưu settings'}
            </AppButton>
          </>
        }
      />

      <div className='space-y-4'>
          <SectionCard title='LƯU TRỮ VIDEO'>
            <p className='text-sm leading-relaxed mb-3' style={{ color: 'var(--text-muted)' }}>
              Chọn thư mục cha (ví dụ ổ D:\\ hoặc thư mục trên ổ ngoài). App tạo bên trong thư mục đó{' '}
              <code className='text-xs'>MaVidMedia</code> với ba thư mục con:
            </p>
            <p>
              <code className='text-xs'>backgrounds</code>: chứa những video stock hoặc ảnh bạn muốn dùng để tạo thành video
            </p>
            <p>
              <code className='text-xs'>videos</code>: lưu trữ những video đã đăng lên youtube
            </p>
            <p>
              <code className='text-xs'>channels</code>: lưu trữ thông tin các kênh youtube{' '}
              <span className='text-red-500 text-xs'>*không được thay đổi*</span>
            </p>
            <div className='flex flex-wrap gap-3 items-end'>
              <div className='flex-1 min-w-[min(100%,18rem)]'>
                <Field label=''>
                  <input
                    value={constantsLoading ? 'Đang tải…' : a.STORAGE}
                    readOnly
                    disabled={constantsLoading}
                    className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                    style={inputStyle}
                    title={a.STORAGE}
                  />
                </Field>
              </div>
              <AppButton
                type='button'
                variant='secondary'
                onClick={() => void handleSelectVideoStorageRoot()}
                disabled={!canEdit || constantsLoading || !canPickStorageFolder}
                title={!canPickStorageFolder ? 'Chỉ dùng trong app Electron' : undefined}
              >
                Chọn thư mục…
              </AppButton>
            </div>
          </SectionCard>

          <SectionCard title='LÊN LỊCH ĐĂNG'>
            <p className='text-sm leading-relaxed mb-3' style={{ color: 'var(--text-muted)' }}>
              Giới hạn lịch đăng và số video tạo trước; lưu trong <code className='text-xs'>APP_SETTINGS.VIDEO</code>.
            </p>
            <div className='grid gap-3 sm:grid-cols-2'>
              <Field label='Số ngày lên lịch trước tối đa'>
                <input
                  type='number'
                  min={1}
                  max={500}
                  value={a.VIDEO.MAX_SCHEDULED_DAYS}
                  disabled={!canEdit || constantsLoading}
                  onChange={e => {
                    const raw = toNum(e.target.value, a.VIDEO.MAX_SCHEDULED_DAYS);
                    const n = Math.max(1, Math.min(500, Math.floor(raw)));
                    patchAppSettings({
                      ...a,
                      VIDEO: { ...a.VIDEO, MAX_SCHEDULED_DAYS: n },
                    });
                  }}
                  className='w-full max-w-xs rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='Số video tạo trước tối đa'>
                <input
                  type='number'
                  min={1}
                  max={500}
                  value={a.VIDEO.MAX_VIDEOS_PREPARE_AHEAD}
                  disabled={!canEdit || constantsLoading}
                  onChange={e => {
                    const raw = toNum(e.target.value, a.VIDEO.MAX_VIDEOS_PREPARE_AHEAD);
                    const n = Math.max(1, Math.min(500, Math.floor(raw)));
                    patchAppSettings({
                      ...a,
                      VIDEO: { ...a.VIDEO, MAX_VIDEOS_PREPARE_AHEAD: n },
                    });
                  }}
                  className='w-full max-w-xs rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title='FLOW'>
            <div className='grid gap-3'>
              <Field label='PROJECT ID'>
                <input
                  value={a.FLOW.PROJECT_ID}
                  disabled={!canEdit}
                  onChange={e =>
                    patchAppSettings({
                      ...a,
                      FLOW: { ...a.FLOW, PROJECT_ID: e.target.value },
                    })
                  }
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>
      </div>
    </div>
  );
}
