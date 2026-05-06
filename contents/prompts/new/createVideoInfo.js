export const promptCreateSummaryFromTranscript = ({ transcript, previousContext = '' }) => `
You are a highly skilled Japanese transcript analyst.

Your task is to analyze ONE chunk of Japanese transcript lines and extract structured information for downstream processing (summary, chaptering, visual generation).

━━━━━━━━━━━━━━━━━━
## INPUT FORMAT
━━━━━━━━━━━━━━━━━━
- Transcript is formatted as numbered lines: [1], [2], [3], ...
- Numbers are line IDs (NOT timestamps)
- Timeline is handled outside (DO NOT infer time)

━━━━━━━━━━━━━━━━━━
## OBJECTIVE
━━━━━━━━━━━━━━━━━━
Extract structured semantic information from this chunk.

This is NOT just summarization.
You must capture:
- Meaning
- Key ideas
- Entities
- Events
- Narrative role
- Emotion
- Chapter boundary signals
- Visual cues (ONLY if grounded in text)

━━━━━━━━━━━━━━━━━━
## RULES (STRICT)
━━━━━━━━━━━━━━━━━━
- DO NOT add new facts
- DO NOT hallucinate
- DO NOT invent visuals unless clearly implied
- If uncertain → reflect uncertainty (lower confidence)
- Preserve original meaning and nuance
- Prefer structured data over long prose

━━━━━━━━━━━━━━━━━━
## OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━
Return ONLY valid JSON.
NO markdown
NO explanation
NO extra text

Schema:

{
  "line_start": number,
  "line_end": number,
  "one_line_summary": string,
  "summary_bullets": [string],
  "key_points": [
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
  "events": [
    {
      "text": string,
      "evidence_ids": [number]
    }
  ],
  "narrative_role": string,
  "emotion": [string],
  "topic": string,
  "chapter_hint": {
    "is_boundary": boolean,
    "boundary_type": string,
    "suggested_title": string,
    "reason": string
  },
  "visual_cues": [
    {
      "text": string,
      "source": "explicit" | "inferred"
    }
  ],
  "continuity_notes": string,
  "confidence": number
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- ALL text fields MUST be written in Japanese
- Keep wording concise and precise
- Avoid redundancy

━━━━━━━━━━━━━━━━━━
## DATA TO PROCESS
━━━━━━━━━━━━━━━━━━

### Previous Context (optional):
${previousContext || 'None'}

### Transcript:
${transcript}
`;

export const promptCreateFinalSummary = chunkAnalyses => `
You are an expert Japanese content editor and senior content strategist.

Your task is to merge multiple structured chunk analyses into a final, coherent, production-ready summary package.

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are NOT re-reading raw transcript.
You are editing and synthesizing structured chunk analyses produced by an earlier step.

You must:
- merge overlapping information
- preserve important details
- build a coherent narrative flow
- produce final metadata
- generate chapter structure
- prepare visual-ready chapter beats

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
## CORE RULES
━━━━━━━━━━━━━━━━━━
- Do NOT invent new facts
- Do NOT add external knowledge
- Do NOT repeat the same idea across multiple places
- Do NOT create too many chapters
- Do NOT make chapter splits unless the narrative truly changes
- Do NOT turn style preferences into content changes
- Prefer consolidated, high-signal wording
- Keep traceability to source chunk IDs
- If something is ambiguous, reflect that in quality notes instead of guessing

━━━━━━━━━━━━━━━━━━
## SYNTHESIS LOGIC
━━━━━━━━━━━━━━━━━━
1. Identify repeated or overlapping points across chunks.
2. Merge them into higher-level themes.
3. Order themes according to narrative flow.
4. Build chapters only at meaningful transitions.
5. Create final summary and metadata from the merged themes.
6. Extract visual beats only from grounded content.

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
  "final_summary": {
    "overview": string,
    "key_takeaways": [string],
    "structured_sections": [
      {
        "heading": string,
        "bullets": [string]
      }
    ]
  },
  "metadata": {
    "title": string,
    "description": string,
    "tags": [string],
    "hook": string
  },
  "global_context": {
    "niche": string,
    "tone": string,
    "audience": string,
    "topic": string,
    "language": string
  },
  "chapters": [
    {
      "chapter_id": string,
      "title": string,
      "summary": string,
      "start_chunk_id": number,
      "end_chunk_id": number,
      "start_line": number,
      "end_line": number,
      "emotion_arc": string,
      "main_points": [string],
      "source_chunk_ids": [number],
      "visual_beats": [string]
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
- Keep output concise, structured, and machine-readable
- Focus on clarity and editorial quality
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

export const promptMergeSectionToFinal = ({ sections, options = {} }) => `
You are an expert Japanese content editor and senior content strategist.

Your task is to synthesize multiple intermediate sections into a final, production-ready editorial package for a Japanese video.

━━━━━━━━━━━━━━━━━━
## ROLE
━━━━━━━━━━━━━━━━━━
You are performing GLOBAL SYNTHESIS only.

This is NOT raw transcript analysis.
This is NOT local chunk merging.

You must:
- unify the section-level content into a coherent whole
- remove residual redundancy
- create the final summary
- generate title, description, and tags
- produce stable chapter structure
- preserve traceability to source section IDs
- prepare the content for downstream visual planning

