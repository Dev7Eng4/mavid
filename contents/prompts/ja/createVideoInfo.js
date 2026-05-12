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
No markdown.
No explanation.
No extra text.

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
No markdown.
No explanation.
No extra text.

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
No markdown.
No code fences.
No explanations.
No extra text.

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

export const promptCreateVisualBible = (finalSynthesis, visualStyle) => `
You are a Senior Visual Concept Artist and Art Director specializing in Japanese video storytelling.

Your task is to transform the final editorial synthesis of a Japanese video into:
1. a consistent Visual Bible for downstream AI image generation
2. one strong hero-image concept and prompt that can represent the entire video as a single static image

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are creating a VISUAL BIBLE and a SINGLE HERO IMAGE PACKAGE.

This is NOT chapter segmentation.
This is NOT metadata generation.
This is NOT a rewrite of the story.

Your job:
- define the global visual direction
- establish character consistency
- establish environment consistency
- translate each chapter into visual planning
- create one highly compelling single-image concept for the entire video
- generate one final image prompt for that single-image concept

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
- Do NOT change the story
- Do NOT add new plot events
- Do NOT create new major characters unless strongly implied
- Do NOT split or merge chapters
- Do NOT include text, captions, subtitles, logos, or UI elements in the image
- Keep all visual details consistent across chapters
- If a visual detail is not specified, infer conservatively from genre, tone, and chapter context
- Separate grounded details from assumptions in quality notes

━━━━━━━━━━━━━━━━━━
## HERO IMAGE REQUIREMENTS
━━━━━━━━━━━━━━━━━━
- Create one single-image concept that can represent the whole video
- This image must be strong enough to be shown as the only visual for the entire video
- It must remain visually interesting during prolonged viewing
- It should contain layered storytelling, emotional tension, and environmental detail
- It must communicate the core conflict, mood, and narrative essence of the video in one image
- It must be visually rich, but still clear and readable
- Avoid flat, empty, or generic compositions
- Avoid simple portrait-only framing unless the story absolutely requires it
- Prefer a narrative tableau with foreground, midground, and background storytelling when appropriate
- The hero image prompt must be directly usable for an image-generation model

━━━━━━━━━━━━━━━━━━
## VISUAL TRANSLATION LOGIC
━━━━━━━━━━━━━━━━━━
1. Read the global_context and chapters from the final synthesis.
2. Identify the emotional tone, genre, recurring motifs, and most representative conflict.
3. Define a consistent global visual language.
4. Create character designs only for recurring or important characters.
5. Define recurring environments.
6. Create a visual plan for each chapter without changing chapter structure.
7. Create one hero image package that best represents the full story.
8. Write one clean, production-ready image prompt for the hero image.

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
No markdown.
No commentary.
No extra text.

Schema:

{
  "video_id": string,
  "style": {
    "name": string,
    "preset": string
  },
  "visual_bible": {
    "overall_mood": string,
    "color_palette": [string],
    "lighting_style": string,
    "camera_language": [string],
    "composition_rules": [string],
    "texture_and_materials": [string],
    "visual_consistency_rules": [string]
  },
  "character_designs": [
    {
      "character_id": string,
      "name": string,
      "role": string,
      "age_range": string,
      "appearance": string,
      "wardrobe": string,
      "expression_range": [string],
      "consistency_notes": string,
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
        "recurring_visual_elements": [string]
      }
    ],
    "time_period": string,
    "cultural_context": string
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
      "avoid": [string]
    }
  ],
  "hero_image_package": {
    "concept": string,
    "narrative_purpose": string,
    "why_this_works_for_full_video": string,
    "composition": string,
    "main_subject": string,
    "secondary_elements": [string],
    "environment": string,
    "emotion": string,
    "visual_density": string,
    "viewer_retention_strategy": [string],
    "prompt": string,
    "negative_prompt": string
  },
  "quality": {
    "assumptions": [string],
    "uncertain_visual_details": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- Write all text values in English
- Use concise, production-ready visual language
- Avoid poetic wording
- Prefer concrete visual descriptors
- Make the hero image prompt directly reusable in an image-generation step
`;

export const promptCreateScenePromptsForChapter = chapterSceneInput => `
You are a Senior Scene Planner and AI Image Prompt Designer for Japanese narrative video production.

Your task is to transform ONE chapter-level visual plan into 1–3 visually meaningful scene image prompts with exact transcript line ranges.

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are performing PER-CHAPTER SCENE DECOMPOSITION and IMAGE PROMPT GENERATION.

This is NOT story rewriting.
This is NOT chapter segmentation.
This is NOT global visual bible creation.
This is NOT metadata generation.

Your job:
- create 1–3 strong visual scenes for the current chapter
- assign each scene to exact transcript line ranges
- preserve the chapter's narrative and emotional intent
- maintain strict character consistency using character IDs
- maintain environment and style consistency
- generate one production-ready image prompt for each scene

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
- Scene ranges may merge adjacent source segments if they form one strong visual moment.
- Scene ranges should not overlap unless there is a deliberate visual reuse reason.
- Prefer scene boundaries that align with source segment boundaries.
- If the chapter has only one coherent beat, create one scene covering the full chapter line range.
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
- Prefer 1–3 strong scenes over many weak scenes.
- Each scene must represent a distinct visual and emotional beat.
- Avoid repetitive scene compositions inside the same chapter.
- Do NOT include text, subtitles, captions, logos, watermarks, or UI elements in images.

━━━━━━━━━━━━━━━━━━
## SCENE COUNT LOGIC
━━━━━━━━━━━━━━━━━━
- Create 1 scene if the chapter is simple, reflective, transitional, or mostly emotional.
- Create 2 scenes if the chapter contains both setup and reaction.
- Create 3 scenes only if the chapter contains a major reveal, confrontation, climax, emotional turning point, or strong visual progression.
- Never exceed scene_options.max_scenes_for_this_chapter.
- If unsure, prefer fewer stronger scenes.

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

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
No markdown.
No commentary.
No extra text.

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
