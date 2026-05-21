import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadScenesFromDownloads } from '../best/step5/index.js';
import { loadScenesFromFile } from '../makeVideoSlide/createPromptImageForScene.js';
import { PATHS } from '../constants/paths.js';
import { flowSettings } from '../constants/index.js';
import { FLOW_SETTINGS } from '../constant/index.js';
import { delay } from '../utils/dom.util.js';
import { getResponseImages, openFlowPage } from './browser.util.js';
import { resolveFlowChromeProfile } from './chromeProfile.util.js';
import { openMyTool, startCreate } from './createMediaWithTool.js';

const __filename = fileURLToPath(import.meta.url);

const SCENE_JSON_SUFFIXES = ['.scene-specs.json', '.step4.json', '.image-prompts.json'];

/**
 * File JSON mới nhất trong downloads có chứa scenes.
 * @param {string} downloadsDir
 * @param {string[]} [suffixes]
 */
export function findLatestSceneJson(downloadsDir = PATHS.DOWNLOADS, suffixes = SCENE_JSON_SUFFIXES) {
  const dir = path.resolve(downloadsDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`findLatestSceneJson: không tìm thấy thư mục ${dir}`);
  }

  const candidates = fs
    .readdirSync(dir)
    .flatMap(name =>
      suffixes
        .filter(suf => name.endsWith(suf))
        .map(suf => ({
          fullPath: path.join(dir, name),
          mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs,
          suffix: suf,
        })),
    )
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (candidates.length === 0) {
    throw new Error(`findLatestSceneJson: không có file ${suffixes.join(' | ')} trong ${dir}`);
  }

  return candidates[0];
}

/**
 * Đọc mảng scenes từ file JSON (hoặc file mới nhất trong downloads).
 * @param {object} [options]
 * @param {string} [options.jsonPath] — đường dẫn file hoặc thư mục downloads
 * @param {string} [options.downloadsDir]
 */
export function loadScenesForFlowDemo(options = {}) {
  const { jsonPath: input, downloadsDir = PATHS.DOWNLOADS } = options;

  if (input != null && String(input).trim() !== '') {
    const resolved = path.resolve(String(input).trim());
    if (!fs.existsSync(resolved)) {
      throw new Error(`loadScenesForFlowDemo: không tìm thấy ${resolved}`);
    }
    if (fs.statSync(resolved).isDirectory()) {
      const latest = findLatestSceneJson(resolved);
      return loadScenesFromResolvedJson(latest.fullPath, latest.suffix);
    }
    return loadScenesFromResolvedJson(resolved);
  }

  const latest = findLatestSceneJson(downloadsDir);
  return loadScenesFromResolvedJson(latest.fullPath, latest.suffix);
}

/**
 * @param {string} jsonPath
 * @param {string} [suffixHint]
 */
function loadScenesFromResolvedJson(jsonPath, suffixHint) {
  const suffix = suffixHint ?? SCENE_JSON_SUFFIXES.find(s => jsonPath.endsWith(s)) ?? '';

  if (suffix === '.step4.json') {
    return loadScenesFromDownloads({ jsonPath, downloadsDir: path.dirname(jsonPath) });
  }

  const scenes = loadScenesFromFile(jsonPath);
  if (scenes.length === 0) {
    throw new Error(`loadScenesForFlowDemo: không có scene trong ${jsonPath}`);
  }

  console.log(`✅ Đã load ${scenes.length} scenes từ ${jsonPath}`);
  return { jsonPath, scenes };
}

/**
 * Demo Flow: mở Playwright → project Flow → My tools → duyệt danh sách scenes từ JSON downloads.
 * @param {object} [options]
 * @param {string} [options.jsonPath]
 * @param {string} [options.downloadsDir]
 * @param {number} [options.profile] — chrome profile (override flowSettings)
 */
export async function demo(options = {}) {
  const { jsonPath, downloadsDir, profile: profileOverride } = options;

  // const { jsonPath: resolvedJson, scenes } = loadScenesForFlowDemo({ jsonPath, downloadsDir });
  // console.log(`📂 JSON: ${resolvedJson}`);
  // console.log(`🎬 Scenes: ${scenes.length}`);

  const cfg = flowSettings;
  const chromeProfile = profileOverride ?? resolveFlowChromeProfile(cfg);
  const projectId = '8eaafcb3-3541-4870-9302-cf1215f5ecb9';

  if (!projectId) {
    throw new Error('demo: thiếu FLOW_PROJECT_ID trong flowSettings / FLOW_SETTINGS');
  }

  const { context, page } = await openFlowPage({ profile: chromeProfile, projectId });

  try {
    // const convertedScenesPrompts = scenes.map(s => ({
    //   name: `${s.source_line_ids[0]}-${s.source_line_ids[s.source_line_ids.length - 1]}`,
    //   prompt: s.image_prompt,
    // }));

    await openMyTool(page);

    const prompts = [
      { name: 'demo-1', prompt: 'a beautiful girl' },
      { name: 'demo-2', prompt: 'a sunset over the ocean' },
      { name: 'nude-asia', prompt: 'Một người phụ nữ đang làm tình với người đàn ông trẻ' },
      { name: 'demo-3', prompt: 'a cityscape at night' },
      { name: 'demo-4', prompt: 'a forest with a river' },
      { name: 'demo-5', prompt: 'a mountain landscape' },
      { name: 'nude', prompt: 'cô gái việt nam bikini' },
    ];

    const result = await getResponseImages({
      page,
      projectId,
      folder: PATHS.DOWNLOADS,
      prompts,
      trigger: () => startCreate(page, prompts),
    });

    console.log(`✅ Demo xong — ${result.downloaded} thành công, ${result.errors} lỗi / ${result.total} tổng`);
    if (result.saved.length) {
      console.log(
        '   Ảnh đã lưu:',
        result.saved.map(s => s.path),
      );
    }
    if (result.failed.length) {
      console.log(
        '   Ảnh lỗi:',
        result.failed.map(f => `${f.exportName}: ${f.reason}`),
      );
    }
  } finally {
    console.log('🔒 Đang đóng browser...');
    await delay(1500, 500);
    await context.close();
  }

  return {};
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const arg = process.argv[2];
  demo({
    jsonPath: arg != null && String(arg).trim() !== '' ? String(arg).trim() : undefined,
  }).catch(err => {
    console.error('❌', err.message || err);
    process.exit(1);
  });
}
