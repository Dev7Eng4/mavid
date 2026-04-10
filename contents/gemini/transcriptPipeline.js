/**
 * Pipeline Gemini: chỉnh SRT theo chunk (tuần tự hoặc đa tab).
 */
import { GEMINI_CONFIG, GEMINI_CHUNK_SIZE } from '../constants/index.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import { checkSrtMergedCueIndexSequence } from '../utils/srt.util.js';
import { openGeminiPage, sendPromptToGemini } from './browser.util.js';
import { getSrtDurationInMinutes } from './srtTiming.util.js';

/**
 * @param {import('playwright').Page} page
 * @param {string} chunk
 * @param {number} index
 * @param {number} totalChunks
 * @param {{ promptUpdateTranscript: (s: string) => string }} prompts
 */
async function processChunkOnPage(page, chunk, index, totalChunks, prompts) {
  const prompt = prompts.promptUpdateTranscript(chunk);
  console.log(`\n--- Đang mở Gemini và gửi prompt phần ${index + 1}/${totalChunks} ---`);

  await openGeminiPage(page);

  const result = await sendPromptToGemini(page, prompt);

  return { index, result };
}

/** Bỏ fence markdown nếu Gemini bọc ``` / ```srt. */
function stripSrtCodeFence(text) {
  let t = String(text ?? '').trim();
  t = t
    .replace(/^```[^\n]*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  return t;
}

/**
 * @param {import('playwright').BrowserContext} context
 * @param {import('playwright').Page} page
 * @param {string | string[]} rawSrtContent
 * @param {{ language?: string }} options
 */
export async function internalUpdateTranscript(context, page, rawSrtContent, options = {}) {
  const { language } = options;
  const prompts = await loadPromptByLanguage(language);

  const cues =
    typeof rawSrtContent === 'string'
      ? rawSrtContent
          .split(/\n\n+/)
          .map(c => c.trim())
          .filter(Boolean)
      : rawSrtContent;

  const durationMin = getSrtDurationInMinutes(cues);

  const chunks = [];
  for (let i = 0; i < cues.length; i += GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT) {
    chunks.push(cues.slice(i, i + GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT).join('\n\n'));
  }

  const totalChunks = chunks.length;
  const finalResults = new Array(totalChunks).fill(null);

  if (durationMin < 30) {
    console.log(`Video < 30 phút, Xử lý TUẦN TỰ trên 1 tab...`);
    await openGeminiPage(page);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks[i];
      const prompt = prompts.promptUpdateTranscript(chunk);
      const result = await sendPromptToGemini(page, prompt);
      finalResults[i] = result;
      if (i < totalChunks - 1) await page.waitForTimeout(2000);
    }
  } else {
    const activeConcurrency = Math.min(GEMINI_CONFIG.MAX_CONCURRENT, totalChunks);
    console.log(`Video >= 30 phút, Xử lý ĐỒNG THỜI (${activeConcurrency} tabs song song)...`);

    const pages = [page];
    for (let i = 1; i < activeConcurrency; i++) {
      pages.push(await context.newPage());
    }

    for (let batchStart = 0; batchStart < totalChunks; batchStart += activeConcurrency) {
      const batchPromises = [];
      const batchEnd = Math.min(batchStart + activeConcurrency, totalChunks);
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(processChunkOnPage(pages[i - batchStart], chunks[i], i, totalChunks, prompts));
      }
      const batchResults = await Promise.all(batchPromises);
      for (const res of batchResults) finalResults[res.index] = res.result;
    }
    for (let i = 1; i < pages.length; i++) await pages[i].close();
  }

  const mergedParts = [];
  for (let i = 0; i < totalChunks; i++) {
    const cleaned = stripSrtCodeFence(finalResults[i]);
    mergedParts.push(cleaned || chunks[i]);
  }
  const mergedSrt = mergedParts.join('\n\n').trim();

  const indexCheck = checkSrtMergedCueIndexSequence(mergedSrt);
  if (!indexCheck.ok) {
    console.warn('[SRT merge] Số thứ tự cue không liên tục 1..N:', indexCheck);
  }

  return mergedSrt;
}
