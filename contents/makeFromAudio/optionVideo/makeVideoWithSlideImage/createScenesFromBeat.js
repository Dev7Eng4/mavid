/**
 * Nhận danh sách visual beats → gọi promptCreateSceneSpecsFromBeats từng beat,
 * chạy song song trên nhiều Chrome profile (profile xong beat nào thì lấy beat tiếp theo),
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
import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { openChatPage, sendPromptWithRetry } from '../../../llm/browser.util.js';
import { stripJsonCodeFence, validateJsonResponse } from '../../../llm/text.util.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';
import { saveJsonFile, visualBeatsManifestPath } from './createVisualBeat.js';
import { promptCreateSceneSpecsFromBeats } from './prompts.js';

const SCENE_SPECS_MAX_PROFILES = 5;

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

/**
 * @param {Record<string, unknown>[]} beats
 * @param {object} [options]
 * @param {string} [options.srtPath] — đường dẫn .srt (hoặc base tương đương) để đặt tên file output
 * @param {boolean} [options.visible]
 * @param {boolean} [options.thinkingMode]
 * @param {number} [options.maxProfiles] — số Chrome profile chạy song song (mặc định 5)
 * @param {(info: { beatIndex: number, beatId: string, total: number }) => void} [options.onBeatStart]
 */
export async function createSceneSpecsFromBeats(beats, options = {}) {
  const { srtPath = PATHS.DOWNLOADS, visible = true, thinkingMode = false, maxProfiles = SCENE_SPECS_MAX_PROFILES, onBeatStart } = options;

  if (!Array.isArray(beats) || beats.length === 0) {
    throw new Error('createSceneSpecsFromBeats: beats rỗng');
  }

  const totalBeats = beats.length;

  /** @type {(Record<string, unknown>[] | null)[]} */
  const beatScenesResults = new Array(totalBeats).fill(null);

  const sceneProfiles = PLAYWRIGHT_PROFILES.slice(0, maxProfiles);
  let nextBeatIndex = 0;
  const activeConcurrency = Math.min(sceneProfiles.length, totalBeats);

  async function workerProfile(workerIndex) {
    const profileNum = sceneProfiles[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum, visible });
      ctx = opened.context;
      const pg = opened.page;
      let primingDone = false;

      while (true) {
        const i = nextBeatIndex++;
        if (i >= totalBeats) break;

        const beat = beats[i];
        const beatId = String(/** @type {{ beat_id?: string }} */ (beat)?.beat_id ?? '');
        const beatNum = i + 1;
        onBeatStart?.({ beatIndex: beatNum, beatId, total: totalBeats });

        try {
          if (!primingDone) {
            await openChatPage(pg, { thinkingMode });
            primingDone = true;
          }

          const prompt = buildSceneSpecsPrompt([beat]);
          const raw = await sendPromptWithRetry(pg, prompt, {
            validate: validateJsonResponse,
            label: `[scene-specs] beat ${beatNum}/${totalBeats} ${beatId} (profile ${profileNum})`,
          });

          const specsPayload = parseSceneSpecsResponse(raw);
          const scenes = specsPayload.scenes;

          const segmentPath = sceneSpecsSegmentPath(srtPath, beatNum);
          // saveJsonFile(segmentPath, {
          //   beat_index: beatNum,
          //   beat_id: beatId,
          //   scenes,
          // });

          beatScenesResults[i] = scenes;
          console.log(
            `✅ beat ${beatNum}/${totalBeats} ${beatId} → ${path.basename(segmentPath)} (${scenes.length} scenes, profile ${profileNum})`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[scene-specs] beat ${beatNum}/${totalBeats} ${beatId} lỗi profile ${profileNum}: ${msg}`);
          beatScenesResults[i] = null;
        }

        if (nextBeatIndex < totalBeats) {
          await pg.waitForTimeout(1000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));

  const failedCount = beatScenesResults.filter(r => r === null).length;
  if (failedCount > 0) {
    throw new Error(`createSceneSpecsFromBeats: ${failedCount}/${totalBeats} beat thất bại`);
  }

  /** @type {Record<string, unknown>[]} */
  const allScenes = [];
  let sceneNumber = 1;

  for (const scenes of beatScenesResults) {
    const renumbered = renumberSceneIds(/** @type {Record<string, unknown>[]} */ (scenes), sceneNumber);
    sceneNumber += renumbered.length;
    allScenes.push(...renumbered);
  }

  const manifestPath = sceneSpecsManifestPath(srtPath);
  // saveJsonFile(manifestPath, allScenes);

  return { manifestPath, scenes: allScenes };
}

/**
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.srtPath]
 * @param {string} [options.visualBeatsPath] — file .visual-beats.json; nếu không có thì dùng manifest mặc định từ srtPath
 * @param {Record<string, unknown>[]} [options.beats] — beats sẵn có, bỏ qua đọc file
 * @param {boolean} [options.visible]
 * @param {number} [options.maxProfiles]
 */
export async function createScenesFromBeat(options = {}) {
  const { downloadsDir = PATHS.DOWNLOADS, srtPath: argSrtPath, visualBeatsPath, beats: beatsArg, visible, maxProfiles } = options;

  let srtPath = argSrtPath ? path.resolve(argSrtPath) : null;
  let beats = beatsArg;

  if (!beats) {
    const beatsFile = visualBeatsPath ?? (srtPath ? visualBeatsManifestPath(srtPath) : findLatestVisualBeatsManifest(downloadsDir));

    if (!fs.existsSync(beatsFile)) {
      throw new Error(
        `createScenesFromBeat: không tìm thấy visual beats — ${beatsFile}. Chạy createVisualBeat.js trước hoặc truyền options.beats.`
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
    visible,
    maxProfiles,
    onBeatStart: ({ beatIndex, beatId, total }) => {
      console.log(`⏳ Đang xử lý beat ${beatIndex}/${total} (${beatId})...`);
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
      onBeatStart: ({ beatIndex, beatId, total }) => {
        console.log(`⏳ beat ${beatIndex}/${total} (${beatId})...`);
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
