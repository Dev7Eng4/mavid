import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { openChatPage, sendPromptWithRetry, validateJsonResponse } from '../../../llm/index.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';

export const promptCreateImagePromptsFromSceneSpecsBatch = ({
  batchId,
  projectContext,
  nicheConfig,
  styleConfig,
  imagePromptConfig,
  previousScenePreview = [],
  currentSceneSpecs = [],
  nextScenePreview = [],
}) => `
You are a professional image generation prompt writer for Japanese senior educational YouTube videos.

Your task is to convert CURRENT SCENE SPECIFICATIONS into FINAL IMAGE GENERATION PROMPTS.

You are NOT an image generator.
You must NOT create, render, draw, or describe that you are creating an image.
You only write text prompts that will later be sent to a separate image generation model.

You must output JSON only.

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
IMAGE PROMPT CONFIG
━━━━━━━━━━━━━━━━━━
${JSON.stringify(imagePromptConfig, null, 2)}

━━━━━━━━━━━━━━━━━━
PREVIOUS SCENE PREVIEW
━━━━━━━━━━━━━━━━━━
This is only for visual variety.
Do NOT create prompts from previous_scene_preview.

${JSON.stringify(previousScenePreview, null, 2)}

━━━━━━━━━━━━━━━━━━
CURRENT SCENE SPECIFICATIONS TO PROCESS
━━━━━━━━━━━━━━━━━━
Create image prompts ONLY from current_scene_specs.

${JSON.stringify(currentSceneSpecs, null, 2)}

━━━━━━━━━━━━━━━━━━
NEXT SCENE PREVIEW
━━━━━━━━━━━━━━━━━━
This is only for visual variety.
Do NOT create prompts from next_scene_preview.

${JSON.stringify(nextScenePreview, null, 2)}

━━━━━━━━━━━━━━━━━━
CORE TASK
━━━━━━━━━━━━━━━━━━
For each current scene specification, write ONE final image generation prompt.

Each final prompt must instruct an image model to generate:
- one single 16:9 image
- Japanese senior educational video style
- the visual scene
- the layout
- the Japanese text rendered directly inside the image
- the infographic elements, if any
- the correct mood and readability

Do not create multiple images in one prompt.
Do not describe a sequence.
Do not create a storyboard.
Do not add information that is not in the scene specification.

━━━━━━━━━━━━━━━━━━
LANGUAGE RULES
━━━━━━━━━━━━━━━━━━
- final_prompt should be written in English.
- expected_text_ja must preserve the exact Japanese text from on_screen_text_ja.
- Do not translate Japanese text into English.
- Do not add extra Japanese text beyond what is specified.
- Do not add English text inside the image.
- Output JSON only.

━━━━━━━━━━━━━━━━━━
JAPANESE TEXT RENDERING RULES
━━━━━━━━━━━━━━━━━━
The image model must render Japanese text directly in the image.

For each prompt:
- clearly list the Japanese text to render exactly
- use Japanese corner brackets like 「...」 around each text line
- tell the model the text must be large, bold, high contrast, and readable
- tell the model not to add extra text
- tell the model not to create tiny labels or paragraphs
- keep text blocks limited to the provided headline/sub_text/badge_text

If badge_text is empty:
- do not include it in expected_text_ja
- do not mention it in the prompt

━━━━━━━━━━━━━━━━━━
VISUAL VARIETY RULES
━━━━━━━━━━━━━━━━━━
Use previous_scene_preview and next_scene_preview only to avoid visual repetition.

When possible:
- vary character pose
- vary camera framing
- vary supporting elements
- vary layout emphasis
- keep style consistent
- do not change factual meaning

Do not create prompts for preview scenes.

━━━━━━━━━━━━━━━━━━
FACTUAL SAFETY RULES
━━━━━━━━━━━━━━━━━━
Use only the facts contained in the scene specification.

Do NOT add:
- specific pension amounts
- percentages
- dates
- legal deadlines
- medical claims
- official procedures
- law changes
- real company logos
- real government logos
- real police or bank logos
- fake official stamps or seals

If the scene specification says to avoid something, include that in the negative prompt.

━━━━━━━━━━━━━━━━━━
PROMPT STRUCTURE
━━━━━━━━━━━━━━━━━━
Each final_prompt should include:

1. Image format:
   "Create one single 16:9 image..."

2. Video/niche context:
   Japanese senior educational YouTube video.

3. Style:
   Use style_config and scene style_directives.

4. Scene:
   Main subject, character details, background, supporting elements.

5. Layout:
   Use layout_type and composition notes.

6. Japanese text:
   Render the specified Japanese text exactly.

7. Information design:
   Mention chart/icon/checklist requirements if present.

8. Readability:
   Large Japanese text, high contrast, senior-friendly, no clutter.

9. Safety:
   No invented facts, no unsupported amounts, no official logos.

━━━━━━━━━━━━━━━━━━
NEGATIVE PROMPT RULES
━━━━━━━━━━━━━━━━━━
negative_prompt must be a compact comma-separated string.

It must include:
- no English text
- no Chinese text
- no Korean text
- no watermark
- no logo
- no tiny text
- no unreadable characters
- no distorted hands
- all relevant negative_notes from the scene spec
- all relevant style_config negative prompts

━━━━━━━━━━━━━━━━━━
OUTPUT JSON SCHEMA
━━━━━━━━━━━━━━━━━━
Return JSON in exactly this structure:

{
  "batch_id": "${batchId}",
  "image_prompts": [
    {
      "scene_id": "string",
      "source_beat_id": "string",
      "source_line_ids": [number],
      "start_line_id": number,
      "end_line_id": number,

      "aspect_ratio": "16:9",
      "image_type": "scene_image",

      "expected_text_ja": ["string"],

      "final_prompt": "string",
      "negative_prompt": "string",

      "quality_checklist": ["string"]
    }
  ]
}

━━━━━━━━━━━━━━━━━━
OUTPUT QUALITY RULES
━━━━━━━━━━━━━━━━━━
- Output valid JSON only.
- Create exactly one image prompt per current scene_spec.
- Do not create prompts from previous_scene_preview.
- Do not create prompts from next_scene_preview.
- Preserve scene_id exactly.
- Preserve source_beat_id exactly.
- Preserve source_line_ids exactly.
- Preserve start_line_id and end_line_id exactly.
- Do not wrap in markdown code block.
- Do not invent new facts.
- Do not include explanations outside JSON.
- final_prompt must be ready to send directly to an image generation model.
`;

