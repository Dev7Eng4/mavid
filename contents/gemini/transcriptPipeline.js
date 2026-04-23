/**
 * Pipeline Gemini: clean VTT → parse thành objects → gửi [id] text cho AI fix →
 * map kết quả AI về objects → merge lại SRT.
 * < 30 phút: tối đa 3 Chrome profile (2,3,4). >= 30 phút: tối đa 5 Chrome profile (2,3,4,5,6).
 */
import { GEMINI_CONFIG, GEMINI_CHUNK_SIZE } from '../constants/index.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import {
  cleanSrtContent,
} from '../utils/srt.util.js';
import { openGeminiPage, sendPromptToGemini } from './browser.util.js';
import { getSrtDurationInMinutes } from './srtTiming.util.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
 * Parse chuỗi SRT thành mảng objects { id, timeline, text }.
 * @param {string} srtContent
 * @returns {{ id: string, timeline: string, text: string }[]}
 */
function parseSrtToObjects(srtContent) {
  const raw = String(srtContent ?? '').replace(/\r/g, '').trim();
  if (!raw) return [];

  const blocks = raw.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  const result = [];

  const timelineRe = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const id = lines[0];
    const timeline = lines[1];
    if (!/^\d+$/.test(id) || !timelineRe.test(timeline)) continue;

    const text = lines.slice(2).join('\n').trim();
    result.push({ id, timeline, text });
  }

  return result;
}

/**
 * Chuyển mảng objects thành dạng "[id] text" để gửi cho AI.
 * @param {{ id: string, timeline: string, text: string }[]} objects
 * @returns {string}
 */
function objectsToIdTextFormat(objects) {
  return objects.map(o => `[${o.id}] ${o.text}`).join('\n');
}

/**
 * Parse phản hồi AI dạng "[id] fixed text", map về mảng objects gốc để cập nhật text.
 * Chỉ cập nhật nếu id tồn tại trong mảng gốc; bỏ qua nếu không khớp.
 * @param {{ id: string, timeline: string, text: string }[]} objects  Mảng gốc (sẽ được clone)
 * @param {string} aiResponse  Phản hồi AI
 * @returns {{ id: string, timeline: string, text: string }[]}  Mảng đã cập nhật text
 */
function applyAiResponseToObjects(objects, aiResponse) {
  const cleaned = stripSrtCodeFence(aiResponse ?? '');
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);

  // Parse mỗi dòng [id] text
  /** @type {Map<string, string>} */
  const aiMap = new Map();
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (match) {
      aiMap.set(match[1], match[2].trim());
    }
  }

  // Clone objects và cập nhật text nếu id khớp
  return objects.map(obj => {
    const fixedText = aiMap.get(obj.id);
    if (fixedText !== undefined) {
      return { ...obj, text: fixedText };
    }
    return { ...obj }; // giữ nguyên
  });
}

/**
 * Merge mảng objects thành chuỗi SRT.
 * @param {{ id: string, timeline: string, text: string }[]} objects
 * @returns {string}
 */
function objectsToSrt(objects) {
  return objects
    .map((o, i) => `${i + 1}\n${o.timeline}\n${o.text}`)
    .join('\n\n')
    .trim();
}

// ─── Chunking ───────────────────────────────────────────────────────────────

/**
 * Chia mảng objects thành các chunk, mỗi chunk tối đa `chunkSize` phần tử.
 * @param {{ id: string, timeline: string, text: string }[]} objects
 * @param {number} chunkSize
 * @returns {{ id: string, timeline: string, text: string }[][]}
 */
function splitObjectsIntoChunks(objects, chunkSize) {
  if (objects.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < objects.length; i += chunkSize) {
    chunks.push(objects.slice(i, i + chunkSize));
  }
  return chunks;
}

// ─── Retry ──────────────────────────────────────────────────────────────────

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

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Xử lý 1 chunk objects: chuyển thành [id] text → gửi AI → parse kết quả → cập nhật objects.
 * @param {import('playwright').Page} page
 * @param {{ id: string, timeline: string, text: string }[]} chunkObjects
 * @param {number} chunkIndex
 * @param {number} totalChunks
 * @param {object} prompts
 * @returns {Promise<{ id: string, timeline: string, text: string }[]>}
 */
async function processChunkOnPage(page, chunkObjects, chunkIndex, totalChunks, prompts) {
  const idTextInput = objectsToIdTextFormat(chunkObjects);
  const prompt = prompts.promptUpdateTranscript(idTextInput);
  const raw = await sendUpdateTranscriptChunkWithRetry(page, prompt, chunkIndex, totalChunks);

  if (!raw || !stripSrtCodeFence(raw).trim()) {
    console.warn(`[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks}: AI trả về rỗng, giữ nguyên.`);
    return chunkObjects;
  }

  return applyAiResponseToObjects(chunkObjects, raw);
}

