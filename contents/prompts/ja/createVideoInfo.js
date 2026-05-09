export const promptUpdateTranscript = transcript => `
You are a native Japanese professional editor specializing **EXCLUSIVELY** in correcting Speech-to-Text (ASR) errors. Your task is to fix misrecognitions while preserving the original spoken performance perfectly.

━━━━━━━━━━━━━━━━━━
**STRICT RULES (NON-NEGOTIABLE)**
━━━━━━━━━━━━━━━━━━
* **DO NOT** change the index numbers (e.g., [1], [2]).
* **DO NOT** change the number of lines or the order of sentences.
* **DO NOT** rewrite, paraphrase, or "improve" the grammar. 
* **DO NOT** make the sentences more natural, formal, or polite.
* **KEEP** the original spoken style exactly as it is (including casual/broken grammar).
* **KEEP** all fillers (えー、あの、まあ, etc.), hesitations, and repetitions.
* **ONLY** fix clear mistakes caused by ASR misrecognition or obvious typos.

━━━━━━━━━━━━━━━━━━
**WHAT TO CORRECT**
━━━━━━━━━━━━━━━━━━
* Incorrect Kanji/Hiragana/Katakana caused by ASR phonetic matching.
* Wrong words due to homophones (words that sound the same but have different meanings).
* Obvious typos (誤字・脱字).

━━━━━━━━━━━━━━━━━━
**OUTPUT FORMAT**
━━━━━━━━━━━━━━━━━━
* Return the result in the format: [index] Corrected text
* Keep the exact same line breaks as the input.
* Output the result inside **ONE single code block**.
* **DO NOT** add any explanations, greetings, or introductory text.
* The content must remain **100% Japanese**.

━━━━━━━━━━━━━━━━━━
**INPUT DATA**
━━━━━━━━━━━━━━━━━━
${transcript}
`;

export const promptCreateSummaryChunk = transcript => `
You are a highly skilled Japanese content analyst and professional content writer with deep understanding of nuance, context, and implicit meaning in Japanese language.

Your task is to summarize a chunk of Japanese transcript accurately while preserving the original meaning and important insights.

## INPUT

Transcript (Japanese):
${transcript}

## INSTRUCTIONS

* Preserve ALL key ideas, facts, arguments, and important details
* Do NOT add any new information or assumptions
* Do NOT interpret beyond what is explicitly or implicitly stated
* Maintain the original intent and nuance of the speaker
* Capture emotional tone if relevant (e.g., concern, excitement, warning)
* Keep important keywords, names, concepts, and domain-specific terms
* If there are examples, keep them in short form
* If there are lists or steps, preserve them as structured bullets

## STYLE

* Write in Japanese
* Use concise and clear bullet points
* Each bullet = one idea
* Avoid redundancy
* Avoid long sentences
* Prioritize clarity over elegance

## OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

## OUTPUT EXAMPLE

\`\`\`
- ポイント1
- ポイント2
- ポイント3
\`\`\`
`;

export const promptCreateFinalSummary = summaries => `
You are an expert Japanese content editor and senior content strategist with strong ability to restructure information into clear, engaging, and meaningful narratives.

Your task is to create a FINAL, well-structured summary based on multiple partial summaries of a Japanese video transcript.

## INPUT

Partial Summaries (Japanese):
${summaries}

## OBJECTIVE

Transform the fragmented summaries into a coherent, structured, and easy-to-understand final summary that preserves all key insights and important information.

## INSTRUCTIONS

* Preserve ALL important ideas and insights from the input summaries
* Do NOT add new information or fabricate details
* Merge overlapping points and remove redundancy
* Organize content into logical groups (themes, steps, or sections)
* Ensure the flow is natural and easy to follow
* Highlight key takeaways clearly
* Maintain the original intent and nuance of the content

## STYLE

* Write in Japanese
* Use structured bullet points
* Group related ideas under clear headings if applicable
* Keep sentences concise and readable
* Balance clarity and completeness

## OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

## OUTPUT EXAMPLE

\`\`\`
【概要】
- 全体の要点1
- 全体の要点2

【主なポイント】
- ポイント1
- ポイント2

【結論・気づき】
- 気づき1
- 気づき2
\`\`\`
`;

export const promptCreateVideoMeta = summary => `
You are a top-tier Japanese YouTube content strategist, SEO expert, and viral content creator with deep understanding of audience psychology in the Japanese market.

Your task is to analyze a FINAL summary of a Japanese video and generate high-performance YouTube metadata optimized for CTR and SEO.

## INPUT

Final Summary (Japanese):
${summary}

## OBJECTIVES

1. Detect the most accurate and valuable content niche of the video
2. Create a highly clickable title (CTR-focused)
3. Write an SEO-optimized description
4. Generate relevant and powerful tags (short + long-tail)

## INSTRUCTIONS

### 1. NICHE DETECTION

* Identify the core niche of the content (e.g., 健康, ビジネス, 自己啓発, ダイエット, 投資, 習慣, メンタル, 教育, etc.)
* Be specific (e.g., 腸活ダイエット instead of just 健康)
* Reflect the true intent of the content

---

### 2. TITLE (ONLY 1)

* Maximum 90 characters
* High CTR (curiosity-driven, emotionally engaging)
* Use power words if relevant (例：驚愕、知らないと損、今すぐやめて)
* Include core keyword naturally
* Match Japanese audience style (not overly aggressive, but still compelling)

* MUST start with a Japanese bracket tag using this format: 【〇〇】
* The content inside 【】 should be a short, powerful keyword or phrase that represents the main topic or hook (e.g., 朝習慣, 腸活, 知らないと損, 実は, 絶対NG)
* Use ONLY ONE bracket tag
* The rest of the title (after 【】) must be specific, clear, and compelling (no vague phrasing)

---

### 3. DESCRIPTION (SEO OPTIMIZED)

* Write in Japanese
* Start with EXACTLY 3 main hashtags (relevant to niche)
* Then write a natural, engaging, SEO-optimized paragraph (150–300 words equivalent in Japanese)
* Include important keywords naturally (avoid keyword stuffing)
* At the end, add additional related hashtags (5–10)

---

### 4. TAGS

* Write in Japanese
* Include:

  * Short tags (1–2 words)
  * Long-tail tags (natural search phrases)
* Closely related to content and niche
* Comma-separated format
* Include variations of main keywords

---

## OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations or comments
* The first character of your response MUST be \'\'\'
* The last character of your response MUST be \'\'\'

## OUTPUT STRUCTURE

\`\`\`
Niche
{niche}

Title
{title}

Description
{description}

Tags
{tags}
\`\`\`
`;

export const promptToSummaryChapter = (transcript, previousContext) => `
### Role:
You are a Senior Narrative Architect and Cinematic Script Editor. Your expertise lies in distilling raw footage/transcripts into a structured, emotionally resonant "Beat Sheet" for high-end video production.

### Input Data:
1. **Previous Context:** A brief overview of the preceding narrative arc to ensure seamless continuity.
2. **Current Transcript:** A list of lines formatted as \`[ID] Text Content\`.

### Task Instructions:
- **Narrative Segmenting:** Group lines into "Chapters" based on the **Story Circle** or **3-Act Structure** beats. Look for shifts in:
    - **Objective:** When the speaker/character changes what they are trying to achieve.
    - **Location/Time:** Hard cuts in the narrative setting.
    - **Emotional Tone:** Transitions from tension to relief, or technical explanation to personal anecdote.
- **Chapter Integrity:** Every chapter must have a beginning, a middle, and an end. Do not leave a sentence hanging across two chapters unless it is a deliberate cliffhanger.
- **Visual-Centric Summaries:** For each chapter, write a 2-3 sentence summary.
    - *Sentence 1:* The core conflict or key information delivered.
    - *Sentence 2:* The emotional arc (e.g., "Starts with confusion, ends in a breakthrough").
    - *Sentence 3:* Visual/Directorial cues (e.g., "Tighten the framing on the subject," "Dramatic low-key lighting").
- **ID Continuity:** Ensure every \`[ID]\` in the current transcript is accounted for. Start the first chapter with the first ID and end the last chapter with the last ID provided.

### Constraint Rules:
- You MUST only output a valid JSON array.
- No conversational filler, no introductory remarks, and no explanations.
- The first character of your response MUST be \`[\` and the last MUST be \`]\`.

### Output Schema (JSON):
[
  {
    "id_start": integer,
    "id_end": integer,
    "title": "String (Cinematic, evocative title)",
    "mood": "String (e.g., Suspenseful, Educational, Melancholic, High-Energy)",
    "summary": "String (Detailed narrative and visual guidance)"
  }
]

---
### DATA TO PROCESS:
**Previous Context:**
${previousContext}

**Current Transcript:**
${transcript}
`;