export function createSceneSpecBatchesForImagePrompts(sceneSpecs, options = {}) {
  const { targetScenesPerBatch = 5, previousScenePreviewCount = 1, nextScenePreviewCount = 1 } = options;

  const batches = [];

  for (let startIndex = 0; startIndex < sceneSpecs.length; startIndex += targetScenesPerBatch) {
    const endIndex = Math.min(startIndex + targetScenesPerBatch, sceneSpecs.length);

    const previousStartIndex = Math.max(0, startIndex - previousScenePreviewCount);
    const nextEndIndex = Math.min(sceneSpecs.length, endIndex + nextScenePreviewCount);

    batches.push({
      batchId: String(batches.length + 1).padStart(3, '0'),
      previousScenePreview: sceneSpecs.slice(previousStartIndex, startIndex).map(toScenePreview),
      currentSceneSpecs: sceneSpecs.slice(startIndex, endIndex),
      nextScenePreview: sceneSpecs.slice(endIndex, nextEndIndex).map(toScenePreview),
      currentSceneRange: {
        startIndex,
        endIndex: endIndex - 1,
        count: endIndex - startIndex,
      },
    });
  }

  return batches;
}

function toScenePreview(scene) {
  return {
    scene_id: scene.scene_id,
    source_beat_id: scene.source_beat_id,
    visual_type: scene.visual_type,
    layout_type: scene.layout_type,
    on_screen_text_ja: scene.on_screen_text_ja,
    main_subject: scene.visual_composition?.main_subject,
    supporting_elements: scene.visual_composition?.supporting_elements,
    emotion: scene.visual_composition?.emotion,
  };
}

