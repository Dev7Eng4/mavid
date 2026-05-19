// Y học lão khoa kết hợp dinh dưỡng học thực hành
// https://www.youtube.com/@%E3%82%B7%E3%83%8B%E3%82%A2%E3%81%99%E3%81%93%E3%82%84%E3%81%8B%E7%94%9F%E6%B4%BB1

export const SENIOR_GERIATRIC_NUTRITION_CONFIG = {
  id: 'senior_geriatric_nutrition_japan',
  parentNiche: 'senior_health_japan',
  label: 'Japanese Geriatric Medicine + Practical Nutrition',
  language: 'ja',
  contentType: 'educational_geriatric_nutrition_audio',

  targetAudience:
    'Japanese seniors, retirees, caregivers, and adults caring for elderly parents who want practical nutrition knowledge based on geriatric health concepts.',

  audienceMindset:
    'They want trustworthy, calm, practical explanations about how daily meals affect muscle, bones, hydration, frailty, blood sugar, appetite, and healthy ageing.',

  primaryGoal: 'build trust and retention through practical, senior-friendly nutrition education grounded in geriatric health concepts',

  secondaryGoal: 'create calm, clear, food-centered visuals that support understanding without medical fear or exaggerated claims',

  analysisFocus: [
    'main geriatric health topic',
    'nutrition topic',
    'target age group',
    'daily meal habit',
    'protein and muscle maintenance',
    'frailty or sarcopenia risk',
    'hydration',
    'bone health',
    'micronutrients',
    'appetite decline',
    'chewing or swallowing issues if mentioned',
    'blood sugar or blood pressure if mentioned',
    'food examples',
    'practical meal application',
    'warning signs that require professional consultation',
    'claims requiring medical caution',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'geriatric nutrition education analysis',
    preserveTopicOrder: true,
    extractHealthClaims: true,
    extractNutritionClaims: true,
    extractFoodExamples: true,
    extractMealTimingAdvice: true,
    extractRiskWarnings: true,
    extractPracticalMealTips: true,
    extractCaregiverRelevantPoints: true,
    identifyUnsupportedMedicalClaims: true,
    avoidFearMongering: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'geriatric_nutrition_topic_synthesis',
    includeMainHealthMessage: true,
    includeNutritionMechanismSimple: true,
    includePracticalMealApplications: true,
    includeFoodExamples: true,
    includeRiskWarnings: true,
    includeDisclaimerNotes: true,
    avoidDiagnosis: true,
    avoidTreatmentGuarantees: true,
    avoidCureClaims: true,
    avoidOverstatingCausality: true,
  },

  metadataRules: {
    titleStyle: 'trustworthy_senior_nutrition_ctr',
    titleLanguage: 'ja',
    descriptionLanguage: 'ja',
    tagsLanguage: 'ja',

    allowCuriosityGap: true,
    allowMildWarningHook: true,
    avoidFearBasedOverclaim: true,
    avoidCureClaims: true,
    avoidGuaranteedPreventionClaims: true,
    avoidDoctorLikeDiagnosis: true,

    preferredKeywords: [
      '高齢者の栄養',
      '老年医学',
      '実践栄養学',
      'シニアの食事',
      '70代の食事',
      'フレイル予防',
      'サルコペニア',
      'たんぱく質',
      '低栄養',
      '脱水予防',
      '骨の健康',
      '認知機能',
      '食欲低下',
      '老後の健康',
      '健康寿命',
    ],

    recommendedTitlePatterns: [
      '70代から体を弱らせない食事の考え方',
      '老年医学から見る高齢者の食べ方',
      '高齢者が不足しやすい栄養と毎日の食事',
      'フレイルを防ぐために見直したい食習慣',
      '食が細くなった高齢者が注意したい栄養',
    ],

    requiredDescriptionNote:
      'この動画は一般的な健康・栄養情報です。病気の診断や治療を目的としたものではありません。体調や食事制限に不安がある場合は、医師・管理栄養士など専門家にご相談ください。',
  },

  chapterRules: {
    chapterStrategy: 'split_by_geriatric_nutrition_topics_and_practical_meal_steps',
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
      'aging_body_change',
      'nutrition_mechanism_simple',
      'food_example',
      'meal_timing',
      'protein_or_muscle',
      'hydration',
      'bone_health',
      'frailty_warning',
      'appetite_or_low_intake',
      'caregiver_tip',
      'practical_summary',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: false,
    needsRecurringCharacters: true,
    needsEnvironmentBible: true,

    heroImageType: 'trustworthy_senior_nutrition_daily_life_scene',

    visualMood: ['calm', 'trustworthy', 'warm', 'clean', 'senior-friendly', 'practical', 'not frightening'],

    recurringCharacters: [
      'elderly Japanese man',
      'elderly Japanese woman',
      'senior couple',
      'middle-aged caregiver',
      'nutritionist or doctor only if transcript supports professional explanation',
    ],

    commonLocations: [
      'Japanese home kitchen',
      'warm dining table',
      'simple living room',
      'supermarket vegetable section',
      'clinic consultation room if supported',
      'community health class if supported',
    ],

    preferredVisualObjects: [
      'Japanese breakfast set',
      'rice bowl',
      'miso soup',
      'grilled fish',
      'egg',
      'tofu',
      'natto',
      'vegetables',
      'yogurt',
      'milk or soy milk if relevant',
      'green tea',
      'water glass',
      'small shopping basket',
      'nutrition notebook without readable text',
      'calendar',
      'walking shoes',
    ],

    avoidVisuals: [
      'scary hospital emergency',
      'surgery',
      'blood',
      'disease horror imagery',
      'before-after cure imagery',
      'fake medical charts',
      'readable nutrition labels',
      'readable medicine labels',
      'doctor making a definitive diagnosis',
      'text inside image',
      'extreme diet imagery',
      'overly frail or hopeless elderly depiction unless transcript supports it',
    ],
  },

  sceneRules: {
    sceneDensity: {
      minSecondsPerScene: 65,
      maxSecondsPerScene: 105,
      recommendedFor30MinVideo: [22, 28],
      recommendedFor40MinVideo: [30, 38],
      recommendedFor60MinVideo: [45, 56],
    },

    sceneTypes: [
      'geriatric_nutrition_intro',
      'aging_body_change',
      'protein_food_example',
      'meal_balance_example',
      'hydration_example',
      'bone_health_food_example',
      'low_appetite_example',
      'bad_eating_habit',
      'good_eating_habit',
      'caregiver_support',
      'professional_consultation',
      'practical_summary',
    ],

    imagePromptRules: {
      includeSeniorCharacter: true,
      includeClearFoodObject: true,
      includeMealContext: true,
      avoidMedicalFear: true,
      noText: true,
      useReadableSimpleComposition: true,
      doNotShowReadableLabels: true,
    },
  },

  safetyRules: {
    requireMedicalDisclaimer: true,
    requireNutritionDisclaimer: true,
    avoidDiagnosis: true,
    avoidTreatmentGuarantee: true,
    avoidCureClaims: true,
    avoidGuaranteedPrevention: true,
    avoidSpecificMedicationAdvice: true,
    avoidReplacingDoctorOrDietitianAdvice: true,
    avoidUnsafeDietRestriction: true,
    useCautiousLanguage: true,

    forbiddenPhrasesMeaning: [
      'this food cures disease',
      'this prevents dementia completely',
      'stop taking medicine',
      'doctors do not want you to know',
      'guaranteed to reverse aging',
      'eat only this food',
      'all seniors must avoid this food completely',
    ],

    preferredPhrasingStyle: [
      'may help support',
      'is often considered useful',
      'can be one practical habit',
      'depending on health condition',
      'consult a doctor or registered dietitian when needed',
      'general educational information',
    ],
  },

  qualityRules: {
    mustSeparateMedicalFactsAndGeneralAdvice: true,
    mustFlagUnsupportedNutritionClaims: true,
    mustKeepLineRanges: true,
    mustAvoidFearMongering: true,
    mustIncludePracticalMealApplications: true,
    mustIncludeProfessionalConsultationWhenAppropriate: true,
  },
};
