import { useState, useCallback, useEffect } from 'react';
import type { Page, ScriptId } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { PipelinePage } from './components/pages/PipelinePage';
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

  return (
    <div className='flex min-h-screen'>
      <Sidebar activePage={activePage} onNavigate={setActivePage} isRunning={runningScript !== null} />
      <main className='ml-56 flex-1 min-h-screen overflow-auto p-4'>
        {activePage === 'pipeline' && (
          <PipelinePage
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
