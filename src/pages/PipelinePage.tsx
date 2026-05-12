import { useState } from 'react';
import type { Page, ScriptId, VideoFromAudioConfig } from '@/types';
import { scriptDefs } from '@/types';
import { buildMavidEnvForVideoFromAudio } from '@/utils/videoFromAudioEnv';
import { ScriptCard } from '@/components/pipeline/ScriptCard';
import { AppButton } from '@/components/ui/AppButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { YouTubeLinkPopup } from '@/components/pipeline/YouTubeLinkPopup';
import { VideoFromAudioPopup } from '@/components/pipeline/VideoFromAudioPopup';
import type { ScriptStatus } from '@/components/pipeline/ScriptCard';

const YOUTUBE_SCRIPT_ID: ScriptId = 'lay-thong-tin-youtube';
const VIDEO_FROM_AUDIO_SCRIPT_ID: ScriptId = 'tao-batch-video-tu-audio';

interface Props {
  runningScript: ScriptId | null;
  setRunningScript: (id: ScriptId | null) => void;
  appendErrorLog: (line: string) => void;
  onNavigate: (page: Page) => void;
}

export function PipelinePage({ runningScript, setRunningScript, appendErrorLog, onNavigate }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ScriptStatus>>({});
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showVideoAudioPopup, setShowVideoAudioPopup] = useState(false);

  async function runScript(id: ScriptId, npmScript: string, extraEnv?: Record<string, string>) {
    if (runningScript) return;
    if (!window.runner?.runNpmScript) {
      appendErrorLog('[MaVid] Runner chưa sẵn sàng. Hãy khởi động lại app.');
      return;
    }

    setRunningScript(id);
    setStatuses(prev => ({ ...prev, [id]: 'running' }));

    try {
      const res = await window.runner.runNpmScript(npmScript, extraEnv);
      if (res.cancelled) {
        setStatuses(prev => ({ ...prev, [id]: 'idle' }));
        return;
      }
      if (res.code !== 0) throw new Error(`Exit code: ${res.code}`);
      setStatuses(prev => ({ ...prev, [id]: 'done' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      appendErrorLog(`[MaVid] Lỗi: ${msg}`);
      setStatuses(prev => ({ ...prev, [id]: 'error' }));
    } finally {
      setRunningScript(null);
    }
  }

  function handleClickRun(id: ScriptId, npmScript: string) {
    if (id === YOUTUBE_SCRIPT_ID) {
      setShowLinkPopup(true);
    } else if (id === VIDEO_FROM_AUDIO_SCRIPT_ID) {
      setShowVideoAudioPopup(true);
    } else {
      void runScript(id, npmScript);
    }
  }

  async function handleVideoAudioConfirm(config: VideoFromAudioConfig) {
    setShowVideoAudioPopup(false);
    const def = scriptDefs.find(s => s.id === VIDEO_FROM_AUDIO_SCRIPT_ID);
    if (def) {
      const bgList = await window.runner.listBackgrounds().catch(() => [] as import('@/types').BackgroundOption[]);
      const extraEnv = buildMavidEnvForVideoFromAudio(config, bgList);
      await runScript(def.id, def.npmScript, extraEnv);
    }
  }

  async function handleStopNpmJob() {
    try {
      await window.runner?.cancelRunningJob?.();
    } catch (e) {
      appendErrorLog(`[MaVid] Lỗi khi dừng: ${e instanceof Error ? e.message : 'Không xác định'}`);
    }
  }

  async function handleYouTubeConfirm(links: string) {
    setShowLinkPopup(false);
    try {
      await window.runner.writeInputFile(links);
    } catch (e) {
      appendErrorLog(`[MaVid] Lỗi ghi input.txt: ${e instanceof Error ? e.message : 'unknown'}`);
      return;
    }
    const def = scriptDefs.find(s => s.id === YOUTUBE_SCRIPT_ID);
    if (def) {
      await runScript(def.id, def.npmScript);
      window.runner.writeInputFile('').catch(() => {});
    }
  }

  return (
    <div className='space-y-6 w-full min-w-0'>
      <PageHeader
        title='Pipeline'
        description='Chọn và chạy các script xử lý video'
        actions={
          runningScript ? (
            <AppButton variant='secondary' onClick={() => onNavigate('logs')}>
              Xem Logs
            </AppButton>
          ) : null
        }
      />

      {runningScript && (
        <div
          className='rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 text-sm'
          style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
        >
          <span
            className='w-2 h-2 rounded-full animate-pulse shrink-0'
            style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
          />
          <span className='flex-1 min-w-[12rem]' style={{ color: 'var(--accent)' }}>
            Đang chạy: {scriptDefs.find(s => s.id === runningScript)?.title}
          </span>
          <AppButton type='button' variant='danger' size='sm' onClick={() => void handleStopNpmJob()} className='shrink-0'>
            Dừng
          </AppButton>
        </div>
      )}

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {scriptDefs.map(s => (
          <ScriptCard
            key={s.id}
            script={s}
            status={s.id === runningScript ? 'running' : (statuses[s.id] ?? 'idle')}
            disabled={runningScript !== null}
            onRun={() => handleClickRun(s.id, s.npmScript)}
          />
        ))}
      </div>

      {showLinkPopup && <YouTubeLinkPopup onConfirm={links => void handleYouTubeConfirm(links)} onCancel={() => setShowLinkPopup(false)} />}

      {showVideoAudioPopup && (
        <VideoFromAudioPopup onConfirm={config => void handleVideoAudioConfirm(config)} onCancel={() => setShowVideoAudioPopup(false)} />
      )}
    </div>
  );
}
