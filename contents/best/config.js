const japaneseAudioDramaConfig = {
  config_id: 'japanese_audio_drama',
  content_mode: 'story',
  target_audience: 'Japanese adult audio drama viewers',
  language: 'ja',

  chunk_analysis_schema: 'story_drama_chunk_analysis',

  chapter_strategy: {
    type: 'story_progression',
    preferred_flow: [
      'normal_life_or_setup',
      'first_discomfort',
      'rising_suspicion',
      'conflict_escalation',
      'major_reveal',
      'confrontation',
      'collapse_or_reversal',
      'resolution_or_rebirth',
    ],
  },

  metadata_strategy: {
    type: 'high_ctr_drama_hook',
    title_style: ['betrayal_reveal', 'revenge_result', 'shocking_truth', 'family_collapse', 'legal_or_emotional_resolution'],
    avoid: ['too_generic_title', 'boring_summary_title', 'overly_abstract_title'],
  },

  visual_strategy: {
    primary_style: 'cinematic Japanese anime drama',
    secondary_style: 'semi-realistic cinematic illustration',
    mood: 'emotional, tense, dramatic',
    lighting: ['cold hospital light', 'rainy night', 'dim apartment', 'office fluorescent light', 'courtroom-like serious atmosphere'],
    camera_language: ['close-up emotional expression', 'medium shot confrontation', 'over-the-shoulder tension', 'wide shot isolation'],
  },

  character_required: true,
  persona_required: false,

  scene_strategy: {
    type: 'emotional_turning_points',
    scene_unit: 'event_or_emotion_change',
    preferred_scene_duration_seconds: {
      min: 45,
      max: 90,
    },
    scene_focus: ['character emotion', 'conflict', 'reveal', 'silent tension', 'turning point'],
  },

  image_density: {
    low: '1 image per 90 seconds',
    normal: '1 image per 60 seconds',
    high: '1 image per 40-45 seconds',
  },

  hero_image_strategy: {
    required: true,
    focus: ['most shocking reveal', 'strongest confrontation', 'betrayal evidence', 'silent emotional collapse'],
  },

  safety_rules: ['avoid explicit violence', 'avoid sexual explicit imagery', 'avoid gore', 'avoid text inside generated image'],

  negative_visual_rules: ['no text', 'no subtitles', 'no watermark', 'no distorted hands', 'no extra fingers', 'no exaggerated horror'],
};

