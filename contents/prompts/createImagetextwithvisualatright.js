export const promptToAnalysisStep1 = (title, summary) => `
You are an expert Japanese YouTube thumbnail strategist for high-CTR drama, story, scandal, family, workplace, money, revenge, comedy-fail, and suspense videos.

Your task is to analyze the Japanese video title and summary, then create a structured thumbnail strategy.

IMPORTANT LANGUAGE RULE:
- Japanese is allowed only inside fields that are explicitly marked as Japanese text.
- All analysis, explanations, labels, and non-thumbnail fields must be written in English.
- Do not write Japanese outside the specified Japanese text fields.

INPUT:
Title:
${title}

Final Summary:
${summary}

TASK:
Extract the strongest visual and emotional thumbnail angle from the video.

You must NOT summarize the whole story.
You must identify the single most clickable moment or reveal.

Analyze the story using these criteria:

1. Niche detection
Choose the most fitting niche from:
- marriage_betrayal
- pregnancy_deception
- divorce_legal
- affair_exposure
- money_scam
- workplace_betrayal
- family_conflict
- revenge_exposure
- social_humiliation
- missing_person
- horror_suspense
- neet_comedy_fail
- life_failure
- relationship_breakdown
- crime_like_deception
- other

2. Emotional hook
Choose the dominant emotion:
- shock
- betrayal
- rage
- suspicion
- humiliation
- revenge
- fear
- anxiety
- sadness
- absurd_comedy
- moral_outrage

3. Main conflict
Identify the central conflict in one sentence.

4. Evidence object
Choose one strong object that can be shown visually:
Examples:
- smartphone with GPS map
- LINE messages
- SNS profile
- DNA test paper
- hospital document
- divorce paper
- envelope of money
- receipt
- security camera image
- lawyer document
- pregnancy test
- apartment key
- credit card statement
- workplace document

5. Setting
Choose one cinematic setting:
Examples:
- Kabukicho neon street
- host club entrance
- apartment hallway
- hospital corridor
- lawyer office
- family living room
- office at night
- train station
- police-like interview room
- dark street
- messy bedroom
- restaurant confrontation

6. Characters
Define the main people in the thumbnail.
Use generic fictional descriptions only.
Do not mention real people, celebrities, or identifiable persons.

7. Visual tension
Describe the right-side visual scene.
It should be cinematic, realistic, dramatic, and easy to understand.
Do not use anime, manga, cartoon, illustration, or 2D style.

8. Thumbnail copy direction
Suggest the logical content flow:
- line_1 purpose
- line_2 purpose
- line_3 purpose
- twist_line purpose

9. Safety constraints
Make sure the visual concept is policy-safe:
- fictional characters only
- no real person defamation
- no explicit sexual content
- no graphic violence
- no copyrighted logo or real brand logo
- no direct copying of any reference thumbnail
- generic signage only

OUTPUT FORMAT:
Return only valid JSON.
Do not include markdown.
Do not include explanations outside JSON.

JSON schema:
{
  "detected_niche": "string",
  "dominant_emotion": "string",
  "core_conflict": "string",
  "clickable_reveal": "string",
  "evidence_object": "string",
  "setting": "string",
  "characters": {
    "character_1": {
      "role": "string",
      "appearance": "string",
      "emotion": "string"
    },
    "character_2": {
      "role": "string",
      "appearance": "string",
      "emotion": "string"
    }
  },
  "visual_concept": {
    "scene": "string",
    "camera": "string",
    "lighting": "string",
    "mood": "string",
    "must_show": ["string"],
    "must_avoid": ["string"]
  },
  "thumbnail_copy_direction": {
    "line_1_purpose": "string",
    "line_2_purpose": "string",
    "line_3_purpose": "string",
    "twist_line_purpose": "string"
  },
  "color_direction": {
    "reason": "string",
    "recommended_main_text_colors": ["string"],
    "recommended_twist_banner_color": "string",
    "recommended_accent_color": "string"
  },
  "safety_policy": {
    "fictional_characters_only": true,
    "no_real_person_defamation": true,
    "no_explicit_sexual_content": true,
    "no_graphic_violence": true,
    "no_real_brand_or_news_logo": true,
    "no_exact_copy_of_reference_thumbnail": true
  }
}
`;

export const promptToNormalizeStep2 = result => `
You are a Japanese YouTube thumbnail copy normalization expert.

Your task is to create the best Japanese thumbnail copy from the thumbnail strategy.

IMPORTANT LANGUAGE RULE:
- The values inside "thumbnail_copy" must be written in Japanese.
- All other fields must be written in English.
- Do not write Japanese outside "thumbnail_copy".

INPUT THUMBNAIL STRATEGY:
${result}

TASK:
Create exactly one high-CTR thumbnail copy set for a fixed Japanese YouTube thumbnail template.

Fixed layout:
- Left side: text
- Right side: cinematic visual
- Top area: exactly 3 Japanese text lines
- Bottom area: exactly 1 larger twist line
- The top 3 lines must use the exact same font size later
- The bottom twist line must be larger than all top lines
- The top 3 lines should be visually balanced in length
- The twist line should be the strongest emotional hook

COPY RULES:
- Keep the same story meaning and emotional hook from the input strategy
- Do not add facts not supported by the input
- Do not over-explain
- Do not make the copy too literary
- Use short, punchy, natural Japanese thumbnail wording
- Avoid punctuation if possible
- Avoid quotation marks
- Avoid emojis
- Avoid long sentences
- Avoid complex kanji if a simpler expression is more readable
- Make it readable on mobile
- line_1, line_2, line_3 should each be around 7–14 Japanese full-width characters
- twist_line should be around 8–18 Japanese full-width characters
- If exact length is impossible, prioritize readability and CTR
- The top 3 lines should work as setup
- The twist_line should work as reveal / shock / payoff
- The twist_line must not simply repeat the top lines

CONTENT FLOW:
line_1:
Introduce the shocking situation or victim perspective.

line_2:
Introduce investigation, evidence, or rising suspicion.

line_3:
Introduce the setting, confrontation, or discovery.

twist_line:
Reveal the strongest twist.

OUTPUT FORMAT:
Return only valid JSON.
Do not include markdown.
Do not include multiple options.

JSON schema:
{
  "thumbnail_copy": {
    "line_1": "Japanese string",
    "line_2": "Japanese string",
    "line_3": "Japanese string",
    "twist_line": "Japanese string"
  },
  "copy_check": {
    "top_lines_count": 3,
    "top_lines_same_font_size_required": true,
    "twist_line_larger_required": true,
    "mobile_readability": "string",
    "meaning_preserved": true,
    "no_unsupported_fact_added": true
  },
  "layout_notes": {
    "line_1_role": "string",
    "line_2_role": "string",
    "line_3_role": "string",
    "twist_line_role": "string"
  }
}
`;

