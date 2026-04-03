import { useState } from 'react';
import type { Page, ScriptId, VideoFromAudioConfig } from '../../types';
import { scriptDefs } from '../../types';
import { ScriptCard } from '../pipeline/ScriptCard';
import { YouTubeLinkPopup } from '../pipeline/YouTubeLinkPopup';
import { VideoFromAudioPopup } from '../pipeline/VideoFromAudioPopup';
import type { ScriptStatus } from '../pipeline/ScriptCard';

const YOUTUBE_SCRIPT_ID: ScriptId = 'lay-thong-tin-youtube (video, channel)';
const VIDEO_FROM_AUDIO_SCRIPT_ID: ScriptId = 'tao-batch-video-tu-audio';

interface Props {
  runningScript: ScriptId | null;
  setRunningScript: (id: ScriptId | null) => void;
  appendLog: (line: string) => void;
  onNavigate: (page: Page) => void;
}

export function PipelinePage({ runningScript, setRunningScript, appendLog, onNavigate }: Props) {
  const [statuses, setStatuses] = useState<Record<string, ScriptStatus>>({});
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showVideoAudioPopup, setShowVideoAudioPopup] = useState(false);

  async function runScript(id: ScriptId, npmScript: string, extraEnv?: Record<string, string>) {
    if (runningScript) return;
    if (!window.runner?.runNpmScript) {
      appendLog('[MaVid] Runner chưa sẵn sàng. Hãy khởi động lại app.');
      return;
    }

    setRunningScript(id);
    setStatuses(prev => ({ ...prev, [id]: 'running' }));

    try {
      const res = await window.runner.runNpmScript(npmScript, extraEnv);
      if (res.code !== 0) throw new Error(`Exit code: ${res.code}`);
      setStatuses(prev => ({ ...prev, [id]: 'done' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      appendLog(`[MaVid] Lỗi: ${msg}`);
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
      const extraEnv: Record<string, string> = {
        MAVID_MODE: config.mode,
        MAVID_CHANNEL: config.channel,
        MAVID_BACKGROUND: config.background,
        MAVID_STOCK_COUNT: String(config.stockVideoCount),
        MAVID_AUDIO_SPEED: String(config.audioSpeed),
        MAVID_SHOW_LOGO: config.showLogo ? '1' : '0',
      };
      await runScript(def.id, def.npmScript, extraEnv);
    }
  }

  async function handleYouTubeConfirm(links: string) {
    setShowLinkPopup(false);
    try {
      await window.runner.writeInputFile(links);
    } catch (e) {
      appendLog(`[MaVid] Lỗi ghi input.txt: ${e instanceof Error ? e.message : 'unknown'}`);
      return;
    }
    const def = scriptDefs.find(s => s.id === YOUTUBE_SCRIPT_ID);
    if (def) {
      await runScript(def.id, def.npmScript);
      window.runner.writeInputFile('').catch(() => {});
    }
  }

  return (
    <div className='space-y-6'>
      {runningScript && (
        <div className='flex items-center justify-between'>
          <button
            onClick={() => onNavigate('logs')}
            className='rounded-lg px-3 py-2 text-xs font-medium'
            style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
          >
            Xem Logs
          </button>
        </div>
      )}

      {runningScript && (
        <div
          className='rounded-lg px-4 py-3 flex items-center gap-3 text-sm'
          style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
        >
          <span className='w-2 h-2 rounded-full animate-pulse shrink-0' style={{ background: 'var(--accent)' }} />
          <span style={{ color: 'var(--accent)' }}>
            Đang chạy: {scriptDefs.find(s => s.id === runningScript)?.title}
          </span>
        </div>
      )}

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
        {scriptDefs.map(s => (
          <ScriptCard
            key={s.id}
            script={s}
            status={s.id === runningScript ? 'running' : statuses[s.id] ?? 'idle'}
            disabled={runningScript !== null}
            onRun={() => handleClickRun(s.id, s.npmScript)}
          />
        ))}
      </div>

      {showLinkPopup && (
        <YouTubeLinkPopup
          onConfirm={links => void handleYouTubeConfirm(links)}
          onCancel={() => setShowLinkPopup(false)}
        />
      )}

      {showVideoAudioPopup && (
        <VideoFromAudioPopup
          onConfirm={config => void handleVideoAudioConfirm(config)}
          onCancel={() => setShowVideoAudioPopup(false)}
        />
      )}
    </div>
  );
}
