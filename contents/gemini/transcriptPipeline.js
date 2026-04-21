/**
 * Pipeline Gemini: chỉnh SRT theo chunk (tuần tự hoặc đa tab).
 */
import { GEMINI_CONFIG, GEMINI_CHUNK_SIZE } from '../constants/index.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import { checkSrtMergedCueIndexSequence, renumberSrtCueIndices } from '../utils/srt.util.js';
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

  const result = await sendUpdateTranscriptChunkWithRetry(page, prompt, index, totalChunks);

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
 * Gửi một chunk transcript, thử lại khi lỗi hoặc khi phản hồi rỗng sau khi bỏ fence.
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {number} chunkIndex
 * @param {number} totalChunks
 */
async function sendUpdateTranscriptChunkWithRetry(page, prompt, chunkIndex, totalChunks) {
  const maxAttempts = Math.max(1, GEMINI_CONFIG.UPDATE_TRANSCRIPT_CHUNK_MAX_ATTEMPTS);
  const baseDelayMs = Math.max(0, GEMINI_CONFIG.UPDATE_TRANSCRIPT_CHUNK_RETRY_BASE_DELAY_MS);
  let lastRaw = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      lastRaw = await sendPromptToGemini(page, prompt);
      if (stripSrtCodeFence(lastRaw)) return lastRaw;
      if (attempt < maxAttempts) {
        const waitMs = baseDelayMs * attempt;
        console.warn(
          `[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks} — lần ${attempt}/${maxAttempts}: phản hồi rỗng; chờ ${waitMs}ms rồi thử lại.`,
        );
        await page.waitForTimeout(waitMs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        const waitMs = baseDelayMs * attempt;
        console.warn(
          `[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks} — lần ${attempt}/${maxAttempts} lỗi: ${msg}; chờ ${waitMs}ms rồi thử lại.`,
        );
        await page.waitForTimeout(waitMs);
      } else {
        console.warn(
          `[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks} — thất bại sau ${maxAttempts} lần: ${msg}`,
        );
        return '';
      }
    }
  }

  return lastRaw;
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
      const result = await sendUpdateTranscriptChunkWithRetry(page, prompt, i, totalChunks);
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
      const batchSettled = await Promise.allSettled(batchPromises);
      for (let j = 0; j < batchSettled.length; j++) {
        const chunkIndex = batchStart + j;
        const s = batchSettled[j];
        if (s.status === 'fulfilled') {
          finalResults[chunkIndex] = s.value.result;
        } else {
          const reason = s.reason instanceof Error ? s.reason.message : String(s.reason);
          console.warn(
            `[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks} lỗi không bắt được trong tab (batch): ${reason}`,
          );
          finalResults[chunkIndex] = '';
        }
      }
    }
    for (let i = 1; i < pages.length; i++) await pages[i].close();
  }

  // Ghép theo từng chunk: Gemini OK → dùng bản đã chỉnh; lỗi/rỗng → giữ `chunks[i]` (vd. a1,b1,c,d1 nếu chỉ c lỗi).
  const mergedParts = [];
  for (let i = 0; i < totalChunks; i++) {
    const raw = finalResults[i];
    const cleaned = stripSrtCodeFence(raw);
    mergedParts.push(cleaned || chunks[i]);
  }
  let mergedSrt = mergedParts.join('\n\n').trim();
  mergedSrt = renumberSrtCueIndices(mergedSrt);

  const indexCheck = checkSrtMergedCueIndexSequence(mergedSrt);
  if (!indexCheck.ok) {
    console.warn('[SRT merge] Số thứ tự cue không liên tục 1..N:', indexCheck);
  }

  return mergedSrt;
}
