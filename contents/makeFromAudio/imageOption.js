/**
 * Option 2: Tạo video từ ảnh (image-based).
 *
 * Bước 1: Đọc file transcript SRT cuối cùng → parseSrtToObjects → mảng objects.
 * Bước 2: Chia mảng thành các đoạn 500 objects, gửi promptToSummaryChapter tới Gemini.
 *         Nếu nhiều đoạn → xử lý song song tối đa 5 profile (profile 4→8).
 *
 * Mode AGI (Auto Generate Image):
 *   Bước 1–6 đầy đủ (bao gồm Bước 5 tạo scene prompts).
 *   Bước 7: Mở flow tạo image cho từng scene thay vì tạo video.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { DEFAULT_PROMPT_LANG, STOCK_VIDEO, SUBTITLE, LOGO } from '../constants/index.js';
import { parseSrtToObjects, objectsToIdTextFormat, srtToPlainText } from '../utils/srt.util.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { openGeminiPage, sendPromptToGeminiWithRetry } from '../gemini/browser.util.js';
import { runCreateThumbnailFlow } from '../flow/runCreateThumbnail.js';

import {
  DOWNLOADS_DIR,
  getSubtitleFile,
  OUTPUT_DIR,
  ROOT,
  getAudioFile,
  resolveAudioSpeed,
  getAudioDurationSeconds,
  formatClockDuration,
  sanitizeFilename,
  ffmpegSpawnAsync,
  getPrebakedLogoPng,
  getPrebakedNoiseMov,
} from './shared.js';
import { processStockVideo } from './stockVideoOption.js';
import { GPU_INFO } from '../utils/hardware.util.js';
import {
  scaleSrtTimestamps,
  resolveJapaneseSubtitleStyle,
  convertSrtToAss,
  escapePathForFfmpegSubtitles,
  SUBTITLE_FONT_DIR,
  SUBTITLE_FONT_FILE,
  SUBTITLE_MARGIN_BOTTOM_PX,
} from './subtitle.js';

/** Số object mỗi lần gửi cho Gemini */
const CHUNK_SIZE = 300;
/** Số object context từ đoạn trước để đảm bảo tính liên tục */
const PREV_CONTEXT_SIZE = 20;
/** Profile IDs dùng cho xử lý song song (profile 4 → 8) */
const PROFILE_IDS = [4, 5, 6, 7, 8];
/** Số timeline đầu transcript dùng cho headTranscript khi detect niche */
const NICHE_HEAD_TIMELINE_LIMIT = 1000;
/** Số timeline cuối transcript dùng cho tailTranscript khi detect niche */
const NICHE_TAIL_TIMELINE_LIMIT = 1000;

/**
 * Bỏ fence markdown nếu Gemini bọc ``` / ```json.
 * @param {string} text
 * @returns {string}
 */
function stripJsonCodeFence(text) {
  let t = String(text ?? '').trim();
  t = t
    .replace(/^```[^\n]*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  return t;
}

/**
 * Validator cho sendPromptToGeminiWithRetry: response phải parse được JSON sau khi strip code fence.
 * Throw nếu không hợp lệ → trigger retry.
 * @param {string} raw
 */
function validateGeminiJsonResponse(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) {
    throw new Error('Gemini trả về response rỗng.');
  }
  JSON.parse(cleaned);
}

/**
 * Normalize mảng chapter từ Gemini: sửa trường hợp AI trả key số (vd "353": 353) thay vì "id_end".
 * @param {object[]} chapters
 * @returns {object[]}
 */
function normalizeChapterArray(chapters) {
  if (!Array.isArray(chapters)) return chapters;
  return chapters.map(ch => {
    const knownKeys = new Set(['id_start', 'id_end', 'title', 'mood', 'summary', 'characters_present', 'summary']);
    // Tìm tất cả key số bất thường
    const numericKeys = Object.keys(ch).filter(k => !knownKeys.has(k) && /^\d+$/.test(k));

    if (numericKeys.length === 0) return ch;

    let fixed = { ...ch };
    // Xóa các key số ra khỏi object
    for (const k of numericKeys) {
      delete fixed[k];
    }

    const numericValues = numericKeys.map(k => ({ key: k, val: ch[k] }));
    numericValues.sort((a, b) => a.val - b.val);

    if (fixed.id_start == null && fixed.id_end == null && numericValues.length >= 2) {
      // Cả 2 đều thiếu → nhỏ nhất = id_start, lớn nhất = id_end
      fixed.id_start = numericValues[0].val;
      fixed.id_end = numericValues[numericValues.length - 1].val;
      console.warn(
        `[normalizeChapter] Sửa "${numericValues[0].key}" → id_start: ${fixed.id_start}, "${
          numericValues[numericValues.length - 1].key
        }" → id_end: ${fixed.id_end}`,
      );
    } else if (fixed.id_start == null) {
      fixed.id_start = numericValues[0].val;
      console.warn(`[normalizeChapter] Sửa key "${numericValues[0].key}": ${fixed.id_start} → id_start`);
    } else if (fixed.id_end == null) {
      fixed.id_end = numericValues[numericValues.length - 1].val;
      console.warn(`[normalizeChapter] Sửa key "${numericValues[numericValues.length - 1].key}": ${fixed.id_end} → id_end`);
    }

    return fixed;
  });
}

