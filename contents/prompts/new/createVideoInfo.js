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
- create final summary, title, description, and tags
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
    "hook": "string"
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
- title must be clear, clickable, and accurate.
- description must summarize the true content.
- tags must be relevant and not generic.
- hook should be short and emotionally engaging, but not misleading.

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
- Maximum tags: 12
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