export const promptToSummaryChapterAnime = (transcript, previousContext) => `
### Role:
You are a Senior Anime Story Editor and Series Composition Writer (シリーズ構成). Your expertise lies in adapting raw transcripts into structured, emotionally resonant "Story Beat Sheets" optimized for Japanese animation-style video production — following the traditions of studios like Makoto Shinkai, Kyoto Animation, and Ghibli.

### Input Data:
1. **Previous Context:** A brief overview of the preceding narrative arc for continuity.
2. **Current Transcript:** A list of lines formatted as \`[ID] Text Content\`.

### Task Instructions:
- **Narrative Segmenting:** Group lines into "Chapters" based on classic anime episode structure — **Kishoutenketsu (起承転結)** or **3-Act Structure**. Look for shifts in:
    - **Emotional Beat:** When the speaker's emotional state shifts (e.g., despair → determination, curiosity → wonder).
    - **Scene Setting:** Transitions between locations — classroom, rooftop, festival, train station, etc.
    - **Thematic Pivot:** When the theme moves from conflict to reflection, or action to quiet introspection.
- **Chapter Integrity:** Each chapter must feel like a self-contained anime scene segment with a clear emotional arc — suitable for one looping background illustration.
- **Anime-Centric Summaries:** For each chapter, write a 2-3 sentence summary.
    - *Sentence 1:* The core information or emotional conflict being conveyed.
    - *Sentence 2:* The emotional arc (e.g., "Opens with nervous energy, resolves into quiet confidence").
    - *Sentence 3:* Visual/Directorial cues using anime cinematography language (e.g., "Slow pan across a sunlit classroom," "Close-up on hands trembling," "Wide shot of cherry blossoms falling").
- **ID Continuity:** Every \`[ID]\` must be accounted for. Start at the first ID and end at the last ID.

### Constraint Rules:
- Output MUST be a valid JSON array only.
- No conversational filler, no introductory remarks, no explanations.
- First character MUST be \`[\`, last MUST be \`]\`.

### Output Schema (JSON):
[
  {
    "id_start": integer,
    "id_end": integer,
    "title": "String (Poetic, anime-episode-style title — evocative, slightly melancholic or wondrous)",
    "mood": "String (e.g., Bittersweet, Determined, Nostalgic, Tense, Warm, Melancholic, Hopeful)",
    "summary": "String (Narrative arc, emotional journey, and anime visual direction)"
  }
]
---
### DATA TO PROCESS:
**Previous Context:**
${previousContext}

**Current Transcript:**
${transcript}
`;

export const promptToCreateVisualBible = summary => `
### Role:
You are a Senior Visual Concept Artist and World Builder for Cinematic Film Production. Your task is to synthesize chapter summaries into a comprehensive "Visual Bible" and a "Master Visual Anchor" (the one-frame storytelling image) optimized for a full-length video background.

### Task Instructions:
1. **Global Narrative Synthesis:** Analyze all chapter summaries to create a cohesive story overview and identify the overarching emotional tone.
2. **Character Design (The "Cref" System):** Identify all recurring characters. For each, create a strict "Physical Description Tag" including: Age, ethnicity, hair style/color, specific facial features, and a fixed outfit for the entire story.
3. **Visual Style Definition:** Define the "Cinematic" look. Must include lighting (moody, volumetric, or golden hour), color palette, and camera settings (35mm, wide-angle to capture the scene).
4. **Master Storytelling Prompt (The Visual Anchor):** Create one "Global Master Shot Prompt" that will serve as the background for the entire video. This prompt MUST be engineered with the following "Video-Centric" rules:
    - **Composition:** Use the Rule of Thirds. Place primary characters on the left or right third to leave "Negative Space" for subtitles/text on the opposing side or bottom.
    - **Depth of Field:** Deep depth of field to ensure both character and symbolic background elements are clear (f/8 or f/11 style).
    - **Symbolic Tableau:** The frame must be a "Narrative Tableau" – including a foreground element representing the start, the main characters in the center representing the conflict, and a background/atmospheric element representing the climax or resolution.
    - **Technical Optimization:** Specify 16:9 aspect ratio, 8k resolution, cinematic movie poster aesthetics, and "ultra-detailed textures" to prevent pixelation on large screens.
    - **Ambient Motion Prep:** Include atmospheric tags like "drifting dust particles," "volumetric light beams," or "mist" to facilitate adding simple overlays in post-production.

### Constraint Rules:
- Output MUST be a single, valid JSON object.
- Use descriptive, comma-separated tags for character features.
- STYLE: Must be "Cinematic Narrative Realism."
- Ensure the Master Prompt explicitly avoids "cluttered centers" to allow for readability of video subtitles.

### Output Schema (JSON):
{
  "story_overview": "String (Comprehensive summary)",
  "visual_config": {
    "cinematic_tags": "String (lighting, camera, color grade, mood, lens specs)",
    "negative_prompt": "String (avoid: text, watermark, blurry, deformed, cluttered center, low resolution)"
  },
  "characters": [
    {
      "name": "String",
      "role": "String",
      "physical_description_tags": "String (Age, ethnicity, hair, face, specific features)",
      "fixed_outfit": "String (Detailed description of the locked outfit)"
    }
  ],
  "master_background_prompt": "String (The ultimate cinematic tableau: 16:9, rule of thirds composition, negative space for subtitles, symbolic storytelling elements, volumetric lighting, high-detail texture)",
  "overall_mood": "String (Overall emotional vibe and color theory)"
}

---
### DATA TO PROCESS:
**Merged Chapter Summaries:**
${summary}
`;

export const promptToCreateVisualBibleAnime = summary => `
### Role:
You are a Senior Anime Art Director and Character Designer for a premium Japanese animation production. Your task is to synthesize chapter summaries into a comprehensive "Visual Bible" optimized for Japanese anime-style image generation — ensuring all outputs are safe, non-explicit, and compliant with content policies of all major AI image generators (Midjourney, DALL-E, Stable Diffusion).

### Task Instructions:
1. **Global Narrative Synthesis:** Analyze all chapter summaries to derive a cohesive story overview and overarching emotional tone.

2. **Anime Character Design (The "Cref" System):**
    - Identify all recurring characters.
    - For each character, define a locked "Character Sheet Tag" using anime-standard descriptors:
        - Age appearance (e.g., "teenage appearance," "young adult," "middle-aged")
        - Hair: color, length, style (e.g., "shoulder-length dark navy hair with side bangs")
        - Eyes: color and style (e.g., "large amber eyes with highlight reflections")
        - Build: (e.g., "slender build, average height")
        - Fixed outfit: school uniform, casual streetwear, traditional yukata — described in full detail
        - Expression tendency: (e.g., "usually wears a gentle closed-eye smile")
    - **Policy Rule:** All characters must visually read as 18+ unless the story explicitly requires otherwise and the context is strictly non-romantic/non-suggestive. Default to young adult depictions.

3. **Anime Visual Style Definition:** Define the anime art style. Must specify:
    - Art school (e.g., "Makoto Shinkai atmospheric realism," "Kyoto Animation soft moe," "Ghibli painterly warmth," "modern isekai bold line art")
    - Rendering technique (e.g., "cel-shaded with soft gradients," "watercolor background wash," "digital ink with glowing particle effects")
    - Color palette (e.g., "pastel blues and warm ambers," "deep indigo nights with neon accents")
    - Lighting style (e.g., "soft diffused window light," "golden hour rim lighting," "overcast ambient glow")

4. **Master Background Prompt (The Visual Anchor):**
    Create one "Global Master Background Prompt" for the video's primary background image with these rules:
    - **Composition:** Rule of Thirds. Characters on left/right third; center-bottom preserved for subtitles.
    - **Anime Safe Framing:** Characters in tasteful, neutral poses. No close-ups on body parts. Prefer medium-to-wide establishing shots.
    - **Symbolic Tableau:** Foreground = story's starting state (e.g., fallen petals, an open notebook). Midground = main character in a defining pose. Background = symbolic resolution (e.g., clearing sky, city lights, a distant mountain).
    - **Technical Specs:** 16:9 aspect ratio, ultra-detailed anime background art, cinematic composition, studio-quality illustration.
    - **Atmospheric Elements:** Include soft ambient elements (e.g., "floating sakura petals," "drifting fireflies," "light rays through leaves," "dust motes in morning light") for post-production overlay.
    - **Policy Compliance Tags:** Prompt must implicitly avoid any content that triggers safety filters — no weapons, no gore, no suggestive framing, no real-person likeness.

### Constraint Rules:
- Output MUST be a single valid JSON object.
- STYLE: Must be "Japanese Anime Illustration."
- All character ages must default to young adult (18+) visual appearance.
- Negative prompt must include standard policy-safety exclusions.
- Master prompt must be in English, optimized for AI image generators.

### Output Schema (JSON):
{
  "story_overview": "String (Comprehensive narrative summary)",
  "visual_config": {
    "anime_style_tags": "String (art school, rendering technique, color palette, lighting, mood — comma-separated)",
    "negative_prompt": "String (avoid: nsfw, explicit content, suggestive poses, revealing clothing, child-like features on adult characters, real person likeness, watermark, text, logo, blurry, deformed anatomy, extra limbs, cluttered composition, low quality, grainy)"
  },
  "characters": [
    {
      "name": "String",
      "role": "String (e.g., Protagonist, Mentor, Narrator)",
      "age_appearance": "String (e.g., young adult, mid-20s appearance)",
      "physical_description_tags": "String (hair color/style, eye color/style, build, skin tone, distinctive features)",
      "fixed_outfit": "String (Full outfit description — top, bottom, footwear, accessories)",
      "expression_tendency": "String (default facial expression and body language)"
    }
  ],
  "master_background_prompt": "String (Full anime-style image generation prompt: 16:9, rule of thirds, subtitle-safe composition, symbolic tableau, atmospheric elements, style tags, policy-compliant)",
  "overall_mood": "String (Emotional tone, color theory, and thematic atmosphere of the full video)"
}
---
### DATA TO PROCESS:
**Merged Chapter Summaries:**
${summary}
`;

