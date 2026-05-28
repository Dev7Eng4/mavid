export const STYLE_CONFIGS = {
  soft_anime_infographic: {
    style_id: 'soft_anime_infographic',
    style_name: 'Soft Anime Infographic',
    description: 'Soft anime-realistic Japanese educational infographic style for senior-friendly explanation videos.',

    visual_style_prompt: [
      'soft anime-realistic illustration',
      'Japanese senior educational video style',
      'clean infographic composition',
      'warm and trustworthy tone',
      'large readable Japanese text when text is required',
      'simple icons and simple charts',
      '16:9 YouTube frame',
      'professional Japanese TV information-program look',
    ],

    best_for_niches: [
      'senior_pension_easy',
      'pension_life_saving',
      'senior_scam_prevention',
      'senior_smartphone_safety',
      'inheritance_will_intro',
      'home_safety_prevention',
      'medical_expense_saving',
      'senior_tax_social_insurance',
    ],

    available_visual_types: [
      'character_explanation',
      'comparison_slide',
      'checklist_slide',
      'warning_slide',
      'document_table_scene',
      'simple_chart_scene',
      'summary_slide',
      'case_example_scene',
    ],

    preferred_layout_types: [
      'left_text_right_character',
      'comparison_board',
      'checklist_board',
      'warning_card',
      'simple_chart_slide',
      'summary_board',
    ],

    typography_rules: {
      supports_ai_text: true,
      japanese_text_style: 'large bold Japanese font, high contrast, senior-readable',
      max_text_blocks: 3,
      avoid_tiny_labels: true,
      avoid_long_paragraphs: true,
    },

    text_rendering_policy: {
      default_mode: 'auto',
      recommended_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      avoid_code_overlay_by_default: false,
    },

    color_palette_hints: ['warm beige', 'soft blue', 'gentle yellow highlight', 'light green accent', 'soft red for warning only'],

    composition_rules: [
      'one clear message per image',
      'large focal subject',
      'avoid clutter',
      'keep charts simple',
      'use large icons instead of many small labels',
      'make all Japanese text readable on smartphone',
    ],

    negative_prompt: [
      'no English text',
      'no Chinese text',
      'no Korean text',
      'no watermark',
      'no logo',
      'no tiny text',
      'no unreadable characters',
      'no messy small labels',
      'no cluttered chart',
      'no distorted hands',
      'no horror',
      'no exaggerated wrinkles',
    ],
  },

  clean_tv_slide: {
    style_id: 'clean_tv_slide',
    style_name: 'Clean Japanese TV Slide',
    description: 'Clean Japanese public-TV-like slide design for trustworthy explanation content.',

    visual_style_prompt: [
      'Japanese public TV educational slide',
      'clean white and pastel background',
      'professional information-program design',
      'large Japanese headline',
      'simple chart or checklist',
      'clear icons',
      'trustworthy and calm',
      '16:9 YouTube frame',
    ],

    best_for_niches: [
      'senior_pension_easy',
      'inheritance_will_intro',
      'senior_tax_social_insurance',
      'medical_expense_saving',
      'long_term_care_insurance',
      'senior_public_benefits',
    ],

    available_visual_types: [
      'comparison_slide',
      'checklist_slide',
      'document_table_scene',
      'simple_chart_scene',
      'summary_slide',
      'character_explanation',
    ],

    preferred_layout_types: [
      'top_text_bottom_visual',
      'comparison_board',
      'checklist_board',
      'simple_chart_slide',
      'document_explanation',
      'summary_board',
    ],

    typography_rules: {
      supports_ai_text: true,
      japanese_text_style: 'very large clean Japanese font, broadcast-style, high contrast',
      max_text_blocks: 3,
      avoid_tiny_labels: true,
      avoid_long_paragraphs: true,
    },

    text_rendering_policy: {
      default_mode: 'auto',
      recommended_modes: ['ai_generated_text', 'minimal_label_text'],
    },

    color_palette_hints: ['white', 'light blue', 'soft gray', 'pastel green', 'yellow highlight'],

    composition_rules: [
      'prioritize readability',
      'use simple information hierarchy',
      'avoid emotional exaggeration',
      'avoid cinematic shadows',
      'make the slide look official but not like a real government page',
    ],

    negative_prompt: [
      'no English text',
      'no Chinese text',
      'no Korean text',
      'no watermark',
      'no real government logo',
      'no fake government seal',
      'no tiny text',
      'no complex legal table',
      'no clutter',
    ],
  },

  gentle_lifestyle: {
    style_id: 'gentle_lifestyle',
    style_name: 'Gentle Senior Lifestyle',
    description: 'Warm senior lifestyle illustration style for emotional, daily-life, loneliness, care, and end-of-life planning content.',

    visual_style_prompt: [
      'warm Japanese senior lifestyle illustration',
      'soft anime-realistic but natural',
      'calm home interior',
      'gentle natural light',
      'quiet emotional tone',
      'respectful and not depressing',
      '16:9 YouTube frame',
    ],

    best_for_niches: [
      'end_of_life_planning',
      'parent_care_preparation',
      'senior_loneliness_living_alone',
      'senior_meal_saving_alone',
      'senior_social_connection',
      'senior_sleep_routine',
      'senior_hobbies_brain_health',
    ],

    available_visual_types: [
      'emotional_lifestyle_scene',
      'family_discussion_scene',
      'character_explanation',
      'food_lifestyle_scene',
      'medical_lifestyle_scene',
      'summary_slide',
    ],

    preferred_layout_types: [
      'emotional_lifestyle_scene',
      'family_discussion',
      'center_character_with_side_icons',
      'top_text_bottom_visual',
    ],

    typography_rules: {
      supports_ai_text: true,
      japanese_text_style: 'minimal large Japanese text only when necessary',
      max_text_blocks: 1,
      avoid_tiny_labels: true,
      avoid_long_paragraphs: true,
    },

    text_rendering_policy: {
      default_mode: 'no_text',
      recommended_modes: ['no_text', 'minimal_label_text'],
    },

    color_palette_hints: ['warm cream', 'soft brown', 'gentle orange', 'muted green', 'soft window light'],

    composition_rules: [
      'focus on mood and daily life',
      'avoid heavy text',
      'avoid sadness exaggeration',
      'keep environment simple',
      'use emotional realism without melodrama',
    ],

    negative_prompt: [
      'no English text',
      'no Chinese text',
      'no Korean text',
      'no watermark',
      'no logo',
      'no dark funeral mood',
      'no crying close-up',
      'no horror',
      'no death symbolism',
      'no extreme loneliness depiction',
      'no messy room',
    ],
  },

  warning_explainer: {
    style_id: 'warning_explainer',
    style_name: 'Warning Explainer',
    description: 'Serious but non-horror warning style for scams, smartphone safety, home accidents, and urgent senior risk topics.',

    visual_style_prompt: [
      'serious Japanese educational warning graphic',
      'soft anime-realistic illustration',
      'yellow caution theme',
      'red alert accent',
      'large warning icon',
      'clear senior-friendly layout',
      'trustworthy, not horror',
      '16:9 YouTube frame',
    ],

    best_for_niches: [
      'senior_scam_prevention',
      'senior_smartphone_safety',
      'home_safety_prevention',
      'disaster_preparedness_seniors',
      'heatstroke_prevention_seniors',
    ],

    available_visual_types: [
      'warning_slide',
      'checklist_slide',
      'case_example_scene',
      'phone_safety_scene',
      'home_safety_scene',
      'summary_slide',
    ],

    preferred_layout_types: ['warning_card', 'left_text_right_character', 'checklist_board', 'step_flow_layout', 'before_after_layout'],

    typography_rules: {
      supports_ai_text: true,
      japanese_text_style: 'large bold warning-style Japanese text, high contrast',
      max_text_blocks: 3,
      avoid_tiny_labels: true,
      avoid_long_paragraphs: true,
    },

    text_rendering_policy: {
      default_mode: 'auto',
      recommended_modes: ['ai_generated_text', 'minimal_label_text'],
    },

    color_palette_hints: ['yellow caution', 'red warning accent', 'dark navy', 'white text area', 'black outline for text'],

    composition_rules: [
      'clear warning without horror',
      'use icons to explain danger',
      'avoid violent scenes',
      'avoid real logos',
      'show solution or prevention when possible',
    ],

    negative_prompt: [
      'no English text',
      'no Chinese text',
      'no Korean text',
      'no watermark',
      'no logo',
      'no real police logo',
      'no bank logo',
      'no app logo',
      'no violent criminal scene',
      'no blood',
      'no horror',
      'no tiny text',
      'no unreadable characters',
      'no distorted hands',
    ],
  },

  simple_3d_infographic: {
    style_id: 'simple_3d_infographic',
    style_name: 'Simple 3D Infographic',
    description: 'Clean 3D icon-based explainer style for data comparison, steps, money, smartphone, and home safety topics.',

    visual_style_prompt: [
      'clean simple 3D infographic',
      'large friendly 3D icons',
      'Japanese senior educational explainer',
      'minimal background',
      'clear visual hierarchy',
      'large readable Japanese text when needed',
      '16:9 YouTube frame',
    ],

    best_for_niches: [
      'senior_smartphone_safety',
      'pension_life_saving',
      'senior_public_benefits',
      'home_safety_prevention',
      'senior_meal_saving_alone',
    ],

    available_visual_types: [
      'comparison_slide',
      'checklist_slide',
      'simple_chart_scene',
      'summary_slide',
      'warning_slide',
      'step_by_step_guide',
    ],

    preferred_layout_types: [
      'center_character_with_side_icons',
      'comparison_board',
      'checklist_board',
      'simple_chart_slide',
      'step_flow_layout',
    ],

    typography_rules: {
      supports_ai_text: true,
      japanese_text_style: 'large clean rounded Japanese font',
      max_text_blocks: 3,
      avoid_tiny_labels: true,
      avoid_long_paragraphs: true,
    },

    text_rendering_policy: {
      default_mode: 'auto',
      recommended_modes: ['ai_generated_text', 'minimal_label_text', 'code_overlay_text'],
    },

    color_palette_hints: ['light blue', 'white', 'pastel yellow', 'soft green', 'gentle red warning accent'],

    composition_rules: [
      'use few large icons',
      'avoid too many small labels',
      'make the main concept visible instantly',
      'avoid realistic documents with tiny text',
    ],

    negative_prompt: [
      'no English text',
      'no Chinese text',
      'no Korean text',
      'no watermark',
      'no logo',
      'no tiny text',
      'no complex table',
      'no photorealistic clutter',
      'no distorted icons',
    ],
  },

  cinematic_senior_documentary: {
    style_id: 'cinematic_senior_documentary',
    style_name: 'Cinematic Senior Documentary',
    description: 'Realistic cinematic documentary-style imagery for emotional senior topics where text should usually be avoided.',

    visual_style_prompt: [
      'cinematic realistic Japanese senior documentary style',
      'natural light',
      'emotional but restrained',
      'realistic home or community setting',
      'shallow depth of field',
      'calm composition',
      '16:9 YouTube frame',
    ],

    best_for_niches: [
      'senior_loneliness_living_alone',
      'parent_care_preparation',
      'end_of_life_planning',
      'senior_social_connection',
      'senior_work_after_retirement',
    ],

    available_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene', 'medical_lifestyle_scene', 'case_example_scene'],

    preferred_layout_types: ['emotional_lifestyle_scene', 'family_discussion', 'center_character_with_side_icons'],

    typography_rules: {
      supports_ai_text: false,
      japanese_text_style: 'no text recommended',
      max_text_blocks: 0,
      avoid_tiny_labels: true,
      avoid_long_paragraphs: true,
    },

    text_rendering_policy: {
      default_mode: 'no_text',
      recommended_modes: ['no_text', 'code_overlay_text'],
    },

    color_palette_hints: ['natural warm light', 'muted brown', 'soft gray', 'evening blue', 'gentle contrast'],

    composition_rules: [
      'no text inside image by default',
      'focus on human emotion',
      'avoid melodrama',
      'avoid horror or extreme sadness',
      'use calm realistic framing',
    ],

    negative_prompt: [
      'no text',
      'no letters',
      'no numbers',
      'no subtitles',
      'no captions',
      'no watermark',
      'no logo',
      'no horror',
      'no crying close-up',
      'no death symbolism',
      'no hospital tragedy',
    ],
  },
};
