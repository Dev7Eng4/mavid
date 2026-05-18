export const GARDENING_KEYWORDS = ['家庭菜園', 'ガーデニング', '野菜作り', '花の育て方', '土作り', '水やり', '肥料', '害虫対策'];

export const GARDENING_CONFIG = {
  id: 'gardening_japan',
  label: 'Japanese Gardening',
  language: 'ja',
  contentType: 'how_to_gardening_audio',

  targetAudience: 'Japanese home gardeners, beginners, seniors, and people interested in vegetables, flowers, and seasonal gardening.',
  audienceMindset: 'They want practical steps, common mistakes, seasonal timing, and clear visual examples.',

  primaryGoal: 'make gardening instructions easy to understand and visually clear',
  secondaryGoal: 'create peaceful, useful, step-by-step visuals',

  analysisFocus: [
    'plant type',
    'season',
    'soil condition',
    'watering',
    'sunlight',
    'fertilizer',
    'pest control',
    'tools',
    'step-by-step procedure',
    'common mistakes',
    'expected result',
    'visual demonstration opportunities',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'how-to procedural analysis',
    preserveStepOrder: true,
    extractPlantNames: true,
    extractMaterials: true,
    extractTools: true,
    extractSeasonalTiming: true,
    extractStepByStepActions: true,
    extractMistakes: true,
    extractVisualCandidates: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'gardening_procedure_synthesis',
    includeMainPlantOrTopic: true,
    includeMaterials: true,
    includeStepOrder: true,
    includeCommonMistakes: true,
    includeSeasonalWarnings: true,
    avoidInventingPlantDetails: true,
  },

  metadataRules: {
    titleStyle: 'searchable_practical_japanese_how_to',
    allowCuriosityGap: true,
    avoidOverDrama: true,

    preferredKeywords: [
      '家庭菜園',
      'ガーデニング',
      '野菜作り',
      '花の育て方',
      '土作り',
      '水やり',
      '肥料',
      '害虫対策',
      '初心者',
      'プランター栽培',
      '庭づくり',
      'シニア gardening',
    ],

    recommendedTitlePatterns: [
      '初心者でも失敗しにくい〇〇の育て方',
      '家庭菜園でやりがちな水やりの間違い',
      '〇〇を元気に育てるための土作りの基本',
      '植える前に知っておきたい〇〇のコツ',
    ],
  },

  chapterRules: {
    chapterStrategy: 'split_by_steps_and_care_topics',
    requireLineRange: true,
    chapterTitleStyle: 'clear_how_to_japanese',
    chapterTypes: [
      'intro_result',
      'materials',
      'soil_preparation',
      'planting',
      'watering',
      'sunlight',
      'fertilizer',
      'pest_control',
      'common_mistake',
      'final_care_summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsEnvironmentBible: true,
    heroImageType: 'beautiful_result_or_clear_action',

    visualMood: ['fresh', 'bright', 'peaceful', 'natural', 'clean', 'beginner-friendly'],

    commonLocations: [
      'Japanese home garden',
      'balcony planter area',
      'small vegetable garden',
      'greenhouse',
      'sunny backyard',
      'table with gardening tools',
    ],

    preferredVisualObjects: [
      'soil',
      'planter',
      'watering can',
      'gardening gloves',
      'seedlings',
      'vegetables',
      'flowers',
      'fertilizer bag without readable text',
      'small shovel',
    ],

    avoidVisuals: [
      'wrong plant species',
      'unrealistic giant vegetables',
      'messy unclear hands',
      'fake readable labels',
      'text inside image',
      'fantasy garden',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 60,
      maxSecondsPerScene: 120,
      recommendedFor30MinVideo: [18, 30],
      recommendedFor60MinVideo: [35, 55],
    },

    sceneTypes: [
      'final_result_preview',
      'materials_overview',
      'soil_closeup',
      'planting_action',
      'watering_action',
      'sunlight_example',
      'fertilizer_example',
      'pest_warning',
      'mistake_example',
      'healthy_growth_result',
    ],

    imagePromptRules: {
      includePlantOrObject: true,
      includeAction: true,
      includeClearHandsOrToolsWhenNeeded: true,
      noText: true,
      avoidWrongSpecies: true,
    },
  },

  safetyRules: {
    avoidDangerousChemicalInstructions: true,
    avoidUnsupportedPesticideClaims: true,
    recommendSafeHandlingWhenChemicalsMentioned: true,
  },

  qualityRules: {
    mustPreserveStepOrder: true,
    mustIdentifyPlantTypeIfMentioned: true,
    mustKeepLineRanges: true,
    mustExtractMaterialsAndActions: true,
  },
};
