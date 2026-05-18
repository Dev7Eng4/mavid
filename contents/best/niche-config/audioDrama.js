export const AUDIO_DRAMA_KEYWORDS = [
  '修羅場',
  'スカッとする話',
  '不倫',
  '離婚',
  '義母',
  '夫婦問題',
  '職場いじめ',
  '因果応報',
  'サレ夫の逆転',
  '家族崩壊',
];

export const AUDIO_DRAMA_CONFIG = {
  id: 'japanese_audio_drama',
  label: 'Japanese Audio Drama',
  language: 'ja',
  contentType: 'story_drama',

  targetAudience:
    'Japanese adult listeners, especially viewers who enjoy relationship, family, workplace, revenge, and emotional drama stories.',
  audienceMindset: 'They want emotional conflict, curiosity, betrayal, reversal, punishment, justice, and a satisfying ending.',

  primaryGoal: 'maximize retention through emotional escalation and story curiosity',
  secondaryGoal: 'create strong visual moments for still-image audio video and thumbnail use',

  analysisFocus: [
    'main characters',
    'relationships between characters',
    'family or workplace hierarchy',
    'initial peaceful situation',
    'first sign of discomfort',
    'betrayal or conflict trigger',
    'hidden truth',
    'evidence',
    'confrontation',
    'reversal',
    'revenge or justice',
    'emotional collapse',
    'resolution',
    'visualizable dramatic moments',
  ],

  chunkAnalysisRules: {
    summaryStyle: 'story beat analysis',
    preserveNarrativeOrder: true,
    extractCharacters: true,
    extractRelationshipMap: true,
    extractEmotionalShifts: true,
    extractConflictProgression: true,
    extractEvidenceItems: true,
    extractOpenLoops: true,
    extractVisualCandidates: true,
    avoidGenericSummary: true,
  },

  finalAnalysisRules: {
    finalSummaryType: 'full_story_synthesis',
    includeStoryArc: true,
    includeCharacterMotivations: true,
    includeEmotionalCurve: true,
    includeConflictMap: true,
    includeTurningPoints: true,
    includeEndingType: true,
    avoidInventingScenes: true,
    avoidChangingRelationships: true,
  },

  metadataRules: {
    titleStyle: 'high_ctr_japanese_drama',
    titleLanguage: 'ja',
    descriptionLanguage: 'ja',
    tagsLanguage: 'ja',

    allowCuriosityGap: true,
    allowEmotionalHook: true,
    allowDramaticWords: true,
    allowQuestionHook: true,

    recommendedTitlePatterns: [
      '夫が〇〇した瞬間、妻の顔色が変わった',
      '義母に〇〇された私が、最後に取った行動',
      '離婚届を出した直後、夫が知った真実',
      '信じていた家族の裏切りが、たった一言で崩れた',
    ],

    preferredKeywords: [
      'スカッとする話',
      '修羅場',
      '不倫',
      '離婚',
      '義母',
      '復讐',
      '因果応報',
      '家族崩壊',
      'サレ夫',
      'サレ妻',
      '職場いじめ',
      '嫁姑問題',
    ],

    avoid: [
      'unsupported legal outcome',
      'invented DNA result',
      'invented death',
      'invented pregnancy',
      'excessively long title',
      'too many punctuation marks',
    ],
  },

  chapterRules: {
    chapterStrategy: 'split_by_story_beats',
    requireLineRange: true,
    chapterCountStrategy: 'auto',
    idealChapterCountByDuration: {
      under_15_min: [4, 6],
      '15_30_min': [5, 8],
      '30_60_min': [7, 12],
      over_60_min: [10, 16],
    },
    chapterTitleStyle: 'dramatic_but_clear',
    chapterTitleLanguage: 'ja',
    chapterTypes: [
      'setup',
      'first_discomfort',
      'suspicion',
      'betrayal_reveal',
      'confrontation',
      'collapse',
      'reversal',
      'justice',
      'resolution',
    ],
  },

  visualRules: {
    needsVisualBible: true,
    needsCharacterBible: true,
    needsEnvironmentBible: true,
    needsRecurringCharacters: true,

    heroImageType: 'highest_conflict_or_reveal_moment',
    thumbnailImageShouldBeMoreDramaticThanSceneImages: true,

    visualMood: ['tense', 'emotional', 'cinematic', 'realistic', 'dark family drama', 'workplace pressure'],

    commonLocations: [
      'Japanese apartment living room',
      'dining room',
      'family home entrance',
      'office meeting room',
      'hospital corridor if supported by transcript',
      'lawyer office if supported by transcript',
      'wedding or family gathering if supported by transcript',
    ],

    avoidVisuals: [
      'random smiling portraits',
      'overly glamorous fantasy scenes',
      'weapons unless transcript clearly supports it',
      'blood or gore',
      'text inside image',
      'manga speech bubbles',
      'unrelated cityscape',
      'characters that do not match the story',
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
      'peaceful_setup',
      'subtle_discomfort',
      'suspicion',
      'secret_discovery',
      'evidence_reveal',
      'confrontation',
      'emotional_breakdown',
      'family_conflict',
      'workplace_conflict',
      'legal_or_financial_turning_point',
      'revenge_or_reversal',
      'quiet_resolution',
    ],

    imagePromptRules: {
      includeCharacters: true,
      includeLocation: true,
      includeEmotion: true,
      includeCameraShot: true,
      includeLighting: true,
      maintainCharacterContinuity: true,
      noText: true,
    },
  },

  safetyRules: {
    avoidDefamationLikeSpecificRealPersonClaims: true,
    avoidGraphicViolence: true,
    avoidSexualExplicitness: true,
    keepConflictEmotionalNotGraphic: true,
  },

  qualityRules: {
    mustPreserveStoryOrder: true,
    mustNotInventMajorPlotEvents: true,
    mustKeepLineRanges: true,
    mustIdentifyMainCharacters: true,
    mustFindAtLeastOneHeroMoment: true,
  },
};
