import fs from 'fs';
import path from 'path';

import { PATHS } from '../constants/paths.js';
import { PLAYWRIGHT_PROFILES } from '../constants/playwright-profile.js';
import { openChatPage, sendPromptWithRetry, stripJsonCodeFence } from '../llm/index.js';
import {
  promptCreateFinalSynthesis,
  promptCreateScenePromptsForChapter,
  promptCreateSummaryFromTranscript,
  promptCreateVisualBible,
  promptMergeSummaryToSection,
} from '../prompts/new/createVideoInfo.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { objectsToIdTextFormat, parseSrtToObjects } from '../utils/srt.util.js';
import downloadVideo, {
  clearOutputDirResilient,
  downloadAudio,
  downloadThumbnail,
  downloadTranscript,
  getVideoInfo,
} from './downloadVideo.js';
import { generateFlowThumbnailFromGemini } from './thumbnail/generateFlowThumbnail.js';
import { runCreateThumbnailFlow } from './thumbnail/runCreateThumbnailFlow.js';
import { MAKE_VIDEO_MODE } from '../constants/index.js';
import { internalUpdateTranscript } from './transcriptPipeline.js';
import { detectVideoLang } from '../utils/detectLanguage.util.js';

const MERGE_SECTION_BATCH_SIZE = 12;
const MERGE_SECTION_MAX_PROFILES = 4;
const PREVIOUS_CONTEXT_CHUNKS = 10;
const CHUNK_SIZE = 150;
const GENERAL_IMAGE_NAME = 'background';
const VIDEO_META_FILE = 'video-meta.json';
const FLOW_THUMBNAIL_FILENAME = 'flow-thumbnail.jpg';

/**
 * @param {Record<string, unknown>|null|undefined} meta
 * @returns {boolean}
 */
function hasNonEmptySeoTitleAndDescription(meta) {
  if (!meta || typeof meta !== 'object') return false;
  const seoTitle = String(meta.seoTitle ?? '').trim();
  const seoDescription = String(meta.seoDescription ?? '').trim();
  return seoTitle !== '' && seoDescription !== '';
}

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

function getSegmentsForChapter(microSegments, chapter) {
  return microSegments.filter(segment => {
    return segment.line_start <= chapter.line_end && segment.line_end >= chapter.line_start;
  });
}

function buildChapterSceneInput(globalVisualBible, microSegments, chapterIndex) {
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

    chapter_source_segments: getSegmentsForChapter(microSegments, currentChapter),

    previous_chapter_context: previousChapter
      ? {
          chapter_id: previousChapter.chapter_id,
          line_start: previousChapter.line_start,
          line_end: previousChapter.line_end,
          visual_goal: previousChapter.visual_goal,
          emotion_to_show: previousChapter.emotion_to_show,
        }
      : null,

    next_chapter_context: nextChapter
      ? {
          chapter_id: nextChapter.chapter_id,
          line_start: nextChapter.line_start,
          line_end: nextChapter.line_end,
          visual_goal: nextChapter.visual_goal,
          emotion_to_show: nextChapter.emotion_to_show,
        }
      : null,

    scene_options: {
      max_scenes_for_this_chapter: getMaxScenesForChapter(currentChapter),
      aspect_ratio: '16:9',
      prompt_language: 'en',
      include_negative_prompt: true,
      require_line_ranges: true,
      require_character_ids: true,
    },
  };
}

function sanitizeFilenameBase(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .slice(0, 120);
}

/**
 * Đọc transcript (.srt) trong outputDir → chunk LLM → merge thành final summary (JSON).
 * @param {{ options?: { outputDir?: string, chunkSize?: number } }} options
 * @returns {Promise<{ finalSummary: Record<string, unknown> | null, visualBible: Record<string, unknown> | null, normalizedScenes: unknown[] } | Record<string, unknown> | null | unknown[]>}
 */
