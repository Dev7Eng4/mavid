const COMMON_SENIOR_SAFETY_RULES = {
  factual_safety_rules: [
    'Use only information supported by the transcript or visual beat.',
    'Do not invent numbers, dates, laws, pension amounts, medical claims, legal outcomes, or official procedures.',
    'Do not turn a possibility into a guarantee.',
    'Preserve uncertainty if the transcript is uncertain.',
    'Avoid fear exaggeration.',
    'Avoid real company, bank, police, hospital, or government logos.',
  ],

  ignored_content_rules: [
    'generic greeting',
    'like and subscribe request',
    'repeated channel introduction',
    'non-informational filler',
    'unrelated personal chatter',
  ],

  general_scene_rules: [
    'One scene should communicate one clear idea.',
    'Use senior-friendly simple visuals.',
    'Avoid clutter and tiny labels.',
    'Prefer large icons, simple boards, and clear characters.',
    'Keep source_line_ids unchanged across pipeline.',
  ],
};

export const COMMON_SENIOR_FOOD_SAFETY_RULES = {
  factual_safety_rules: [
    'Use only information supported by the transcript or visual beat.',
    'Do not claim that a food cures, prevents, or treats a disease.',
    'Do not say a food guarantees dementia prevention, blood pressure reduction, blood sugar control, or weight loss.',
    'Do not replace medical treatment, medication, or professional dietary advice.',
    'Use cautious wording for health benefits, such as supports, may help, or is associated with.',
    'Do not invent nutrient amounts, calories, grams, percentages, or medical thresholds unless provided.',
    'For disease-related topics, include caution that people with medical conditions should consult a doctor or dietitian when appropriate.',
    'Avoid fear exaggeration and food shaming.',
    'Avoid extreme before/after health transformation claims.',
  ],

  ignored_content_rules: [
    'generic greeting',
    'like and subscribe request',
    'repeated channel introduction',
    'non-informational filler',
    'unrelated personal story without nutrition value',
  ],

  general_scene_rules: [
    'One scene should communicate one practical food or nutrition idea.',
    'Use senior-friendly simple visuals.',
    'Use familiar Japanese foods when possible.',
    'Avoid cluttered food tables.',
    'Avoid tiny nutrition labels.',
    'Prefer simple plates, bowls, shopping baskets, kitchen scenes, and checklist boards.',
    'Do not show medical cure imagery.',
  ],

  forbidden_health_claims_ja: [
    '治る',
    '完治',
    '必ず防ぐ',
    '絶対に改善',
    '薬はいらない',
    '医者いらず',
    '血管が完全に若返る',
    '認知症を完全予防',
    '血糖値が必ず下がる',
    '高血圧が治る',
  ],

  safer_health_phrases_ja: [
    '意識したい',
    '取り入れたい',
    'サポートする',
    '役立つ可能性がある',
    '摂りすぎに注意',
    '無理なく続ける',
    '医師に相談',
  ],
};

