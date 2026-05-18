export const SENIOR_FINANCE_KEYWORDS = [
  '年金だけ生活',
  '老後資金',
  '生活費',
  '介護費',
  '医療費',
  '老後破産',
  '節約',
  '退職後のお金',
  'シニア詐欺対策',
];

export const SENIOR_FINANCE_CONFIG = {
  id: 'senior_finance_japan',
  label: 'Japanese Senior Finance',
  language: 'ja',
  contentType: 'educational_senior_finance_audio',

  targetAudience: 'Japanese retirees, seniors, and people preparing for retirement.',
  audienceMindset: 'They worry about pensions, living costs, medical expenses, family money problems, scams, and retirement security.',

  primaryGoal: 'provide practical, trustworthy retirement money education',
  secondaryGoal: 'create serious but empathetic visuals for senior viewers',

  analysisFocus: [
    'pension-related issue',
    'retirement living cost',
    'household budget',
    'medical or care expense',
    'savings problem',
    'family financial conflict',
    'scam or fraud risk',
    'public system or benefit mentioned',
    'money mistake',
    'practical prevention tips',
    'claims requiring caution',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'senior finance topic analysis',
    preserveTopicOrder: true,
    extractFinancialProblems: true,
    extractPracticalTips: true,
    extractRiskWarnings: true,
    extractPensionReferences: true,
    extractScamPatterns: true,
    extractFamilyMoneyConflict: true,
    identifyUnsupportedFinancialClaims: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'retirement_finance_synthesis',
    includeMainMoneyProblem: true,
    includePracticalLessons: true,
    includeRiskWarnings: true,
    includeActionableButGeneralTips: true,
    avoidPersonalizedFinancialAdvice: true,
    avoidGuarantees: true,
  },

  metadataRules: {
    titleStyle: 'serious_practical_senior_money_ctr',
    allowCuriosityGap: true,
    allowMildFearHook: true,
    avoidExtremeFearMongering: true,
    avoidGuaranteedSavingsClaims: true,
    avoidSpecificInvestmentInstruction: true,

    preferredKeywords: [
      '年金生活',
      '年金だけ生活',
      '老後資金',
      '老後破産',
      '定年後',
      '退職後のお金',
      'シニアのお金',
      '生活費',
      '医療費',
      '介護費',
      '節約',
      '貯金',
      '詐欺対策',
      '老後の暮らし',
    ],

    recommendedTitlePatterns: [
      '年金だけで暮らす人が見落としやすい出費',
      '老後資金を減らす意外な習慣',
      '退職後に後悔しないためのお金の考え方',
      '高齢者が気をつけたいお金の落とし穴',
    ],

    requiredDescriptionNote: 'This content is general educational information and is not personalized financial advice.',
  },

  chapterRules: {
    chapterStrategy: 'split_by_financial_topics_and_risk_points',
    requireLineRange: true,
    chapterTitleStyle: 'clear_serious_japanese',
    idealChapterCountByDuration: {
      under_15_min: [3, 5],
      '15_30_min': [5, 7],
      '30_45_min': [6, 9],
      '45_60_min': [8, 12],
    },
    chapterTypes: [
      'money_problem_intro',
      'pension_context',
      'expense_breakdown',
      'common_mistake',
      'family_money_issue',
      'scam_warning',
      'practical_tip',
      'summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsRecurringCharacters: true,
    needsEnvironmentBible: true,

    heroImageType: 'elderly_person_facing_money_concern',
    visualMood: ['serious', 'empathetic', 'realistic', 'calm', 'not overly dark'],

    recurringCharacters: [
      'elderly Japanese man checking household budget',
      'elderly Japanese woman looking at pension notice',
      'senior couple discussing expenses',
      'adult child helping parents with documents',
    ],

    commonLocations: [
      'Japanese dining table',
      'small apartment living room',
      'kitchen table with household budget',
      'bank counter if transcript supports it',
      'city office consultation desk if transcript supports it',
      'quiet home office',
    ],

    preferredVisualObjects: [
      'household budget notebook',
      'calculator',
      'pension notice envelope without readable text',
      'wallet',
      'coins and bills',
      'utility bill without readable text',
      'calendar',
    ],

    avoidVisuals: [
      'luxury cars',
      'casino imagery',
      'stock market panic unless transcript supports it',
      'guaranteed profit imagery',
      'fake readable documents',
      'text inside image',
      'overly miserable poverty imagery',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 90,
      maxSecondsPerScene: 150,
      recommendedFor30MinVideo: [14, 22],
      recommendedFor40MinVideo: [18, 28],
      recommendedFor60MinVideo: [28, 42],
    },

    sceneTypes: [
      'pension_life_intro',
      'budget_check',
      'unexpected_expense',
      'mistake_example',
      'scam_warning',
      'family_discussion',
      'saving_tip',
      'consultation_scene',
      'calm_summary',
    ],

    imagePromptRules: {
      includeSeniorCharacter: true,
      includeMoneyObject: true,
      noReadableDocuments: true,
      noText: true,
      avoidPanicTone: true,
    },
  },

  safetyRules: {
    requireFinancialDisclaimer: true,
    avoidPersonalizedFinancialAdvice: true,
    avoidInvestmentGuarantee: true,
    avoidTaxOrLegalCertaintyUnlessTranscriptSupports: true,
    avoidFakeGovernmentBenefitClaims: true,
    useGeneralInformationFraming: true,

    forbiddenPhrasesMeaning: [
      'guaranteed to make money',
      'everyone should invest in this',
      'you will definitely save this amount',
      'this law always applies to you',
      'do this immediately or lose everything',
    ],
  },

  qualityRules: {
    mustSeparateGeneralInfoFromAdvice: true,
    mustFlagUnsupportedMoneyClaims: true,
    mustKeepLineRanges: true,
    mustAvoidFinancialGuarantees: true,
    mustIncludePracticalLessons: true,
  },
};
