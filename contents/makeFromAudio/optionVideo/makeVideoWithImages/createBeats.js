import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { openChatPage, sendPromptWithRetry, validateJsonResponse } from '../../../llm/index.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';

const BEAT_TYPES = [
  'opening_hook',
  'problem_statement',
  'basic_explanation',
  'common_misunderstanding',
  'risk_warning',
  'important_condition',
  'comparison',
  'step_by_step_guide',
  'checklist',
  'example_case',
  'money_point',
  'safety_point',
  'family_discussion',
  'emotional_reflection',
  'summary_takeaway',
  'call_to_action',
];

// 20 minutes -> 60/90
// 30 minutes -> 70/100
// 40 minutes -> 90/120
// 60 minutes -> 100/140
export function createTranscriptBatchesForParallelVisualBeats(lines, options = {}) {
  const { targetLinesPerBatch = 90, previousPreviewLines = 10, nextPreviewLines = 10 } = options;

  const batches = [];

  for (let startIndex = 0; startIndex < lines.length; startIndex += targetLinesPerBatch) {
    const endIndex = Math.min(startIndex + targetLinesPerBatch, lines.length);

    const previousStartIndex = Math.max(0, startIndex - previousPreviewLines);
    const nextEndIndex = Math.min(lines.length, endIndex + nextPreviewLines);

    const previousLines = lines.slice(previousStartIndex, startIndex);
    const currentLines = lines.slice(startIndex, endIndex);
    const nextLines = lines.slice(endIndex, nextEndIndex);

    batches.push({
      batchId: String(batches.length + 1).padStart(3, '0'),
      previousLines,
      currentLines,
      nextLines,
      startLineId: currentLines[0]?.id,
      endLineId: currentLines[currentLines.length - 1]?.id,
    });
  }

  return batches;
}

