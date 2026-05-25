/**
 * Tạo ảnh hàng loạt trên Flow (MaVid tool) từ danh sách prompt.
 *
 * Dùng:
 *   node contents/makeVideoSlide/generateImageForScenes.js path/to/image-prompts.json [pathSave]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../../../constants/paths.js';
import { createBatchMedia } from '../../../flow/createMediaWithTool.js';
import { imagePromptsManifestPath } from './createPromptImageForScene.js';

/**
 * @param {Array<{ name?: string, prompt?: string }>} prompts
 * @returns {Array<{ name: string, prompt: string }>}
 */
export function normalizeFlowPrompts(prompts) {
  if (!Array.isArray(prompts) || prompts.length === 0) {
    throw new Error('normalizeFlowPrompts: prompts phải là mảng không rỗng');
  }

  return prompts.map((item, index) => {
    const name = String(item?.name ?? '').trim();
    const prompt = String(item?.prompt ?? '').trim();
    if (!name || !prompt) {
      throw new Error(`normalizeFlowPrompts: prompts[${index}] thiếu name hoặc prompt`);
    }
    return { name, prompt };
  });
}

/**
 * Đặt tên file export từ một mục image-prompts (scene_id hoặc source_line_ids).
 * @param {Record<string, unknown>} item
 */
export function exportNameFromImagePrompt(item) {
  const ids = item.source_line_ids;
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.length === 1 ? String(ids[0]) : `${ids[0]}-${ids[ids.length - 1]}`;
  }
  const sceneId = item.scene_id;
  if (sceneId != null && String(sceneId).trim() !== '') {
    return String(sceneId).trim();
  }
  throw new Error('exportNameFromImagePrompt: thiếu source_line_ids và scene_id');
}

/**
 * Chuyển manifest image-prompts → định dạng Flow `{ name, prompt }`.
 * @param {Record<string, unknown>[]} imagePrompts
 */
export function imagePromptsToFlowPrompts(imagePrompts) {
  if (!Array.isArray(imagePrompts) || imagePrompts.length === 0) {
    throw new Error('imagePromptsToFlowPrompts: mảng image prompts rỗng');
  }

  return imagePrompts.map((item, index) => {
    const prompt = String(item?.prompt_text ?? '').trim();
    if (!prompt) {
      throw new Error(`imagePromptsToFlowPrompts: image_prompts[${index}] thiếu prompt_text`);
    }
    return {
      name: exportNameFromImagePrompt(item),
      prompt,
    };
  });
}

/**
 * @param {string} manifestPath — *.image-prompts.json hoặc mảng JSON tương đương
 * @returns {Record<string, unknown>[]}
 */
export function loadImagePromptsFromFile(manifestPath) {
  const resolved = path.resolve(manifestPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.image_prompts)) {
    return parsed.image_prompts;
  }
  throw new Error(`loadImagePromptsFromFile: không tìm thấy mảng image prompts — ${resolved}`);
}

/**
 * Tạo ảnh batch qua Flow MaVid tool.
 * @param {Array<{ name: string, prompt: string }>} prompts
 * @param {string} pathSave — thư mục lưu `{name}.jpg`
 * @returns {Promise<{ saved: Array<{ exportName: string, path: string }>, failed: Array<{ exportName: string, reason: string }>, total: number, downloaded: number, errors: number }>}
 */
export async function generateImageForScenes(prompts, pathSave) {
  const normalized = normalizeFlowPrompts(prompts);
  const folder = path.resolve(String(pathSave ?? PATHS.DOWNLOADS));

  console.log(`🖼️ Flow batch: ${normalized.length} ảnh → ${folder}`);
  return createBatchMedia({ prompts: { visuals: normalized }, pathSave: folder });
}

/**
 * Đọc file image-prompts rồi gọi Flow batch.
 * @param {object} [options]
 * @param {string} [options.manifestPath] — *.image-prompts.json
 * @param {string} [options.srtPath] — suy ra manifest qua imagePromptsManifestPath
 * @param {string} [options.pathSave] — thư mục lưu ảnh (mặc định: cùng thư mục manifest)
 */
export async function generateImagesFromImagePromptsManifest(options = {}) {
  const { manifestPath: argManifest, srtPath: argSrtPath, pathSave: argPathSave } = options;

  let manifestPath = argManifest ? path.resolve(argManifest) : null;
  if (!manifestPath && argSrtPath) {
    manifestPath = imagePromptsManifestPath(path.resolve(argSrtPath));
  }
  if (!manifestPath) {
    throw new Error('generateImagesFromImagePromptsManifest: cần options.manifestPath hoặc options.srtPath');
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`generateImagesFromImagePromptsManifest: không tìm thấy ${manifestPath}`);
  }

  const imagePrompts = loadImagePromptsFromFile(manifestPath);
  const flowPrompts = imagePromptsToFlowPrompts(imagePrompts);
  const pathSave = argPathSave ?? path.dirname(manifestPath);

  console.log(`📂 Manifest: ${manifestPath}`);
  const result = await generateImageForScenes(flowPrompts, pathSave);
  return { manifestPath, pathSave, prompts: flowPrompts, ...result };
}

export default async function main() {
  const manifestOrSrt = process.argv[2];
  const pathSaveArg = process.argv[3];

  if (!manifestOrSrt) {
    throw new Error('Usage: node generateImageForScenes.js <image-prompts.json|srtPath> [pathSave]');
  }

  const resolved = path.resolve(manifestOrSrt);
  if (resolved.endsWith('.image-prompts.json') || resolved.endsWith('.json')) {
    await generateImagesFromImagePromptsManifest({
      manifestPath: resolved,
      pathSave: pathSaveArg,
    });
    return;
  }

  await generateImagesFromImagePromptsManifest({
    srtPath: resolved,
    pathSave: pathSaveArg ?? path.dirname(imagePromptsManifestPath(resolved)),
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