export const createVideoInfoWithLLM = async (options = {}) => {
  const {
    outputDir = PATHS.DOWNLOADS,
    chunkSize = CHUNK_SIZE,
    visualStyle = VISUAL_STYLE_PRESETS.cinematic,
    generateGeneralImage = false,
    generateSceneImages = false,
  } = options;

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
    return { finalSummary: null };
  }

  const chunks = [];
  for (let i = 0; i < allObjects.length; i += chunkSize) {
    chunks.push(allObjects.slice(i, i + chunkSize));
  }

  // Nếu chunk cuối quá nhỏ (< 50% chunkSize) thì gộp vào chunk trước
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.length < chunkSize * 0.5) {
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

          let previousContext = '';
          if (i > 0) {
            const startIdx = i * chunkSize - PREVIOUS_CONTEXT_CHUNKS;
            const endIdx = i * chunkSize;
            const prevObjects = allObjects.slice(Math.max(0, startIdx), endIdx);
            previousContext = objectsToIdTextFormat(prevObjects);
          }

          const prompt = promptCreateSummaryFromTranscript(transcript, previousContext);
          const raw = await sendPromptWithRetry(pg, prompt, {
            requireCodeBlock: false,
            label: `[create-video-info] Chunk ${i + 1}/${totalChunks}`,
          });
          chunkAnalyses[i] = JSON.parse(stripJsonCodeFence(raw));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[create-video-info] Chunk ${i + 1}/${totalChunks} lỗi profile ${profileNum}: ${msg}`);
          chunkAnalyses[i] = null;
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

  const sortedChunkAnalyses = chunkAnalyses.filter(Boolean).sort((a, b) => {
    const aStart = Number(a.line_start);
    const bStart = Number(b.line_start);
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = Number(a.line_end);
    const bEnd = Number(b.line_end);
    return aEnd - bEnd;
  });

  // step 2
  const validAnalyses = sortedChunkAnalyses.map(a => a.micro_segments).flat();

  const N = validAnalyses.length;

  if (N === 0) {
    console.warn('[createVideoInfoWithLLM] Không có chunkAnalyses hợp lệ.');
    return { finalSummary: null };
  }

  const sendRetryOpts = {
    requireCodeBlock: false,
  };

  /** @type {Record<string, unknown> | null} */
  let finalSummary = null;

  /** @type {(Record<string, unknown> | null)[] | null} */
  let batchSectionResults = null;
  /** @type {'direct' | 'sections_single_batch' | 'sections_multi_batch' | null} */
  let mergeStrategy = null;

  if (N <= 12) {
    mergeStrategy = 'direct';
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
      ctx = opened.context;
      const pg = opened.page;
      await openChatPage(pg);
      const prompt = promptCreateFinalSynthesis(JSON.stringify(validAnalyses));
      const raw = await sendPromptWithRetry(pg, prompt, {
        ...sendRetryOpts,
        label: '[create-video-info] FinalSummary (direct)',
      });
      finalSummary = JSON.parse(stripJsonCodeFence(raw));
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  } else {
    mergeStrategy = N <= 23 ? 'sections_single_batch' : 'sections_multi_batch';
    const batches = N <= 23 ? [validAnalyses] : splitIntoBatches(validAnalyses);
    const batchCount = batches.length;
    batchSectionResults = new Array(batchCount).fill(null);

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
      const prompt = promptCreateFinalSynthesis(JSON.stringify(allSections));
      const raw = await sendPromptWithRetry(pg, prompt, {
        ...sendRetryOpts,
        label: '[create-video-info] FinalSummary (sections)',
      });
      finalSummary = JSON.parse(stripJsonCodeFence(raw));
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  // step 3 — visual bible khi cần hero và/hoặc scene images
  if (!finalSummary || (!generateGeneralImage && !generateSceneImages)) {
    return { finalSummary };
  }
  console.log('call visual bible');

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
  if (
    !generateSceneImages ||
    !visualBible ||
    !Array.isArray(visualBible.chapter_visual_plan) ||
    visualBible.chapter_visual_plan.length === 0
  ) {
    return {
      finalSummary,
      visualBible,
      generalPrompt: visualBible?.hero_image_package?.prompt ?? '',
    };
  }

  const chapterInputs = createAllScenePromptInputs(visualBible, validAnalyses);
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

const createAllScenePromptInputs = (globalVisualBible, microSegments) => {
  return globalVisualBible.chapter_visual_plan.map((chapter, index) => buildChapterSceneInput(globalVisualBible, microSegments, index));
};

async function runFlowImagesAfterVideoInfo({ actualOutputDir, generalPrompt }) {
  if (generalPrompt) {
    try {
      await runCreateThumbnailFlow({
        prompt: generalPrompt,
        pathSave: actualOutputDir,
        exportName: GENERAL_IMAGE_NAME,
        isNeedImage: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[prepareVideoInfo] Flow hero: ${msg}`);
    }
  }

  // if (generateSceneImages && Array.isArray(normalizedScenes) && normalizedScenes.length > 0) {
  //   const imagesDir = path.join(actualOutputDir, 'generated-images');
  //   fs.mkdirSync(imagesDir, { recursive: true });
  //   flowOut.sceneDir = imagesDir;
  //   flowOut.sceneTotal = normalizedScenes.length;

  //   for (let i = 0; i < normalizedScenes.length; i++) {
  //     const scene = normalizedScenes[i];
  //     const flowPrompt = buildImageFlowPrompt(scene?.prompt, scene?.negative_prompt);
  //     if (!flowPrompt) {
  //       console.warn(`[prepareVideoInfo] Scene ${i + 1}: bỏ qua — không có prompt.`);
  //       continue;
  //     }
  //     const idx = scene.global_scene_index ?? i + 1;
  //     const exportName = `scene_${idx}`;
  //     try {
  //       await runCreateThumbnailFlow({
  //         prompt: flowPrompt,
  //         pathSave: imagesDir,
  //         exportName,
  //         isNeedImage: false,
  //       });
  //       flowOut.sceneSuccessCount += 1;
  //     } catch (e) {
  //       const msg = e instanceof Error ? e.message : String(e);
  //       console.warn(`[prepareVideoInfo] Flow ${exportName}: ${msg}`);
  //     }
  //   }
  // }
}