export const promptExtractVisualBeatsFromTranscriptBatch = ({
  batchId,
  nicheConfig,
  styleConfig,
  previousPreviewContext = '',
  currentNumberedTranscript,
  nextPreviewContext = '',
}) => `
You are a Japanese senior educational video content analyst.

Your task is to convert ONE transcript batch into VISUAL BEATS.

A visual beat is a small meaning unit that can later become one image/slide in a YouTube video.

You are NOT creating final scenes.
You are NOT writing final image prompts.
You are NOT creating thumbnails.
You are ONLY extracting visual beats from the CURRENT TRANSCRIPT BATCH.

━━━━━━━━━━━━━━━━━━
LANGUAGE RULES
━━━━━━━━━━━━━━━━━━
- The transcript is Japanese.
- main_message_ja, viewer_question_ja, and on_screen_text_seed_ja must be in Japanese.
- Explanatory fields may be in English or Vietnamese.
- Output JSON only.
- Do not include markdown.
- Do not include comments outside JSON.

━━━━━━━━━━━━━━━━━━
NICHE CONFIG
━━━━━━━━━━━━━━━━━━
${JSON.stringify(nicheConfig, null, 2)}

━━━━━━━━━━━━━━━━━━
STYLE CONFIG
━━━━━━━━━━━━━━━━━━
${JSON.stringify(styleConfig, null, 2)}

━━━━━━━━━━━━━━━━━━
PREVIOUS PREVIEW CONTEXT
━━━━━━━━━━━━━━━━━━
These are the lines immediately before the current batch.

Use them only to understand continuity.
Do NOT create visual beats from previous_preview_context.
Do NOT include these line IDs in source_line_ids.
Do NOT summarize these lines as current content.

${previousPreviewContext}

━━━━━━━━━━━━━━━━━━
CURRENT TRANSCRIPT BATCH TO PROCESS
━━━━━━━━━━━━━━━━━━
Create visual beats ONLY from the following current transcript batch.

${currentNumberedTranscript}

━━━━━━━━━━━━━━━━━━
NEXT PREVIEW CONTEXT
━━━━━━━━━━━━━━━━━━
These are the lines immediately after the current batch.

Use them only to avoid cutting an idea incorrectly.
Do NOT create visual beats from next_preview_context.
Do NOT include these line IDs in source_line_ids.
Do NOT summarize these lines as current content.

${nextPreviewContext}

━━━━━━━━━━━━━━━━━━
WHAT IS A VISUAL BEAT?
━━━━━━━━━━━━━━━━━━
A visual beat is one clear content idea that can later become one image or slide.

Good visual beat:
- has one main message
- has clear source_line_ids
- can be represented visually
- is useful for senior Japanese viewers
- is short enough to become one scene

Bad visual beat:
- contains too many different ideas
- combines unrelated topics
- ignores important warnings or conditions
- copies transcript sentences directly
- creates facts not present in the transcript
- uses line IDs from preview contexts

━━━━━━━━━━━━━━━━━━
SEGMENTATION RULES
━━━━━━━━━━━━━━━━━━
Split into separate visual beats when:
- a new topic or concept appears
- a benefit and a risk are both mentioned
- a comparison appears
- a condition, exception, or warning appears
- the speaker moves from explanation to advice
- a checklist or step-by-step instruction begins
- the emotional function changes, such as from hook to explanation, or from warning to solution

Merge lines into one visual beat when:
- they repeat the same idea
- they are only transition phrases
- they are generic greetings
- they are subscribe/like/channel promotion
- they do not add new useful information

Do not force a fixed number of beats.
The number of visual beats must follow the actual content density.

For Japanese senior educational videos:
- Prefer clear, frequent visual changes.
- Do not over-compress.
- If two adjacent lines explain two different things, split them.
- If several lines explain one simple point, merge them.

━━━━━━━━━━━━━━━━━━
BOUNDARY HANDLING RULES
━━━━━━━━━━━━━━━━━━
If the first lines of the current batch continue an idea from previous_preview_context:
- Create a visual beat only from the current batch lines.
- Use the previous preview only to understand the meaning.
- Do not include previous preview line IDs.

If the last lines of the current batch introduce an idea that continues into next_preview_context:
- Create a visual beat from the current batch lines only if the idea is understandable enough.
- If the idea is incomplete, create a boundary_pending beat with the current line IDs only.
- Mark "boundary_status": "continues_next".

━━━━━━━━━━━━━━━━━━
FACTUAL SAFETY
━━━━━━━━━━━━━━━━━━
- Use only information supported by the current transcript batch.
- Preview contexts may be used only for continuity, not for adding unsupported facts.
- Do not invent numbers, laws, dates, medical claims, legal outcomes, pension amounts, or official rules.
- If the transcript expresses uncertainty, preserve uncertainty.
- Do not convert general advice into guaranteed results.
- Do not create fear-based exaggeration.

━━━━━━━━━━━━━━━━━━
VISUAL TYPE GUIDANCE
━━━━━━━━━━━━━━━━━━
Choose suggested_visual_type from the style_config if possible.

Examples:
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
OUTPUT JSON SCHEMA
━━━━━━━━━━━━━━━━━━
Return JSON in exactly this structure:

{
  "batch_id": "${batchId}",
  "processed_line_range": {
    "start_line_id": number,
    "end_line_id": number
  },
  "batch_summary_ja": "string",
  "visual_beats": [
    {
      "beat_id": "VB_${batchId}_001",
      "source_line_ids": [number],
      "start_line_id": number,
      "end_line_id": number,

      "boundary_status": "complete | continues_next | continues_from_previous",

      "beat_type": "opening_hook | problem_statement | basic_explanation | common_misunderstanding | risk_warning | important_condition | comparison | step_by_step_guide | checklist | example_case | money_point | safety_point | family_discussion | emotional_reflection | summary_takeaway | call_to_action | boundary_pending",

      "main_message_ja": "string",
      "main_message_vi": "string",
      "viewer_question_ja": "string",

      "visual_intent": "string",
      "suggested_visual_type": "string",

      "content_importance": "high | medium | low",
      "scene_density_hint": "short | normal | long",

      "requires_chart": boolean,
      "requires_character": boolean,
      "requires_warning_icon": boolean,
      "requires_checklist": boolean,

      "on_screen_text_seed_ja": ["string"],
      "notes_for_next_step": "string"
    }
  ],
  "ignored_lines": [
    {
      "line_ids": [number],
      "reason": "greeting | subscribe_request | filler | repeated_content | off_topic"
    }
  ],
  "boundary_notes": {
    "starts_with_continuation": boolean,
    "ends_with_incomplete_idea": boolean,
    "notes": "string"
  }
}

━━━━━━━━━━━━━━━━━━
OUTPUT QUALITY RULES
━━━━━━━━━━━━━━━━━━
- Output valid JSON only.
- Every visual beat must have source_line_ids.
- source_line_ids must come only from CURRENT TRANSCRIPT BATCH.
- Do not include previous preview line IDs in source_line_ids.
- Do not include next preview line IDs in source_line_ids.
- Beat IDs must be unique inside the batch.
- on_screen_text_seed_ja should be short, natural Japanese.
- on_screen_text_seed_ja is only a seed, not final slide copy.
- Keep each visual beat focused on one idea.
`;

