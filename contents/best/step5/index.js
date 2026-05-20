import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../../constants/paths.js';
import { PROFILES_LOGIN } from '../../constants/playwright-profile.js';
import { getResponseImage, inputPromptCreateImage, openFlow } from '../../flow/browser.util.js';
import openChromeProfile from '../../scripts/makeChromeProfile.js';
import { delay } from '../../utils/dom.util.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * Tìm file `.step4.json` mới nhất trong thư mục downloads.
 * @param {string} downloadsDir
 * @returns {string}
 */
export function findLatestStep4Json(downloadsDir = PATHS.DOWNLOADS) {
  const dir = path.resolve(downloadsDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`findLatestStep4Json: không tìm thấy thư mục ${dir}`);
  }

  const candidates = fs
    .readdirSync(dir)
    .filter(name => name.endsWith('.step4.json'))
    .map(name => {
      const fullPath = path.join(dir, name);
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (candidates.length === 0) {
    throw new Error(`findLatestStep4Json: không có file *.step4.json trong ${dir}`);
  }

  return candidates[0].fullPath;
}

/**
 * @param {string} [inputPath] — đường dẫn file `.step4.json` hoặc thư mục downloads
 * @param {string} [downloadsDir]
 */
export function resolveStep4JsonPath(inputPath, downloadsDir = PATHS.DOWNLOADS) {
  if (inputPath == null || String(inputPath).trim() === '') {
    return findLatestStep4Json(downloadsDir);
  }

  const resolved = path.resolve(String(inputPath).trim());
  if (!fs.existsSync(resolved)) {
    throw new Error(`resolveStep4JsonPath: không tìm thấy ${resolved}`);
  }

  if (fs.statSync(resolved).isFile()) {
    return resolved;
  }

  return findLatestStep4Json(resolved);
}

/**
 * @param {object} data — nội dung file step4.json
 * @returns {object[]}
 */
export function extractScenesFromStep4Data(data) {
  const merged = data?.final_scene_plan?.scenes;
  if (Array.isArray(merged) && merged.length > 0) {
    return merged;
  }

  const plans = data?.chapter_scene_plans;
  if (!Array.isArray(plans) || plans.length === 0) {
    throw new Error('extractScenesFromStep4Data: không có final_scene_plan.scenes hoặc chapter_scene_plans');
  }

  const scenes = [];
  const sortedPlans = [...plans].sort((a, b) => a.chapter_index - b.chapter_index);

  for (const plan of sortedPlans) {
    const sortedScenes = [...(plan.scenes ?? [])].sort((a, b) => a.scene_index_in_chapter - b.scene_index_in_chapter);
    scenes.push(...sortedScenes);
  }

  return scenes;
}

/**
 * Chuẩn hoá scene cho step5 (name + prompt dùng trong Flow).
 * @param {object[]} rawScenes
 */
export function toStep5Scenes(rawScenes) {
  return rawScenes.map(scene => ({
    // ...scene,
    name: scene.line_range.start_line_id + '-' + scene.line_range.end_line_id,
    prompt: scene.image_prompt ?? '',
  }));
}

/**
 * Đọc file step4.json trong downloads và trả về danh sách scenes.
 * @param {object} [options]
 * @param {string} [options.jsonPath] — file cụ thể hoặc thư mục downloads
 * @param {string} [options.downloadsDir]
 */
export function loadScenesFromDownloads(options = {}) {
  const { jsonPath: jsonPathInput, downloadsDir = PATHS.DOWNLOADS } = options;
  const jsonPath = resolveStep4JsonPath(jsonPathInput, downloadsDir);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const scenes = toStep5Scenes(extractScenesFromStep4Data(data));
  console.log('🚀 ~ loadScenesFromDownloads ~ scenes:', scenes);

  if (scenes.length === 0) {
    throw new Error(`loadScenesFromDownloads: không có scene nào trong ${jsonPath}`);
  }

  console.log(`✅ Đã load ${scenes.length} scenes từ ${jsonPath}`);
  return { jsonPath, scenes };
}

export async function main(scenes) {
  console.log('🚀 ~ main ~ scenes:', scenes);
  try {
    const maxProfiles = Math.min(PROFILES_LOGIN.length, scenes.length);

    const { context, page } = await openChromeProfile({ profile: 1, visible: true });

    const projectId = await openFlow(page);
    console.log('🚀 ~ main ~ projectId:', projectId);
    const dir = path.resolve(PATHS.DOWNLOADS);

    for (let i = 0; i < scenes.length; i++) {
      const { name, prompt } = scenes[i];

      if (i > 0) {
        await delay(1500);
      }

      console.log('🚀 ~ main ~ name:', name);
      await inputPromptCreateImage(page, prompt);
      getResponseImage({ page, projectId, folder: dir, exportName: name });
    }
  } catch (error) {
    console.error(error);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const inputArg = process.argv[2];
  const { scenes } = loadScenesFromDownloads({
    jsonPath: inputArg != null && String(inputArg).trim() !== '' ? String(inputArg).trim() : undefined,
  });
  main(scenes);
}
