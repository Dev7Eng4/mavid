/**
 * Gửi nội dung SRT tới Gemini qua Playwright, nhận kết quả text đã xử lý.
 * Kết hợp tuần tự (dưới ~30 phút) và song song (từ ~30 phút trở lên) cho transcript.
 */

import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { internalUpdateVideoMeta } from './metaPipeline.js';
import { internalUpdateTranscript } from './transcriptPipeline.js';

/**
 * Standalone xử lý Meta (title, description, tags, summary).
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
 * Standalone chỉnh transcript SRT.
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
 * Transcript (tùy chọn) + metadata; sau transcript mở tab mới cho meta.
 * @param {string} rawSrtContent
 * @param {{ updateTranscript?: boolean, language?: string }} [options]
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