/**
 * Loại bỏ chapters trùng lặp / overlap: sort theo id_start, loại chapter nào id_start nằm trong range của chapter trước.
 * @param {object[]} chapters
 * @returns {object[]}
 */
function deduplicateChapters(chapters) {
  if (!Array.isArray(chapters) || chapters.length <= 1) return chapters;

  // Sort theo id_start
  const sorted = [...chapters].sort((a, b) => Number(a.id_start) - Number(b.id_start));

  const result = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    const prevEnd = Number(prev.id_end);
    const currStart = Number(curr.id_start);

    if (currStart <= prevEnd) {
      // Overlap: giữ chapter nào có range rộng hơn
      const prevRange = prevEnd - Number(prev.id_start);
      const currRange = Number(curr.id_end) - currStart;
      if (currRange > prevRange) {
        console.warn(
          `[deduplicateChapters] Thay chapter [${prev.id_start}-${prev.id_end}] bằng [${curr.id_start}-${curr.id_end}] (range rộng hơn)`,
        );
        result[result.length - 1] = curr;
      } else {
        console.warn(
          `[deduplicateChapters] Bỏ chapter trùng [${curr.id_start}-${curr.id_end}] (nằm trong [${prev.id_start}-${prev.id_end}])`,
        );
      }
    } else {
      result.push(curr);
    }
  }

  if (result.length < chapters.length) {
    console.log(
      `[deduplicateChapters] Đã loại ${chapters.length - result.length} chapters trùng lặp (${chapters.length} → ${result.length}).`,
    );
  }
  return result;
}

/**
 * Loại bỏ scenes trùng lặp / overlap: sort theo start_index, loại scene nào start_index nằm trong range của scene trước.
 * @param {object[]} scenes
 * @returns {object[]}
 */
function deduplicateScenes(scenes) {
  if (!Array.isArray(scenes) || scenes.length <= 1) return scenes;

  const sorted = [...scenes].sort((a, b) => Number(a.start_index) - Number(b.start_index));

  const result = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    const prevEnd = Number(prev.end_index);
    const currStart = Number(curr.start_index);

    if (currStart <= prevEnd) {
      // Overlap: giữ scene có range rộng hơn
      const prevRange = prevEnd - Number(prev.start_index);
      const currRange = Number(curr.end_index) - currStart;
      if (currRange > prevRange) {
        result[result.length - 1] = curr;
      }
      // Nếu range nhỏ hơn hoặc bằng → bỏ qua
    } else {
      result.push(curr);
    }
  }

  if (result.length < scenes.length) {
    console.log(`[deduplicateScenes] Đã loại ${scenes.length - result.length} scenes trùng lặp (${scenes.length} → ${result.length}).`);
  }
  return result;
}

/**
 * Đảm bảo thứ tự tăng dần của scenes theo thứ tự xuất hiện gốc:
 * Duyệt từ đầu đến cuối, nếu `start_index` của phần tử sau <= `end_index` của
 * phần tử trước (đã được giữ lại) thì loại bỏ phần tử bị lỗi đó.
 *
 * Khác với `deduplicateScenes` (sort theo start_index + giữ scene có range rộng hơn),
 * hàm này KHÔNG sort, chỉ tin tưởng thứ tự gốc và loại item vi phạm.
 *
 * @param {object[]} scenes
 * @returns {object[]}
 */
function enforceSequentialScenes(scenes) {
  if (!Array.isArray(scenes) || scenes.length <= 1) return scenes;

  const result = [scenes[0]];
  for (let i = 1; i < scenes.length; i++) {
    const prev = result[result.length - 1];
    const curr = scenes[i];
    const prevEnd = Number(prev.end_index);
    const currStart = Number(curr.start_index);

    if (Number.isFinite(prevEnd) && Number.isFinite(currStart) && currStart <= prevEnd) {
      console.warn(
        `[enforceSequentialScenes] Loại scene [${curr.start_index}-${curr.end_index}]: ` +
          `start_index (${curr.start_index}) <= end_index của scene trước (${prev.end_index}) ` +
          `[${prev.start_index}-${prev.end_index}].`,
      );
      continue;
    }

    result.push(curr);
  }

  if (result.length < scenes.length) {
    console.log(
      `[enforceSequentialScenes] Đã loại ${scenes.length - result.length} scenes vi phạm thứ tự (${scenes.length} → ${result.length}).`,
    );
  }
  return result;
}

/**
 * Option 2: Tạo video từ ảnh.
 *
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.videoLanguage]
 * @param {VIDEO_MAKE_OPTION} [options.visualOption]
 */
export async function processVideoWithImage(options = {}) {
  const { downloadsDir = DOWNLOADS_DIR, videoLanguage, visualOption } = options;

  const lang = String(videoLanguage || DEFAULT_PROMPT_LANG).toUpperCase();
  const prompts = await loadPromptByLanguage(lang);

  // ─── Bước 1: Đọc transcript SRT cuối cùng → mảng objects ───
  const allObjects = parseTranscript(downloadsDir);

  // ─── Bước 2: Tạo global niche từ head/tail transcript
  const globalNiche = await generateGlobalNiche(allObjects, prompts);

  // ─── Bước 3: Chia chunk 500 objects → tạo chapters
  const allChapters = await generateChapters(allObjects, globalNiche, prompts);

  // ─── Bước 4: Gộp summary → tạo visual bible
  const { visualBible, globalMasterShotPrompt } = await generateVisualBible(globalNiche, allChapters, prompts);

  // ─── Bước 5: Từng chapter → tạo scene prompts
  let chapterImagePrompts = [];
  // let sceneResults = [];
  if (visualOption === VIDEO_MAKE_OPTION.AGI) {
    const res = await generateScenePrompts(allChapters, allObjects, visualBible, prompts);
    chapterImagePrompts = res.chapterImagePrompts;

    await generateImagesFromScenePrompts(chapterImagePrompts, downloadsDir);
  }

  // ─── Bước 6: Tạo background từ globalMasterShotPrompt ───
  await generateBackground(globalMasterShotPrompt, downloadsDir);

  // ─── Bước 7: Tạo video từ video stock + layer background hoặc image + noise ───
  const bgImgPath = path.join(downloadsDir, 'background.jpg');
  await generateVideo(options, bgImgPath);

  return { allObjects, globalNiche, allChapters, visualBible, globalMasterShotPrompt, chapterImagePrompts };
}

