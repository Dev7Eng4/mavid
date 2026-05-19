export const promptStep3VisualBibleAndHeroImage = ({ videoContext, step3Rules, finalAnalysis, selectedHeroMoment = null }) => `
You are an expert visual director and prompt engineer for automated Japanese YouTube audio-image videos.

This is Step 3: Visual Bible + Hero Image Package.

You will receive the final content analysis from Step 2.
Your task is to create a consistent visual system for the whole video.

━━━━━━━━━━━━━━━━━━━━
WHAT STEP 3 MUST DO
━━━━━━━━━━━━━━━━━━━━
You must create:
1. selected_hero_moment
2. visual_bible
3. character_bible if the niche requires it
4. recurring_subject_bible if the niche does not require detailed characters
5. environment_bible
6. hero_image_package
7. global_image_prompt_template
8. visual_consistency_rules
9. safety_visual_rules
10. quality_check

━━━━━━━━━━━━━━━━━━━━
WHAT STEP 3 MUST NOT DO
━━━━━━━━━━━━━━━━━━━━
- Do NOT create scene planning for all chapters.
- Do NOT create image prompts for every scene.
- Do NOT invent new plot events, health claims, financial claims, or procedural steps.
- Do NOT invent timestamps.
- Do NOT add readable text inside image prompts.
- Do NOT create final video timeline.

━━━━━━━━━━━━━━━━━━━━
VIDEO CONTEXT
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(videoContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━
STEP 3 RULES
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(step3Rules, null, 2)}

━━━━━━━━━━━━━━━━━━━━
FINAL ANALYSIS FROM STEP 2
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(finalAnalysis, null, 2)}

━━━━━━━━━━━━━━━━━━━━
OPTIONAL SELECTED HERO MOMENT
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(selectedHeroMoment, null, 2)}

━━━━━━━━━━━━━━━━━━━━
CRITICAL VISUAL RULES
━━━━━━━━━━━━━━━━━━━━
- Image prompts must be written in English.
- Generated images must contain no text.
- Always include: no text, no subtitles, no watermark.
- Do not include Japanese text, English text, readable documents, readable signs, readable charts, or fake UI text.
- If documents, phones, books, charts, or labels appear, they must be unreadable or abstract.
- Match the selected visual style exactly.
- Match the selected niche.
- Preserve factual accuracy from Step 2.
- For drama: do not invent violence, extra characters, legal scenes, or affair scenes unless supported.
- For health: avoid diagnosis, cure, medical fear, fake medical charts, and hospital panic unless supported.
- For finance: avoid guaranteed profit imagery, fake official documents, readable yen amounts, or investment hype.
- For gardening: avoid wrong plant species, fake labels, or unrealistic giant plants.

━━━━━━━━━━━━━━━━━━━━
HERO IMAGE RULES
━━━━━━━━━━━━━━━━━━━━
- Select the best hero moment from Step 2 unless an explicit selectedHeroMoment is provided.
- Create two versions:
  1. thumbnail_hero_image
  2. video_opening_image
- Thumbnail image should support later text overlay by code.
- Do not render any text in the image itself.
- For thumbnail, prefer a clear subject and an uncluttered text-safe area.

━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not include markdown.
Do not include explanations outside JSON.

Use this schema:

{
  "step": "step_3_visual_bible_and_hero_image",

  "video_context": {
    "niche_id": "${videoContext.niche_id}",
    "visual_style_id": "${videoContext.visual_style_id}",
    "language": "${videoContext.language}",
    "output_type": "${videoContext.output_type}",
    "target_platform": "${videoContext.target_platform}",
    "video_duration_seconds": ${videoContext.video_duration_seconds || 0}
  },

  "selected_hero_moment": {
    "source_rank": 1,
    "moment_title": "",
    "moment_summary": "",
    "line_range": {
      "start_line_id": 0,
      "end_line_id": 0
    },
    "selection_reason": "",
    "accuracy_risk": "low | medium | high"
  },

  "visual_bible": {
    "visual_style_id": "${videoContext.visual_style_id}",
    "overall_visual_concept": "",
    "style_description": "",
    "tone": "",
    "mood": [],
    "color_palette": [],
    "lighting_style": [],
    "camera_language": [],
    "composition_rules": [],
    "subject_rules": [],
    "continuity_rules": [],
    "image_prompt_base": "",
    "global_negative_prompt": "",
    "forbidden_visuals": []
  },

  "character_bible": [],

  "recurring_subject_bible": [],

  "environment_bible": [],

  "hero_image_package": {
    "thumbnail_hero_image": {
      "purpose": "",
      "composition": {
        "aspect_ratio": "16:9",
        "subject_placement": "",
        "text_safe_area": "",
        "camera": "",
        "emotion": ""
      },
      "image_prompt": "",
      "negative_prompt": "",
      "text_overlay_safe_area": {
        "enabled": true,
        "area": "",
        "requirements": []
      },
      "accuracy_notes": []
    },
    "video_opening_image": {
      "purpose": "",
      "composition": {
        "aspect_ratio": "16:9",
        "subject_placement": "",
        "camera": "",
        "emotion": ""
      },
      "image_prompt": "",
      "negative_prompt": "",
      "accuracy_notes": []
    }
  },

  "global_image_prompt_template": {
    "template": "",
    "required_scene_fields": [],
    "style_base": "",
    "negative_prompt_base": ""
  },

  "visual_consistency_rules": {
    "must_keep_consistent": [],
    "can_vary": [],
    "must_not_introduce": [],
    "style_lock": {},
    "character_lock": {},
    "environment_lock": {}
  },

  "safety_visual_rules": {
    "sensitive_topics_detected": [],
    "visual_restrictions": [],
    "prompt_restrictions": [],
    "forbidden_prompt_claims": []
  },

  "quality_check": {
    "matches_niche": true,
    "matches_visual_style": true,
    "hero_moment_supported_by_line_range": true,
    "no_text_in_image_prompts": true,
    "negative_prompts_included": true,
    "character_consistency_ready": true,
    "environment_consistency_ready": true,
    "ready_for_step_4": true,
    "warnings": []
  }
}
`;
