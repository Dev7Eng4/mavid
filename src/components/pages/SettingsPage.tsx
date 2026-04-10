import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { ConstantsUiModel } from '../../types';
import { AppButton } from '../ui/AppButton';
import { PageHeader } from '../ui/PageHeader';
import { SectionCard } from '../ui/SectionCard';

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

const DEFAULT_MODEL: ConstantsUiModel = {
  flowSettings: {
    FLOW_URL: 'https://labs.google/fx/vi/tools/flow/project/',
    FLOW_PROJECT_ID: '3550d75f-a7ac-41ec-9ec7-0c23bc5efb95',
  },
  GEMINI_CONFIG: { URL: 'https://gemini.google.com/app', MAX_CONCURRENT: 3 },
  GEMINI_CHUNK_SIZE: { UPDATE_TRANSCRIPT: 200, SUMMARY_CONTENT: 500 },
  LANGUAGES_NEED_UPDATE_TRANSCRIPT: ['ja'],
  META_DATA: { NICHE: 'Niche', TITLE: 'Title', DESCRIPTION: 'Description', TAGS: 'Tags' },
  DEFAULT_VIDEO: { BACKGROUND_VIDEO: 'cat' },
  AUDIO_SPEED: 0.91,
  STOCK_VIDEO: {
    CROSSFADE_SEC: 1,
    RENDER_EXTRA_SEC: 15,
    SLOWMO_FACTOR: 2.0,
    CANVAS_W: 1280,
    CANVAS_H: 720,
    FPS: 30,
    BITRATE: '4M',
    MAX_BITRATE: '5M',
    BUFSIZE: '8M',
  },
  SUBTITLE: {
    BOX_HEIGHT: 200,
    BOX_OPACITY: 0.5,
    FONT_SIZE: 80,
    PADDING_TOP: 15,
    PADDING_HORIZONTAL: 40,
    CHAR_SPACING: 2,
  },
  LOGO: { SIZE: 80, MARGIN_TOP: 20, MARGIN_RIGHT: 20 },
  VIDEO_STORAGE_ROOT: '',
  MAX_SCHEDULED_VIDEOS: 20,
  MAX_VIDEOS_PREPARE_AHEAD: 20,
};

type SettingsTab = 'common' | 'video';