/**
 * Bước 1: Đọc transcript SRT cuối cùng → mảng objects
 */
function parseTranscript(downloadsDir) {
  const subtitlePath = getSubtitleFile(downloadsDir);
  if (!subtitlePath) {
    throw new Error('Không tìm thấy file transcript (SRT/VTT) trong ' + downloadsDir);
  }

  const srtContent = fs.readFileSync(subtitlePath, 'utf-8');
  const allObjects = parseSrtToObjects(srtContent);
  console.log(`[Option 2] Đã parse ${allObjects.length} objects từ transcript: ${path.basename(subtitlePath)}`);

  if (allObjects.length === 0) {
    throw new Error('Không parse được object nào từ transcript — không thể tiếp tục.');
  }

  return allObjects;
}

/**
 * Chuyển mảng object {id, timeline, text} ngược lại thành mini-SRT để dùng với srtToPlainText.
 * @param {{ id: string|number, timeline: string, text: string }[]} objects
 * @returns {string}
 */
function objectsToSrtChunk(objects) {
  return objects.map(o => `${o.id}\n${o.timeline}\n${o.text}`).join('\n\n');
}

/**
 * Bước 2: Tạo global niche từ transcript.
 * - headTranscript: plain text của ${NICHE_HEAD_TIMELINE_LIMIT} timeline đầu tiên.
 * - tailTranscript: nếu transcript dài hơn HEAD limit → plain text các timeline còn lại,
 *   cap tối đa ${NICHE_TAIL_TIMELINE_LIMIT} timeline cuối (không overlap với head).
 *   Ví dụ 1400 timeline: head = 1000 đầu, tail = 400 cuối.
 *
 * @param {{ id: string|number, timeline: string, text: string }[]} allObjects
 * @param {Record<string, any>} prompts
 * @returns {Promise<object|null>}
 */
async function generateGlobalNiche(allObjects, prompts) {
  const total = allObjects.length;

  const headObjects = allObjects.slice(0, NICHE_HEAD_TIMELINE_LIMIT);
  let tailObjects = [];
  if (total > NICHE_HEAD_TIMELINE_LIMIT) {
    const tailCount = Math.min(NICHE_TAIL_TIMELINE_LIMIT, total - NICHE_HEAD_TIMELINE_LIMIT);
    tailObjects = allObjects.slice(-tailCount);
  }

  const headTranscript = srtToPlainText(objectsToSrtChunk(headObjects));
  const tailTranscript = tailObjects.length > 0 ? srtToPlainText(objectsToSrtChunk(tailObjects)) : '';

  console.log(`[Option 2 — Global Niche] head: ${headObjects.length} timeline, tail: ${tailObjects.length} timeline (total: ${total}).`);

  if (typeof prompts.promptToDetectNiche !== 'function') {
    console.warn('[Option 2 — Global Niche] Không có prompts.promptToDetectNiche — bỏ qua bước detect niche.');
    return null;
  }

  const prompt = prompts.promptToDetectNiche(headTranscript, tailTranscript);

  const { context: ctx, page: pg } = await openChromeProfile({ profile: 4, visible: true });
  let globalNiche = null;
  try {
    await openGeminiPage(pg);
    const rawResponse = await sendPromptToGeminiWithRetry(pg, prompt, {
      maxRetries: 2,
      validate: validateGeminiJsonResponse,
      label: 'Global Niche',
    });
    const jsonStr = stripJsonCodeFence(rawResponse);
    try {
      globalNiche = JSON.parse(jsonStr);
      console.log('[Option 2 — Global Niche] Đã tạo global niche:', globalNiche);
    } catch (parseErr) {
      console.error('[Option 2 — Global Niche] Không parse được JSON:', parseErr.message);
      console.error('[Option 2 — Global Niche] Raw response:', rawResponse.slice(0, 500));
      throw new Error('Gemini trả về Global Niche không phải JSON hợp lệ.');
    }
  } finally {
    await ctx.close().catch(() => {});
  }

  return globalNiche;
}

/**
 * Bước 3: Chia chunk 500 objects → gửi promptToCreateChapter → Gemini
 */
