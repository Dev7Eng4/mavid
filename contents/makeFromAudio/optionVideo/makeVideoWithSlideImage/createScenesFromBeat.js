/**
 * Nhận danh sách visual beats → gọi promptCreateSceneSpecsFromBeats theo batch,
 * lưu JSON segment + manifest vào cùng thư mục với file visual-beats / srt.
 *
 * Dùng:
 *   node contents/makeVideoSlide/createScenesFromBeat.js
 *   node contents/makeVideoSlide/createScenesFromBeat.js path/to/file.ja.visual-beats.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../../../constants/paths.js';
import { openChatPage, sendPromptWithRetry } from '../../../llm/browser.util.js';
import { stripJsonCodeFence, validateJsonResponse } from '../../../llm/text.util.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';
import { saveJsonFile, visualBeatsManifestPath } from './createVisualBeat.js';
import { promptCreateSceneSpecsFromBeats } from './prompts.js';

const BEATS_BATCH_SIZE = 25;

/** @param {string} srtPath */
export function sceneSpecsManifestPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.scene-specs.json`);
}

/**
 * @param {string} srtPath
 * @param {number} segmentIndex — 1-based
 */
export function sceneSpecsSegmentPath(srtPath, segmentIndex) {
  const base = path.basename(srtPath, path.extname(srtPath));
  const n = String(segmentIndex).padStart(3, '0');
  return path.join(path.dirname(srtPath), `${base}.scene-specs-seg${n}.json`);
}

/**
 * @param {string} manifestPath — *.visual-beats.json hoặc *.scene-specs.json
 * @returns {string} srtPath dùng để đặt tên output (.scene-specs*)
 */
export function srtPathFromBeatsManifest(manifestPath) {
  const resolved = path.resolve(manifestPath);
  const base = path.basename(resolved);
  const m = base.match(/^(.+)\.visual-beats\.json$/);
  if (m) {
    return path.join(path.dirname(resolved), `${m[1]}.srt`);
  }
  const m2 = base.match(/^(.+)\.scene-specs\.json$/);
  if (m2) {
    return path.join(path.dirname(resolved), `${m2[1]}.srt`);
  }
  return resolved.replace(/\.(visual-beats|scene-specs)\.json$/i, '.srt');
}

/**
 * @param {string} filePath
 * @returns {Record<string, unknown>[]}
 */
export function loadBeatsFromFile(filePath) {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.beats)) {
    return parsed.beats;
  }
  throw new Error(`loadBeatsFromFile: không tìm thấy mảng beats — ${filePath}`);
}

/**
 * @param {Record<string, unknown>[]} beats
 * @param {{ batchSize?: number }} [options]
 */
export function createBeatBatches(beats, options = {}) {
  const batchSize = options.batchSize ?? BEATS_BATCH_SIZE;

  if (!Array.isArray(beats) || beats.length === 0) {
    throw new Error('createBeatBatches: beats rỗng');
  }

  /** @type {Array<{ batchIndex: number, startBeatId: string, endBeatId: string, beats: Record<string, unknown>[] }>} */
  const batches = [];

  for (let start = 0; start < beats.length; start += batchSize) {
    const slice = beats.slice(start, start + batchSize);
    const first = /** @type {{ beat_id?: string }} */ (slice[0]);
    const last = /** @type {{ beat_id?: string }} */ (slice[slice.length - 1]);

    batches.push({
      batchIndex: batches.length + 1,
      startBeatId: String(first?.beat_id ?? ''),
      endBeatId: String(last?.beat_id ?? ''),
      beats: slice,
    });
  }

  return batches;
}

/**
 * @param {Record<string, unknown>[]} beats
 */
export function buildSceneSpecsPrompt(beats) {
  return promptCreateSceneSpecsFromBeats(JSON.stringify({ beats }, null, 2));
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parseSceneSpecsResponse(raw) {
  const cleaned = stripJsonCodeFence(raw);
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.scenes)) {
    throw new Error('parseSceneSpecsResponse: JSON thiếu mảng "scenes"');
  }
  return parsed;
}

/**
 * @param {Record<string, unknown>[]} scenes
 * @param {number} [startIndex] — 1-based scene number
 */
export function renumberSceneIds(scenes, startIndex = 1) {
  return scenes.map((scene, i) => ({
    ...scene,
    scene_id: `S${String(startIndex + i).padStart(3, '0')}`,
  }));
}

function defaultLlmProfile() {
  const fromEnv = process.env.LLM_TEST_PROFILE || process.env.GEMINI_TEST_PROFILE || process.env.GPT_TEST_PROFILE;
  const n = Number(fromEnv);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * @param {Record<string, unknown>[]} beats
 * @param {object} [options]
 * @param {string} [options.srtPath] — đường dẫn .srt (hoặc base tương đương) để đặt tên file output
 * @param {number} [options.profile]
 * @param {boolean} [options.visible]
 * @param {boolean} [options.thinkingMode]
 * @param {number} [options.batchSize]
 * @param {(info: { batchIndex: number, total: number }) => void} [options.onBatchStart]
 */
export async function createSceneSpecsFromBeats(beats, options = {}) {
  const {
    srtPath = PATHS.DOWNLOADS,
    profile = defaultLlmProfile(),
    visible = true,
    thinkingMode = false,
    batchSize = BEATS_BATCH_SIZE,
    onBatchStart,
  } = options;

  // const batches = createBeatBatches(beats, { batchSize });
  const outputDir = path.dirname(path.resolve(srtPath));

  /** @type {Record<string, unknown>[]} */
  const allScenes = [];
  let sceneNumber = 1;

  const { context, page } = await openChromeProfile({ profile, visible });

  try {
    await openChatPage(page, { thinkingMode });

    for (const beat of beats) {
      // onBatchStart?.({ batchIndex: batch.batchIndex, total: batches.length });

      const prompt = buildSceneSpecsPrompt(beat);
      const raw = await sendPromptWithRetry(page, prompt, {
        requireCodeBlock: false,
        validate: validateJsonResponse,
        maxRetries: 2,
        retryDelayMs: 3000,
        label: `[scene-specs] beat ${beat.beat_id}`,
      });

      const specsPayload = parseSceneSpecsResponse(raw);
      const scenes = renumberSceneIds(specsPayload.scenes, sceneNumber);
      sceneNumber += scenes.length;

      // const record = {
      //   batch_index: batch.batchIndex,
      //   beat_range: {
      //     start_beat_id: batch.startBeatId,
      //     end_beat_id: batch.endBeatId,
      //   },
      //   beats: batch.beats,
      //   scenes,
      // };

      // const segmentPath = sceneSpecsSegmentPath(srtPath, batch.batchIndex);
      // saveJsonFile(segmentPath, record);
      allScenes.push(...specsPayload.scenes);

      // console.log(`✅ batch ${batch.batchIndex}/${batches.length} → ${path.basename(segmentPath)} (${scenes.length} scenes)`);
    }
  } finally {
    await context.close().catch(() => {});
  }

  const manifestPath = sceneSpecsManifestPath(srtPath);
  saveJsonFile(manifestPath, allScenes);

  return { manifestPath, scenes: allScenes };
}

/**
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.srtPath]
 * @param {string} [options.visualBeatsPath] — file .visual-beats.json; nếu không có thì dùng manifest mặc định từ srtPath
 * @param {Record<string, unknown>[]} [options.beats] — beats sẵn có, bỏ qua đọc file
 * @param {number} [options.profile]
 * @param {boolean} [options.visible]
 */
export async function createScenesFromBeat(options = {}) {
  const { downloadsDir = PATHS.DOWNLOADS, srtPath: argSrtPath, visualBeatsPath, beats: beatsArg, profile, visible } = options;

  let srtPath = argSrtPath ? path.resolve(argSrtPath) : null;
  let beats = beatsArg;

  if (!beats) {
    const beatsFile = visualBeatsPath ?? (srtPath ? visualBeatsManifestPath(srtPath) : findLatestVisualBeatsManifest(downloadsDir));

    if (!fs.existsSync(beatsFile)) {
      throw new Error(
        `createScenesFromBeat: không tìm thấy visual beats — ${beatsFile}. Chạy createVisualBeat.js trước hoặc truyền options.beats.`,
      );
    }

    beats = loadBeatsFromFile(beatsFile);
    if (!srtPath) {
      srtPath = srtPathFromBeatsManifest(beatsFile);
    }
  }

  if (!srtPath) {
    throw new Error('createScenesFromBeat: cần options.srtPath hoặc visualBeatsPath để lưu output');
  }

  console.log(`🎬 Beats: ${beats.length} → scene specs (${path.basename(srtPath)})`);

  const result = await createSceneSpecsFromBeats(beats, {
    srtPath,
    profile,
    visible,
    onBatchStart: ({ batchIndex, total }) => {
      console.log(`⏳ Đang xử lý batch ${batchIndex}/${total}...`);
    },
  });

  console.log(`📦 Manifest: ${result.manifestPath}`);
  return { srtPath, beats, ...result };
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
function findLatestVisualBeatsManifest(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.visual-beats.json'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].name) : null;
}

export default async function main() {
  const argPath = process.argv[2];
  if (argPath?.endsWith('.visual-beats.json')) {
    const beats = loadBeatsFromFile(argPath);
    await createSceneSpecsFromBeats(beats, {
      srtPath: srtPathFromBeatsManifest(argPath),
      onBatchStart: ({ batchIndex, total }) => {
        console.log(`⏳ batch ${batchIndex}/${total}...`);
      },
    });
    return;
  }
  await createScenesFromBeat(argPath ? { srtPath: argPath } : {});
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
