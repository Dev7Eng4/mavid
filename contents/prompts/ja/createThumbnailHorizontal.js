export const promptToAnalysisForThumbnailHorizontal = (title, summary) => `
You are a top-tier Japanese YouTube thumbnail strategist specializing in high-CTR drama, scandal, relationship, revenge, family, workplace, and life-story content.

Your task is to analyze the given Japanese video title and final summary, then create a thumbnail strategy for a cinematic Japanese YouTube thumbnail.

IMPORTANT LANGUAGE RULE:
- All output must be written in English.
- Do not write Japanese in this step.
- Japanese text will be created in a later step only.

GOAL:
Create a strategy for a high-CTR thumbnail with:
- strong emotional conflict
- one clear clickable reveal
- one strong evidence object if possible
- cinematic live-action realism
- no copyrighted logos
- no real celebrities
- no explicit sexual imagery
- no graphic violence
- safe fictional/generic characters

INPUT:
Title:
${title}

Final Summary:
${summary}

TASK:
Analyze the story and return a single JSON object.

OUTPUT FORMAT:
Output raw valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

STRICT OUTPUT FORMAT:
{
  "detected_niche": "",
  "sub_niche": "",
  "dominant_emotion": "",
  "secondary_emotion": "",
  "core_conflict": "",
  "clickable_reveal": "",
  "best_thumbnail_moment": "",
  "evidence_object": "",
  "setting": "",
  "characters": {
    "character_1": {
      "role": "",
      "appearance": "",
      "expression": "",
      "pose": ""
    },
    "character_2": {
      "role": "",
      "appearance": "",
      "expression": "",
      "pose": ""
    }
  },
  "visual_tone": "",
  "visual_scene": "",
  "safe_visual_description": "",
  "ctr_reasoning": {
    "why_this_moment_is_clickable": "",
    "what_viewer_will_wonder": "",
    "main_curiosity_gap": ""
  },
  "thumbnail_angle": {
    "line_1_concept": "",
    "line_2_concept": "",
    "line_3_concept": "",
    "twist_line_concept": ""
  },
  "risk_flags": {
    "real_person_risk": false,
    "minor_risk": false,
    "explicit_sexual_content_risk": false,
    "graphic_violence_risk": false,
    "copyright_or_logo_risk": false,
    "defamation_risk": false
  },
  "safety_notes": ""
}

RULES:
1. The thumbnail should feel like a dramatic Japanese live-action reenactment, not anime.
2. Avoid sexualized framing even if the story involves cheating, pregnancy, host clubs, or betrayal.
3. Use generic fictional people only.
4. Do not mention or rely on real celebrities, real brands, real host club names, real company names, or copyrighted visual styles.
5. The best thumbnail moment should be visually simple and instantly understandable on mobile.
6. The evidence object should be concrete when possible: smartphone, GPS map, DNA paper, divorce papers, receipt, chat screen, SNS evidence, pregnancy test, wedding ring, contract, etc.
7. The output must be valid JSON only.
`;

