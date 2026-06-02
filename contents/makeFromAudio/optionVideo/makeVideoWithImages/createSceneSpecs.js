import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { openChatPage, sendPromptWithRetry, validateJsonResponse } from '../../../llm/index.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';

export const DEFAULT_SCENE_GENERATION_CONFIG = {
  allow_multiple_scenes_per_beat: false,
  default_scene_per_beat: 1,

  max_japanese_text_blocks: 3,
  max_headline_chars_ja: 14,
  max_sub_text_chars_ja: 18,
  max_badge_chars_ja: 10,

  avoid_small_text: true,
  avoid_complex_charts: true,
  avoid_fake_official_symbols: true,

  prefer_character_plus_infographic: true,
  prefer_senior_friendly_layout: true,

  visual_variety: {
    avoid_repeating_same_main_subject_more_than: 3,
    vary_layout_every_n_scenes: 2,
    vary_character_gender_and_pose: true,
  },
};

export const promptCreateSceneSpecsFromVisualBeatsBatch = ({
  sceneStartIndex = 1,
  batchId,
  projectContext,
  nicheConfig,
  styleConfig,
  sceneGenerationConfig,
  previousBeatPreview = [],
  currentVisualBeats = [],
  nextBeatPreview = [],
}) => `
You are a Japanese senior educational video scene designer.

Your task is to convert CURRENT VISUAL BEATS into SCENE SPECIFICATIONS.

You are NOT generating images.
You are NOT writing final image prompts.
You are NOT creating thumbnails.
You are ONLY designing scene specifications.

━━━━━━━━━━━━━━━━━━
PROJECT CONTEXT
━━━━━━━━━━━━━━━━━━
${JSON.stringify(projectContext, null, 2)}

━━━━━━━━━━━━━━━━━━
NICHE CONFIG
━━━━━━━━━━━━━━━━━━
${JSON.stringify(nicheConfig, null, 2)}

━━━━━━━━━━━━━━━━━━
STYLE CONFIG
━━━━━━━━━━━━━━━━━━
${JSON.stringify(styleConfig, null, 2)}

━━━━━━━━━━━━━━━━━━
SCENE GENERATION CONFIG
━━━━━━━━━━━━━━━━━━
${JSON.stringify(sceneGenerationConfig, null, 2)}

━━━━━━━━━━━━━━━━━━
PREVIOUS BEAT PREVIEW
━━━━━━━━━━━━━━━━━━
This is only for continuity and visual variety.
Do NOT create scenes from previous_beat_preview.

${JSON.stringify(previousBeatPreview, null, 2)}

━━━━━━━━━━━━━━━━━━
CURRENT VISUAL BEATS TO PROCESS
━━━━━━━━━━━━━━━━━━
Create scenes ONLY from current_visual_beats.

${JSON.stringify(currentVisualBeats, null, 2)}

━━━━━━━━━━━━━━━━━━
NEXT BEAT PREVIEW
━━━━━━━━━━━━━━━━━━
This is only for continuity and visual variety.
Do NOT create scenes from next_beat_preview.

${JSON.stringify(nextBeatPreview, null, 2)}

━━━━━━━━━━━━━━━━━━
CORE TASK
━━━━━━━━━━━━━━━━━━
Convert each current visual beat into one clear scene specification.

Default:
- 1 visual beat = 1 scene.

Only create multiple scenes from one beat if:
- scene_generation_config.allow_multiple_scenes_per_beat is true,
- and the beat clearly contains multiple separate visual ideas.

If allow_multiple_scenes_per_beat is false:
- create exactly one scene per visual beat.

━━━━━━━━━━━━━━━━━━
SCENE ID RULE
━━━━━━━━━━━━━━━━━━
Start scene IDs from S${String(sceneStartIndex).padStart(3, '0')}.

Scene IDs must be sequential:
S${String(sceneStartIndex).padStart(3, '0')},
S${String(sceneStartIndex + 1).padStart(3, '0')},
S${String(sceneStartIndex + 2).padStart(3, '0')},
...

━━━━━━━━━━━━━━━━━━
SCENE DESIGN PRINCIPLES
━━━━━━━━━━━━━━━━━━
Each scene must:
- communicate one clear idea
- be easy for Japanese seniors to understand
- use large, readable Japanese text
- avoid clutter
- avoid complex charts
- avoid too many labels
- preserve the factual meaning of the visual beat
- keep source_line_ids exactly traceable
- be suitable for a 16:9 YouTube video image

Make adjacent scenes visually varied:
- vary character gender/pose when appropriate
- vary layout_type
- vary supporting elements
- avoid repeating the same "elderly couple looking at documents" scene too often
- keep consistency with the style_config

━━━━━━━━━━━━━━━━━━
ON-SCREEN JAPANESE TEXT RULES
━━━━━━━━━━━━━━━━━━
The final image model will render Japanese text directly inside the image.

Therefore, on_screen_text_ja must be:
- short
- natural Japanese
- large-screen friendly
- senior-readable
- not a full transcript sentence
- not too many text blocks

Recommended:
- headline: 6–14 Japanese characters
- sub_text: 6–18 Japanese characters
- badge_text: 4–10 Japanese characters

Maximum:
- no more than 3 text blocks per scene
- no long paragraphs
- no small footnote text
- no complex table text

If badge_text is not needed, use an empty string.

━━━━━━━━━━━━━━━━━━
LAYOUT TYPES
━━━━━━━━━━━━━━━━━━
Choose one layout_type per scene:

- left_text_right_character
- top_text_bottom_visual
- center_character_with_side_icons
- comparison_board
- checklist_board
- warning_card
- document_explanation
- family_discussion
- simple_chart_slide
- emotional_lifestyle_scene
- summary_board

━━━━━━━━━━━━━━━━━━
VISUAL TYPES
━━━━━━━━━━━━━━━━━━
Choose one visual_type per scene:

- character_explanation
- comparison_slide
- checklist_slide
- warning_slide
- document_table_scene
- family_discussion_scene
- simple_chart_scene
- emotional_lifestyle_scene
- summary_slide

━━━━━━━━━━━━━━━━━━
FACTUAL SAFETY RULES
━━━━━━━━━━━━━━━━━━
- Use only information supported by the current visual beat.
- Do not add numbers, dates, laws, pension amounts, percentages, deadlines, medical claims, or official procedures unless they appear in the beat.
- Do not turn caution into certainty.
- Do not exaggerate fear.
- Do not create medical, legal, or financial advice beyond the beat.
- factual_basis must explain what the scene is based on.

━━━━━━━━━━━━━━━━━━
OUTPUT JSON SCHEMA
━━━━━━━━━━━━━━━━━━
Return valid JSON only.

{
  "batch_id": "${batchId}",
  "scene_specs": [
    {
      "scene_id": "S001",
      "source_beat_id": "string",
      "source_line_ids": [number],
      "start_line_id": number,
      "end_line_id": number,

      "scene_role": "opening_hook | explanation | warning | comparison | checklist | example | emotional_reflection | summary | call_to_action",
      "scene_purpose": "string",

      "visual_type": "character_explanation | comparison_slide | checklist_slide | warning_slide | document_table_scene | family_discussion_scene | simple_chart_scene | emotional_lifestyle_scene | summary_slide",
      "layout_type": "left_text_right_character | top_text_bottom_visual | center_character_with_side_icons | comparison_board | checklist_board | warning_card | document_explanation | family_discussion | simple_chart_slide | emotional_lifestyle_scene | summary_board",

      "on_screen_text_ja": {
        "headline": "string",
        "sub_text": "string",
        "badge_text": "string"
      },

      "visual_composition": {
        "main_subject": "string",
        "character_details": "string",
        "background": "string",
        "supporting_elements": ["string"],
        "emotion": "string",
        "camera_view": "string",
        "composition_notes": "string"
      },

      "information_design": {
        "chart_type": "none | simple_comparison | simple_timeline | checklist | warning_list | document_highlight | simple_flow",
        "chart_elements": ["string"],
        "icon_elements": ["string"],
        "avoid_elements": ["string"]
      },

      "style_directives": {
        "visual_style": "string",
        "mood": "string",
        "color_direction": "string",
        "text_readability": "string"
      },

      "negative_notes": ["string"],
      "factual_basis": ["string"],
      "notes_for_image_prompt_writer": "string"
    }
  ],
  "continuity_notes": {
    "visual_variety_notes": "string",
    "repeated_visual_risks": ["string"]
  }
}

━━━━━━━━━━━━━━━━━━
OUTPUT QUALITY RULES
━━━━━━━━━━━━━━━━━━
- Output JSON only.
- Do not wrap in markdown code block.
- Create scenes only from current_visual_beats.
- Do not create scenes from previous_beat_preview.
- Do not create scenes from next_beat_preview.
- Every scene must include source_beat_id.
- Every scene must preserve source_line_ids from its source visual beat.
- Do not remove source_line_ids.
- Do not invent content.
- Do not copy long transcript text as image text.
- on_screen_text_ja must contain Japanese only.
- Make each scene visually clear and senior-friendly.
`;

