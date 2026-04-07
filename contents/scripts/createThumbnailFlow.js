/**
 * Tạo thumbnail qua Google Flow (Playwright + flow.util).
 *
 * CLI:
 *   npm run tao-thumbnail-flow -- [thư_mục_lưu] [tên_file_không_đuôi]
 *
 * Từ code: `import { runCreateThumbnailFlow } from './scripts/createThumbnailFlow.js'`
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { flowSettings } from '../constants/index.js';
import { generateImageWithFlow } from '../utils/flow.util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

/**
 * @param {object} opts
 * @param {string} opts.prompt — prompt đầy đủ gửi Flow
 * @param {string} opts.pathSave — thư mục gốc (ảnh lưu `pathSave/{exportName}.jpg`)
 * @param {string} [opts.exportName='flow-thumbnail']
 * @param {object} [opts.flowExtraSettings] — merge vào flowSettings
 */
export async function runCreateThumbnailFlow({ prompt, pathSave, exportName = 'flow-thumbnail', flowExtraSettings = {}, isNeedImage = false }) {
  if (!prompt || typeof prompt !== 'string' || !String(prompt).trim()) {
    throw new Error('runCreateThumbnailFlow: thiếu prompt hợp lệ');
  }
  if (!pathSave || typeof pathSave !== 'string') {
    throw new Error('runCreateThumbnailFlow: thiếu pathSave');
  }
  const abs = path.resolve(pathSave);
  fs.mkdirSync(abs, { recursive: true });
  await generateImageWithFlow(prompt, abs, exportName, { ...flowSettings, ...flowExtraSettings }, isNeedImage);
}

async function cliMain() {
  const argv = process.argv.slice(2);
  const pathSave = path.resolve(argv[0] || path.join(ROOT, 'downloads'));
  const exportName = argv[1] || 'image-created-by-flow';
  const { createPromptReCreateThumbnail } = await import('../promts/ja/createImage.js');
  await runCreateThumbnailFlow({
    prompt: createPromptReCreateThumbnail(),
    pathSave,
    exportName,
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  cliMain().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
