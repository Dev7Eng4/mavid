import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ConstantsUiModel } from '../../types';
import { SectionCard } from '../ui/SectionCard';

interface Props {
  disabled: boolean;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className='block'>
      <div className='text-xs mb-1' style={{ opacity: 0.9 }}>
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
};

type SettingsTab = 'common' | 'video';

export function SettingsPage({ disabled }: Props) {
  const [model, setModel] = useState<ConstantsUiModel>(DEFAULT_MODEL);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<SettingsTab>('common');

  const canEdit = !disabled && !saving;

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

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex gap-2 items-center'>
          {msg && (
            <span className='text-xs' style={{ color: msg.startsWith('Lỗi') ? '#ef4444' : 'var(--accent)' }}>
              {msg}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!dirty || disabled}
            className='rounded-lg px-3 py-2 text-xs font-medium'
            style={{
              color: 'var(--text-h)',
              background: 'transparent',
              border: '1px solid var(--border)',
              opacity: !dirty || disabled ? 0.5 : 1,
            }}
          >
            Reset
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!dirty || saving || disabled}
            className='rounded-lg px-4 py-2 text-xs font-medium'
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              opacity: !dirty || saving || disabled ? 0.5 : 1,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu settings'}
          </button>
        </div>
      </div>

      {/* ───── TAB SWITCHER ───── */}
      <div className='flex gap-2'>
        {(
          [
            ['common', 'Setting Chung'],
            ['video', 'Setting Video'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className='flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors'
            style={{
              color: tab === id ? 'var(--accent)' : 'var(--text)',
              background: tab === id ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${tab === id ? 'var(--accent-border)' : 'var(--border)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ───── CHUNG ───── */}
      {tab === 'common' && (
        <div className='space-y-4'>
          <SectionCard title='Flow'>
            <div className='grid gap-3'>
              <Field label='FLOW_URL'>
                <input
                  value={model.flowSettings.FLOW_URL}
                  disabled={!canEdit}
                  onChange={e => patch('flowSettings', { ...model.flowSettings, FLOW_URL: e.target.value })}
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='FLOW_PROJECT_ID'>
                <input
                  value={model.flowSettings.FLOW_PROJECT_ID}
                  disabled={!canEdit}
                  onChange={e => patch('flowSettings', { ...model.flowSettings, FLOW_PROJECT_ID: e.target.value })}
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title='Gemini'>
            <div className='grid gap-3'>
              <Field label='URL'>
                <input
                  value={model.GEMINI_CONFIG.URL}
                  disabled={!canEdit}
                  onChange={e => patch('GEMINI_CONFIG', { ...model.GEMINI_CONFIG, URL: e.target.value })}
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='MAX_CONCURRENT'>
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
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
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
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
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
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
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
          <SectionCard title='Video defaults'>
            <div className='grid gap-3'>
              <Field label='BACKGROUND_VIDEO'>
                <input
                  value={model.DEFAULT_VIDEO.BACKGROUND_VIDEO}
                  disabled={!canEdit}
                  onChange={e => patch('DEFAULT_VIDEO', { ...model.DEFAULT_VIDEO, BACKGROUND_VIDEO: e.target.value })}
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
              <Field label='AUDIO_SPEED'>
                <input
                  type='number'
                  step={0.01}
                  value={model.AUDIO_SPEED}
                  disabled={!canEdit}
                  onChange={e => patch('AUDIO_SPEED', toNum(e.target.value, model.AUDIO_SPEED))}
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                  style={inputStyle}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title='Stock video'>
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
                      className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                      style={inputStyle}
                    />
                  </Field>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title='Subtitle'>
            <div className='grid gap-3 sm:grid-cols-2'>
              {(Object.keys(model.SUBTITLE) as (keyof typeof model.SUBTITLE)[]).map(k => (
                <Field key={k} label={k}>
                  <input
                    type='number'
                    value={model.SUBTITLE[k]}
                    disabled={!canEdit}
                    step={k === 'BOX_OPACITY' ? 0.1 : 1}
                    onChange={e => patch('SUBTITLE', { ...model.SUBTITLE, [k]: toNum(e.target.value, model.SUBTITLE[k]) })}
                    className='w-full rounded-lg px-3 py-2 text-sm outline-none'
                    style={inputStyle}
                  />
                </Field>
              ))}
            </div>
          </SectionCard>

          <SectionCard title='Logo'>
            <div className='grid gap-3 sm:grid-cols-3'>
              {(Object.keys(model.LOGO) as (keyof typeof model.LOGO)[]).map(k => (
                <Field key={k} label={k}>
                  <input
                    type='number'
                    value={model.LOGO[k]}
                    disabled={!canEdit}
                    onChange={e => patch('LOGO', { ...model.LOGO, [k]: toNum(e.target.value, model.LOGO[k]) })}
                    className='w-full rounded-lg px-3 py-2 text-sm outline-none'
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
