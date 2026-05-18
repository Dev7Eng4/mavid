// - senior finance
// - senior health
// - soft story
// - gardening

export const SEMI_REALISTIC_ILLUSTRATION_STYLE_CONFIG = {
  id: 'semi_realistic_illustration',
  label: 'Semi-Realistic Illustration',
  description: 'Mature illustrated style with realistic proportions and warm emotional tone.',

  bestForNiches: ['senior_health_japan', 'senior_finance_japan', 'senior_lifestyle_japan', 'gardening_japan', 'japanese_soft_story'],

  basePromptTokens: [
    'semi-realistic illustration',
    'realistic proportions',
    'Japanese people',
    'mature character design',
    'warm natural colors',
    'clear emotional storytelling',
    'detailed but not cluttered background',
    '16:9 composition',
    'no text',
    'no subtitles',
    'no watermark',
  ],

  cameraTokens: ['medium shot', 'gentle close-up', 'wide lifestyle scene', 'object-focused shot'],

  lightingTokens: ['soft natural light', 'warm indoor light', 'gentle daylight'],

  colorMoodTokens: ['warm neutral colors', 'soft realistic palette', 'calm contrast'],

  compositionRules: {
    allowTextSafeArea: true,
    avoidOverStylization: true,
    avoidCartoonishFaces: true,
    keepSeniorCharactersRespectful: true,
  },

  negativePromptTokens: [
    'photorealistic',
    'anime',
    'chibi',
    'western cartoon',
    '3D render',
    'text',
    'Japanese text',
    'English text',
    'subtitles',
    'watermark',
    'logo',
    'distorted hands',
    'extra fingers',
  ],

  promptBehavior: {
    imagePromptLanguage: 'en',
    includeEmotion: true,
    includeClearSetting: true,
    keepMatureTone: true,
  },
};
