/**
 * Tạo `flow-thumbnail.jpg` từ title/summary (thường là Gemini output).
 *
 * Quy trình chung:
 *  1. `loadPromptByLanguage(language)` — chọn gói prompt theo ngôn ngữ (fallback ja).
 *  2. `resolveThumbnailPromptBuilder(prompts, thumbnailPromptKey)` — chọn builder + có cần ảnh tham chiếu.
 *  3. Build prompt cho Flow:
 *     - Mặc định: `build(title, summary)`.
 *     - `thumbnailPromptKey === 'jaFulLText'`: Gemini (profile 4) chạy
 *       `promptToCreateTextForThumbnailFullText` để lấy JSON `{ lines, colors }`, rồi render
 *       ảnh bằng Playwright (`jaFullText/thumbnail.cli.js` → `jaFullText/thumbnailFullText.html`), không gọi Flow.
 *     - `thumbnailPromptKey === 'jaThumbnailHorizontal'`: Gemini 3 bước (`jaHorizontal/thumbnailHorizontalGemini.js`)
 *       — phân tích → copy JP → `visual_prompt`; `runCreateThumbnailFlow`, rồi Playwright ghép chữ từ JSON visual
 *       (`jaHorizontal/thumbnailComposite.cli.js` + `thumbnailHorizontalFlowComposite.html`) lên `flow-thumbnail.jpg`.
 *     - `thumbnailPromptKey === 'jaThumbnailVertical'`: Gemini một bước `promptToCreateBottomTextThumbnailSpec`
 *       (`createThumbnailVertical.js`) → `visual_prompt`; `runCreateThumbnailFlow`, rồi ghép chữ đáy + quote trên
 *       (`jaVertical/thumbnailComposite.cli.js` + `thumbnailVerticalFlowComposite.html`).
 *  4. Các style khác: `runCreateThumbnailFlow(...)` — Flow lưu `outputDir/flow-thumbnail.jpg`.
 *  5. `optimizeFlowThumbnailJpegIfLarge(...)` — re-encode JPG nếu vượt ngưỡng kích thước.
 *
 * Caller chịu trách nhiệm bao try/catch nếu muốn không dừng pipeline khi Flow lỗi.
 */
import path from 'path';
import { openChatPage, sendPromptWithRetry, stripJsonCodeFence } from '../../llm/index.js';
import { loadPromptByLanguage, resolveThumbnailPromptBuilder } from '../../prompts/index.js';
import { openChromeProfile } from '../../scripts/makeChromeProfile.js';
import { renderThumbnailFullTextToPath } from './jaFullText/thumbnail.cli.js';
import { generateAnalysisAndTextForThumbnailHorizontal } from './jaHorizontal/thumbnailHorizontalGemini.js';
import { generateBottomTextThumbnailJaVertical } from './jaVertical/thumbnailVerticalGemini.js';
import { runCreateThumbnailFlow } from './runCreateThumbnailFlow.js';
import { optimizeFlowThumbnailJpegIfLarge } from './thumbnailOptimize.util.js';
import { PLAYWRIGHT_PROFILES } from '../../constants/playwright-profile.js';

/**
 * Validator cho sendPromptWithRetry: phải parse được JSON và có đủ
 * lines.L1..L5 + colors.canvas_from / canvas_to.
 * @param {string} raw
 */
function validateThumbnailFulLTextJson(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) throw new Error('Gemini trả về response rỗng.');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object.');
  const { thumbnail_copy, text_styles, background } = parsed;
  if (!thumbnail_copy || !text_styles || !background) throw new Error('Thiếu trường thumbnail_copy/text_styles/background.');
  for (const k of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    if (!thumbnail_copy[k] || !thumbnail_copy[k].trim()) {
      throw new Error(`Thiếu thumbnail_copy.${k}`);
    }
    if (!text_styles[k] || !text_styles[k].fill) {
      throw new Error(`Thiếu text_styles.${k}.fill`);
    }
  }
  if (!background.base_from || !background.base_to) {
    throw new Error('Thiếu background.base_from / base_to');
  }
}