export const promptToGenerateTextForThumbnailHorizontal = analysisResult => `
You are a Japanese YouTube thumbnail copy normalization expert.

Your task is to create short, punchy Japanese thumbnail copy for a fixed high-CTR thumbnail layout.

IMPORTANT LANGUAGE RULE:
- The values inside "thumbnail_copy" must be written in Japanese.
- All other fields must be written in English.
- Do not write Japanese outside "thumbnail_copy".

FIXED VISUAL LAYOUT:
- The thumbnail has a left text area and a right visual area.
- The top text area has exactly 3 Japanese lines.
- line_1, line_2, and line_3 must use the exact same font size later.
- The bottom twist line will be larger than all top lines.
- Therefore, line_1, line_2, and line_3 must be visually balanced in length.
- The twist line must be the strongest hook.
- Text must be readable on mobile.

INPUT FROM STEP 1:
${analysisResult}

TASK:
Create one best thumbnail copy option only.

COPY RULES:
1. Keep the story meaning and CTR hook from Step 1.
2. Do not add facts not supported by Step 1.
3. Do not make the copy too literary or explanatory.
4. Use natural Japanese thumbnail wording.
5. Avoid punctuation if possible.
6. Avoid quotation marks.
7. Avoid emojis.
8. Avoid overly long lines.
9. Avoid line_1 being too short compared to line_2 and line_3.
10. Avoid using difficult kanji if a simpler phrase is more readable.
11. The top 3 lines should each be around 7–14 Japanese full-width characters.
12. The twist_line should be around 8–18 Japanese full-width characters.
13. The twist_line should be more shocking, revealing, or curiosity-driven than the top 3 lines.
14. Do not use explicit sexual wording.
15. Do not use defamatory wording toward real people.
16. If the story involves pregnancy, cheating, divorce, host clubs, betrayal, revenge, debt, inheritance, family conflict, or workplace conflict, express it as dramatic conflict, evidence, discovery, or reversal.

IMPORTANT BALANCE RULE:
- line_1, line_2, and line_3 must look good at the same font size.
- Prefer similar visual length across the top 3 lines.
- If one line is much shorter than the others, rewrite it.
- Do not rely on code to scale each top line separately.

OUTPUT FORMAT:
Output raw valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.
Do not output rejected hook angles.

STRICT OUTPUT FORMAT:
{
  "thumbnail_copy": {
    "line_1": "",
    "line_2": "",
    "line_3": "",
    "twist_line": ""
  },
  "copy_intent": {
    "line_1_role": "",
    "line_2_role": "",
    "line_3_role": "",
    "twist_line_role": ""
  },
  "length_check": {
    "line_1_visual_length": "",
    "line_2_visual_length": "",
    "line_3_visual_length": "",
    "twist_line_visual_length": "",
    "top_lines_balanced": true
  },
  "safety_check": {
    "no_explicit_sexual_wording": true,
    "no_real_person_claim": true,
    "no_copyrighted_reference": true,
    "no_unsupported_fact": true
  }
}
`;

