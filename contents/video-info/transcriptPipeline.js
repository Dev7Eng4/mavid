/**
 * Pipeline video-info: parse SRT (đã clean, vd. sau cleanSrt) → gửi [id] text cho AI fix →
 * map kết quả AI về objects → merge lại SRT.
 * < 30 phút: tối đa 3 Chrome profile (2,3,4). >= 30 phút: tối đa 5 Chrome profile (2,3,4,5,6).
 */
import { VIDEO_INFO_CONFIG, VIDEO_INFO_CHUNK_SIZE } from './videoInfoDefaults.js';
import { loadPromptByLanguage } from '../prompts/index.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { openGeminiPage, sendPromptToGeminiWithRetry, stripJsonCodeFence } from '../gemini/browser.util.js';
import { getSrtDurationInMinutes, objectsToIdTextFormat, parseSrtToObjects } from '../utils/srt.util.js';
import { PLAYWRIGHT_PROFILES } from '../constants/playwright-profile.js';

/**
 * Parse phản hồi AI dạng "[id] fixed text", map về mảng objects gốc để cập nhật text.
 * Chỉ cập nhật nếu id tồn tại trong mảng gốc; bỏ qua nếu không khớp.
 * @param {{ id: string, timeline: string, text: string }[]} objects  Mảng gốc (sẽ được clone)
 * @param {string} aiResponse  Phản hồi AI
 * @returns {{ id: string, timeline: string, text: string }[]}  Mảng đã cập nhật text
 */
function applyAiResponseToObjects(objects, aiResponse) {
  const cleaned = stripJsonCodeFence(aiResponse ?? '');
  const lines = cleaned
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

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
  const maxAttempts = Math.max(1, VIDEO_INFO_CONFIG.UPDATE_TRANSCRIPT_CHUNK_MAX_ATTEMPTS);
  const baseDelayMs = Math.max(0, VIDEO_INFO_CONFIG.UPDATE_TRANSCRIPT_CHUNK_RETRY_BASE_DELAY_MS);
  const label = `[update-transcript] Chunk ${chunkIndex + 1}/${totalChunks}`;

  try {
    return await sendPromptToGeminiWithRetry(page, prompt, {
      // Transcript update trả "[id] text" plain; không yêu cầu code block.
      requireCodeBlock: false,
      // Validate đơn giản: response (sau strip fence) không được rỗng.
      validate: raw => {
        const cleaned = stripJsonCodeFence(raw).trim();
        if (!cleaned) throw new Error('Gemini trả về response rỗng.');
      },
      maxRetries: Math.max(0, maxAttempts - 1),
      retryDelayMs: baseDelayMs,
      label,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`${label} — thất bại sau ${maxAttempts} lần: ${msg}`);
    return '';
  }
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

  if (!raw || !stripJsonCodeFence(raw).trim()) {
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

  const cleanedSrt = srtString.trim();
  const allObjects = parseSrtToObjects(cleanedSrt);

  if (allObjects.length === 0) {
    console.warn('[update-transcript] Không parse được cue SRT (cần SRT đã clean, vd. sau cleanSrt), trả về nội dung gốc.');
    return cleanedSrt;
  }
  console.log(`[update-transcript] Parsed ${allObjects.length} cue.`);

  // Bước 3: Chia chunk + gửi AI dạng [id] text
  if (typeof prompts.promptUpdateTranscript !== 'function') {
    throw new Error('Thiếu promptUpdateTranscript trong bundle prompt ngôn ngữ.');
  }

  const chunkSize = Math.max(1, Number(VIDEO_INFO_CHUNK_SIZE.UPDATE_TRANSCRIPT) || 100);
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
  const maxProfiles = durationMin < 30 ? 3 : 3;
  const profileIds = Array.from({ length: maxProfiles }, (_, i) => i + 1);
  const activeConcurrency = Math.min(PLAYWRIGHT_PROFILES.length, totalChunks);

  console.log(
    `[update-transcript] Video ${durationMin < 30 ? '< 30' : '>= 30'} phút → mở ${activeConcurrency} Chrome profile (${profileIds
      .slice(0, activeConcurrency)
      .join(',')}) cho ${totalChunks} chunk...`
  );

  let nextChunkIndex = 0;

  /**
   * Worker: mở 1 Chrome profile riêng → lần lượt lấy chunk từ hàng đợi → xử lý → đóng profile.
   * @param {number} workerIndex  Thứ tự worker (0-based)
   */
  async function workerProfile(workerIndex) {
    const profileNum = PLAYWRIGHT_PROFILES[workerIndex];
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
