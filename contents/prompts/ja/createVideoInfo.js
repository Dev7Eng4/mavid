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
* Do not wrap in markdown code block.
* **DO NOT** add any explanations, greetings, or introductory text.
* Do not add comments.
* The content must remain **100% Japanese**.

Output Example:

\`\`\`
[1] こんにちは
[2] おはよう
\`\`\`

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

// step create meta
export const promptCreateSummaryFromTranscript = (transcript, previousContext = '') => `
You are a highly skilled Japanese transcript analyst.

Your task is to analyze ONE TECHNICAL PROCESSING BATCH of Japanese transcript lines.

Important:
This input batch is NOT a chapter.
It may contain multiple narrative beats, topic shifts, emotional changes, or chapter boundary candidates.

━━━━━━━━━━━━━━━━━━
## INPUT FORMAT
━━━━━━━━━━━━━━━━━━
- Transcript is formatted as numbered lines: [1], [2], [3], ...
- Numbers are line IDs, NOT timestamps.
- Timeline is handled outside by code.

━━━━━━━━━━━━━━━━━━
## OBJECTIVE
━━━━━━━━━━━━━━━━━━
Analyze this processing batch and divide it internally into smaller semantic units called micro_segments.

Each micro_segment should represent one coherent narrative/topic/emotional beat.

Do NOT treat the whole input as one chapter.
Do NOT create final chapters.
Only identify micro_segments and chapter boundary signals for downstream synthesis.

━━━━━━━━━━━━━━━━━━
## SEGMENTATION RULES
━━━━━━━━━━━━━━━━━━
Create a new micro_segment when there is a meaningful change in:
- topic
- event
- speaker objective
- emotional tone
- narrative role
- time/location/context
- setup → conflict → reveal → reaction → resolution

Do NOT create a new micro_segment for minor wording changes.
Prefer 2–5 micro_segments per processing batch when appropriate.
If the batch is very uniform, 1 micro_segment is acceptable.
If the batch contains clear shifts, create multiple micro_segments.

━━━━━━━━━━━━━━━━━━
## STRICT RULES
━━━━━━━━━━━━━━━━━━
- Do NOT add new facts.
- Do NOT hallucinate.
- Do NOT invent visuals unless clearly grounded.
- Do NOT create final chapters.
- Do NOT assume the batch boundary is a chapter boundary.
- Preserve meaning, nuance, entities, events, and emotional flow.
- Use evidence line IDs wherever possible.

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

Schema:

