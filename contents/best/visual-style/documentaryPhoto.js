// - finance nghiêm túc
// - health nghiêm túc
// - senior lifestyle realistic
// - gardening realistic

export const DOCUMENTARY_PHOTO_STYLE_CONFIG = {
  id: 'documentary_photo',
  label: 'Documentary Photo Style',
  description: 'Natural, realistic documentary-style stills for serious educational and lifestyle videos.',

  bestForNiches: ['senior_health_japan', 'senior_finance_japan', 'general_finance_japan', 'senior_lifestyle_japan', 'gardening_japan'],

  basePromptTokens: [
    'realistic documentary photo style',
    'natural Japanese everyday life',
    'authentic environment',
    'natural lighting',
    'not staged',
    'respectful realistic people',
    'clear subject',
    '16:9 composition',
    'no text',
    'no subtitles',
    'no watermark',
  ],

  cameraTokens: ['natural medium shot', 'documentary close-up', 'wide lifestyle shot', 'hands performing action', 'environmental portrait'],

  lightingTokens: ['available natural light', 'soft daylight', 'warm indoor light', 'realistic shadows'],

  colorMoodTokens: ['natural colors', 'realistic contrast', 'subtle warm tone'],

  compositionRules: {
    avoidOverDramaticLighting: true,
    avoidFashionPhotoLook: true,
    allowTextSafeArea: true,
    keepAuthenticEverydayFeeling: true,
  },

  negativePromptTokens: [
    'anime',
    'illustration',
    'cartoon',
    'cinematic extreme drama',
    'studio portrait',
    'fashion editorial',
    'text',
    'Japanese text',
    'English text',
    'subtitles',
    'watermark',
    'logo',
    'fake document text',
    'distorted hands',
  ],

  promptBehavior: {
    imagePromptLanguage: 'en',
    prioritizeAuthenticity: true,
    keepLightingNatural: true,
    avoidSensationalMood: true,
  },
};
