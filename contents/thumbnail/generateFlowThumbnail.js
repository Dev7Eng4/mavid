/**
 * Tạo `flow-thumbnail.jpg` từ title/summary (thường là Gemini output).
 *
 * Quy trình chung:
 *  1. `loadPromptByLanguage(language)` — chọn gói prompt theo ngôn ngữ (fallback ja).
 *  2. `resolveThumbnailPromptBuilder(prompts, thumbnailPromptKey)` — chọn builder + có cần ảnh tham chiếu.
 *  3. Build prompt cho Flow:
 *     - Mặc định: `build(title, summary)`.
 *     - `thumbnailPromptKey === 'jaFulLText'`: Gemini (profile 4) chạy
 *       `promptToCreateTextForThumbnail` để lấy JSON `{ lines, colors }`, rồi render
 *       ảnh bằng Playwright (`jaFullText/thumbnail.cli.js` → `jaFullText/thumbnailFullText.html`), không gọi Flow.
 *  4. Các style khác: `runCreateThumbnailFlow(...)` — Flow lưu `outputDir/flow-thumbnail.jpg`.
 *  5. `optimizeFlowThumbnailJpegIfLarge(...)` — re-encode JPG nếu vượt ngưỡng kích thước.
 *
 * Caller chịu trách nhiệm bao try/catch nếu muốn không dừng pipeline khi Flow lỗi.
 */
import path from 'path';
import { openGeminiPage, sendPromptToGeminiWithRetry, stripJsonCodeFence } from '../gemini/browser.util.js';
import { loadPromptByLanguage, resolveThumbnailPromptBuilder } from '../prompts/index.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { renderThumbnailFullTextToPath } from './jaFullText/thumbnail.cli.js';
import { runCreateThumbnailFlow } from './runCreateThumbnailFlow.js';
import { optimizeFlowThumbnailJpegIfLarge } from './thumbnailOptimize.util.js';
import { PLAYWRIGHT_PROFILES } from '../constants/playwright-profile.js';

/**
 * Validator cho sendPromptToGeminiWithRetry: phải parse được JSON và có đủ
 * lines.L1..L5 + colors.canvas_from / canvas_to.
 * @param {string} raw
 */
function validateThumbnailFulLTextJson(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) throw new Error('Gemini trả về response rỗng.');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object.');
  const { lines, colors } = parsed;
  if (!lines || !colors) throw new Error('Thiếu trường lines/colors.');
  for (const k of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    if (typeof lines[k] !== 'string' || !lines[k].trim()) {
      throw new Error(`Thiếu lines.${k}`);
    }
    if (typeof colors[k] !== 'string' || !colors[k].trim()) {
      throw new Error(`Thiếu colors.${k}`);
    }
  }
  if (typeof colors.canvas_from !== 'string' || typeof colors.canvas_to !== 'string') {
    throw new Error('Thiếu colors.canvas_from / canvas_to');
  }
}

/**
 * Mở Gemini (profile 4), chạy `promptToCreateTextForThumbnail` rồi parse JSON
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
  if (typeof prompts.promptToCreateTextForThumbnail !== 'function') {
    throw new Error('prompts.promptToCreateTextForThumbnail không có trong gói ngôn ngữ — không thể chạy jaFulLText.');
  }
  const geminiPrompt = prompts.promptToCreateTextForThumbnail(title, summary);

  const { context: ctx, page: pg } = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
  try {
    await openGeminiPage(pg);
    const rawResponse = await sendPromptToGeminiWithRetry(pg, geminiPrompt, {
      maxRetries: 2,
      validate: validateThumbnailFulLTextJson,
      label: `${logTag} jaFulLText lines/colors`,
    });
    const parsed = JSON.parse(stripJsonCodeFence(rawResponse));
    console.log(`[${logTag}] jaFulLText → đã nhận lines/colors từ Gemini.`);
    return { lines: parsed.lines, colors: parsed.colors };
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
  console.log('🚀 ~ generateFlowThumbnailFromGemini ~ thumbnailPromptKey:', thumbnailPromptKey);
  const prompts = await loadPromptByLanguage(language);
  const { build, isNeedImage } = resolveThumbnailPromptBuilder(prompts, thumbnailPromptKey);

  if (thumbnailPromptKey === 'jaFulLText') {
    const { lines, colors } = await generateFulLTextLinesColorsViaGemini({ prompts, title, summary, logTag });
    await renderThumbnailFullTextToPath({
      lines,
      colors,
      outPath: path.join(outputDir, 'flow-thumbnail.jpg'),
    });
  } else {
    const flowPrompt = build(title, summary);
    await runCreateThumbnailFlow({
      prompt: flowPrompt,
      pathSave: outputDir,
      exportName: 'flow-thumbnail',
      isNeedImage: false,
    });
  }
  const flowThumbPath = path.join(outputDir, 'flow-thumbnail.jpg');
  await optimizeFlowThumbnailJpegIfLarge(flowThumbPath);
  console.log(`[${logTag}] Đã lưu flow-thumbnail.jpg`);
}
