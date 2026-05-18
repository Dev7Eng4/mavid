export const SENIOR_LIFESTYLE_KEYWORDS = [
  '老後の暮らし',
  '一人暮らし',
  '孤独',
  '人間関係',
  '生きがい',
  '片付け',
  '終活',
  '生活習慣',
  '老後の幸せ',
];

export const SENIOR_LIFESTYLE_CONFIG = {
  id: 'senior_lifestyle_japan',
  label: 'Japanese Senior Lifestyle',
  language: 'ja',
  contentType: 'senior_lifestyle_audio',

  targetAudience: 'Japanese seniors and people preparing for retirement life.',
  audienceMindset: 'They want reassurance, practical life wisdom, emotional comfort, and ways to live better in old age.',

  primaryGoal: 'provide practical and emotional support for senior life',
  secondaryGoal: 'create calm, relatable, warm visuals',

  analysisFocus: [
    'senior life problem',
    'daily routine',
    'loneliness',
    'family relationship',
    'friendship',
    'home organization',
    'purpose in life',
    'retirement lifestyle',
    'emotional concern',
    'practical habit',
    'life lesson',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'senior lifestyle analysis',
    preserveTopicOrder: true,
    extractProblems: true,
    extractEmotionalNeeds: true,
    extractPracticalHabits: true,
    extractLifeLessons: true,
    extractVisualCandidates: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'senior_life_topic_synthesis',
    includeCoreConcern: true,
    includePracticalAdvice: true,
    includeEmotionalMessage: true,
    includeDailyLifeExamples: true,
    avoidOverlyNegativeTone: true,
  },

  metadataRules: {
    titleStyle: 'senior_friendly_lifestyle_ctr',
    allowCuriosityGap: true,
    allowMildEmotionalHook: true,
    avoidScaringViewers: true,

    preferredKeywords: [
      '老後の暮らし',
      'シニアライフ',
      '60代',
      '70代',
      '一人暮らし',
      '老後の孤独',
      '終活',
      '片付け',
      '生きがい',
      '人間関係',
      '老後の幸せ',
      '定年後',
    ],

    recommendedTitlePatterns: [
      '老後を穏やかに暮らすために手放したい習慣',
      '70代からの一人暮らしで大切にしたいこと',
      '定年後に孤独を感じない人の小さな習慣',
      '老後の暮らしを楽にする考え方',
    ],
  },

  chapterRules: {
    chapterStrategy: 'split_by_life_topics_and_emotional_points',
    requireLineRange: true,
    chapterTitleStyle: 'clear_warm_japanese',
    chapterTypes: [
      'problem_intro',
      'daily_life_example',
      'emotional_issue',
      'family_or_friendship',
      'habit_change',
      'practical_tip',
      'life_lesson',
      'calm_summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsRecurringCharacters: true,
    needsEnvironmentBible: true,

    heroImageType: 'relatable_senior_life_moment',
    visualMood: ['warm', 'calm', 'realistic', 'gentle', 'hopeful', 'not lonely in an exploitative way'],

    commonLocations: [
      'Japanese living room',
      'small kitchen',
      'neighborhood park',
      'shopping street',
      'community center',
      'quiet bedroom',
      'balcony with plants',
    ],

    preferredVisualObjects: ['tea cup', 'photo album', 'calendar', 'small plants', 'walking shoes', 'notebook', 'simple meal'],

    avoidVisuals: [
      'overly depressing lonely scenes',
      'hospital bed unless transcript supports it',
      'dark horror mood',
      'text inside image',
      'exaggerated poverty',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 90,
      maxSecondsPerScene: 160,
      recommendedFor30MinVideo: [14, 22],
      recommendedFor60MinVideo: [28, 40],
    },

    sceneTypes: [
      'quiet_home_life',
      'daily_routine',
      'lonely_moment',
      'small_habit',
      'family_memory',
      'community_connection',
      'decluttering',
      'hopeful_resolution',
    ],
  },

  safetyRules: {
    avoidAgeistTone: true,
    avoidExploitativeLonelinessHook: true,
    avoidMedicalOrFinancialClaimsUnlessSupported: true,
  },

  qualityRules: {
    mustKeepToneRespectful: true,
    mustKeepLineRanges: true,
    mustExtractPracticalAndEmotionalPoints: true,
  },
};
