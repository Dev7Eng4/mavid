import fs from 'fs';
import path from 'path';

import { PLAYWRIGHT_PROFILES } from '../constants/playwright-profile.js';
import { PATHS } from '../constants/paths.js';
import { openChatPage, sendPromptWithRetry, stripJsonCodeFence, validateJsonResponse } from '../llm/index.js';
import {
  promptCreateSummaryFromTranscript,
  promptCreateFinalSummary,
  promptMergeSummaryToSection,
  promptMergeSectionToFinal,
  promptCreateVisualBible,
  promptCreateScenePromptsForChapter,
} from '../prompts/new/createVideoInfo.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { objectsToIdTextFormat, parseSrtToObjects } from '../utils/srt.util.js';

const MERGE_SECTION_BATCH_SIZE = 12;
const MERGE_SECTION_MAX_PROFILES = 3;

const VISUAL_STYLE_PRESETS = {
  cinematic: {
    name: 'cinematic',
    rules: [
      'realistic human proportions',
      'film-like composition',
      'natural facial expressions',
      'low-key dramatic lighting',
      'shallow depth of field',
      'muted color grading',
    ],
  },
  anime: {
    name: 'anime',
    rules: [
      'anime-style character design',
      'expressive eyes',
      'clean line art',
      'stylized lighting',
      'emotional facial expressions',
      'dynamic composition',
    ],
  },
};

const visualStyle = VISUAL_STYLE_PRESETS.cinematic;

/**
 * Chia mảng thành batch 12 phần tử; nếu batch cuối < 6 thì gộp vào batch trước.
 * @template T
 * @param {T[]} arr
 * @returns {T[][]}
 */
function splitIntoBatches(arr) {
  const batches = [];
  for (let i = 0; i < arr.length; i += MERGE_SECTION_BATCH_SIZE) {
    batches.push(arr.slice(i, i + MERGE_SECTION_BATCH_SIZE));
  }
  if (batches.length >= 2 && batches[batches.length - 1].length < 6) {
    const last = batches.pop();
    batches[batches.length - 1] = batches[batches.length - 1].concat(last);
  }
  return batches;
}

/**
 * Đọc transcript (.srt) trong outputDir → chunk LLM → merge thành final summary (JSON).
 * @param {{ url?: string, options?: { outputDir?: string, chunkSize?: number } }} args
 * @returns {Promise<{ finalSummary: Record<string, unknown> | null, visualBible: Record<string, unknown> | null, normalizedScenes: unknown[] } | Record<string, unknown> | null | unknown[]>}
 */