export function formatNumberedTranscript(lines) {
  return lines.map(line => `[${line.id}] ${line.text}`).join('\n');
}

export async function main(transcriptObjects, nicheConfig, styleConfig) {
  const batches = createTranscriptBatchesForParallelVisualBeats(transcriptObjects);

  const totalBatches = batches.length;
  const beatsResults = new Array(batches.length).fill(null);

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
        console.log(`[create-beats] batch ${batchIndex}/${totalBatches} ${batchId} (profile ${profileNum})`);
        // onBatchStart?.({ batchIndex, batchId, total: totalBatches });

        try {
          if (!primingDone) {
            await openChatPage(pg);
            primingDone = true;
          }

          const prompt = promptExtractVisualBeatsFromTranscriptBatch({
            batchId,
            nicheConfig,
            styleConfig,
            previousPreviewContext: formatNumberedTranscript(batch.previousLines),
            currentNumberedTranscript: formatNumberedTranscript(batch.currentLines),
            nextPreviewContext: formatNumberedTranscript(batch.nextLines),
          });

          const raw = await sendPromptWithRetry(pg, prompt, {
            validate: validateJsonResponse,
            label: `[create-beats] batch ${batchIndex}/${totalBatches} ${batchId} (profile ${profileNum})`,
          });

          const beatsPayload = JSON.parse(raw);
          const beats = beatsPayload.visual_beats;

          beatsResults[i] = beats;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[create-beats] batch ${batchIndex}/${totalBatches} ${batchId} lỗi profile ${profileNum}: ${msg}`);
          beatsResults[i] = null;
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

  const failedCount = beatsResults.filter(r => r === null).length;
  if (failedCount > 0) {
    throw new Error(`createBeats: ${failedCount}/${totalBatches} batch thất bại`);
  }

  let convertedBeats = [];
  for (const beat of beatsResults) {
    if (beat.length === 0) continue;

    convertedBeats.push(
      ...beat.map(b => ({
        beat_id: b.beat_id,
        source_line_ids: b.source_line_ids,
        start_line_id: b.start_line_id,
        end_line_id: b.end_line_id,
        boundary_status: b.boundary_status,
        beat_type: b.beat_type,
        main_message_ja: b.main_message_ja,
        visual_intent: b.visual_intent,
        suggested_visual_type: b.suggested_visual_type,
        content_importance: b.content_importance,
        scene_density_hint: b.scene_density_hint,
        requires_chart: b.requires_chart,
        requires_character: b.requires_character,
        requires_warning_icon: b.requires_warning_icon,
        requires_checklist: b.requires_checklist,
        on_screen_text_seed_ja: b.on_screen_text_seed_ja,
        notes_for_next_step: b.notes_for_next_step,
      })),
    );
  }

  return convertedBeats;
}
