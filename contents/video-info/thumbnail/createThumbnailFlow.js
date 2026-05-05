/**
 * Entry `run-script` (Electron): default export nhận `params` giống `runCreateThumbnailFlow`.
 * Không chạy CLI khi import — CLI dùng `createThumbnailFlow.cli.js`.
 */
import { runCreateThumbnailFlow } from './runCreateThumbnailFlow.js';

export { runCreateThumbnailFlow } from './runCreateThumbnailFlow.js';

/**
 * @param {Record<string, unknown>} params
 */
export default async function createThumbnailFlowMain(params = {}) {
  const prompt = typeof params.prompt === 'string' ? params.prompt : '';
  const pathSave = typeof params.pathSave === 'string' ? params.pathSave : '';
  await runCreateThumbnailFlow({
    prompt,
    pathSave,
    exportName: typeof params.exportName === 'string' ? params.exportName : 'flow-thumbnail',
    flowExtraSettings: params.flowExtraSettings && typeof params.flowExtraSettings === 'object' ? params.flowExtraSettings : {},
    isNeedImage: Boolean(params.isNeedImage),
  });
  return { ok: true };
}