export function createVisualBeatBatchesForSceneSpecs(visualBeats, options = {}) {
  const { targetBeatsPerBatch = 10, previousBeatPreviewCount = 2, nextBeatPreviewCount = 2 } = options;

  const batches = [];

  for (let startIndex = 0; startIndex < visualBeats.length; startIndex += targetBeatsPerBatch) {
    const endIndex = Math.min(startIndex + targetBeatsPerBatch, visualBeats.length);

    const previousStartIndex = Math.max(0, startIndex - previousBeatPreviewCount);
    const nextEndIndex = Math.min(visualBeats.length, endIndex + nextBeatPreviewCount);

    const previousBeatPreview = visualBeats.slice(previousStartIndex, startIndex);
    const currentVisualBeats = visualBeats.slice(startIndex, endIndex);
    const nextBeatPreview = visualBeats.slice(endIndex, nextEndIndex);

    batches.push({
      batchId: String(batches.length + 1).padStart(3, '0'),
      sceneStartIndex: startIndex + 1,
      previousBeatPreview,
      currentVisualBeats,
      nextBeatPreview,
    });
  }

  return batches;
}

export async function main(beats, nicheConfig, styleConfig) {
  const projectContext = {
    language: 'ja',
    target_audience: 'Japanese seniors 60+',
    video_format: 'audio_with_ai_images',
    image_aspect_ratio: '16:9',
    text_rendering_mode: 'ai_generated_text',
  };

  const sceneGenerationConfig = {
    allow_multiple_scenes_per_beat: false,
    default_scene_per_beat: 1,
    max_japanese_text_blocks: 3,
    max_headline_chars_ja: 14,
    max_sub_text_chars_ja: 18,
    max_badge_chars_ja: 10,
    avoid_small_text: true,
    avoid_complex_charts: true,
    prefer_character_plus_infographic: true,
  };

  const batches = createVisualBeatBatchesForSceneSpecs(beats);

  const totalBatches = batches.length;
  console.log('🚀 ~ main ~ totalBatches:', totalBatches);
  const sceneSpecsResults = new Array(batches.length).fill(null);

  const activeConcurrency = Math.min(PLAYWRIGHT_PROFILES.length, batches.length);
  let nextBatchIndex = 0;

  async function workerProfile(workerIndex) {
    const profileNum = PLAYWRIGHT_PROFILES[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum });
      ctx = opened.context;
      const pg = opened.page;
      let primingDone = false;

      while (true) {
        const i = nextBatchIndex++;
        if (i >= totalBatches) break;

        const batch = batches[i];
        const batchId = batch.batchId;
        const batchIndex = i + 1;
        console.log(`[create-scene-specs] batch ${batchIndex}/${totalBatches} ${batchId} (profile ${profileNum})`);
        // onBatchStart?.({ batchIndex, batchId, total: totalBatches });

        try {
          if (!primingDone) {
            await openChatPage(pg);
            primingDone = true;
          }

          const prompt = promptCreateSceneSpecsFromVisualBeatsBatch({
            batchId,
            sceneStartIndex: batch.sceneStartIndex,
            projectContext,
            nicheConfig,
            styleConfig,
            sceneGenerationConfig,
            previousBeatPreview: batch.previousBeatPreview,
            currentVisualBeats: batch.currentVisualBeats,
            nextBeatPreview: batch.nextBeatPreview,
          });

          const raw = await sendPromptWithRetry(pg, prompt, {
            validate: validateJsonResponse,
            label: `[create-scene-specs] batch ${batchIndex}/${totalBatches} ${batchId} (profile ${profileNum})`,
          });

          const sceneSpecsPayload = JSON.parse(raw);
          const sceneSpecs = sceneSpecsPayload.scene_specs;

          sceneSpecsResults[i] = sceneSpecs;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[create-scene-specs] batch ${batchIndex}/${totalBatches} ${batchId} lỗi profile ${profileNum}: ${msg}`);
          sceneSpecsResults[i] = null;
        }

        if (nextBatchIndex < totalBatches) {
          await pg.waitForTimeout(1000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));

  const failedCount = sceneSpecsResults.filter(r => r === null).length;
  if (failedCount > 0) {
    throw new Error(`createSceneSpecs: ${failedCount}/${totalBatches} batch thất bại`);
  }

  let convertedSceneSpecs = [];
  for (const sceneSpecs of sceneSpecsResults) {
    if (!sceneSpecs || sceneSpecs.length === 0) continue;
    convertedSceneSpecs.push(...sceneSpecs);
  }
  return convertedSceneSpecs;
}
