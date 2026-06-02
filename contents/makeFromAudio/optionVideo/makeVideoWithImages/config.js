import { NICHE_CONFIGS } from './niche-config.js';
import { STYLE_CONFIGS } from './style-config.js';

export const VISUAL_BEAT_TYPES = [
  'opening_hook',
  'problem_statement',
  'basic_explanation',
  'common_misunderstanding',
  'risk_warning',
  'important_condition',
  'comparison',
  'step_by_step_guide',
  'checklist',
  'example_case',
  'money_point',
  'safety_point',
  'family_discussion',
  'emotional_reflection',
  'summary_takeaway',
  'call_to_action',
  'boundary_pending',
];

export const VISUAL_TYPES = [
  'character_explanation',
  'comparison_slide',
  'checklist_slide',
  'warning_slide',
  'document_table_scene',
  'family_discussion_scene',
  'simple_chart_scene',
  'emotional_lifestyle_scene',
  'summary_slide',
  'case_example_scene',
  'home_safety_scene',
  'food_lifestyle_scene',
  'phone_safety_scene',
  'medical_lifestyle_scene',
];

export const LAYOUT_TYPES = [
  'left_text_right_character',
  'top_text_bottom_visual',
  'center_character_with_side_icons',
  'comparison_board',
  'checklist_board',
  'warning_card',
  'document_explanation',
  'family_discussion',
  'simple_chart_slide',
  'emotional_lifestyle_scene',
  'summary_board',
  'before_after_layout',
  'step_flow_layout',
];

export const TEXT_RENDERING_MODES = ['auto', 'ai_generated_text', 'minimal_label_text', 'no_text', 'code_overlay_text'];

export const SCENE_DENSITY_LEVELS = {
  high: {
    average_scene_duration_sec: 20,
    description: 'Frequent visual changes for practical, warning, checklist, and tutorial content.',
  },
  medium: {
    average_scene_duration_sec: 30,
    description: 'Balanced pacing for pension, inheritance, care, and explanatory content.',
  },
  low: {
    average_scene_duration_sec: 45,
    description: 'Slower emotional pacing for loneliness, reflection, lifestyle, and gentle story content.',
  },
};

export const SENIOR_NICHE_IDS = [
  'senior_scam_prevention',
  'senior_smartphone_safety',
  'senior_pension_easy',
  'pension_life_saving',
  'end_of_life_planning',
  'inheritance_will_intro',
  'parent_care_preparation',
  'home_safety_prevention',
  'senior_meal_saving_alone',
  'senior_loneliness_living_alone',

  // Added niches
  'senior_public_benefits',
  'senior_tax_social_insurance',
  'long_term_care_insurance',
  'medical_expense_saving',
  'heatstroke_prevention_seniors',
  'disaster_preparedness_seniors',
  'senior_social_connection',
  'senior_work_after_retirement',
  'senior_sleep_routine',
  'senior_hobbies_brain_health',
  'senior_driving_license_return',

  // foot
  'senior_healthy_foods_general',
  'senior_nutrition_basics',
  'senior_easy_to_eat_foods',
  'senior_protein_muscle_foods',
  'senior_bone_joint_foods',
  'senior_brain_health_foods',
  'senior_blood_pressure_salt_foods',
  'senior_blood_sugar_foods',
  'senior_digestive_health_foods',
  'senior_constipation_foods',
  'senior_hydration_heat_foods',
  'senior_breakfast_habits',
  'senior_foods_to_avoid_caution',
  'senior_japanese_home_cooking',
];

export const NICHE_STYLE_RECOMMENDATIONS = {
  senior_scam_prevention: {
    default_style_id: 'warning_explainer',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_smartphone_safety: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_pension_easy: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  pension_life_saving: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  end_of_life_planning: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  inheritance_will_intro: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  parent_care_preparation: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  home_safety_prevention: {
    default_style_id: 'warning_explainer',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_meal_saving_alone: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_loneliness_living_alone: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_public_benefits: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_tax_social_insurance: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  long_term_care_insurance: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  medical_expense_saving: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  heatstroke_prevention_seniors: {
    default_style_id: 'warning_explainer',
    default_text_rendering_mode: 'ai_generated_text',
  },
  disaster_preparedness_seniors: {
    default_style_id: 'warning_explainer',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_social_connection: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_work_after_retirement: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_sleep_routine: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_hobbies_brain_health: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_driving_license_return: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'minimal_label_text',
  },
  senior_healthy_foods_general: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_nutrition_basics: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_easy_to_eat_foods: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_protein_muscle_foods: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_bone_joint_foods: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_brain_health_foods: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_blood_pressure_salt_foods: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_blood_sugar_foods: {
    default_style_id: 'clean_tv_slide',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_digestive_health_foods: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_constipation_foods: {
    default_style_id: 'soft_anime_infographic',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_hydration_heat_foods: {
    default_style_id: 'warning_explainer',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_breakfast_habits: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
  senior_foods_to_avoid_caution: {
    default_style_id: 'warning_explainer',
    default_text_rendering_mode: 'ai_generated_text',
  },
  senior_japanese_home_cooking: {
    default_style_id: 'gentle_lifestyle',
    default_text_rendering_mode: 'no_text',
  },
};

export function resolveProjectConfigs({ nicheId, styleId }) {
  const nicheConfig = NICHE_CONFIGS[nicheId];

  if (!nicheConfig) {
    throw new Error(`Unknown niche_id: ${nicheId}`);
  }

  const resolvedStyleId = styleId || nicheConfig.default_style_id || NICHE_STYLE_RECOMMENDATIONS[nicheId].default_style_id;
  const styleConfig = STYLE_CONFIGS[resolvedStyleId];

  if (!styleConfig) {
    throw new Error(`Unknown style_id: ${resolvedStyleId}`);
  }

  return {
    niche_config: nicheConfig,
    style_config: styleConfig,
    resolved: {
      niche_id: nicheId,
      style_id: resolvedStyleId,
      default_text_rendering_mode: nicheConfig.default_text_rendering_mode || 'auto',
    },
  };
}

// export function resolveTextRenderingMode(sceneSpec, nicheConfig, styleConfig, imagePromptConfig) {
//   if (sceneSpec.text_rendering_mode && sceneSpec.text_rendering_mode !== 'auto') {
//     return sceneSpec.text_rendering_mode;
//   }

//   const visualType = sceneSpec.visual_type;
//   const nicheTextPolicy = nicheConfig.text_policy || {};
//   const imageTextConfig = imagePromptConfig.text_rendering || {};
//   const autoRules = imageTextConfig.auto_rules || {};

//   if (nicheTextPolicy.no_text_for_visual_types?.includes(visualType)) {
//     return 'no_text';
//   }

//   if (nicheTextPolicy.text_heavy_visual_types?.includes(visualType)) {
//     return 'ai_generated_text';
//   }

//   if (autoRules[visualType]) {
//     return autoRules[visualType];
//   }

//   if (styleConfig.text_rendering_policy?.default_mode) {
//     return styleConfig.text_rendering_policy.default_mode;
//   }

//   return nicheConfig.default_text_rendering_mode || imageTextConfig.default_mode || 'no_text';
// }

export function resolveTextRenderingMode(nicheConfig) {
  const defaultMode = NICHE_STYLE_RECOMMENDATIONS[nicheConfig.niche_id].default_text_rendering_mode || 'auto';
  return defaultMode;
}