export const promptToGenerateVisualPromptForThumbnailHorizontal = (analysisResult, textThumbnailResult) => `
You are an expert prompt engineer and thumbnail design planner for cinematic Japanese YouTube thumbnails.

You will receive:
1. Thumbnail strategy from Step 1
2. Normalized Japanese thumbnail copy from Step 1.5

Your task is to create:
- color strategy
- layout tokens
- typography tokens
- image-generation prompt for the visual background only

IMPORTANT LANGUAGE RULE:
- Japanese text may appear only inside "thumbnail_copy".
- All other fields must be written in English.
- Do not write Japanese anywhere else.

CRITICAL PRODUCTION RULE:
The image model must NOT render the Japanese thumbnail text.
The final Japanese text will be rendered later by code.
The image-generation prompt must request a visual background only, with no text overlay.

INPUT STEP 1:
${analysisResult}

INPUT STEP 1.5:
${textThumbnailResult}

DESIRED FINAL THUMBNAIL FORMAT:
- 1280x720
- Left side: Japanese text
- Right side: cinematic dramatic visual
- Bottom full-width banner: twist line
- Top 3 lines: same font size
- Bottom twist line: larger than all top lines
- Thick black stroke around text
- High CTR Japanese variety-show / drama style
- Cinematic live-action realism, not anime
- Visual and left text background should feel like one unified scene, not two separate blocks

TASK:
Return one complete JSON object.

OUTPUT FORMAT:
Output raw valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.
Do not output rejected hook angles.

STRICT OUTPUT FORMAT:
{
  "thumbnail_copy": {
    "line_1": "",
    "line_2": "",
    "line_3": "",
    "twist_line": ""
  },
  "layout_tokens": {
    "canvas_width": 1280,
    "canvas_height": 720,
    "left_text_x": 36,
    "left_text_y": 26,
    "left_text_width": 735,
    "top_text_area_height": 510,
    "right_visual_x": 760,
    "right_visual_width": 520,
    "twist_banner_x": 0,
    "twist_banner_y": 560,
    "twist_banner_width": 1280,
    "twist_banner_height": 160,
    "safe_margin": 24
  },
  "typography_tokens": {
    "font_family_recommendation": "Noto Sans JP Black",
    "top_font_size": 92,
    "twist_font_size": 118,
    "top_stroke_width": 10,
    "twist_stroke_width": 11,
    "top_line_gap": 10,
    "twist_letter_spacing": -2,
    "text_align": "left",
    "vertical_align": "center"
  },
  "color_strategy": {
    "line_1_fill": "",
    "line_2_fill": "",
    "line_3_fill": "",
    "top_text_stroke": "#000000",
    "twist_fill": "#FFFFFF",
    "twist_stroke": "#000000",
    "twist_bg": "",
    "left_overlay_color": "",
    "left_overlay_opacity": 0.72,
    "visual_mood_colors": [],
    "reasoning": ""
  },
  "visual_prompt": "",
  "negative_prompt": "",
  "image_generation_rules": {
    "must_not_render_text": true,
    "must_not_use_real_logos": true,
    "must_not_use_real_celebrities": true,
    "must_not_use_copyrighted_characters": true,
    "must_not_include_explicit_sexual_content": true,
    "must_not_include_graphic_violence": true,
    "must_leave_left_side_clean_for_text": true,
    "must_blend_left_side_with_right_scene": true
  },
  "renderer_notes": {
    "text_rendering": "Render all Japanese text by code, not by the image model.",
    "top_lines": "Use the same font size for line_1, line_2, and line_3. Do not scale them independently.",
    "twist_line": "Render twist_line larger than the top lines inside the bottom banner.",
    "stroke": "Use thick black stroke for strong mobile readability.",
    "background": "Apply a dark translucent overlay on the left side so text remains readable while preserving the visual atmosphere."
  }
}

COLOR RULES:
Choose colors based on niche and emotion.

Recommended mappings:
- Cheating, divorce, betrayal, pregnancy deception, host club scandal:
  line_1_fill: yellow
  line_2_fill: white
  line_3_fill: yellow or white
  twist_bg: red
  mood: black, red, neon blue, magenta

- Revenge, karma, legal confrontation:
  line_1_fill: yellow
  line_2_fill: white
  line_3_fill: yellow
  twist_bg: dark red or black
  mood: red, black, gold

- Emotional family reunion, recovery, redemption:
  line_1_fill: white
  line_2_fill: yellow
  line_3_fill: white
  twist_bg: warm orange or deep red
  mood: amber, navy, soft contrast

- Horror, mystery, disappearance:
  line_1_fill: white
  line_2_fill: yellow
  line_3_fill: white
  twist_bg: black or dark red
  mood: cold blue, red, purple

- Workplace conflict, debt, social downfall:
  line_1_fill: yellow
  line_2_fill: white
  line_3_fill: yellow
  twist_bg: red or dark navy
  mood: steel blue, black, red

VISUAL PROMPT RULES:
The visual_prompt must:
1. Be written in English.
2. Ask for a background / visual scene only.
3. Explicitly say: no text overlay.
4. Use cinematic live-action realism.
5. Mention 1280x720, 16:9.
6. Mention left side reserved for large Japanese text.
7. Mention right side contains the dramatic scene.
8. Make the left side visually blend with the right side using matching lighting/colors.
9. Include fictional generic Japanese characters only.
10. Include evidence object when useful.
11. Avoid real brand names, real logos, copyrighted styles, celebrities, and explicit sexual content.

NEGATIVE PROMPT RULES:
The negative_prompt must include:
- no text
- no letters
- no subtitles
- no logo
- no watermark
- no real celebrity
- no copyrighted character
- no anime
- no manga
- no explicit sexual content
- no graphic violence
- no distorted hands
- no extra fingers
- no unreadable signage focus
`;
