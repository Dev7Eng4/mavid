/**
 * Gửi nội dung SRT tới Gemini qua Playwright, nhận kết quả text đã xử lý.
 * KẾT HỢP TUẦN TỰ (dưới 30 phút) VÀ SONG SONG (trên 30 phút).
 */

import { DEFAULT_PROMPT_LANG, META_DATA, GEMINI_CONFIG, GEMINI_CHUNK_SIZE } from './constants/index.js';
import { loadPromptByLanguage } from './prompts/index.js';
import { openChromeProfile } from './scripts/makeChromeProfile.js';
import { openGeminiPage, sendPromptToGemini } from './utils/gemini.util.js';
import { checkSrtMergedCueIndexSequence, srtToPlainText } from './utils/srt.util.js';

/**
 * Láy thời lượng video (tính bằng phút) dựa vào dòng cue SRT cuối cùng
 */
function getSrtDurationInMinutes(cuesArray) {
  if (!cuesArray || cuesArray.length === 0) return 0;
  const lastCue = cuesArray[cuesArray.length - 1];
  const match = lastCue.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/g);
  if (match && match.length > 0) {
    const timeStr = match[match.length - 1]; // ending time
    const parts = timeStr.split(/[:,.]/);
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return hours * 60 + minutes + seconds / 60;
  }
  return 0; // fallback nếu parse lỗi
}

/**
 * Xử lý 1 đoạn chunk trên 1 trang Playwright riêng biệt.
 * (Dùng cho cơ chế đa tab đồng thời)
 */
async function processChunkOnPage(page, chunk, index, totalChunks) {
  const prompt = promptUpdateTranscript(chunk);
  console.log(`\n--- Đang mở Gemini và gửi prompt phần ${index + 1}/${totalChunks} ---`);

  // Mở trang Gemini thẳng luôn trên tab được giao
  await openGeminiPage(page);

  const result = await sendPromptToGemini(page, prompt);

  return { index, result };
}

/**
 * Parse phản hồi đúng theo # Output Format trong promptCreateVideoMeta:
 * Niche → Title → Description → Tags (mỗi nhãn nằm trên 1 dòng riêng, nội dung phía dưới).
 * Tìm vị trí từng label rồi cắt text giữa chúng — tránh regex lazy + multiline flag gây cắt sai.
 */
function parseCreateMetaInfoResponse(metaRaw) {
  let text = String(metaRaw || '').trim();
  text = text
    .replace(/^```[^\n]*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  const L = META_DATA;
  const labels = [
    { key: 'niche', label: L.NICHE },
    { key: 'title', label: L.TITLE },
    { key: 'description', label: L.DESCRIPTION },
    { key: 'tags', label: L.TAGS },
  ];

  const positions = [];
  for (const { key, label } of labels) {
    const re = new RegExp(`^${label}\\s*$`, 'im');
    const m = re.exec(text);
    if (m) positions.push({ key, start: m.index, contentStart: m.index + m[0].length });
  }
  positions.sort((a, b) => a.start - b.start);

  const result = { niche: '', title: '', description: '', tags: '' };
  for (let i = 0; i < positions.length; i++) {
    const end = i < positions.length - 1 ? positions[i + 1].start : text.length;
    result[positions[i].key] = text.slice(positions[i].contentStart, end).trim();
  }
  return result;
}

/**
 * Trên cùng một tab Gemini: tóm tắt SRT theo chunk (500 cues) → metadata tổng hợp (createVideoInfo.js).
 */
async function runGeminiVideoMetaPrompts(page, { srtContent, language }) {
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
 * INTERNAL: Xử lý Meta (Title, Description, Tags) trên 1 page có sẵn
 */
async function internalUpdateVideoMeta(page, options = {}) {
  const { srtContent = '', language } = options;

  await openGeminiPage(page);

  const meta = await runGeminiVideoMetaPrompts(page, { srtContent, language });
  return meta;
}

/**
 * INTERNAL: Xử lý Transcript SRT trên một context có sẵn
 */
async function internalUpdateTranscript(context, page, rawSrtContent, options = {}) {
  const { language } = options;
  const prompts = await loadPromptByLanguage(language);

  // Tách chunk từ file srt gốc
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
      let prompt = prompts.promptUpdateTranscript(chunk);
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
        batchPromises.push(processChunkOnPage(pages[i - batchStart], chunks[i], i, totalChunks));
      }
      const batchResults = await Promise.all(batchPromises);
      for (const res of batchResults) finalResults[res.index] = res.result;
    }
    // Đóng bớt tab phụ của phần transcript
    for (let i = 1; i < pages.length; i++) await pages[i].close();
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

  // Ghép nối SRT: nối tuần tự từng phản hồi (prompt đã yêu cầu đầu ra SRT chuẩn từng chunk).
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

/**
 * Standalone xử lý Meta
 */
export async function updateVideoMeta(options = {}) {
  const { context, page } = await openChromeProfile({ visible: true });
  try {
    return await internalUpdateVideoMeta(page, options);
  } finally {
    await context.close();
  }
}

/**
 * Standalone xử lý Transcript
 */
export async function updateTranscript(rawSrtContent, options = {}) {
  const { context, page } = await openChromeProfile({ visible: true });
  try {
    return await internalUpdateTranscript(context, page, rawSrtContent, options);
  } finally {
    await context.close();
  }
}

/**
 * Combined function hỗ trợ tham số updateTranscript
 * Có transcript: xử lý transcript xong trên tab đầu, sau đó mới mở tab mới cho meta (không song song).
 */
export async function updateVideoInfo(rawSrtContent, options = {}) {
  const { updateTranscript = true } = options;

  console.log('Đang mở Chrome để xử lý...');
  const { context, page } = await openChromeProfile({ visible: true });

  try {
    let srtOut = rawSrtContent;
    let targetPage = page;

    if (updateTranscript) {
      srtOut = await internalUpdateTranscript(context, page, rawSrtContent, options);
      console.log('Đã xong transcript, mở tab mới cho metadata (title/description/tags)...');
      targetPage = await context.newPage();
    }

    try {
      const meta = await internalUpdateVideoMeta(targetPage, {
        ...options,
        srtContent: srtOut,
      });
      return { srt: srtOut, ...meta };
    } finally {
      if (targetPage !== page) await targetPage.close().catch(() => {});
    }
  } finally {
    await context.close();
  }
}
