import { useEffect, useMemo, useState } from 'react';
import type { ConstantsUiModel } from '@/types';
import {
  MAX_SCHEDULED_DAYS as FALLBACK_SCHEDULED,
  MAX_VIDEOS_PREPARE_AHEAD as FALLBACK_PREPARE,
} from '@contents/constants/rendererConstants.js';

/** Giới hạn video trong Settings; fallback defaults repo khi không có Electron. */
export function useResolvedVideoLimits() {
  const [scheduled, setScheduled] = useState(FALLBACK_SCHEDULED);
  const [prepareAhead, setPrepareAhead] = useState(FALLBACK_PREPARE);

  useEffect(() => {
    const load = window.runner?.getConstantsUiModel;
    if (typeof load !== 'function') return;
    let cancelled = false;
    void load().then((model: ConstantsUiModel) => {
      if (cancelled) return;
      const v = model.APP_SETTINGS?.VIDEO;
      if (!v) return;
      setScheduled(v.MAX_SCHEDULED_DAYS);
      setPrepareAhead(v.MAX_VIDEOS_PREPARE_AHEAD);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({ MAX_SCHEDULED_DAYS: scheduled, MAX_VIDEOS_PREPARE_AHEAD: prepareAhead }),
    [scheduled, prepareAhead]
  );
}
