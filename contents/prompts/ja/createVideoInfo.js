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

export const promptUpdateTranscript1 = transcript => `
You are a native Japanese subtitle proofreader specializing ONLY in correcting Speech-to-Text (ASR) errors.

━━━━━━━━━━━━━━━━━━
STRICT RULES (MUST FOLLOW)
━━━━━━━━━━━━━━━━━━

* DO NOT change subtitle index numbers

* DO NOT change timestamps

* DO NOT merge or split subtitle blocks

* DO NOT change the number of lines in each subtitle block

* DO NOT reorder anything

* ONLY fix CLEAR mistakes caused by ASR or typos

* DO NOT rewrite or paraphrase sentences

* DO NOT improve grammar, even if unnatural

* DO NOT make the sentence more natural or formal

* KEEP the original spoken style EXACTLY

━━━━━━━━━━━━━━━━━━
WHAT YOU CAN FIX
━━━━━━━━━━━━━━━━━━

* Incorrect kanji / hiragana / katakana caused by ASR
* Wrong words due to misrecognition (homophones, similar sounds)
* Obvious typos (誤字・脱字)

━━━━━━━━━━━━━━━━━━
WHAT YOU MUST NOT CHANGE
━━━━━━━━━━━━━━━━━━

* Casual or broken spoken grammar
* Fillers (えー、あの、まあ, etc.)
* Repetition or hesitation
* Sentence structure
* Word choice if it is already correct in context

━━━━━━━━━━━━━━━━━━
LANGUAGE CONSTRAINT
━━━━━━━━━━━━━━━━━━

* Output MUST remain 100% in Japanese
* DO NOT translate into any other language

━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (VERY IMPORTANT)
━━━━━━━━━━━━━━━━━━

* Return the result in EXACT SRT format
* Keep line breaks EXACTLY the same as input
* Output inside ONE single code block
* DO NOT add any explanation or extra text

━━━━━━━━━━━━━━━━━━
INPUT SRT
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

export const promptCreateStructureVideo = summaries => `
You are a professional video content analyst specialized in breaking down long-form Japanese content into detailed visual sequences.

## INPUT

Partial Summaries (Japanese):
${summaries}

## OBJECTIVE

Create a detailed, structured flow that preserves FULL content coverage and is suitable for generating visual scenes.

## INSTRUCTIONS

* Preserve ALL ideas from the input (IMPORTANT)
* Do NOT aggressively merge or compress content
* Do NOT remove details just for conciseness
* Maintain the natural progression of the original content
* Keep small but meaningful details if they contribute to visualization
* Avoid combining multiple ideas into one bullet
* Each bullet should represent ONE clear moment, idea, or beat
* Keep the flow chronological and logical
* Target a HIGH number of bullets (important for scene generation)

## STYLE

* Write in Japanese
* Use bullet points only
* Each bullet = one idea / one moment
* Keep sentences short and clear
* No grouping into large sections (flat structure preferred)

## OUTPUT FORMAT (STRICT)