const prepareVideoInfo = async ({ url, options = {} }) => {
  const {
    mode = MAKE_VIDEO_MODE.FROM_AUDIO,
    outputDir = PATHS.DOWNLOADS,
    downloadMaxHeight = 0,
    thumbnailOptions = {
      prompt: '',
      needImage: false,
    },
    generateGeneralImage = false,
    generateSceneImages = false,
    visualStyle = VISUAL_STYLE_PRESETS.cinematic,
    onlyUpdateInfo = false,
  } = options;

  const actualOutputDir = outputDir;

  if (onlyUpdateInfo) {
    if (!fs.existsSync(actualOutputDir)) {
      console.warn(`[prepareVideoInfo] onlyUpdateInfo: outputDir không tồn tại: ${actualOutputDir}`);
      return { ok: false };
    }

    const metaPath = path.join(actualOutputDir, VIDEO_META_FILE);
    if (!fs.existsSync(metaPath)) {
      console.warn(`[prepareVideoInfo] onlyUpdateInfo: không tìm thấy ${metaPath}`);
      return { ok: false };
    }
    /** @type {Record<string, unknown>} */
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[prepareVideoInfo] onlyUpdateInfo: không đọc được video-meta.json: ${msg}`);
      return { ok: false };
    }

    /** @type {Record<string, unknown>} */
    let workingMeta = { ...meta };

    if (!hasNonEmptySeoTitleAndDescription(workingMeta)) {
      const srts = fs.readdirSync(actualOutputDir).filter(f => /\.srt$/i.test(f));
      if (srts.length === 0) {
        console.warn(
          `[prepareVideoInfo] onlyUpdateInfo: thiếu seoTitle/seoDescription cần LLM nhưng không có file .srt trong ${actualOutputDir}`,
        );
        return { ok: false };
      }

      const llmResult = await createVideoInfoWithLLM({
        outputDir: actualOutputDir,
        visualStyle,
        generateGeneralImage: false,
        generateSceneImages: false,
      });

      const finalSummary = 'finalSummary' in llmResult ? llmResult.finalSummary : null;
      const visualBible = 'visualBible' in llmResult ? llmResult.visualBible : undefined;
      const generalPrompt = 'generalPrompt' in llmResult ? llmResult.generalPrompt : undefined;

      if (!finalSummary) {
        console.warn('[prepareVideoInfo] onlyUpdateInfo: createVideoInfoWithLLM không trả về finalSummary');
        return { ok: false };
      }

      const title = finalSummary?.metadata?.title || '';
      workingMeta = {
        ...workingMeta,
        seoTitle: title,
        seoDescription: finalSummary?.metadata?.description || '',
        seoTags: finalSummary?.metadata?.tags || '',
        summary: finalSummary?.final_summary,
        visualBible,
        generalPrompt,
      };
      fs.writeFileSync(metaPath, JSON.stringify(workingMeta, null, 2), 'utf-8');
    }

    const transcriptLang =
      typeof workingMeta.transcriptLang === 'string' && workingMeta.transcriptLang.trim()
        ? workingMeta.transcriptLang.trim()
        : detectVideoLang(String(workingMeta.title ?? ''));

    const flowThumbPath = path.join(actualOutputDir, FLOW_THUMBNAIL_FILENAME);
    if (!fs.existsSync(flowThumbPath)) {
      const titleForThumb = String(workingMeta.seoTitle ?? '').trim();
      const summaryForThumb = workingMeta.summary;
      if (titleForThumb && summaryForThumb) {
        try {
          await generateFlowThumbnailFromGemini({
            title: titleForThumb,
            summary: summaryForThumb,
            outputDir: actualOutputDir,
            language: transcriptLang,
            thumbnailPromptKey: thumbnailOptions.prompt ?? '',
            logTag: 'prepare-video-info-only-update',
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[prepareVideoInfo] onlyUpdateInfo Flow thumbnail: ${msg}`);
        }
      } else {
        console.warn(
          '[prepareVideoInfo] onlyUpdateInfo: chưa có flow-thumbnail.jpg nhưng thiếu seoTitle hoặc summary để gọi generateFlowThumbnailFromGemini',
        );
      }
    }

    return {
      ok: true,
      onlyUpdateInfo: true,
      videoId: String(workingMeta.videoId ?? ''),
      lang: transcriptLang,
    };
  }

  if (!fs.existsSync(actualOutputDir)) {
    fs.mkdirSync(actualOutputDir, { recursive: true });
  } else {
    await clearOutputDirResilient(actualOutputDir);
  }

  const videoMeta = await getVideoInfo(url);
  console.log('🚀 ~ prepareVideoInfo ~ videoMeta:', videoMeta);
  const videoTitle = String(videoMeta?.title ?? '');

  const downloadResults = await Promise.allSettled([
    downloadTranscript(url, { outputDir: actualOutputDir, videoTitle }),
    downloadThumbnail(url, { outputDir: actualOutputDir }),
    mode === MAKE_VIDEO_MODE.REUP_FULL ? downloadVideo(url, { outputDir: actualOutputDir, maxHeight: downloadMaxHeight }) : null,
    mode === MAKE_VIDEO_MODE.FROM_AUDIO ? downloadAudio(url, { outputDir: actualOutputDir }) : null,
  ]);

  if (mode === MAKE_VIDEO_MODE.FROM_AUDIO) {
    const srts = fs
      .readdirSync(actualOutputDir)
      .filter(f => /\.srt$/i.test(f))
      .sort((a, b) => a.localeCompare(b));
    if (srts.length === 0) {
      console.warn(`[prepareVideoInfo] FROM_AUDIO: không tìm thấy file .srt trong ${actualOutputDir}, bỏ qua internalUpdateTranscript.`);
    } else {
      const srtPath = path.join(actualOutputDir, srts[0]);
      const rawSrtFromFile = fs.readFileSync(srtPath, 'utf-8');
      const updatedTranscript = await internalUpdateTranscript(rawSrtFromFile, {
        language: 'ja',
      });
      fs.writeFileSync(srtPath, updatedTranscript.trim() + '\n', 'utf-8');

      const cleanedBackupPath = `${srtPath}.cleaned`;
      if (fs.existsSync(cleanedBackupPath)) {
        fs.unlinkSync(cleanedBackupPath);
      }
      for (const f of fs.readdirSync(actualOutputDir)) {
        if (/\.vtt$/i.test(f)) {
          const vttPath = path.join(actualOutputDir, f);
          fs.unlinkSync(vttPath);
        }
      }
    }
  }

  const transcriptLang = downloadResults[0]?.value?.transcriptLang ?? 'ja';

  const llmResult = await createVideoInfoWithLLM({
    outputDir: actualOutputDir,
    visualStyle,
    generateGeneralImage,
    generateSceneImages,
  });

  const finalSummary = 'finalSummary' in llmResult ? llmResult.finalSummary : null;
  const visualBible = 'visualBible' in llmResult ? llmResult.visualBible : null;
  const generalPrompt = 'generalPrompt' in llmResult ? llmResult.generalPrompt : undefined;
  const title = finalSummary?.metadata?.title || '';
  const summary = finalSummary?.final_summary;

  // save video info to video-meta.json
  const videoMetaData = {
    title: videoMeta.title,
    description: videoMeta.description || '',
    tags: videoMeta.tags,
    seoTitle: title,
    seoDescription: finalSummary?.metadata?.description || '',
    seoTags: finalSummary?.metadata?.tags || '',
    lang: transcriptLang,
    summary,
    visualBible,
    generalPrompt,
  };
  fs.writeFileSync(path.join(actualOutputDir, VIDEO_META_FILE), JSON.stringify(videoMetaData, null, 2), 'utf-8');

  const flowImages = await runFlowImagesAfterVideoInfo({
    actualOutputDir,
    generalPrompt: generateGeneralImage && generalPrompt ? generalPrompt : '',
    // generateSceneImages,
    // normalizedScenes,
  });

  if (title && summary) {
    try {
      await generateFlowThumbnailFromGemini({
        title,
        summary,
        outputDir: actualOutputDir,
        language: transcriptLang,
        thumbnailPromptKey: thumbnailOptions.prompt ?? '',
        logTag: 'prepare-video-info',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[prepareVideoInfo] Thumbnail Flow (title/summary): ${msg}`);
    }
  }

  return {
    videoId: videoMeta.metadata?.id ?? '',
    lang: transcriptLang,
  };
};

export default prepareVideoInfo;