export const promptToGenerateImagePromptStep3 = (analysisResult, normalizeResult) => `
You are an expert prompt engineer for cinematic Japanese YouTube thumbnails.

You will receive:
1. A thumbnail strategy from Step 1
2. A normalized Japanese thumbnail copy from Step 1.5

Your task is to create a production-ready image generation prompt for a high-CTR Japanese YouTube thumbnail.

IMPORTANT LANGUAGE RULE:
- Japanese text may appear only inside the thumbnail text fields.
- All other instructions must be written in English.
- Do not write Japanese anywhere else.

INPUT STEP 1:
${analysisResult}

INPUT STEP 1.5:
${normalizeResult}

OBJECTIVE:
Create a 1280x720 YouTube thumbnail with:
- Left side: large Japanese text
- Right side: cinematic realistic visual scene
- Bottom: full-width twist banner
- High CTR, dramatic, readable on mobile
- Non-anime, realistic cinematic style
- Policy-safe fictional characters

FIXED LAYOUT:
- Canvas: 1280x720
- Aspect ratio: 16:9
- Left text area: approximately 60% width
- Right visual area: approximately 40% width
- Top text block: 3 lines only
- Bottom banner: 1 line only
- Top 3 text lines must have identical font size, identical weight, and identical stroke thickness
- Bottom twist line must be the largest text on the entire thumbnail
- Bottom twist line font size should be approximately 1.45x the top-line font size
- No additional text anywhere
- Do not place text over faces
- Do not crop faces awkwardly
- Keep all text readable on mobile

TYPOGRAPHY:
- Bold Japanese variety-show / tabloid thumbnail style
- Very thick black outline around every text line
- Strong drop shadow
- High contrast
- Top 3 lines: same font size, same style, same line height
- Twist line: larger, heavier, centered inside the bottom banner
- Do not vary the top line font sizes
- Do not make one top line larger than the others
- Do not use tiny text
- Do not use thin fonts
- Do not use calligraphy fonts

COLOR STRATEGY:
Automatically choose colors based on the detected niche and dominant emotion.

General rules:
- Betrayal, affair, divorce, pregnancy deception, scandal:
  Use yellow and white main text with black outline, red or deep red twist banner.
- Money scam, debt, fraud:
  Use yellow and white main text with optional green accent, red or dark green twist banner.
- Workplace betrayal:
  Use white and yellow main text, navy or red twist banner.
- Horror, fear, missing person:
  Use white and red main text, black or dark red twist banner.
- Comedy fail, neet, humiliation:
  Use yellow and white main text, orange-red or red twist banner.

The color choices must preserve strong contrast and mobile readability.

VISUAL STYLE:
- Cinematic realistic Japanese drama scene
- Live-action look
- Dramatic lighting
- High contrast
- Sharp focus
- Emotional facial expressions
- No anime
- No manga
- No cartoon
- No illustration
- No plastic CGI look

RIGHT-SIDE VISUAL:
Use the visual concept from Step 1.
Show:
- Generic fictional characters only
- Clear confrontation or emotional tension
- Evidence object visible
- Setting visible but not cluttered
- Dramatic facial expressions
- Strong storytelling in one frame

SAFETY:
- Use fictional generic Japanese characters
- Do not depict real people or celebrities
- Do not imply a real identifiable person committed wrongdoing
- Do not use real brand logos
- Do not use news logos
- Do not copy any existing thumbnail exactly
- Use generic signage only
- No explicit sexual imagery
- No nudity
- No graphic violence
- No gore
- No minors in sexualized or abusive context
- Keep pregnancy-related content non-explicit and drama-focused

OUTPUT FORMAT:
Return only valid JSON.
Do not include markdown.

JSON schema:
{
  "image_generation_prompt": "string",
  "negative_prompt": "string",
  "layout_spec": {
    "canvas": "1280x720",
    "aspect_ratio": "16:9",
    "left_text_area": "60%",
    "right_visual_area": "40%",
    "top_text_lines": 3,
    "bottom_twist_banner": true,
    "top_lines_same_font_size": true,
    "twist_line_largest": true
  },
  "thumbnail_text": {
    "line_1": "Japanese string",
    "line_2": "Japanese string",
    "line_3": "Japanese string",
    "twist_line": "Japanese string"
  },
  "design_lock_rules": [
    "string"
  ],
  "safety_rules": [
    "string"
  ]
}
`;
