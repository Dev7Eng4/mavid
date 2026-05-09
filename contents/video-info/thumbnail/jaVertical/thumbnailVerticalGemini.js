/**
 * Pipeline Gemini 1 bước cho `thumbnailPromptKey === 'jaThumbnailVertical'`
 * (xem `contents/prompts/ja/createThumbnailVertical.js`: `promptToCreateBottomTextThumbnailSpec`).
 *
 * Gemini trả JSON spec (copy + visual_prompt) → Flow tạo nền → ghép chữ đáy + quote trên.
 */
import path from 'path';
import { openChatPage, sendPromptWithRetry, stripJsonCodeFence } from '../../../llm/index.js';
import { openChromeProfile } from '../../../scripts/makeChromeProfile.js';
import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { runCreateThumbnailFlow } from '../runCreateThumbnailFlow.js';
import { renderThumbnailVerticalFlowCompositeToPath } from './thumbnailComposite.cli.js';

/**
 * Tiền tố/ghi chú ghép vào prompt (`promptToCreateBottomTextThumbnailSpec`).
 * Truyền `visualPromptConstant` khi gọi để đổi preset (vd. `VISUAL_PROMPT_CONSTANTS.anime`).
 */
export const VISUAL_PROMPT_CONSTANTS = {
  cinematic: {
    positivePrefix: `
Create a realistic cinematic Japanese YouTube thumbnail background.
Live-action Japanese TV drama style.
Realistic Japanese characters, emotional acting, cinematic lighting, shallow depth of field, high contrast, dramatic composition.
The scene must look like a serious real-life drama, not a fantasy image.
`,
    negativeRules: `
Do not create anime, manga, cartoon, illustration, 3D render, doll-like skin, plastic face, fantasy armor, exaggerated surreal effects.
No text, no Japanese characters, no subtitles, no speech bubbles, no logos, no watermark.
The final Japanese thumbnail text will be added later by code.
`,
    safeAreaRules: `
Keep the bottom 28 percent darker, cleaner, and less detailed for large Japanese text overlay.
Keep character faces in the upper and middle areas.
Avoid placing important faces, hands, documents, or evidence objects in the bottom text area.
`,
  },

  anime: {
    positivePrefix: `
Create a dramatic Japanese anime-style YouTube thumbnail background.
Expressive anime characters, bold lighting, vivid but controlled colors, strong emotional contrast, clean composition, high-impact drama framing.
The style should feel like a serious Japanese drama anime thumbnail, not cute or childish.
`,
    negativeRules: `
Do not create photorealistic live-action, 3D render, western cartoon, chibi, kawaii mascot style, soft pastel slice-of-life mood.
No text, no Japanese characters, no subtitles, no speech bubbles, no logos, no watermark.
The final Japanese thumbnail text will be added later by code.
`,
    safeAreaRules: `
Keep the bottom 28 percent darker, cleaner, and less detailed for large Japanese text overlay.
Keep character faces large and readable in the upper and middle areas.
Avoid placing important faces or evidence objects in the bottom text area.
`,
  },
};

const VISUAL_STYLE_OPTIONS = Object.keys(VISUAL_PROMPT_CONSTANTS);

/** @param {unknown} tex */
function textColorLooksValid(tex) {
  if (!tex || typeof tex !== 'object') return false;
  const b1 = /** @type {Record<string, unknown>} */ (tex).bottom_line_1;
  const b2 = /** @type {Record<string, unknown>} */ (tex).bottom_line_2;
  if (!b1 || typeof b1 !== 'object' || !b2 || typeof b2 !== 'object') return false;
  if (typeof b1.fill !== 'string' || !b1.fill.trim()) return false;
  if (typeof b1.stroke !== 'string' || !b1.stroke.trim()) return false;
  if (typeof b2.fill !== 'string' || !b2.fill.trim()) return false;
  if (typeof b2.stroke !== 'string' || !b2.stroke.trim()) return false;
  const tq = /** @type {Record<string, unknown>} */ (tex).top_quote;
  if (!tq || typeof tq !== 'object') return false;
  if (typeof tq.fill !== 'string' || !tq.fill.trim()) return false;
  if (typeof tq.stroke !== 'string' || !tq.stroke.trim()) return false;
  return true;
}

