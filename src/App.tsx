import { useState, useCallback, useEffect } from 'react';
import type { Page, ScriptId } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { PipelinePage } from './components/pages/PipelinePage';
import { CreateVideoPage } from './components/pages/CreateVideoPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { ChannelsPage } from './components/pages/ChannelsPage';
import { LogsPage } from './components/pages/LogsPage';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('pipeline');
  const [runningScript, setRunningScript] = useState<ScriptId | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = useCallback((line: string) => {
    setLogs(prev => [...prev, line]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    window.runner?.onScriptLog?.(appendLog);
    return () => {
      window.runner?.removeScriptLogListener?.();
    };
  }, [appendLog]);

  const stopRunningNpmJob = useCallback(async () => {
    try {
      const r = await window.runner?.cancelRunningJob?.();
      if (r?.ok) appendLog('[MaVid] Đã gửi lệnh dừng tiến trình (npm).');
      else appendLog('[MaVid] Không có tiến trình npm đang chạy để dừng.');
    } catch (e) {
      appendLog(`[MaVid] Lỗi khi dừng: ${e instanceof Error ? e.message : 'Không xác định'}`);
    }
    setRunningScript(null);
  }, [appendLog]);

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
            appendLog={appendLog}
            onNavigate={setActivePage}
          />
        )}
        {activePage === 'create-video' && (
          <CreateVideoPage
            key='create-video'
            disabled={runningScript !== null}
            runningScript={runningScript}
            setRunningScript={setRunningScript}
            appendLog={appendLog}
            onNavigate={setActivePage}
          />
        )}
        {activePage === 'settings' && <SettingsPage key='settings' disabled={runningScript !== null} />}
        {activePage === 'channels' && <ChannelsPage key='channels' />}
        {activePage === 'logs' && <LogsPage logs={logs} clearLogs={clearLogs} />}
      </main>
    </div>
  );
}