/**
 * Mở Gemini (profile 4), chạy `promptToCreateTextForThumbnailFullText` rồi parse JSON
 * trả về object `{ lines, colors }` để render thumbnail (Playwright, không qua Flow).
 *
 * @param {object} params
 * @param {Record<string, any>} params.prompts
 * @param {string} params.title
 * @param {string} params.summary
 * @param {string} params.logTag
 * @returns {Promise<{ lines: Record<string,string>, colors: Record<string,string> }>}
 */
async function generateFulLTextLinesColorsViaGemini({ prompts, title, summary, logTag }) {
  if (typeof prompts.promptToCreateTextForThumbnailFullText !== 'function') {
    throw new Error('prompts.promptToCreateTextForThumbnailFullText không có trong gói ngôn ngữ — không thể chạy jaFulLText.');
  }
  const geminiPrompt = prompts.promptToCreateTextForThumbnailFullText(title, JSON.stringify(summary, null, 2));

  const { context: ctx, page: pg } = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
  try {
    await openChatPage(pg);
    const rawResponse = await sendPromptWithRetry(pg, geminiPrompt, {
      maxRetries: 2,
      validate: validateThumbnailFulLTextJson,
      label: `${logTag} jaFulLText lines/colors`,
      requireCodeBlock: false,
    });
    const parsed = JSON.parse(stripJsonCodeFence(rawResponse));
    console.log(`[${logTag}] jaFulLText → đã nhận thông tin từ Gemini.`, parsed);
    return parsed;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * @param {object} opts
 * @param {string} opts.title — `titleGemini` đã trim
 * @param {string} opts.summary — `summaryGemini` đã trim
 * @param {string} opts.outputDir — thư mục lưu (`{outputDir}/flow-thumbnail.jpg`)
 * @param {string|null|undefined} opts.language — ngôn ngữ load prompt (null/'' → fallback)
 * @param {string|null|undefined} opts.thumbnailPromptKey — key style prompt (rỗng = `promptToCreateThumbnail` mặc định)
 * @param {string} [opts.logTag='thumbnail-flow'] — prefix log để phân biệt flow gọi (vd. `update-meta`)
 */
export async function generateFlowThumbnailFromGemini({
  title,
  summary,
  outputDir,
  language,
  thumbnailPromptKey,
  logTag = 'thumbnail-flow',
}) {
  const prompts = await loadPromptByLanguage(language);

  if (thumbnailPromptKey === 'jaFulLText') {
    const { thumbnail_copy, text_styles, background } = await generateFulLTextLinesColorsViaGemini({ prompts, title, summary, logTag });
    await renderThumbnailFullTextToPath({
      thumbnail_copy,
      text_styles,
      background,
      outPath: path.join(outputDir, 'flow-thumbnail.jpg'),
    });
  } else if (thumbnailPromptKey === 'jaThumbnailHorizontal') {
    await generateAnalysisAndTextForThumbnailHorizontal({
      prompts,
      title,
      summary,
      outputDir,
      logTag,
    });
  } else if (thumbnailPromptKey === 'jaThumbnailVertical') {
    await generateBottomTextThumbnailJaVertical({
      prompts,
      title,
      summary,
      outputDir,
      logTag,
    });
  } else {
    const { build, isNeedImage } = resolveThumbnailPromptBuilder(prompts, thumbnailPromptKey);
    const flowPrompt = build(title, summary);
    await runCreateThumbnailFlow({
      prompt: flowPrompt,
      pathSave: outputDir,
      exportName: 'flow-thumbnail',
      isNeedImage: Boolean(isNeedImage),
    });
  }
  const flowThumbPath = path.join(outputDir, 'flow-thumbnail.jpg');
  await optimizeFlowThumbnailJpegIfLarge(flowThumbPath);
  console.log(`[${logTag}] Đã lưu flow-thumbnail.jpg`);
}