export const NICHE_CONFIGS = {
  senior_scam_prevention: {
    niche_id: 'senior_scam_prevention',
    niche_name_ja: '高齢者向け詐欺対策',
    niche_name_vi: 'Chống lừa đảo cho người già',
    audience: 'Japanese seniors and their families',
    primary_viewer: 'Japanese seniors 60+ and adult children who want to protect elderly parents',

    content_goal: 'Help seniors recognize common scam patterns and take simple prevention actions without panic.',
    emotional_tone: 'serious, protective, urgent but not frightening',
    trust_level: 'high',

    default_style_id: 'warning_explainer',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['case_example_scene', 'family_discussion_scene'],
      text_heavy_visual_types: ['warning_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'risk_warning',
      'example_case',
      'common_misunderstanding',
      'step_by_step_guide',
      'checklist',
      'family_discussion',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 20,
      preferred_visual_types: [
        'warning_slide',
        'checklist_slide',
        'case_example_scene',
        'phone_safety_scene',
        'family_discussion_scene',
        'summary_slide',
      ],
      preferred_layout_types: ['warning_card', 'left_text_right_character', 'checklist_board', 'step_flow_layout'],
      preferred_elements: [
        'elderly Japanese person receiving suspicious phone call',
        'generic smartphone',
        'warning triangle',
        'bank card without logo',
        'family consultation',
        'generic consultation counter',
        'checklist board',
      ],
      forbidden_elements: [
        'real police logo',
        'real bank logo',
        'real company logo',
        'violent criminal scene',
        'blood',
        'horror expression',
        'fake official seal',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new scam method appears',
        'a warning sign is introduced',
        'a prevention action is introduced',
        'the speaker moves from risk to solution',
        'a family consultation point appears',
        'a checklist begins',
      ],
      merge_when: [
        'several lines repeat the same warning',
        'the lines only transition between examples',
        'the speaker repeats general caution without new detail',
      ],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'suspicious phone call',
      'elderly Japanese person holding smartphone',
      'warning icon',
      'bank card',
      'family support',
      'fraud prevention checklist',
    ],

    thumbnail_rules: {
      emotional_angle: 'mild fear + protection',
      title_style: 'warning + practical prevention',
      recommended_copy_patterns_ja: ['その電話 危険', '高齢者が狙われる', '家族が守る', '詐欺のサイン'],
      color_direction: 'yellow caution + red warning + dark navy contrast',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['violent criminal', 'police logo', 'bank logo', 'extreme fear face'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が狙われる詐欺の手口と対策をやさしく解説',
        'その電話、本当に大丈夫？高齢者が知るべき詐欺対策',
        '家族で確認したい高齢者向け詐欺防止のポイント',
      ],
      core_tags_ja: ['高齢者 詐欺', '特殊詐欺 対策', 'シニア 防犯', '電話詐欺', '老後 生活', '家族で守る'],
      hashtags_ja: ['#高齢者', '#詐欺対策', '#特殊詐欺', '#シニアライフ', '#防犯'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_smartphone_safety: {
    niche_id: 'senior_smartphone_safety',
    niche_name_ja: 'シニア向けスマホ安全',
    niche_name_vi: 'Smartphone an toàn cho senior',
    audience: 'Japanese seniors using smartphones',
    primary_viewer: 'Japanese seniors who use smartphones and adult children helping them',

    content_goal:
      'Teach simple smartphone safety habits for seniors, including suspicious links, passwords, settings, and family consultation.',
    emotional_tone: 'friendly, reassuring, practical',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['warning_explainer', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['family_discussion_scene'],
      text_heavy_visual_types: ['warning_slide', 'checklist_slide', 'step_by_step_guide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'risk_warning',
      'common_misunderstanding',
      'step_by_step_guide',
      'checklist',
      'safety_point',
      'family_discussion',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 20,
      preferred_visual_types: ['phone_safety_scene', 'warning_slide', 'checklist_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['left_text_right_character', 'checklist_board', 'warning_card', 'step_flow_layout'],
      preferred_elements: [
        'elderly Japanese person using smartphone',
        'generic smartphone screen',
        'lock icon',
        'shield icon',
        'warning icon',
        'family member helping',
        'simple settings board',
      ],
      forbidden_elements: [
        'real app logo',
        'LINE logo',
        'Google logo',
        'Apple logo',
        'carrier logo',
        'bank app logo',
        'exact app UI unless provided',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new smartphone risk appears',
        'a suspicious link or message is mentioned',
        'a setting or action is introduced',
        'a password or account safety point appears',
        'a family consultation action appears',
      ],
      merge_when: ['several lines repeat the same safety advice', 'the lines only say to be careful without new detail'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'elderly Japanese person using smartphone',
      'generic smartphone',
      'security lock icon',
      'shield icon',
      'suspicious link warning',
      'family support',
    ],

    thumbnail_rules: {
      emotional_angle: 'concern + easy solution',
      title_style: 'problem + simple check',
      recommended_copy_patterns_ja: ['そのリンク危険', '押す前に確認', 'スマホ安全', '設定を見直す'],
      color_direction: 'blue trust + yellow caution + red small warning',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['real app logo', 'real phone brand logo', 'fake app UI'],
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニアがスマホで気をつけたい安全設定と詐欺対策',
        '押す前に確認！高齢者向けスマホ安全の基本',
        'スマホ詐欺を防ぐために家族で確認したいこと',
      ],
      core_tags_ja: ['シニア スマホ', 'スマホ安全', '高齢者 スマホ', 'スマホ詐欺', '迷惑メール', '怪しいリンク'],
      hashtags_ja: ['#シニアスマホ', '#スマホ安全', '#高齢者', '#詐欺対策'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  home_safety_prevention: {
    niche_id: 'home_safety_prevention',
    niche_name_ja: '高齢者の家の安全対策',
    niche_name_vi: 'An toàn trong nhà, chống té ngã',
    audience: 'Japanese seniors living at home and families caring for them',
    primary_viewer: 'Seniors and adult children who want to prevent falls and home accidents',

    content_goal: 'Explain simple home safety improvements to reduce fall and accident risks.',
    emotional_tone: 'practical, protective, calm',
    trust_level: 'high',

    default_style_id: 'warning_explainer',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['home_safety_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['warning_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'risk_warning',
      'safety_point',
      'checklist',
      'step_by_step_guide',
      'example_case',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 22,
      preferred_visual_types: ['home_safety_scene', 'warning_slide', 'checklist_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['warning_card', 'checklist_board', 'before_after_layout', 'left_text_right_character'],
      preferred_elements: [
        'elderly Japanese person at home',
        'bathroom handrail',
        'non-slip mat',
        'stairs',
        'night light',
        'clear floor',
        'warning icon',
      ],
      forbidden_elements: ['bloody accident', 'dramatic fall injury', 'hospital emergency scene', 'horror mood', 'extreme fear'],
    },

    segmentation_rules: {
      split_when: [
        'a new home risk area appears',
        'a new prevention measure appears',
        'the speaker moves from risk to checklist',
        'bathroom, stairs, kitchen, bedroom, or hallway is introduced',
      ],
      merge_when: ['several lines describe the same risk area', 'advice is repeated without new action'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['elderly Japanese person at home', 'fall prevention', 'handrail', 'non-slip mat', 'night light', 'safe hallway'],

    thumbnail_rules: {
      emotional_angle: 'prevent regret + protect daily life',
      title_style: 'warning + checklist',
      recommended_copy_patterns_ja: ['転倒を防ぐ', '家の危険サイン', '今すぐ確認', 'ここが危ない'],
      color_direction: 'yellow caution + warm home background',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の転倒を防ぐ家の安全対策をやさしく解説',
        '家の中の危険サインとシニア向け安全チェック',
        '今日からできる高齢者の転倒予防と住まいの工夫',
      ],
      core_tags_ja: ['高齢者 転倒予防', '家の安全対策', 'シニア 住まい', '介護予防', 'バリアフリー'],
      hashtags_ja: ['#転倒予防', '#高齢者', '#シニアライフ', '#家の安全'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_pension_easy: {
    niche_id: 'senior_pension_easy',
    niche_name_ja: '年金をやさしく解説',
    niche_name_vi: 'Giải thích lương hưu dễ hiểu',
    audience: 'Japanese seniors approaching or living in retirement',
    primary_viewer: 'Japanese people around 55–75 who want simple pension explanations',

    content_goal: 'Explain pension concepts simply and help viewers understand choices and cautions without overclaiming.',
    emotional_tone: 'calm, educational, trustworthy',
    trust_level: 'very_high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['clean_tv_slide', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene'],
      text_heavy_visual_types: ['comparison_slide', 'simple_chart_scene', 'document_table_scene', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'basic_explanation',
      'common_misunderstanding',
      'comparison',
      'important_condition',
      'money_point',
      'checklist',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['comparison_slide', 'simple_chart_scene', 'document_table_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: [
        'comparison_board',
        'simple_chart_slide',
        'document_explanation',
        'left_text_right_character',
        'summary_board',
      ],
      preferred_elements: [
        'elderly Japanese couple',
        'pension documents',
        'calendar',
        'yen icon',
        'simple age timeline',
        'simple comparison board',
        'generic official-looking document without logo',
      ],
      forbidden_elements: [
        'specific pension amount unless provided',
        'specific reduction percentage unless provided',
        'unverified law change',
        'fake government logo',
        'real government seal',
        'complex legal table',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new pension concept appears',
        'a benefit and a disadvantage are both mentioned',
        'a comparison is introduced',
        'a specific condition or exception is explained',
        'the speaker moves from explanation to advice',
        'the viewer is asked to check something',
      ],
      merge_when: [
        'several lines repeat the same pension concept',
        'the lines only transition without new information',
        'generic greeting or subscribe request',
      ],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'elderly Japanese couple',
      'pension documents',
      'calendar',
      'yen symbol',
      'age comparison',
      'simple pension explanation board',
    ],

    thumbnail_rules: {
      emotional_angle: 'curiosity + mild concern',
      title_style: 'benefit + caution + easy explanation',
      recommended_copy_patterns_ja: ['年金の落とし穴', '知らないと損', '60歳と65歳', '受け取り方で差'],
      color_direction: 'blue trust + yellow highlight + red caution accent',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['invented pension amounts', 'fake official logo', 'overly scary expression'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '年金の基本をやさしく解説｜知らないと損する注意点',
        '年金はいつから受け取る？60歳・65歳の違いをやさしく解説',
        '老後のお金で後悔しないための年金チェックポイント',
      ],
      core_tags_ja: ['年金', '老後のお金', '年金生活', '繰上げ受給', '繰下げ受給', 'シニアライフ'],
      hashtags_ja: ['#年金', '#老後のお金', '#シニアライフ', '#年金生活'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  pension_life_saving: {
    niche_id: 'pension_life_saving',
    niche_name_ja: '年金生活の節約術',
    niche_name_vi: 'Tiết kiệm khi sống bằng lương hưu',
    audience: 'Japanese seniors living mainly on pension income',
    primary_viewer: 'Japanese seniors concerned about monthly living costs',

    content_goal: 'Explain practical ways to reduce daily living expenses while keeping dignity and comfort.',
    emotional_tone: 'practical, empathetic, hopeful',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['simple_3d_infographic', 'clean_tv_slide', 'gentle_lifestyle'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'simple_chart_scene', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'problem_statement',
      'money_point',
      'comparison',
      'checklist',
      'step_by_step_guide',
      'example_case',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 22,
      preferred_visual_types: [
        'checklist_slide',
        'comparison_slide',
        'simple_chart_scene',
        'food_lifestyle_scene',
        'character_explanation',
        'summary_slide',
      ],
      preferred_layout_types: ['checklist_board', 'comparison_board', 'before_after_layout', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'elderly Japanese woman checking household budget',
        'grocery receipt',
        'yen coins',
        'monthly expense chart',
        'electricity bill',
        'simple savings checklist',
        'small kitchen table',
      ],
      forbidden_elements: [
        'guaranteed saving amount unless provided',
        'extreme poverty depiction',
        'shaming seniors',
        'luxury comparison',
        'specific financial product recommendation',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new expense category appears',
        'a new saving method appears',
        'a before/after comparison appears',
        'a checklist point appears',
        'the speaker moves from problem to action',
      ],
      merge_when: ['multiple lines repeat the same saving idea', 'general encouragement without new method'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'household budget',
      'grocery receipt',
      'yen coins',
      'elderly Japanese person saving money',
      'monthly expense board',
      'simple checklist',
    ],

    thumbnail_rules: {
      emotional_angle: 'money anxiety + practical relief',
      title_style: 'saving method + pension life',
      recommended_copy_patterns_ja: ['年金生活の節約', '毎月のムダ', '老後のお金を守る', '固定費を見直す'],
      color_direction: 'yellow money highlight + green saving accent + warm home tone',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '年金生活で見直したい節約術｜毎月のムダを減らす方法',
        '老後のお金を守るための年金生活の節約ポイント',
        '無理なく続けるシニア向け生活費の節約術',
      ],
      core_tags_ja: ['年金生活 節約', '老後 節約', 'シニア 節約', '生活費 見直し', '老後のお金', '固定費削減'],
      hashtags_ja: ['#年金生活', '#節約', '#老後のお金', '#シニアライフ'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_public_benefits: {
    niche_id: 'senior_public_benefits',
    niche_name_ja: '高齢者向け公的支援・給付金',
    niche_name_vi: 'Trợ cấp / hỗ trợ công cho người già',
    audience: 'Japanese seniors and families looking for public support programs',
    primary_viewer: 'Seniors who want to know what public benefits may exist',

    content_goal: 'Explain public support and benefit topics in a cautious, non-misleading, easy-to-understand way.',
    emotional_tone: 'trustworthy, careful, helpful',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene'],
      text_heavy_visual_types: ['document_table_scene', 'checklist_slide', 'simple_chart_scene', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'basic_explanation',
      'important_condition',
      'checklist',
      'step_by_step_guide',
      'risk_warning',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['document_table_scene', 'checklist_slide', 'simple_chart_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['document_explanation', 'checklist_board', 'simple_chart_slide', 'summary_board'],
      preferred_elements: [
        'generic application document',
        'elderly Japanese person at consultation desk',
        'checklist board',
        'calendar',
        'yen icon',
        'generic municipal building without logo',
      ],
      forbidden_elements: [
        'fake government logo',
        'fake seal',
        'guaranteed eligibility',
        'specific amount unless provided',
        'real municipal logo',
        'legal certainty without source',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new benefit or support program appears',
        'eligibility condition appears',
        'application step appears',
        'a caution or deadline appears',
        'viewer is told to check something',
      ],
      merge_when: ['the same benefit is repeated without new condition', 'the lines only introduce the topic generally'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'public benefit document',
      'elderly Japanese person consulting',
      'yen icon',
      'checklist',
      'calendar',
      'generic municipal support',
    ],

    thumbnail_rules: {
      emotional_angle: 'maybe missing support + check now',
      title_style: 'public support + eligibility caution',
      recommended_copy_patterns_ja: ['知らない支援', '申請前に確認', 'もらえる可能性', '公的支援'],
      color_direction: 'blue trust + yellow highlight',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['guaranteed money', 'fake government logo', 'specific amount unless provided'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が確認したい公的支援と給付金の基本',
        '知らないと損するかもしれないシニア向け公的支援',
        '申請前に確認したい高齢者向け支援制度のポイント',
      ],
      core_tags_ja: ['高齢者 支援', '公的支援', '給付金', 'シニア 生活', '老後のお金', '申請'],
      hashtags_ja: ['#高齢者支援', '#公的支援', '#給付金', '#老後のお金'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_tax_social_insurance: {
    niche_id: 'senior_tax_social_insurance',
    niche_name_ja: 'シニア向け税金・社会保険の基本',
    niche_name_vi: 'Thuế / bảo hiểm xã hội cho senior',
    audience: 'Japanese seniors who want simple explanations of taxes and social insurance',
    primary_viewer: 'Retirees and pre-retirees confused by taxes, insurance premiums, and deductions',

    content_goal: 'Explain taxes and social insurance basics carefully without giving individual tax advice.',
    emotional_tone: 'clear, careful, trustworthy',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: [],
      text_heavy_visual_types: ['document_table_scene', 'simple_chart_scene', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'basic_explanation',
      'comparison',
      'important_condition',
      'money_point',
      'risk_warning',
      'checklist',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['document_table_scene', 'simple_chart_scene', 'comparison_slide', 'checklist_slide', 'summary_slide'],
      preferred_layout_types: ['document_explanation', 'simple_chart_slide', 'comparison_board', 'checklist_board'],
      preferred_elements: [
        'generic tax document',
        'insurance card without logo',
        'calculator',
        'yen icon',
        'elderly person reviewing documents',
        'simple comparison board',
      ],
      forbidden_elements: [
        'specific tax calculation unless provided',
        'individual tax advice',
        'fake official seal',
        'real government logo',
        'complex small table',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new tax or insurance concept appears',
        'a calculation condition appears',
        'a deduction or premium topic appears',
        'a caution or exception appears',
      ],
      merge_when: ['several lines explain the same document', 'no new condition is added'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['tax document', 'social insurance', 'calculator', 'yen icon', 'elderly Japanese person checking documents'],

    thumbnail_rules: {
      emotional_angle: 'confusion + clarity',
      title_style: 'tax/social insurance + easy explanation',
      recommended_copy_patterns_ja: ['税金の基本', '社会保険の注意', '老後の負担', '知らないと損'],
      color_direction: 'blue trust + gray document + yellow highlight',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニア向け税金と社会保険の基本をやさしく解説',
        '老後に確認したい税金・社会保険の注意点',
        '年金生活で知っておきたい税金と保険料の基本',
      ],
      core_tags_ja: ['シニア 税金', '社会保険', '年金生活 税金', '老後のお金', '保険料', '控除'],
      hashtags_ja: ['#税金', '#社会保険', '#年金生活', '#老後のお金'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  end_of_life_planning: {
    niche_id: 'end_of_life_planning',
    niche_name_ja: '終活の始め方',
    niche_name_vi: 'Chuẩn bị cuối đời nhập môn',
    audience: 'Japanese seniors and adult children',
    primary_viewer: 'Seniors who want to prepare calmly and families who want to avoid future confusion',

    content_goal: 'Explain end-of-life planning gently and practically without dark fear-based visuals.',
    emotional_tone: 'gentle, respectful, calm',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide', 'document_table_scene'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'checklist',
      'family_discussion',
      'emotional_reflection',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 32,
      preferred_visual_types: [
        'emotional_lifestyle_scene',
        'family_discussion_scene',
        'checklist_slide',
        'document_table_scene',
        'summary_slide',
      ],
      preferred_layout_types: [
        'emotional_lifestyle_scene',
        'family_discussion',
        'checklist_board',
        'document_explanation',
        'summary_board',
      ],
      preferred_elements: [
        'elderly Japanese person writing ending notebook',
        'family discussion at table',
        'documents on table',
        'warm living room',
        'photo frame',
        'simple checklist',
      ],
      forbidden_elements: [
        'funeral imagery',
        'dark death symbolism',
        'crying close-up',
        'hospital deathbed',
        'fear-based visual',
        'fake legal seal',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new preparation item appears',
        'family discussion is introduced',
        'document organization is mentioned',
        'medical or care wishes are mentioned',
        'the speaker moves from emotional concern to practical action',
      ],
      merge_when: ['several lines express the same emotional concern', 'the lines only encourage starting slowly'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'ending notebook',
      'elderly Japanese person writing',
      'family discussion',
      'warm living room',
      'documents',
      'gentle preparation',
    ],

    thumbnail_rules: {
      emotional_angle: 'avoid regret + family peace',
      title_style: 'gentle beginner guide',
      recommended_copy_patterns_ja: ['終活の始め方', 'まず書くこと', '家族のために', '後悔しない準備'],
      color_direction: 'warm cream + soft brown + gentle yellow',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['dark funeral', 'death symbolism', 'crying face'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '終活は何から始める？家族のためにできる準備をやさしく解説',
        '後悔しない終活の始め方｜まず確認したいこと',
        'シニアが今からできる終活の基本とエンディングノート',
      ],
      core_tags_ja: ['終活', 'エンディングノート', '老後 準備', '家族のために', 'シニアライフ', '財産整理'],
      hashtags_ja: ['#終活', '#エンディングノート', '#シニアライフ', '#老後準備'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  inheritance_will_intro: {
    niche_id: 'inheritance_will_intro',
    niche_name_ja: '相続・遺言の超入門',
    niche_name_vi: 'Thừa kế / di chúc cực dễ hiểu',
    audience: 'Japanese seniors and families',
    primary_viewer: 'Seniors and adult children who want to prevent family inheritance trouble',

    content_goal: 'Explain inheritance and wills at a beginner level while avoiding legal overclaim.',
    emotional_tone: 'serious, clear, preventive',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic', 'gentle_lifestyle'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['family_discussion_scene'],
      text_heavy_visual_types: ['document_table_scene', 'comparison_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'risk_warning',
      'important_condition',
      'family_discussion',
      'checklist',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['document_table_scene', 'family_discussion_scene', 'checklist_slide', 'simple_chart_scene', 'summary_slide'],
      preferred_layout_types: ['document_explanation', 'family_discussion', 'checklist_board', 'simple_chart_slide', 'summary_board'],
      preferred_elements: [
        'elderly Japanese couple reviewing documents',
        'family meeting',
        'generic will document',
        'family tree diagram',
        'seal stamp without official logo',
        'consultation desk',
      ],
      forbidden_elements: [
        'specific legal advice',
        'fake legal result',
        'invented inheritance amount',
        'real court logo',
        'fake official seal',
        'angry family fight exaggeration',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new inheritance concept appears',
        'a risk of family trouble appears',
        'a will-related point appears',
        'a document or procedure is explained',
        'a consultation recommendation appears',
      ],
      merge_when: ['several lines repeat the same inheritance concern', 'the lines only transition between legal topics'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'inheritance document',
      'will document',
      'elderly Japanese family meeting',
      'family tree',
      'consultation desk',
      'documents on table',
    ],

    thumbnail_rules: {
      emotional_angle: 'family trouble prevention',
      title_style: 'risk prevention + beginner explanation',
      recommended_copy_patterns_ja: ['相続で揉めない', '遺言の基本', '家族が困る前に', 'まず確認'],
      color_direction: 'navy trust + yellow highlight + document white',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '相続・遺言の基本を超入門でやさしく解説',
        '家族が揉めないために知っておきたい相続と遺言',
        'シニアが確認したい相続準備と遺言の注意点',
      ],
      core_tags_ja: ['相続', '遺言', 'シニア 相続', '終活', '家族トラブル', '老後 準備'],
      hashtags_ja: ['#相続', '#遺言', '#終活', '#シニアライフ'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  parent_care_preparation: {
    niche_id: 'parent_care_preparation',
    niche_name_ja: '親の介護準備',
    niche_name_vi: 'Chuẩn bị chăm sóc cha mẹ già',
    audience: 'Japanese adult children and seniors preparing for care',
    primary_viewer: 'Adult children in Japan and seniors who want to prepare before care becomes urgent',

    content_goal:
      'Explain how to prepare for parent care calmly, including family conversation, documents, home safety, and care services.',
    emotional_tone: 'practical, empathetic, calm',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['family_discussion_scene', 'emotional_lifestyle_scene', 'medical_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide', 'document_table_scene'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'family_discussion',
      'checklist',
      'step_by_step_guide',
      'important_condition',
      'emotional_reflection',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 32,
      preferred_visual_types: [
        'family_discussion_scene',
        'emotional_lifestyle_scene',
        'checklist_slide',
        'medical_lifestyle_scene',
        'summary_slide',
      ],
      preferred_layout_types: [
        'family_discussion',
        'emotional_lifestyle_scene',
        'checklist_board',
        'document_explanation',
        'summary_board',
      ],
      preferred_elements: [
        'adult child talking with elderly parent',
        'family table conversation',
        'care notebook',
        'home safety checklist',
        'generic care consultation desk',
        'warm living room',
      ],
      forbidden_elements: [
        'severe hospital scene',
        'bedridden suffering close-up',
        'medical emergency',
        'dark depressing room',
        'fear-based imagery',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new care preparation item appears',
        'family discussion is introduced',
        'home safety or documents are mentioned',
        'care service or consultation is mentioned',
        'the speaker moves from concern to practical action',
      ],
      merge_when: ['several lines repeat the same care concern', 'general emotional statements without a new action'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'adult child and elderly parent',
      'care preparation',
      'family discussion',
      'care notebook',
      'home safety',
      'consultation',
    ],

    thumbnail_rules: {
      emotional_angle: 'prepare before crisis',
      title_style: 'care preparation + family conversation',
      recommended_copy_patterns_ja: ['親の介護準備', '今から確認', '家族で話すこと', '急ぐ前に準備'],
      color_direction: 'warm home tone + soft blue trust',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '親の介護は何から準備する？家族で確認したいポイント',
        '介護で慌てないために今からできる準備',
        '親の介護前に話しておきたいことをやさしく解説',
      ],
      core_tags_ja: ['親の介護', '介護準備', '家族介護', '高齢者 介護', '介護相談', 'シニアライフ'],
      hashtags_ja: ['#介護', '#親の介護', '#介護準備', '#家族'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  long_term_care_insurance: {
    niche_id: 'long_term_care_insurance',
    niche_name_ja: '介護保険をやさしく解説',
    niche_name_vi: 'Giải thích bảo hiểm chăm sóc dài hạn',
    audience: 'Japanese seniors and families learning about long-term care insurance',
    primary_viewer: 'Seniors and family caregivers confused by care insurance procedures',

    content_goal: 'Explain long-term care insurance basics, certification, and service usage without legal/procedural overclaim.',
    emotional_tone: 'clear, careful, reassuring',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['family_discussion_scene'],
      text_heavy_visual_types: ['document_table_scene', 'step_by_step_guide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'basic_explanation',
      'important_condition',
      'step_by_step_guide',
      'checklist',
      'family_discussion',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['document_table_scene', 'checklist_slide', 'simple_chart_scene', 'family_discussion_scene', 'summary_slide'],
      preferred_layout_types: ['document_explanation', 'step_flow_layout', 'checklist_board', 'simple_chart_slide'],
      preferred_elements: [
        'generic care insurance document',
        'elderly person and family at consultation desk',
        'care manager-like generic advisor',
        'step flow board',
        'checklist',
      ],
      forbidden_elements: [
        'specific procedure guarantee',
        'fake municipal logo',
        'fake official seal',
        'medical overclaim',
        'real facility logo',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new care insurance concept appears',
        'certification or application step appears',
        'a service type appears',
        'a family consultation point appears',
        'a caution or condition appears',
      ],
      merge_when: ['several lines repeat the same procedure', 'the lines only transition between steps'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['care insurance document', 'consultation desk', 'elderly person with family', 'step flow', 'care support'],

    thumbnail_rules: {
      emotional_angle: 'reduce confusion + prepare calmly',
      title_style: 'care insurance + easy explanation',
      recommended_copy_patterns_ja: ['介護保険の基本', '申請前に確認', '家族で知る', '使い方の流れ'],
      color_direction: 'blue trust + green care accent + white document',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '介護保険の基本をやさしく解説｜申請前に知りたいこと',
        '家族で確認したい介護保険の流れと注意点',
        '介護保険はどう使う？シニア向けにわかりやすく解説',
      ],
      core_tags_ja: ['介護保険', '高齢者 介護', '介護サービス', '要介護認定', '家族介護', '老後 準備'],
      hashtags_ja: ['#介護保険', '#介護', '#高齢者', '#家族介護'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_meal_saving_alone: {
    niche_id: 'senior_meal_saving_alone',
    niche_name_ja: 'シニア一人暮らしの食事節約',
    niche_name_vi: 'Ăn uống tiết kiệm cho người già sống một mình',
    audience: 'Japanese seniors living alone',
    primary_viewer: 'Seniors who want affordable, simple, healthy daily meals',

    content_goal: 'Explain simple and affordable meal habits for seniors living alone without medical overclaim.',
    emotional_tone: 'warm, practical, encouraging',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'money_point',
      'checklist',
      'step_by_step_guide',
      'example_case',
      'emotional_reflection',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 25,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'comparison_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'checklist_board', 'before_after_layout', 'left_text_right_character'],
      preferred_elements: [
        'elderly Japanese person cooking simple meal',
        'small kitchen',
        'rice bowl',
        'vegetables',
        'shopping basket',
        'grocery receipt',
        'meal prep containers',
      ],
      forbidden_elements: [
        'extreme poverty depiction',
        'spoiled food',
        'medical diet claim',
        'unrealistic luxury meal',
        'shaming lonely seniors',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new meal saving method appears',
        'a shopping tip appears',
        'a cooking or storage tip appears',
        'a nutrition caution appears',
        'a loneliness or routine point appears',
      ],
      merge_when: ['several lines describe the same meal idea', 'general encouragement without new action'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['elderly Japanese person cooking', 'simple meal', 'small kitchen', 'grocery receipt', 'shopping basket', 'meal prep'],

    thumbnail_rules: {
      emotional_angle: 'save money + eat well alone',
      title_style: 'meal saving + simple daily habit',
      recommended_copy_patterns_ja: ['一人暮らしの食費', '安くて安心', '食費を守る', '簡単ごはん'],
      color_direction: 'warm kitchen tone + green healthy accent + yellow money highlight',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニア一人暮らしの食事節約｜無理なく続く簡単ごはん',
        '年金生活でも安心できる一人暮らしの食費節約術',
        '高齢者の一人ごはんを安く簡単にする工夫',
      ],
      core_tags_ja: ['シニア 一人暮らし', '食費 節約', '高齢者 食事', '年金生活 節約', '一人ごはん', '簡単ごはん'],
      hashtags_ja: ['#一人暮らし', '#食費節約', '#シニアライフ', '#簡単ごはん'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_loneliness_living_alone: {
    niche_id: 'senior_loneliness_living_alone',
    niche_name_ja: '老後の孤独・一人暮らし',
    niche_name_vi: 'Cô đơn tuổi già và đời sống một mình',
    audience: 'Japanese seniors living alone or feeling isolated',
    primary_viewer: 'Seniors who live alone and families concerned about isolation',

    content_goal: 'Discuss loneliness and living alone gently, with practical emotional and social support ideas.',
    emotional_tone: 'gentle, empathetic, hopeful',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['cinematic_senior_documentary', 'soft_anime_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'rare',
      preferred_text_modes: ['no_text', 'minimal_label_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene', 'character_explanation'],
      text_heavy_visual_types: ['summary_slide'],
      max_text_blocks: 1,
    },

    preferred_beat_types: [
      'problem_statement',
      'emotional_reflection',
      'example_case',
      'family_discussion',
      'step_by_step_guide',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'low',
      average_scene_duration_sec: 45,
      preferred_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'family_discussion', 'center_character_with_side_icons', 'summary_board'],
      preferred_elements: [
        'elderly Japanese person drinking tea at home',
        'phone call with family',
        'community activity',
        'walking in neighborhood',
        'sunlight through window',
        'small daily routine',
      ],
      forbidden_elements: [
        'suicide implication',
        'death symbolism',
        'dark empty room',
        'crying close-up',
        'extreme despair',
        'abandoned elderly person',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new emotional issue appears',
        'a practical connection method appears',
        'family or community support is introduced',
        'the speaker moves from loneliness to solution',
      ],
      merge_when: ['several lines express the same feeling', 'the passage is reflective without a new actionable point'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'elderly Japanese person alone at home',
      'warm tea',
      'phone call',
      'community center',
      'gentle sunlight',
      'hopeful senior life',
    ],

    thumbnail_rules: {
      emotional_angle: 'loneliness + gentle hope',
      title_style: 'emotional concern + practical support',
      recommended_copy_patterns_ja: ['老後の孤独', '一人でも安心', 'つながりを作る', '心が軽くなる'],
      color_direction: 'warm cream + soft blue + gentle orange',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['extreme sadness', 'dark room', 'death implication'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '老後の孤独を和らげる一人暮らしの小さな習慣',
        'シニア一人暮らしで心が軽くなる暮らし方',
        '老後の孤独と向き合うためにできること',
      ],
      core_tags_ja: ['老後の孤独', 'シニア 一人暮らし', '高齢者 一人暮らし', '孤独対策', 'シニアライフ', '老後の暮らし'],
      hashtags_ja: ['#老後の孤独', '#一人暮らし', '#シニアライフ', '#高齢者'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_sleep_routine: {
    niche_id: 'senior_sleep_routine',
    niche_name_ja: 'シニアの睡眠習慣',
    niche_name_vi: 'Thói quen ngủ cho senior',
    audience: 'Japanese seniors who want better daily sleep habits',
    primary_viewer: 'Seniors concerned about sleep rhythm and daily energy',

    content_goal: 'Explain gentle sleep routine ideas without medical diagnosis or guaranteed health claims.',
    emotional_tone: 'calm, reassuring, lifestyle-focused',
    trust_level: 'medium_high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene', 'medical_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'checklist',
      'step_by_step_guide',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 35,
      preferred_visual_types: ['emotional_lifestyle_scene', 'checklist_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'checklist_board', 'step_flow_layout', 'summary_board'],
      preferred_elements: [
        'elderly Japanese person preparing for bed',
        'warm bedroom',
        'morning sunlight',
        'tea cup',
        'clock',
        'gentle evening routine',
      ],
      forbidden_elements: ['medical diagnosis', 'sleep medicine packaging', 'hospital scene', 'guaranteed cure claim', 'dark anxiety mood'],
    },

    segmentation_rules: {
      split_when: [
        'a new sleep habit appears',
        'morning or evening routine is introduced',
        'a caution about lifestyle appears',
        'a checklist starts',
      ],
      merge_when: ['several lines describe the same routine', 'general relaxation statements without new tip'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['elderly Japanese person sleeping routine', 'warm bedroom', 'morning sunlight', 'clock', 'tea', 'calm night'],

    thumbnail_rules: {
      emotional_angle: 'sleep worry + calm routine',
      title_style: 'simple sleep habit guide',
      recommended_copy_patterns_ja: ['眠れない夜に', '睡眠習慣', '朝までぐっすり', '夜の過ごし方'],
      color_direction: 'night blue + warm lamp light',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニアの睡眠習慣を整えるやさしい夜の過ごし方',
        '高齢者が眠りやすくなる生活習慣の基本',
        '老後の睡眠リズムを整えるためにできること',
      ],
      core_tags_ja: ['シニア 睡眠', '高齢者 睡眠', '睡眠習慣', '老後の健康', '生活習慣'],
      hashtags_ja: ['#睡眠習慣', '#シニアライフ', '#高齢者', '#生活習慣'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_hobbies_brain_health: {
    niche_id: 'senior_hobbies_brain_health',
    niche_name_ja: 'シニアの趣味・脳活',
    niche_name_vi: 'Sở thích / hoạt động não bộ cho senior',
    audience: 'Japanese seniors looking for meaningful hobbies and mental stimulation',
    primary_viewer: 'Seniors who want enjoyable daily activities',

    content_goal: 'Introduce hobby and brain-activity ideas in a positive lifestyle-oriented way without medical cure claims.',
    emotional_tone: 'positive, gentle, motivating',
    trust_level: 'medium_high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'example_case',
      'checklist',
      'step_by_step_guide',
      'emotional_reflection',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 32,
      preferred_visual_types: ['emotional_lifestyle_scene', 'checklist_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'checklist_board', 'center_character_with_side_icons'],
      preferred_elements: [
        'elderly Japanese person gardening',
        'calligraphy',
        'puzzle',
        'walking group',
        'reading book',
        'music activity',
        'community class',
      ],
      forbidden_elements: ['medical cure claim', 'dementia cure implication', 'overly childish depiction', 'forced happiness'],
    },

    segmentation_rules: {
      split_when: ['a new hobby appears', 'a social activity appears', 'a routine or habit is introduced', 'a motivation point appears'],
      merge_when: ['several lines describe the same hobby', 'general positive statements without new activity'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['senior hobby', 'elderly Japanese person gardening', 'calligraphy', 'puzzle', 'reading', 'community activity'],

    thumbnail_rules: {
      emotional_angle: 'enjoyable daily purpose',
      title_style: 'hobby + healthy routine',
      recommended_copy_patterns_ja: ['脳活習慣', '老後の趣味', '毎日が楽しくなる', '始めやすい趣味'],
      color_direction: 'warm green + soft yellow + natural light',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニアにおすすめの趣味と脳活習慣をやさしく紹介',
        '老後の毎日が楽しくなる始めやすい趣味',
        '高齢者が無理なく続けられる脳活と暮らしの習慣',
      ],
      core_tags_ja: ['シニア 趣味', '脳活', '高齢者 趣味', '老後 楽しみ', 'シニアライフ', '認知症予防'],
      hashtags_ja: ['#シニア趣味', '#脳活', '#シニアライフ', '#老後の楽しみ'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  medical_expense_saving: {
    niche_id: 'medical_expense_saving',
    niche_name_ja: '高齢者の医療費節約',
    niche_name_vi: 'Tiết kiệm chi phí y tế cho người già',
    audience: 'Japanese seniors concerned about medical expenses',
    primary_viewer: 'Seniors living on pension who want to understand medical cost burden carefully',

    content_goal: 'Explain medical expense saving and cost-awareness topics carefully without giving medical or legal advice.',
    emotional_tone: 'careful, practical, reassuring',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['medical_lifestyle_scene'],
      text_heavy_visual_types: ['document_table_scene', 'comparison_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'basic_explanation',
      'money_point',
      'comparison',
      'important_condition',
      'checklist',
      'risk_warning',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['document_table_scene', 'comparison_slide', 'checklist_slide', 'medical_lifestyle_scene', 'summary_slide'],
      preferred_layout_types: ['document_explanation', 'comparison_board', 'checklist_board', 'simple_chart_slide'],
      preferred_elements: [
        'elderly Japanese person checking medical bill',
        'generic health insurance card without logo',
        'hospital reception without logo',
        'yen icon',
        'medical expense document',
        'consultation desk',
      ],
      forbidden_elements: [
        'medical diagnosis',
        'medicine recommendation',
        'specific cost unless provided',
        'hospital logo',
        'insurance company logo',
        'guaranteed savings',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new medical cost concept appears',
        'a support system or expense category appears',
        'a condition or caution appears',
        'a checklist point appears',
      ],
      merge_when: ['several lines repeat the same cost concern', 'general health statements without new financial point'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'medical bill',
      'elderly Japanese person checking documents',
      'health insurance card',
      'yen icon',
      'hospital reception',
      'cost checklist',
    ],

    thumbnail_rules: {
      emotional_angle: 'medical cost worry + practical check',
      title_style: 'medical cost + saving caution',
      recommended_copy_patterns_ja: ['医療費の負担', '知らない制度', '節約の注意', '申請前に確認'],
      color_direction: 'clean white + blue medical trust + yellow highlight',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の医療費を見直すために知っておきたい基本',
        '年金生活で気になる医療費の負担と確認ポイント',
        'シニア向け医療費節約の考え方をやさしく解説',
      ],
      core_tags_ja: ['高齢者 医療費', '医療費 節約', '年金生活', '老後のお金', '健康保険', 'シニアライフ'],
      hashtags_ja: ['#医療費', '#高齢者', '#年金生活', '#老後のお金'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  heatstroke_prevention_seniors: {
    niche_id: 'heatstroke_prevention_seniors',
    niche_name_ja: '高齢者の熱中症対策',
    niche_name_vi: 'Phòng tránh say nắng / sốc nhiệt cho người già',
    audience: 'Japanese seniors and families during hot seasons',
    primary_viewer: 'Seniors and families concerned about summer heat safety',

    content_goal: 'Explain heat safety habits for seniors in a practical, non-alarming way.',
    emotional_tone: 'protective, practical, clear',
    trust_level: 'high',

    default_style_id: 'warning_explainer',
    alternative_style_ids: ['soft_anime_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['medical_lifestyle_scene'],
      text_heavy_visual_types: ['warning_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: ['risk_warning', 'safety_point', 'checklist', 'step_by_step_guide', 'important_condition', 'summary_takeaway'],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 22,
      preferred_visual_types: ['warning_slide', 'checklist_slide', 'medical_lifestyle_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['warning_card', 'checklist_board', 'left_text_right_character', 'step_flow_layout'],
      preferred_elements: [
        'elderly Japanese person in summer room',
        'air conditioner',
        'water glass',
        'thermometer',
        'sun icon',
        'cool room',
        'family checking on senior',
      ],
      forbidden_elements: ['medical emergency scene', 'collapse on floor', 'hospital panic', 'guaranteed prevention claim', 'extreme fear'],
    },

    segmentation_rules: {
      split_when: [
        'a new heatstroke risk appears',
        'hydration, air conditioning, clothing, or room temperature is mentioned',
        'a checklist point appears',
        'family checking or emergency warning appears',
      ],
      merge_when: ['same heat warning repeated', 'general summer caution without new action'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['elderly Japanese person in summer', 'water glass', 'air conditioner', 'thermometer', 'heat warning', 'cool room'],

    thumbnail_rules: {
      emotional_angle: 'summer danger + easy prevention',
      title_style: 'seasonal warning + checklist',
      recommended_copy_patterns_ja: ['熱中症に注意', '水分だけでは不十分', '室温を確認', '高齢者の夏対策'],
      color_direction: 'yellow heat warning + blue cooling accent',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の熱中症対策｜夏に家で確認したいポイント',
        'シニアが気をつけたい熱中症のサインと予防習慣',
        '暑い日に高齢者を守るための熱中症対策',
      ],
      core_tags_ja: ['高齢者 熱中症', '熱中症対策', 'シニア 夏', '水分補給', '室温管理'],
      hashtags_ja: ['#熱中症対策', '#高齢者', '#シニアライフ', '#夏の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  disaster_preparedness_seniors: {
    niche_id: 'disaster_preparedness_seniors',
    niche_name_ja: '高齢者の防災準備',
    niche_name_vi: 'Chuẩn bị phòng chống thiên tai cho người già',
    audience: 'Japanese seniors and families preparing for disasters',
    primary_viewer: 'Seniors living alone and families who want simple disaster readiness steps',

    content_goal: 'Explain senior-friendly disaster preparation with simple checklists and calm urgency.',
    emotional_tone: 'serious, calm, practical',
    trust_level: 'high',

    default_style_id: 'warning_explainer',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'warning_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'risk_warning',
      'checklist',
      'step_by_step_guide',
      'important_condition',
      'family_discussion',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 22,
      preferred_visual_types: ['warning_slide', 'checklist_slide', 'case_example_scene', 'family_discussion_scene', 'summary_slide'],
      preferred_layout_types: ['checklist_board', 'warning_card', 'step_flow_layout', 'left_text_right_character'],
      preferred_elements: [
        'emergency bag',
        'water bottles',
        'medicine pouch',
        'flashlight',
        'elderly Japanese person checking supplies',
        'family contact list without personal details',
        'generic evacuation map without real place names',
      ],
      forbidden_elements: [
        'disaster destruction horror',
        'real disaster footage style',
        'panic crowd',
        'real location names unless provided',
        'official logo',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new disaster preparation item appears',
        'emergency supplies are listed',
        'evacuation or contact planning appears',
        'medicine or mobility issue appears',
        'family communication appears',
      ],
      merge_when: ['same supply type repeated', 'general disaster fear repeated'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'emergency bag',
      'elderly Japanese person preparing',
      'water bottles',
      'flashlight',
      'medicine pouch',
      'disaster checklist',
    ],

    thumbnail_rules: {
      emotional_angle: 'prepare before emergency',
      title_style: 'disaster checklist + senior safety',
      recommended_copy_patterns_ja: ['防災準備', '高齢者はここ確認', '非常袋の中身', '家族で備える'],
      color_direction: 'yellow caution + blue trust + emergency red accent',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の防災準備｜家族で確認したい非常袋と連絡方法',
        'シニアが災害前に備えたい防災チェックリスト',
        '一人暮らし高齢者のための防災準備をやさしく解説',
      ],
      core_tags_ja: ['高齢者 防災', 'シニア 防災', '非常袋', '災害準備', '一人暮らし 高齢者'],
      hashtags_ja: ['#防災', '#高齢者', '#非常袋', '#シニアライフ'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_social_connection: {
    niche_id: 'senior_social_connection',
    niche_name_ja: 'シニアの人間関係・地域参加',
    niche_name_vi: 'Quan hệ xã hội / tham gia cộng đồng cho senior',
    audience: 'Japanese seniors seeking social connection and community life',
    primary_viewer: 'Seniors who want more social contact after retirement',

    content_goal: 'Encourage gentle social connection, community participation, and family communication.',
    emotional_tone: 'warm, hopeful, socially supportive',
    trust_level: 'medium_high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['cinematic_senior_documentary', 'soft_anime_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'rare',
      preferred_text_modes: ['no_text', 'minimal_label_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene'],
      text_heavy_visual_types: ['summary_slide', 'checklist_slide'],
      max_text_blocks: 1,
    },

    preferred_beat_types: [
      'problem_statement',
      'emotional_reflection',
      'example_case',
      'family_discussion',
      'step_by_step_guide',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'low',
      average_scene_duration_sec: 42,
      preferred_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'family_discussion', 'center_character_with_side_icons'],
      preferred_elements: [
        'senior community center',
        'elderly Japanese people chatting',
        'walking group',
        'phone call with family',
        'tea gathering',
        'local hobby class',
      ],
      forbidden_elements: ['social rejection scene', 'extreme loneliness', 'dark mood', 'crying close-up'],
    },

    segmentation_rules: {
      split_when: [
        'a new social connection idea appears',
        'family, neighbors, community, hobby group, or volunteering is introduced',
        'a practical first step appears',
      ],
      merge_when: ['same emotional concern repeated', 'general encouragement without a new connection method'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['senior community', 'elderly Japanese people chatting', 'tea gathering', 'walking group', 'family phone call'],

    thumbnail_rules: {
      emotional_angle: 'connection + relief',
      title_style: 'loneliness solution + small habit',
      recommended_copy_patterns_ja: ['人とのつながり', '孤独を減らす', '地域で安心', '小さな一歩'],
      color_direction: 'warm orange + soft green + gentle blue',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニアの人間関係を広げる小さな習慣',
        '老後の孤独を減らす地域参加とつながりの作り方',
        '一人暮らしでも安心できるシニアの交流習慣',
      ],
      core_tags_ja: ['シニア 人間関係', '高齢者 地域参加', '老後 孤独', 'シニアライフ', '地域交流'],
      hashtags_ja: ['#シニアライフ', '#地域参加', '#老後の孤独', '#人間関係'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_work_after_retirement: {
    niche_id: 'senior_work_after_retirement',
    niche_name_ja: '定年後の仕事・副業',
    niche_name_vi: 'Việc làm / side job sau nghỉ hưu',
    audience: 'Japanese seniors considering work after retirement',
    primary_viewer: 'Retirees and pre-retirees looking for realistic work options',

    content_goal: 'Explain realistic work and side-job options after retirement without income exaggeration.',
    emotional_tone: 'practical, encouraging, realistic',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'cinematic_senior_documentary'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene'],
      text_heavy_visual_types: ['comparison_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'comparison',
      'example_case',
      'money_point',
      'important_condition',
      'checklist',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: [
        'character_explanation',
        'comparison_slide',
        'checklist_slide',
        'emotional_lifestyle_scene',
        'summary_slide',
      ],
      preferred_layout_types: ['comparison_board', 'checklist_board', 'left_text_right_character', 'emotional_lifestyle_scene'],
      preferred_elements: [
        'senior working part-time',
        'elderly Japanese person using laptop',
        'local store work',
        'community job board',
        'simple work-life balance chart',
        'yen icon without income promise',
      ],
      forbidden_elements: [
        'guaranteed income',
        'get rich quick imagery',
        'luxury lifestyle promise',
        'specific job platform logo',
        'overwork depiction',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new work option appears',
        'income or schedule caution appears',
        'health or lifestyle condition appears',
        'a checklist for choosing work appears',
      ],
      merge_when: ['same work option repeated', 'general motivation without new practical point'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'senior part-time work',
      'retired Japanese person working',
      'laptop',
      'local job board',
      'work-life balance',
      'yen icon',
    ],

    thumbnail_rules: {
      emotional_angle: 'retirement income + realistic hope',
      title_style: 'work after retirement + caution',
      recommended_copy_patterns_ja: ['定年後の仕事', '無理なく働く', '老後の収入', '始める前に確認'],
      color_direction: 'blue trust + green work/life accent + yellow money highlight',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '定年後の仕事はどう選ぶ？シニアが無理なく働くポイント',
        '老後の収入を考える定年後の仕事と注意点',
        'シニア向け副業・仕事選びで確認したいこと',
      ],
      core_tags_ja: ['定年後 仕事', 'シニア 副業', '老後 収入', 'シニア 働く', '年金生活', '再雇用'],
      hashtags_ja: ['#定年後', '#シニア仕事', '#老後の収入', '#年金生活'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_driving_license_return: {
    niche_id: 'senior_driving_license_return',
    niche_name_ja: '高齢者の運転・免許返納',
    niche_name_vi: 'Lái xe / trả bằng lái ở tuổi già',
    audience: 'Japanese seniors and families discussing driving safety',
    primary_viewer: 'Seniors who drive and adult children concerned about safety',

    content_goal: 'Discuss senior driving safety and license return decisions calmly without shaming seniors.',
    emotional_tone: 'sensitive, practical, respectful',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['warning_explainer', 'soft_anime_infographic'],

    default_text_rendering_mode: 'minimal_label_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['minimal_label_text', 'no_text', 'ai_generated_text'],
      no_text_for_visual_types: ['family_discussion_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'risk_warning',
      'family_discussion',
      'comparison',
      'checklist',
      'emotional_reflection',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 32,
      preferred_visual_types: [
        'family_discussion_scene',
        'warning_slide',
        'checklist_slide',
        'comparison_slide',
        'emotional_lifestyle_scene',
      ],
      preferred_layout_types: ['family_discussion', 'warning_card', 'checklist_board', 'comparison_board'],
      preferred_elements: [
        'elderly Japanese driver thinking calmly',
        'family discussing driving',
        'generic car without brand logo',
        'bus or taxi alternative',
        'license card without real data',
        'safety checklist',
      ],
      forbidden_elements: ['graphic accident', 'car brand logo', 'license personal data', 'shaming seniors', 'panic scene', 'blood'],
    },

    segmentation_rules: {
      split_when: [
        'a new driving risk appears',
        'family conversation appears',
        'license return or alternative transportation appears',
        'a checklist point appears',
      ],
      merge_when: ['same concern repeated', 'general warning without new action'],
      ignore_or_compress: COMMON_SENIOR_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'senior driving',
      'elderly Japanese driver',
      'family discussion',
      'license return',
      'bus alternative',
      'safety checklist',
    ],

    thumbnail_rules: {
      emotional_angle: 'family concern + respectful decision',
      title_style: 'driving safety + family discussion',
      recommended_copy_patterns_ja: ['免許返納', '運転の不安', '家族で話す', '安全確認'],
      color_direction: 'yellow caution + calm blue + warm family tone',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の運転と免許返納を家族で考えるポイント',
        'シニアの運転が不安になった時に確認したいこと',
        '免許返納の前に家族で話しておきたいこと',
      ],
      core_tags_ja: ['高齢者 運転', '免許返納', 'シニア ドライバー', '家族 話し合い', '交通安全'],
      hashtags_ja: ['#免許返納', '#高齢者運転', '#シニアライフ', '#交通安全'],
    },

    factual_safety_rules: COMMON_SENIOR_SAFETY_RULES.factual_safety_rules,
  },

  senior_general_educational: {
    niche_id: 'senior_general_educational',
    niche_name_ja: 'シニア向け生活情報',
    niche_name_vi: 'Thông tin đời sống chung cho senior',
    audience: 'Japanese seniors 60+',
    primary_viewer: 'Japanese seniors who want practical daily-life information',

    content_goal: 'Explain practical senior-life information clearly and safely.',
    emotional_tone: 'calm, practical, trustworthy',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'clean_tv_slide'],

    default_text_rendering_mode: 'auto',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['emotional_lifestyle_scene', 'family_discussion_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'warning_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'problem_statement',
      'basic_explanation',
      'risk_warning',
      'checklist',
      'step_by_step_guide',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: [
        'character_explanation',
        'checklist_slide',
        'comparison_slide',
        'emotional_lifestyle_scene',
        'summary_slide',
      ],
      preferred_layout_types: ['left_text_right_character', 'checklist_board', 'comparison_board', 'summary_board'],
      preferred_elements: ['elderly Japanese person', 'simple explanation board', 'large icons', 'warm home setting', 'checklist'],
      forbidden_elements: [
        'real logos',
        'fake official seals',
        'invented numbers',
        'medical/legal/financial overclaim',
        'fear exaggeration',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new practical point appears',
        'a warning or condition appears',
        'a checklist item appears',
        'the speaker moves from problem to solution',
      ],
      merge_when: ['several lines repeat the same idea', 'the lines are generic greeting or subscribe request'],
      ignore_or_compress: ['generic greeting', 'like and subscribe request', 'repeated channel introduction', 'non-informational filler'],
    },

    visual_keywords: ['elderly Japanese person', 'senior life', 'simple checklist', 'warm home', 'educational board'],

    thumbnail_rules: {
      emotional_angle: 'practical concern + helpful solution',
      title_style: 'simple senior-life explanation',
      recommended_copy_patterns_ja: ['シニアの基本', '今すぐ確認', '知らないと損', '暮らしの注意'],
      color_direction: 'warm beige + blue trust + yellow highlight',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: ['シニア向け生活情報をやさしく解説', '高齢者が知っておきたい暮らしのポイント', '老後の生活で確認したい大切なこと'],
      core_tags_ja: ['シニアライフ', '高齢者 生活', '老後の暮らし', 'シニア向け', '生活情報'],
      hashtags_ja: ['#シニアライフ', '#高齢者', '#老後の暮らし'],
    },

    factual_safety_rules: [
      'Use only information supported by the transcript.',
      'Do not invent numbers, dates, laws, medical claims, legal claims, or financial advice.',
      'Avoid fear exaggeration.',
      'Avoid real logos and fake official symbols.',
    ],
  },

  senior_healthy_foods_general: {
    niche_id: 'senior_healthy_foods_general',
    niche_name_ja: '高齢者の健康食',
    niche_name_vi: 'Thực phẩm sức khỏe cho người già',
    audience: 'Japanese seniors 60+ interested in healthy eating',
    primary_viewer: 'Japanese seniors who want simple daily food habits for healthy aging',

    content_goal: 'Explain senior-friendly healthy foods and daily eating habits in a practical, non-medical, easy-to-understand way.',
    emotional_tone: 'warm, practical, reassuring',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'opening_hook',
      'problem_statement',
      'basic_explanation',
      'checklist',
      'example_case',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'character_explanation', 'comparison_slide', 'summary_slide'],
      preferred_layout_types: [
        'emotional_lifestyle_scene',
        'checklist_board',
        'left_text_right_character',
        'comparison_board',
        'summary_board',
      ],
      preferred_elements: [
        'elderly Japanese person preparing a simple meal',
        'Japanese home kitchen',
        'balanced meal tray',
        'rice bowl',
        'miso soup',
        'grilled fish',
        'vegetables',
        'tofu',
        'natto',
        'shopping basket',
        'simple food checklist',
      ],
      forbidden_elements: [
        'medical cure imagery',
        'hospital treatment scene',
        'medicine replacement claim',
        'extreme diet',
        'fear-based food warning',
        'unrealistic luxury meal',
        'spoiled food',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new food or ingredient appears',
        'a new eating habit appears',
        'a nutrient or food function is explained',
        'a caution about overeating or medical condition appears',
        'a checklist or practical tip begins',
        'the speaker moves from problem to food suggestion',
      ],
      merge_when: [
        'several lines repeat the same food benefit',
        'the lines only express general encouragement without a new food idea',
        'the lines list similar foods without separate explanation',
      ],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'elderly Japanese person cooking',
      'balanced Japanese meal',
      'miso soup',
      'grilled fish',
      'vegetables',
      'tofu',
      'natto',
      'healthy senior meal',
    ],

    thumbnail_rules: {
      emotional_angle: 'healthy aging + simple daily food',
      title_style: 'food list + senior health support + caution',
      recommended_copy_patterns_ja: ['高齢者の健康食', '毎日食べたい', '老後の体を守る', '食べ方に注意'],
      color_direction: 'warm kitchen tone + green healthy accent + yellow highlight',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['disease cure claim', 'extreme fear', 'medicine replacement', 'fake medical chart'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が意識したい健康食と毎日の食べ方',
        'シニアの体を支える食べ物と食習慣をやさしく解説',
        '老後の健康のために取り入れたい食事のポイント',
      ],
      core_tags_ja: ['高齢者 食事', 'シニア 健康食', '老後の健康', '高齢者 栄養', 'シニア 食生活', '健康習慣'],
      hashtags_ja: ['#高齢者の食事', '#健康食', '#シニアライフ', '#老後の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_nutrition_basics: {
    niche_id: 'senior_nutrition_basics',
    niche_name_ja: '高齢者の栄養の基本',
    niche_name_vi: 'Dinh dưỡng cơ bản cho người già',
    audience: 'Japanese seniors and families learning basic nutrition',
    primary_viewer: 'Seniors who want to understand protein, vegetables, hydration, and balanced meals',

    content_goal: 'Explain basic senior nutrition simply, focusing on balance, easy habits, and caution against overclaim.',
    emotional_tone: 'educational, calm, trustworthy',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'clean_tv_slide', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'simple_chart_scene', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: ['basic_explanation', 'comparison', 'checklist', 'important_condition', 'step_by_step_guide', 'summary_takeaway'],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: ['simple_chart_scene', 'checklist_slide', 'food_lifestyle_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['simple_chart_slide', 'checklist_board', 'comparison_board', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'balanced meal tray',
        'protein food icons',
        'vegetables',
        'water glass',
        'rice bowl',
        'fish',
        'tofu',
        'simple nutrition plate diagram',
        'elderly Japanese person eating at home',
      ],
      forbidden_elements: [
        'complex nutrient table',
        'tiny nutrition labels',
        'medical diagnosis',
        'supplement bottle promotion',
        'strict diet rule',
        'guaranteed health result',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new nutrient appears',
        'protein, vegetables, carbohydrates, fat, hydration, or fiber is introduced',
        'a meal balance concept appears',
        'a caution about restriction or overeating appears',
        'a practical meal example appears',
      ],
      merge_when: ['several lines repeat the same balance idea', 'the lines list foods without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'senior nutrition plate',
      'balanced Japanese meal',
      'protein icon',
      'vegetables',
      'water glass',
      'elderly Japanese person eating',
    ],

    thumbnail_rules: {
      emotional_angle: 'simple nutrition clarity',
      title_style: 'nutrition basics + easy explanation',
      recommended_copy_patterns_ja: ['栄養の基本', '食べ方で差', 'シニアの食事', 'まずはこれ'],
      color_direction: 'green health + blue trust + warm meal tone',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の栄養の基本｜毎日の食事で意識したいこと',
        'シニアの食事バランスをやさしく解説',
        '老後の体を支える栄養と食べ方の基本',
      ],
      core_tags_ja: ['高齢者 栄養', 'シニア 食事', '食事バランス', '老後の健康', '健康食', 'タンパク質'],
      hashtags_ja: ['#高齢者栄養', '#シニア食事', '#健康食', '#老後の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_easy_to_eat_foods: {
    niche_id: 'senior_easy_to_eat_foods',
    niche_name_ja: '高齢者の食べやすい食事',
    niche_name_vi: 'Món dễ ăn / dễ nhai / dễ nuốt cho người già',
    audience: 'Japanese seniors who have difficulty chewing or swallowing and their families',
    primary_viewer: 'Seniors and caregivers looking for soft, easy-to-eat daily meal ideas',

    content_goal: 'Introduce easy-to-eat senior meals and texture ideas while avoiding medical swallowing advice beyond the transcript.',
    emotional_tone: 'gentle, practical, supportive',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'example_case',
      'checklist',
      'important_condition',
      'step_by_step_guide',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'comparison_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: [
        'emotional_lifestyle_scene',
        'checklist_board',
        'before_after_layout',
        'left_text_right_character',
        'summary_board',
      ],
      preferred_elements: [
        'soft Japanese meal',
        'rice porridge',
        'soft tofu',
        'stewed vegetables',
        'steamed fish',
        'soup',
        'elderly Japanese person eating comfortably',
        'caregiver preparing soft meal',
        'small bowl and spoon',
      ],
      forbidden_elements: [
        'medical swallowing diagnosis',
        'choking scene',
        'hospital emergency',
        'fear-based choking warning',
        'unappetizing puree close-up',
        'medicine replacement claim',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new easy-to-eat food appears',
        'chewing, swallowing, softness, moisture, or texture is mentioned',
        'a cooking method appears',
        'a caregiver tip appears',
        'a caution about swallowing difficulty appears',
      ],
      merge_when: [
        'several lines describe the same soft food idea',
        'the lines repeat that food should be easy to eat without adding detail',
      ],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'soft Japanese meal',
      'rice porridge',
      'tofu',
      'stewed vegetables',
      'soup',
      'elderly Japanese person eating comfortably',
    ],

    thumbnail_rules: {
      emotional_angle: 'eating comfort + family care',
      title_style: 'easy-to-eat meals + practical senior food',
      recommended_copy_patterns_ja: ['食べやすい食事', 'やわらかいごはん', 'シニアの食事', '無理なく食べる'],
      color_direction: 'warm kitchen tone + soft green + cream',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['choking fear', 'hospital panic', 'unappetizing food'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が食べやすい食事の工夫とやわらかい献立',
        'シニア向けやわらかいごはんと食べやすい食事のポイント',
        '噛みにくい時に考えたい高齢者の食事の工夫',
      ],
      core_tags_ja: ['高齢者 食べやすい食事', 'シニア 食事', 'やわらかい食事', '介護食', '高齢者 ごはん', '食事の工夫'],
      hashtags_ja: ['#高齢者の食事', '#やわらかい食事', '#シニアごはん', '#介護食'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_protein_muscle_foods: {
    niche_id: 'senior_protein_muscle_foods',
    niche_name_ja: '高齢者のたんぱく質・筋力を支える食事',
    niche_name_vi: 'Protein / thực phẩm hỗ trợ cơ bắp cho người già',
    audience: 'Japanese seniors concerned about muscle loss and daily strength',
    primary_viewer: 'Seniors who want to maintain daily strength through simple protein-rich meals',

    content_goal: 'Explain protein-rich senior meals and muscle-supporting eating habits without making medical or muscle-gain guarantees.',
    emotional_tone: 'practical, encouraging, health-conscious',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'simple_3d_infographic'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'simple_chart_scene', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'problem_statement',
      'basic_explanation',
      'comparison',
      'checklist',
      'example_case',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: [
        'food_lifestyle_scene',
        'checklist_slide',
        'comparison_slide',
        'simple_chart_scene',
        'character_explanation',
        'summary_slide',
      ],
      preferred_layout_types: ['comparison_board', 'checklist_board', 'simple_chart_slide', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'protein-rich Japanese meal',
        'grilled fish',
        'egg',
        'tofu',
        'natto',
        'chicken',
        'soy products',
        'elderly Japanese person walking confidently',
        'simple muscle icon',
        'shopping basket with protein foods',
      ],
      forbidden_elements: [
        'bodybuilding imagery',
        'guaranteed muscle gain',
        'medical cure claim',
        'supplement promotion',
        'extreme exercise scene',
        'before-after body transformation',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new protein food appears',
        'muscle, walking, weakness, or daily strength is mentioned',
        'meal timing or portion habit is introduced',
        'a caution about balance or medical condition appears',
        'a checklist point appears',
      ],
      merge_when: [
        'several lines repeat that protein is important without new food or habit',
        'multiple similar protein foods are listed without explanation',
      ],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'protein-rich Japanese meal',
      'fish',
      'egg',
      'tofu',
      'natto',
      'senior muscle support',
      'elderly Japanese person walking',
    ],

    thumbnail_rules: {
      emotional_angle: 'maintain strength + avoid frailty',
      title_style: 'protein foods + senior strength support',
      recommended_copy_patterns_ja: ['たんぱく質不足', '筋力を支える食事', '毎日食べたい', '老後の体を守る'],
      color_direction: 'green health + yellow energy + warm meal tone',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['guaranteed muscle gain', 'bodybuilding look', 'supplement sales'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が意識したいたんぱく質と筋力を支える食事',
        'シニアの体を支えるたんぱく質食品をやさしく解説',
        '老後の筋力低下が気になる人の食事ポイント',
      ],
      core_tags_ja: ['高齢者 たんぱく質', 'シニア 筋力', '老後の健康', '筋力低下', '健康食', 'タンパク質 食品'],
      hashtags_ja: ['#たんぱく質', '#高齢者の食事', '#筋力維持', '#老後の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_bone_joint_foods: {
    niche_id: 'senior_bone_joint_foods',
    niche_name_ja: '高齢者の骨・関節を支える食事',
    niche_name_vi: 'Thực phẩm hỗ trợ xương khớp cho người già',
    audience: 'Japanese seniors concerned about bones, joints, and daily mobility',
    primary_viewer: 'Seniors who want food habits that support bones and comfortable movement',

    content_goal: 'Explain food habits related to bone and joint support without claiming cure or treatment.',
    emotional_tone: 'practical, reassuring, health-conscious',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'clean_tv_slide'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'basic_explanation',
      'problem_statement',
      'checklist',
      'example_case',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'simple_chart_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['checklist_board', 'simple_chart_slide', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'small fish',
        'tofu',
        'milk or yogurt if transcript mentions it',
        'mushrooms',
        'green vegetables',
        'sunlight walking scene',
        'elderly Japanese person walking safely',
        'simple bone icon',
      ],
      forbidden_elements: [
        'joint pain cure claim',
        'bone disease diagnosis',
        'medicine replacement',
        'dramatic pain expression',
        'X-ray medical imagery unless transcript requires',
        'supplement promotion',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new bone-supporting food appears',
        'calcium, vitamin D, protein, or exercise is mentioned',
        'joint or walking concern appears',
        'a caution about balance or medical condition appears',
      ],
      merge_when: ['several lines repeat the same bone support idea', 'similar foods are listed without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['small fish', 'tofu', 'mushrooms', 'green vegetables', 'bone icon', 'senior walking in sunlight'],

    thumbnail_rules: {
      emotional_angle: 'walk comfortably + support bones',
      title_style: 'bone support foods + senior mobility',
      recommended_copy_patterns_ja: ['骨を支える食事', '歩く力を守る', '毎日食べたい', '不足に注意'],
      color_direction: 'green health + sunlight yellow + soft blue',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の骨を支える食事と毎日意識したい食品',
        'シニアの骨・関節が気になる人の食事ポイント',
        '老後の歩く力を支える食べ物をやさしく解説',
      ],
      core_tags_ja: ['高齢者 骨', 'シニア 関節', '骨を支える食事', 'カルシウム', 'ビタミンD', '老後の健康'],
      hashtags_ja: ['#骨の健康', '#高齢者の食事', '#老後の健康', '#シニアライフ'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_brain_health_foods: {
    niche_id: 'senior_brain_health_foods',
    niche_name_ja: '高齢者の脳を支える食事',
    niche_name_vi: 'Thực phẩm hỗ trợ não bộ / trí nhớ cho người già',
    audience: 'Japanese seniors concerned about memory, brain health, and daily habits',
    primary_viewer: 'Seniors interested in foods and habits that may support brain health',

    content_goal: 'Explain brain-health-related food habits cautiously without claiming dementia prevention or cure.',
    emotional_tone: 'careful, educational, reassuring',
    trust_level: 'very_high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'clean_tv_slide'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide', 'simple_chart_scene'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'problem_statement',
      'basic_explanation',
      'common_misunderstanding',
      'checklist',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'simple_chart_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['checklist_board', 'simple_chart_slide', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'grilled fish',
        'blue-backed fish if transcript mentions it',
        'vegetables',
        'nuts if transcript mentions them',
        'green tea',
        'elderly Japanese person reading or doing puzzle',
        'simple brain icon',
        'balanced meal',
      ],
      forbidden_elements: [
        'dementia cure claim',
        'guaranteed dementia prevention',
        'brain disease diagnosis',
        'medical brain scan unless transcript requires',
        'fear-based brain decay visual',
        'medicine replacement',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new brain-related food appears',
        'memory, dementia, cognition, blood flow, or brain habit is mentioned',
        'a caution about overclaim or medical condition appears',
        'a lifestyle habit is combined with food advice',
      ],
      merge_when: ['several lines repeat the same brain-health food idea', 'food list appears without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'brain health food',
      'grilled fish',
      'vegetables',
      'green tea',
      'elderly Japanese person reading',
      'simple brain icon',
    ],

    thumbnail_rules: {
      emotional_angle: 'memory concern + daily food habit',
      title_style: 'brain support foods + careful warning',
      recommended_copy_patterns_ja: ['脳を支える食事', '物忘れが気になる', '毎日意識したい', '食べ方に注意'],
      color_direction: 'blue brain/trust + green health + warm meal tone',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['認知症を完全予防', 'brain horror', 'disease cure claim'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の脳を支える食事と毎日意識したい習慣',
        '物忘れが気になる人が考えたい食べ物と生活習慣',
        'シニアの脳の健康を支える食事をやさしく解説',
      ],
      core_tags_ja: ['高齢者 脳', '認知症予防 食事', '物忘れ', '脳に良い食べ物', '老後の健康', 'シニア 食事'],
      hashtags_ja: ['#脳の健康', '#高齢者の食事', '#物忘れ', '#老後の健康'],
    },

    factual_safety_rules: [
      ...COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
      'Do not claim that any food prevents or cures dementia.',
      'Avoid visual metaphors like brain garbage unless the transcript directly uses it, and keep it educational.',
    ],
  },

  senior_blood_pressure_salt_foods: {
    niche_id: 'senior_blood_pressure_salt_foods',
    niche_name_ja: '高齢者の血圧・減塩の食事',
    niche_name_vi: 'Thực phẩm / ăn giảm muối cho huyết áp người già',
    audience: 'Japanese seniors concerned about blood pressure and salt intake',
    primary_viewer: 'Seniors who want practical low-salt eating habits without extreme restriction',

    content_goal:
      'Explain salt-conscious eating habits and blood-pressure-related food choices cautiously without medical treatment claims.',
    emotional_tone: 'careful, practical, reassuring',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic', 'gentle_lifestyle'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'warning_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'risk_warning',
      'basic_explanation',
      'comparison',
      'checklist',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: ['checklist_slide', 'comparison_slide', 'food_lifestyle_scene', 'warning_slide', 'summary_slide'],
      preferred_layout_types: ['checklist_board', 'comparison_board', 'warning_card', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'miso soup',
        'soy sauce bottle without brand',
        'salt shaker',
        'vegetables',
        'fish',
        'elderly Japanese person checking seasoning',
        'simple salt icon',
        'low-salt cooking board',
      ],
      forbidden_elements: [
        'blood pressure cure claim',
        'stop medication claim',
        'specific blood pressure numbers unless provided',
        'medical device close-up with fake numbers',
        'fear-based blood vessel imagery',
        'brand logo',
      ],
    },

    segmentation_rules: {
      split_when: [
        'salt intake or seasoning is mentioned',
        'a new low-salt cooking method appears',
        'blood pressure or vascular health is mentioned',
        'a caution for medical condition appears',
        'a comparison between high-salt and low-salt foods appears',
      ],
      merge_when: ['several lines repeat reduce salt without new method', 'similar seasonings are listed without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'low salt cooking',
      'miso soup',
      'soy sauce',
      'salt shaker',
      'elderly Japanese person cooking',
      'blood pressure concern',
    ],

    thumbnail_rules: {
      emotional_angle: 'blood pressure concern + salt check',
      title_style: 'salt caution + daily food habit',
      recommended_copy_patterns_ja: ['減塩のコツ', '血圧が気になる', '塩分に注意', '食べ方を見直す'],
      color_direction: 'blue trust + yellow caution + clean kitchen',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['高血圧が治る', 'fake blood pressure reading', 'medicine replacement'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が意識したい血圧と減塩の食事ポイント',
        '塩分が気になるシニアのための食べ方の工夫',
        '血圧が気になる人が見直したい毎日の食事',
      ],
      core_tags_ja: ['高齢者 血圧', '減塩', 'シニア 食事', '塩分 控える', '老後の健康', '高血圧 食事'],
      hashtags_ja: ['#減塩', '#血圧', '#高齢者の食事', '#老後の健康'],
    },

    factual_safety_rules: [
      ...COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
      'Do not claim that reducing salt cures hypertension.',
      'Do not advise stopping medication.',
    ],
  },

  senior_blood_sugar_foods: {
    niche_id: 'senior_blood_sugar_foods',
    niche_name_ja: '高齢者の血糖値を意識した食事',
    niche_name_vi: 'Ăn uống chú ý đường huyết cho người già',
    audience: 'Japanese seniors concerned about blood sugar and daily eating habits',
    primary_viewer: 'Seniors who want practical food habits related to blood sugar awareness',

    content_goal: 'Explain blood-sugar-conscious eating habits cautiously without diabetes treatment claims.',
    emotional_tone: 'careful, practical, non-alarming',
    trust_level: 'very_high',

    default_style_id: 'clean_tv_slide',
    alternative_style_ids: ['soft_anime_infographic', 'gentle_lifestyle'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'warning_slide', 'simple_chart_scene', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'risk_warning',
      'comparison',
      'checklist',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: [
        'checklist_slide',
        'comparison_slide',
        'simple_chart_scene',
        'food_lifestyle_scene',
        'warning_slide',
        'summary_slide',
      ],
      preferred_layout_types: ['checklist_board', 'comparison_board', 'simple_chart_slide', 'warning_card', 'summary_board'],
      preferred_elements: [
        'rice bowl',
        'vegetables first meal',
        'fish and tofu',
        'sweets caution',
        'elderly Japanese person choosing meal',
        'simple blood sugar curve without numbers',
        'balanced plate',
      ],
      forbidden_elements: [
        'diabetes cure claim',
        'stop medication claim',
        'specific glucose numbers unless provided',
        'medical device with fake reading',
        'sugar horror imagery',
        'extreme carbohydrate ban',
        'brand logo',
      ],
    },

    segmentation_rules: {
      split_when: [
        'blood sugar or diabetes-related caution appears',
        'meal order is mentioned',
        'carbohydrate, rice, sweets, or snack is discussed',
        'a practical eating habit appears',
        'a medical consultation caution appears',
      ],
      merge_when: [
        'several lines repeat avoid sugar without new context',
        'similar carbohydrate foods are listed without separate explanation',
      ],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'blood sugar conscious meal',
      'rice bowl',
      'vegetables',
      'sweets caution',
      'balanced plate',
      'elderly Japanese person eating',
    ],

    thumbnail_rules: {
      emotional_angle: 'blood sugar concern + eating order',
      title_style: 'blood sugar food habit + caution',
      recommended_copy_patterns_ja: ['血糖値が気になる', '食べ方に注意', 'ご飯の前に', '甘い物の落とし穴'],
      color_direction: 'blue trust + yellow caution + green healthy food',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['糖尿病が治る', 'extreme no-carb message', 'fake glucose reading'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が意識したい血糖値と食べ方のポイント',
        '血糖値が気になるシニアのための食事習慣',
        'ご飯や甘い物との付き合い方をやさしく解説',
      ],
      core_tags_ja: ['高齢者 血糖値', '血糖値 食事', 'シニア 食事', '糖尿病 食事', '老後の健康', '食べ方'],
      hashtags_ja: ['#血糖値', '#高齢者の食事', '#シニアライフ', '#老後の健康'],
    },

    factual_safety_rules: [
      ...COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
      'Do not claim that a food cures diabetes.',
      'Do not recommend stopping medication or medical treatment.',
      'Avoid extreme carbohydrate elimination advice unless the transcript explicitly states a professional context.',
    ],
  },

  senior_digestive_health_foods: {
    niche_id: 'senior_digestive_health_foods',
    niche_name_ja: '高齢者の胃腸にやさしい食事',
    niche_name_vi: 'Thực phẩm tốt cho tiêu hóa / dạ dày người già',
    audience: 'Japanese seniors who want gentle food habits for digestion',
    primary_viewer: 'Seniors who feel heavy after meals or want easier daily digestion',

    content_goal: 'Explain gentle food habits for digestion without diagnosing or treating digestive disease.',
    emotional_tone: 'gentle, practical, reassuring',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'example_case',
      'checklist',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'comparison_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: [
        'emotional_lifestyle_scene',
        'checklist_board',
        'comparison_board',
        'left_text_right_character',
        'summary_board',
      ],
      preferred_elements: [
        'warm soup',
        'rice porridge',
        'stewed vegetables',
        'tofu',
        'elderly Japanese person eating slowly',
        'small meal portion',
        'warm kitchen',
      ],
      forbidden_elements: [
        'stomach disease diagnosis',
        'medical cure claim',
        'painful stomach close-up',
        'hospital scene',
        'strict food ban',
        'unappetizing food',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new digestion-friendly food appears',
        'meal size, chewing, timing, warmth, or softness is mentioned',
        'a caution about discomfort or medical consultation appears',
        'a practical cooking method appears',
      ],
      merge_when: ['same gentle eating advice repeated', 'similar soft foods listed without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['warm soup', 'rice porridge', 'tofu', 'stewed vegetables', 'elderly Japanese person eating slowly', 'gentle meal'],

    thumbnail_rules: {
      emotional_angle: 'stomach comfort + gentle meal',
      title_style: 'easy digestion food + senior habit',
      recommended_copy_patterns_ja: ['胃腸にやさしい', '食後が重い人へ', 'やさしい食事', '無理なく食べる'],
      color_direction: 'warm soup tone + soft green + cream',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の胃腸にやさしい食事と食べ方の工夫',
        '食後が重いシニアが意識したい食事のポイント',
        '老後の体にやさしい食べ方と簡単な献立',
      ],
      core_tags_ja: ['高齢者 胃腸', '胃にやさしい食事', 'シニア 食事', '消化に良い食べ物', '老後の健康', 'やさしい食事'],
      hashtags_ja: ['#胃腸にやさしい', '#高齢者の食事', '#シニアごはん', '#老後の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_constipation_foods: {
    niche_id: 'senior_constipation_foods',
    niche_name_ja: '高齢者の便秘対策の食事',
    niche_name_vi: 'Ăn uống hỗ trợ táo bón cho người già',
    audience: 'Japanese seniors concerned about constipation and bowel habits',
    primary_viewer: 'Seniors who want gentle daily food and hydration habits for bowel regularity',

    content_goal: 'Explain food, fiber, hydration, and routine habits for constipation support without medical treatment claims.',
    emotional_tone: 'practical, discreet, reassuring',
    trust_level: 'high',

    default_style_id: 'soft_anime_infographic',
    alternative_style_ids: ['gentle_lifestyle', 'clean_tv_slide'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide', 'simple_chart_scene'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'problem_statement',
      'basic_explanation',
      'checklist',
      'step_by_step_guide',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: ['checklist_slide', 'food_lifestyle_scene', 'simple_chart_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['checklist_board', 'simple_chart_slide', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'vegetables',
        'seaweed',
        'beans',
        'yogurt if transcript mentions',
        'water glass',
        'walking habit',
        'elderly Japanese person eating breakfast',
        'simple fiber icon',
      ],
      forbidden_elements: [
        'toilet scene',
        'embarrassing depiction',
        'medical cure claim',
        'laxative promotion',
        'guaranteed bowel movement',
        'disease diagnosis',
      ],
    },

    segmentation_rules: {
      split_when: [
        'fiber, water, fermented foods, exercise, or routine is mentioned',
        'a new constipation-supporting food appears',
        'a caution about persistent symptoms or medical consultation appears',
        'a daily habit or checklist point appears',
      ],
      merge_when: ['same fiber advice repeated', 'similar vegetables listed without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: ['fiber foods', 'vegetables', 'seaweed', 'beans', 'water glass', 'senior breakfast', 'gentle bowel habit'],

    thumbnail_rules: {
      emotional_angle: 'daily discomfort + gentle habit',
      title_style: 'constipation support + food habit',
      recommended_copy_patterns_ja: ['便秘が気になる', '食物繊維だけ？', '水分も大切', '朝の習慣'],
      color_direction: 'green health + blue water + warm breakfast',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['embarrassing toilet imagery', 'guaranteed cure', 'laxative promotion'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の便秘が気になる時に意識したい食事と習慣',
        '食物繊維だけではないシニアの便秘対策の基本',
        '老後の腸を整えるために続けたい食べ方と水分習慣',
      ],
      core_tags_ja: ['高齢者 便秘', '便秘 食事', '食物繊維', 'シニア 食事', '腸活', '老後の健康'],
      hashtags_ja: ['#便秘対策', '#食物繊維', '#高齢者の食事', '#腸活'],
    },

    factual_safety_rules: [
      ...COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
      'Do not guarantee relief from constipation.',
      'Avoid embarrassing or graphic visuals.',
    ],
  },

  senior_hydration_heat_foods: {
    niche_id: 'senior_hydration_heat_foods',
    niche_name_ja: '高齢者の水分補給と夏の食事',
    niche_name_vi: 'Bổ sung nước / ăn uống mùa nóng cho người già',
    audience: 'Japanese seniors and families during hot seasons',
    primary_viewer: 'Seniors who need simple hydration and summer eating habits',

    content_goal: 'Explain hydration and summer meal habits for seniors in a practical, non-alarming way.',
    emotional_tone: 'protective, practical, clear',
    trust_level: 'high',

    default_style_id: 'warning_explainer',
    alternative_style_ids: ['soft_anime_infographic', 'gentle_lifestyle'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text', 'no_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['warning_slide', 'checklist_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: ['risk_warning', 'safety_point', 'checklist', 'step_by_step_guide', 'important_condition', 'summary_takeaway'],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 22,
      preferred_visual_types: ['warning_slide', 'checklist_slide', 'food_lifestyle_scene', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['warning_card', 'checklist_board', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'elderly Japanese person drinking water',
        'water glass',
        'tea cup',
        'summer room',
        'cool meal',
        'soup',
        'water bottle',
        'thermometer',
        'air conditioner',
      ],
      forbidden_elements: [
        'heatstroke emergency panic',
        'collapse scene',
        'hospital panic',
        'guaranteed prevention claim',
        'extreme fear',
        'specific medical advice unless provided',
      ],
    },

    segmentation_rules: {
      split_when: [
        'hydration or water intake is mentioned',
        'summer food or appetite loss is mentioned',
        'salt/mineral caution appears',
        'heatstroke or room temperature is mentioned',
        'a family check-in habit appears',
      ],
      merge_when: ['same drink-water advice repeated', 'general summer caution without new action'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'elderly Japanese person drinking water',
      'summer hydration',
      'water glass',
      'tea cup',
      'cool meal',
      'thermometer',
      'air conditioner',
    ],

    thumbnail_rules: {
      emotional_angle: 'summer safety + hydration habit',
      title_style: 'heat caution + easy hydration',
      recommended_copy_patterns_ja: ['水分補給', '夏の食事', '高齢者は注意', '脱水を防ぐ'],
      color_direction: 'blue water + yellow heat caution + white clean background',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者の水分補給と夏の食事で気をつけたいこと',
        'シニアが夏に意識したい水分と食事の習慣',
        '暑い日に高齢者を守る水分補給と食べ方のポイント',
      ],
      core_tags_ja: ['高齢者 水分補給', 'シニア 夏の食事', '脱水予防', '熱中症対策', '夏バテ 食事', '老後の健康'],
      hashtags_ja: ['#水分補給', '#熱中症対策', '#高齢者の食事', '#夏の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_breakfast_habits: {
    niche_id: 'senior_breakfast_habits',
    niche_name_ja: '高齢者の朝食習慣',
    niche_name_vi: 'Thói quen ăn sáng cho người già',
    audience: 'Japanese seniors interested in healthy morning routines',
    primary_viewer: 'Seniors who want simple breakfast habits for daily energy and routine',

    content_goal: 'Explain simple senior breakfast habits and morning meal ideas without overclaiming health benefits.',
    emotional_tone: 'warm, practical, routine-focused',
    trust_level: 'high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide', 'comparison_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: ['opening_hook', 'problem_statement', 'basic_explanation', 'example_case', 'checklist', 'summary_takeaway'],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 28,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'checklist_board', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'Japanese senior breakfast',
        'rice bowl',
        'miso soup',
        'grilled fish',
        'natto',
        'egg',
        'vegetables',
        'elderly Japanese person eating breakfast by window',
        'morning sunlight',
      ],
      forbidden_elements: [
        'guaranteed energy claim',
        'strict breakfast rule',
        'extreme fasting claim',
        'medical cure imagery',
        'unrealistic luxury breakfast',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new breakfast food appears',
        'morning routine or appetite issue is mentioned',
        'a meal balance point appears',
        'a practical preparation tip appears',
      ],
      merge_when: ['same breakfast idea repeated', 'similar breakfast foods listed without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'Japanese senior breakfast',
      'miso soup',
      'rice bowl',
      'natto',
      'egg',
      'morning sunlight',
      'elderly Japanese person eating breakfast',
    ],

    thumbnail_rules: {
      emotional_angle: 'morning routine + healthy habit',
      title_style: 'breakfast habit + senior health',
      recommended_copy_patterns_ja: ['朝食習慣', '朝に食べたい', '一日の始まり', '老後の朝ごはん'],
      color_direction: 'morning sunlight + warm yellow + green healthy accent',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が朝に意識したい朝食習慣と食べ方',
        'シニアの一日を支える朝ごはんのポイント',
        '老後の健康のために見直したい朝食習慣',
      ],
      core_tags_ja: ['高齢者 朝食', 'シニア 朝ごはん', '朝食習慣', '老後の健康', '健康食', '和朝食'],
      hashtags_ja: ['#朝食習慣', '#高齢者の食事', '#シニアごはん', '#老後の健康'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },

  senior_foods_to_avoid_caution: {
    niche_id: 'senior_foods_to_avoid_caution',
    niche_name_ja: '高齢者が注意したい食べ物',
    niche_name_vi: 'Thực phẩm người già nên chú ý / hạn chế',
    audience: 'Japanese seniors concerned about foods that may be risky when eaten too much',
    primary_viewer: 'Seniors who want to avoid common dietary mistakes without extreme fear',

    content_goal: 'Explain foods seniors should be careful with, focusing on moderation rather than fear or absolute bans.',
    emotional_tone: 'careful, practical, non-alarming',
    trust_level: 'high',

    default_style_id: 'warning_explainer',
    alternative_style_ids: ['soft_anime_infographic', 'clean_tv_slide'],

    default_text_rendering_mode: 'ai_generated_text',

    text_policy: {
      scene_text_usage: 'frequent',
      preferred_text_modes: ['ai_generated_text', 'minimal_label_text'],
      no_text_for_visual_types: ['food_lifestyle_scene'],
      text_heavy_visual_types: ['warning_slide', 'checklist_slide', 'comparison_slide', 'summary_slide'],
      max_text_blocks: 3,
    },

    preferred_beat_types: [
      'opening_hook',
      'risk_warning',
      'common_misunderstanding',
      'comparison',
      'checklist',
      'important_condition',
      'summary_takeaway',
    ],

    scene_rules: {
      density_level: 'high',
      average_scene_duration_sec: 22,
      preferred_visual_types: ['warning_slide', 'checklist_slide', 'comparison_slide', 'food_lifestyle_scene', 'summary_slide'],
      preferred_layout_types: ['warning_card', 'checklist_board', 'comparison_board', 'before_after_layout', 'summary_board'],
      preferred_elements: [
        'elderly Japanese person choosing food',
        'processed food',
        'salty food',
        'sweet snack',
        'instant food',
        'generic warning icon',
        'balanced alternative meal',
        'shopping basket',
      ],
      forbidden_elements: [
        'food demonization',
        'absolute ban unless transcript says',
        'fear-based disease claim',
        'rotting food',
        'gross imagery',
        'medical cure or damage claim without support',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new caution food appears',
        'salt, sugar, fat, alcohol, processed food, or portion caution appears',
        'an alternative food or moderation tip appears',
        'a medical condition caution appears',
      ],
      merge_when: ['same caution repeated', 'similar snack foods listed without separate explanation'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'food caution',
      'processed food',
      'salty food',
      'sweet snack',
      'elderly Japanese person choosing food',
      'warning icon',
      'balanced alternative',
    ],

    thumbnail_rules: {
      emotional_angle: 'hidden food risk + moderation',
      title_style: 'foods to be careful with + senior warning',
      recommended_copy_patterns_ja: ['食べすぎ注意', '高齢者は注意', 'その食べ物大丈夫？', '毎日は危険？'],
      color_direction: 'yellow caution + red warning accent + clean food background',
      thumbnail_text_mode: 'ai_generated_text',
      avoid: ['absolute ban exaggeration', 'disease fear claim', 'gross food imagery'],
    },

    metadata_rules: {
      title_patterns_ja: [
        '高齢者が食べすぎに注意したい食べ物と見直し方',
        'シニアが毎日の食事で気をつけたい食品',
        '老後の健康のために注意したい食べ物をやさしく解説',
      ],
      core_tags_ja: ['高齢者 食べ物 注意', 'シニア 食事', '食べすぎ注意', '健康食', '老後の健康', '避けたい食べ物'],
      hashtags_ja: ['#食べすぎ注意', '#高齢者の食事', '#シニアライフ', '#健康食'],
    },

    factual_safety_rules: [
      ...COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
      'Prefer moderation language over absolute bans unless the transcript explicitly states otherwise.',
      'Do not demonize common foods.',
    ],
  },

  senior_japanese_home_cooking: {
    niche_id: 'senior_japanese_home_cooking',
    niche_name_ja: 'シニア向け和食・家庭料理',
    niche_name_vi: 'Món Nhật gia đình cho người già',
    audience: 'Japanese seniors who prefer familiar home-cooked Japanese meals',
    primary_viewer: 'Seniors who want simple, familiar, affordable Japanese home cooking',

    content_goal: 'Introduce simple Japanese home-cooking ideas for seniors, focusing on comfort, balance, affordability, and ease.',
    emotional_tone: 'warm, nostalgic, practical',
    trust_level: 'medium_high',

    default_style_id: 'gentle_lifestyle',
    alternative_style_ids: ['soft_anime_infographic', 'simple_3d_infographic'],

    default_text_rendering_mode: 'no_text',

    text_policy: {
      scene_text_usage: 'moderate',
      preferred_text_modes: ['no_text', 'minimal_label_text', 'ai_generated_text'],
      no_text_for_visual_types: ['food_lifestyle_scene', 'emotional_lifestyle_scene'],
      text_heavy_visual_types: ['checklist_slide', 'summary_slide', 'comparison_slide'],
      max_text_blocks: 2,
    },

    preferred_beat_types: ['example_case', 'checklist', 'step_by_step_guide', 'money_point', 'emotional_reflection', 'summary_takeaway'],

    scene_rules: {
      density_level: 'medium',
      average_scene_duration_sec: 30,
      preferred_visual_types: ['food_lifestyle_scene', 'checklist_slide', 'character_explanation', 'summary_slide'],
      preferred_layout_types: ['emotional_lifestyle_scene', 'checklist_board', 'left_text_right_character', 'summary_board'],
      preferred_elements: [
        'Japanese home cooking',
        'miso soup',
        'rice bowl',
        'grilled fish',
        'simmered vegetables',
        'tofu',
        'natto',
        'small kitchen',
        'elderly Japanese person cooking',
        'warm dining table',
      ],
      forbidden_elements: [
        'luxury restaurant meal',
        'unrealistic expensive ingredients',
        'medical cure claim',
        'extreme restriction',
        'messy kitchen',
      ],
    },

    segmentation_rules: {
      split_when: [
        'a new home-cooked dish appears',
        'a cooking tip appears',
        'a saving or preparation method appears',
        'a balance or portion point appears',
        'a nostalgia or daily routine point appears',
      ],
      merge_when: ['similar dishes listed without separate explanation', 'general praise for home cooking without new idea'],
      ignore_or_compress: COMMON_SENIOR_FOOD_SAFETY_RULES.ignored_content_rules,
    },

    visual_keywords: [
      'Japanese home cooking',
      'miso soup',
      'rice bowl',
      'grilled fish',
      'simmered vegetables',
      'elderly Japanese person cooking',
      'warm kitchen',
    ],

    thumbnail_rules: {
      emotional_angle: 'familiar comfort + healthy simple meal',
      title_style: 'Japanese home cooking + senior-friendly',
      recommended_copy_patterns_ja: ['シニアの和食', '毎日の家庭料理', '簡単で安心', '老後のごはん'],
      color_direction: 'warm kitchen light + rice white + green vegetables',
      thumbnail_text_mode: 'ai_generated_text',
    },

    metadata_rules: {
      title_patterns_ja: [
        'シニア向け和食と家庭料理の簡単な工夫',
        '高齢者が食べやすい毎日の和食ごはん',
        '老後の食卓に取り入れたい簡単な家庭料理',
      ],
      core_tags_ja: ['シニア 和食', '高齢者 家庭料理', '高齢者 ごはん', '和食 健康', '簡単料理', '老後の食事'],
      hashtags_ja: ['#和食', '#高齢者の食事', '#家庭料理', '#シニアごはん'],
    },

    factual_safety_rules: COMMON_SENIOR_FOOD_SAFETY_RULES.factual_safety_rules,
  },
};
