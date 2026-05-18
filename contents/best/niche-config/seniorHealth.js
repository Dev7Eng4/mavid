export const SENIOR_HEALTH_KEYWORDS = [
  '高齢者 健康',
  '60代 70代 健康',
  '老後 健康習慣',
  '食事',
  '睡眠',
  '筋力',
  '認知症予防',
  '血糖値',
  '血圧',
  '腸活',
];

export const SENIOR_HEALTH_CONFIG = {
  id: 'senior_health_japan',
  label: 'Japanese Senior Health',
  language: 'ja',
  contentType: 'educational_health_audio',

  targetAudience: 'Japanese seniors, retirees, and caregivers interested in daily health, food, exercise, and aging well.',
  audienceMindset: 'They want practical, easy-to-understand, trustworthy advice without overly technical language.',

  primaryGoal: 'build trust and retention through clear, practical, senior-friendly health education',
  secondaryGoal: 'create calm, relatable visuals that support understanding',

  analysisFocus: [
    'main health topic',
    'target age group',
    'symptoms or warning signs mentioned',
    'daily habits',
    'food and nutrition points',
    'exercise or movement points',
    'sleep and lifestyle factors',
    'risk factors',
    'what is advice vs what is warning',
    'claims requiring caution',
    'doctor consultation points',
    'easy visual examples',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'health education analysis',
    preserveTopicOrder: true,
    extractHealthClaims: true,
    extractAdvicePoints: true,
    extractWarnings: true,
    extractLifestyleExamples: true,
    extractFoodExamples: true,
    extractExerciseExamples: true,
    identifyUnsupportedStrongClaims: true,
    avoidFearMongering: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'educational_topic_synthesis',
    includeMainHealthMessage: true,
    includeKeyTakeaways: true,
    includePracticalHabits: true,
    includeRiskWarnings: true,
    includeDisclaimerNotes: true,
    avoidDiagnosis: true,
    avoidTreatmentGuarantees: true,
    avoidOverstatingCausality: true,
  },

  metadataRules: {
    titleStyle: 'senior_friendly_health_ctr',
    titleLanguage: 'ja',
    descriptionLanguage: 'ja',
    tagsLanguage: 'ja',

    allowCuriosityGap: true,
    allowMildWarningHook: true,
    avoidFearBasedOverclaim: true,
    avoidCureClaims: true,
    avoidGuaranteedResults: true,
    avoidDoctorLikeDiagnosis: true,

    preferredKeywords: [
      '高齢者の健康',
      '60代',
      '70代',
      '老後の健康',
      '健康習慣',
      '食生活',
      '朝の習慣',
      '認知症予防',
      '血糖値',
      '血圧',
      '筋力低下',
      'フレイル予防',
      '睡眠',
      '腸活',
      'シニアライフ',
    ],

    recommendedTitlePatterns: [
      '70代から気をつけたい朝の習慣',
      '知らないうちに体を弱らせる食べ方',
      '高齢者が毎日続けたい小さな健康習慣',
      '医師に相談すべき体のサインとは',
    ],

    requiredDescriptionNote: 'This content is general educational information and should not replace professional medical advice.',
  },

  chapterRules: {
    chapterStrategy: 'split_by_health_topics_and_practical_steps',
    requireLineRange: true,
    chapterTitleStyle: 'clear_educational_japanese',
    idealChapterCountByDuration: {
      under_15_min: [3, 5],
      '15_30_min': [5, 7],
      '30_45_min': [6, 9],
      '45_60_min': [8, 12],
    },
    chapterTypes: [
      'topic_intro',
      'common_mistake',
      'body_mechanism_simple',
      'food_habit',
      'exercise_habit',
      'daily_lifestyle',
      'warning_sign',
      'practical_summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsRecurringCharacters: true,
    needsEnvironmentBible: true,

    heroImageType: 'relatable_senior_health_situation',
    visualMood: ['warm', 'calm', 'trustworthy', 'clean', 'senior-friendly', 'easy to understand'],

    recurringCharacters: [
      'elderly Japanese man',
      'elderly Japanese woman',
      'middle-aged caregiver',
      'friendly doctor or nutritionist only if transcript supports medical explanation',
    ],

    commonLocations: [
      'Japanese home kitchen',
      'dining table',
      'morning living room',
      'neighborhood walking path',
      'small clinic consultation room',
      'simple exercise space',
      'supermarket vegetable section',
    ],

    preferredVisualObjects: [
      'breakfast set',
      'tea cup',
      'vegetables',
      'rice bowl',
      'walking shoes',
      'blood pressure monitor if relevant',
      'calendar',
      'medicine box only if transcript supports it',
    ],

    avoidVisuals: [
      'scary hospital emergency scene unless transcript supports it',
      'surgery scene',
      'blood',
      'disease horror imagery',
      'before-after medical transformation',
      'fake medical chart text',
      'text inside image',
      'doctor making a definitive diagnosis',
      'overly young characters',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 90,
      maxSecondsPerScene: 180,
      recommendedFor30MinVideo: [12, 22],
      recommendedFor40MinVideo: [16, 26],
      recommendedFor60MinVideo: [24, 38],
    },

    sceneTypes: [
      'problem_intro',
      'daily_life_example',
      'bad_habit_example',
      'good_habit_example',
      'food_example',
      'exercise_example',
      'doctor_consultation',
      'warning_sign',
      'calm_summary',
    ],

    imagePromptRules: {
      includeSeniorCharacter: true,
      includeClearObject: true,
      avoidMedicalFear: true,
      noText: true,
      useReadableSimpleComposition: true,
    },
  },

  safetyRules: {
    requireMedicalDisclaimer: true,
    avoidDiagnosis: true,
    avoidTreatmentGuarantee: true,
    avoidCureClaims: true,
    avoidSpecificMedicationAdvice: true,
    avoidReplacingDoctorAdvice: true,
    useCautiousLanguage: true,

    forbiddenPhrasesMeaning: [
      'this will cure disease',
      'doctors do not want you to know',
      'guaranteed to prevent dementia',
      'stop taking medicine',
      'this food completely fixes blood sugar',
    ],

    preferredPhrasingStyle: [
      'may help',
      'is often said to support',
      'can be one useful habit',
      'consult a medical professional if symptoms continue',
      'general educational information',
    ],
  },

  qualityRules: {
    mustSeparateFactsAndAdvice: true,
    mustFlagUnsupportedHealthClaims: true,
    mustKeepLineRanges: true,
    mustAvoidFearMongering: true,
    mustIncludePracticalTakeaways: true,
  },
};
