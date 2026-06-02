import { NICHE_CONFIGS } from './niche-config.js';
import { formatNumberedTranscript } from './createBeats.js';
import { STYLE_CONFIGS } from './style-config.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';
import { sendPromptWithRetry, validateJsonResponse } from '../../../llm/index.js';

export const promptDetectSeniorNicheFromTranscript = ({ availableNiches, transcriptSample }) => `
You are a niche classifier for Japanese senior YouTube educational videos.

Your task is to detect the most suitable niche_id from the provided available niche list.

You must choose ONLY from the provided available_niches.
Do not invent a new niche_id.

━━━━━━━━━━━━━━━━━━
AVAILABLE NICHES
━━━━━━━━━━━━━━━━━━
${JSON.stringify(availableNiches, null, 2)}

━━━━━━━━━━━━━━━━━━
TRANSCRIPT SAMPLE
━━━━━━━━━━━━━━━━━━
${JSON.stringify(transcriptSample, null, 2)}

━━━━━━━━━━━━━━━━━━
TASK
━━━━━━━━━━━━━━━━━━
Analyze the transcript sample and classify the video into the best matching niche.

Consider:
- main topic
- repeated keywords
- viewer problem
- promised benefit
- emotional angle
- whether the video is about money, pension, scam, smartphone, care, health, loneliness, food, home safety, inheritance, end-of-life planning, or public benefits

━━━━━━━━━━━━━━━━━━
CLASSIFICATION RULES
━━━━━━━━━━━━━━━━━━
- Choose exactly one primary detected_niche_id.
- You may choose up to 3 secondary_niche_ids.
- detected_niche_id must be one of the available niche_id values.
- secondary_niche_ids must also be from the available niche list.
- Do not create new niche IDs.
- Do not classify based on one keyword only; use the whole context.
- If the transcript mixes topics, choose the niche that dominates the main teaching goal.
- If uncertain, lower the confidence score and set needs_manual_review to true.

━━━━━━━━━━━━━━━━━━
CONFIDENCE RULES
━━━━━━━━━━━━━━━━━━
Use confidence from 0 to 1.

0.90–1.00:
Very clear niche. Many strong signals.

0.80–0.89:
Clear niche. Safe to auto-route.

0.60–0.79:
Somewhat mixed or incomplete. Manual review recommended.

Below 0.60:
Unclear. Manual review required.

needs_manual_review:
- false if confidence >= 0.80
- true if confidence < 0.80

━━━━━━━━━━━━━━━━━━
STYLE RECOMMENDATION RULES
━━━━━━━━━━━━━━━━━━
Recommend style_id based on the detected niche and content tone.

Common mapping:
- pension, taxes, public benefits, inheritance: soft_anime_infographic or clean_tv_slide
- scam, smartphone risk, home safety, disaster, heatstroke: warning_explainer
- loneliness, end-of-life planning, parent care, food lifestyle, sleep, hobbies: gentle_lifestyle
- realistic emotional content: cinematic_senior_documentary

━━━━━━━━━━━━━━━━━━
TEXT RENDERING RECOMMENDATION
━━━━━━━━━━━━━━━━━━
Recommend text mode:
- ai_generated_text: for infographic, checklist, warning, comparison, pension, money, public support
- no_text: for lifestyle, emotional, family discussion, loneliness, gentle story
- minimal_label_text: for sensitive warning or lifestyle scenes needing only one label

━━━━━━━━━━━━━━━━━━
OUTPUT JSON SCHEMA
━━━━━━━━━━━━━━━━━━
Return valid JSON only.

{
  "detected_niche_id": "string",
  "secondary_niche_ids": ["string"],
  "confidence": number,
  "needs_manual_review": boolean,

  "reasoning_summary": "string",
  "matched_signals": ["string"],
  "dominant_topic_ja": "string",
  "viewer_problem_ja": "string",
  "content_goal_ja": "string",

  "recommended_style_id": "string",
  "recommended_text_rendering_mode": "ai_generated_text | no_text | minimal_label_text | code_overlay_text",
  "scene_density_level": "high | medium | low",

  "routing_notes": "string"
}

━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━
- Output JSON only.
- Do not include markdown.
- Do not explain outside JSON.
- detected_niche_id must exist in available_niches.
- confidence must be a number from 0 to 1.
`;

export function createTranscriptSampleForNicheDetection(lines, options = {}) {
  const { openingLines = 120, middleLines = 80, endingLines = 80 } = options;

  const total = lines.length;

  const opening = lines.slice(0, Math.min(openingLines, total));

  const middleStart = Math.max(0, Math.floor(total / 2) - Math.floor(middleLines / 2));
  const middle = lines.slice(middleStart, Math.min(total, middleStart + middleLines));

  const ending = lines.slice(Math.max(0, total - endingLines));

  return {
    opening_lines: formatNumberedTranscript(opening),
    middle_lines: formatNumberedTranscript(middle),
    ending_lines: formatNumberedTranscript(ending),
  };
}

export function createAvailableNichesForDetection() {
  return Object.values(NICHE_CONFIGS).map(niche => ({
    niche_id: niche.niche_id,

    // emotional_tone: niche.emotional_tone,
    // preferred_beat_types: niche.preferred_beat_types,
    // visual_keywords: niche.visual_keywords,
    core_tags_ja: niche.metadata_rules?.core_tags_ja || [],
    default_style_id: niche.default_style_id,
    // default_text_rendering_mode: niche.default_text_rendering_mode,
  }));
}

export function resolveDetectedNicheConfig({
  detectionResult,
  nicheConfigs,
  styleConfigs,
  fallbackNicheId = 'senior_general_educational',
}) {
  const confidence = detectionResult.confidence ?? 0;
  const detectedNicheId = detectionResult.detected_niche_id;

  const finalNicheId = confidence >= 0.6 && nicheConfigs[detectedNicheId] ? detectedNicheId : fallbackNicheId;

  const nicheConfig = nicheConfigs[finalNicheId];

  const styleId = detectionResult.recommended_style_id || nicheConfig.default_style_id;

  const styleConfig = styleConfigs[styleId] || styleConfigs[nicheConfig.default_style_id];

  return {
    niche_id: finalNicheId,
    style_id: styleConfig.style_id,
    niche_config: nicheConfig,
    style_config: styleConfig,
    detection: {
      ...detectionResult,
      auto_accepted: confidence >= 0.8,
      fallback_used: finalNicheId !== detectedNicheId,
    },
  };
}

export async function main(transcriptObjects) {
  const availableNiches = createAvailableNichesForDetection();
  console.log('🚀 ~ main ~ availableNiches:', availableNiches);
  const transcriptSample = createTranscriptSampleForNicheDetection(transcriptObjects);

  const prompt = promptDetectSeniorNicheFromTranscript({ availableNiches, transcriptSample });

  const { context, page } = await openChromeProfile({ profile: 4 });

  try {
    await openChatPage(page, { thinkingMode: false });

    const raw = await sendPromptWithRetry(page, prompt, {
      validate: validateJsonResponse,
      label: 'detect-niche',
    });

    return resolveDetectedNicheConfig({ detectionResult: JSON.parse(raw), nicheConfigs: NICHE_CONFIGS, styleConfigs: STYLE_CONFIGS });
  } finally {
    await context.close().catch(() => {});
  }
}
