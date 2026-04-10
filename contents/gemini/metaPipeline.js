/**
 * Pipeline Gemini: tóm tắt SRT theo chunk → metadata (title, description, tags, summary).
 */
import { DEFAULT_PROMPT_LANG, GEMINI_CHUNK_SIZE } from '../constants/index.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import { srtToPlainText } from '../utils/srt.util.js';
import { openGeminiPage, sendPromptToGemini } from './browser.util.js';
import { parseCreateMetaInfoResponse } from './metaParser.util.js';

/**
 * Trên cùng một tab Gemini: tóm tắt SRT theo chunk → metadata tổng hợp.
 * @param {import('playwright').Page} page
 * @param {{ srtContent: string, language?: string }} opts
 */
export async function runGeminiVideoMetaPrompts(page, { srtContent, language }) {
  const lang = String(language || DEFAULT_PROMPT_LANG).toUpperCase();

  const prompts = await loadPromptByLanguage(lang);

  await page.waitForTimeout(1500);

  const cues = srtContent
    .split(/\n\n+/)
    .map(c => c.trim())
    .filter(Boolean);

  const summaries = [];
  const totalChunks = Math.ceil(cues.length / GEMINI_CHUNK_SIZE.SUMMARY_CONTENT) || 1;

  for (let i = 0; i < cues.length; i += GEMINI_CHUNK_SIZE.SUMMARY_CONTENT) {
    const chunk = cues.slice(i, i + GEMINI_CHUNK_SIZE.SUMMARY_CONTENT).join('\n\n');
    const chunkIndex = Math.floor(i / GEMINI_CHUNK_SIZE.SUMMARY_CONTENT) + 1;

    console.log(`Đang tóm tắt phần ${chunkIndex}/${totalChunks}...`);

    const plainChunk = srtToPlainText(chunk);

    const prompt = prompts.promptCreateSummaryChunk(plainChunk);
    const result = await sendPromptToGemini(page, prompt);

    const cleanResult = result.trim();
    summaries.push(cleanResult);

    if (i + GEMINI_CHUNK_SIZE.SUMMARY_CONTENT < cues.length) {
      await page.waitForTimeout(2000);
    }
  }

  let finalSummaryForMeta = summaries.join('\n');

  if (summaries.length >= 2) {
    const mergePrompt = prompts.promptCreateFinalSummary(finalSummaryForMeta);
    finalSummaryForMeta = await sendPromptToGemini(page, mergePrompt);
    await page.waitForTimeout(1500);
  }

  console.log('\nĐang tạo metadata từ bản tóm tắt tổng hợp...');

  const metaRaw = await sendPromptToGemini(page, prompts.promptCreateVideoMeta(finalSummaryForMeta));

  const parsed = parseCreateMetaInfoResponse(metaRaw);

  return {
    ...parsed,
    summary: finalSummaryForMeta,
  };
}

/**
 * Meta (title, description, tags) trên một page có sẵn.
 * @param {import('playwright').Page} page
 * @param {{ srtContent?: string, language?: string }} options
 */
export async function internalUpdateVideoMeta(page, options = {}) {
  const { srtContent = '', language } = options;

  await openGeminiPage(page);

  const meta = await runGeminiVideoMetaPrompts(page, { srtContent, language });
  return meta;
}