const elderlyHealthJpConfig = {
  config_id: 'elderly_health_jp',
  content_mode: 'educational_health',
  target_audience: 'Japanese seniors and middle-aged caregivers',
  language: 'ja',

  chunk_analysis_schema: 'elderly_health_chunk_analysis',

  chapter_strategy: {
    type: 'educational_topic_flow',
    preferred_flow: [
      'problem_introduction',
      'common_mistake_or_warning',
      'symptoms_or_signs',
      'reason_or_mechanism',
      'daily_life_example',
      'recommended_habits',
      'medical_caution',
      'summary_checklist',
    ],
  },

  metadata_strategy: {
    type: 'senior_health_benefit_hook',
    title_style: [
      'warning_about_common_habit',
      'things_seniors_should_avoid',
      'simple_daily_health_improvement',
      'doctor_like_advice',
      'longevity_and_prevention',
    ],
    avoid: ['miracle_cure_claims', 'fake_medical_certainty', 'extreme_fearmongering', 'disease_guarantee'],
  },

  visual_strategy: {
    primary_style: 'warm senior-friendly Japanese anime illustration',
    secondary_style: 'clean lifestyle medical illustration',
    mood: 'calm, trustworthy, gentle, hopeful',
    lighting: ['soft morning light', 'clean clinic light', 'warm home interior', 'peaceful park daylight'],
    common_locations: [
      'Japanese kitchen',
      'tatami room',
      'small dining table',
      'clinic consultation room',
      'neighborhood park',
      'supermarket',
      'walking path',
    ],
  },

  character_required: false,
  persona_required: true,

  recurring_personas: [
    {
      persona_id: 'senior_man_70s',
      role: 'elderly viewer representation',
      description: 'Japanese elderly man in his 70s, gray hair, simple cardigan, gentle realistic face',
    },
    {
      persona_id: 'senior_woman_70s',
      role: 'elderly viewer representation',
      description: 'Japanese elderly woman in her 70s, short gray hair, warm cardigan, calm expression',
    },
    {
      persona_id: 'doctor_40s',
      role: 'medical explanation figure',
      description: 'Japanese doctor in 40s, white coat, calm and trustworthy expression',
    },
  ],

  scene_strategy: {
    type: 'educational_visual_examples',
    scene_unit: 'topic_point_or_daily_life_example',
    preferred_scene_duration_seconds: {
      min: 30,
      max: 60,
    },
    scene_focus: [
      'daily habit',
      'symptom illustration',
      'healthy food',
      'doctor advice',
      'before-after lifestyle contrast',
      'safe caution',
    ],
  },

  image_density: {
    low: '1 image per 70 seconds',
    normal: '1 image per 45-60 seconds',
    high: '1 image per 30-40 seconds',
  },

  hero_image_strategy: {
    required: true,
    focus: [
      'elderly person noticing a common health warning sign',
      'senior daily habit that looks ordinary but risky',
      'doctor gently explaining important advice',
      'healthy morning routine',
    ],
  },

  safety_rules: [
    'do not imply guaranteed cure',
    'do not create fake medical claims',
    'avoid extreme hospital panic',
    'avoid blood or graphic disease imagery',
    'avoid making diagnosis visually definitive',
    'use calm educational tone',
  ],

  negative_visual_rules: [
    'no text',
    'no medical chart text',
    'no fake labels',
    'no gore',
    'no emergency panic',
    'no scary horror style',
    'no watermark',
  ],
};

const elderlyFinanceJpConfig = {
  config_id: 'elderly_finance_jp',
  content_mode: 'educational_finance',
  target_audience: 'Japanese seniors, retirees, and pre-retirement adults',
  language: 'ja',

  chunk_analysis_schema: 'elderly_finance_chunk_analysis',

  chapter_strategy: {
    type: 'financial_problem_solution_flow',
    preferred_flow: [
      'retirement_money_anxiety',
      'common_financial_mistake',
      'realistic_living_cost_example',
      'hidden_risk_or_trap',
      'consequence',
      'practical_countermeasure',
      'checklist_or_summary',
    ],
  },

  metadata_strategy: {
    type: 'retirement_money_hook',
    title_style: [
      'pension_warning',
      'retirement_savings_mistake',
      'living_cost_reality',
      'money_habit_to_avoid',
      'fraud_or_hidden_cost_warning',
    ],
    avoid: ['get_rich_quick', 'investment_guarantee', 'illegal_tax_advice', 'overly_specific_financial_promise'],
  },

  visual_strategy: {
    primary_style: 'calm realistic Japanese anime documentary illustration',
    secondary_style: 'senior lifestyle financial illustration',
    mood: 'serious, calm, realistic, trustworthy',
    lighting: ['soft indoor light', 'evening kitchen light', 'bank office light', 'subtle documentary lighting'],
    common_locations: [
      'small Japanese apartment',
      'kitchen table with bills',
      'bank counter',
      'pension office',
      'supermarket checkout',
      'quiet living room',
      'phone scam situation',
    ],
  },

  character_required: false,
  persona_required: true,

  recurring_personas: [
    {
      persona_id: 'retired_couple_70s',
      role: 'main senior finance representation',
      description: 'Japanese retired couple in their 70s, modest clothing, gentle but slightly worried expressions',
    },
    {
      persona_id: 'senior_woman_living_alone',
      role: 'single elderly household example',
      description: 'Japanese elderly woman living alone, simple apartment, careful with expenses',
    },
    {
      persona_id: 'financial_advisor_40s',
      role: 'explanation figure',
      description: 'Japanese financial advisor in 40s, clean business casual, trustworthy expression',
    },
    {
      persona_id: 'scam_caller_silhouette',
      role: 'risk representation',
      description: 'anonymous phone scammer represented only as a dark silhouette or phone screen, not scary',
    },
  ],

  scene_strategy: {
    type: 'problem_example_solution',
    scene_unit: 'financial_point_or_example',
    preferred_scene_duration_seconds: {
      min: 35,
      max: 70,
    },
    scene_focus: [
      'pension document',
      'household budget',
      'unexpected expense',
      'phone scam risk',
      'family money discussion',
      'careful shopping',
      'solution checklist without text',
    ],
  },

  image_density: {
    low: '1 image per 80 seconds',
    normal: '1 image per 50-65 seconds',
    high: '1 image per 35-45 seconds',
  },

  hero_image_strategy: {
    required: true,
    focus: [
      'elderly couple shocked by household bills',
      'senior looking at pension notice with concern',
      'phone scam warning moment',
      'retirement savings anxiety at kitchen table',
    ],
  },

  safety_rules: [
    'do not provide illegal tax evasion advice',
    'do not promise investment returns',
    'do not create misleading get-rich visuals',
    'avoid showing real bank brands',
    'avoid text inside generated image',
  ],

  negative_visual_rules: [
    'no text',
    'no fake numbers',
    'no bank logos',
    'no brand names',
    'no watermark',
    'no extreme despair',
    'no luxury fantasy style',
  ],
};