/** @param {string} raw */
function validateBottomTextThumbnailSpecJson(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) throw new Error('Gemini trả về response rỗng.');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object.');
  if (typeof parsed.detected_niche !== 'string' || !parsed.detected_niche.trim()) {
    throw new Error('Thiếu detected_niche.');
  }
  const tc = parsed.thumbnail_copy;
  if (!tc || typeof tc !== 'object') throw new Error('Thiếu thumbnail_copy.');
  if (typeof tc.bottom_line_1 !== 'string' || !tc.bottom_line_1.trim()) throw new Error('Thiếu bottom_line_1.');
  if (typeof tc.bottom_line_2 !== 'string' || !tc.bottom_line_2.trim()) throw new Error('Thiếu bottom_line_2.');
  if (typeof tc.top_quote_enabled !== 'boolean') throw new Error('Thiếu top_quote_enabled (boolean).');
  if (typeof tc.top_quote !== 'string') throw new Error('Thiếu top_quote.');
  if (tc.top_quote_enabled && !tc.top_quote.trim()) {
    throw new Error('top_quote_enabled true nhưng top_quote rỗng.');
  }
  if (!textColorLooksValid(parsed.text_color)) throw new Error('Thiếu hoặc sai text_color (fill/stroke từng dòng).');
  if (typeof parsed.visual_prompt !== 'string' || !parsed.visual_prompt.trim()) throw new Error('Thiếu visual_prompt.');
}

/**
 * @param {object} params
 * @param {Record<string, any>} params.prompts
 * @param {string} params.title
 * @param {string | object} params.summary
 * @param {string} params.outputDir
 * @param {string} params.logTag
 * @param {string} [params.visualStyle]
 * @param {typeof VISUAL_PROMPT_CONSTANTS.cinematic | { positivePrefix?: string, negativeRules?: string, safeAreaRules?: string }} [params.visualPromptConstant]
 * @returns {Promise<Record<string, unknown>>} — object JSON Gemini (gom visual_prompt + copy + colors cho composite)
 */
export async function generateBottomTextThumbnailJaVertical({
  prompts,
  title,
  summary,
  outputDir,
  logTag,
  visualStyle = VISUAL_STYLE_OPTIONS[0],
  visualPromptConstant = VISUAL_PROMPT_CONSTANTS[visualStyle],
}) {
  if (typeof prompts.promptToCreateBottomTextThumbnailSpec !== 'function') {
    throw new Error('prompts.promptToCreateBottomTextThumbnailSpec không có trong gói ngôn ngữ — không thể chạy jaThumbnailVertical.');
  }

  const geminiPrompt = prompts.promptToCreateBottomTextThumbnailSpec({
    title,
    summary: JSON.stringify(summary, null, 2),
    visualStyle,
    visualPromptConstant,
  });

  const { context: ctx, page: pg } = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
  /** @type {Record<string, unknown>} */
  let specResult;
  try {
    await openChatPage(pg);
    const rawResponse = await sendPromptWithRetry(pg, geminiPrompt, {
      maxRetries: 2,
      validate: validateBottomTextThumbnailSpecJson,
      label: `${logTag} jaThumbnailVertical bottom-text spec`,
    });
    specResult = JSON.parse(stripJsonCodeFence(rawResponse));
    console.log(`[${logTag}] jaThumbnailVertical → đã nhận JSON spec (copy + visual_prompt).`);
  } finally {
    await ctx.close().catch(() => {});
  }

  const flowPrompt = String(specResult.visual_prompt || '').trim();
  if (!flowPrompt) throw new Error('jaThumbnailVertical: visual_prompt rỗng.');
  console.log(`[${logTag}] jaThumbnailVertical → mở Flow với visual_prompt.`);
  await runCreateThumbnailFlow({
    prompt: flowPrompt,
    pathSave: outputDir,
    exportName: 'flow-thumbnail',
  });

  const flowThumbPath = path.join(outputDir, 'flow-thumbnail.jpg');
  console.log(`[${logTag}] jaThumbnailVertical → ghép quote + 2 dòng đáy lên ảnh Flow.`);
  await renderThumbnailVerticalFlowCompositeToPath({
    backgroundImagePath: flowThumbPath,
    flowLayout: specResult,
    outPath: flowThumbPath,
  });
  return specResult;
}
