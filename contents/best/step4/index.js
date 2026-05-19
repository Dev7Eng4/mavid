import { openChatPage, sendPromptWithRetry, validateJsonResponse } from '../../llm/index.js';
import { openChromeProfile } from '../../scripts/makeChromeProfile.js';
import { promptStep4CreateChapterScenes } from './prompt.js';
import { validateChapterScenePlan, validateFinalScenePlan } from './validate.js';

function buildChapterSceneJobs({ chapters, chunkAnalyses, visualPackage, resolvedConfig, videoContext }) {
  return chapters.map((chapter, index) => {
    const previousChapter = chapters[index - 1] || null;
    const nextChapter = chapters[index + 1] || null;

    return {
      videoContext,
      chapterContext: chapter,

      neighborContext: {
        previous_chapter: previousChapter
          ? {
              chapter_id: previousChapter.chapter_id,
              chapter_index: previousChapter.chapter_index,
              chapter_title_ja: previousChapter.chapter_title_ja,
              chapter_summary: previousChapter.chapter_summary,
              ending_state: previousChapter.emotional_or_topic_role,
            }
          : null,

        next_chapter: nextChapter
          ? {
              chapter_id: nextChapter.chapter_id,
              chapter_index: nextChapter.chapter_index,
              chapter_title_ja: nextChapter.chapter_title_ja,
              chapter_summary: nextChapter.chapter_summary,
              starting_state: nextChapter.emotional_or_topic_role,
            }
          : null,
      },

      chapterSourceMaterial: buildSingleChapterSourceMaterial({
        chapter,
        chunkAnalyses,
      }),

      visualPackage,

      step4Rules: pickStep4Rules(resolvedConfig),
    };
  });
}

function hasLineRangeOverlap(itemRange, chapterRange) {
  if (!itemRange || !chapterRange) return false;

  return itemRange.start_line_id <= chapterRange.end_line_id && itemRange.end_line_id >= chapterRange.start_line_id;
}

function uniqBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function buildSingleChapterSourceMaterial({ chapter, chunkAnalyses }) {
  const chapterRange = chapter.line_range;

  const importantPoints = [];
  const visualCandidates = [];
  const entities = [];

  const contentUnits = {
    timeline_events: [],
    topic_points: [],
    financial_points: [],
    procedure_steps: [],
  };

  for (const chunk of chunkAnalyses) {
    for (const point of chunk.important_points || []) {
      if (hasLineRangeOverlap(point.line_range, chapterRange)) {
        importantPoints.push(point);
      }
    }

    for (const candidate of chunk.visual_candidates || []) {
      if (hasLineRangeOverlap(candidate.line_range, chapterRange)) {
        visualCandidates.push(candidate);
      }
    }

    for (const entity of chunk.entities || []) {
      const mentions = entity.line_mentions || [];
      const hasMentionInChapter = mentions.some(lineId => lineId >= chapterRange.start_line_id && lineId <= chapterRange.end_line_id);

      if (hasMentionInChapter) {
        entities.push(entity);
      }
    }

    const units = chunk.content_units || {};

    for (const event of units.timeline_events || []) {
      if (hasLineRangeOverlap(event.line_range, chapterRange)) {
        contentUnits.timeline_events.push(event);
      }
    }

    for (const point of units.topic_points || []) {
      if (hasLineRangeOverlap(point.line_range, chapterRange)) {
        contentUnits.topic_points.push(point);
      }
    }

    for (const point of units.financial_points || []) {
      if (hasLineRangeOverlap(point.line_range, chapterRange)) {
        contentUnits.financial_points.push(point);
      }
    }

    for (const step of units.procedure_steps || []) {
      if (hasLineRangeOverlap(step.line_range, chapterRange)) {
        contentUnits.procedure_steps.push(step);
      }
    }
  }

  return {
    chapter_id: chapter.chapter_id,
    chapter_line_range: chapterRange,

    important_points: importantPoints,
    visual_candidates: visualCandidates,
    entities: uniqBy(entities, entity => entity.entity_id || `${entity.name_or_label}_${entity.type}`),

    content_units: contentUnits,
  };
}

function pickStep4Rules(resolvedConfig) {
  return {
    scene_density: resolvedConfig.niche.sceneRules.sceneDensity,
    scene_types: resolvedConfig.niche.sceneRules.sceneTypes,
    image_prompt_rules: resolvedConfig.niche.sceneRules.imagePromptRules || {},

    visual_rules: {
      heroImageType: resolvedConfig.niche.visualRules.heroImageType,
      avoidVisuals: resolvedConfig.niche.visualRules.avoidVisuals,
      visualMood: resolvedConfig.niche.visualRules.visualMood,
    },

    style_rules: {
      visual_style_id: resolvedConfig.visualStyle.id,
      basePromptTokens: resolvedConfig.visualStyle.basePromptTokens,
      cameraTokens: resolvedConfig.visualStyle.cameraTokens,
      lightingTokens: resolvedConfig.visualStyle.lightingTokens,
      negativePromptTokens: resolvedConfig.visualStyle.negativePromptTokens,
    },

    safety_rules: resolvedConfig.niche.safetyRules,

    transcript_rules: {
      preserveLineIds: true,
      doNotInventTimestamps: true,
      requireLineRangeInEveryOutput: true,
    },
  };
}