const elderlyLifestyleJpConfig = {
  config_id: 'elderly_lifestyle_jp',
  content_mode: 'educational_lifestyle',
  target_audience: 'Japanese seniors seeking calm, practical lifestyle guidance',
  language: 'ja',

  chunk_analysis_schema: 'elderly_lifestyle_chunk_analysis',

  chapter_strategy: {
    type: 'gentle_lifestyle_topic_flow',
    preferred_flow: [
      'daily_life_problem',
      'emotional_context',
      'common_pattern',
      'small_improvement',
      'daily_example',
      'practical_habit',
      'calm_conclusion',
    ],
  },

  metadata_strategy: {
    type: 'calm_lifestyle_hook',
    title_style: [
      'small_daily_change',
      'things_to_stop_after_60',
      'simple_habits_for_peaceful_life',
      'living_alone_wisdom',
      'retirement_life_realization',
    ],
  },

  visual_strategy: {
    primary_style: 'soft Japanese senior lifestyle anime illustration',
    mood: 'peaceful, reflective, warm, nostalgic',
    common_locations: ['quiet Japanese home', 'small garden', 'shopping street', 'park bench', 'kitchen', 'tatami room', 'local cafe'],
  },

  character_required: false,
  persona_required: true,

  scene_strategy: {
    type: 'daily_life_moment',
    preferred_scene_duration_seconds: {
      min: 40,
      max: 75,
    },
    scene_focus: ['ordinary senior life', 'quiet emotion', 'small habit', 'gentle realization', 'peaceful routine'],
  },

  image_density: {
    low: '1 image per 90 seconds',
    normal: '1 image per 60 seconds',
    high: '1 image per 45 seconds',
  },

  hero_image_strategy: {
    required: true,
    focus: [
      'quiet emotional senior life moment',
      'elderly person reflecting near window',
      'peaceful daily routine',
      'small but meaningful life change',
    ],
  },

  safety_rules: [
    'avoid depressing loneliness visuals',
    'avoid death-focused imagery',
    'avoid medical panic',
    'keep tone warm and dignified',
  ],

  negative_visual_rules: ['no text', 'no watermark', 'no exaggerated sadness', 'no horror lighting'],
};
