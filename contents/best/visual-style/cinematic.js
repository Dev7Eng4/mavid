// - audio drama
// - workplace drama
// - family conflict
// - betrayal
// - soft story nếu muốn realistic

export const CINEMATIC_STYLE_CONFIG = {
  id: 'cinematic',
  label: 'Cinematic Realistic',
  description: 'Realistic movie-still style for emotional Japanese drama and story videos.',

  bestForNiches: ['japanese_audio_drama', 'japanese_soft_story', 'senior_finance_japan', 'senior_lifestyle_japan'],

  basePromptTokens: [
    'cinematic realistic scene',
    'Japanese people',
    'Japanese environment',
    'movie still',
    'natural skin texture',
    'realistic facial expression',
    'emotional storytelling',
    'high detail',
    '16:9 composition',
    'no text',
    'no subtitles',
    'no watermark',
  ],

  cameraTokens: [
    'medium shot',
    'close-up shot',
    'over-the-shoulder shot',
    'wide establishing shot',
    'shallow depth of field',
    'cinematic framing',
  ],

  lightingTokens: ['soft natural light', 'dramatic indoor lighting', 'subtle shadows', 'warm evening light', 'cool night interior light'],

  colorMoodTokens: ['muted cinematic colors', 'realistic contrast', 'subtle filmic tone'],

  compositionRules: {
    allowTextSafeArea: true,
    defaultTextSafeArea: 'left side if used for thumbnail',
    subjectPlacement: 'right or center depending on usage',
    avoidCrowdedFrame: true,
    strongSingleMoment: true,
  },

  negativePromptTokens: [
    'anime',
    'cartoon',
    'manga',
    'illustration',
    '3D render',
    'text',
    'Japanese text',
    'English text',
    'subtitles',
    'caption',
    'watermark',
    'logo',
    'deformed hands',
    'extra fingers',
    'distorted face',
    'overly glossy skin',
  ],

  promptBehavior: {
    imagePromptLanguage: 'en',
    includeCamera: true,
    includeLighting: true,
    includeEmotion: true,
    includeEnvironment: true,
    keepRealistic: true,
  },
};
