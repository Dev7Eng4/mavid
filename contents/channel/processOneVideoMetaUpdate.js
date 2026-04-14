/**
 * Một video: nếu thiếu trường Gemini trong video-meta.json → transcript + Gemini;
 * sau đó Flow thumbnail nếu chưa có .png/.jpg/.jpeg.
 */
import path from 'path';
import fs from 'fs';
import { downloadTranscript } from '../downloadVideo.js';
import {
  readVideoMetaFile,
  writeVideoMetaFile,
  geminiMetaFieldsIncomplete,
  mergeGeminiIntoVideoMeta,
} from './videoMetaFile.util.js';
import { hasRasterThumbnailInFolder } from './videoFolderThumbnail.util.js';
import { extractYoutubeVideoId } from './youtubeUrl.util.js';
import { PROMPTS_CREATE_THUMBNAIL, PROMPTS_NEED_IMAGE } from '../prompts/index.js';
import { runCreateThumbnailFlow } from '../flow/runCreateThumbnail.js';
import { optimizeFlowThumbnailJpegIfLarge } from '../flow/thumbnailOptimize.util.js';

/**
 * Gợi ý ngôn ngữ / ngữ cảnh cho downloadTranscript — chỉ từ video-meta.json, không gọi API YouTube.
 * @param {Record<string, unknown>|null|undefined} meta
 */
function transcriptHintsFromVideoMeta(meta) {
  const m = meta && typeof meta === 'object' ? meta : {};
  const videoTitle = String(m.title ?? '').trim();
  const description = String(m.description ?? '');
  let tags = [];
  if (Array.isArray(m.tags)) tags = m.tags.map(t => String(t).trim()).filter(Boolean);
  else if (m.tags != null && String(m.tags).trim())
    tags = String(m.tags)
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  return { videoTitle, description, tags };
}

/**
 * @param {object} opts
 * @param {string} opts.videoDir — .../{videoId}
 * @param {string} opts.url
 * @param {string} opts.thumbnailPromptKey
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function processOneVideoMetaUpdate({ videoDir, url, thumbnailPromptKey }) {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return { ok: false, reason: 'URL không hợp lệ' };
  }

  if (!videoDir || !fs.existsSync(videoDir)) {
    return { ok: false, reason: `Không tìm thấy thư mục: ${videoDir}` };
  }

  console.log(`\n[update-meta] --- ${videoId} ---`);

  try {
    let meta = readVideoMetaFile(videoDir);

    if (geminiMetaFieldsIncomplete(meta)) {
      const { videoTitle, description, tags } = transcriptHintsFromVideoMeta(meta);
      console.log('[update-meta] Thiếu trường Gemini → tải transcript + Gemini...');
      await downloadTranscript(url, {
        outputDir: videoDir,
        videoTitle,
        description,
        tags,
        callback: async payload => {
          const current = readVideoMetaFile(videoDir) || {};
          const merged = mergeGeminiIntoVideoMeta(current, {
            title: payload.title,
            description: payload.description,
            tags: payload.tags,
            summary: payload.summary,
          });
          writeVideoMetaFile(videoDir, merged);
          meta = merged;
        },
        generateThumbnailWithFlow: false,
        thumbnailFlowOutputDir: null,
      });
      meta = readVideoMetaFile(videoDir) || meta;
    } else {
      console.log('[update-meta] Đủ 4 trường Gemini — bỏ qua transcript.');
    }

    const titleG = String(meta?.titleGemini || '').trim();
    const summaryG = String(meta?.summaryGemini || '').trim();

    if (!hasRasterThumbnailInFolder(videoDir)) {
      if (titleG && summaryG) {
        console.log('[update-meta] Chưa có thumbnail .png/.jpg/.jpeg → chạy Flow...');
        let promptFn = PROMPTS_CREATE_THUMBNAIL[thumbnailPromptKey];
        if (!promptFn) {
          console.warn(`[update-meta] thumbnailPrompt "${thumbnailPromptKey}" không hợp lệ — dùng ja2CHFromOldThumbnail`);
          promptFn = PROMPTS_CREATE_THUMBNAIL.ja2CHFromOldThumbnail;
        }
        const isNeedImage = PROMPTS_NEED_IMAGE.includes(thumbnailPromptKey);
        try {
          await runCreateThumbnailFlow({
            prompt: promptFn(titleG, summaryG),
            pathSave: videoDir,
            exportName: 'flow-thumbnail',
            isNeedImage,
          });
          const flowThumbPath = path.join(videoDir, 'flow-thumbnail.jpg');
          await optimizeFlowThumbnailJpegIfLarge(flowThumbPath);
          console.log('[update-meta] Đã lưu flow-thumbnail.jpg');
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[update-meta] Flow thumbnail: ${msg}`);
          return { ok: false, reason: msg };
        }
      } else {
        console.warn('[update-meta] Bỏ qua Flow: thiếu titleGemini hoặc summaryGemini.');
      }
    } else {
      console.log('[update-meta] Đã có thumbnail raster — bỏ qua Flow.');
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[update-meta] Lỗi: ${msg}`);
    return { ok: false, reason: msg };
  }
}
