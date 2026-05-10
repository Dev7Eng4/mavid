/**
 * Pipeline Gemini 3 bước cho `thumbnailPromptKey === 'jaThumbnailHorizontal'`
 * (xem `contents/prompts/ja/createThumbnailHorizontal.js`).
 */
import path from 'path';
import { openChatPage, sendPromptWithRetry, stripJsonCodeFence } from '../../../llm/index.js';
import { openChromeProfile } from '../../../scripts/makeChromeProfile.js';
import { PLAYWRIGHT_PROFILES } from '../../../constants/playwright-profile.js';
import { runCreateThumbnailFlow } from '../runCreateThumbnailFlow.js';
import { renderThumbnailHorizontalFlowCompositeToPath } from './thumbnailComposite.cli.js';

/** @param {string} raw */
function validateThumbnailHorizontalAnalysisJson(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) throw new Error('Gemini trả về response rỗng.');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object.');
  if (typeof parsed.detected_niche !== 'string') throw new Error('Thiếu detected_niche.');
  if (!parsed.characters || typeof parsed.characters !== 'object') throw new Error('Thiếu characters.');
  if (!parsed.thumbnail_angle || typeof parsed.thumbnail_angle !== 'object') {
    throw new Error('Thiếu thumbnail_angle.');
  }
  if (!parsed.risk_flags || typeof parsed.risk_flags !== 'object') throw new Error('Thiếu risk_flags.');
}

/** @param {string} raw */
function validateThumbnailHorizontalTextJson(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) throw new Error('Gemini trả về response rỗng.');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object.');
  const tc = parsed.thumbnail_copy;
  if (!tc || typeof tc !== 'object') throw new Error('Thiếu thumbnail_copy.');
  for (const k of ['line_1', 'line_2', 'line_3', 'twist_line']) {
    if (typeof tc[k] !== 'string' || !tc[k].trim()) {
      throw new Error(`Thiếu hoặc rỗng thumbnail_copy.${k}`);
    }
  }
}

/** @param {string} raw */
function validateThumbnailHorizontalVisualJson(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) throw new Error('Gemini trả về response rỗng.');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON không phải object.');
  if (typeof parsed.visual_prompt !== 'string' || !parsed.visual_prompt.trim()) {
    throw new Error('Thiếu visual_prompt.');
  }
  const tc = parsed.thumbnail_copy;
  if (!tc || typeof tc !== 'object') throw new Error('Thiếu thumbnail_copy (bước visual cần cho overlay chữ).');
  for (const k of ['line_1', 'line_2', 'line_3', 'twist_line']) {
    if (typeof tc[k] !== 'string' || !tc[k].trim()) {
      throw new Error(`Thiếu hoặc rỗng thumbnail_copy.${k} trong JSON visual.`);
    }
  }
}

/**
 * Gửi bước 1 trên page đã mở Gemini (caller gọi `openChatPage` trước lần đầu trong phiên).
 * @param {import('playwright').Page} pg
 */
async function runAnalysisForThumbnailHorizontalOnPage(pg, { prompts, title, summary, logTag }) {
  if (typeof prompts.promptToAnalysisForThumbnailHorizontal !== 'function') {
    throw new Error('prompts.promptToAnalysisForThumbnailHorizontal không có trong gói ngôn ngữ — không thể chạy jaThumbnailHorizontal.');
  }
  const geminiPrompt = prompts.promptToAnalysisForThumbnailHorizontal(title, JSON.stringify(summary, null, 2));
  const rawResponse = await sendPromptWithRetry(pg, geminiPrompt, {
    maxRetries: 2,
    validate: validateThumbnailHorizontalAnalysisJson,
    label: `${logTag} jaThumbnailHorizontal analysis`,
    requireCodeBlock: false,
  });
  return stripJsonCodeFence(rawResponse).trim();
}

/**
 * Gửi bước 2 trên cùng page (sau bước 1, không cần mở lại chat).
 * @param {import('playwright').Page} pg
 */
async function runTextForThumbnailHorizontalOnPage(pg, { prompts, analysisResult, logTag }) {
  if (typeof prompts.promptToGenerateTextForThumbnailHorizontal !== 'function') {
    throw new Error(
      'prompts.promptToGenerateTextForThumbnailHorizontal không có trong gói ngôn ngữ — không thể chạy jaThumbnailHorizontal.',
    );
  }
  const geminiPrompt = prompts.promptToGenerateTextForThumbnailHorizontal(analysisResult);
  const rawResponse = await sendPromptWithRetry(pg, geminiPrompt, {
    maxRetries: 2,
    validate: validateThumbnailHorizontalTextJson,
    label: `${logTag} jaThumbnailHorizontal text copy`,
    requireCodeBlock: false,
  });
  return stripJsonCodeFence(rawResponse).trim();
}

