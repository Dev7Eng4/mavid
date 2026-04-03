import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { SectionCard } from './SectionCard';
import { TabSwitcher, type TabKey } from './TabSwitcher';

type Props = {
  tab: TabKey;
  setTab: Dispatch<SetStateAction<TabKey>>;
};

export function ConstantsSettingsTab({ tab, setTab }: Props) {
  const [constantsFiles, setConstantsFiles] = useState<string[]>([]);
  const [constantsFile, setConstantsFile] = useState<string>('');
  const [constantsText, setConstantsText] = useState<string>('');
  const [constantsMsg, setConstantsMsg] = useState<string>('');
  const [constantsDirty, setConstantsDirty] = useState(false);
  const [constantsLoading, setConstantsLoading] = useState(false);

  const canEdit = useMemo(() => Boolean(constantsFile) && !constantsLoading, [constantsFile, constantsLoading]);

  useEffect(() => {
    if (!window.runner?.listConstantsFiles) return;

    (async () => {
      setConstantsLoading(true);
      setConstantsMsg('');
      try {
        const files = await window.runner!.listConstantsFiles();
        setConstantsFiles(files);
        const first = files[0] || '';
        setConstantsFile(first);
        if (first) {
          const text = await window.runner!.readConstantsFile(first);
          setConstantsText(text);
          setConstantsDirty(false);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Không đọc được constants.';
        setConstantsMsg(`Lỗi: ${msg}`);
      } finally {
        setConstantsLoading(false);
      }
    })();
  }, []);

  async function loadConstantsFile(file: string) {
    if (!window.runner?.readConstantsFile) return;
    if (!file) return;
    setConstantsLoading(true);
    setConstantsMsg('');
    try {
      const text = await window.runner.readConstantsFile(file);
      setConstantsText(text);
      setConstantsDirty(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không đọc được file.';
      setConstantsMsg(`Lỗi: ${msg}`);
    } finally {
      setConstantsLoading(false);
    }
  }

  async function handleSave() {
    if (!constantsFile) return;
    if (!window.runner?.writeConstantsFile) return;
    setConstantsMsg('');
    setConstantsLoading(true);
    try {
      await window.runner.writeConstantsFile(constantsFile, constantsText);
      setConstantsDirty(false);
      setConstantsMsg('Đã lưu thành công.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không lưu được.';
      setConstantsMsg(`Lỗi: ${msg}`);
    } finally {
      setConstantsLoading(false);
    }
  }

  return (
    <div className='min-h-svh w-full flex'>
      <aside className='w-[300px] shrink-0 border-r p-4' style={{ borderRightColor: 'var(--border)' }}>
        <TabSwitcher tab={tab} setTab={setTab} />

        <div className='mt-2 text-xs' style={{ opacity: 0.85, lineHeight: 1.5 }}>
          Sửa file trong `contents/constants/` (áp dụng cho lần chạy script tiếp theo).
        </div>
      </aside>

      <main className='flex-1 p-6 overflow-auto'>
        <div className='mb-4'>
          <div className='text-xl font-semibold' style={{ color: 'var(--text-h)' }}>
            Setting: `contents/constants/`
          </div>
          <div className='text-sm' style={{ opacity: 0.85, marginTop: 4 }}>
            Chọn file, sửa và bấm `Lưu`. Script chạy sau sẽ dùng nội dung mới.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <SectionCard title='Chọn file'>
            <div className='flex gap-2 flex-wrap items-center'>
              <select
                value={constantsFile}
                onChange={e => {
                  const f = e.target.value;
                  setConstantsFile(f);
                  if (f) void loadConstantsFile(f);
                }}
                className='rounded px-3 py-2 text-sm'
                style={{
                  color: 'var(--text-h)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  minWidth: 180,
                }}
                disabled={constantsLoading || constantsFiles.length === 0}
              >
                {constantsFiles.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  if (constantsFile) void loadConstantsFile(constantsFile);
                }}
                disabled={!constantsFile || constantsLoading}
                className='rounded px-3 py-2 text-sm'
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  opacity: !constantsFile || constantsLoading ? 0.7 : 1,
                }}
              >
                Tải lại
              </button>
            </div>

            {constantsMsg ? (
              <div
                className='mt-2 text-xs'
                style={{
                  color: constantsMsg.startsWith('Lỗi') ? '#ef4444' : 'var(--accent)',
                  lineHeight: 1.4,
                }}
              >
                {constantsMsg}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title='Editor'>
            <textarea
              value={constantsText}
              onChange={e => {
                setConstantsText(e.target.value);
                setConstantsDirty(true);
              }}
              spellCheck={false}
              className='w-full rounded'
              style={{
                minHeight: 320,
                width: '100%',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.5,
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                border: '1px solid var(--border)',
                padding: 12,
                outline: 'none',
                resize: 'vertical',
              }}
              disabled={!canEdit}
            />

            <div className='flex gap-2 flex-wrap mt-3'>
              <button
                onClick={() => void handleSave()}
                disabled={!constantsFile || constantsLoading || !constantsDirty}
                className='rounded px-3 py-2 text-sm'
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  opacity: !constantsFile || constantsLoading || !constantsDirty ? 0.7 : 1,
                }}
              >
                Lưu
              </button>

              <div className='text-xs' style={{ opacity: 0.85, alignSelf: 'center' }}>
                Mẹo: không xóa `export const ...` / `const ...` để tránh script fail.
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}