export const promptToCreateSceneFromChapter = ({ previousSceneContext, visualBible, chapterData, transcriptLines }) => `
### Role:
You are an Expert Cinematographer and AI Prompt Engineer. Your task is to divide a Chapter's transcript into the MINIMUM number of visual scenes and generate high-quality Cinematic prompts for each.

### Inputs:
1. **Visual Bible (from Step 2):** Includes character physical tags, global style, and visual mood.
2. **Chapter Data (from Step 1):** Title, Summary, and the specific transcript lines formatted as \`[ID] Text\`.
3. **Previous Scene Context:** Brief info on how the last scene ended (if available).

### Scene Partitioning Logic (STRICT):
- **Background Consistency:** You MUST group consecutive IDs into a single scene if they occur in the same location or environment. 
- **Efficiency:** Do not create a new scene for minor dialogue changes. Only trigger a new scene/prompt if there is a shift in:
    1. Physical Location (e.g., House to Street).
    2. Significant Time Jump (e.g., Day to Night).
    3. Major Change in Visual Context (e.g., A calm conversation turning into a chaotic fight involving new objects).
- Aim for the longest possible duration per image to save generation tokens.

### Prompt Construction Formula:
Each \`final_prompt\` must follow this structure:
\`[Global Style Tags], [Specific Character Tags from Bible], [Action/Pose of characters], [Detailed Environment/Background], [Lighting & Camera Angle (e.g., Wide shot, Eye level)] --ar 16:9\`

### Constraint Rules:
- Output MUST be a valid JSON array of objects.
- Ensure 100% coverage of all transcript IDs provided.
- The \`final_prompt\` must be in English for compatibility with image generators.
- No conversational text or explanations outside the code block.

### OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

### Output Schema (JSON):
[
  {
    "start_index": integer,
    "end_index": integer,
    "location_setting": "String (e.g., Grocery Store - Interior)",
    "visual_description": "String (Internal reasoning for the scene look)",
    "final_prompt": "String (The ready-to-use image generation prompt)"
  }
]

---
### DATA TO PROCESS:
**Visual Bible:**
${visualBible}

**Chapter Content:**
Title: ${chapterData.title}
Summary: ${chapterData.summary}
Transcript:
${transcriptLines}

**Previous Scene End-State:**
${previousSceneContext}
`;

export const promptToCreateSceneFromChapterAnime = ({ previousChapterContext, visualBible, chapterData, transcriptLines }) => `
### Role:
You are an Expert Anime Storyboard Artist and AI Image Prompt Engineer specializing in Japanese animation aesthetics. Your task is to divide a Chapter's transcript into the MINIMUM number of visual scenes and craft policy-compliant, high-quality anime image generation prompts for each scene.

### Inputs:
1. **Visual Bible (Step 2):** Character physical tags, locked outfits, global anime style, and mood.
2. **Chapter Data (Step 1):** Title, summary, mood, and transcript lines formatted as \`[ID] Text\`.
3. **Previous Chapter Context (JSON):** Context of the chapter immediately before the current one (for narrative & visual continuity). Schema:
\`\`\`
{
  "last_chapter_title": "String",
  "last_chapter_mood": "String",
  "last_characters_present": ["String — role_labels"],
  "last_chapter_summary": "String — the visual scene description from the previous chapter summary, describes the dominant visual state at chapter end"
}
\`\`\`
If the current chapter is the first one, this field will be \`null\`.

### Scene Partitioning Logic (STRICT):
- **Background Consistency:** Group consecutive IDs into ONE scene if they share the same location or visual context.
- **Efficiency First:** Do NOT create a new scene for minor dialogue. Only trigger a new scene when there is a clear shift in:
    1. **Physical Location** (e.g., classroom → rooftop → train station)
    2. **Time of Day / Weather** (e.g., golden dusk → night sky → rainy morning)
    3. **Major Visual Context Shift** (e.g., quiet study session → outdoor festival crowd)
- Maximize scene duration per image to minimize total image generation count.
- Aim for **wide / medium-wide establishing shots** as the default framing — these are the safest and most visually rich for anime backgrounds.

### Prompt Construction Formula:
Each \`final_prompt\` MUST follow this exact structure:

\`[Anime Style Tags from Visual Bible], [Character Name: physical tags + fixed outfit + current pose/action], [Detailed Background/Environment in anime illustration style], [Lighting & Atmosphere], [Camera Angle — default: medium-wide shot], [Safety Tags], --ar 16:9\`

### Policy Compliance Rules (MANDATORY):
- ALL prompts must be suitable for general audiences.
- Default character pose: standing, sitting, walking, or looking — neutral and contextually appropriate.
- NO prompts implying: violence, weapons, blood, suggestive content, romantic physical contact, or ambiguous age.
- Prefer environmental/atmospheric shots when the transcript content is abstract or conceptual.
- If a scene is emotionally intense (grief, fear, anger), express it through **environment and lighting** (e.g., stormy sky, dim lighting, falling leaves) NOT through character distress poses.
- Always append at the end of each final_prompt: \`safe for all audiences, family-friendly, no nsfw\`

### Constraint Rules:
- Output MUST be a valid JSON array.
- 100% coverage of all transcript IDs provided.
- \`final_prompt\` must be in English.
- No explanatory text outside the code block.

### OUTPUT FORMAT (STRICT):
* Wrap entire output in a single Markdown code block using triple backticks (\`\`\`)
* Nothing before or after the code block
* First character: \`\`\`  |  Last character: \`\`\`

### Output Schema (JSON):
[
  {
    "start_index": integer,
    "end_index": integer,
    "location_setting": "String (e.g., High School Rooftop — Late Afternoon)",
    "visual_description": "String (Internal reasoning: what makes this scene visually distinct, what emotion to convey)",
    "final_prompt": "String (Complete, ready-to-use anime image generation prompt — policy-compliant, English)"
  }
]
---
### DATA TO PROCESS:
**Visual Bible:**
${visualBible}

**Chapter Content:**
Title: ${chapterData.title}
Summary: ${chapterData.summary}
Mood: ${chapterData.mood}
Transcript:
${transcriptLines}

**Previous Chapter Context (JSON):**
${previousChapterContext ? JSON.stringify(previousChapterContext, null, 2) : 'null'}
`;