* Wrap everything in a single markdown code block (\`\`\`)
* No text before or after
* First character MUST be \`\`\`
* Last character MUST be \`\`\`

## OUTPUT EXAMPLE

\`\`\`
- 朝起きてすぐに水を飲む習慣の重要性
- 腸を目覚めさせることで1日のパフォーマンスが変わる
- 前日の夜に準備しておくことで朝のストレスを減らせる
- 忙しい朝でも続けられる簡単なルーティン
\`\`\`
`;

export const promptBreakdownScenes = structuredFlow => `
You are a professional Japanese video director and visual storyteller.

Your task is to convert a structured Japanese content flow into a sequence of cinematic visual scenes suitable for AI image generation.

## INPUT

Structured Flow (Japanese):
${structuredFlow}

## OBJECTIVE

Transform each idea into a clear, visually distinct scene that can be illustrated with a single image.

## INSTRUCTIONS

* Each scene must represent ONE clear idea, moment, or emotional beat
* Do NOT merge multiple ideas into one scene
* Preserve the original flow and progression
* Ensure full content coverage (do not skip important parts)
* Add light visual interpretation (environment, subject, mood) WITHOUT changing meaning
* Focus on scenes that can be visually expressed (avoid abstract-only ideas)

## VISUAL ENRICHMENT (IMPORTANT)

For each scene, subtly include:
* Subject (人物 / 主体)
* Setting (場所 / 環境)
* Action (何をしているか)
* Mood / emotion (雰囲気)

## STYLE

* Write in Japanese
* Each scene = 1–2 sentences
* Clear, concrete, visual language
* Avoid vague or abstract phrasing
* Keep natural Japanese tone (not robotic)

## OUTPUT FORMAT (STRICT)

* Wrap everything in ONE markdown code block (\`\`\`)
* No text before or after
* First character MUST be \`\`\`
* Last character MUST be \`\`\`

## OUTPUT FORMAT

\`\`\`
Scene 1: ...
Scene 2: ...
Scene 3: ...
\`\`\`

## EXAMPLE

\`\`\`
Scene 1: 朝の静かな部屋で、若い女性が目を覚まし、ゆっくりとベッドから起き上がる。柔らかい朝日がカーテン越しに差し込む。
Scene 2: キッチンでコップ一杯の水を飲みながら、体を目覚めさせる様子。表情は少し眠そうだが落ち着いている。
Scene 3: 前の夜に準備された朝食を見て、安心した表情を浮かべる。
\`\`\`
`;

export const promptUpdateTranscriptStep2 = (previousContext, targetToProcess) => `
You are an expert Japanese Subtitle Proofreader and Localization Specialist. Your task is to correct and merge fragmented Japanese subtitles generated by an automated ASR (Speech-to-Text) system.

Your PRIMARY GOALS:
- Preserve fidelity to the original spoken audio.
- Ensure subtitles are natural, readable, and properly segmented for on-screen display.

You will be provided with two distinct sections of data:
1. === PREVIOUS CONTEXT === : For understanding only. DO NOT include or modify.
2. === TARGET TO PROCESS === : The ONLY section you must process.

========================
STRICT RULES (MUST FOLLOW)
========================

1. AUDIO FIDELITY (CRITICAL):
- Do NOT change the meaning, tone, or nuance of the original speech.
- Do NOT paraphrase or rewrite freely.
- Only fix clear ASR errors (typos, wrong kanji, missing particles).
- Keep wording as close as possible to the original transcript.

2. NO HALLUCINATION:
- Do NOT add any new information.
- Do NOT invent missing content.
- Only use what exists in TARGET TO PROCESS.

3. FULL COVERAGE:
- You MUST cover ALL IDs exactly once.
- No skipping, no duplication, no missing IDs.

4. STRICT ID MAPPING:
- Only merge consecutive IDs.
- Do NOT reorder IDs.
- Output ID range must exactly match merged fragments.

5.  CONTROLLED MERGING AND SPLITTING:
- Merge fragments ONLY if they belong to the SAME speaker and same sentence.
- Split lines when:
  - Speaker changes
  - Multiple sentences are quoted
  - Line becomes too long

SUBTITLE LENGTH CONSTRAINT:
- Each subtitle line should be SHORT and readable.
- Prefer:
  - 15–30 Japanese characters per line (soft limit)
- HARD RULE:
  - Do NOT exceed ~35 characters unless absolutely necessary.
- If a sentence is long → split into multiple logical subtitle lines.

6. NATURAL BREAKING:
- Split lines at natural pauses:
  - punctuation (、。！？)
  - clause boundaries
  - conversational rhythm
- Each line should be easy to read within ~2–4 seconds.

7. MEANING PRESERVATION:
- Do NOT alter intent.
- Do NOT simplify content excessively.
- Keep emotional tone intact.

8. JAPANESE CORRECTION:
- Fix:
  - incorrect kanji (homophones)
  - particles (は / が / を / に)
  - grammar issues
- Add proper punctuation (。！？)

9. FILLER HANDLING:
- Remove meaningless fillers (えーと, あの) ONLY if safe.
- Keep them if they affect tone or emotion.

10. STRICT OUTPUT FORMAT:
- Each line MUST be:
  [StartID-EndID] Sentence
- One line per subtitle.
- No extra text.

11. OUTPUT WRAPPING (MANDATORY):
- Your entire response MUST be inside ONE markdown code block.
- No text outside the code block.

12. DIALOGUE HANDLING (CRITICAL):

- DO NOT group multiple speakers into one subtitle line.
- If a line contains multiple quoted sentences (「...」「...」):
  → Split them into separate subtitle lines.

- Each subtitle line should represent ONLY ONE speaker's utterance.

- Remove redundant quotation marks:
  - Avoid repeating 「」 multiple times in a single line.
  - Keep 「」 ONLY when necessary for clarity.
  - If dialogue is continuous, you may remove 「」 entirely for readability.

- Example:
  BAD:
  「じゃあな、ミク。戻ってくるよ」「応援してる！」

  GOOD:
  じゃあな、ミク。戻ってくるよ。
  応援してる！

========================
INPUT
========================

=== PREVIOUS CONTEXT ===
${previousContext}

=== TARGET TO PROCESS ===
${targetToProcess}

========================
EXPECTED OUTPUT
========================

\`\`\`
[104-105] 夫と会って話をしました。
[106-107] それで離婚することになりました。
\`\`\`
`;

export const promptToSummaryChapter = (transcript, previousContext) => `
### Role:
You are a Professional Narrative Architect and Script Editor for high-end cinematic video production. Your goal is to analyze a raw transcript and segment it into logical, engaging "Chapters."

### Input Format:
1. **Previous Context (Optional):** A summary or the last few lines of the preceding segment to ensure narrative flow.
2. **Current Transcript:** A list of text lines formatted as \`[ID] Text Content\`.

### Task Instructions:
- **Segmenting:** Group the provided lines into "Chapters" based on narrative beats, changes in location, shifts in mood, or major plot developments.
- **Chapter Length:** Ensure chapters are meaningful. Avoid micro-segmenting; a chapter should usually cover a complete action or dialogue sequence.
- **Continuity:** Use the "Previous Context" to determine if the beginning of the current transcript is a continuation of an ongoing scene or the start of a new one.
- **Summary:** For each chapter, write a 2-3 sentence summary that captures the core conflict, the emotional tone, and the key action. This will be used later for visual consistency.

### Constraint Rules:
- You MUST only output a valid JSON array.
- No conversational filler, no introductory remarks, and no explanations outside the code block.
- The \`id_start\` and \`id_end\` must correspond exactly to the \`[ID]\` provided in the transcript.
- Ensure 100% coverage of the transcript lines provided (from the first ID to the last ID).

## OUTPUT FORMAT (STRICT)

* You MUST wrap the entire output inside a single Markdown code block using triple backticks (\`\`\`)
* Do NOT write anything before or after the code block
* Do NOT include explanations, comments, or extra text
* The first character of your response MUST be \`\`\`
* The last character of your response MUST be \`\`\`

### Output Schema (JSON):
[
  {
    "id_start": integer,
    "id_end": integer,
    "title": "String (A dramatic, concise title, english)",
    "summary": "String (Detailed narrative summary for visual guidance, english)"
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
You are a Senior Visual Concept Artist and World Builder for Cinematic Film Production. Your task is to synthesize chapter summaries into a comprehensive "Visual Bible" to ensure 100% consistency in AI image generation.

### Input:
A collection of summaries from all chapters of the story.

### Task Instructions:
1. **Global Narrative Synthesis:** Analyze all chapter summaries to create a cohesive story overview and identify the overarching emotional tone.
2. **Character Design (The "Cref" System):** Identify all recurring characters. For each, create a strict "Physical Description Tag" including: Age, ethnicity, hair style/color, specific facial features, and a fixed outfit for the entire story.
3. **Visual Style Definition:** Define the "Cinematic" look for this specific story. Include parameters for lighting (e.g., moody, high-contrast, golden hour), color palette, and camera settings (e.g., 35mm, deep depth of field).
4. **Master Storytelling Prompt:** Create one "Narrative Master Prompt" that acts as a visual synopsis of the entire story. This image MUST be a complex composition that includes:
    - The primary characters in their most defining poses.
    - The most significant setting as the background.
    - Symbolic elements or "visual cues" that represent the main conflict, the climax, or the emotional resolution of the story.
    - A composition that allows a viewer to grasp the story's premise and tone at a single glance.

### Constraint Rules:
- Output MUST be a single, valid JSON object.
- Use descriptive, comma-separated tags for character features to optimize for AI image generators (Midjourney, Stable Diffusion, Flux).
- Ensure characters' outfits are "Locked" to maintain continuity.
- Style must be "Cinematic" as requested by the user.

### Output Schema (JSON):
{
  "story_overview": "String (Comprehensive summary)",
  "global_visual_style": {
    "cinematic_tags": "String (lighting, camera, color grade, mood)",
    "negative_prompt": "String (Common artifacts to avoid)"
  },
  "characters": [
    {
      "name": "String",
      "role": "String",
      "physical_description_tags": "String (Detailed visual tags for consistency)",
      "fixed_outfit": "String"
    }
  ],
  "global_master_shot_prompt": "String (A comprehensive narrative tableau prompt that tells the whole story in one frame)",
  "visual_mood": "String (Overall emotional vibe)"
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
