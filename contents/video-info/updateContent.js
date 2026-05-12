/**
 * Gửi nội dung SRT tới Gemini qua Playwright, nhận kết quả text đã xử lý.
 * - Transcript: mở Chrome profile riêng (2,3,4 hoặc 2,3,4,5,6) – KHÔNG dùng profile 1.
 * - Meta (title, desc, tags): dùng profile 1.
 */

import { MAIN_PLAYWRIGHT_PROFILE } from '../constants/playwright-profile.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { internalUpdateVideoMeta } from './metaPipeline.js';
import { internalUpdateTranscript } from './transcriptPipeline.js';

/**
 * Standalone xử lý Meta (title, description, tags, summary).
 * Dùng profile 1.
 */
export async function updateVideoMeta(options = {}) {
  const { context, page } = await openChromeProfile({ profile: MAIN_PLAYWRIGHT_PROFILE, visible: true });
  try {
    return await internalUpdateVideoMeta(page, options);
  } finally {
    // await context.close();
  }
}

/**
 * Standalone chỉnh transcript SRT.
 * Tự mở profile riêng (2,3,4 hoặc 2,3,4,5,6) bên trong internalUpdateTranscript.
 */
export async function updateTranscript(rawSrtContent, options = {}) {
  return await internalUpdateTranscript(rawSrtContent, options);
}

/**
 * Transcript (tùy chọn) + metadata.
 * - Transcript: tự mở profile riêng (2–4 hoặc 2–6) bên trong internalUpdateTranscript.
 * - Meta: mở profile 1.
 * @param {string} rawSrtContent
 * @param {{ updateTranscript?: boolean, language?: string }} [options]
 */
export async function updateVideoInfo(rawSrtContent, options = {}) {
  const { updateTranscript = true } = options;

  let srtOut = rawSrtContent;

  // === Transcript: mở profile riêng (không dùng profile 1) ===
  if (updateTranscript) {
    console.log('Đang xử lý transcript (mở Chrome profile riêng)...');
    srtOut = await internalUpdateTranscript(rawSrtContent, options);
    console.log('Đã xong transcript.');
  }

  console.log('Đang mở Chrome profile 1 để xử lý metadata (title/description/tags)...');
  const { context, page } = await openChromeProfile({ profile: 1, visible: true });

  try {
    const meta = await internalUpdateVideoMeta(page, {
      ...options,
      srtContent: srtOut,
    });
    return { srt: srtOut, ...meta };
  } finally {
    await context.close();
  }
}
