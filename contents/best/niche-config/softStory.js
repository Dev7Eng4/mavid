export const SOFT_STORY_KEYWORDS = ['感動する話', '心温まる話', '人生の話', '田舎暮らし', '家族の絆', '老後の気づき', '優しい物語'];

export const SOFT_STORY_CONFIG = {
  id: 'japanese_soft_story',
  label: 'Japanese Soft Emotional Story',
  language: 'ja',
  contentType: 'soft_story',

  targetAudience: 'Japanese listeners who enjoy calm, emotional, nostalgic, and heartwarming stories.',
  audienceMindset: 'They want empathy, life lessons, nostalgia, gentle emotions, and satisfying emotional closure.',

  primaryGoal: 'create emotional comfort and long listening retention',
  secondaryGoal: 'generate warm, calm, story-driven visuals',

  analysisFocus: [
    'main character',
    'life situation',
    'emotional wound',
    'important memory',
    'family relationship',
    'small turning point',
    'kindness',
    'regret',
    'forgiveness',
    'life lesson',
    'emotional resolution',
    'nostalgic visual moments',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'emotional life-story analysis',
    preserveNarrativeOrder: true,
    extractCharacters: true,
    extractEmotionalShifts: true,
    extractLifeLessons: true,
    extractMemorableObjects: true,
    extractVisualCandidates: true,
    avoidOverDramatization: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'gentle_story_synthesis',
    includeEmotionalArc: true,
    includeCoreLifeMessage: true,
    includeSymbolicObjects: true,
    includeEndingFeeling: true,
    avoidMakingStoryTooSensational: true,
  },

  metadataRules: {
    titleStyle: 'gentle_emotional_japanese',
    allowCuriosityGap: true,
    allowWarmEmotionalHook: true,
    avoidAggressiveClickbait: true,

    preferredKeywords: ['感動する話', '泣ける話', '心温まる話', '人生の話', '家族の絆', '老後', '朗読', '物語', '人間模様'],

    recommendedTitlePatterns: [
      '亡き母が残した一通の手紙に、私は涙が止まらなかった',
      '定年後に出会った小さな約束が、人生を変えた',
      '誰にも言えなかった父の本音を、最後に知りました',
    ],
  },

  chapterRules: {
    chapterStrategy: 'split_by_emotional_life_beats',
    requireLineRange: true,
    chapterTitleStyle: 'soft_clear_japanese',
    idealChapterCountByDuration: {
      under_15_min: [3, 5],
      '15_30_min': [5, 7],
      '30_60_min': [7, 10],
    },
    chapterTypes: [
      'daily_life_setup',
      'memory',
      'emotional_problem',
      'encounter',
      'realization',
      'forgiveness',
      'life_lesson',
      'quiet_resolution',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: true,
    needsEnvironmentBible: true,
    heroImageType: 'most_emotional_or_symbolic_moment',

    visualMood: ['warm', 'nostalgic', 'gentle', 'quiet', 'emotional', 'soft Japanese everyday life'],

    commonLocations: [
      'old Japanese home',
      'quiet countryside road',
      'small kitchen',
      'family dining table',
      'train station',
      'hospital room if supported',
      'park in autumn',
      'riverside',
    ],

    avoidVisuals: ['aggressive confrontation', 'dark revenge mood', 'horror lighting', 'exaggerated crying', 'text inside image'],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 90,
      maxSecondsPerScene: 150,
      recommendedFor30MinVideo: [14, 22],
      recommendedFor60MinVideo: [28, 42],
    },

    sceneTypes: [
      'quiet_daily_life',
      'memory_flashback',
      'symbolic_object',
      'family_conversation',
      'lonely_moment',
      'realization',
      'gentle_resolution',
    ],
  },

  safetyRules: {
    avoidExploitingTragedy: true,
    avoidGraphicDepictions: true,
  },

  qualityRules: {
    mustPreserveGentleTone: true,
    mustNotOverClickbait: true,
    mustKeepLineRanges: true,
    mustExtractCoreLifeMessage: true,
  },
};
