// https://www.youtube.com/@ryonurse
// style
// 1. semi_realistic_illustration
// 2. documentary_photo
// 3. educational_illustration
// 4. soft_anime nếu kênh đang theo anime senior

export const PERSONAL_FINANCE_SOCIAL_SECURITY_RETIREMENT_JAPAN_CONFIG = {
  id: 'personal_finance_social_security_retirement_japan',
  parentNiche: 'senior_finance_japan',
  label: 'Japanese Personal Finance, Social Security, and Retirement Planning',
  language: 'ja',
  contentType: 'educational_retirement_finance_audio',

  targetAudience:
    'Japanese adults in their 50s to 70s, retirees, pre-retirees, pension recipients, caregivers, and people planning old-age household finances.',

  audienceMindset:
    'They worry about pensions, retirement living costs, healthcare costs, long-term care, social insurance, taxes, working after retirement, asset drawdown, and avoiding financial mistakes.',

  primaryGoal: 'provide trustworthy, practical, non-personalized retirement finance education for Japanese viewers',

  secondaryGoal:
    'create calm, serious, easy-to-understand visuals that support pension, household budget, social security, and retirement planning topics',

  analysisFocus: [
    'main retirement finance topic',
    'public pension issue',
    'social security system reference',
    'retirement living cost',
    'healthcare cost',
    'long-term care cost',
    'household budget',
    'tax or insurance contribution if mentioned',
    'NISA or asset formation if mentioned',
    'working after retirement',
    'family support or caregiving cost',
    'fraud or scam risk',
    'practical planning steps',
    'claims requiring legal, tax, or financial caution',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'retirement finance and social security analysis',
    preserveTopicOrder: true,
    extractPensionReferences: true,
    extractSocialSecurityReferences: true,
    extractRetirementCostItems: true,
    extractHealthcareAndCareCostPoints: true,
    extractHouseholdBudgetTips: true,
    extractAssetFormationPoints: true,
    extractScamWarnings: true,
    identifyUnsupportedFinancialClaims: true,
    identifyOutdatedPolicyRisk: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'retirement_finance_social_security_synthesis',
    includeMainMoneyProblem: true,
    includeSystemContext: true,
    includePracticalLessons: true,
    includeRiskWarnings: true,
    includeActionableButGeneralPlanningSteps: true,
    includeDisclaimerNotes: true,
    avoidPersonalizedFinancialAdvice: true,
    avoidLegalOrTaxCertainty: true,
    avoidGuarantees: true,
  },

  metadataRules: {
    titleStyle: 'trustworthy_practical_retirement_finance_ctr',
    titleLanguage: 'ja',
    descriptionLanguage: 'ja',
    tagsLanguage: 'ja',

    allowCuriosityGap: true,
    allowMildFearHook: true,
    avoidExtremeFearMongering: true,
    avoidGuaranteedSavingsClaims: true,
    avoidSpecificInvestmentInstruction: true,
    avoidFakeGovernmentBenefitClaims: true,
    avoidOutdatedPolicyClaims: true,

    preferredKeywords: [
      '年金',
      '老後資金',
      '退職後のお金',
      '定年後',
      '年金生活',
      '老後の生活費',
      '社会保険',
      '介護保険',
      '医療費',
      '介護費',
      '新NISA',
      'iDeCo',
      '資産形成',
      '家計管理',
      '老後破産',
      '高齢者のお金',
      '在職老齢年金',
      '働きながら年金',
      '詐欺対策',
    ],

    recommendedTitlePatterns: [
      '年金生活で見落としやすいお金の落とし穴',
      '老後資金を守るために確認したい社会保障の基本',
      '退職後のお金で後悔しないための考え方',
      '65歳からの生活費で注意したい固定費',
      '老後に医療費と介護費で困らないための備え',
      '定年後も働く人が年金で確認したいこと',
    ],

    requiredDescriptionNote:
      'この動画は一般的なお金・社会保障・老後設計に関する情報であり、個別の金融・税務・法律アドバイスではありません。制度や金額は変更される場合があるため、必要に応じて公的機関や専門家にご確認ください。',
  },

  chapterRules: {
    chapterStrategy: 'split_by_retirement_finance_topics_social_security_systems_and_practical_planning_steps',
    requireLineRange: true,
    chapterTitleStyle: 'clear_trustworthy_educational_japanese',
    idealChapterCountByDuration: {
      under_15_min: [4, 6],
      '15_30_min': [5, 8],
      '30_45_min': [7, 10],
      '45_60_min': [9, 13],
    },
    chapterTypes: [
      'topic_intro',
      'pension_context',
      'living_cost_breakdown',
      'healthcare_cost',
      'long_term_care_cost',
      'social_insurance',
      'tax_or_contribution_caution',
      'asset_formation',
      'retirement_work',
      'family_care_cost',
      'scam_warning',
      'planning_steps',
      'practical_summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsRecurringCharacters: true,
    needsEnvironmentBible: true,

    heroImageType: 'trustworthy_retirement_money_planning_scene',

    visualMood: ['serious', 'calm', 'trustworthy', 'practical', 'empathetic', 'not hopeless', 'not hype-driven'],

    recurringCharacters: [
      'Japanese senior couple',
      'elderly Japanese man checking budget',
      'elderly Japanese woman reviewing pension envelope',
      'middle-aged adult child helping parent',
      'financial planner or municipal consultation staff only if supported',
    ],

    commonLocations: [
      'Japanese home dining table',
      'small apartment living room',
      'home desk',
      'municipal consultation counter if supported',
      'bank consultation desk if supported',
      'family dining room',
      'quiet office consultation room',
    ],

    preferredVisualObjects: [
      'household budget notebook',
      'calculator',
      'wallet',
      'calendar',
      'pension envelope without readable text',
      'blank documents',
      'coins and bills',
      'laptop with unreadable screen',
      'family photo frame',
      'care cost folder without readable text',
    ],

    avoidVisuals: [
      'luxury cars',
      'casino imagery',
      'cash rain',
      'stock market panic',
      'crypto hype',
      'guaranteed profit symbols',
      'fake readable official documents',
      'readable yen amounts',
      'readable pension notices',
      'text inside image',
      'exaggerated poverty',
      'overly hopeless elderly depiction',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 75,
      maxSecondsPerScene: 130,
      recommendedFor30MinVideo: [20, 26],
      recommendedFor40MinVideo: [26, 34],
      recommendedFor60MinVideo: [38, 50],
    },

    sceneTypes: [
      'retirement_money_intro',
      'pension_notice_scene',
      'household_budget_review',
      'fixed_expense_check',
      'medical_cost_concern',
      'long_term_care_planning',
      'social_security_consultation',
      'nisa_asset_formation',
      'retirement_work_income',
      'family_discussion',
      'scam_warning',
      'planning_checklist_mood',
      'calm_summary',
    ],

    imagePromptRules: {
      includeSeniorOrPreRetireeCharacter: true,
      includeClearMoneyObject: true,
      includePlanningContext: true,
      noReadableDocuments: true,
      noText: true,
      avoidHypeOrPanicTone: true,
      useRespectfulSeniorDepiction: true,
    },
  },

  safetyRules: {
    requireFinancialDisclaimer: true,
    requireSocialSecurityDisclaimer: true,
    avoidPersonalizedFinancialAdvice: true,
    avoidSpecificInvestmentBuySellAdvice: true,
    avoidGuaranteedReturns: true,
    avoidGuaranteedSavingsAmount: true,
    avoidTaxLegalCertaintyUnlessSupported: true,
    avoidFakeGovernmentBenefitClaims: true,
    avoidOutdatedPolicySpecificity: true,
    useGeneralInformationFraming: true,
    recommendOfficialSourceCheckWhenPolicySpecific: true,

    forbiddenPhrasesMeaning: [
      'guaranteed to make money',
      'everyone should invest in this',
      'you will definitely save this amount',
      'this law always applies to you',
      'do this immediately or lose everything',
      'the government will definitely pay you this amount',
      'this strategy is risk-free',
      'this NISA method guarantees retirement security',
    ],

    preferredPhrasingStyle: [
      'may be worth checking',
      'rules can vary depending on your situation',
      'confirm with official sources',
      'consult a tax, legal, or financial professional if needed',
      'general educational information',
      'one possible planning perspective',
    ],
  },

  qualityRules: {
    mustSeparateGeneralInfoFromAdvice: true,
    mustFlagPolicySpecificClaimsForVerification: true,
    mustFlagUnsupportedFinancialClaims: true,
    mustKeepLineRanges: true,
    mustAvoidGuarantees: true,
    mustAvoidFakeUrgency: true,
    mustIncludeRiskNotes: true,
    mustIncludeOfficialSourceReminderWhenNeeded: true,
  },
};
