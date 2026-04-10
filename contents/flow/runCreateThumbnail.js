/**
 * API cao cấp: tạo thumbnail qua Flow (gọi sau khi có prompt).
 */
import path from 'path';
import fs from 'fs';
import { flowSettings } from '../constants/index.js';
import { generateImageWithFlow } from './browser.util.js';

/**
 * @param {object} opts
 * @param {string} opts.prompt — prompt đầy đủ gửi Flow
 * @param {string} opts.pathSave — thư mục gốc (ảnh lưu `pathSave/{exportName}.jpg`)
 * @param {string} [opts.exportName='flow-thumbnail']
 * @param {object} [opts.flowExtraSettings] — merge vào flowSettings
 * @param {boolean} [opts.isNeedImage]
 */
export async function runCreateThumbnailFlow({
  prompt,
  pathSave,
  exportName = 'flow-thumbnail',
  flowExtraSettings = {},
  isNeedImage = false,
}) {
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
