export const promptStep4ScenePlanning = ({ videoContext, step4Rules, finalAnalysis, chapterSourceMaterial, visualPackage }) => `
You are an expert scene planner and image prompt engineer for automated Japanese YouTube audio-image videos.

This is Step 4: Chapter Scene Planning + Scene Image Prompts.

You will receive:
- final content analysis from Step 2
- chapter source material extracted from Step 1 analyses
- visual package from Step 3

Your task is to create a complete scene plan for the video.

━━━━━━━━━━━━━━━━━━━━
WHAT STEP 4 MUST DO
━━━━━━━━━━━━━━━━━━━━
You must:
1. Create multiple scenes for each chapter.
2. Preserve line ID ranges for every scene.
3. Ensure all chapters are covered.
4. Generate one image prompt per scene.
5. Generate one negative prompt per scene.
6. Follow the visual bible and visual style exactly.
7. Use character_bible or recurring_subject_bible for consistency.
8. Use environment_bible when selecting locations.
9. Follow niche safety rules.
10. Return a structured JSON scene plan.

━━━━━━━━━━━━━━━━━━━━
WHAT STEP 4 MUST NOT DO
━━━━━━━━━━━━━━━━━━━━
- Do NOT create YouTube metadata.
- Do NOT rewrite the final summary.
- Do NOT create a new visual bible.
- Do NOT invent timestamps.
- Do NOT invent unsupported events, characters, health claims, financial claims, or gardening steps.
- Do NOT include readable text in image prompts.
- Do NOT ask for text to be rendered inside images.
- Do NOT create thumbnail text.
- Do NOT create the final video timeline with seconds.

━━━━━━━━━━━━━━━━━━━━
VIDEO CONTEXT
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(videoContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━
STEP 4 RULES
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(step4Rules, null, 2)}

━━━━━━━━━━━━━━━━━━━━
FINAL ANALYSIS FROM STEP 2
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(finalAnalysis, null, 2)}

━━━━━━━━━━━━━━━━━━━━
CHAPTER SOURCE MATERIAL
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(chapterSourceMaterial, null, 2)}

━━━━━━━━━━━━━━━━━━━━
VISUAL PACKAGE FROM STEP 3
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(visualPackage, null, 2)}

━━━━━━━━━━━━━━━━━━━━
CRITICAL LINE ID RULES
━━━━━━━━━━━━━━━━━━━━
- Line IDs are the only timeline anchor.
- Do NOT invent timestamps.
- Every scene must have a line_range.
- Scene line ranges must stay inside the parent chapter line_range.
- Scene line ranges should be ordered.
- Scene line ranges should cover the chapter reasonably without large gaps.
- Do not duplicate the same line range across many scenes unless intentionally reusing a visual moment.

━━━━━━━━━━━━━━━━━━━━
SCENE COUNT RULES
━━━━━━━━━━━━━━━━━━━━
- Use each chapter's recommended_scene_count as the base.
- Adjust slightly only when necessary.
- High visual potential or climax chapters may have more scenes.
- Summary or transition chapters may have fewer scenes.
- Follow the niche scene density rules.
- Do not create too few images for long videos.

━━━━━━━━━━━━━━━━━━━━
IMAGE PROMPT RULES
━━━━━━━━━━━━━━━━━━━━
- Image prompts must be written in English.
- Every image prompt must include the selected visual style.
- Every image prompt must include: 16:9 composition, no text, no subtitles, no watermark.
- Do not include Japanese text, English text, readable documents, readable signs, readable screens, readable charts, or fake UI text.
- If documents, phone screens, notebooks, charts, labels, or books appear, they must be unreadable or abstract.
- Follow the visual_bible, character_bible, recurring_subject_bible, and environment_bible.
- Include camera, lighting, mood, subject, and environment.
- Do not switch visual styles.

━━━━━━━━━━━━━━━━━━━━
NICHE SAFETY RULES
━━━━━━━━━━━━━━━━━━━━
- For drama: do not invent violence, affair scenes, legal scenes, police, or extra characters unless supported.
- For health: avoid diagnosis, cure claims, scary medical imagery, fake medical charts, and hospital panic unless supported.
- For finance: avoid guaranteed profit imagery, readable yen amounts, fake official documents, and investment hype.
- For gardening: avoid wrong plant species, fake labels, dangerous chemicals, or unrealistic giant plants.

━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not include markdown.
Do not include explanations outside JSON.

Use this schema:

{
  "step": "step_4_scene_planning",

  "video_context": {
    "niche_id": "${videoContext.niche_id}",
    "visual_style_id": "${videoContext.visual_style_id}",
    "language": "${videoContext.language}",
    "output_type": "${videoContext.output_type}",
    "target_platform": "${videoContext.target_platform}",
    "video_duration_seconds": ${videoContext.video_duration_seconds || 0}
  },

  "scene_plan_summary": {
    "total_chapters": 0,
    "total_scenes": 0,
    "scene_density_strategy": "",
    "estimated_seconds_per_scene_range": {
      "min": 0,
      "max": 0
    },
    "line_coverage": {
      "start_line_id": 0,
      "end_line_id": 0
    }
  },

  "chapter_scene_breakdown": [
    {
      "chapter_id": "ch_001",
      "chapter_index": 1,
      "chapter_title_ja": "",
      "chapter_line_range": {
        "start_line_id": 0,
        "end_line_id": 0
      },
      "recommended_scene_count_from_step_2": 0,
      "actual_scene_count": 0,
      "scene_ids": []
    }
  ],

  "scenes": [
    {
      "scene_id": "sc_001",
      "chapter_id": "ch_001",
      "chapter_index": 1,
      "scene_index_in_chapter": 1,
      "global_scene_index": 1,

      "line_range": {
        "start_line_id": 0,
        "end_line_id": 0
      },

      "scene_title": "",
      "scene_summary": "",
      "scene_function": "",

      "visual_priority": "low | medium | high | very_high",
      "image_usage": "main_video_scene | chapter_opening | climax_scene | summary_scene",

      "characters_or_subjects": [],
      "environment_id": "",
      "emotion_or_mood": "",

      "visual_description": "",
      "camera": "",
      "lighting": "",
      "composition": "",

      "image_prompt": "",
      "negative_prompt": "",

      "continuity_notes": [],
      "safety_notes": [],
      "transition_note": ""
    }
  ],

  "asset_generation_plan": {
    "total_images_to_generate": 0,
    "can_reuse_hero_image": true,
    "suggested_reusable_images": [],
    "priority_generation_order": []
  },

  "quality_check": {
    "all_chapters_covered": true,
    "all_scenes_have_line_ranges": true,
    "line_ranges_are_ordered": true,
    "no_timestamps_invented": true,
    "all_scenes_have_image_prompts": true,
    "all_prompts_follow_visual_bible": true,
    "all_prompts_have_no_text_rule": true,
    "negative_prompts_included": true,
    "safety_rules_followed": true,
    "ready_for_image_generation": true,
    "warnings": []
  }
}
`;
