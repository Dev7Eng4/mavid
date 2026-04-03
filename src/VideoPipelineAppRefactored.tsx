import { useMemo, useState } from 'react';

import { ConstantsSettingsTab } from './components/ConstantsSettingsTab';
import { PipelineTab } from './components/PipelineTab';
import { scriptDefs } from './components/videoPipelineData';
import type { TabKey } from './components/TabSwitcher';

export default function VideoPipelineAppRefactored() {
  const [tab, setTab] = useState<TabKey>('pipeline');
  const [selectedId, setSelectedId] = useState<string>(scriptDefs[1].id);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Sẵn sàng.');

  const selected = useMemo(() => scriptDefs.find(s => s.id === selectedId) || scriptDefs[0], [selectedId]);
  const canRun = runningId === null;

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

  return tab === 'pipeline' ? (
    <PipelineTab
      tab={tab}
      setTab={setTab}
      scriptDefs={scriptDefs}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      runningId={runningId}
      status={status}
      canRun={canRun}
      runSelected={() => void runSelected()}
    />
  ) : (
    <ConstantsSettingsTab tab={tab} setTab={setTab} />
  );
}

