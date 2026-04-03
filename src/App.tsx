import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

type Resolution = { label: string; width: number; height: number };

type Theme = {
  id: string;
  label: string;
  bg1: string;
  bg2: string;
  accent: string;
};

type GeneratorSettings = {
  title: string;
  durationSec: number;
  fps: number;
  resolution: Resolution['label'];
  themeId: string;
};

const resolutions: Resolution[] = [
  { label: '640x360', width: 640, height: 360 },
  { label: '854x480', width: 854, height: 480 },
  { label: '1280x720', width: 1280, height: 720 },
];

const themes: Theme[] = [
  { id: 'purple', label: 'Tím', bg1: '#2b1055', bg2: '#7597de', accent: '#c084fc' },
  { id: 'mint', label: 'Mint', bg1: '#004e92', bg2: '#000428', accent: '#2dd4bf' },
  { id: 'sunset', label: 'Sunset', bg1: '#ff512f', bg2: '#dd2476', accent: '#fb7185' },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getSupportedMimeType(candidates: string[]) {
  if (typeof MediaRecorder === 'undefined') return '';
  const isSupported = (type: string) => {
    // Một số môi trường có thể không có isTypeSupported.
    return typeof MediaRecorder.isTypeSupported === 'function' ? MediaRecorder.isTypeSupported(type) : true;
  };

  for (const c of candidates) {
    try {
      if (isSupported(c)) return c;
    } catch {
      // ignore
    }
  }
  return '';
}

function drawFrame(params: {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t01: number;
  title: string;
  theme: Theme;
}) {
  const { ctx, w, h, t01, title, theme } = params;

  // Background gradient.
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Moving shapes.
  ctx.globalAlpha = 0.95;
  const circleX = w * (0.2 + 0.6 * t01);
  const circleY = h * (0.52 + 0.18 * Math.sin(t01 * Math.PI * 2));
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(circleX, circleY, Math.min(w, h) * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Title.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontTitle = Math.floor(h * 0.085);
  ctx.font = `600 ${fontTitle}px ${getComputedStyle(document.body).fontFamily || 'system-ui'}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = Math.floor(h * 0.02);
  ctx.fillText(title || 'Untitled', w / 2, h * 0.45);
  ctx.shadowBlur = 0;

  // Progress bar.
  const barW = w * 0.78;
  const barH = Math.max(8, Math.floor(h * 0.04));
  const barX = (w - barW) / 2;
  const barY = h * 0.72;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(barX, barY, barW * t01, barH);

  // Label.
  ctx.font = `${Math.max(12, Math.floor(h * 0.028))}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.fillText(`Progress: ${Math.round(t01 * 100)}%`, w / 2, barY + barH * 1.35);
}

function App() {
  const [settings, setSettings] = useState<GeneratorSettings>({
    title: 'Demo Video',
    durationSec: 5,
    fps: 30,
    resolution: '854x480',
    themeId: 'purple',
  });

  const [activeStatus, setActiveStatus] = useState<{
    phase: 'idle' | 'generating' | 'ready' | 'error';
    progress01: number;
    message?: string;
    error?: string;
  }>({ phase: 'idle', progress01: 0 });

  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedResolution = useMemo(
    () => resolutions.find(r => r.label === settings.resolution) || resolutions[1],
    [settings.resolution],
  );
  const selectedTheme = useMemo(
    () => themes.find(t => t.id === settings.themeId) || themes[0],
    [settings.themeId],
  );

  const cleanupOutputUrl = () => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
  };

  // Draw a preview frame.
  useEffect(() => {
    if (activeStatus.phase === 'generating') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = selectedResolution.width;
    canvas.height = selectedResolution.height;

    drawFrame({
      ctx,
      w: canvas.width,
      h: canvas.height,
      t01: 0,
      title: settings.title,
      theme: selectedTheme,
    });
  }, [activeStatus.phase, selectedResolution, selectedTheme, settings.title]);

  async function handleGenerate() {
    if (activeStatus.phase === 'generating') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    cleanupOutputUrl();

    if (typeof MediaRecorder === 'undefined') {
      setActiveStatus({ phase: 'error', progress01: 0, error: 'Trình duyệt không hỗ trợ MediaRecorder.' });
      return;
    }

    const width = selectedResolution.width;
    const height = selectedResolution.height;
    canvas.width = width;
    canvas.height = height;

    const durationSec = clamp(settings.durationSec, 1, 30);
    const fps = clamp(settings.fps, 5, 60);

    const mimeType = getSupportedMimeType([
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]);

    let recorder: MediaRecorder;
    try {
      const stream = canvas.captureStream(fps);
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể khởi tạo MediaRecorder.';
      setActiveStatus({ phase: 'error', progress01: 0, error: msg });
      return;
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const done = new Promise<Blob>(resolve => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'video/webm';
        resolve(new Blob(chunks, { type }));
      };
    });

    const durationMs = durationSec * 1000;

    setActiveStatus({ phase: 'generating', progress01: 0, message: 'Đang tạo video...' });

    // Start recording.
    try {
      // timeslice giúp `ondataavailable` phát đều hơn.
      recorder.start(100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không thể bắt đầu ghi video.';
      setActiveStatus({ phase: 'error', progress01: 0, error: msg });
      return;
    }

    let stopped = false;
    const start = performance.now();

    const loop = (now: number) => {
      const elapsed = now - start;
      const t01 = clamp(elapsed / durationMs, 0, 1);

      drawFrame({
        ctx,
        w: width,
        h: height,
        t01,
        title: settings.title,
        theme: selectedTheme,
      });

      setActiveStatus(s => (s.phase === 'generating' ? { ...s, progress01: t01 } : s));

      if (t01 >= 1) {
        if (!stopped) {
          stopped = true;
          try {
            recorder.stop();
          } catch {
            // ignore
          }
        }
        return;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    const blob = await done;
    const url = URL.createObjectURL(blob);
    setOutputUrl(url);
    setActiveStatus({ phase: 'ready', progress01: 1, message: 'Xong! Bạn có thể xem và tải video.' });
  }

  return (
    <div className='min-h-svh w-full flex'>
      <aside
        className='w-[280px] shrink-0 border-r p-4'
        aria-label='Tool Settings'
        style={{ borderRightColor: 'var(--border)' }}
      >
        <div className='mb-4'>
          <div className='text-lg font-semibold' style={{ color: 'var(--text-h)' }}>
            MaVid Studio
          </div>
          <div className='text-sm' style={{ opacity: 0.85 }}>
            Tool setting và tạo video
          </div>
        </div>

        <div className='space-y-4'>
          <div className='text-sm font-semibold' style={{ color: 'var(--text-h)' }}>
            Tùy chọn video
          </div>

          <label className='block'>
            <div className='text-xs mb-1' style={{ opacity: 0.9 }}>
              Tiêu đề
            </div>
            <input
              value={settings.title}
              onChange={e => setSettings(s => ({ ...s, title: e.target.value }))}
              className='w-full rounded border bg-transparent px-2 py-2 outline-none focus:outline-none'
              placeholder='Ví dụ: Travel Promo'
              disabled={activeStatus.phase === 'generating'}
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <div>
            <div className='text-xs mb-1' style={{ opacity: 0.9 }}>
              Độ dài (giây)
            </div>
            <input
              type='number'
              min={1}
              max={30}
              step={1}
              value={settings.durationSec}
              onChange={e =>
                setSettings(s => ({ ...s, durationSec: Number(e.target.value || 0) }))
              }
              className='w-full rounded border bg-transparent px-2 py-2 outline-none focus:outline-none'
              disabled={activeStatus.phase === 'generating'}
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <div>
            <div className='text-xs mb-1' style={{ opacity: 0.9 }}>
              FPS
            </div>
            <input
              type='number'
              min={5}
              max={60}
              step={1}
              value={settings.fps}
              onChange={e => setSettings(s => ({ ...s, fps: Number(e.target.value || 0) }))}
              className='w-full rounded border bg-transparent px-2 py-2 outline-none focus:outline-none'
              disabled={activeStatus.phase === 'generating'}
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <label className='block'>
            <div className='text-xs mb-1' style={{ opacity: 0.9 }}>
              Độ phân giải
            </div>
            <select
              value={settings.resolution}
              onChange={e => setSettings(s => ({ ...s, resolution: e.target.value }))}
              className='w-full rounded border bg-transparent px-2 py-2 outline-none focus:outline-none'
              disabled={activeStatus.phase === 'generating'}
              style={{ borderColor: 'var(--border)' }}
            >
              {resolutions.map(r => (
                <option key={r.label} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <div className='text-xs mb-1' style={{ opacity: 0.9 }}>
              Theme
            </div>
            <select
              value={settings.themeId}
              onChange={e => setSettings(s => ({ ...s, themeId: e.target.value }))}
              className='w-full rounded border bg-transparent px-2 py-2 outline-none focus:outline-none'
              disabled={activeStatus.phase === 'generating'}
              style={{ borderColor: 'var(--border)' }}
            >
              {themes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => void handleGenerate()}
            disabled={activeStatus.phase === 'generating'}
            className='w-full rounded px-3 py-2'
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              border: '2px solid transparent',
              transition: 'border-color 0.2s, opacity 0.2s',
              opacity: activeStatus.phase === 'generating' ? 0.7 : 1,
            }}
          >
            {activeStatus.phase === 'generating' ? 'Đang tạo...' : 'Tạo video'}
          </button>

          {activeStatus.phase === 'error' && (
            <div className='text-sm' style={{ color: '#ef4444' }}>
              {activeStatus.error || 'Có lỗi xảy ra.'}
            </div>
          )}

          {activeStatus.phase !== 'error' && activeStatus.message && (
            <div className='text-xs' style={{ opacity: 0.9 }}>
              {activeStatus.message}
            </div>
          )}

          {activeStatus.phase === 'generating' && (
            <div className='w-full'>
              <div className='flex justify-between text-xs mb-1' style={{ opacity: 0.9 }}>
                <span>Tiến độ</span>
                <span>{Math.round(activeStatus.progress01 * 100)}%</span>
              </div>
              <div
                className='h-2 rounded overflow-hidden'
                style={{ backgroundColor: 'var(--border)' }}
              >
                <div
                  className='h-full'
                  style={{ width: `${Math.round(activeStatus.progress01 * 100)}%`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className='flex-1 p-6 overflow-auto'>
        <div className='mb-4'>
          <div className='text-xl font-semibold' style={{ color: 'var(--text-h)' }}>
            Preview / Output
          </div>
          <div className='text-sm' style={{ opacity: 0.85 }}>
            Demo tạo video từ canvas animation (không cần ffmpeg).
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
          <section
            className='rounded-lg border p-3'
            style={{ borderColor: 'var(--border)' }}
          >
            <div className='flex items-center justify-between mb-2'>
              <div className='text-sm font-semibold' style={{ color: 'var(--text-h)' }}>
                Preview (canvas)
              </div>
              <div className='text-xs' style={{ opacity: 0.85 }}>
                {selectedResolution.label} @ {settings.fps}fps
              </div>
            </div>

            <canvas
              ref={canvasRef}
              className='w-full max-w-[560px] h-auto rounded border'
              style={{ borderColor: 'var(--border)' }}
            />
          </section>

          <section
            className='rounded-lg border p-3'
            style={{ borderColor: 'var(--border)' }}
          >
            <div className='flex items-center justify-between mb-2'>
              <div className='text-sm font-semibold' style={{ color: 'var(--text-h)' }}>
                Video output
              </div>
              {outputUrl && (
                <a
                  className='text-xs rounded px-2 py-1'
                  style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}
                  href={outputUrl}
                  download='mavid-video.webm'
                >
                  Tải xuống
                </a>
              )}
            </div>

            {outputUrl ? (
              <video
                src={outputUrl}
                controls
                className='w-full rounded border bg-transparent'
                style={{ borderColor: 'var(--border)' }}
              />
            ) : (
              <div className='text-sm' style={{ opacity: 0.9 }}>
                Chưa có video. Nhấn `Tạo video` để sinh file.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