/**
 * Gửi bước 3 trên cùng page (sau bước 2).
 * @param {import('playwright').Page} pg
 * @param {{ prompts: Record<string, any>, analysisResult: string, textThumbnailResult: string, logTag: string }} params
 */
async function runVisualForThumbnailHorizontalOnPage(pg, { prompts, analysisResult, textThumbnailResult, logTag }) {
  if (typeof prompts.promptToGenerateVisualPromptForThumbnailHorizontal !== 'function') {
    throw new Error(
      'prompts.promptToGenerateVisualPromptForThumbnailHorizontal không có trong gói ngôn ngữ — không thể chạy jaThumbnailHorizontal.',
    );
  }
  const geminiPrompt = prompts.promptToGenerateVisualPromptForThumbnailHorizontal(analysisResult, textThumbnailResult);
  const rawResponse = await sendPromptWithRetry(pg, geminiPrompt, {
    maxRetries: 2,
    validate: validateThumbnailHorizontalVisualJson,
    label: `${logTag} jaThumbnailHorizontal visual prompt`,
    requireCodeBlock: false,
  });
  const parsed = JSON.parse(stripJsonCodeFence(rawResponse));

  return parsed;
}

/**
 * Mở Chrome một lần, chạy bước 1 + 2 + 3 liên tiếp trên Gemini, đóng phiên rồi mở Flow với `visual_prompt`.
 *
 * @param {object} params
 * @param {Record<string, any>} params.prompts
 * @param {string} params.title
 * @param {string} params.summary
 * @param {string} params.outputDir — thư mục lưu `flow-thumbnail.jpg` sau khi chạy Flow
 * @param {string} params.logTag
 * @returns {Promise<{ visual_prompt: string, negative_prompt?: string, [k: string]: unknown }>}
 */
export async function generateAnalysisAndTextForThumbnailHorizontal({ prompts, title, summary, outputDir, logTag }) {
  const { context: ctx, page: pg } = await openChromeProfile({ profile: PLAYWRIGHT_PROFILES[0], visible: true });
  /** @type {{ visual_prompt: string, negative_prompt?: string, [k: string]: unknown }} */
  let visualResult;
  try {
    await openChatPage(pg);
    const analysisResult = await runAnalysisForThumbnailHorizontalOnPage(pg, { prompts, title, summary, logTag });
    console.log(`[${logTag}] jaThumbnailHorizontal → đã nhận JSON phân tích (bước 1).`);
    const textThumbnailResult = await runTextForThumbnailHorizontalOnPage(pg, {
      prompts,
      analysisResult,
      logTag,
    });
    console.log(`[${logTag}] jaThumbnailHorizontal → đã nhận thumbnail_copy (bước 2).`);
    visualResult = await runVisualForThumbnailHorizontalOnPage(pg, {
      prompts,
      analysisResult,
      textThumbnailResult,
      logTag,
    });
    console.log(`[${logTag}] jaThumbnailHorizontal → đã tạo visual_prompt cho Flow (bước 3).`);
  } finally {
    await ctx.close().catch(() => {});
  }

  const flowPrompt = String(visualResult.visual_prompt || '').trim();
  if (!flowPrompt) {
    throw new Error('jaThumbnailHorizontal: visual_prompt rỗng sau bước 3.');
  }
  console.log(`[${logTag}] jaThumbnailHorizontal → mở Flow tạo ảnh với visual_prompt.`);
  await runCreateThumbnailFlow({
    prompt: flowPrompt,
    pathSave: outputDir,
    exportName: 'flow-thumbnail',
  });
  const flowThumbPath = path.join(outputDir, 'flow-thumbnail.jpg');
  console.log(`[${logTag}] jaThumbnailHorizontal → ghép chữ (thumbnail_copy + layout) lên ảnh Flow.`);
  await renderThumbnailHorizontalFlowCompositeToPath({
    backgroundImagePath: flowThumbPath,
    flowLayout: visualResult,
    outPath: flowThumbPath,
  });
  return visualResult;
}
