export const STYLE_CONFIGS = {
  soft_anime_infographic: {
    style_name: 'Soft Anime Infographic',
    visual_style: [
      'soft anime-realistic illustration',
      'clean Japanese educational TV program style',
      'senior-friendly infographic',
      'large readable Japanese text',
      'warm lighting',
      'simple charts',
      'clear icons',
      '16:9 YouTube frame',
    ],
    best_for: ['pension', 'savings', 'smartphone safety', 'inheritance', 'home safety'],
    text_policy: 'AI image includes large Japanese text directly in the image',
    negative_prompt: [
      'no English text',
      'no Chinese text',
      'no Korean text',
      'no watermark',
      'no logo',
      'no tiny text',
      'no cluttered chart',
      'no distorted hands',
      'no horror',
      'no exaggerated wrinkles',
    ],
  },

  clean_tv_slide: {
    style_name: 'Clean TV Slide',
    visual_style: [
      'Japanese public TV educational slide',
      'clean white and pastel background',
      'large headline',
      'simple icons',
      'clear chart',
      'trustworthy information program look',
    ],
    best_for: ['pension', 'social welfare', 'inheritance', 'legal beginner topics'],
    text_policy: 'AI image includes Japanese slide text',
    negative_prompt: ['no messy small text', 'no dramatic face', 'no horror', 'no brand logo', 'no fake government seal'],
  },

  gentle_lifestyle: {
    style_name: 'Gentle Senior Lifestyle',
    visual_style: [
      'warm Japanese senior lifestyle illustration',
      'soft natural lighting',
      'calm home interior',
      'elderly person living alone',
      'emotional but not sad',
      'cinematic illustrated realism',
    ],
    best_for: ['loneliness', 'living alone', 'meal saving', 'care preparation', 'end-of-life planning'],
    text_policy: 'minimal Japanese text inside image',
    negative_prompt: ['no depressing hospital scene', 'no crying close-up', 'no horror', 'no dark funeral mood', 'no clutter'],
  },

  warning_explainer: {
    style_name: 'Warning Explainer',
    visual_style: [
      'serious Japanese educational warning graphic',
      'yellow caution color',
      'red alert accent',
      'elderly person facing risk',
      'simple warning icons',
      'large readable text',
    ],
    best_for: ['scam prevention', 'smartphone fraud', 'home accident prevention'],
    text_policy: 'AI image includes strong Japanese warning text',
    negative_prompt: ['no violent crime scene', 'no bloody imagery', 'no police logo', 'no real company logo', 'no unreadable text'],
  },
};