export const promptToCreateChapterPromptImage = ({ visualBible, chapterData, transcriptLines }) => `
### Role:
You are a Senior Visual Director for a Minimalist Cinematic Storytelling Channel. Your task is to generate ONE "Master Image Prompt" that encapsulates the entire mood, location, and core conflict of a story chapter.

### Input:
1. **Visual Bible (Step 2):** To maintain character and style consistency.
2. **Chapter Summary & Title (Step 1):** To understand the core theme.
3. **Full Chapter Transcript:** To identify the most recurring setting and the main character's emotional state.

### Task:
Analyze the chapter and create a "Wide-Angle Cinematic Master Shot". This image must be:
- **Environment-focused:** High detail on the background so it remains interesting for 3-5 minutes of screen time.
- **Symbolic:** Capturing the "Key Action" or the "Key Emotion" of the chapter in a single frame.
- **Post-Production Friendly:** Composed in a way that allows for digital panning and zooming (no essential details at the very edges of the frame).

### Constraint Rules:
- Return ONLY a valid JSON object.
- The \`final_prompt\` must be in English and use high-end cinematic terminology.
- No explanations or conversational text.

### OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

### Output Schema (JSON):
{
  "chapter_id": integer,
  "representative_location": "String",
  "dominant_emotion": "String",
  "visual_reasoning": "String (Why this specific moment was chosen to represent the whole chapter)",
  "final_prompt": "String (The high-detail cinematic prompt) --ar 16:9"
}

---
### DATA TO PROCESS:
**Visual Bible:**
${visualBible}

**Chapter Context:**
Title: ${chapterData.title}
Summary: ${chapterData.summary}

**Full Transcript:**
${transcriptLines}
`;

export const promptToCreateTextForThumbnail = (title, summary) => `
You are a top-performing Japanese YouTube thumbnail copywriter and thumbnail design planner.

Your task is to convert a Japanese video title and summary into a production-ready JSON spec for an automated thumbnail renderer.

The thumbnail will be rendered by code.
Therefore, your output must be stable, structured, and easy to consume programmatically.

The final thumbnail format:
- Canvas: 1280x720
- Full-text Japanese drama thumbnail
- Exactly 5 Japanese text lines
- L1-L4 will use the same font size in code
- L5 will be the biggest punch line in code
- Do not decide exact font sizes
- Text is rendered on top of one unified cinematic background
- Do NOT create a separate flat color panel behind the text
- The text area may use only a dark transparent gradient overlay for readability

━━━━━━━━━━━━━━━━━━━━
LANGUAGE RULE
━━━━━━━━━━━━━━━━━━━━

- Values inside "thumbnail_copy" must be Japanese.
- All other fields must be English.
- Do not write Japanese outside "thumbnail_copy".

━━━━━━━━━━━━━━━━━━━━
FACT SAFETY RULES
━━━━━━━━━━━━━━━━━━━━

Use only facts supported by the title or summary.

NEVER invent:
- numbers
- money amounts
- names
- dates
- DNA results
- legal outcomes
- pregnancy results
- crimes
- relationship details
- locations not present in the input

If the summary does not contain a number, do not create one.
If the summary contains only suspicion, use suspicion wording.
Do not turn suspicion into confirmed fact.

Good:
妊娠詐称疑惑
SNSでホスト通いが発覚
歌舞伎町の裏関係が浮上

Bad:
DNA鑑定で嘘確定
慰謝料500万円
ホストに300万貢いだ

━━━━━━━━━━━━━━━━━━━━
NICHE DETECTION
━━━━━━━━━━━━━━━━━━━━

Choose one niche internally and output it in English:

REVENGE_SUKATTO
FAMILY_DRAMA
ROMANCE_BETRAYAL
POVERTY_STRUGGLE
HORROR_GHOST
MYSTERY_URBAN
TRUE_CRIME
WORKPLACE_DRAMA
PARENTING
INHERITANCE
ILLNESS_SACRIFICE
CONFESSION
HEARTWARMING

━━━━━━━━━━━━━━━━━━━━
COPY STRUCTURE
━━━━━━━━━━━━━━━━━━━━

Create exactly 5 Japanese lines.

IMPORTANT LENGTH RULE:
- L1, L2, L3, L4 must each be 13–21 Japanese full-width characters.
- L5 must be 8–16 Japanese full-width characters.
- Do not make L1–L4 too short.
- Avoid overly long lines that become hard to read on mobile.
- Japanese does not use spaces like English, so count visual Japanese characters, not words.

L1 — SETUP
- Normal situation before the collapse
- Include a clear character if possible
- Must be 13–21 Japanese full-width characters

L2 — TRIGGER
- The event where the problem begins
- Clear action or incident
- Must be 13–21 Japanese full-width characters

L3 — EVIDENCE / SHOCK
- The most concrete shocking evidence
- Must use specific nouns from the summary
- No generic phrases
- Must be 13–21 Japanese full-width characters

L4 — CONFLICT / ACCUSATION
- Emotional confrontation, accusation, denial, or suspicion
- Dialogue is allowed but not required
- If using dialogue, keep it visually balanced
- Must be 13–21 Japanese full-width characters

L5 — FINAL PUNCH / TWIST
- Biggest and strongest line
- Clear twist, downfall, betrayal, or outcome
- No question-only cliffhanger
- Must be 8–16 Japanese full-width characters
- Must be visually punchy and stronger than L1-L4

━━━━━━━━━━━━━━━━━━━━
FORBIDDEN JAPANESE PHRASES
━━━━━━━━━━━━━━━━━━━━

Do not use vague generic phrases such as:
- 衝撃の事実
- 信じられない真相
- まさかの展開
- 驚きの結果
- ヤバすぎる
- とんでもない
- その結末は
- どうなるのか

━━━━━━━━━━━━━━━━━━━━
COLOR STRATEGY
━━━━━━━━━━━━━━━━━━━━

Return fill color, stroke color, and shadow color for every line.

General rules:
- L1 = setup anchor color
- L2 = white
- L3 = strongest evidence/shock color
- L4 = white
- L5 = final punch color
- L3 and L5 must be the most eye-catching lines
- L5 may match L3 if it strengthens the final punch
- Avoid low contrast with the background

Recommended fill colors:
- Betrayal / anger: #FF2D2D
- Money / gain: #FFD700
- Money loss / debt: #FFB300
- Horror / fear: #FF0033
- Crime / psychological: #8A2BE2
- Mystery: #66CCFF
- Emotional / romance: #FF1493
- Setup anchor: #FFD700
- White line: #FFFFFF

Stroke rules:
- White fill → black stroke
- Yellow fill → black stroke
- Red fill → white stroke and black shadow
- Pink fill → black stroke
- Cyan fill → black stroke
- Purple fill → white or black stroke depending on contrast

━━━━━━━━━━━━━━━━━━━━
BACKGROUND STRATEGY
━━━━━━━━━━━━━━━━━━━━

Return a unified cinematic background color strategy.

The background must support the story mood and text readability.

Important:
- The left text area and right visual area must share the same background atmosphere.
- Do not create a separate solid color background for the text.
- Use a transparent dark gradient overlay behind text only if needed.

Background categories:
- Romance betrayal drama: dark red, purple, black, magenta accents
- Family drama: navy, dark purple, warm yellow accents
- Revenge / sukakto: black, gold, crimson
- Horror / mystery: black, blue, green, red
- Workplace drama: dark blue, orange, gray
- Poverty struggle: dark brown, navy, muted gold
- Heartwarming: warm orange, soft gold, dark brown

━━━━━━━━━━━━━━━━━━━━
LAYOUT CONTRACT FOR CODE
━━━━━━━━━━━━━━━━━━━━

Output layout metadata for the renderer:
- Text side: left
- Visual/emotional image side: right
- Text block should occupy about 45% of canvas width
- Visual side should occupy about 55% of canvas width
- L1-L4 are upper text lines
- L5 is punch line
- L3 is shock line

Do not output exact font sizes.

━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━

Output ONLY valid JSON.
Wrap in one markdown code block.
No explanation.

{
  "niche": "",
  "emotion": {
    "primary": "",
    "secondary": ""
  },
  "thumbnail_copy": {
    "L1": "",
    "L2": "",
    "L3": "",
    "L4": "",
    "L5": ""
  },
  "text_styles": {
    "L1": {
      "fill": "",
      "stroke": "",
      "stroke_width_role": "normal",
      "shadow": "#000000"
    },
    "L2": {
      "fill": "#FFFFFF",
      "stroke": "#000000",
      "stroke_width_role": "normal",
      "shadow": "#000000"
    },
    "L3": {
      "fill": "",
      "stroke": "",
      "stroke_width_role": "shock",
      "shadow": "#000000"
    },
    "L4": {
      "fill": "#FFFFFF",
      "stroke": "#000000",
      "stroke_width_role": "normal",
      "shadow": "#000000"
    },
    "L5": {
      "fill": "",
      "stroke": "",
      "stroke_width_role": "punch",
      "shadow": "#000000"
    }
  },
  "background": {
    "base_from": "",
    "base_to": "",
    "accent_color": "",
    "mood": "",
    "text_area_treatment": "same unified background continues under text with transparent dark gradient overlay only",
    "vignette": true
  },
  "layout": {
    "canvas": "1280x720",
    "text_side": "left",
    "visual_side": "right",
    "text_width_ratio": 0.45,
    "visual_width_ratio": 0.55,
    "upper_lines": ["L1", "L2", "L3", "L4"],
    "punch_line": "L5",
    "shock_line": "L3",
    "mobile_readability_required": true
  },
  "validation": {
    "L1_to_L4_are_13_to_21_japanese_chars": true,
    "L5_is_8_to_16_japanese_chars": true,
    "all_thumbnail_copy_is_japanese": true,
    "no_japanese_outside_thumbnail_copy": true,
    "no_invented_facts": true,
    "no_generic_phrase": true,
    "L5_is_strongest": true
  }
}

━━━━━━━━━━━━━━━━━━━━
USER INPUT
━━━━━━━━━━━━━━━━━━━━

Title: ${title}

Summary:
${summary}
`;

