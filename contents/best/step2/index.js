import { openChatPage, sendPromptWithRetry } from '../../llm/browser.util.js';
import { validateJsonResponse } from '../../llm/text.util.js';
import openChromeProfile from '../../scripts/makeChromeProfile.js';
import { promptStep2FinalContentAnalysis } from './prompt.js';
import { validateStep2Output } from './validate.js';

export function pickStep2Rules(resolvedConfig) {
  return {
    content_type: resolvedConfig.niche.contentType,

    final_analysis_rules: resolvedConfig.niche.finalAnalysisRules,

    metadata_rules: resolvedConfig.niche.metadataRules,

    chapter_rules: resolvedConfig.niche.chapterRules,

    visual_rules: {
      needsVisualBible: resolvedConfig.niche.visualRules.needsVisualBible,
      needsCharacterBible: resolvedConfig.niche.visualRules.needsCharacterBible,
      needsRecurringCharacters: resolvedConfig.niche.visualRules.needsRecurringCharacters,
      heroImageType: resolvedConfig.niche.visualRules.heroImageType,
      visualMood: resolvedConfig.niche.visualRules.visualMood,
      commonLocations: resolvedConfig.niche.visualRules.commonLocations,
      preferredVisualObjects: resolvedConfig.niche.visualRules.preferredVisualObjects,
      avoidVisuals: resolvedConfig.niche.visualRules.avoidVisuals,
    },

    scene_rules: {
      sceneDensity: resolvedConfig.niche.sceneRules.sceneDensity,
      sceneTypes: resolvedConfig.niche.sceneRules.sceneTypes,
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
  resolvedConfig,
  options = {
    language: 'ja',
    outputType: 'audio_image_video',
    targetPlatform: 'youtube',
    videoDurationSeconds: 100,
  }
) {
  const step2Rules = pickStep2Rules(resolvedConfig);

  const { context, page } = await openChromeProfile({ profile: 1, visible: true });

  await openChatPage(page, { thinkingMode: false });

  const prompt = promptStep2FinalContentAnalysis({
    videoContext: {
      niche_id: resolvedConfig.niche.id,
      visual_style_id: resolvedConfig.visualStyle.id,
      language: options.language,
      output_type: options.outputType,
      target_platform: options.targetPlatform,
      video_duration_seconds: options.videoDurationSeconds,
    },
    step2Rules,
    chunkAnalyses,
  });

  const result = await sendPromptWithRetry(page, prompt, {
    requireCodeBlock: false,
    validate: validateJsonResponse,
    maxRetries: 2,
    retryDelayMs: 3000,
    label: `[best/step2] Final Content Analysis`,
  });

  await context.close();

  const finalAnalysis = JSON.parse(result);

  validateStep2Output(finalAnalysis);

  return finalAnalysis;
}
