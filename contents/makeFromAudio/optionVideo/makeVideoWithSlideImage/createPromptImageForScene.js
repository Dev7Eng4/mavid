/**
 * Nhận danh sách scene specs → gọi promptCreateImagePromptsFromSceneSpecs từng scene,
 * chạy song song trên nhiều Chrome profile (profile xong scene nào thì lấy scene tiếp theo),
 * lưu JSON segment + manifest vào cùng thư mục với file scene-specs / srt.
 *
 * Dùng:
 *   node contents/makeVideoSlide/createPromptImageForScene.js
 *   node contents/makeVideoSlide/createPromptImageForScene.js path/to/file.ja.scene-specs.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../../../constants/paths.js';
import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { openChatPage, sendPromptWithRetry } from '../../../llm/browser.util.js';
import { stripJsonCodeFence, validateJsonResponse } from '../../../llm/text.util.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';
import { sceneSpecsManifestPath, srtPathFromBeatsManifest } from './createScenesFromBeat.js';
import { saveJsonFile } from './createVisualBeat.js';
import { promptCreateImagePromptsFromSceneSpecs } from './prompts.js';

const IMAGE_PROMPTS_MAX_PROFILES = 5;

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

/**
 * @param {Record<string, unknown>[]} scenes
 * @param {object} [options]
 * @param {string} [options.srtPath] — đường dẫn .srt (hoặc base tương đương) để đặt tên file output
 * @param {boolean} [options.visible]
 * @param {boolean} [options.thinkingMode]
 * @param {number} [options.maxProfiles] — số Chrome profile chạy song song (mặc định 5)
 * @param {(info: { sceneIndex: number, sceneId: string, total: number }) => void} [options.onSceneStart]
 */
export async function createImagePromptsFromScenes(scenes, options = {}) {
  const {
    srtPath = PATHS.DOWNLOADS,
    visible = true,
    thinkingMode = false,
    maxProfiles = IMAGE_PROMPTS_MAX_PROFILES,
    onSceneStart,
  } = options;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('createImagePromptsFromScenes: scenes rỗng');
  }

  const outputDir = path.dirname(path.resolve(srtPath));
  const totalScenes = scenes.length;

  /** @type {(Record<string, unknown>[] | null)[]} */
  const scenePromptsResults = new Array(totalScenes).fill(null);

  const imagePromptProfiles = PLAYWRIGHT_PROFILES.slice(0, maxProfiles);
  let nextSceneIndex = 0;
  const activeConcurrency = Math.min(imagePromptProfiles.length, totalScenes);

  async function workerProfile(workerIndex) {
    const profileNum = imagePromptProfiles[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum, visible });
      ctx = opened.context;
      const pg = opened.page;
      let primingDone = false;

      while (true) {
        const i = nextSceneIndex++;
        if (i >= totalScenes) break;

        const scene = scenes[i];
        const sceneId = String(/** @type {{ scene_id?: string }} */ (scene)?.scene_id ?? '');
        const sceneNum = i + 1;
        onSceneStart?.({ sceneIndex: sceneNum, sceneId, total: totalScenes });

        try {
          if (!primingDone) {
            await openChatPage(pg, { thinkingMode });
            primingDone = true;
          }

          const prompt = buildImagePromptsPrompt([scene]);
          const raw = await sendPromptWithRetry(pg, prompt, {
            validate: validateJsonResponse,
            label: `[image-prompts] scene ${sceneNum}/${totalScenes} ${sceneId} (profile ${profileNum})`,
          });

          const payload = parseImagePromptsResponse(raw);
          const imagePrompts = payload.image_prompts;

          const segmentPath = imagePromptsSegmentPath(srtPath, sceneNum);
          // saveJsonFile(segmentPath, {
          //   scene_index: sceneNum,
          //   scene_id: sceneId,
          //   image_prompts: imagePrompts,
          // });

          scenePromptsResults[i] = imagePrompts;
          console.log(
            `✅ scene ${sceneNum}/${totalScenes} ${sceneId} → ${path.basename(segmentPath)} (${
              imagePrompts.length
            } prompts, profile ${profileNum})`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[image-prompts] scene ${sceneNum}/${totalScenes} ${sceneId} lỗi profile ${profileNum}: ${msg}`);
          scenePromptsResults[i] = null;
        }

        if (nextSceneIndex < totalScenes) {
          await pg.waitForTimeout(1000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));

  const failedCount = scenePromptsResults.filter(r => r === null).length;
  if (failedCount > 0) {
    throw new Error(`createImagePromptsFromScenes: ${failedCount}/${totalScenes} scene thất bại`);
  }

  /** @type {Record<string, unknown>[]} */
  const allImagePrompts = [];
  for (const prompts of scenePromptsResults) {
    allImagePrompts.push(.../** @type {Record<string, unknown>[]} */ (prompts));
  }

  const manifestPath = imagePromptsManifestPath(srtPath);
  // saveJsonFile(manifestPath, allImagePrompts);

  return {
    manifestPath,
    imagePrompts: allImagePrompts.map(p => ({
      name:
        p.source_line_ids.length === 1
          ? `${p.source_line_ids[0]}`
          : `${p.source_line_ids[0]}-${p.source_line_ids[p.source_line_ids.length - 1]}`,
      prompt: p.prompt_text,
    })),
    outputDir,
  };
}

/**
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.srtPath]
 * @param {string} [options.sceneSpecsPath] — file .scene-specs.json
 * @param {Record<string, unknown>[]} [options.scenes] — scenes sẵn có, bỏ qua đọc file
 * @param {boolean} [options.visible]
 * @param {number} [options.maxProfiles]
 */
export async function createPromptImageForScene(options = {}) {
  const { downloadsDir = PATHS.DOWNLOADS, srtPath: argSrtPath, sceneSpecsPath, scenes: scenesArg, visible, maxProfiles } = options;

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
    visible,
    maxProfiles,
    onSceneStart: ({ sceneIndex, sceneId, total }) => {
      console.log(`⏳ Đang xử lý scene ${sceneIndex}/${total} (${sceneId})...`);
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
      onSceneStart: ({ sceneIndex, sceneId, total }) => {
        console.log(`⏳ scene ${sceneIndex}/${total} (${sceneId})...`);
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
