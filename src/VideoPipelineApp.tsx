import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import './App.css';

type ScriptDef = {
  id: string;
  title: string;
  npmScript: string;
  summary: string;
  inputs: string[];
  outputs: string[];
};

declare global {
  interface Window {
    runner?: {
      runNpmScript: (npmScript: string) => Promise<{ code: number }>;
      listConstantsFiles: () => Promise<string[]>;
      readConstantsFile: (file: string) => Promise<string>;
      writeConstantsFile: (file: string, content: string) => Promise<{ ok: true }>;
    };
  }
}

const scriptDefs: ScriptDef[] = [
  {
    id: 'chrome-profile',
    title: 'Tạo / Load Chrome profile',
    npmScript: 'tao-chrome-profile',
    summary: 'Mở Chrome persistent để đăng nhập Google lần đầu (cần thao tác tay).',
    inputs: ['Không có (mặc định dùng profile1).'],
    outputs: ['chrome-profile/profileN (lưu session).'],
  },
  {
    id: 'youtube-info',
    title: 'Lấy thông tin YouTube (video/channel/playlist)',
    npmScript: 'lay-thong-tin-youtube (video, channel)',
    summary: 'Đọc `input.txt` (URL đầu tiên), tạo/ cập nhật file Excel trong `channels/`.',
    inputs: ['`input.txt` (ít nhất 1 URL YouTube).'],
    outputs: ['`channels/<id>/<id>.xlsx` (hoặc cập nhật file hiện có).'],
  },
  {
    id: 'batch-from-audio',
    title: 'Tạo batch video từ audio',
    npmScript: 'tao-batch-video-tu-audio',
    summary: 'Lấy danh sách video từ `channels/` rồi tạo video theo pipeline from_audio.',
    inputs: ['Thư mục `channels/` đã có output.xlsx/output.csv.', 'Có thể script sẽ hỏi chọn channel folder nếu có nhiều folder.'],
    outputs: ['Tạo file video trong `remade_videos/` theo từng videoId.'],
  },
  {
    id: 'batch-reup-full',
    title: 'Tạo batch video reup full',
    npmScript: 'tao-batch-video-reup-full',
    summary: 'Remake full: thêm overlay ảnh/video cho từng video trong danh sách batch.',
    inputs: ['Thư mục `channels/` đã có output.xlsx/output.csv.', 'Có thể script sẽ hỏi chọn channel folder nếu có nhiều folder.'],
    outputs: ['Tạo file video trong `remade_videos/` theo từng videoId.'],
  },
  {
    id: 'remake-from-full',
    title: 'Làm lại video (remade_videos)',
    npmScript: 'lam-lai-video',
    summary: 'Chạy `makeVideoFromFull.js` để remake tất cả video trong `downloads/`.',
    inputs: ['`downloads/` chứa video nguồn.', '`backgrounds/overlay/` chứa overlay ảnh/video.'],
    outputs: ['`remade_videos/<video>_remade.mp4` hoặc theo cấu trúc script.'],
  },
  {
    id: 'thumbnail-flow',
    title: 'Tạo thumbnail flow',
    npmScript: 'tao-thumbnail-flow',
    summary: 'Tạo thumbnail bằng Google Flow (Playwright).',
    inputs: ['(Tùy script) path save và output basename có thể truyền qua CLI.'],
    outputs: ['Thư mục `images/` và file thumbnail theo output basename.'],
  },
  {
    id: 'meta-from-transcript',
    title: 'Tóm tắt meta từ transcript',
    npmScript: 'tom-tat-meta-tu-transcript',
    summary: 'Đọc URL đầu tiên từ `input.txt`, tải transcript, rồi dùng Gemini tóm tắt meta.',
    inputs: ['`input.txt` (URL video).'],
    outputs: ['`downloads/meta-from-transcript.json`.'],
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='rounded-lg border p-3' style={{ borderColor: 'var(--border)' }}>
      <div className='text-sm font-semibold' style={{ color: 'var(--text-h)', marginBottom: 6 }}>
        {title}
      </div>
      <div className='text-sm' style={{ opacity: 0.92, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

export default function VideoPipelineApp() {
  const [tab, setTab] = useState<'pipeline' | 'settings'>('pipeline');
  const [selectedId, setSelectedId] = useState<string>(scriptDefs[1].id);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Sẵn sàng.');

  const selected = useMemo(() => scriptDefs.find(s => s.id === selectedId) || scriptDefs[0], [selectedId]);

  const canRun = runningId === null;

  const [constantsFiles, setConstantsFiles] = useState<string[]>([]);
  const [constantsFile, setConstantsFile] = useState<string>('');
  const [constantsText, setConstantsText] = useState<string>('');
  const [constantsMsg, setConstantsMsg] = useState<string>('');
  const [constantsDirty, setConstantsDirty] = useState(false);
  const [constantsLoading, setConstantsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'settings') return;
    if (!window.runner?.listConstantsFiles) return;
    // Load lazy khi user bấm tab Setting.
    if (constantsFiles.length > 0) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadConstantsFile(file: string) {
    if (!file) return;
    if (!window.runner?.readConstantsFile) return;
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

  async function runSelected() {
    if (!window.runner?.runNpmScript) {
      setStatus('Chưa sẵn sàng runner trong Electron. Hãy khởi động lại app.');
      return;
    }
    if (!canRun) return;

    setRunningId(selected.id);
    setStatus('Đang chạy... (xem console để thấy log/prompt)');

    try {
      const res = await window.runner.runNpmScript(selected.npmScript);
      if (res.code !== 0) throw new Error(`Exit code: ${res.code}`);
      setStatus('Hoàn thành.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Có lỗi xảy ra.';
      setStatus(`Lỗi: ${msg}`);
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className='min-h-svh w-full flex'>
      <aside className='w-[300px] shrink-0 border-r p-4' style={{ borderRightColor: 'var(--border)' }}>
        <div className='flex gap-2 mb-3'>
          <button
            onClick={() => setTab('pipeline')}
            className='flex-1 rounded px-3 py-2 text-sm'
            style={{
              color: tab === 'pipeline' ? 'var(--accent)' : 'var(--text-h)',
              background: tab === 'pipeline' ? 'var(--accent-bg)' : 'transparent',
              border: '1px solid',
              borderColor: tab === 'pipeline' ? 'var(--accent-border)' : 'transparent',
            }}
          >
            Pipeline
          </button>
          <button
            onClick={() => setTab('settings')}
            className='flex-1 rounded px-3 py-2 text-sm'
            style={{
              color: tab === 'settings' ? 'var(--accent)' : 'var(--text-h)',
              background: tab === 'settings' ? 'var(--accent-bg)' : 'transparent',
              border: '1px solid',
              borderColor: tab === 'settings' ? 'var(--accent-border)' : 'transparent',
            }}
          >
            Setting
          </button>
        </div>

        {tab === 'pipeline' ? (
          <>
            <div className='space-y-2'>
              {scriptDefs.map(s => {
                const isActive = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    disabled={runningId !== null}
                    className='w-full rounded px-3 py-2 text-left text-sm'
                    style={{
                      background: isActive ? 'var(--accent-bg)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-h)',
                      border: isActive ? '1px solid var(--accent-border)' : `1px solid transparent`,
                      opacity: runningId !== null ? 0.7 : 1,
                    }}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>

            <div className='mt-4 text-xs' style={{ opacity: 0.8 }}>
              {runningId ? 'Đang chạy: vui lòng chờ.' : 'Chọn bước -> bấm Chạy.'}
            </div>
          </>
        ) : (
          <div className='mt-2 text-xs' style={{ opacity: 0.85, lineHeight: 1.5 }}>
            Sửa file trong `contents/constants/` (applies cho lần chạy script tiếp theo).
          </div>
        )}
      </aside>

      <main className='flex-1 p-6 overflow-auto'>
        {tab === 'pipeline' ? (
          <>
            <div className='mb-4'>
              <div className='text-xl font-semibold' style={{ color: 'var(--text-h)' }}>
                {selected.title}
              </div>
              <div className='text-sm' style={{ opacity: 0.85, marginTop: 4 }}>
                {selected.summary}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <Section title='Inputs (đọc từ đâu)'>
                <ul className='list-disc pl-5'>
                  {selected.inputs.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </Section>

              <Section title='Outputs (tạo ra gì)'>
                <ul className='list-disc pl-5'>
                  {selected.outputs.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </Section>

              <Section title='Thực thi'>
                <div className='mb-3 text-sm' style={{ opacity: 0.9 }}>
                  Trạng thái:{' '}
                  <span style={{ color: runningId ? 'var(--accent)' : 'var(--text-h)' }}>{status}</span>
                </div>

                <div className='flex gap-2 flex-wrap'>
                  <button
                    onClick={() => void runSelected()}
                    disabled={!canRun}
                    className='rounded px-3 py-2 text-sm'
                    style={{
                      color: 'var(--accent)',
                      background: 'var(--accent-bg)',
                      border: '1px solid var(--accent-border)',
                      opacity: canRun ? 1 : 0.7,
                    }}
                  >
                    {runningId === selected.id ? 'Đang chạy...' : 'Chạy script'}
                  </button>

                  <div className='text-xs' style={{ opacity: 0.85, alignSelf: 'center' }}>
                    Lưu ý: log/prompt sẽ hiện ở terminal nơi bạn chạy `npm start`.
                  </div>
                </div>
              </Section>
            </div>
          </>
        ) : (
          <>
            <div className='mb-4'>
              <div className='text-xl font-semibold' style={{ color: 'var(--text-h)' }}>
                Setting: `contents/constants/`
              </div>
              <div className='text-sm' style={{ opacity: 0.85, marginTop: 4 }}>
                Chọn file, sửa và bấm `Lưu`. Script chạy sau sẽ dùng nội dung mới.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <Section title='Chọn file'>
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
              </Section>

              <Section title='Editor'>
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
                  disabled={constantsLoading || !constantsFile}
                />

                <div className='flex gap-2 flex-wrap mt-3'>
                  <button
                    onClick={async () => {
                      if (!constantsFile) return;
                      setConstantsMsg('');
                      setConstantsLoading(true);
                      try {
                        await window.runner?.writeConstantsFile(constantsFile, constantsText);
                        setConstantsDirty(false);
                        setConstantsMsg('Đã lưu thành công.');
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : 'Không lưu được.';
                        setConstantsMsg(`Lỗi: ${msg}`);
                      } finally {
                        setConstantsLoading(false);
                      }
                    }}
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
              </Section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
