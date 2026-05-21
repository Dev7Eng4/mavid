/**
 * Nhận danh sách scene specs → gọi promptCreateImagePromptsFromSceneSpecs theo batch,
 * lưu JSON manifest vào cùng thư mục với file scene-specs / srt.
 *
 * Dùng:
 *   node contents/makeVideoSlide/createPromptImageForScene.js
 *   node contents/makeVideoSlide/createPromptImageForScene.js path/to/file.ja.scene-specs.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../constants/paths.js';
import { openChatPage, sendPromptWithRetry } from '../llm/browser.util.js';
import { stripJsonCodeFence, validateJsonResponse } from '../llm/text.util.js';
import openChromeProfile from '../scripts/makeChromeProfile.js';
import { sceneSpecsManifestPath, srtPathFromBeatsManifest } from './createScenesFromBeat.js';
import { saveJsonFile } from './createVisualBeat.js';
import { promptCreateImagePromptsFromSceneSpecs } from './prompts.js';

const SCENES_BATCH_SIZE = 25;

/** @param {string} srtPath */
export function imagePromptsManifestPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.image-prompts.json`);
}

/**
 * @param {string} srtPath
 * @param {number} segmentIndex — 1-based
 */
export function imagePromptsSegmentPath(srtPath, segmentIndex) {
  const base = path.basename(srtPath, path.extname(srtPath));
  const n = String(segmentIndex).padStart(3, '0');
  return path.join(path.dirname(srtPath), `${base}.image-prompts-seg${n}.json`);
}

/**
 * @param {string} manifestPath — *.scene-specs.json hoặc *.image-prompts.json
 * @returns {string} srtPath dùng để đặt tên output (.image-prompts*)
 */
export function srtPathFromSceneManifest(manifestPath) {
  const resolved = path.resolve(manifestPath);
  const base = path.basename(resolved);
  const m = base.match(/^(.+)\.scene-specs\.json$/);
  if (m) {
    return path.join(path.dirname(resolved), `${m[1]}.srt`);
  }
  const m2 = base.match(/^(.+)\.image-prompts\.json$/);
  if (m2) {
    return path.join(path.dirname(resolved), `${m2[1]}.srt`);
  }
  return srtPathFromBeatsManifest(manifestPath);
}

/**
 * @param {string} filePath
 * @returns {Record<string, unknown>[]}
 */
export function loadScenesFromFile(filePath) {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.scenes)) {
    return parsed.scenes;
  }
  throw new Error(`loadScenesFromFile: không tìm thấy mảng scenes — ${filePath}`);
}

/**
 * @param {Record<string, unknown>[]} scenes
 * @param {{ batchSize?: number }} [options]
 */
export function createSceneBatches(scenes, options = {}) {
  const batchSize = options.batchSize ?? SCENES_BATCH_SIZE;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('createSceneBatches: scenes rỗng');
  }

  /** @type {Array<{ batchIndex: number, startSceneId: string, endSceneId: string, scenes: Record<string, unknown>[] }>} */
  const batches = [];

  for (let start = 0; start < scenes.length; start += batchSize) {
    const slice = scenes.slice(start, start + batchSize);
    const first = /** @type {{ scene_id?: string }} */ (slice[0]);
    const last = /** @type {{ scene_id?: string }} */ (slice[slice.length - 1]);

    batches.push({
      batchIndex: batches.length + 1,
      startSceneId: String(first?.scene_id ?? ''),
      endSceneId: String(last?.scene_id ?? ''),
      scenes: slice,
    });
  }

  return batches;
}

/**
 * @param {Record<string, unknown>[]} scenes
 */
export function buildImagePromptsPrompt(scenes) {
  return promptCreateImagePromptsFromSceneSpecs(JSON.stringify({ scenes }, null, 2));
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parseImagePromptsResponse(raw) {
  const cleaned = stripJsonCodeFence(raw);
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.image_prompts)) {
    throw new Error('parseImagePromptsResponse: JSON thiếu mảng "image_prompts"');
  }
  return parsed;
}

function defaultLlmProfile() {
  const fromEnv = process.env.LLM_TEST_PROFILE || process.env.GEMINI_TEST_PROFILE || process.env.GPT_TEST_PROFILE;
  const n = Number(fromEnv);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * @param {Record<string, unknown>[]} scenes
 * @param {object} [options]
 * @param {string} [options.srtPath] — đường dẫn .srt (hoặc base tương đương) để đặt tên file output
 * @param {number} [options.profile]
 * @param {boolean} [options.visible]
 * @param {boolean} [options.thinkingMode]
 * @param {number} [options.batchSize]
 * @param {(info: { batchIndex: number, total: number }) => void} [options.onBatchStart]
 */
export async function createImagePromptsFromScenes(scenes, options = {}) {
  const {
    srtPath = PATHS.DOWNLOADS,
    profile = defaultLlmProfile(),
    visible = true,
    thinkingMode = false,
    batchSize = SCENES_BATCH_SIZE,
    onBatchStart,
  } = options;

  // const batches = createSceneBatches(scenes, { batchSize });
  const outputDir = path.dirname(path.resolve(srtPath));

  /** @type {Record<string, unknown>[]} */
  const allImagePrompts = [];

  const { context, page } = await openChromeProfile({ profile, visible });

  try {
    await openChatPage(page, { thinkingMode });

    for (const scene of scenes) {
      // onBatchStart?.({ batchIndex: batch.batchIndex, total: batches.length });

      const prompt = buildImagePromptsPrompt(scene);
      const raw = await sendPromptWithRetry(page, prompt, {
        requireCodeBlock: false,
        validate: validateJsonResponse,
        maxRetries: 2,
        retryDelayMs: 3000,
        label: `[image-prompts] scene ${scene.scene_id}`,
      });

      const payload = parseImagePromptsResponse(raw);

      // const record = {
      //   batch_index: batch.batchIndex,
      //   scene_range: {
      //     start_scene_id: batch.startSceneId,
      //     end_scene_id: batch.endSceneId,
      //   },
      //   scenes: batch.scenes,
      //   image_prompts: payload.image_prompts,
      // };

      // const segmentPath = imagePromptsSegmentPath(srtPath, batch.batchIndex);
      // saveJsonFile(segmentPath, record);
      allImagePrompts.push(...payload.image_prompts);

      // console.log(`✅ scene ${scene.scene_id} → ${path.basename(segmentPath)} (${payload.image_prompts.length} prompts)`);
    }
  } finally {
    await context.close().catch(() => {});
  }

  const manifestPath = imagePromptsManifestPath(srtPath);
  saveJsonFile(manifestPath, allImagePrompts);

  return { manifestPath, imagePrompts: allImagePrompts, outputDir };
}

/**
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.srtPath]
 * @param {string} [options.sceneSpecsPath] — file .scene-specs.json
 * @param {Record<string, unknown>[]} [options.scenes] — scenes sẵn có, bỏ qua đọc file
 * @param {number} [options.profile]
 * @param {boolean} [options.visible]
 */
export async function createPromptImageForScene(options = {}) {
  const { downloadsDir = PATHS.DOWNLOADS, srtPath: argSrtPath, sceneSpecsPath, scenes: scenesArg, profile, visible } = options;

  let srtPath = argSrtPath ? path.resolve(argSrtPath) : null;
  let scenes = scenesArg;

  if (!scenes) {
    const specsFile = sceneSpecsPath ?? (srtPath ? sceneSpecsManifestPath(srtPath) : findLatestSceneSpecsManifest(downloadsDir));

    if (!fs.existsSync(specsFile)) {
      throw new Error(
        `createPromptImageForScene: không tìm thấy scene specs — ${specsFile}. Chạy createScenesFromBeat.js trước hoặc truyền options.scenes.`
      );
    }

    scenes = loadScenesFromFile(specsFile);
    if (!srtPath) {
      srtPath = srtPathFromSceneManifest(specsFile);
    }
  }

  if (!srtPath) {
    throw new Error('createPromptImageForScene: cần options.srtPath hoặc sceneSpecsPath để lưu output');
  }

  console.log(`🖼️ Scenes: ${scenes.length} → image prompts (${path.basename(srtPath)})`);

  const result = await createImagePromptsFromScenes(scenes, {
    srtPath,
    profile,
    visible,
    onBatchStart: ({ batchIndex, total }) => {
      console.log(`⏳ Đang xử lý batch ${batchIndex}/${total}...`);
    },
  });

  console.log(`📦 Manifest: ${result.manifestPath}`);
  return { srtPath, scenes, ...result };
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
function findLatestSceneSpecsManifest(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.scene-specs.json'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].name) : null;
}

export default async function main() {
  const argPath = process.argv[2];
  if (argPath?.endsWith('.scene-specs.json')) {
    const scenes = loadScenesFromFile(argPath);
    await createImagePromptsFromScenes(scenes, {
      srtPath: srtPathFromSceneManifest(argPath),
      onBatchStart: ({ batchIndex, total }) => {
        console.log(`⏳ batch ${batchIndex}/${total}...`);
      },
    });
    return;
  }
  await createPromptImageForScene(argPath ? { srtPath: argPath } : {});
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
