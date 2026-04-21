/**
 * Pipeline Gemini: chỉnh SRT theo chunk (tuần tự hoặc đa tab).
 * Luồng: parse SRT → sliding window Step2 → merge [StartID-EndID] → SRT.
 */
import { GEMINI_CONFIG, GEMINI_CHUNK_SIZE } from '../constants/index.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import {
  checkSrtMergedCueIndexSequence,
  formatDataForLLM,
  mergedBlocksToSrt,
  parseAndCleanSRT,
  renumberSrtCueIndices,
  shiftMergedBlocksTimes,
} from '../utils/srt.util.js';
import { openGeminiPage, sendPromptToGemini } from './browser.util.js';
import { getSrtDurationInMinutes } from './srtTiming.util.js';

/**
 * Sliding window: context + target (text + subs gốc cho merge/fallback).
 * @param {{ id: string, start: string, end: string, text: string }[]} jsonSubtitles
 */
function createSlidingWindows(jsonSubtitles, chunkSize = 30, overlapSize = 5) {
  const windows = [];
  const chunk = Math.max(1, chunkSize);
  const overlap = Math.min(Math.max(0, overlapSize), Math.max(0, chunk - 1));
  const step = Math.max(1, chunk - overlap);

  for (let i = 0; i < jsonSubtitles.length; i += step) {
    const chunkSlice = jsonSubtitles.slice(i, i + chunk);

    let contextArray = [];
    let targetArray = [];

    if (i === 0) {
      targetArray = chunkSlice;
    } else {
      contextArray = chunkSlice.slice(0, overlap);
      targetArray = chunkSlice.slice(overlap);
    }

    if (targetArray.length === 0) break;

    windows.push({
      batchIndex: windows.length + 1,
      contextText: formatDataForLLM(contextArray),
      targetText: formatDataForLLM(targetArray),
      contextSubs: contextArray,
      targetSubs: targetArray,
    });

    if (i + chunk >= jsonSubtitles.length) break;
  }

  return windows;
}

/**
 * Ghép kết quả AI vào Timestamp gốc.
 * Trùng khoảng (ví dụ `[41-41]` rồi `[41-42]`): dòng sau ghi đè text cho từng id, rồi gom các cue liên tiếp cùng nội dung thành một block.
 * @param {{ id: string, start: string, end: string, text: string }[]} originalSubtitles
 * @param {string} aiResponse
 * @returns {{ startTime: string, endTime: string, text: string }[]}
 */