export function SettingsPage({ disabled }: Props) {
  const [model, setModel] = useState<ConstantsUiModel>(DEFAULT_MODEL);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<SettingsTab>('common');
  const [constantsLoading, setConstantsLoading] = useState(true);

  const canEdit = !disabled && !saving;
  const canPickStorageFolder = typeof window.runner?.selectVideoStorageFolder === 'function';

  useEffect(() => {
    if (!window.runner?.getConstantsUiModel) {
      setConstantsLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const m = await window.runner.getConstantsUiModel();
        if (!cancelled) {
          setModel(prev => ({ ...prev, ...m }));
          setDirty(false);
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
    if (!window.runner?.saveConstantsUiModel) return;
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

  function patch<K extends keyof ConstantsUiModel>(key: K, value: ConstantsUiModel[K]) {
    setModel(s => ({ ...s, [key]: value }));
    setDirty(true);
  }

  function handleReset() {
    setModel(DEFAULT_MODEL);
    setDirty(false);
    setMsg('');
  }

  async function handleSelectVideoStorageRoot() {
    if (!window.runner?.selectVideoStorageFolder) {
      setMsg('Chỉ chọn thư mục được trong app Electron.');
      return;
    }
    setMsg('');
    try {
      const r = await window.runner.selectVideoStorageFolder(model.VIDEO_STORAGE_ROOT?.trim() || null);
      if (!r?.ok || !r.path) return;
      const chosen = r.path;
      setModel(m => ({ ...m, VIDEO_STORAGE_ROOT: chosen }));
      setMsg('Đã lưu: trong thư mục đã chọn tạo MaVidMedia với backgrounds, videos, channels.');
    } catch (e) {
      setMsg(`Lỗi: ${e instanceof Error ? e.message : 'Không chọn được thư mục.'}`);
    }
  }

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
            <AppButton variant='ghost' onClick={handleReset} disabled={!dirty || disabled}>
              Reset
            </AppButton>
            <AppButton variant='secondary' onClick={() => void handleSave()} disabled={!dirty || saving || disabled || constantsLoading}>
              {saving ? 'Đang lưu...' : 'Lưu settings'}
            </AppButton>
          </>
        }
      />

      <div className='flex gap-2'>
        {(
          [
            ['common', 'Setting Chung'],
            ['video', 'Setting Video'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type='button'
            onClick={() => setTab(id)}
            className={`mavid-tab ${tab === id ? 'mavid-tab--active' : 'mavid-tab--inactive'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ───── CHUNG ───── */}
      {tab === 'common' && (
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
                    value={constantsLoading ? 'Đang tải…' : model.VIDEO_STORAGE_ROOT}
                    readOnly
                    disabled={constantsLoading}
                    className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                    style={inputStyle}
                    title={model.VIDEO_STORAGE_ROOT}
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
              Giới hạn lịch đăng và số video tạo trước; các luồng trong app đọc{' '}
              <code className='text-xs'>MAX_SCHEDULED_VIDEOS</code> và{' '}
              <code className='text-xs'>MAX_VIDEOS_PREPARE_AHEAD</code> trong constants.
            </p>
            <div className='grid gap-3 sm:grid-cols-2'>
              <Field label='Số video lên lịch tối đa'>
                <input
                  type='number'
                  min={1}
                  max={500}
                  value={model.MAX_SCHEDULED_VIDEOS}
                  disabled={!canEdit || constantsLoading}
                  onChange={e => {
                    const raw = toNum(e.target.value, model.MAX_SCHEDULED_VIDEOS);
                    const n = Math.max(1, Math.min(500, Math.floor(raw)));
                    patch('MAX_SCHEDULED_VIDEOS', n);
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
                  value={model.MAX_VIDEOS_PREPARE_AHEAD}
                  disabled={!canEdit || constantsLoading}
                  onChange={e => {
                    const raw = toNum(e.target.value, model.MAX_VIDEOS_PREPARE_AHEAD);
                    const n = Math.max(1, Math.min(500, Math.floor(raw)));
                    patch('MAX_VIDEOS_PREPARE_AHEAD', n);
                  }}
                  className='w-full max-w-xs rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title='FLOW'>
            <div className='grid gap-3'>
              <Field label='URL'>
                <input
                  value={model.flowSettings.FLOW_URL}
                  disabled
                  onChange={e => patch('flowSettings', { ...model.flowSettings, FLOW_URL: e.target.value })}
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='PROJECT ID'>
                <input
                  value={model.flowSettings.FLOW_PROJECT_ID}
                  disabled={!canEdit}
                  onChange={e => patch('flowSettings', { ...model.flowSettings, FLOW_PROJECT_ID: e.target.value })}
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title='GEMINI'>
            <div className='grid gap-3'>
              <Field label='URL'>
                <input
                  value={model.GEMINI_CONFIG.URL}
                  disabled
                  onChange={e => patch('GEMINI_CONFIG', { ...model.GEMINI_CONFIG, URL: e.target.value })}
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='MAX CONCURRENT'>
                <input
                  type='number'
                  value={model.GEMINI_CONFIG.MAX_CONCURRENT}
                  disabled={!canEdit}
                  onChange={e =>
                    patch('GEMINI_CONFIG', {
                      ...model.GEMINI_CONFIG,
                      MAX_CONCURRENT: toNum(e.target.value, model.GEMINI_CONFIG.MAX_CONCURRENT),
                    })
                  }
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='CHUNK: UPDATE_TRANSCRIPT'>
                <input
                  type='number'
                  value={model.GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT}
                  disabled={!canEdit}
                  onChange={e =>
                    patch('GEMINI_CHUNK_SIZE', {
                      ...model.GEMINI_CHUNK_SIZE,
                      UPDATE_TRANSCRIPT: toNum(e.target.value, model.GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT),
                    })
                  }
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='CHUNK: SUMMARY_CONTENT'>
                <input
                  type='number'
                  value={model.GEMINI_CHUNK_SIZE.SUMMARY_CONTENT}
                  disabled={!canEdit}
                  onChange={e =>
                    patch('GEMINI_CHUNK_SIZE', {
                      ...model.GEMINI_CHUNK_SIZE,
                      SUMMARY_CONTENT: toNum(e.target.value, model.GEMINI_CHUNK_SIZE.SUMMARY_CONTENT),
                    })
                  }
                  className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ───── VIDEO ───── */}
      {tab === 'video' && (
        <div className='space-y-4'>
          <SectionCard title='STOCK VIDEO'>
            <div className='grid gap-3 sm:grid-cols-2'>
              {(Object.keys(model.STOCK_VIDEO) as (keyof typeof model.STOCK_VIDEO)[]).map(k => {
                const val = model.STOCK_VIDEO[k];
                const isNum = typeof val === 'number';
                return (
                  <Field key={k} label={k}>
                    <input
                      type={isNum ? 'number' : 'text'}
                      value={val}
                      disabled={!canEdit}
                      onChange={e => {
                        const next = isNum ? toNum(e.target.value, val as number) : e.target.value;
                        patch('STOCK_VIDEO', { ...model.STOCK_VIDEO, [k]: next });
                      }}
                      className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                      style={inputStyle}
                    />
                  </Field>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title='SUBTITLE'>
            <div className='grid gap-3 sm:grid-cols-2'>
              {(Object.keys(model.SUBTITLE) as (keyof typeof model.SUBTITLE)[]).map(k => (
                <Field key={k} label={k}>
                  <input
                    type='number'
                    value={model.SUBTITLE[k]}
                    disabled={!canEdit}
                    step={k === 'BOX_OPACITY' ? 0.1 : 1}
                    onChange={e => patch('SUBTITLE', { ...model.SUBTITLE, [k]: toNum(e.target.value, model.SUBTITLE[k]) })}
                    className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                    style={inputStyle}
                  />
                </Field>
              ))}
            </div>
          </SectionCard>

          <SectionCard title='LOGO'>
            <div className='grid gap-3 sm:grid-cols-3'>
              {(Object.keys(model.LOGO) as (keyof typeof model.LOGO)[]).map(k => (
                <Field key={k} label={k}>
                  <input
                    type='number'
                    value={model.LOGO[k]}
                    disabled={!canEdit}
                    onChange={e => patch('LOGO', { ...model.LOGO, [k]: toNum(e.target.value, model.LOGO[k]) })}
                    className='w-full rounded-xl px-3 py-2 text-sm outline-none'
                    style={inputStyle}
                  />
                </Field>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