async function generateChapters(allObjects, globalNiche, prompts) {
  const chunks = [];
  for (let i = 0; i < allObjects.length; i += CHUNK_SIZE) {
    chunks.push(allObjects.slice(i, i + CHUNK_SIZE));
  }
  const totalChunks = chunks.length;

  console.log(`[Option 2] Tổng cộng ${totalChunks} đoạn (mỗi đoạn tối đa ${CHUNK_SIZE} objects).`);

  /** @type {(object|null)[]} Kết quả mỗi đoạn (parsed JSON) */
  const chapterResults = new Array(totalChunks).fill(null);

  // Số profile song song = min(5, totalChunks)
  const activeConcurrency = Math.min(PROFILE_IDS.length, totalChunks);

  console.log(
    `[Option 2] Mở ${activeConcurrency} Chrome profile (${PROFILE_IDS.slice(0, activeConcurrency).join(',')}) cho ${totalChunks} đoạn...`,
  );

  let nextChunkIndex = 0;

  async function workerProfile(workerIndex) {
    const profileNum = PROFILE_IDS[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum, visible: true });
      ctx = opened.context;
      const pg = opened.page;
      let primingDone = false;

      while (true) {
        const i = nextChunkIndex++;
        if (i >= totalChunks) break;
        try {
          console.log(`\n--- [Option 2] Đoạn ${i + 1}/${totalChunks} chunk ${chunks[i]} objects ---`);

          if (!primingDone) {
            await openGeminiPage(pg);
          }

          let previousContext = '';
          if (i > 0) {
            const startIdx = i * CHUNK_SIZE - PREV_CONTEXT_SIZE;
            const endIdx = i * CHUNK_SIZE;
            const prevObjects = allObjects.slice(Math.max(0, startIdx), endIdx);
            previousContext = objectsToIdTextFormat(prevObjects);
          }

          const transcriptText = objectsToIdTextFormat(chunks[i]);
          console.log('🚀 ~ workerProfile ~ transcriptText:', transcriptText);

          const prompt = prompts.promptToCreateChapter({
            globalNiche: globalNiche ? JSON.stringify(globalNiche, null, 2) : '',
            transcript: transcriptText,
            previousContext,
          });
          const rawResponse = await sendPromptToGeminiWithRetry(pg, prompt, {
            maxRetries: 2,
            validate: validateGeminiJsonResponse,
            label: `Chapter ${i + 1}/${totalChunks} (profile ${profileNum})`,
          });

          const jsonStr = stripJsonCodeFence(rawResponse);
          try {
            chapterResults[i] = normalizeChapterArray(JSON.parse(jsonStr));
            console.log(
              `[Option 2] Đoạn ${i + 1}/${totalChunks}: Đã nhận ${
                Array.isArray(chapterResults[i]) ? chapterResults[i].length : 1
              } chapter(s).`,
            );
          } catch (parseErr) {
            console.error(`[Option 2] Đoạn ${i + 1}/${totalChunks}: Không parse được JSON:`, parseErr.message);
            console.error(`[Option 2] Raw response:`, rawResponse.slice(0, 500));
            chapterResults[i] = null;
          }

          primingDone = true;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(`[Option 2] Đoạn ${i + 1}/${totalChunks} lỗi profile ${profileNum}: ${reason}`);
          chapterResults[i] = null;
        }

        if (nextChunkIndex < totalChunks) {
          await pg.waitForTimeout(1000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));

  const rawChapters = chapterResults.filter(Boolean).flat();
  console.log('🚀 ~ generateChapters ~ rawChapters:', rawChapters);
  const allChapters = deduplicateChapters(rawChapters).map(ch => ({ ...ch, id: uuidv4() }));

  console.log(`\n[Option 2] Bước 2 hoàn thành: Tổng cộng ${allChapters.length} chapters từ ${totalChunks} đoạn.`);

  if (allChapters.length === 0) {
    throw new Error('[Option 2] Không có chapter nào được tạo — không thể tiếp tục.');
  }

  return allChapters;
}

/**
 * Bước 4: Gộp summary → gửi promptToCreateVisualBible → Gemini
 */
async function generateVisualBible(globalNiche, allChapters, prompts) {
  const mergedSummary = allChapters.map((ch, idx) => ch.summary).join(' ');

  console.log(`[Option 2] Đang gửi ${allChapters.length} chapter summaries tới Gemini để tạo Visual Bible...`);

  const visualBiblePrompt = prompts.promptToCreateGlobalVisualBible({
    globalNiche: globalNiche ? JSON.stringify(globalNiche, null, 2) : '',
    summary: mergedSummary,
  });

  const { context: vbCtx, page: vbPage } = await openChromeProfile({ profile: 4, visible: true });

  let visualBible;
  let globalMasterShotPrompt;
  try {
    await openGeminiPage(vbPage);
    const rawVbResponse = await sendPromptToGeminiWithRetry(vbPage, visualBiblePrompt, {
      maxRetries: 2,
      validate: validateGeminiJsonResponse,
      label: 'Visual Bible',
    });

    const vbJsonStr = stripJsonCodeFence(rawVbResponse);
    try {
      const fullVb = JSON.parse(vbJsonStr);
      globalMasterShotPrompt = fullVb.master_background_prompt?.master_full_prompt || '';
      visualBible = {
        visual_style: fullVb.visual_style || {},
        characters: fullVb.characters || [],
        master_background_prompt: {
          style_base: fullVb.master_background_prompt?.style_base || '',
          environment_base: fullVb.master_background_prompt?.environment_base || '',
          scene_variables_template: fullVb.master_background_prompt?.scene_variables_template || {},
        },
        negative_prompt: fullVb.negative_prompt || '',
      };
      console.log('[Option 2] Đã tạo Visual Bible thành công.');
    } catch (parseErr) {
      console.error('[Option 2] Không parse được JSON Visual Bible:', parseErr.message);
      console.error('[Option 2] Raw response:', rawVbResponse.slice(0, 500));
      throw new Error('Gemini trả về Visual Bible không phải JSON hợp lệ.');
    }
  } finally {
    await vbCtx.close().catch(() => {});
  }

  console.log('[Option 2] Visual Bible:', JSON.stringify(visualBible, null, 2));
  console.log('[Option 2] Global Master Shot Prompt:', globalMasterShotPrompt);

  return { visualBible, globalMasterShotPrompt };
}

/**
 * Bước 5: Từng chapter → promptToCreateSceneFromChapter → Gemini (5 profile song song)
 */
async function generateScenePrompts(allChapters, allObjects, visualBible, prompts) {
  const totalChaptersForScene = allChapters.length;

  const objectById = new Map();
  for (const obj of allObjects) {
    objectById.set(Number(obj.id), obj);
  }

  /** @type {(object[]|null)[]} Kết quả scene cho mỗi chapter */
  const sceneResults = new Array(totalChaptersForScene).fill(null);

  const sceneActiveConcurrency = Math.min(PROFILE_IDS.length, totalChaptersForScene);
  let nextChapterIndex = 0;

  async function sceneWorkerProfile(workerIndex) {
    const profileNum = PROFILE_IDS[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum, visible: true });
      ctx = opened.context;
      const pg = opened.page;
      let primingDone = false;

      while (true) {
        const ci = nextChapterIndex++;
        if (ci >= totalChaptersForScene) break;
        try {
          const chapter = allChapters[ci];
          console.log(`\n--- [Option 2 Bước 5] Chapter ${ci + 1}/${totalChaptersForScene} "${chapter.title}" (profile ${profileNum}) ---`);

          if (!primingDone) {
            await openGeminiPage(pg);
          }

          const idStart = Number(chapter.id_start);
          const idEnd = Number(chapter.id_end);
          const chapterObjects = [];
          for (let id = idStart; id <= idEnd; id++) {
            const obj = objectById.get(id);
            if (obj) chapterObjects.push(obj);
          }
          const transcriptLines = objectsToIdTextFormat(chapterObjects);
          console.log('🚀 ~ sceneWorkerProfile ~ transcriptLines:', transcriptLines);

          let previousChapterContext = null;
          if (ci > 0 && allChapters[ci - 1]) {
            const prevChapter = allChapters[ci - 1];

            previousChapterContext = {
              last_chapter_title: prevChapter.title || '',
              last_chapter_mood: prevChapter.mood || '',
              last_characters_present: prevChapter.characters_present,
              last_chapter_summary: prevChapter.summary || '',
            };
          }

          const scenePrompt = prompts.promptToCreateSceneInChapter({
            previousChapterContext: previousChapterContext ? JSON.stringify(previousChapterContext, null, 2) : '',
            visualBible: visualBible ? JSON.stringify(visualBible, null, 2) : '',
            chapterData: JSON.stringify(
              {
                title: chapter.title,
                summary: chapter.summary,
                mood: chapter.mood,
                characters_present: chapter.characters_present,
                transcript: transcriptLines,
              },
              null,
              2,
            ),
          });

          const rawSceneResponse = await sendPromptToGeminiWithRetry(pg, scenePrompt, {
            maxRetries: 2,
            validate: validateGeminiJsonResponse,
            label: `Scene chapter ${ci + 1}/${totalChaptersForScene} (profile ${profileNum})`,
          });

          const sceneJsonStr = stripJsonCodeFence(rawSceneResponse);
          try {
            sceneResults[ci] = JSON.parse(sceneJsonStr);
            console.log(`[Option 2 Bước 5] Chapter ${ci + 1}/${totalChaptersForScene}: Đã nhận prompt image.`);
          } catch (parseErr) {
            console.error(`[Option 2 Bước 5] Chapter ${ci + 1}/${totalChaptersForScene}: Không parse được JSON:`, parseErr.message);
            console.error(`[Option 2 Bước 5] Raw response:`, rawSceneResponse.slice(0, 500));
            sceneResults[ci] = null;
          }

          primingDone = true;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(`[Option 2 Bước 5] Chapter ${ci + 1}/${totalChaptersForScene} lỗi profile ${profileNum}: ${reason}`);
          sceneResults[ci] = null;
        }

        if (nextChapterIndex < totalChaptersForScene) {
          await pg.waitForTimeout(2000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: sceneActiveConcurrency }, (_, w) => sceneWorkerProfile(w)));

  const flatScenePrompts = sceneResults.flatMap((scenes, idx) => {
    if (!scenes) return [];
    const arr = Array.isArray(scenes) ? scenes : [scenes];
    return arr.map(s => ({ ...s }));
  });

  // Loại bỏ scenes vi phạm thứ tự: start_index của phần tử sau phải > end_index của phần tử trước.
  const chapterImagePrompts = enforceSequentialScenes(flatScenePrompts);

  console.log(
    `\n[Option 2] Bước 5 hoàn thành: Tổng cộng ${chapterImagePrompts.length} scenes hợp lệ ` +
      `(từ ${flatScenePrompts.length} scenes thô) qua ${totalChaptersForScene} chapters.`,
  );

  return { chapterImagePrompts, sceneResults };
}

/**
 * Bước 6: Tạo background từ globalMasterShotPrompt
 */
async function generateBackground(globalMasterShotPrompt, downloadsDir) {
  console.log(`\n[Option 2] Bước 6: Tạo ảnh nền (background) từ globalMasterShotPrompt...`);
  if (globalMasterShotPrompt) {
    try {
      await runCreateThumbnailFlow({
        prompt: globalMasterShotPrompt,
        pathSave: downloadsDir,
        exportName: 'background',
        isNeedImage: false,
      });
      console.log(`[Option 2] Đã tạo và lưu ảnh background thành công tại thư mục downloads.`);
    } catch (err) {
      console.warn(`[Option 2] Lỗi trong flow tạo background: ${err.message}`);
    }
  } else {
    console.warn(`[Option 2] Bỏ qua tạo background vì không có globalMasterShotPrompt.`);
  }
}

/**
 * Bước 7: Tạo video từ video stock + layer background hoặc image + noise
 */
async function generateVideo(options, bgImgPath) {
  if (options.imageNoiseMode) {
    console.log(`\n[Option 2] Bước 7: Gọi processImageNoiseVideo tạo video từ image background + noise overlay...`);
    if (!fs.existsSync(bgImgPath)) {
      throw new Error(`[Option 2] Không tìm thấy ảnh background: ${bgImgPath}`);
    }
    await processImageNoiseVideo(options, bgImgPath);
  } else {
    console.log(`\n[Option 2] Bước 7: Gọi processStockVideo tạo video ghép ảnh nền...`);
    await processStockVideo(options.bgNameArg || null, {
      ...options,
      centerImageOverlayPath: fs.existsSync(bgImgPath) ? bgImgPath : null,
    });
  }
}

/**
 * Bước 7 (AGI): Mở flow tạo image cho từng scene prompt.
 * Duyệt qua chapterImagePrompts → từng scene → gọi runCreateThumbnailFlow.
 *
 * @param {object[][]} chapterImagePrompts — mảng 2 chiều: [chapter][scene]
 * @param {string} downloadsDir
 */
async function generateImagesFromScenePrompts(chapterImagePrompts, downloadsDir) {
  const imagesDir = path.join(downloadsDir, 'generated-images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const allScenes = chapterImagePrompts.flat();

  if (allScenes.length === 0) {
    console.warn('[AGI Bước 7] Không có scene prompt nào — bỏ qua tạo image.');
    return;
  }

  console.log(`\n[AGI Bước 7] Bắt đầu tạo ${allScenes.length} images từ scene prompts...`);

  let successCount = 0;
  for (let i = 0; i < allScenes.length; i++) {
    const scene = allScenes[i];
    const prompt = scene.final_prompt;
    if (!prompt) {
      console.warn(`[AGI Bước 7] Scene ${i + 1}/${allScenes.length}: Không có prompt — bỏ qua.`);
      continue;
    }

    const exportName = `scene_${scene.start_index}`;
    console.log(`[AGI Bước 7] Scene ${i + 1}/${allScenes.length}: Đang tạo image "${exportName}"...`);

    try {
      await runCreateThumbnailFlow({
        prompt,
        pathSave: imagesDir,
        exportName,
      });

      successCount++;
      console.log(`[AGI Bước 7] Scene ${i + 1}/${allScenes.length}: Tạo image thành công.`);
    } catch (err) {
      console.error(`[AGI Bước 7] Scene ${i + 1}/${allScenes.length}: Lỗi tạo image — ${err.message}`);
    }
  }

  console.log(`\n[AGI Bước 7] Hoàn thành: ${successCount}/${allScenes.length} images tạo thành công tại ${imagesDir}`);
}

/**
 * Xử lý tạo video dành riêng cho chế độ `imageNoise`:
 * Ảnh nền toàn màn hình + video noise bỏ nền đen + audio + phụ đề.
 *
 * Lưu ý: hàm xoá `bgImgPath` ở cuối — nếu test với ảnh thật cần copy ra file tạm trước khi gọi.
 */
export async function processImageNoiseVideo(options = {}, bgImgPath) {
  const {
    perVideoDir,
    originalTitle,
    description,
    tags,
    url,
    geminiByUrl,
    audioSpeed: speedIn,
    logoPath: logoPathOpt,
    downloadsDir = DOWNLOADS_DIR,
    videoLanguage,
  } = options;

  const speed = speedIn != null && Number.isFinite(Number(speedIn)) && Number(speedIn) > 0 ? Number(speedIn) : resolveAudioSpeed({});
  const audioPath = getAudioFile(downloadsDir);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const originalAudioDuration = await getAudioDurationSeconds(audioPath);
  const audioDurationAfterTempo = originalAudioDuration / speed;
  console.log(
    `Thời lượng audio: ${originalAudioDuration.toFixed(1)}s, sau atempo (SPEED=${speed}): ${formatClockDuration(audioDurationAfterTempo)}`,
  );

  let subtitlePath = getSubtitleFile(downloadsDir);
  const useJaSubtitleStyle = resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage);
  let scaledSrtPath = null;
  if (subtitlePath && speed !== 1) {
    scaledSrtPath = path.join(OUTPUT_DIR, 'temp_scaled_sub' + path.extname(subtitlePath));
    scaleSrtTimestamps(subtitlePath, scaledSrtPath, speed);
    subtitlePath = scaledSrtPath;
  }

  const baseName = originalTitle ? sanitizeFilename(originalTitle) : path.basename(audioPath, path.extname(audioPath));
  const filterScriptPath = path.join(OUTPUT_DIR, 'filter_complex.txt');
  const tempSubPath = subtitlePath ? path.join(OUTPUT_DIR, 'temp_sub.ass') : null;
  const outputPath = path.join(OUTPUT_DIR, `${baseName}-with-bg.mp4`);

  const noisePath = path.join(ROOT, 'assets', 'audioVisual', 'noise.mp4');
  const hasNoise = fs.existsSync(noisePath);

  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const fps = STOCK_VIDEO.FPS;
  const NOISE_ALPHA = 0.6;

  // Pre-bake noise (1 lần): bake fps + scale + colorkey + alpha → bỏ 5 filter per-frame ở pipeline chính.
  const prebakedNoise = hasNoise ? await getPrebakedNoiseMov(noisePath, w, h, fps, NOISE_ALPHA) : null;
  const noiseInputPath = prebakedNoise || noisePath;
  const noiseIsPrebaked = Boolean(prebakedNoise);

  const mergeArgs = ['-y'];
  let inputIdx = 0;

  // Input 0: Image (no loop — zoompan generates frames)
  mergeArgs.push('-i', bgImgPath);
  const bgIndex = inputIdx++;

  // Input 1: Noise loop (bản đã prebake nếu có)
  let noiseIndex = -1;
  if (hasNoise) {
    mergeArgs.push('-stream_loop', '-1', '-i', noiseInputPath);
    noiseIndex = inputIdx++;
  } else {
    console.warn(`[Image Noise] Không tìm thấy noise video: ${noisePath}`);
  }

  // Input 2: Audio
  mergeArgs.push('-i', audioPath);
  const audioIndex = inputIdx++;

  // Input 3: Logo
  const logoPathOriginal = logoPathOpt != null && String(logoPathOpt).trim() && fs.existsSync(logoPathOpt) ? logoPathOpt : null;
  const prebakedLogo = logoPathOriginal ? await getPrebakedLogoPng(logoPathOriginal, LOGO.SIZE) : null;
  const logoPathForMerge = prebakedLogo || logoPathOriginal;
  const hasLogo = Boolean(logoPathForMerge);
  const logoIsPrebaked = Boolean(prebakedLogo);
  let logoIndex = -1;
  if (hasLogo) {
    mergeArgs.push('-i', logoPathForMerge);
    logoIndex = inputIdx++;
  }

  const filterParts = [];

  // Audio filter
  filterParts.push(`[${audioIndex}:a]atempo=${speed}[aout]`);

  // Image background filter (w/h/fps đã khai báo ở trên cho prebake noise)
  const ZOOM_DURATION_SEC = 15;
  const ZOOM_MAX = 1.3;
  const zoomFrames = ZOOM_DURATION_SEC * fps;
  const totalFrames = Math.ceil(audioDurationAfterTempo * fps) + fps;
  const zpW = Math.ceil((w * ZOOM_MAX) / 2) * 2;
  const zpH = Math.ceil((h * ZOOM_MAX) / 2) * 2;

  // 15s đầu: zoom-out từ 1.3x → 1.0x | Sau 15s → hết video: Burns (pan drift liên tục)
  const PAN_CYCLE_X_SEC = 13;
  const PAN_CYCLE_Y_SEC = 9;
  const panCycleXFrames = PAN_CYCLE_X_SEC * fps;
  const panCycleYFrames = PAN_CYCLE_Y_SEC * fps;
  const panRange = 0.4;

  const zoomExpr = `if(lte(on,${zoomFrames}),${ZOOM_MAX}-(${ZOOM_MAX}-1)*on/${zoomFrames},1)`;
  const cx = `iw/2-(iw/zoom/2)`;
  const burnsPanX = `sin(2*PI*(on-${zoomFrames})/${panCycleXFrames})*(iw-iw/zoom)*${panRange}`;
  const burnsPanY = `sin(2*PI*(on-${zoomFrames})/${panCycleYFrames})*(ih-ih/zoom)*${panRange}`;
  const panX = `if(lte(on,${zoomFrames}),${cx},${cx}+${burnsPanX})`;
  const panY = `if(lte(on,${zoomFrames}),ih/2-(ih/zoom/2),ih/2-(ih/zoom/2)+${burnsPanY})`;

  filterParts.push(
    `[${bgIndex}:v]scale=${zpW}:${zpH}:force_original_aspect_ratio=increase:flags=fast_bilinear,` +
      `crop=${zpW}:${zpH},` +
      `zoompan=z='${zoomExpr}':` +
      `d=${totalFrames}:x='${panX}':y='${panY}':s=${w}x${h}:fps=${fps},` +
      `format=yuv420p,setsar=1[bg]`,
  );

  let currentVLabel = 'bg';

  if (hasNoise && noiseIndex >= 0) {
    if (noiseIsPrebaked) {
      filterParts.push(`[${noiseIndex}:v]null[noise]`);
    } else {
      filterParts.push(
        `[${noiseIndex}:v]fps=${fps},scale=${w}:${h}:flags=fast_bilinear,format=yuva420p,colorkey=0x000000:0.1:0.1,colorchannelmixer=aa=${NOISE_ALPHA}[noise]`,
      );
    }
    filterParts.push(`[${currentVLabel}][noise]overlay=0:0:shortest=1[v_noised]`);
    currentVLabel = 'v_noised';
  }

  // Subtitle filter (gộp 1 chain — bỏ split/crop/overlay)
  if (subtitlePath) {
    convertSrtToAss(subtitlePath, tempSubPath, useJaSubtitleStyle);
    const subPathEscaped = escapePathForFfmpegSubtitles(tempSubPath);
    const fontsDirEscaped = escapePathForFfmpegSubtitles(SUBTITLE_FONT_DIR);
    const subtitleBoxHeight = Math.floor(h / 3);
    const boxY = h - subtitleBoxHeight - SUBTITLE_MARGIN_BOTTOM_PX;
    const drawboxFilter = `drawbox=x=0:y=${boxY}:w=iw:h=${subtitleBoxHeight}:color=black@${SUBTITLE.BOX_OPACITY}:t=fill`;
    const subFilter = fs.existsSync(SUBTITLE_FONT_FILE)
      ? `subtitles='${subPathEscaped}:fontsdir=${fontsDirEscaped}'`
      : `subtitles='${subPathEscaped}'`;

    filterParts.push(`[${currentVLabel}]${drawboxFilter},${subFilter}[v_subbed]`);
    currentVLabel = 'v_subbed';
  } else {
    filterParts.push(`[${currentVLabel}]null[vpadded]`);
    currentVLabel = 'vpadded';
  }

  // Logo filter
  if (hasLogo) {
    if (logoIsPrebaked) {
      filterParts.push(`[${logoIndex}:v]null[logo]`);
    } else {
      const r = Math.floor(LOGO.SIZE / 2);
      const geqExpr = `if(lte(hypot(X-W/2,Y-H/2),${r}),255,0)`;
      filterParts.push(
        `[${logoIndex}:v]scale=${LOGO.SIZE}:${LOGO.SIZE}:flags=fast_bilinear,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${geqExpr}'[logo]`,
      );
    }
    filterParts.push(`[${currentVLabel}][logo]overlay=main_w-overlay_w-${LOGO.MARGIN_RIGHT}:${LOGO.MARGIN_TOP}[vout_final]`);
    currentVLabel = 'vout_final';
  } else {
    filterParts.push(`[${currentVLabel}]copy[vout_final]`);
  }

  const fullGraph = filterParts.join(';');
  fs.writeFileSync(filterScriptPath, fullGraph, 'utf-8');

  const cpuCount = os.cpus()?.length || 4;
  const filterThreads = String(Math.min(8, Math.max(2, cpuCount - 2)));

  mergeArgs.push(
    '-threads',
    '0',
    '-filter_complex_threads',
    filterThreads,
    '-filter_threads',
    filterThreads,
    '-filter_complex_script',
    filterScriptPath,
    '-map',
    '[vout_final]',
    '-map',
    '[aout]',
    ...GPU_INFO.makeAudioVideoEncodeArgs,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(audioDurationAfterTempo),
    outputPath,
  );

  console.log(`Đang merge nội dung Image Noise Pipeline...`);
  await ffmpegSpawnAsync(mergeArgs);

  if (fs.existsSync(filterScriptPath)) fs.unlinkSync(filterScriptPath);
  if (tempSubPath && fs.existsSync(tempSubPath)) fs.unlinkSync(tempSubPath);
  if (scaledSrtPath && fs.existsSync(scaledSrtPath)) fs.unlinkSync(scaledSrtPath);

  console.log(`\nĐã tạo: ${outputPath}`);

  if (perVideoDir) {
    fs.mkdirSync(perVideoDir, { recursive: true });

    const destVideoPath = path.join(perVideoDir, `${baseName}.mp4`);
    fs.copyFileSync(outputPath, destVideoPath);
    console.log(`>>> Đã xuất video vào folder ID: ${destVideoPath}`);

    if (fs.existsSync(downloadsDir)) {
      const downloadFiles = fs.readdirSync(downloadsDir);

      const thumbFile =
        downloadFiles.find(f => /^thumbnail\./i.test(f)) ||
        downloadFiles.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !/^background\./i.test(f));
      if (thumbFile) {
        const thumbExt = path.extname(thumbFile);
        const thumbDestPath = path.join(perVideoDir, `thumbnail${thumbExt}`);
        fs.copyFileSync(path.join(downloadsDir, thumbFile), thumbDestPath);
      }

      const transcriptFiles = downloadFiles.filter(f => /\.(srt|vtt)$/i.test(f));
      for (const transcript of transcriptFiles) {
        const trDestPath = path.join(perVideoDir, transcript);
        fs.copyFileSync(path.join(downloadsDir, transcript), trDestPath);
      }
    }

    let gem = geminiByUrl && url ? geminiByUrl[url] : {};
    if (!gem || !gem.title) {
      await new Promise(r => setTimeout(r, 2000));
      gem = geminiByUrl && url ? geminiByUrl[url] : {};
    }

    const ytTagsStr = Array.isArray(tags) ? tags.join(', ') : tags || '';
    const metaPayload = {
      title: originalTitle || '',
      description: description || '',
      tags: ytTagsStr,
      titleGemini: gem?.title || '',
      descriptionGemini: gem?.description || '',
      tagsGemini: gem?.tags || '',
      summaryGemini: gem?.summary || '',
    };
    const metaPath = path.join(perVideoDir, 'video-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(metaPayload, null, 2), 'utf8');
  }

  if (fs.existsSync(bgImgPath)) {
    fs.unlinkSync(bgImgPath);
    console.log(`[Image Noise] Đã xóa ảnh background tạm: ${bgImgPath}`);
  }
}
