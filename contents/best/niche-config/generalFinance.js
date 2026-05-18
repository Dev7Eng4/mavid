export const GENERAL_FINANCE_KEYWORDS = ['投資', '節約', '家計管理', 'NISA', '副業', '税金', '保険', '貯金'];

export const GENERAL_FINANCE_CONFIG = {
  id: 'general_finance_japan',
  label: 'Japanese General Finance',
  language: 'ja',
  contentType: 'educational_finance_audio',

  targetAudience: 'Japanese adults interested in saving, investing, household finance, taxes, insurance, and income improvement.',
  audienceMindset: 'They want practical money knowledge, mistakes to avoid, and clear explanations.',

  primaryGoal: 'provide clear and useful financial education',
  secondaryGoal: 'create professional, clean visuals that support understanding',

  analysisFocus: [
    'main financial topic',
    'saving or investment concept',
    'household finance issue',
    'risk and return',
    'tax or system references',
    'insurance or loan topic',
    'common mistake',
    'practical framework',
    'claims requiring caution',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'finance education analysis',
    preserveTopicOrder: true,
    extractFinancialConcepts: true,
    extractRiskWarnings: true,
    extractActionableGeneralTips: true,
    extractExamples: true,
    identifyUnsupportedClaims: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'finance_topic_synthesis',
    includeKeyConcepts: true,
    includeRiskNotes: true,
    includePracticalFramework: true,
    avoidPersonalizedAdvice: true,
    avoidGuarantees: true,
  },

  metadataRules: {
    titleStyle: 'clear_finance_ctr',
    allowCuriosityGap: true,
    avoidGetRichQuickTone: true,
    avoidGuaranteedProfit: true,

    preferredKeywords: [
      'お金の勉強',
      '家計管理',
      '節約',
      '貯金',
      '投資初心者',
      'NISA',
      '新NISA',
      '税金',
      '保険',
      '副業',
      '資産形成',
      'お金の知識',
    ],

    recommendedTitlePatterns: [
      'お金が貯まらない人が見落とす家計の落とし穴',
      '投資初心者が最初に知るべき考え方',
      '知らないと損しやすいお金の基本',
      '家計を整えるために見直したい習慣',
    ],
  },

  chapterRules: {
    chapterStrategy: 'split_by_financial_concepts',
    requireLineRange: true,
    chapterTitleStyle: 'clear_educational_japanese',
    chapterTypes: [
      'problem_intro',
      'basic_concept',
      'common_mistake',
      'risk_explanation',
      'example_case',
      'practical_framework',
      'summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsEnvironmentBible: true,
    heroImageType: 'clear_money_problem_or_solution_scene',

    visualMood: ['professional', 'clean', 'modern', 'trustworthy', 'calm'],

    commonLocations: ['home desk', 'office desk', 'kitchen table with household budget', 'modern Japanese apartment', 'consultation room'],

    preferredVisualObjects: [
      'laptop with unreadable screen',
      'calculator',
      'notebook',
      'wallet',
      'coins and bills',
      'documents without readable text',
    ],

    avoidVisuals: [
      'stock ticker text',
      'crypto hype',
      'luxury lifestyle exaggeration',
      'cash rain',
      'guaranteed profit symbols',
      'readable charts with fake numbers',
      'text inside image',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 90,
      maxSecondsPerScene: 150,
      recommendedFor30MinVideo: [14, 22],
      recommendedFor60MinVideo: [28, 42],
    },

    sceneTypes: [
      'money_problem',
      'household_budget',
      'concept_explanation',
      'mistake_example',
      'risk_warning',
      'practical_action',
      'summary',
    ],
  },

  safetyRules: {
    requireFinancialDisclaimer: true,
    avoidPersonalizedFinancialAdvice: true,
    avoidGuaranteedReturns: true,
    avoidTaxLegalCertaintyUnlessSupported: true,
    avoidSpecificBuySellRecommendations: true,
  },

  qualityRules: {
    mustFlagUnsupportedFinancialClaims: true,
    mustKeepLineRanges: true,
    mustAvoidGetRichQuickTone: true,
    mustIncludeRiskNotes: true,
  },
};
