// - senior health
// - senior lifestyle
// - soft story
// - một số drama nhẹ

export const ANIME_STYLE_CONFIG = {
  id: 'anime',
  label: 'Japanese Anime',
  description: 'High-quality Japanese anime style for emotional, educational, and senior-friendly videos.',

  bestForNiches: ['senior_health_japan', 'senior_lifestyle_japan', 'japanese_soft_story', 'gardening_japan'],

  basePromptTokens: [
    'high-quality Japanese anime style',
    'clean character design',
    'expressive but natural faces',
    'detailed Japanese background',
    'soft emotional atmosphere',
    'clear readable composition',
    '16:9 composition',
    'no text',
    'no subtitles',
    'no watermark',
  ],

  cameraTokens: [
    'anime medium shot',
    'gentle close-up',
    'wide calm establishing shot',
    'simple front-facing composition',
    'clear character-focused framing',
  ],

  lightingTokens: ['soft morning light', 'warm indoor light', 'gentle pastel lighting', 'peaceful afternoon light'],

  colorMoodTokens: ['warm soft colors', 'gentle contrast', 'clean anime background', 'calm color palette'],

  compositionRules: {
    allowTextSafeArea: true,
    defaultTextSafeArea: 'left side or top area if used for thumbnail',
    avoidTooManyCharacters: true,
    avoidOverlyComplexBackground: true,
    prioritizeEmotionAndClarity: true,
  },

  negativePromptTokens: [
    'photorealistic',
    'live action',
    '3D render',
    'western cartoon',
    'chibi',
    'childish style',
    'overly sexualized',
    'text',
    'Japanese text',
    'English text',
    'subtitles',
    'caption',
    'watermark',
    'logo',
    'distorted face',
    'extra fingers',
    'bad hands',
  ],

  promptBehavior: {
    imagePromptLanguage: 'en',
    includeCharacterAgeClearly: true,
    includeEnvironment: true,
    keepSeniorCharactersRespectful: true,
    avoidTeenageAppearanceForSeniorVideos: true,
  },
};
