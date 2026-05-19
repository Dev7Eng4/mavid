export const promptStep4CreateChapterScenes = ({
  videoContext,
  chapterContext,
  neighborContext,
  chapterSourceMaterial,
  visualPackage,
  step4Rules,
}) => `
You are an expert scene planner and image prompt engineer for automated Japanese YouTube audio-image videos.

This is Step 4: Create Scene Plan For ONE Chapter.

You will receive:
- video context
- exactly one chapter to process
- previous/next chapter context for continuity only
- source material for this chapter
- visual package from Step 3
- step 4 rules from the resolved niche/style config

Your task is to create a scene plan ONLY for the current chapter.

━━━━━━━━━━━━━━━━━━━━
WHAT YOU MUST DO
━━━━━━━━━━━━━━━━━━━━
Create multiple visual scenes for the current chapter.

Each scene must:
1. Belong only to the current chapter.
2. Have a valid line_range inside the current chapter line_range.
3. Represent a meaningful story beat, topic point, practical step, or visual moment from this chapter.
4. Follow the recommended_scene_count unless a small adjustment is necessary.
5. Include one English image_prompt.
6. Include one English negative_prompt.
7. Follow the visual_bible and selected visual style exactly.
8. Use character_bible or recurring_subject_bible for consistency.
9. Use environment_bible when choosing the location.
10. Follow all niche safety rules.
11. Include no text/no subtitles/no watermark in every image prompt.

━━━━━━━━━━━━━━━━━━━━
WHAT YOU MUST NOT DO
━━━━━━━━━━━━━━━━━━━━
- Do NOT create scenes for other chapters.
- Do NOT create scenes for the previous chapter.
- Do NOT create scenes for the next chapter.
- Do NOT reveal the next chapter too early.
- Do NOT rewrite the final summary.
- Do NOT create YouTube metadata.
- Do NOT create a new visual bible.
- Do NOT invent timestamps.
- Do NOT invent unsupported plot events, characters, health claims, financial claims, or gardening steps.
- Do NOT include readable text in image prompts.
- Do NOT ask the image model to render Japanese text, English text, subtitles, signs, charts, labels, UI text, or document text.
- Do NOT create thumbnail text.
- Do NOT create a final video timeline in seconds.

━━━━━━━━━━━━━━━━━━━━
VIDEO CONTEXT
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(videoContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━
CURRENT CHAPTER TO PROCESS
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(chapterContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━
NEIGHBOR CONTEXT
━━━━━━━━━━━━━━━━━━━━
Use this only for continuity.
Do not create scenes for these chapters.
Do not reveal next chapter events too early.

${JSON.stringify(neighborContext, null, 2)}

━━━━━━━━━━━━━━━━━━━━
CHAPTER SOURCE MATERIAL
━━━━━━━━━━━━━━━━━━━━
Use this as the factual basis for scene planning.
Prefer visual_candidates when they are strong and supported by line ranges.

${JSON.stringify(chapterSourceMaterial, null, 2)}

━━━━━━━━━━━━━━━━━━━━
VISUAL PACKAGE FROM STEP 3
━━━━━━━━━━━━━━━━━━━━
Follow this visual system exactly.
Do not change visual style.
Do not create a new visual bible.

${JSON.stringify(visualPackage, null, 2)}

━━━━━━━━━━━━━━━━━━━━
STEP 4 RULES
━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(step4Rules, null, 2)}

━━━━━━━━━━━━━━━━━━━━
CRITICAL LINE ID RULES
━━━━━━━━━━━━━━━━━━━━
- The current chapter line_range is the hard boundary.
- Every scene must have line_range.
- Every scene line_range must be inside the current chapter line_range.
- Scene line ranges must be ordered.
- Scene line ranges should cover the chapter reasonably without large gaps.
- Do not use line IDs outside the current chapter.
- Do not invent timestamps.
- Line IDs are not timestamps.
- The code will map line IDs to timestamps later.

━━━━━━━━━━━━━━━━━━━━
SCENE COUNT RULES
━━━━━━━━━━━━━━━━━━━━
- Use chapterContext.recommended_scene_count as the target scene count.
- You may adjust by plus or minus 1 if necessary.
- If the chapter has very_high visual_potential, you may add 1 scene.
- If the chapter is a short transition or summary, you may reduce by 1 scene.
- Do not create only 1 scene unless the chapter is very short or purely transitional.
- Do not create far more scenes than recommended.

━━━━━━━━━━━━━━━━━━━━
SCENE DESIGN RULES
━━━━━━━━━━━━━━━━━━━━
Each scene should represent one of:
- a story beat
- an emotional shift
- a visual candidate
- a topic point
- a warning point
- a practical advice point
- a procedural step
- a chapter opening or chapter summary moment

Do not create generic filler scenes.
Do not repeat nearly identical visuals unless the audio is recapping or the chapter requires a calm repeated motif.

━━━━━━━━━━━━━━━━━━━━
IMAGE PROMPT RULES
━━━━━━━━━━━━━━━━━━━━
- Image prompts must be in English.
- Every image prompt must follow the selected visual style.
- Every image prompt must include:
  - visual style
  - main subject/action
  - environment/location
  - emotion or mood
  - camera/framing
  - lighting
  - composition
  - 16:9 composition
  - no text
  - no subtitles
  - no watermark
- If documents, phones, notebooks, charts, signs, labels, books, packages, or screens appear, they must be unreadable or abstract.
- Do not include readable Japanese text or readable English text.
- Use the global_negative_prompt from visual_bible and add scene-specific negative terms when needed.

━━━━━━━━━━━━━━━━━━━━
NICHE-SPECIFIC SAFETY RULES
━━━━━━━━━━━━━━━━━━━━
- For drama: do not invent violence, affair scenes, legal scenes, police, pregnancy, DNA results, or extra characters unless supported by the chapter source material.
- For health: avoid diagnosis, cure claims, guaranteed prevention, scary medical imagery, fake medical charts, and hospital panic unless clearly supported.
- For finance: avoid guaranteed profit imagery, readable yen amounts, fake official documents, stock panic, casino/luxury exaggeration, or investment hype.
- For gardening: avoid wrong plant species, fake readable labels, dangerous chemical instructions, or unrealistic giant plants.

━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not include markdown.
Do not include explanations outside JSON.

Use this exact schema:

{
  "step": "step_4_create_chapter_scenes",

  "chapter_id": "${chapterContext.chapter_id}",
  "chapter_index": ${chapterContext.chapter_index},

  "chapter_scene_summary": {
    "chapter_line_range": {
      "start_line_id": ${chapterContext.line_range.start_line_id},
      "end_line_id": ${chapterContext.line_range.end_line_id}
    },
    "recommended_scene_count": ${chapterContext.recommended_scene_count || 0},
    "actual_scene_count": 0,
    "coverage_strategy": ""
  },

  "scenes": [
    {
      "local_scene_id": "${chapterContext.chapter_id}_sc_001",
      "chapter_id": "${chapterContext.chapter_id}",
      "chapter_index": ${chapterContext.chapter_index},
      "scene_index_in_chapter": 1,

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

  "quality_check": {
    "chapter_covered": true,
    "scene_count_reasonable": true,
    "all_scenes_inside_chapter_range": true,
    "line_ranges_are_ordered": true,
    "no_timestamps_invented": true,
    "all_scenes_have_image_prompts": true,
    "prompts_follow_visual_bible": true,
    "no_text_in_image_prompts": true,
    "negative_prompts_included": true,
    "ready_for_merge": true,
    "warnings": []
  }
}
`;