function mergeAIResponseToSubtitles(originalSubtitles, aiResponse) {
  const lines = String(aiResponse ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  /** @type {Map<number, string>} */
  const idToText = new Map();

  for (const line of lines) {
    const parsed = parseStep2BracketLine(line);
    if (!parsed) continue;
    const { a, b, rest } = parsed;
    for (let id = a; id <= b; id++) {
      idToText.set(id, rest);
    }
  }

  const mergedSubtitles = [];
  const n = originalSubtitles.length;
  let i = 0;
  while (i < n) {
    const startId = parseInt(originalSubtitles[i].id, 10);
    const text = idToText.get(startId);
    if (text === undefined) {
      console.warn(`[Cảnh báo] Thiếu text cho cue ID: ${startId}`);
      return [];
    }
    let j = i;
    const t = text;
    while (j + 1 < n && idToText.get(parseInt(originalSubtitles[j + 1].id, 10)) === t) {
      j++;
    }
    const startSub = originalSubtitles[i];
    const endSub = originalSubtitles[j];
    mergedSubtitles.push({
      startTime: startSub.start,
      endTime: endSub.end,
      text: t,
    });
    i = j + 1;
  }

  return mergedSubtitles;
}

function fallbackTargetSubs(targetSubs) {
  return targetSubs.map(sub => ({
    startTime: sub.start,
    endTime: sub.end,
    text: sub.text,
  }));
}

/**
 * Một dòng Step2: `[a-b] text` hoặc rút gọn `[n] text` (một cue).
 * Nếu có tiền tố (ví dụ log) hoặc nhiều khối trên một dòng, lấy khớp `[a-b]` cuối, không có thì `[n]` cuối.
 */
function parseStep2BracketLine(line) {
  const trimmed = String(line).trim();
  if (!trimmed) return null;

  const rangeMatches = [...trimmed.matchAll(/\[(\d+)-(\d+)\]\s*([^\r\n]+)/g)];
  if (rangeMatches.length) {
    const last = rangeMatches[rangeMatches.length - 1];
    const a = parseInt(last[1], 10);
    const b = parseInt(last[2], 10);
    const rest = last[3].trim();
    if (a > b || !rest) return null;
    return { a, b, rest };
  }

  const singleMatches = [...trimmed.matchAll(/\[(\d+)\]\s*([^\r\n]+)/g)];
  if (singleMatches.length) {
    const last = singleMatches[singleMatches.length - 1];
    const a = parseInt(last[1], 10);
    const rest = last[2].trim();
    if (!rest) return null;
    return { a, b: a, rest };
  }

  return null;
}

/**
 * Dòng không phải cue (Gemini đôi khi thêm footer / gợi ý sau transcript).
 * Chỉ bỏ qua khi dòng không bắt đầu bằng `[` — nếu có `[` mà parse lỗi vẫn coi là không hợp lệ.
 */
function isIgnorableNonStep2Line(line) {
  const t = String(line).trim();
  if (!t) return true;
  return !t.startsWith('[');
}

/**
 * Kiểm tra phản hồi Step2: các dòng [a-b] / [n] phủ đúng tập id của targetSubs.
 * Bỏ qua dòng không bắt đầu bằng `[` (nhiễu sau transcript).
 */
function validateStep2Response(cleaned, targetSubs) {
  const targetIds = targetSubs.map(s => parseInt(s.id, 10)).sort((a, b) => a - b);
  if (targetIds.length === 0) return false;

  const lines = cleaned
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;

  /** Hợp các khoảng (kể cả trùng id như [41-41] rồi [41-42]) thành tập id duy nhất. */
  const coveredSet = new Set();
  for (const line of lines) {
    const parsed = parseStep2BracketLine(line);
    if (parsed) {
      const { a, b } = parsed;
      for (let id = a; id <= b; id++) coveredSet.add(id);
    } else if (isIgnorableNonStep2Line(line)) {
      continue;
    } else {
      return false;
    }
  }

  if (coveredSet.size !== targetIds.length) return false;
  const sorted = Array.from(coveredSet).sort((a, b) => a - b);
  for (let i = 0; i < targetIds.length; i++) {
    if (sorted[i] !== targetIds[i]) return false;
  }
  return true;
}

function interpretStep2Response(raw, targetSubs) {
  const cleaned = stripSrtCodeFence(raw ?? '');
  if (!validateStep2Response(cleaned, targetSubs)) {
    console.warn('[update-transcript][Step2] Phản hồi không hợp lệ, giữ nguyên cue trong window.');
    return fallbackTargetSubs(targetSubs);
  }
  const merged = mergeAIResponseToSubtitles(targetSubs, cleaned);
  if (merged.length === 0) {
    console.warn('[update-transcript][Step2] Merge không khớp số dòng AI, giữ nguyên cue.');
    return fallbackTargetSubs(targetSubs);
  }
  return merged;
}

/**
 * @param {import('playwright').Page} page
 * @param {object} window
 * @param {number} index
 * @param {number} totalWindows
 * @param {object} prompts
 * @param {{ skipOpenPage?: boolean }} [opts]
 */
async function processStep2WindowOnPage(page, window, index, totalWindows, prompts, opts = {}) {
  if (typeof prompts.promptUpdateTranscriptStep2 !== 'function') {
    throw new Error('Thiếu promptUpdateTranscriptStep2 trong bundle prompt ngôn ngữ.');
  }
  const { skipOpenPage = false } = opts;
  const prompt = prompts.promptUpdateTranscriptStep2(window.contextText, window.targetText);
  console.log(`\n--- Step2 window ${index + 1}/${totalWindows} ---`);

  if (!skipOpenPage) {
    await openGeminiPage(page);
  }

  const raw = await sendUpdateTranscriptChunkWithRetry(page, prompt, index, totalWindows);
  const blocks = interpretStep2Response(raw, window.targetSubs);
  return { index, blocks };
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
          `[update-transcript] Chunk ${
            chunkIndex + 1
          }/${totalChunks} — lần ${attempt}/${maxAttempts}: phản hồi rỗng; chờ ${waitMs}ms rồi thử lại.`
        );
        await page.waitForTimeout(waitMs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        const waitMs = baseDelayMs * attempt;
        console.warn(
          `[update-transcript] Chunk ${
            chunkIndex + 1
          }/${totalChunks} — lần ${attempt}/${maxAttempts} lỗi: ${msg}; chờ ${waitMs}ms rồi thử lại.`
        );
        await page.waitForTimeout(waitMs);
      } else {
        console.warn(`[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks} — thất bại sau ${maxAttempts} lần: ${msg}`);
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
  const { language, srtTimeShiftMs: srtTimeShiftMsOpt } = options;
  const prompts = await loadPromptByLanguage(language);

  const srtString =
    typeof rawSrtContent === 'string'
      ? rawSrtContent
      : Array.isArray(rawSrtContent)
      ? rawSrtContent.join('\n\n')
      : String(rawSrtContent ?? '');

  const parsed = parseAndCleanSRT(srtString);
  if (parsed.length === 0) {
    console.warn('[update-transcript] parseAndCleanSRT không có cue, trả về nội dung gốc.');
    return srtString.trim();
  }

  const cuesForDuration =
    typeof rawSrtContent === 'string'
      ? rawSrtContent
          .split(/\n\n+/)
          .map(c => c.trim())
          .filter(Boolean)
      : Array.isArray(rawSrtContent)
      ? rawSrtContent.map(c => String(c).trim()).filter(Boolean)
      : [];

  const durationMin = getSrtDurationInMinutes(cuesForDuration);

  const chunkSize = Math.max(1, Number(GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT_STEP2_CHUNK) || 20);
  const overlapSize = Math.max(0, Number(GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT_STEP2_OVERLAP) || 0);
  const windows = createSlidingWindows(parsed, chunkSize, overlapSize);
  const totalWindows = windows.length;

  const windowResults = new Array(totalWindows).fill(null);

  if (durationMin < 30) {
    console.log(`Video < 30 phút, Step2 xử lý TUẦN TỰ trên 1 tab (${totalWindows} window)...`);
    if (typeof prompts.promptUpdateTranscriptStep2 !== 'function') {
      throw new Error('Thiếu promptUpdateTranscriptStep2 trong bundle prompt ngôn ngữ.');
    }
    await openGeminiPage(page);

    for (let i = 0; i < totalWindows; i++) {
      const win = windows[i];
      const prompt = prompts.promptUpdateTranscriptStep2(win.contextText, win.targetText);
      const raw = await sendUpdateTranscriptChunkWithRetry(page, prompt, i, totalWindows);
      windowResults[i] = interpretStep2Response(raw, win.targetSubs);
      if (i < totalWindows - 1) await page.waitForTimeout(2000);
    }
  } else {
    const activeConcurrency = Math.min(GEMINI_CONFIG.MAX_CONCURRENT, totalWindows);
    console.log(
      `Video >= 30 phút, Step2 xử lý ĐỒNG THỜI (${activeConcurrency} tab dạng hàng đợi, ${totalWindows} window — tab rảnh lấy chunk tiếp theo, không chờ cả lô)...`
    );

    const pages = [page];
    for (let i = 1; i < activeConcurrency; i++) {
      pages.push(await context.newPage());
    }

    let nextWindowIndex = 0;

    async function step2WorkerTab(workerId) {
      const p = pages[workerId];
      /** Đã mở Gemini thành công trên tab này → chunk sau bỏ goto (tránh reload). */
      let primingDone = false;
      while (true) {
        const i = nextWindowIndex++;
        if (i >= totalWindows) break;
        try {
          const result = await processStep2WindowOnPage(p, windows[i], i, totalWindows, prompts, {
            skipOpenPage: primingDone,
          });
          primingDone = true;
          windowResults[i] = result.blocks;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(`[update-transcript][Step2] Window ${i + 1}/${totalWindows} lỗi tab: ${reason}`);
          windowResults[i] = fallbackTargetSubs(windows[i].targetSubs);
          // primingDone không đổi: chunk đầu lỗi thì chunk sau vẫn thử openGeminiPage đầy đủ
        }
        if (nextWindowIndex < totalWindows) {
          await p.waitForTimeout(2000);
        }
      }
    }

    await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => step2WorkerTab(w)));

    for (let i = 1; i < pages.length; i++) await pages[i].close();
  }

  const finalBlocks = [];
  for (let i = 0; i < totalWindows; i++) {
    finalBlocks.push(...windowResults[i]);
  }

  const shiftFromOptions =
    srtTimeShiftMsOpt !== undefined && srtTimeShiftMsOpt !== null
      ? Number(srtTimeShiftMsOpt)
      : Number(GEMINI_CONFIG.UPDATE_TRANSCRIPT_SRT_TIME_SHIFT_MS ?? 0);
  const shiftMs = Number.isFinite(shiftFromOptions) ? shiftFromOptions : 0;
  const blocksForSrt = shiftMs !== 0 ? shiftMergedBlocksTimes(finalBlocks, shiftMs) : finalBlocks;

  let mergedSrt = mergedBlocksToSrt(blocksForSrt);
  mergedSrt = renumberSrtCueIndices(mergedSrt);

  const indexCheck = checkSrtMergedCueIndexSequence(mergedSrt);
  if (!indexCheck.ok) {
    console.warn('[SRT merge] Số thứ tự cue không liên tục 1..N:', indexCheck);
  }

  return mergedSrt;
}