/**
 * @param {string | string[]} rawSrtContent
 * @param {{ language?: string }} options
 */
export async function internalUpdateTranscript(rawSrtContent, options = {}) {
  const { language } = options;
  const prompts = await loadPromptByLanguage(language);

  const srtString =
    typeof rawSrtContent === 'string'
      ? rawSrtContent
      : Array.isArray(rawSrtContent)
      ? rawSrtContent.join('\n\n')
      : String(rawSrtContent ?? '');

  // Bước 1: Clean VTT → SRT
  console.log('[update-transcript] Bước 1: Clean VTT...');
  const cleanedSrt = cleanSrtContent(srtString);
  if (!cleanedSrt.trim()) {
    console.warn('[update-transcript] cleanSrtContent không có nội dung, trả về nội dung gốc.');
    return srtString.trim();
  }
  console.log('[update-transcript] Clean VTT xong.');

  // Bước 2: Parse SRT → mảng objects { id, timeline, text }
  const allObjects = parseSrtToObjects(cleanedSrt);
  if (allObjects.length === 0) {
    console.warn('[update-transcript] Parse SRT không có cue, trả về SRT đã clean.');
    return cleanedSrt;
  }
  console.log(`[update-transcript] Parsed ${allObjects.length} cue.`);

  // Bước 3: Chia chunk + gửi AI dạng [id] text
  if (typeof prompts.promptUpdateTranscript !== 'function') {
    throw new Error('Thiếu promptUpdateTranscript trong bundle prompt ngôn ngữ.');
  }

  const chunkSize = Math.max(1, Number(GEMINI_CHUNK_SIZE.UPDATE_TRANSCRIPT) || 100);
  const chunks = splitObjectsIntoChunks(allObjects, chunkSize);
  const totalChunks = chunks.length;

  // Tính thời lượng để quyết định số profile
  const cuesForDuration = cleanedSrt
    .split(/\n\n+/)
    .map(c => c.trim())
    .filter(Boolean);
  const durationMin = getSrtDurationInMinutes(cuesForDuration);

  /** @type {{ id: string, timeline: string, text: string }[][]} */
  const chunkResults = new Array(totalChunks).fill(null);

  // Profile IDs: < 30 phút → [2,3,4] (tối đa 3), >= 30 phút → [2,3,4,5,6] (tối đa 5)
  const maxProfiles = durationMin < 30 ? 3 : 5;
  const profileIds = Array.from({ length: maxProfiles }, (_, i) => i + 2); // [2,3,4] hoặc [2,3,4,5,6]
  const activeConcurrency = Math.min(profileIds.length, totalChunks);

  console.log(
    `[update-transcript] Video ${durationMin < 30 ? '< 30' : '>= 30'} phút → mở ${activeConcurrency} Chrome profile (${profileIds.slice(0, activeConcurrency).join(',')}) cho ${totalChunks} chunk...`
  );

  let nextChunkIndex = 0;

  /**
   * Worker: mở 1 Chrome profile riêng → lần lượt lấy chunk từ hàng đợi → xử lý → đóng profile.
   * @param {number} workerIndex  Thứ tự worker (0-based)
   */
  async function workerProfile(workerIndex) {
    const profileNum = profileIds[workerIndex];
    /** @type {import('playwright').BrowserContext | null} */
    let ctx = null;
    try {
      const opened = await openChromeProfile({ profile: profileNum, visible: true });
      ctx = opened.context;
      const pg = opened.page;
      let primingDone = false;

      while (true) {
        const i = nextChunkIndex++;
        if (i >= totalChunks) break;
        try {
          console.log(`\n--- Chunk ${i + 1}/${totalChunks} (profile ${profileNum}) ---`);
          if (!primingDone) {
            await openGeminiPage(pg);
          }
          chunkResults[i] = await processChunkOnPage(pg, chunks[i], i, totalChunks, prompts);
          primingDone = true;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(`[update-transcript] Chunk ${i + 1}/${totalChunks} lỗi profile ${profileNum}: ${reason}`);
          chunkResults[i] = chunks[i]; // fallback: giữ objects gốc
        }
        if (nextChunkIndex < totalChunks) {
          await pg.waitForTimeout(2000);
        }
      }
    } finally {
      if (ctx) await ctx.close().catch(() => {});
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));

  // Bước 4: Ghép tất cả objects → SRT
  const mergedObjects = chunkResults.flat();
  const resultSrt = objectsToSrt(mergedObjects);

  return resultSrt;
}