export const promptToDetectNiche = (headTranscript, tailTranscript) => `
You are a Content Niche Analyst specializing in Japanese video content classification.
Your only job is to read a sample of a transcript and determine:
(1) The primary niche/genre of the video.
(2) The overall narrative tone.
 
This output will be used as a locked Global Context for all downstream processing.
Once you output this, the niche will NOT be re-evaluated.
 
 
### Input:
You will receive two samples from a long transcript:
- HEAD: The first transcript tokens (opening of the video).
- TAIL: The last transcript tokens (ending of the video).
 
This is intentionally incomplete — you are making a global inference, not a full analysis.
 
 
### Niche Reference List:
Choose ONE primary niche from this list. Use the EXACT key shown.
 
  REVENGE_SUKATTO     → 仕返し・スカッと系 (e.g., satisfying payback, comeuppance)
  FAMILY_DRAMA        → 嫁姑・兄弟・親族トラブル (e.g., in-law conflict, sibling rivalry)
  ROMANCE_BETRAYAL    → 浮気・別れ・再会 (e.g., affair, heartbreak, love triangle)
  POVERTY_STRUGGLE    → 貧困・借金・生活苦 (e.g., debt, financial crisis)
  HORROR_GHOST        → 怪談・心霊・恐怖 (e.g., ghost story, supernatural horror)
  MYSTERY_URBAN       → 都市伝説・謎・不思議 (e.g., urban legend, unexplained events)
  TRUE_CRIME          → 詐欺・犯罪・事件 (e.g., fraud, crime investigation, missing person)
  WORKPLACE_DRAMA     → パワハラ・解雇・職場いじめ (e.g., power harassment, unfair dismissal)
  PARENTING           → 子育て・反抗期・育児失敗 (e.g., rebellious child, parenting regret)
  INHERITANCE         → 遺産・相続・財産トラブル (e.g., contested will, family asset dispute)
  ILLNESS_SACRIFICE   → 病気・介護・自己犠牲 (e.g., caretaking, silent suffering, illness)
  CONFESSION          → 告白・秘密・暴露 (e.g., revealing a long-held secret)
  HEARTWARMING        → 感動・再生・救い (e.g., redemption, unexpected kindness)
 
 
### Constraint Rules:
- "tone" must be 1–3 words only.
  Examples: "Emotional, Tense" / "Bitter, Suspenseful" / "Warm, Tearful" / "Cold, Eerie"
- "confidence": "high" if HEAD and TAIL align on niche; "low" if they suggest different niches.
- If confidence is "low", set "niche_note" explaining the conflict.
- "niche_sub" is optional. Use it for meaningful specificity only (e.g., "母親との確執" not just "conflict").
 
 
### OUTPUT FORMAT (STRICT)
 
* Wrap the entire output in a single Markdown code block (triple backticks)
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`
* Do NOT write anything before or after the code block
* Inside the code block: valid JSON only, no comments
 
 
### Output Schema (JSON):
{
  "global_niche": "String — EXACT niche key from the list above",
  "niche_sub": "String or null — specific sub-theme in Japanese if applicable",
  "tone": "String — 1–3 words",
}
 
 
### DATA TO PROCESS:
 
HEAD:
${headTranscript}
 
TAIL:
${tailTranscript}
`;

export const promptToCreateChapter = ({ globalNiche, transcript, previousContext }) => `
### Role:
You are a Senior Narrative Architect and Visual Story Analyst.
Your expertise lies in:
(1) Segmenting transcripts into structured chapters that serve both storytelling and image generation.
(2) Writing visual-first summaries that will be used downstream to create a Visual Bible and AI-generated scene images.

Your output feeds directly into an image generation pipeline — every summary you write must describe
scenes as if briefing a visual artist, not a film editor.

---

### Input Data:
1. **Global Niche:**
   The niche identified of the video .

1. **Previous Context:**
   A brief overview of the preceding narrative arc to ensure seamless continuity.

2. **Current Transcript:**
   A list of lines formatted as \`[ID] Text Content\`.

---

### Phase 1 — Chapter Segmentation:

**Segmentation triggers — create a new chapter when:**
  - The speaker's/character's objective changes (what they want to achieve shifts).
  - A hard cut in location or time occurs within the narrative.
  - A significant emotional tone shift occurs (e.g., tension → resolution, grief → anger).
  - A new topic or concept begins (for non-drama content).

**Structure rule:**
  Apply the Story Circle / 3-Act Structure ONLY IF content is clearly narrative/dramatic.
  For conversational, educational, or monologue content — use topic-based segmentation.
  // Do NOT force dramatic structure onto non-dramatic content.

**Chapter integrity:**
  - Every chapter must have a clear beginning, middle, and end.
  - Do not split a sentence across two chapters unless it is a deliberate cliffhanger.
  - Ensure every [ID] in the transcript is accounted for.
  - Start chapter 1 with the first ID; end the last chapter with the last ID.

---

### Phase 2 — Visual-First Summary Writing:

For each chapter, write a summary with EXACTLY 3 sentences.
This summary feeds into an AI image generation pipeline — write it for a visual artist, NOT a film editor.
Do NOT use camera or editing language (e.g., "tighten the framing," "cut to," "low-key lighting").

**Sentence 1 — Narrative Core:**
  What is the key event, conflict, or information delivered in this chapter?
  Focus on WHAT HAPPENS, not how it is filmed.

**Sentence 2 — Emotional Arc:**
  What is the emotional journey of the main character(s)?
  State the starting emotion and ending emotion.
  // Example: "Opens with suppressed resentment; ends in open confrontation and tears."

**Sentence 3 — Visual Scene Description (CRITICAL for image gen):**
  Describe the dominant visual as a STILL IMAGE for an illustrator.
  Must include:
  - WHO is present (use names/roles from characters_present)
  - WHERE they are (location, environment, setting details)
  - WHAT they are physically doing
  - Their emotional state via body language and facial expression
  // GOOD: "A middle-aged woman stands in a dimly lit kitchen, arms crossed and jaw tight,
  //        staring down at a younger woman who sits hunched at the table, eyes red from crying."
  // BAD:  "Tighten the framing on the subject for a dramatic effect."

---

### Constraint Rules:
- Output MUST be a JSON array containing ONE object per chapter.
- Objects are separated by commas. Do NOT merge multiple chapters into one object.
- A transcript with N chapters produces exactly N objects in the array.
- All string values must be in the same language as the transcript.
- "characters_present" must use ROLES or NAMES — never pronouns (he/she/they).

---

### OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

---

### Output Schema (JSON):
[
  {
    "id_start": integer,
    "id_end": integer,
    "title": "String — evocative, niche-appropriate chapter title",
    "mood": "String — e.g. 'Tense', 'Melancholic', 'Hopeful', 'Explosive'",
    "characters_present": ["String — role or name of each character present"],
    "location": "String — specific location, e.g. 'Traditional Japanese kitchen — interior, late afternoon'",
    "location_time": "daytime | evening | night | unknown", // optional
    "summary": "String — 3-sentence visual-first summary: (1) narrative core, (2) emotional arc, (3) still image scene description"
  },
  {
    "id_start": integer,
    "id_end": integer,
    "title": "String — evocative, niche-appropriate chapter title",
    "mood": "String — e.g. 'Tense', 'Melancholic', 'Hopeful', 'Explosive'",
    "characters_present": ["String — role or name of each character present"],
    "location": "String — specific location, e.g. 'Traditional Japanese kitchen — interior, late afternoon'",
    "location_time": "daytime | evening | night | unknown", // optional
    "summary": "String — 3-sentence visual-first summary: (1) narrative core, (2) emotional arc, (3) still image scene description"
  }
]

---
### DATA TO PROCESS:

**Global Niche:**
${globalNiche}

**Previous Context:**
${previousContext}

**Current Transcript:**
${transcript}
`;

