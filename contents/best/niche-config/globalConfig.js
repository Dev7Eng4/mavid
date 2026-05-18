export const GLOBAL_VIDEO_CONFIG = {
  language: 'ja',
  outputType: 'audio_image_video',
  transcriptFormat: 'line_id',

  transcriptRules: {
    inputFormat: '[line_id] text',
    preserveLineIds: true,
    requireLineRangeInEveryOutput: true,
    lineIdMappingStrategy: 'code_maps_line_id_to_timestamp',
    doNotInventTimestamps: true,
  },

  imageRules: {
    imagePromptLanguage: 'en',
    generatedImageMustNotContainText: true,
    forbidTextInImage: [
      'Japanese text',
      'English text',
      'subtitles',
      'captions',
      'watermark',
      'logo',
      'signboard text',
      'newspaper readable text',
      'book cover readable text',
      'UI text',
    ],
    defaultAspectRatio: '16:9',
    defaultCanvas: {
      width: 1280,
      height: 720,
    },
  },

  metadataRules: {
    titleLanguage: 'ja',
    descriptionLanguage: 'ja',
    tagsLanguage: 'ja',
    allowMultipleTitleCandidates: true,
    avoidUnsupportedClaims: true,
  },

  chapterRules: {
    requireLineRange: true,
    doNotInventTimestamp: true,
    timestampWillBeMappedByCode: true,
    chapterTitleLanguage: 'ja',
  },

  sceneRules: {
    requireSceneLineRange: true,
    requireImagePromptPerScene: true,
    requireVisualPriority: true,
    requireSceneFunction: true,
    timestampWillBeMappedByCode: true,
  },

  outputRules: {
    outputJsonOnlyForAutomation: true,
    includeQualityCheck: true,
    includeWarnings: true,
  },
};
