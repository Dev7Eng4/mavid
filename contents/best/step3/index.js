import { openChatPage, sendPromptWithRetry } from '../../llm/browser.util.js';
import { validateJsonResponse } from '../../llm/text.util.js';
import openChromeProfile from '../../scripts/makeChromeProfile.js';
import { promptStep3VisualBibleAndHeroImage } from './prompt.js';
import { validateStep3Output } from './validate.js';

function pickStep3Rules(resolvedConfig) {
  return {
    visual_style_config: {
      id: resolvedConfig.visualStyle.id,
      label: resolvedConfig.visualStyle.label,
      description: resolvedConfig.visualStyle.description,
      basePromptTokens: resolvedConfig.visualStyle.basePromptTokens,
      cameraTokens: resolvedConfig.visualStyle.cameraTokens,
      lightingTokens: resolvedConfig.visualStyle.lightingTokens,
      colorMoodTokens: resolvedConfig.visualStyle.colorMoodTokens,
      compositionRules: resolvedConfig.visualStyle.compositionRules,
      negativePromptTokens: resolvedConfig.visualStyle.negativePromptTokens,
      promptBehavior: resolvedConfig.visualStyle.promptBehavior,
    },

    visual_rules: {
      needsVisualBible: resolvedConfig.niche.visualRules.needsVisualBible,
      needsCharacterBible: resolvedConfig.niche.visualRules.needsCharacterBible,
      needsRecurringCharacters: resolvedConfig.niche.visualRules.needsRecurringCharacters,
      needsEnvironmentBible: resolvedConfig.niche.visualRules.needsEnvironmentBible,
      heroImageType: resolvedConfig.niche.visualRules.heroImageType,
      visualMood: resolvedConfig.niche.visualRules.visualMood,
      commonLocations: resolvedConfig.niche.visualRules.commonLocations,
      preferredVisualObjects: resolvedConfig.niche.visualRules.preferredVisualObjects,
      recurringCharacters: resolvedConfig.niche.visualRules.recurringCharacters,
      avoidVisuals: resolvedConfig.niche.visualRules.avoidVisuals,
    },

    safety_rules: resolvedConfig.niche.safetyRules,

    image_rules: {
      imagePromptLanguage: resolvedConfig.global.imageRules.imagePromptLanguage,
      generatedImageMustNotContainText: resolvedConfig.global.imageRules.generatedImageMustNotContainText,
      forbidTextInImage: resolvedConfig.global.imageRules.forbidTextInImage,
      defaultAspectRatio: resolvedConfig.global.imageRules.defaultAspectRatio,
      defaultCanvas: resolvedConfig.global.imageRules.defaultCanvas,
    },
  };
}

export async function main(
  finalAnalysis,
  resolvedConfig,
  options = {
    language: 'ja',
    outputType: 'audio_image_video',
    targetPlatform: 'youtube',
    videoDurationSeconds: 100,
  }
) {
  const step3Rules = pickStep3Rules(resolvedConfig);

  const prompt = promptStep3VisualBibleAndHeroImage({
    videoContext: {
      niche_id: resolvedConfig.niche.id,
      visual_style_id: resolvedConfig.visualStyle.id,
      language: options.language,
      output_type: options.outputType,
      target_platform: options.targetPlatform,
      video_duration_seconds: options.videoDurationSeconds,
    },
    step3Rules,
    finalAnalysis,
    selectedHeroMoment: null,
  });

  const { context, page } = await openChromeProfile({ profile: 1, visible: true });

  await openChatPage(page, { thinkingMode: false });

  const result = await sendPromptWithRetry(page, prompt, {
    requireCodeBlock: false,
    validate: validateJsonResponse,
    maxRetries: 2,
    retryDelayMs: 3000,
    label: `[best/step3] Visual Bible and Hero Image`,
  });

  const visualPackage = JSON.parse(result);

  validateStep3Output(visualPackage);

  return visualPackage;
}