export const promptToCreateGlobalVisualBible = ({ globalNiche, summary }) => `
### Role:
You are a Senior Visual Concept Artist specializing in Japanese-style cinematic storytelling for social video production.
Your task is to synthesize all inputs into a comprehensive "Visual Bible" that will serve as the single source of truth for all downstream AI image generation in this video.

Every decision you make — character design, color palette, lighting, composition — must be:
(1) Consistent with the detected niche and emotional tone from prior analysis.
(2) Optimized for Japanese dramatic visual aesthetics (warm domestic interiors, restrained color, emotionally expressive faces).
(3) Structured so that Bước 3 (Scene Prompt Generator) can directly reuse each field without reinterpretation.

---

### Input Data:
1. **Global Context (from Pre-pass):**
   JSON containing: global_niche, niche_sub, tone, global_characters[]

2. **Chapter Outputs (from Bước 1, all chunks merged):**
   JSON array of all chapters, each containing: title, mood, characters_present[], summary

---

### Phase 1 — Global Narrative Synthesis:

Read ALL chapter summaries in order. Then write:
- A cohesive story overview (3–5 sentences covering beginning, escalation, climax, resolution).
- The overarching emotional arc (e.g., "Begins with quiet suppression, escalates to open conflict, resolves in painful silence").
- The dominant visual metaphor for the story (e.g., "A crumbling household facade" / "A dinner table that becomes a battlefield").

---

### Phase 2 — Narrative POV Definition:

Identify how the story is told visually:
- "third_person_omniscient" → Camera observes all characters equally. Wide and medium shots dominate.
- "third_person_limited"    → Camera follows one protagonist. Other characters seen through their reactions.
- "fly_on_the_wall"         → No camera awareness. Scenes feel like hidden observation. No eye contact with camera.
- "narrator_voiceover"      → Scenes are illustrative tableaux. Characters frozen in emotional peaks.

This POV will determine camera angle and framing rules for ALL scene prompts in Bước 3.

---

### Phase 3 — Visual Style Definition:

DO NOT hard-code a style. Derive the visual style from global_niche and tone.

**Style mapping rules:**
- Family Drama / Romance Drama →
    Base style: "Japanese domestic realism, warm amber and muted teal palette, soft window light, shallow depth of field on faces, Hirokazu Koreeda cinematography aesthetic"
- True Crime →
    Base style: "Japanese noir, desaturated blue-grey palette, harsh overhead fluorescent or single-source lamp, deep shadows, Takashi Miike tension aesthetic"
- Self-Improvement / Educational →
    Base style: "Clean Japanese minimalism, soft diffused daylight, off-white and sage palette, uncluttered backgrounds, Muji aesthetic"
- Spiritual / Wellness →
    Base style: "Zen naturalism, dappled forest light, muted earth tones, morning mist, Studio Ghibli environmental stillness"
- Comedy / Entertainment →
    Base style: "Bright and saturated, high-key lighting, vivid accent colors, expressive staging"

Then define:
- Lighting setup (primary + fill + atmospheric element)
- Color palette (max 4 hex codes or named Japanese color terms: e.g., 'Iro-cha', 'Hanaba', 'Mizu')
- Texture quality tags (for image gen resolution)
- What this style explicitly AVOIDS (niche-specific, not boilerplate)

---

### Phase 4 — Character Design (Full Visual Bible per Character):

For EVERY character in globalContext.global_characters[], create a complete visual profile.
If a character appears in chapters but is missing from globalContext, add them with prefix "DISCOVERED:".

**For each character, define ALL of the following. Be maximally specific — vague descriptions cause inconsistent renders:**

#### 4.1 — Identity & Role
- role_label: Their narrative function (e.g., "Antagonist Mother-in-law", "Passive Husband")
- screen_name: Name as it appears in the story (null if unnamed)
- narrative_importance: "primary" | "secondary" | "background"

#### 4.2 — Physical Anchor Tags (used in EVERY prompt featuring this character)
These must be copy-pasteable directly into an image gen prompt:
- age_appearance: Exact visual age range (e.g., "appears mid-50s")
- ethnicity_tags: "Japanese woman" / "Japanese man" — always include nationality
- face_shape: (e.g., "soft oval face", "square jaw", "delicate pointed chin")
- eye_description: Shape + size + expression default (e.g., "narrow almond eyes, heavy upper lids, perpetually disapproving gaze")
- eyebrow_style: (e.g., "straight thick brows, slightly furrowed", "thin arched brows")
- nose: (e.g., "small flat nose with wide nostrils", "sharp aquiline nose")
- mouth_lips: (e.g., "thin lips, downturned at corners", "full lips, slightly parted")
- skin_tone: Use specific descriptor (e.g., "pale porcelain skin with slight rosiness at cheeks", "warm golden-beige skin, sun-weathered texture")
- hair_style: Cut + length + texture (e.g., "blunt-cut black bob, chin-length, slight inward curl at ends")
- hair_color: Specific (e.g., "natural black with faint grey at temples", "dyed dark chestnut brown")
- build_height: Relative descriptor (e.g., "petite, slender frame, slightly hunched posture", "tall and broad-shouldered, commanding presence")
- posture_default: Their resting posture when neutral (e.g., "arms often crossed, weight shifted to one hip", "sits with perfect straight back, hands folded on lap")

#### 4.3 — Fixed Outfit (Locked for entire story — DO NOT change between scenes)
- outfit_top: Fabric + cut + color + detail (e.g., "pale grey cotton turtleneck, slim fit, slightly worn at elbows")
- outfit_bottom: (e.g., "high-waisted dark navy wide-leg trousers, pressed crease down center")
- outfit_footwear: (e.g., "indoor house slippers, beige, slightly flattened from wear")
- outfit_accessories: (e.g., "thin gold wedding band on left ring finger, no other jewelry", "small pearl stud earrings")
- outfit_layering: Any outer layer (e.g., "beige linen apron worn over top when in kitchen")
- outfit_color_palette: 2–3 dominant colors of their outfit (for color harmony checking)

#### 4.4 — Signature Visual Markers (identity consistency across scenes)
These are the 2–3 most distinctive things about this character that must appear in EVERY scene:
- signature_markers: Array of 2–3 items (e.g., ["always holds a ceramic tea cup", "has a small mole above right lip", "wears reading glasses pushed up on forehead"])

#### 4.5 — Emotional Expression Range
Define how this character looks at 3 emotional states (image gen needs this to render correctly):
- expression_neutral: (e.g., "flat mouth, eyes slightly narrowed, jaw slightly tense")
- expression_angry: (e.g., "nostrils flared, eyes wide and hard, lips pressed into thin line, neck veins faintly visible")
- expression_sad_or_vulnerable: (e.g., "eyes downcast, shoulders dropped, mouth slightly trembling, hands clasped tightly")

#### 4.6 — Do-Not-Change List (hard constraints for Bước 3)
- do_not_change: Array of absolute constraints (e.g., ["hair length and style", "mole above right lip", "wedding ring", "turtleneck collar"])
These fields are injected into Bước 3 as negative constraints — if a scene prompt changes these, it is invalid.

#### 4.7 — Prompt-Ready Anchor String
Compile all physical tags into ONE copy-paste string for direct use in image gen:
- anchor_prompt_string: "Japanese woman, appears mid-50s, soft oval face, narrow almond eyes with heavy upper lids, straight thick furrowed brows, small flat nose, thin downturned lips, pale porcelain skin, blunt-cut black bob with grey at temples, petite slightly hunched frame, pale grey cotton turtleneck, dark navy wide-leg trousers, beige house slippers, thin gold wedding band, small mole above right lip"

---

### Phase 5 — Master Background Prompt (3-Layer Structure):

The master prompt is split into 3 layers so Bước 3 can mix-and-match:

**Layer 1 — Style Base (NEVER changes across any scene):**
Visual style tags, color grade, texture quality, aspect ratio, resolution.
Format: comma-separated tags, directly injectable into any image gen prompt.

**Layer 2 — Environment Base (changes only when location changes):**
The primary setting of the video. Include:
- Location description (interior/exterior, specific room or place)
- Architectural/environmental details specific to Japanese setting
- Atmospheric elements (light source, time of day, weather if exterior)
- Props and environmental storytelling elements present in background
Format: descriptive paragraph written as image gen prompt.

**Layer 3 — Scene Variables Template (replaced per scene in Bước 3):**
A template showing WHAT Bước 3 should replace:
- [CHARACTER_POSITIONS]: who stands/sits where
- [EMOTIONAL_STATE]: which expression variant from 4.5
- [ACTION]: what characters are physically doing
- [LIGHTING_MODIFIER]: any scene-specific light adjustment
- [FOREGROUND_ELEMENT]: optional foreground prop for depth

**Composition rules (apply to ALL scenes):**
- Rule of Thirds: characters placed left or right third, never dead center
- Negative space: bottom 20% and/or right/left third kept clean for subtitles
- Avoid cluttered center composition
- Depth: always include foreground element + midground characters + background detail

**Full Master Shot Prompt:**
Combine all 3 layers into one assembled master prompt as a reference example.
This is the thumbnail/cover image for the entire video.

---

### Phase 6 — Negative Prompt (Niche-Specific):

Generate a negative prompt tailored to Japanese drama video content.
DO NOT use generic boilerplate. Include:
- Style violations (e.g., "anime style, cartoon, western facial features, CGI render")
- Consistency violations (e.g., "multiple faces on one character, extra limbs, morphed features")
- Composition violations (e.g., "cluttered subtitle area, text overlay, watermark")
- Lighting violations specific to chosen style (e.g., "overexposed highlights, studio flash lighting, neon colors")
- Cultural inconsistency tags (e.g., "non-Japanese interior design, western-style furniture unless specified")

---

### Constraint Rules:
- All descriptions must be written in English (for image gen compatibility).
- anchor_prompt_string for each character must be self-contained — no references to other fields.
- do_not_change arrays must have minimum 4 items per character.
- signature_markers must have exactly 2–3 items per character.
- Layer 1 style_base must be usable as a standalone prefix for any image gen prompt.
- master_full_prompt must be 150–250 words — detailed enough for image gen, not so long it dilutes signal.

---

### OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

---

### Output Schema (JSON):
{
  "story_overview": "String — 3–5 sentence cohesive narrative summary",
  "emotional_arc": "String — overarching emotional journey of the story",
  "visual_metaphor": "String — the dominant visual symbol representing the whole story",
  "narrative_pov": "third_person_omniscient | third_person_limited | fly_on_the_wall | narrator_voiceover",

  "visual_style": {
    "style_name": "String — named style derived from niche",
    "lighting_setup": "String — primary light + fill + atmospheric element",
    "color_palette": ["String — max 4 colors, specific names or hex"],
    "texture_tags": "String — resolution and quality tags for image gen",
    "style_avoids": "String — niche-specific things this style must never include"
  },

  "characters": [
    {
      "role_label": "String",
      "screen_name": "String or null",
      "narrative_importance": "primary | secondary | background",
      "physical": {
        "age_appearance": "String",
        "ethnicity_tags": "String",
        "face_shape": "String",
        "eye_description": "String",
        "eyebrow_style": "String",
        "nose": "String",
        "mouth_lips": "String",
        "skin_tone": "String",
        "hair_style": "String",
        "hair_color": "String",
        "build_height": "String",
        "posture_default": "String"
      },
      "outfit": {
        "outfit_top": "String",
        "outfit_bottom": "String",
        "outfit_footwear": "String",
        "outfit_accessories": "String",
        "outfit_layering": "String or null",
        "outfit_color_palette": ["String"]
      },
      "signature_markers": ["String — exactly 2–3 items"],
      "expressions": {
        "expression_neutral": "String",
        "expression_angry": "String",
        "expression_sad_or_vulnerable": "String"
      },
      "do_not_change": ["String — minimum 4 hard constraints"],
      "anchor_prompt_string": "String — full copy-paste ready tag string for image gen"
    }
  ],

  "master_background_prompt": {
    "style_base": "String — Layer 1: style/quality tags, never changes",
    "environment_base": "String — Layer 2: primary setting description",
    "scene_variables_template": {
      "CHARACTER_POSITIONS": "String — placeholder description",
      "EMOTIONAL_STATE": "String — placeholder",
      "ACTION": "String — placeholder",
      "LIGHTING_MODIFIER": "String — placeholder",
      "FOREGROUND_ELEMENT": "String — placeholder"
    },
    "master_full_prompt": "String — 150–250 words, assembled master shot for cover/thumbnail"
  },

  "negative_prompt": "String — niche-specific, minimum 20 tags, comma-separated"
}

---
### DATA TO PROCESS:

**Global Context (from Pre-pass):**
${globalNiche}

**Chapter Outputs (from Bước 1, all chunks merged):**
${summary}
`;