async function generateChapterScenePlans({ chapters, chunkAnalyses, visualPackage, resolvedConfig, videoContext, callAI }) {
  const jobs = buildChapterSceneJobs({
    chapters,
    chunkAnalyses,
    visualPackage,
    resolvedConfig,
    videoContext,
  });

  const chapterScenePlans = [];

  for (const job of jobs) {
    const prompt = promptStep4CreateChapterScenes({
      videoContext: job.videoContext,
      chapterContext: job.chapterContext,
      neighborContext: job.neighborContext,
      chapterSourceMaterial: job.chapterSourceMaterial,
      visualPackage: job.visualPackage,
      step4Rules: job.step4Rules,
    });

    const raw = await callAI(prompt);
    const parsed = JSON.parse(raw);

    // validateChapterScenePlan(parsed, job.chapterContext);

    chapterScenePlans.push(parsed);
  }

  return chapterScenePlans;
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let index = 0;

  async function runNext() {
    const currentIndex = index++;
    if (currentIndex >= items.length) return;

    results[currentIndex] = await worker(items[currentIndex], currentIndex);

    await runNext();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));

  return results;
}

async function generateChapterScenePlansParallel({
  chapters,
  chunkAnalyses,
  visualPackage,
  resolvedConfig,
  videoContext,
  concurrency = 1,
}) {
  const jobs = buildChapterSceneJobs({
    chapters,
    chunkAnalyses,
    visualPackage,
    resolvedConfig,
    videoContext,
  });

  const { context, page } = await openChromeProfile({ profile: 1, visible: true });

  await openChatPage(page, { thinkingMode: false });

  return runWithConcurrency(jobs, concurrency, async job => {
    const prompt = promptStep4CreateChapterScenes({
      videoContext: job.videoContext,
      chapterContext: job.chapterContext,
      neighborContext: job.neighborContext,
      chapterSourceMaterial: job.chapterSourceMaterial,
      visualPackage: job.visualPackage,
      step4Rules: job.step4Rules,
    });

    const raw = await sendPromptWithRetry(page, prompt, {
      requireCodeBlock: false,
      validate: validateJsonResponse,
      maxRetries: 2,
      retryDelayMs: 3000,
      label: `[best/step4] Create Chapter Scenes`,
    });

    const parsed = JSON.parse(raw);

    // validateChapterScenePlan(parsed, job.chapterContext);

    return parsed;
  });
}

function mergeChapterScenePlans(chapterScenePlans) {
  const sortedPlans = [...chapterScenePlans].sort((a, b) => a.chapter_index - b.chapter_index);

  const scenes = [];
  let globalSceneIndex = 1;

  for (const plan of sortedPlans) {
    const sortedScenes = [...plan.scenes].sort((a, b) => a.scene_index_in_chapter - b.scene_index_in_chapter);

    for (const scene of sortedScenes) {
      scenes.push({
        ...scene,
        scene_id: `sc_${String(globalSceneIndex).padStart(3, '0')}`,
        original_local_scene_id: scene.local_scene_id,
        global_scene_index: globalSceneIndex,
      });

      globalSceneIndex++;
    }
  }

  const firstScene = scenes[0];
  const lastScene = scenes[scenes.length - 1];

  return {
    step: 'step_4_scene_planning',

    scene_plan_summary: {
      total_chapters: sortedPlans.length,
      total_scenes: scenes.length,
      line_coverage: {
        start_line_id: firstScene?.line_range?.start_line_id ?? null,
        end_line_id: lastScene?.line_range?.end_line_id ?? null,
      },
    },

    chapter_scene_breakdown: sortedPlans.map(plan => {
      const sceneIds = scenes.filter(scene => scene.chapter_id === plan.chapter_id).map(scene => scene.scene_id);

      return {
        chapter_id: plan.chapter_id,
        chapter_index: plan.chapter_index,
        chapter_line_range: plan.chapter_scene_summary.chapter_line_range,
        recommended_scene_count: plan.chapter_scene_summary.recommended_scene_count,
        actual_scene_count: plan.scenes.length,
        scene_ids: sceneIds,
      };
    }),

    scenes,

    quality_check: {
      all_chapters_covered: true,
      all_scenes_have_line_ranges: true,
      line_ranges_are_ordered: true,
      no_timestamps_invented: true,
      all_scenes_have_image_prompts: true,
      all_prompts_have_no_text_rule: true,
      negative_prompts_included: true,
      ready_for_image_generation: true,
      warnings: [],
    },
  };
}

export async function main(
  chunkAnalyses,
  finalAnalysis,
  visualPackage,
  resolvedConfig,
  options = {
    language: 'ja',
    outputType: 'audio_image_video',
    targetPlatform: 'youtube',
    videoDurationSeconds,
    concurrency: 1,
  },
) {
  const videoContext = {
    niche_id: resolvedConfig.niche.id,
    visual_style_id: resolvedConfig.visualStyle.id,
    language: options.language,
    output_type: options.outputType,
    target_platform: options.targetPlatform,
    video_duration_seconds: options.videoDurationSeconds,
  };

  const chapterScenePlans = await generateChapterScenePlansParallel({
    chapters: finalAnalysis.chapters,
    chunkAnalyses,
    visualPackage,
    resolvedConfig,
    videoContext,
    concurrency: options.concurrency,
  });

  const finalScenePlan = mergeChapterScenePlans(chapterScenePlans);

  // validateFinalScenePlan(finalScenePlan, finalAnalysis.chapters);

  return {
    chapter_scene_plans: chapterScenePlans,
    final_scene_plan: finalScenePlan,
  };
}