export const createVideoInfoWithLLM = async ({ url: _url, options = {} } = {}) => {
  const { outputDir = PATHS.DOWNLOADS, chunkSize = 150 } = options;
  const previousContextChunks = 10;

  if (!fs.existsSync(outputDir)) {
    throw new Error(`createVideoInfoWithLLM: outputDir không tồn tại: ${outputDir}`);
  }

  // step 1
  const srts = fs.readdirSync(outputDir).filter(f => /\.srt$/i.test(f));
  if (srts.length === 0) {
    throw new Error(`createVideoInfoWithLLM: không tìm thấy file .srt trong ${outputDir}`);
  }
  const srtPath = path.join(outputDir, srts[0]);

  const allObjects = parseSrtToObjects(fs.readFileSync(srtPath, 'utf-8'));
  if (allObjects.length === 0) {
    console.warn('[createVideoInfoWithLLM] Không parse được cue SRT, trả về [].');
    return null;
  }

  const size = Math.max(1, Number(chunkSize) || 150);
  /** @type {{ id: string, timeline: string, text: string }[][]} */
  const chunks = [];
  for (let i = 0; i < allObjects.length; i += size) {
    chunks.push(allObjects.slice(i, i + size));
  }

  // Nếu chunk cuối quá nhỏ (< 50% size) thì gộp vào chunk trước
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.length < size * 0.5) {
      chunks[chunks.length - 2].push(...last);
      chunks.pop();
    }
  }

  const totalChunks = chunks.length;
  /** @type {(Record<string, unknown> | null)[]} */
  const chunkAnalyses = new Array(totalChunks).fill(null);

  let nextChunkIndex = 0;
  const activeConcurrency = Math.min(PLAYWRIGHT_PROFILES.length, totalChunks);

  async function workerProfile(workerIndex) {
    const profileNum = PLAYWRIGHT_PROFILES[workerIndex];
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
          if (!primingDone) {
            await openChatPage(pg);
            primingDone = true;
          }
          const transcript = objectsToIdTextFormat(chunks[i]);

          const previousContext =
            i > 0
              ? chunks
                  .slice(Math.max(0, i - previousContextChunks), i)
                  .map(c => objectsToIdTextFormat(c))
                  .join('\n')
              : '';

          const prompt = promptCreateSummaryFromTranscript({ transcript, previousContext });
          const raw = await sendPromptWithRetry(pg, prompt, {
            requireCodeBlock: false,
            validate: validateJsonResponse,
            maxRetries: 2,
            retryDelayMs: 2000,
            label: `[create-video-info] Chunk ${i + 1}/${totalChunks}`,
          });
          chunkAnalyses[i] = JSON.parse(stripJsonCodeFence(raw));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[create-video-info] Chunk ${i + 1}/${totalChunks} lỗi profile ${profileNum}: ${msg}`);
          chunkAnalyses[i] = null;
        }
        if (nextChunkIndex < totalChunks) {
          await pg.waitForTimeout(2000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));

  const sortedChunkAnalyses = chunkAnalyses.sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const aStart = Number(a.line_start);
    const bStart = Number(b.line_start);
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = Number(a.line_end);
    const bEnd = Number(b.line_end);
    return aEnd - bEnd;
  });

  // step 2
  const validAnalyses = sortedChunkAnalyses.filter(Boolean);
  const N = validAnalyses.length;
  if (N === 0) {
    console.warn('[createVideoInfoWithLLM] Không có chunkAnalyses hợp lệ.');
    return null;
  }

  const sendRetryOpts = {
    requireCodeBlock: false,
    validate: validateJsonResponse,
    maxRetries: 2,
    retryDelayMs: 2000,
  };

  /** @type {Record<string, unknown> | null} */
  let finalSummary = null;

  if (N <= 12) {
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
      ctx = opened.context;
      const pg = opened.page;
      await openChatPage(pg);
      const prompt = promptCreateFinalSummary(JSON.stringify(validAnalyses));
      const raw = await sendPromptWithRetry(pg, prompt, {
        ...sendRetryOpts,
        label: '[create-video-info] FinalSummary (direct)',
      });
      finalSummary = JSON.parse(stripJsonCodeFence(raw));
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  } else {
    const batches = N <= 23 ? [validAnalyses] : splitIntoBatches(validAnalyses);
    const batchCount = batches.length;
    /** @type {(Record<string, unknown> | null)[]} */
    const batchSectionResults = new Array(batchCount).fill(null);

    const mergeProfiles = PLAYWRIGHT_PROFILES.slice(0, MERGE_SECTION_MAX_PROFILES);
    let nextBatchIndex = 0;
    const mergeConcurrency = Math.min(MERGE_SECTION_MAX_PROFILES, batchCount);

    async function mergeBatchWorker(workerIndex) {
      const profileNum = mergeProfiles[workerIndex];
      /** @type {import('playwright').BrowserContext | null} */
      let wCtx = null;
      try {
        const opened = await openChromeProfile({ profile: profileNum, visible: true });
        wCtx = opened.context;
        const wPg = opened.page;
        let primingDone = false;

        while (true) {
          const i = nextBatchIndex++;
          if (i >= batchCount) break;
          try {
            if (!primingDone) {
              await openChatPage(wPg);
              primingDone = true;
            }
            const prompt = promptMergeSummaryToSection(JSON.stringify(batches[i]));
            const raw = await sendPromptWithRetry(wPg, prompt, {
              ...sendRetryOpts,
              label: `[create-video-info] Section batch ${i + 1}/${batchCount}`,
            });
            batchSectionResults[i] = JSON.parse(stripJsonCodeFence(raw));
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[create-video-info] Section batch ${i + 1}/${batchCount} lỗi profile ${profileNum}: ${msg}`);
            batchSectionResults[i] = null;
          }
          if (nextBatchIndex < batchCount) {
            await wPg.waitForTimeout(2000);
          }
        }
      } finally {
        if (wCtx) await wCtx.close().catch(() => {});
      }
    }

    await Promise.all(Array.from({ length: mergeConcurrency }, (_, w) => mergeBatchWorker(w)));

    const allSections = batchSectionResults.filter(Boolean).flatMap(r => (Array.isArray(r?.sections) ? r.sections : []));

    if (allSections.length === 0) {
      console.warn('[createVideoInfoWithLLM] Không có sections sau merge batch — không gọi promptMergeSectionToFinal.');
      return null;
    }

    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
      ctx = opened.context;
      const pg = opened.page;
      await openChatPage(pg);
      const prompt = promptMergeSectionToFinal({ sections: JSON.stringify(allSections) });
      const raw = await sendPromptWithRetry(pg, prompt, {
        ...sendRetryOpts,
        label: '[create-video-info] FinalSummary (sections)',
      });
      finalSummary = JSON.parse(stripJsonCodeFence(raw));
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  // step 3
  if (!finalSummary) return null;

  /** @type {Record<string, unknown> | null} */
  let visualBible = null;

  /** @type {import('playwright').BrowserContext | null} */
  let ctx = null;
  try {
    const opened = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
    ctx = opened.context;
    const pg = opened.page;
    await openChatPage(pg);

    const prompt = promptCreateVisualBible(JSON.stringify(finalSummary), visualStyle);
    const raw = await sendPromptWithRetry(pg, prompt, {
      ...sendRetryOpts,
      label: '[create-video-info] VisualBible',
    });
    visualBible = JSON.parse(stripJsonCodeFence(raw));
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }

  // step 4
  if (!visualBible || !Array.isArray(visualBible.chapter_visual_plan) || visualBible.chapter_visual_plan.length === 0) {
    return { finalSummary, visualBible, normalizedScenes: [] };
  }

  const chapterInputs = createAllScenePromptInputs(visualBible);
  const totalChapterInputs = chapterInputs.length;

  /** @type {(Record<string, unknown> | null)[]} */
  const sceneOutputs = new Array(totalChapterInputs).fill(null);

  const sceneProfiles = PLAYWRIGHT_PROFILES.slice(0, 3);
  let nextSceneIndex = 0;
  const sceneConcurrency = Math.min(3, totalChapterInputs);

  async function sceneWorker(workerIndex) {
    const profileNum = sceneProfiles[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let wCtx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum, visible: true });
      wCtx = opened.context;
      const wPg = opened.page;
      let primingDone = false;

      while (true) {
        const i = nextSceneIndex++;
        if (i >= totalChapterInputs) break;
        try {
          if (!primingDone) {
            await openChatPage(wPg);
            primingDone = true;
          }
          const prompt = promptCreateScenePromptsForChapter(chapterInputs[i]);
          const raw = await sendPromptWithRetry(wPg, prompt, {
            ...sendRetryOpts,
            label: `[create-video-info] Scene chapter ${i + 1}/${totalChapterInputs}`,
          });
          sceneOutputs[i] = JSON.parse(stripJsonCodeFence(raw));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[create-video-info] Scene chapter ${i + 1}/${totalChapterInputs} lỗi profile ${profileNum}: ${msg}`);
          sceneOutputs[i] = null;
        }
        if (nextSceneIndex < totalChapterInputs) {
          await wPg.waitForTimeout(2000);
        }
      }
    } finally {
      if (wCtx) await wCtx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: sceneConcurrency }, (_, w) => sceneWorker(w)));

  const allScenes = sceneOutputs.filter(Boolean).flatMap(o => (Array.isArray(o?.scenes) ? o.scenes : []));

  const normalizedScenes = allScenes.map((scene, index) => ({
    ...scene,
    global_scene_index: index + 1,
  }));

  return { finalSummary, visualBible, normalizedScenes };
};

export const getMaxScenesForChapter = chapter => {
  const text = [chapter.visual_goal, chapter.scene_description, chapter.emotion_to_show, ...(chapter.visual_keywords || [])]
    .join(' ')
    .toLowerCase();

  const strongMomentKeywords = [
    'reveal',
    'betrayal',
    'confrontation',
    'climax',
    'turning point',
    'shock',
    'anger',
    'breakdown',
    'confession',
    'resolution',
    '裏切り',
    '発覚',
    '対立',
    '衝突',
    '告白',
    '怒り',
    '絶望',
    '決意',
    '解決',
  ];

  const hasStrongMoment = strongMomentKeywords.some(keyword => text.includes(keyword));

  if (hasStrongMoment) return 3;

  const hasEnoughVisualBeats = Array.isArray(chapter.visual_keywords) && chapter.visual_keywords.length >= 3;

  if (hasEnoughVisualBeats) return 2;

  return 1;
};

const buildChapterSceneInput = (globalVisualBible, chapterIndex) => {
  const chapters = globalVisualBible.chapter_visual_plan;

  const currentChapter = chapters[chapterIndex];
  const previousChapter = chapters[chapterIndex - 1] || null;
  const nextChapter = chapters[chapterIndex + 1] || null;

  return {
    video_id: globalVisualBible.video_id,
    style: globalVisualBible.style,
    visual_bible: globalVisualBible.visual_bible,
    character_designs: globalVisualBible.character_designs,
    environment_design: globalVisualBible.environment_design,

    current_chapter: currentChapter,

    previous_chapter_context: previousChapter
      ? {
          chapter_id: previousChapter.chapter_id,
          visual_goal: previousChapter.visual_goal,
          scene_description: previousChapter.scene_description,
          emotion_to_show: previousChapter.emotion_to_show,
          visual_keywords: previousChapter.visual_keywords,
        }
      : null,

    next_chapter_context: nextChapter
      ? {
          chapter_id: nextChapter.chapter_id,
          visual_goal: nextChapter.visual_goal,
          scene_description: nextChapter.scene_description,
          emotion_to_show: nextChapter.emotion_to_show,
          visual_keywords: nextChapter.visual_keywords,
        }
      : null,

    scene_options: {
      max_scenes_for_this_chapter: getMaxScenesForChapter(currentChapter),
      aspect_ratio: '16:9',
      prompt_language: 'en',
      include_negative_prompt: true,
    },
  };
};

export const createAllScenePromptInputs = globalVisualBible => {
  return globalVisualBible.chapter_visual_plan.map((_, index) => buildChapterSceneInput(globalVisualBible, index));
};

const prepareVideoInfo = async ({ url, options = {} }) => {
  const {
    mode = MAKE_VIDEO_MODE.FROM_AUDIO,
    outputDir = PATHS.DOWNLOADS,
    downloadMaxHeight = 0,
    thumbnailChannelRoot,
    thumbnailPrompt,
    callback,
  } = options;

  const actualOutputDir = outputDir;

  if (!fs.existsSync(actualOutputDir)) {
    fs.mkdirSync(actualOutputDir, { recursive: true });
  } else {
    await clearOutputDirResilient(actualOutputDir);
  }

  const result = await Promise.allSettled([
    downloadVideo(url, { outputDir, maxHeight: downloadMaxHeight }),
    downloadTranscript(url, { outputDir, videoTitle: result.title }),
    downloadAudio(url, { outputDir }),
    downloadThumbnail(url, { outputDir }),
  ]);

  // handle update video meta with llm
};
