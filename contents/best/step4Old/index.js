import { openChatPage, sendPromptWithRetry, validateJsonResponse } from '../../llm/index.js';
import { openChromeProfile } from '../../scripts/makeChromeProfile.js';
import { promptStep4ScenePlanning } from './prompt.js';
import { validateStep4Output } from './validate.js';

function buildChapterSourceMaterial(chapters, chunkAnalyses) {
  return chapters.map(chapter => {
    const chapterStart = chapter.line_range.start_line_id;
    const chapterEnd = chapter.line_range.end_line_id;

    const inRange = item => {
      const start = item.line_range?.start_line_id;
      const end = item.line_range?.end_line_id;
      return start <= chapterEnd && end >= chapterStart;
    };

    const important_points = [];
    const visual_candidates = [];
    const entities = [];
    const content_units = {
      timeline_events: [],
      topic_points: [],
      financial_points: [],
      procedure_steps: [],
    };

    for (const chunk of chunkAnalyses) {
      important_points.push(...(chunk.important_points || []).filter(inRange));
      visual_candidates.push(...(chunk.visual_candidates || []).filter(inRange));
      entities.push(...(chunk.entities || []));

      const units = chunk.content_units || {};
      content_units.timeline_events.push(...(units.timeline_events || []).filter(inRange));
      content_units.topic_points.push(...(units.topic_points || []).filter(inRange));
      content_units.financial_points.push(...(units.financial_points || []).filter(inRange));
      content_units.procedure_steps.push(...(units.procedure_steps || []).filter(inRange));
    }

    return {
      chapter_id: chapter.chapter_id,
      chapter_line_range: chapter.line_range,
      important_points,
      visual_candidates,
      entities,
      content_units,
    };
  });
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

export async function main(
  chunkAnalyses,
  finalAnalysis,
  visualPackage,
  resolvedConfig,
  options = {
    language: 'ja',
    outputType: 'audio_image_video',
    targetPlatform: 'youtube',
    videoDurationSeconds: 100,
  }
) {
  const step4Rules = pickStep4Rules(resolvedConfig);

  const chapterSourceMaterial = buildChapterSourceMaterial(finalAnalysis.chapters, chunkAnalyses);

  const prompt = promptStep4ScenePlanning({
    videoContext: {
      niche_id: resolvedConfig.niche.id,
      visual_style_id: resolvedConfig.visualStyle.id,
      language: options.language,
      output_type: options.outputType,
      target_platform: options.targetPlatform,
      video_duration_seconds: options.videoDurationSeconds,
    },
    step4Rules,
    finalAnalysis: {
      final_summary: finalAnalysis.final_summary,
      content_structure: finalAnalysis.content_structure,
      chapters: finalAnalysis.chapters,
      safety_notes: finalAnalysis.safety_notes,
    },
    chapterSourceMaterial,
    visualPackage: visualPackage,
  });

  const { context, page } = await openChromeProfile({ profile: 1, visible: true });

  await openChatPage(page, { thinkingMode: false });

  const result = await sendPromptWithRetry(page, prompt, {
    requireCodeBlock: false,
    validate: validateJsonResponse,
    maxRetries: 2,
    retryDelayMs: 3000,
    label: `[best/step4] Scene Planning`,
  });

  const scenePlan = JSON.parse(result);

  validateStep4Output(scenePlan);

  return scenePlan;
}
