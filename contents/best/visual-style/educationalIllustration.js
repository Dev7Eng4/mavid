// - sức khỏe
// - tài chính
// - gardening
// - hướng dẫn

export const EDUCATIONAL_ILLUSTRATION_STYLE_CONFIG = {
  id: 'educational_illustration',
  label: 'Educational Illustration',
  description: 'Simple, clean, non-text educational illustration for health, finance, and how-to content.',

  bestForNiches: ['senior_health_japan', 'general_finance_japan', 'senior_finance_japan', 'gardening_japan'],

  basePromptTokens: [
    'clean educational illustration',
    'simple visual explanation',
    'clear objects',
    'friendly atmosphere',
    'minimal background clutter',
    'easy-to-understand composition',
    '16:9 composition',
    'no text',
    'no labels',
    'no subtitles',
    'no watermark',
  ],

  cameraTokens: [
    'front-facing composition',
    'object-focused composition',
    'simple lifestyle scene',
    'clear demonstration angle',
    'slightly elevated view',
  ],

  lightingTokens: ['bright soft lighting', 'clean neutral lighting', 'warm friendly lighting'],

  colorMoodTokens: ['clean bright colors', 'soft contrast', 'friendly educational palette'],

  compositionRules: {
    avoidComplexScene: true,
    useFewObjects: true,
    makeMainObjectObvious: true,
    allowTextSafeArea: true,
    noChartsWithText: true,
  },

  negativePromptTokens: [
    'realistic photo',
    'cinematic drama',
    'dark mood',
    'complex chart',
    'readable text',
    'Japanese text',
    'English text',
    'numbers',
    'labels',
    'watermark',
    'logo',
    'cluttered layout',
  ],

  promptBehavior: {
    imagePromptLanguage: 'en',
    prioritizeClarity: true,
    avoidTextualInfographics: true,
    useObjectsInsteadOfWrittenLabels: true,
  },
};
