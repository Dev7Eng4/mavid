// - ít drama hơn
// - màu mềm hơn
// - nhân vật già nhìn tôn trọng hơn
// - hợp video audio dài

export const SOFT_ANIME_STYLE_CONFIG = {
  id: 'soft_anime',
  label: 'Soft Senior-Friendly Anime',
  description: 'Warm, calm anime style optimized for Japanese senior health, lifestyle, and gentle story videos.',

  bestForNiches: ['senior_health_japan', 'senior_finance_japan', 'senior_lifestyle_japan', 'japanese_soft_story'],

  basePromptTokens: [
    'soft Japanese anime illustration',
    'senior-friendly character design',
    'warm and calm atmosphere',
    'gentle facial expressions',
    'clean background',
    'easy-to-understand composition',
    'respectful depiction of elderly Japanese people',
    '16:9 composition',
    'no text',
    'no subtitles',
    'no watermark',
  ],

  cameraTokens: ['gentle medium shot', 'calm close-up', 'simple lifestyle composition', 'clear object-focused scene', 'warm family scene'],

  lightingTokens: ['soft morning sunlight', 'warm home lighting', 'gentle afternoon light', 'peaceful natural light'],

  colorMoodTokens: [
    'soft pastel colors',
    'warm beige tones',
    'light green accents',
    'gentle blue shadows',
    'low contrast but clear subject',
  ],

  compositionRules: {
    allowTextSafeArea: true,
    avoidDarkMood: true,
    avoidExaggeratedDrama: true,
    preferSimpleDailyLifeScenes: true,
    prioritizeTrustAndCalmness: true,
  },

  negativePromptTokens: [
    'dark horror mood',
    'aggressive expression',
    'overly dramatic crying',
    'teenage anime character',
    'chibi',
    'overly cute childish style',
    'photorealistic',
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
    emphasizeRespectfulElderlyDesign: true,
    keepSceneCalm: true,
    useClearEverydayObjects: true,
  },
};