export const promptToCreateSceneInChapter = ({ visualBible, chapterData, previousChapterContext }) => `
### Role:
You are an Expert Cinematographer and AI Image Prompt Engineer specializing in Japanese cinematic video production.

Your task is to analyze one chapter at a time and:
(1) Partition the chapter into the MINIMUM number of visually distinct scenes.
(2) Build a final_prompt for each scene by assembling layers from the Visual Bible — never inventing style or character descriptions from scratch.
(3) Ensure every scene prompt is immediately usable in Midjourney, Flux, or SDXL without any post-processing.

Your output feeds directly into an automated image generation pipeline.
Multiple chapters are processed in parallel — your output must be fully self-contained
and must never depend on the runtime output of any other chapter's Bước 3 run.

---

### Input Data:

1. **Visual Bible:**
   Full JSON output containing:
   - visual_style (style_base, lighting, color_palette)
   - characters[] (anchor_prompt_string, expressions, do_not_change, signature_markers)
   - master_background_prompt (style_base, environment_base, scene_variables_template)
   - negative_prompt

2. **Chapter Data:**
   Single chapter object containing:
   - title, mood, characters_present[], summary
   - Transcript lines formatted as [ID] Text

3. **Previous Chapter Context:**
\`\`\`json
   {
     "last_chapter_title": "String",
     "last_chapter_mood": "String",
     "last_characters_present": ["String — role_labels"],
     "last_chapter_summary": "String — the visual scene description from the previous chapter summary, describes the dominant visual state at chapter end"
   }
\`\`\`
   // Pass null if this is the first chapter of the video.

---

### Phase 1 — Pre-read:

Before partitioning, read the entire chapter transcript once.
Identify:
- How many distinct locations appear?
- Are there any major time jumps (day → night, morning → evening)?
- Are there any major visual context shifts (calm → violent, private → public)?
- Which characters appear, and at what emotional states?
- Does the opening of this chapter continue visually from previousChapterContext?
  (Same location + same characters → inherit environment_base without modification)

Use this to plan your scene count BEFORE executing Phase 2.

---

### Phase 2 — Scene Partitioning (STRICT rules):

**Trigger a new scene ONLY when one of these occurs:**
1. Physical location changes (e.g., kitchen → front door → street).
2. Significant time jump (e.g., same room but clearly day → night).
3. Major visual context shift — a calm conversation escalating into physical confrontation,
   or the introduction of a significant new prop/object that reframes the scene visually.

**Do NOT create a new scene for:**
- Dialogue exchanges between the same characters in the same location.
- Minor emotional shifts within the same space.
- A single character moving slightly (standing up, turning around).

**Scene count limits (hard rules — do not violate):**
- MINIMUM: 1 scene per chapter.
- MAXIMUM: 5 scenes per chapter, regardless of chapter length.
- TARGET: 1 scene per ~150 words of transcript (≈ 60 seconds of audio).
- If transcript is under 200 words → maximum 2 scenes.

**ID coverage:**
- Every [ID] in the chapter transcript must be assigned to exactly one scene.
- start_index of scene N+1 must equal end_index of scene N + 1.
- First scene starts at the chapter's first ID. Last scene ends at the chapter's last ID.

---

### Phase 3 — Prompt Construction (Assembly Rules):

Each final_prompt is assembled in strict layer order.
DO NOT invent or paraphrase any layer — copy from Visual Bible exactly where specified.

**Layer order:**
- LAYER 1 — Style Base
Source: visual_bible.master_background_prompt.style_base
Action: Copy VERBATIM. Paste as-is at the start of EVERY prompt. Never modify.
- LAYER 2 — Environment Base
Check: Does the location of the scene match the location of the previous chapter?
→ YES (same location): Copy visual_bible.master_background_prompt.environment_base verbatim.
→ NO (location changed): Rewrite environment_base for the new location.
Rules for rewrite:
- Keep identical style_base aesthetic (same lighting logic, texture quality, color tone).
- Ground in Japanese domestic or culturally appropriate setting.
- Match time of day and atmosphere implied by chapter mood.
- Do NOT introduce architectural styles inconsistent with Visual Bible.
Special case — previousChapterContext is null (first chapter):
→ Use visual_bible.master_background_prompt.environment_base verbatim.
→ Do not infer any prior location or emotional state.
- LAYER 3 — Character Anchor Strings
For each character in characters_in_scene[]:
Step A: Locate their entry in visual_bible.characters[].
Step B: Copy their anchor_prompt_string VERBATIM. Do not shorten, paraphrase, or reorder.
Step C: Select the correct expression variant based on chapter.mood:
Tense / Angry / Explosive / Confrontational  → expression_angry
Melancholic / Sad / Grieving / Vulnerable    → expression_sad_or_vulnerable
Neutral / Calm / Reflective / Resigned       → expression_neutral
Step D: Append selected expression string after anchor_prompt_string.
Step E: Validate — scan the full scene description for any item listed in do_not_change[].
If any do_not_change item is contradicted → remove the contradiction from the
scene description. NEVER modify the character anchor or do_not_change list.
Repeat for each character present. Separate character blocks with a comma.
- LAYER 4 — Scene Variables
Fill each variable based on this specific scene. Reference scene_variables_template
from Visual Bible for structure guidance.
CHARACTER_POSITIONS:
Where each character is placed in the frame.
Rule: Always apply Rule of Thirds — characters on left or right third, never dead center.
Format: "Character A [position in frame], Character B [position in frame]"
Example: "Mother-in-law standing on left third, arms crossed facing right,
Daughter-in-law seated at right of frame, turned slightly away"
ACTION:
What each character is physically doing. Observable behavior only.
NOT internal emotion (never: "feeling anxious", "thinking about leaving").
YES observable action (always: "gripping the edge of the sink with both hands",
"folding a dish towel repeatedly without looking up").
LIGHTING_MODIFIER:
Scene-specific adjustment to visual_style.lighting_setup.
Tense/angry scenes:   "single overhead lamp, harsh downward shadows, no fill light"
Sad/quiet scenes:     "soft diffused window light from left, long shadow across floor"
Neutral scenes:       use lighting_setup from visual_style as-is, no modification needed
FOREGROUND_ELEMENT:
One foreground prop that adds depth and narrative meaning.
Must be physically plausible in this scene's location.
Must be culturally appropriate to Japanese domestic context.
Examples: "a half-filled ceramic teacup on the tatami floor, sharp foreground",
"a pair of worn house slippers at the edge of frame, foreground blur",
"folded laundry on low table, foreground right"
- LAYER 5 — Composition and Technical Tags
Append verbatim to EVERY prompt, no exceptions:
"rule of thirds composition, negative space on [left OR right] third and bottom 20% for subtitles,
deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures,
no text, no watermark, no cluttered center"
→ Choose left or right for negative space based on where characters are placed in Layer 4.
If characters are on the left third → negative space on right third + bottom.
If characters are on the right third → negative space on left third + bottom.

**Assembled final_prompt format:**
[LAYER 1], [LAYER 2], [LAYER 3 — character 1 anchor + expression],
[LAYER 3 — character 2 anchor + expression if present],
[LAYER 4 — CHARACTER_POSITIONS, ACTION, LIGHTING_MODIFIER, FOREGROUND_ELEMENT],
[LAYER 5] --ar 16:9

---

### Phase 4 — Negative Prompt Assembly:

For each scene:
- Base: copy visual_bible.negative_prompt verbatim.
- Then append scene-specific additions:

  High-emotion scene (mood: Tense / Angry / Explosive):
    append → "calm expression, smiling face, relaxed posture"

  Low-light / interior night scene:
    append → "bright daylight, outdoor setting, overexposed highlights, lens flare"

  Single character only:
    append → "multiple people, crowd, background figures"

  Two characters only:
    append → "third person, background crowd, extra faces"

  Scene with new/rewritten environment_base:
    append → "previous location elements, [name of previous location setting]"

---

### Phase 5 — Self-Validation (run before writing output):

Check every scene against this list. Fix any failure before outputting.

☐ Do start_index and end_index cover a contiguous block of transcript IDs?
☐ Are ALL transcript IDs from this chapter covered across all scenes, with no gaps or overlaps?
☐ Is scene count between 1 and 5 (inclusive)?
☐ Does every final_prompt begin with style_base copied verbatim from Visual Bible?
☐ Is anchor_prompt_string for each character copied verbatim (not paraphrased)?
☐ Does any scene description contradict any do_not_change item? If yes → fix scene, not character.
☐ Is ACTION written as observable physical behavior (not internal emotion)?
☐ Is negative_prompt present and non-empty for every scene?
☐ Does Layer 5 appear at the end of every final_prompt?
☐ Is previousChapterContext null handled correctly for the first chapter?

---

### Constraint Rules:
- Output MUST be a JSON array containing ONE object per scene.
- Objects are separated by commas. Do NOT merge multiple scenes into one object.
- final_prompt and negative_prompt MUST be in English.
- location_setting and visual_description may be in the same language as the transcript.
- anchor_prompt_string must never be shortened — full string from Visual Bible always.
- do_not_change constraints must never be contradicted anywhere in the prompt.
- ACTION field must describe observable physical behavior only — never internal state.
- Multiple chapters using this prompt run in parallel — output is fully self-contained.

---

### OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

---

### Output Schema (JSON):
[
  {
    "start_index": integer,
    "end_index": integer,
    "location_setting": "String — specific location, e.g. 'Traditional Japanese kitchen — interior, late afternoon'",
    "characters_in_scene": ["String — role_label from Visual Bible"],
    "expression_used": {
      "role_label": "neutral | angry | sad_or_vulnerable"
    },
    "scene_variables": {
      "CHARACTER_POSITIONS": "String",
      "ACTION": "String — observable physical behavior only",
      "LIGHTING_MODIFIER": "String",
      "FOREGROUND_ELEMENT": "String"
    },
    "visual_description": "String — internal reasoning: why this scene boundary exists, what is the dominant visual moment",
    "final_prompt": "String — fully assembled, English only, starts with style_base verbatim",
    "negative_prompt": "String — Visual Bible base + scene-specific additions, English only"
  },
  {
    "start_index": integer,
    "end_index": integer,
    "location_setting": "String — specific location, e.g. 'Traditional Japanese kitchen — interior, late afternoon'",
    "characters_in_scene": ["String — role_label from Visual Bible"],
    "expression_used": {
      "role_label": "neutral | angry | sad_or_vulnerable"
    },
    "scene_variables": {
      "CHARACTER_POSITIONS": "String",
      "ACTION": "String — observable physical behavior only",
      "LIGHTING_MODIFIER": "String",
      "FOREGROUND_ELEMENT": "String"
    },
    "visual_description": "String — internal reasoning: why this scene boundary exists, what is the dominant visual moment",
    "final_prompt": "String — fully assembled, English only, starts with style_base verbatim",
    "negative_prompt": "String — Visual Bible base + scene-specific additions, English only"
  }
]

---
### DATA TO PROCESS:

**Visual Bible:**
${visualBible}

**Chapter Data:**
${chapterData}

**Previous Chapter Context (structured JSON or null):**
${previousChapterContext}
`;
