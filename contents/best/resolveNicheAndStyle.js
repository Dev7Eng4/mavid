import { GLOBAL_VIDEO_CONFIG } from './niche-config/globalConfig.js';
import { NICHE_CONFIGS } from './niche-config/index.js';
import { VISUAL_STYLE_CONFIGS } from './visual-style/index.js';

export const DEFAULT_STYLE_BY_NICHE = {
  japanese_audio_drama: 'cinematic',
  japanese_soft_story: 'soft_anime',
  senior_health_japan: 'soft_anime',
  senior_finance_japan: 'semi_realistic_illustration',
  general_finance_japan: 'educational_illustration',
  gardening_japan: 'documentary_photo',
  senior_lifestyle_japan: 'soft_anime',
};

export function resolveVideoConfig({ niche, visualStyle, videoDurationSeconds = null, targetPlatform = 'youtube', language = 'ja' }) {
  const nicheConfig = NICHE_CONFIGS[niche];
  const visualStyleConfig = VISUAL_STYLE_CONFIGS[visualStyle];

  if (!nicheConfig) {
    throw new Error(`Unknown niche: ${niche}`);
  }

  if (!visualStyleConfig) {
    throw new Error(`Unknown visual style: ${visualStyle}`);
  }

  const compatibility = checkNicheStyleCompatibility(nicheConfig, visualStyleConfig);

  const resolvedConfig = {
    global: GLOBAL_VIDEO_CONFIG,
    niche: nicheConfig,
    visualStyle: visualStyleConfig,

    resolvedRules: {
      language,
      targetPlatform,
      outputType: GLOBAL_VIDEO_CONFIG.outputType,

      transcript: {
        preserveLineIds: true,
        requireLineRange: true,
        timestampMappingByCode: true,
      },

      analysis: {
        focus: nicheConfig.analysisFocus,
        chunkRules: nicheConfig.chunkAnalysisRules,
        finalRules: nicheConfig.finalAnalysisRules,
      },

      metadata: {
        ...nicheConfig.metadataRules,
        titleLanguage: 'ja',
        descriptionLanguage: 'ja',
        tagsLanguage: 'ja',
      },

      chapters: {
        ...nicheConfig.chapterRules,
        requireLineRange: true,
      },

      visuals: {
        ...nicheConfig.visualRules,
        styleId: visualStyleConfig.id,
        styleLabel: visualStyleConfig.label,
        basePromptTokens: visualStyleConfig.basePromptTokens,
        cameraTokens: visualStyleConfig.cameraTokens,
        lightingTokens: visualStyleConfig.lightingTokens,
        negativePromptTokens: [...GLOBAL_VIDEO_CONFIG.imageRules.forbidTextInImage, ...visualStyleConfig.negativePromptTokens],
      },

      scenes: {
        ...nicheConfig.sceneRules,
      },

      safety: {
        ...nicheConfig.safetyRules,
      },

      quality: {
        ...nicheConfig.qualityRules,
        includeQualityCheck: true,
      },
    },

    compatibility,
  };

  if (videoDurationSeconds) {
    resolvedConfig.resolvedRules.scenes.recommendedSceneCount = estimateSceneCount(
      videoDurationSeconds,
      nicheConfig.sceneRules.sceneDensity
    );
  }

  return resolvedConfig;
}

export function checkNicheStyleCompatibility(nicheConfig, visualStyleConfig) {
  const isBestFit = visualStyleConfig.bestForNiches.includes(nicheConfig.id);

  const warnings = [];

  if (!isBestFit) {
    warnings.push(`Visual style "${visualStyleConfig.id}" is not listed as a best-fit style for niche "${nicheConfig.id}".`);
  }

  if (nicheConfig.id === 'senior_health_japan' && visualStyleConfig.id === 'cinematic') {
    warnings.push(
      'Cinematic style may make senior health content feel too dramatic or fear-based. Consider soft_anime or educational_illustration.'
    );
  }

  if (nicheConfig.id === 'japanese_audio_drama' && visualStyleConfig.id === 'educational_illustration') {
    warnings.push('Educational illustration may reduce emotional impact for drama content. Consider cinematic.');
  }

  if (nicheConfig.id === 'general_finance_japan' && visualStyleConfig.id === 'anime') {
    warnings.push('Anime may reduce perceived trust for serious finance topics. Consider educational_illustration or documentary_photo.');
  }

  return {
    isBestFit,
    warnings,
  };
}

export function estimateSceneCount(videoDurationSeconds, sceneDensity) {
  const minCount = Math.ceil(videoDurationSeconds / sceneDensity.maxSecondsPerScene);
  const maxCount = Math.ceil(videoDurationSeconds / sceneDensity.minSecondsPerScene);

  return {
    min: minCount,
    max: maxCount,
    recommended: Math.round((minCount + maxCount) / 2),
  };
}