export async function main(sceneSpecs, nicheConfig, styleConfig) {
  const projectContext = {
    language: 'ja',
    target_audience: 'Japanese seniors 60+',
    video_format: 'audio_with_ai_images',
    image_aspect_ratio: '16:9',
    text_rendering_mode: 'ai_generated_text',
  };

  const imagePromptConfig = {
    output_language: 'en',
    aspect_ratio: '16:9',

    prompt_style: 'direct_image_generation',
    one_prompt_per_scene: true,
    negative_prompt_mode: 'separate_field',

    text_rendering: {
      default_mode: 'auto',

      allowed_modes: ['ai_generated_text', 'minimal_label_text', 'no_text', 'code_overlay_text'],

      auto_rules: {
        comparison_slide: 'ai_generated_text',
        checklist_slide: 'ai_generated_text',
        warning_slide: 'ai_generated_text',
        simple_chart_scene: 'ai_generated_text',
        summary_slide: 'ai_generated_text',

        character_explanation: 'minimal_label_text',
        document_table_scene: 'minimal_label_text',

        emotional_lifestyle_scene: 'no_text',
        family_discussion_scene: 'no_text',
      },

      ai_generated_text: {
        render_exact_japanese: true,
        allow_extra_text: false,
        max_text_blocks: 3,
        require_large_text: true,
        require_high_contrast: true,
        avoid_tiny_labels: true,
      },

      minimal_label_text: {
        render_exact_japanese: true,
        allow_extra_text: false,
        max_text_blocks: 1,
        require_large_text: true,
      },

      no_text: {
        forbid_all_text: true,
        forbid_letters: true,
        forbid_numbers: true,
        forbid_logos: true,
        forbid_subtitles: true,
        forbid_captions: true,
        forbid_labels: true,
        forbid_signboards: true,
      },

      code_overlay_text: {
        image_model_must_not_render_text: true,
        leave_safe_text_area: true,
        text_area_preference: 'left_or_top',
      },
    },

    composition: {
      single_image_only: true,
      no_storyboard: true,
      no_multi_panel: true,
      senior_friendly: true,
      avoid_clutter: true,
    },

    safety: {
      no_invented_numbers: true,
      no_real_logos: true,
      no_fake_official_symbols: true,
      no_medical_legal_financial_overclaim: true,
    },
  };

  const batches = createSceneSpecBatchesForImagePrompts(sceneSpecs);

  const totalBatches = batches.length;
  const imagePromptsResults = new Array(batches.length).fill(null);

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
        console.log(`[create-image-prompts] batch ${batchIndex}/${totalBatches} ${batchId} (profile ${profileNum})`);
        // onBatchStart?.({ batchIndex, batchId, total: totalBatches });

        try {
          if (!primingDone) {
            await openChatPage(pg);
            primingDone = true;
          }

          const prompt = promptCreateImagePromptsFromSceneSpecsBatch({
            batchId,
            projectContext,
            nicheConfig,
            styleConfig,
            imagePromptConfig,
            previousScenePreview: batch.previousScenePreview,
            currentSceneSpecs: batch.currentSceneSpecs,
            nextScenePreview: batch.nextScenePreview,
          });

          const raw = await sendPromptWithRetry(pg, prompt, {
            validate: validateJsonResponse,
            label: `[create-image-prompts] batch ${batchIndex}/${totalBatches} ${batchId} (profile ${profileNum})`,
          });

          const imagePromptsPayload = JSON.parse(raw);
          const imagePrompts = imagePromptsPayload.image_prompts;

          imagePromptsResults[i] = imagePrompts;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[create-image-prompts] batch ${batchIndex}/${totalBatches} ${batchId} lỗi profile ${profileNum}: ${msg}`);
          imagePromptsResults[i] = null;
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

  const failedCount = imagePromptsResults.filter(r => r === null).length;
  if (failedCount > 0) {
    throw new Error(`createImagePrompts: ${failedCount}/${totalBatches} batch thất bại`);
  }

  let convertedImagePrompts = [];
  for (const imagePrompts of imagePromptsResults) {
    if (!imagePrompts || imagePrompts.length === 0) continue;
    convertedImagePrompts.push(...imagePrompts);
  }
  return convertedImagePrompts;
}