━━━━━━━━━━━━━━━━━━
## FIXED CONSTRAINTS
━━━━━━━━━━━━━━━━━━
- Summary language: Japanese
- Title style: clear, clickable, and accurate
- Description length: medium
- Maximum tags: 12
- Prefer fewer, stronger chapters
- Chapter granularity: medium
- Do not invent new facts
- Preserve traceability to source section IDs

━━━━━━━━━━━━━━━━━━
## INPUT
━━━━━━━━━━━━━━━━━━
Sections (JSON):
${sections}

━━━━━━━━━━━━━━━━━━
## CORE RULES
━━━━━━━━━━━━━━━━━━
- Do NOT invent new facts
- Do NOT add external knowledge
- Do NOT re-read or depend on raw transcript
- Do NOT make chapter splits unless the narrative truly changes
- Do NOT create too many chapters
- Do NOT repeat the same idea in multiple places
- Do NOT turn style preference into factual change
- Prefer concise, editorially clean output
- If something is ambiguous, reflect it in quality notes instead of guessing

━━━━━━━━━━━━━━━━━━
## SYNTHESIS LOGIC
━━━━━━━━━━━━━━━━━━
1. Read all sections as one narrative.
2. Identify the central themes and their progression.
3. Merge closely related sections into chapter-level units.
4. Create a final summary that is clear, structured, and non-redundant.
5. Generate metadata that matches the true content and tone.
6. Extract visual beats only from grounded content.

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
  "final_summary": {
    "overview": string,
    "key_takeaways": [string],
    "structured_sections": [
      {
        "heading": string,
        "bullets": [string]
      }
    ]
  },
  "metadata": {
    "title": string,
    "description": string,
    "tags": [string],
    "hook": string
  },
  "global_context": {
    "niche": string,
    "tone": string,
    "audience": string,
    "topic": string,
    "language": string
  },
  "chapters": [
    {
      "chapter_id": string,
      "title": string,
      "summary": string,
      "start_section_id": string,
      "end_section_id": string,
      "source_section_ids": [string],
      "emotion_arc": string,
      "main_points": [string],
      "visual_beats": [string]
    }
  ],
  "quality": {
    "merged_redundancies": [string],
    "ambiguous_points": [string],
    "chapter_rationale": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- All text fields must be written in Japanese
- Keep the output concise, structured, and machine-readable
- Use editorial language, not poetic language
- Make chapter titles informative and natural
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

Your task is to transform ONE chapter-level visual plan into 1–3 visually meaningful scene image prompts.

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
- preserve the chapter's narrative and emotional intent
- maintain visual consistency with the global visual bible
- maintain character and environment consistency
- use previous and next chapter context only for continuity
- generate one production-ready image prompt for each scene

━━━━━━━━━━━━━━━━━━
## INPUT
━━━━━━━━━━━━━━━━━━
Chapter Scene Input JSON:
${JSON.stringify(chapterSceneInput, null, 2)}

━━━━━━━━━━━━━━━━━━
## CORE RULES
━━━━━━━━━━━━━━━━━━
- Only create scenes for the current_chapter
- Do NOT add new plot events
- Do NOT create new major characters
- Do NOT change character identities, wardrobe, or appearance
- Do NOT change the established environment design
- Do NOT split or merge chapters
- Do NOT reference events that belong only to previous or next chapters
- Use previous_chapter_context and next_chapter_context only to maintain emotional continuity
- Prefer 1–3 strong scenes over many weak scenes
- Each scene must represent a distinct visual and emotional beat
- Avoid repetitive scene compositions inside the same chapter
- Prompts must be directly usable by an image generation model
- Do NOT include text, subtitles, captions, logos, watermarks, or UI elements in images

━━━━━━━━━━━━━━━━━━
## SCENE COUNT LOGIC
━━━━━━━━━━━━━━━━━━
Create scenes based on chapter complexity:

- Create 1 scene if the chapter is simple, reflective, transitional, or mostly emotional
- Create 2 scenes if the chapter contains both setup and reaction
- Create 3 scenes only if the chapter contains a major reveal, confrontation, climax, emotional turning point, or strong visual progression
- Never exceed scene_options.max_scenes_for_this_chapter

If unsure, prefer fewer stronger scenes.

━━━━━━━━━━━━━━━━━━
## SCENE DESIGN LOGIC
━━━━━━━━━━━━━━━━━━
For each scene:
1. Select one visually meaningful moment from the current chapter.
2. Make the scene distinct from other scenes in the same chapter.
3. Preserve the chapter's emotional arc.
4. Use characters only from current_chapter.characters_present unless strongly implied.
5. Use location_id from current_chapter or established environment_design.
6. Keep character appearance and wardrobe consistent with character_designs.
7. Keep lighting, color, camera, and composition consistent with visual_bible.
8. Add environmental detail only when it supports the story and mood.

━━━━━━━━━━━━━━━━━━
## PROMPT REQUIREMENTS
━━━━━━━━━━━━━━━━━━
Each image prompt must include:
- main subject
- action or emotional moment
- location / environment
- character consistency details
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
  "style": {
    "name": string,
    "preset": string
  },
  "scenes": [
    {
      "scene_id": string,
      "scene_index": number,
      "title": string,
      "narrative_function": string,
      "moment_description": string,
      "characters_present": [string],
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
    "consistency_risks": [string],
    "confidence": number
  }
}

━━━━━━━━━━━━━━━━━━
## STYLE
━━━━━━━━━━━━━━━━━━
- Write all text values in English
- Use concise, production-ready prompt language
- Prefer concrete visual description over abstract wording
- Make prompts directly reusable for image generation
`;