{
  "processing_chunk_id": string,
  "line_start": number,
  "line_end": number,
  "overall_summary": string,
  "micro_segments": [
    {
      "segment_id": string,
      "line_start": number,
      "line_end": number,
      "summary": string,
      "key_points": [
        {
          "text": string,
          "evidence_ids": [number]
        }
      ],
      "events": [
        {
          "text": string,
          "evidence_ids": [number]
        }
      ],
      "entities": [
        {
          "name": string,
          "type": string,
          "evidence_ids": [number],
          "confidence": number
        }
      ],
      "narrative_role": string,
      "emotion": [string],
      "topic": string,
      "chapter_boundary_signal": {
        "before_segment": string,
        "after_segment": string,
        "reason": string
      },
      "visual_cues": [
        {
          "text": string,
          "source": "explicit" | "inferred"
        }
      ],
      "confidence": number
    }
  ],
  "continuity_notes": {
    "starts_mid_context": boolean,
    "ends_mid_context": boolean,
    "notes": string
  },
  "quality": {
    "ambiguous_points": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- Write all text values in Japanese.
- Keep wording concise and precise.
- Use structured data over long prose.

━━━━━━━━━━━━━━━━━━
## DATA TO PROCESS
━━━━━━━━━━━━━━━━━━

Previous Context:
${previousContext || 'None'}

Transcript:
${transcript}
`;

export const promptMergeSummaryToSection = chunkAnalyses => `
You are a senior Japanese editorial synthesizer.

Your task is to merge multiple adjacent chunk analyses into a small number of coherent intermediate sections for downstream final synthesis.

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are performing LOCAL MERGE only.

This is NOT the final summary of the whole video.
This is an intermediate normalization step.

Your job:
- merge overlapping chunk analyses
- remove redundancy
- preserve the original narrative flow
- create section-level summaries
- keep traceability to source chunk IDs
- prepare clean inputs for the next synthesis stage

━━━━━━━━━━━━━━━━━━
## INPUT
━━━━━━━━━━━━━━━━━━
Chunk Analyses (JSON):
${chunkAnalyses}

Constraints:
- target_mode: production
- merge_style: high_precision
- prefer_minimal_sections: true
- language: ja
- do_not_invent_new_facts: true

━━━━━━━━━━━━━━━━━━
## MERGE RULES
━━━━━━━━━━━━━━━━━━
- Merge chunks that clearly belong to the same idea, scene, or narrative beat
- Do NOT split too finely
- Do NOT create sections for minor wording changes
- Do NOT invent new facts or new interpretations
- Preserve important names, numbers, steps, and examples
- If the transcript is noisy or repetitive, compress repeated material
- If a chunk is a boundary signal, respect it
- If a section is ambiguous, note it in quality notes rather than guessing

━━━━━━━━━━━━━━━━━━
## SECTIONING LOGIC
━━━━━━━━━━━━━━━━━━
Create a new section only when there is a meaningful change in at least one of these:
- topic
- objective
- emotional tone
- narrative role
- location / time
- conclusion / transition

Prefer fewer, stronger sections over many weak sections.

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

Schema:

{
  "video_id": string,
  "group_id": string,
  "sections": [
    {
      "section_id": string,
      "title": string,
      "summary": string,
      "source_chunk_ids": [number],
      "start_line": number,
      "end_line": number,
      "narrative_role": string,
      "emotion_arc": string,
      "main_points": [string],
      "merged_entities": [
        {
          "name": string,
          "type": string,
          "confidence": number
        }
      ],
      "visual_beats": [string],
      "continuity_notes": string,
      "confidence": number
    }
  ],
  "quality": {
    "merged_redundancies": [string],
    "ambiguous_points": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- All text fields must be written in Japanese
- Keep sections concise but information-rich
- Maintain editorial clarity
- Prefer neutral, production-friendly wording
`;

export const promptCreateFinalSynthesis = synthesisInput => `
You are an expert Japanese content editor, senior narrative architect, and content strategist.

Your task is to synthesize structured transcript analysis into a final production-ready editorial package.

This includes:
1. final summary
2. metadata
3. global context
4. final chapter structure
5. visual-ready chapter beats

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are performing GLOBAL SYNTHESIS and FINAL CHAPTERING.

This is NOT raw transcript analysis.
This is NOT local chunk merging.
This is NOT visual bible creation.
This is NOT image prompt generation.

Your job:
- read all provided structured analysis units
- merge repeated information
- preserve important details
- identify the true narrative flow
- create final chapters based on narrative boundaries
- create final summary
- create CTR-focused metadata for YouTube browse/suggested traffic
- metadata should prioritize curiosity, emotional hook, and click motivation
- metadata should NOT be optimized for YouTube Search SEO
- prepare chapter-level visual beats for the next visual planning step

━━━━━━━━━━━━━━━━━━
## CRITICAL CONCEPTS
━━━━━━━━━━━━━━━━━━
The input may contain:
- processing_chunks
- micro_segments
- sections

Important:
- A processing_chunk is only a technical batch used for AI processing.
- A processing_chunk is NOT a chapter.
- A section is an intermediate synthesis unit.
- A section is NOT necessarily a chapter.
- A chapter is a final narrative unit based on topic, event, emotion, objective, or story progression.

You MUST NOT map:
- 1 processing_chunk = 1 chapter
- 1 section = 1 chapter

A chapter may:
- start inside a processing_chunk
- end inside a processing_chunk
- span multiple processing_chunks
- contain multiple micro_segments
- contain part of a section if the narrative boundary requires it

Final chapter boundaries must be based on:
- line_start / line_end
- micro_segments
- topic shifts
- emotional shifts
- event progression
- narrative role changes
- chapter_boundary_signal
- continuity notes

━━━━━━━━━━━━━━━━━━
## INPUT
━━━━━━━━━━━━━━━━━━
Structured Synthesis Input JSON:
${synthesisInput}

━━━━━━━━━━━━━━━━━━
## CORE RULES
━━━━━━━━━━━━━━━━━━
- Do NOT invent new facts.
- Do NOT add external knowledge.
- Do NOT rewrite the story.
- Do NOT create chapters based on technical batch boundaries.
- Do NOT create chapters mechanically from processing_chunks.
- Do NOT create chapters mechanically from sections.
- Do NOT create too many chapters.
- Do NOT repeat the same idea in multiple places.
- Do NOT create image prompts.
- Do NOT create a visual bible.
- If information is ambiguous, write it in quality.ambiguous_points instead of guessing.
- Preserve the original meaning and nuance.
- Keep traceability to source line IDs, source segment IDs, and source processing chunk IDs.

━━━━━━━━━━━━━━━━━━
## METADATA STRATEGY RULES
━━━━━━━━━━━━━━━━━━
The metadata is NOT for SEO optimization.

The goal of metadata is:
- maximize click-through rate from YouTube Home, Browse Features, Suggested Videos, and Related Videos
- create emotional curiosity
- make the viewer want to know the full story
- avoid misleading claims
- avoid over-explaining the story in searchable keyword form

The metadata should intentionally avoid strong search optimization.

Important:
This does NOT mean hiding the content or misleading viewers.
The metadata must remain accurate and faithful to the story.
However, it should avoid being written in a way that targets exact search queries.

Do NOT:
- keyword-stuff the title
- create exact-match search titles
- use too many searchable noun phrases
- include excessive genre/search keywords
- write a description designed for search ranking
- repeat the same search keywords in title, description, and tags
- use title patterns like "嫁 浮気 DNA鑑定 離婚 修羅場"
- overuse searchable words such as 浮気, 不倫, 離婚, 修羅場, DNA鑑定, 夫婦, 復讐 unless they are essential to the hook

Prefer:
- curiosity-driven title
- emotional contradiction
- consequence-based wording
- mystery/reveal wording
- natural human phrasing
- short, high-impact title
- description that supports viewer interest but does not expose every searchable keyword

━━━━━━━━━━━━━━━━━━
## FINAL CHAPTERING RULES
━━━━━━━━━━━━━━━━━━
Create a new chapter only when there is a meaningful narrative transition.

Valid chapter boundary triggers:
- topic changes
- objective changes
- important event changes
- emotional tone shifts
- setup → conflict
- conflict → reveal
- reveal → reaction
- reaction → decision
- decision → resolution
- time or location changes
- conclusion or major transition

Do NOT create a new chapter for:
- minor wording changes
- repeated explanation
- small examples within the same topic
- technical processing chunk boundaries
- section boundaries without narrative change

Prefer fewer, stronger chapters over many weak chapters.

A good chapter should:
- have a clear narrative purpose
- contain a coherent beginning, middle, and end when possible
- preserve emotional progression
- be useful for downstream visual planning

━━━━━━━━━━━━━━━━━━
## SYNTHESIS LOGIC
━━━━━━━━━━━━━━━━━━
Follow this reasoning process internally:

1. Read all micro_segments and/or sections in chronological order.
2. Identify repeated or overlapping ideas.
3. Merge repeated information.
4. Identify the true narrative arc of the whole video.
5. Determine final chapter boundaries using narrative signals, not technical batch boundaries.
6. Create final summary and metadata from the whole video.
7. For each chapter, create visual beats grounded in the source content.
8. Preserve source traceability.

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
Do not wrap in markdown code block.
No code fences.
Do not add explanation.
Do not add comments.

The first character must be { and the last character must be }.

Schema:

{
  "video_id": "string",

  "final_summary": {
    "overview": "string",
    "key_takeaways": ["string"],
    "structured_sections": [
      {
        "heading": "string",
        "bullets": ["string"]
      }
    ]
  },

  "metadata": {
    "title": "string",
    "description": "string",
    "tags": ["string"],
    "hook": "string",
    "ctr_strategy": "string",
    "search_suppression_notes": ["string"],
  },

  "global_context": {
    "niche": "string",
    "tone": "string",
    "audience": "string",
    "topic": "string",
    "language": "ja"
  },

  "chapters": [
    {
      "chapter_id": "string",
      "title": "string",
      "summary": "string",

      "line_start": number,
      "line_end": number,

      "source_processing_chunk_ids": ["string"],
      "source_segment_ids": ["string"],
      "source_section_ids": ["string"],

      "narrative_role": "string",
      "emotion_arc": "string",
      "main_points": ["string"],

      "chapter_boundary_reason": "string",

      "visual_beats": ["string"]
    }
  ],

  "quality": {
    "merged_redundancies": ["string"],
    "ambiguous_points": ["string"],
    "chaptering_notes": ["string"],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## OUTPUT FIELD RULES
━━━━━━━━━━━━━━━━━━

### final_summary
- Write a coherent final summary of the whole video.
- Do not simply concatenate section summaries.
- Remove redundancy.
- Preserve all important ideas.

### metadata
- Metadata must prioritize CTR from YouTube recommendations, Browse Features, Home, Suggested Videos, and Related Videos.
- Metadata must NOT be optimized for YouTube Search SEO.
- title must be emotionally clickable, curiosity-driven, and accurate.
- title should avoid exact searchable keyword phrases.
- title should not reveal the entire story.
- title should create a curiosity gap while staying faithful to the source.
- description should be short, natural, and emotionally engaging.
- description should not keyword-stuff.
- description should not repeat the same searchable terms from the title.
- description should not be written like an SEO article summary.
- tags should be limited, broad, and classification-oriented.
- tags should avoid long-tail search phrases.
- hook should be short, emotional, and suitable for recommendation surfaces.
- ctr_strategy should explain why the metadata is likely to increase clicks from recommendations.
- search_suppression_notes should explain how the metadata avoids strong search optimization.

### global_context
- Infer only from the provided structured data.
- Do not invent genre or topic beyond the input.
- language should be "ja" unless the input clearly indicates otherwise.

### chapters
- Chapters must be final narrative chapters.
- Chapters must use line_start and line_end.
- Chapters must NOT be based on processing_chunk boundaries.
- Chapters may span multiple processing_chunks.
- Chapters may begin or end inside a processing_chunk.
- source_processing_chunk_ids should list all technical chunks involved.
- source_segment_ids should list all micro_segments used.
- source_section_ids should list all sections used, if sections are provided.
- visual_beats should be grounded in the chapter content, not invented.

### quality
- merged_redundancies: list what was merged or deduplicated.
- ambiguous_points: list unclear or low-confidence content.
- chaptering_notes: explain major chapter boundary decisions.
- confidence: number from 0 to 1.

━━━━━━━━━━━━━━━━━━
## FIXED CONSTRAINTS
━━━━━━━━━━━━━━━━━━
- Summary language: Japanese
- Metadata language: Japanese
- Chapter language: Japanese
- Maximum tags: 8
- Prefer 3–6 tags when possible
- Do not use long-tail SEO tags
- Do not repeat the same keyword family across title, description, and tags
- Metadata must prioritize recommendation CTR over search discoverability
- Prefer fewer, stronger chapters
- Avoid over-segmentation
- Keep output machine-readable
- Preserve traceability
`;

// export const promptCreateVisualBible = (finalSynthesis, visualStyle) => `
// You are a Senior Visual Concept Artist and Art Director specializing in Japanese video storytelling.

// Your task is to transform the final editorial synthesis of a Japanese video into:
// 1. a consistent Visual Bible for downstream AI image generation
// 2. one strong hero-image concept and prompt that can represent the entire video as a single static image

// ━━━━━━━━━━━━━━━━━━
// ## ROLE
// ━━━━━━━━━━━━━━━━━━
// You are creating a VISUAL BIBLE and a SINGLE HERO IMAGE PACKAGE.

// This is NOT chapter segmentation.
// This is NOT metadata generation.
// This is NOT a rewrite of the story.

// Your job:
// - define the global visual direction
// - establish character consistency
// - establish environment consistency
// - translate each chapter into visual planning
// - create one highly compelling single-image concept for the entire video
// - generate one final image prompt for that single-image concept

// ━━━━━━━━━━━━━━━━━━
// ## INPUT
// ━━━━━━━━━━━━━━━━━━

// Final Synthesis JSON:
// ${finalSynthesis}

// Visual Style Preset:
// ${JSON.stringify(visualStyle, null, 2)}

// ━━━━━━━━━━━━━━━━━━
// ## CORE RULES
// ━━━━━━━━━━━━━━━━━━
// - Do NOT change the story
// - Do NOT add new plot events
// - Do NOT create new major characters unless strongly implied
// - Do NOT split or merge chapters
// - Do NOT include text, captions, subtitles, logos, or UI elements in the image
// - Keep all visual details consistent across chapters
// - If a visual detail is not specified, infer conservatively from genre, tone, and chapter context
// - Separate grounded details from assumptions in quality notes

// ━━━━━━━━━━━━━━━━━━
// ## HERO IMAGE REQUIREMENTS
// ━━━━━━━━━━━━━━━━━━
// - Create one single-image concept that can represent the whole video
// - This image must be strong enough to be shown as the only visual for the entire video
// - It must remain visually interesting during prolonged viewing
// - It should contain layered storytelling, emotional tension, and environmental detail
// - It must communicate the core conflict, mood, and narrative essence of the video in one image
// - It must be visually rich, but still clear and readable
// - Avoid flat, empty, or generic compositions
// - Avoid simple portrait-only framing unless the story absolutely requires it
// - Prefer a narrative tableau with foreground, midground, and background storytelling when appropriate
// - The hero image prompt must be directly usable for an image-generation model

// ━━━━━━━━━━━━━━━━━━
// ## VISUAL TRANSLATION LOGIC
// ━━━━━━━━━━━━━━━━━━
// 1. Read the global_context and chapters from the final synthesis.
// 2. Identify the emotional tone, genre, recurring motifs, and most representative conflict.
// 3. Define a consistent global visual language.
// 4. Create character designs only for recurring or important characters.
// 5. Define recurring environments.
// 6. Create a visual plan for each chapter without changing chapter structure.
// 7. Create one hero image package that best represents the full story.
// 8. Write one clean, production-ready image prompt for the hero image.

// ━━━━━━━━━━━━━━━━━━
// ## OUTPUT FORMAT (STRICT JSON)
// ━━━━━━━━━━━━━━━━━━
// Return ONLY valid JSON.
// No markdown.
// No commentary.
// No extra text.

// Schema:

// {
//   "video_id": string,
//   "style": {
//     "name": string,
//     "preset": string
//   },
//   "visual_bible": {
//     "overall_mood": string,
//     "color_palette": [string],
//     "lighting_style": string,
//     "camera_language": [string],
//     "composition_rules": [string],
//     "texture_and_materials": [string],
//     "visual_consistency_rules": [string]
//   },
//   "character_designs": [
//     {
//       "character_id": string,
//       "name": string,
//       "role": string,
//       "age_range": string,
//       "appearance": string,
//       "wardrobe": string,
//       "expression_range": [string],
//       "consistency_notes": string,
//       "confidence": number
//     }
//   ],
//   "environment_design": {
//     "primary_locations": [
//       {
//         "location_id": string,
//         "name": string,
//         "description": string,
//         "mood": string,
//         "recurring_visual_elements": [string]
//       }
//     ],
//     "time_period": string,
//     "cultural_context": string
//   },
//   "chapter_visual_plan": [
//     {
//       "chapter_id": string,
//       "line_start": number,
//       "line_end": number,
//       "source_segment_ids": ["string"],
//       "visual_goal": string,
//       "scene_description": string,
//       "composition": string,
//       "lighting": string,
//       "color_notes": string,
//       "characters_present": [string],
//       "location_id": string,
//       "emotion_to_show": string,
//       "visual_keywords": [string],
//       "avoid": [string]
//     }
//   ],
//   "hero_image_package": {
//     "concept": string,
//     "narrative_purpose": string,
//     "why_this_works_for_full_video": string,
//     "composition": string,
//     "main_subject": string,
//     "secondary_elements": [string],
//     "environment": string,
//     "emotion": string,
//     "visual_density": string,
//     "viewer_retention_strategy": [string],
//     "prompt": string,
//     "negative_prompt": string
//   },
//   "quality": {
//     "assumptions": [string],
//     "uncertain_visual_details": [string],
//     "confidence": number
//   }
// }

// ━━━━━━━━━━━━━━━━━━
// ## STYLE
// ━━━━━━━━━━━━━━━━━━
// - Write all text values in English
// - Use concise, production-ready visual language
// - Avoid poetic wording
// - Prefer concrete visual descriptors
// - Make the hero image prompt directly reusable in an image-generation step
// `;

export const promptCreateVisualBible = (finalSynthesis, visualStyle) => `
You are a Senior Visual Concept Artist, Art Director, and Japanese drama visual strategist specializing in audio-story video production.

Your task is to transform the final editorial synthesis of a Japanese video into:

1. A consistent Visual Bible for downstream AI image generation
2. One strong Hero Image Package that represents the entire video as a single static image
3. One final production-ready image-generation prompt for that hero image

The hero image will be used as the main visual for an audio-based Japanese video.
It may be shown for a long duration, so it must be emotionally engaging, visually layered, and narratively clear.

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━

You are creating a VISUAL BIBLE and a SINGLE HERO IMAGE PACKAGE.

This is NOT chapter segmentation.
This is NOT metadata generation.
This is NOT a rewrite of the story.
This is NOT thumbnail text generation.
This is NOT poster design.

Your job:
- Define the global visual direction
- Establish character consistency
- Establish environment consistency
- Translate each chapter into visual planning
- Identify the strongest visual conflict in the whole story
- Create one compelling single-image concept for the entire video
- Generate one final image prompt directly usable by an image-generation model

━━━━━━━━━━━━━━━━━━
## INPUT
━━━━━━━━━━━━━━━━━━

Final Synthesis JSON:
${finalSynthesis}

Visual Style Preset:
${JSON.stringify(visualStyle, null, 2)}

━━━━━━━━━━━━━━━━━━
## CORE RULES
━━━━━━━━━━━━━━━━━━

- Do NOT change the story.
- Do NOT add new plot events.
- Do NOT create new major characters unless strongly implied by the story.
- Do NOT split, merge, remove, or reorder chapters.
- Do NOT include text, captions, subtitles, speech bubbles, logos, UI elements, signs, readable documents, or watermark-like elements in any image prompt.
- Do NOT create a title card, poster layout, promotional graphic, or thumbnail text design.
- The hero image is a visual story scene, not a graphic design.
- Keep all visual details consistent across chapters.
- If a visual detail is not specified, infer conservatively from genre, tone, age, role, cultural context, and chapter context.
- Separate grounded details from assumptions in the quality section.
- Do not invent shocking visual elements that are unsupported by the story.
- Avoid gore, sexualized content, horror exaggeration, fantasy effects, supernatural elements, or comedic distortion unless explicitly supported by the story.
- Prefer emotionally readable realism or stylized drama according to the provided visual style preset.

━━━━━━━━━━━━━━━━━━
## VISUAL STYLE PRESET ENFORCEMENT
━━━━━━━━━━━━━━━━━━

The provided Visual Style Preset is mandatory.

All outputs must follow it:
- character design
- age portrayal
- wardrobe
- environment
- lighting
- color palette
- camera language
- rendering style
- emotional intensity
- hero image prompt
- negative prompt

If the preset indicates anime:
- Do NOT describe photorealistic, live-action, DSLR photography, real film still, or cinematic realism.
- Use anime-style visual language consistent with the preset.
- Avoid chibi, overly cute, fantasy, magical, idol-like, or exaggerated action styling unless explicitly supported.

If the preset indicates cinematic realism:
- Do NOT describe anime, manga, cartoon, illustration, cel shading, or drawn artwork.
- Use realistic Japanese drama visual language.

If the preset is elderly-focused:
- Avoid overly young faces.
- Avoid idol-like beauty.
- Avoid fashion that makes elderly characters look unrealistically youthful.
- Use dignified, emotionally grounded, age-appropriate design.

If the preset defines specific colors, rendering style, line quality, lighting, or camera rules, apply them consistently throughout the output.

━━━━━━━━━━━━━━━━━━
## VISUAL TRANSLATION LOGIC
━━━━━━━━━━━━━━━━━━

Follow this process internally:

1. Read the global_context and chapters from the final synthesis.
2. Identify the genre, sub-genre, emotional tone, recurring motifs, and central conflict.
3. Identify the most important recurring characters.
4. Identify recurring or important environments.
5. Define a consistent global visual language.
6. Create character designs only for recurring or important characters.
7. Create environment designs only for locations that matter visually.
8. Create a visual plan for each chapter without changing chapter structure.
9. Identify the strongest hero-image conflict in the entire story.
10. Create one hero image package that best represents the full video.
11. Write one clean, production-ready image prompt for that hero image.

━━━━━━━━━━━━━━━━━━
## HERO IMAGE PURPOSE
━━━━━━━━━━━━━━━━━━

The hero image must represent the entire video as one static image.

It should:
- Communicate the core conflict without text
- Show the emotional center of the story
- Be strong enough to be used as the only visual for the whole video
- Remain visually interesting during prolonged viewing
- Contain layered storytelling
- Include foreground, midground, and background depth when appropriate
- Show readable facial expressions and body language
- Contain environmental clues that support the story
- Avoid flat, empty, generic, or portrait-only compositions
- Avoid overly symbolic images if a concrete dramatic scene is available
- Avoid calm scenes unless the story has no clear confrontation
- Avoid making the image too visually cluttered

━━━━━━━━━━━━━━━━━━
## HERO CONFLICT SELECTION
━━━━━━━━━━━━━━━━━━

The hero image must be selected from the strongest visual conflict in the story.

Prioritize the scene, implied moment, or visual tableau with the highest storytelling value:

1. Direct confrontation
2. Betrayal reveal
3. Hidden truth exposed
4. Family rupture
5. Mother-in-law vs daughter-in-law pressure
6. Husband/wife conflict
7. Workplace accusation or humiliation
8. Public exposure
9. Legal, divorce, inheritance, or property dispute
10. Financial betrayal
11. Revenge reversal
12. Emotional collapse after a shocking discovery
13. A decisive moment where the power dynamic changes

Do NOT choose a calm, generic, symbolic, or portrait-only image unless the story has no clear confrontation.

The hero concept must clearly answer:
- Who is attacking, accusing, hiding, regretting, or collapsing emotionally?
- Who holds power in the scene?
- Who is isolated or cornered?
- What visible gesture, object, or environment communicates the conflict?
- What makes this moment representative of the whole video?
- Why would a viewer want to keep looking at this image during a long audio video?

━━━━━━━━━━━━━━━━━━
## EVIDENCE OBJECT RULE
━━━━━━━━━━━━━━━━━━

If the story contains or strongly implies a concrete proof object, use it as a visible storytelling anchor.

Examples:
- DNA test result
- divorce papers
- smartphone message
- affair photo
- inheritance document
- property deed
- loan contract
- resignation letter
- company email
- bankbook
- envelope of money
- house key
- family photo
- medical document
- surveillance photo
- receipt
- business card
- handwritten letter
- hospital document
- school document
- workplace file
- apartment contract

Rules:
- The evidence object should be visible but must NOT contain readable text.
- Do not invent an evidence object if the story does not support one.
- If multiple evidence objects exist, choose the one with the clearest visual storytelling value.
- Place the evidence object where it helps the viewer understand the conflict.
- The evidence object should support the scene, not dominate it unless the story is specifically about that object.

━━━━━━━━━━━━━━━━━━
## CHARACTER BLOCKING RULES
━━━━━━━━━━━━━━━━━━

For the hero image, describe how characters are positioned in the frame.

Use visual blocking to show:
- power imbalance
- accusation
- avoidance
- emotional isolation
- betrayal
- shock
- shame
- anger
- guilt
- quiet collapse
- reversal of control

Prefer a narrative tableau when appropriate:
- Foreground: the most emotionally affected character or the evidence object
- Midground: the main confrontation
- Background: secondary character reaction or environmental clue

Use gaze direction intentionally:
- A character glaring can show accusation.
- A character looking away can show guilt or avoidance.
- A character looking down can show shame or defeat.
- A character staring at evidence can show shock.
- A character standing apart can show isolation.

Do not overcrowd the image.
Use only characters that are important to the core conflict.

━━━━━━━━━━━━━━━━━━
## JAPANESE DRAMA VISUAL LOGIC
━━━━━━━━━━━━━━━━━━

For Japanese family drama:
- Use domestic spaces such as living room, dining room, kitchen, genkan entrance, hospital corridor, family restaurant, apartment hallway, or traditional family home when supported.
- Show emotional pressure through posture, distance, silence, and household details.
- Use objects like family photos, tea cups, dining table, documents, bags, shoes at the entrance, or phone screens as subtle story clues.

For mother-in-law / daughter-in-law conflict:
- Show generational pressure, family hierarchy, tense domestic space, and the husband’s passive or conflicted position if relevant.
- Avoid cartoonish villain expressions.
- Use stern gestures, controlling posture, and spatial dominance.

For office drama:
- Use conference rooms, office desks, company corridors, elevators, file folders, laptops, ID cards, and formal clothing.
- Show social pressure through group positioning, accusation, isolation, or public embarrassment.

For betrayal / affair / divorce drama:
- Use documents, phones, photos, wedding rings, bedroom/living room separation, or cold domestic lighting.
- Show the moment of discovery or confrontation rather than aftermath alone.

For inheritance / property / money conflict:
- Use documents, envelopes, bankbooks, property files, family tables, tense meetings, or formal family gatherings.
- Show power through who controls the document or sits at the head of the table.

For revenge / reversal / karmic justice:
- Show the moment where the former victim gains composure and the aggressor loses control.
- Avoid exaggerated victory poses.
- Make the reversal emotionally satisfying but grounded.

For elderly-focused stories:
- Use softer but still emotionally clear staging.
- Avoid making elderly characters helpless unless the story requires it.
- Show dignity, regret, family tension, loneliness, or reconciliation through restrained body language.

━━━━━━━━━━━━━━━━━━
## HERO IMAGE PROMPT STRUCTURE
━━━━━━━━━━━━━━━━━━

The final hero_image_package.prompt must be a single clean image-generation prompt.

It must include:
- Visual style from the preset
- 16:9 wide composition
- Main characters with consistent appearance
- Foreground / midground / background staging
- Character power dynamic
- Visible evidence object if supported
- Emotionally charged body language
- Japanese cultural or environmental context
- Lighting and color mood
- Camera angle and lens feel
- Environmental details that support prolonged viewing
- Clear instruction that there is no text, no subtitles, no captions, no logos, no UI

The prompt must:
- Be directly usable in an image-generation step
- Be written in English
- Be specific and concrete
- Avoid vague phrases like "dramatic scene" without explaining what is visible
- Avoid placeholders
- Avoid JSON inside the prompt string
- Avoid mentioning the final synthesis or internal analysis
- Avoid requesting readable text on documents or screens

━━━━━━━━━━━━━━━━━━
## HERO IMAGE RETENTION STRATEGY
━━━━━━━━━━━━━━━━━━

Because this image may be shown for a long audio video, it should support prolonged viewing.

Use:
- layered composition
- visible emotional tension
- subtle background clues
- clear character relationships
- readable facial expressions
- meaningful props
- atmospheric lighting
- environment details that imply a larger story
- enough visual density to reward repeated viewing

Avoid:
- empty background
- single face close-up with no story context
- static lineup of characters
- generic sad person by a window
- vague symbolic imagery
- cluttered scenes with too many unrelated objects
- overly complex crowd scenes

━━━━━━━━━━━━━━━━━━
## CHARACTER DESIGN REQUIREMENTS
━━━━━━━━━━━━━━━━━━

Create character designs only for recurring or important characters.

Each character design should be specific enough to support image consistency across multiple image-generation steps.

For each character:
- Keep age range appropriate to the story
- Use Japanese cultural and social context when relevant
- Define hair, face, body type, wardrobe, and emotional range
- Add a signature visual trait when useful
- Add do-not-change consistency rules
- Avoid overdesigning characters with unsupported details
- Avoid turning normal people into fantasy, idol, or fashion-model characters unless supported by the story

Character confidence:
- 0.9 to 1.0: strongly grounded in the synthesis
- 0.7 to 0.89: reasonably inferred from role and context
- 0.5 to 0.69: partially inferred
- below 0.5: uncertain and should be noted in quality

━━━━━━━━━━━━━━━━━━
## ENVIRONMENT DESIGN REQUIREMENTS
━━━━━━━━━━━━━━━━━━

Define only important recurring or visually meaningful locations.

For each location:
- Describe the physical space
- Describe mood
- Describe recurring visual elements
- Describe cultural context when relevant
- Keep environments consistent across chapters
- Do not invent luxurious or extreme locations unless supported

━━━━━━━━━━━━━━━━━━
## CHAPTER VISUAL PLAN REQUIREMENTS
━━━━━━━━━━━━━━━━━━

Create one visual plan per chapter.

Do NOT split or merge chapters.
Do NOT alter line_start, line_end, or source_segment_ids.
Do NOT change the story.

For each chapter:
- Translate the chapter into a visual goal
- Use consistent characters and environments
- Describe the scene visually
- Define composition, lighting, color, emotion, and avoid rules
- Keep the visual plan useful for downstream scene/image generation
- If a chapter is internal, reflective, or summary-heavy, convert it into a grounded visual moment that represents the emotional state without inventing new plot events

━━━━━━━━━━━━━━━━━━
## NEGATIVE PROMPT REQUIREMENTS
━━━━━━━━━━━━━━━━━━

The negative_prompt must include general image safety and quality exclusions.

Always include:
- no text
- no captions
- no subtitles
- no speech bubbles
- no logos
- no watermark
- no UI
- no readable documents
- no readable phone screen text
- no distorted hands
- no extra fingers
- no duplicate faces
- no deformed anatomy
- no blurry face
- no low-resolution
- no random extra characters
- no unrelated objects
- no exaggerated horror
- no gore
- no sexualized content

If the style is anime, also avoid:
- no chibi style
- no overly cute style
- no magical effects
- no fantasy costume
- no idol styling
- no childish adult appearance

If the style is cinematic realism, also avoid:
- no anime
- no manga
- no cartoon
- no illustration
- no plastic skin
- no over-glamour lighting

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.
No trailing commas.
No undefined values.
All string values must be in English.

Use this exact schema:

{
  "video_id": string,
  "style": {
    "name": string,
    "preset": string,
    "style_summary": string
  },
  "visual_bible": {
    "overall_mood": string,
    "genre_visual_direction": string,
    "color_palette": [string],
    "lighting_style": string,
    "camera_language": [string],
    "composition_rules": [string],
    "texture_and_materials": [string],
    "visual_motifs": [string],
    "visual_consistency_rules": [string]
  },
  "character_designs": [
    {
      "character_id": string,
      "name": string,
      "role": string,
      "importance": "primary" | "secondary" | "supporting",
      "age_range": string,
      "appearance": string,
      "face_features": string,
      "hair": string,
      "body_type": string,
      "wardrobe": string,
      "signature_prop": string,
      "expression_range": [string],
      "body_language": [string],
      "consistency_notes": string,
      "do_not_change": [string],
      "confidence": number
    }
  ],
  "environment_design": {
    "primary_locations": [
      {
        "location_id": string,
        "name": string,
        "description": string,
        "mood": string,
        "recurring_visual_elements": [string],
        "cultural_context": string,
        "consistency_notes": string
      }
    ],
    "time_period": string,
    "overall_cultural_context": string
  },
  "chapter_visual_plan": [
    {
      "chapter_id": string,
      "line_start": number,
      "line_end": number,
      "source_segment_ids": ["string"],
      "visual_goal": string,
      "scene_description": string,
      "composition": string,
      "lighting": string,
      "color_notes": string,
      "characters_present": [string],
      "location_id": string,
      "emotion_to_show": string,
      "visual_keywords": [string],
      "scene_image_prompt_brief": string,
      "avoid": [string]
    }
  ],
  "hero_image_package": {
    "concept": string,
    "conflict_type": string,
    "climactic_moment": string,
    "narrative_purpose": string,
    "why_this_works_for_full_video": string,
    "composition": string,
    "main_subject": string,
    "secondary_elements": [string],
    "environment": string,
    "emotion": string,
    "visual_density": string,
    "evidence_object": {
      "object": string,
      "visual_role": string,
      "placement": string,
      "confidence": number
    },
    "character_blocking": {
      "foreground": string,
      "midground": string,
      "background": string,
      "power_dynamic": string,
      "gaze_direction": string
    },
    "viewer_retention_strategy": [string],
    "prompt": string,
    "negative_prompt": string
  },
  "quality": {
    "story_grounded_visuals": [string],
    "assumptions": [string],
    "uncertain_visual_details": [string],
    "possible_risks": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━

- Write all text values in English.
- Use concise, production-ready visual language.
- Avoid poetic wording.
- Prefer concrete visual descriptors.
- Prefer emotionally readable scenes over abstract symbolism.
- Make the hero image prompt directly reusable in an image-generation step.
- Keep the output stable, structured, and easy to consume programmatically.
`;

export const promptCreateScenePromptsForChapter = chapterSceneInput => `
You are a Senior Scene Planner and AI Image Prompt Designer for Japanese narrative video production.

Your task is to transform ONE chapter-level visual plan into a natural sequence of visually meaningful scene image prompts with exact transcript line ranges.

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are performing PER-CHAPTER SCENE DECOMPOSITION and IMAGE PROMPT GENERATION.

This is NOT story rewriting.
This is NOT chapter segmentation.
This is NOT global visual bible creation.
This is NOT metadata generation.

Your job:
- create as many scenes as naturally needed to visually cover the current chapter
- assign each scene to exact transcript line ranges
- preserve the chapter's narrative and emotional intent
- maintain strict character consistency using character IDs
- maintain environment and style consistency
- generate one production-ready image prompt for each scene

IMPORTANT:
The goal is NOT to minimize scene count.
The goal is to create enough scenes so the video has normal visual pacing.
A long chapter with many narrative beats should produce more scenes.
A short chapter with one emotional beat may produce only one scene.

━━━━━━━━━━━━━━━━━━
## INPUT
━━━━━━━━━━━━━━━━━━
Chapter Scene Input JSON:
${JSON.stringify(chapterSceneInput, null, 2)}

━━━━━━━━━━━━━━━━━━
## CRITICAL LINE RANGE RULES
━━━━━━━━━━━━━━━━━━
- Every scene MUST include line_start and line_end.
- line_start and line_end MUST be inside current_chapter.line_start and current_chapter.line_end.
- Use chapter_source_segments to decide scene boundaries.
- Do NOT invent line IDs outside the provided chapter.
- Do NOT create a scene without source_segment_ids.
- Scenes must be in chronological order.
- Scene ranges may merge adjacent source segments only if they form one coherent visual moment.
- Scene ranges should not overlap.
- Prefer scene boundaries that align with source segment boundaries.
- If the chapter has only one coherent beat, create one scene covering the full chapter line range.
- If the chapter contains multiple beats, create multiple scenes so each important beat is visually represented.
- The output line_start / line_end will be used by code to map images to timeline, so they must be accurate and usable.

━━━━━━━━━━━━━━━━━━
## CRITICAL CHARACTER CONSISTENCY RULES
━━━━━━━━━━━━━━━━━━
- Use only character_ids from character_designs and current_chapter.characters_present.
- Do NOT create new major characters.
- Do NOT rename characters.
- Do NOT change character age, appearance, wardrobe, role, or identity.
- Each scene must list characters_present as character IDs.
- Each prompt must include the relevant appearance and wardrobe details from character_designs.
- If a character is not visually necessary for a scene, do not include that character.
- Keep the same character visually consistent across all scenes.

━━━━━━━━━━━━━━━━━━
## CORE RULES
━━━━━━━━━━━━━━━━━━
- Only create scenes for current_chapter.
- Do NOT add new plot events.
- Do NOT split or merge chapters.
- Do NOT reference events that belong only to previous or next chapters.
- Use previous_chapter_context and next_chapter_context only for emotional continuity.
- Each scene must represent a distinct visual, narrative, or emotional beat.
- Avoid repetitive scene compositions inside the same chapter.
- Do NOT include text, subtitles, captions, logos, watermarks, or UI elements in images.
- Do NOT compress multiple major story beats into one scene just to reduce scene count.
- Do NOT create filler scenes that do not correspond to a real beat in the chapter.

━━━━━━━━━━━━━━━━━━
## SCENE COUNT LOGIC
━━━━━━━━━━━━━━━━━━
Create the number of scenes based on the natural story beats inside the chapter.

Do NOT use a fixed 1–3 scene limit.

A new scene should be created when one or more of the following changes occur:
- a new action begins
- a new emotional state appears
- a reveal happens
- a confrontation begins or escalates
- the location changes
- the time of day changes
- a new character becomes visually important
- the story moves from setup to reaction
- the story moves from reaction to decision
- the story moves from decision to consequence
- a source segment introduces a visually distinct moment
- the same scene would become too broad or vague if merged

Recommended pacing:
- Very short/simple chapter: 1 scene
- Short chapter with setup and reaction: 2 scenes
- Medium chapter with several beats: 3–5 scenes
- Long chapter with many source segments: 5–8 scenes
- Very long or highly eventful chapter: 8+ scenes if needed

Use chapter_source_segments as the primary unit for scene planning:
- Usually, 1 source segment can become 1 scene.
- Adjacent source segments may be merged if they show the same action, same location, and same emotion.
- A long source segment may be split into multiple scenes if it contains multiple clear visual beats.
- Do not leave important source segments visually uncovered.

Scene count must respect scene_options only if those options are explicitly provided:
- If scene_options.max_scenes_for_this_chapter exists, treat it as a soft upper target, not a hard cap.
- You may exceed it if the chapter clearly contains more distinct visual beats.
- If scene_options.min_scenes_for_this_chapter exists, create at least that many scenes unless the chapter truly lacks enough beats.
- If scene_options.target_scene_duration_seconds exists, use it to estimate normal image pacing.
- If no useful scene_options exist, decide scene count from narrative beats and source segments.

If unsure, prefer adequate story coverage over fewer scenes.

━━━━━━━━━━━━━━━━━━
## COVERAGE RULES
━━━━━━━━━━━━━━━━━━
The generated scenes should visually cover the chapter from beginning to end.

- The first scene should start near current_chapter.line_start.
- The last scene should end near current_chapter.line_end.
- Important middle source segments should not be skipped.
- It is acceptable for a scene to cover a quiet emotional beat if that beat is narratively important.
- Avoid making only climax images while ignoring setup and consequence.
- Avoid creating many near-identical images of the same character in the same pose.
- Each scene should have a clear reason to exist.

Before final output, internally check:
1. Are all important source segments represented?
2. Are there any large line gaps with no scene coverage?
3. Are multiple major events incorrectly merged?
4. Are any scenes visually redundant?
5. Does the number of scenes feel normal for the chapter length?

━━━━━━━━━━━━━━━━━━
## SCENE DESIGN LOGIC
━━━━━━━━━━━━━━━━━━
For each scene:
1. Select one visually meaningful moment from current_chapter.
2. Ground the scene in one or more chapter_source_segments.
3. Assign line_start and line_end from the selected source segment range.
4. Preserve the chapter's emotional arc.
5. Use only established character IDs and location IDs.
6. Keep character appearance and wardrobe consistent.
7. Keep lighting, color, camera, and composition consistent with visual_bible.
8. Add environmental detail only when it supports the story and mood.
9. Make the image feel like one frame from the story, not a generic illustration.
10. Vary composition between consecutive scenes when possible.

━━━━━━━━━━━━━━━━━━
## VISUAL VARIATION RULES
━━━━━━━━━━━━━━━━━━
Within the same chapter, avoid repeating the same image structure too many times.

Vary scenes using:
- camera distance: wide shot, medium shot, close-up
- camera angle: eye-level, slight low angle, over-the-shoulder, side view
- subject focus: character, prop, environment, relationship between characters
- emotional intensity: quiet tension, shock, confrontation, regret, isolation
- composition: single character, two-character tension, object-focused evidence shot, environmental storytelling

Do NOT vary character identity, age, hairstyle, wardrobe, or established design.

━━━━━━━━━━━━━━━━━━
## PROMPT REQUIREMENTS
━━━━━━━━━━━━━━━━━━
Each image prompt must include:
- main subject
- action or emotional moment
- location / environment
- character consistency details from character_designs
- composition
- lighting
- color mood
- visual style
- environmental storytelling details
- aspect ratio
- no text inside image

The prompt should be rich enough to create a compelling image, but not so long that it becomes confusing.

Each prompt should describe ONE clear visual moment.
Do NOT include multiple sequential actions inside one image prompt.

━━━━━━━━━━━━━━━━━━
## NEGATIVE PROMPT REQUIREMENTS
━━━━━━━━━━━━━━━━━━
Each negative prompt should prevent:
- text
- subtitles
- captions
- logo
- watermark
- UI elements
- distorted anatomy
- extra fingers
- inconsistent character design
- changed wardrobe
- changed hairstyle
- cluttered composition
- low detail
- generic stock photo look
- irrelevant characters
- wrong location
- repeated duplicate composition
- multiple unrelated events in one image

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

Schema:

{
  "video_id": string,
  "chapter_id": string,
  "chapter_line_start": number,
  "chapter_line_end": number,
  "style": {
    "name": string,
    "preset": string
  },
  "scenes": [
    {
      "scene_id": string,
      "scene_index": number,

      "line_start": number,
      "line_end": number,
      "source_segment_ids": [string],

      "title": string,
      "narrative_function": string,
      "moment_description": string,

      "characters_present": [string],
      "character_consistency_refs": [string],

      "location_id": string,
      "emotion": string,
      "composition": string,
      "lighting": string,
      "color_notes": string,
      "key_props": [string],
      "continuity_notes": string,
      "visual_keywords": [string],

      "prompt": string,
      "negative_prompt": string,
      "aspect_ratio": string,
      "priority": string
    }
  ],
  "quality": {
    "coverage_note": string,
    "line_range_notes": [string],
    "consistency_risks": [string],
    "scene_count_reasoning": string,
    "uncovered_source_segments": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- Write all text values in English.
- Use concise, production-ready prompt language.
- Prefer concrete visual description over abstract wording.
- Make prompts directly reusable for image generation.
`;
