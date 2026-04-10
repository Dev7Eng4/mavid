import { useState, useCallback, useEffect } from 'react';
import type { Page, ScriptId } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { PipelinePage } from '@/pages/PipelinePage';
import CreateVideoPage from '@/pages/create-video';
import { SettingsPage } from '@/pages/SettingsPage';
import ChannelsPage from '@/pages/channels';
import { GpmPage } from '@/pages/GpmPage';
import { LogsPage } from '@/pages/LogsPage';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('pipeline');
  const [runningScript, setRunningScript] = useState<ScriptId | null>(null);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const appendErrorLog = useCallback(async (line: string) => {
    try {
      await window.runner?.appendPersistedErrorLog?.(line);
    } catch {
      /* ignore */
    }
    setErrorLogs(prev => [...prev, line]);
  }, []);

  const clearErrorLogs = useCallback(async () => {
    try {
      await window.runner?.clearPersistedErrorLogs?.();
    } catch {
      /* ignore */
    }
    setErrorLogs([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await window.runner?.getPersistedErrorLogs?.();
        if (!cancelled) setErrorLogs(Array.isArray(r?.lines) ? r.lines : []);
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        window.runner?.onScriptErrorLog?.(line => {
          setErrorLogs(prev => [...prev, line]);
        });
      }
    })();
    return () => {
      cancelled = true;
      window.runner?.removeScriptErrorLogListener?.();
    };
  }, []);

  const stopRunningNpmJob = useCallback(async () => {
    try {
      await window.runner?.cancelRunningJob?.();
    } catch (e) {
      appendErrorLog(`[MaVid] Lỗi khi dừng: ${e instanceof Error ? e.message : 'Không xác định'}`);
    }
    setRunningScript(null);
  }, [appendErrorLog]);

  return (
    <div className='flex min-h-screen'>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isRunning={runningScript !== null}
        onStopRunningJob={runningScript !== null ? () => void stopRunningNpmJob() : undefined}
      />
      <main className='ml-56 flex-1 min-h-screen min-w-0 w-full overflow-auto p-4'>
        {activePage === 'pipeline' && (
          <PipelinePage
            runningScript={runningScript}
            setRunningScript={setRunningScript}
            appendErrorLog={appendErrorLog}
            onNavigate={setActivePage}
          />
        )}
        {activePage === 'create-video' && (
          <CreateVideoPage
            key='create-video'
            disabled={runningScript !== null}
            runningScript={runningScript}
            setRunningScript={setRunningScript}
            appendErrorLog={appendErrorLog}
            onNavigate={setActivePage}
          />
        )}
        {activePage === 'settings' && <SettingsPage key='settings' disabled={runningScript !== null} />}
        {activePage === 'channels' && <ChannelsPage key='channels' />}
        {activePage === 'gpm' && <GpmPage key='gpm' />}
        {activePage === 'logs' && <LogsPage errorLogs={errorLogs} clearErrorLogs={clearErrorLogs} />}
      </main>
    </div>
  );
}
