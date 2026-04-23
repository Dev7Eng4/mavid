/**
 * Một video: nếu thiếu trường Gemini trong video-meta.json → transcript + Gemini;
 * sau đó Flow thumbnail nếu chưa có .png/.jpg/.jpeg.
 */
import path from 'path';
import fs from 'fs';
import { downloadTranscript, finalizeDownloadedTranscript } from '../downloadVideo.js';
import { readVideoMetaFile, writeVideoMetaFile, geminiMetaFieldsIncomplete, mergeGeminiIntoVideoMeta } from './videoMetaFile.util.js';
import { hasRasterThumbnailInFolder } from './videoFolderThumbnail.util.js';
import { extractYoutubeVideoId } from './youtubeUrl.util.js';
import { loadPromptByLanguage, resolveThumbnailPromptBuilder } from '../prompts/index.js';
import { runCreateThumbnailFlow } from '../flow/runCreateThumbnail.js';
import { FLOW_DOWNLOADS_DIR } from '../flow/paths.util.js';
import { optimizeFlowThumbnailJpegIfLarge } from '../flow/thumbnailOptimize.util.js';
import { detectVideoLang } from '../utils/detectLanguage.util.js';

/** Xóa toàn bộ nội dung trong `downloads/` (transcript + Flow dùng chung thư mục này). */
function emptyDownloadsDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile()) fs.unlinkSync(fullPath);
    else fs.rmSync(fullPath, { recursive: true });
  }
}

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
  console.log('🚀 ~ processOneVideoMetaUpdate ~ url:', url);
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return { ok: false, reason: 'URL không hợp lệ' };
  }
  console.log('🚀 ~ processOneVideoMetaUpdate ~ videoId:', videoId);

  if (!videoDir || !fs.existsSync(videoDir)) {
    console.log('🚀 ~ processOneVideoMetaUpdate ~ videoDir:', videoDir);
    return { ok: false, reason: `Không tìm thấy thư mục: ${videoDir}` };
  }

  console.log(`\n[update-meta] --- ${videoId} ---`);

  try {
    let meta = readVideoMetaFile(videoDir);

    const needGemini = geminiMetaFieldsIncomplete(meta);
    const needThumb = !hasRasterThumbnailInFolder(videoDir);
    console.log('🚀 ~ processOneVideoMetaUpdate ~ needThumb:', needThumb);
    if (!needGemini && !needThumb) {
      console.log('[update-meta] Đủ 4 trường Gemini + đã có thumbnail raster — bỏ qua.');
      return { ok: true };
    }

    const detechtedLang = detectVideoLang(meta.title);
    const prompts = await loadPromptByLanguage(detechtedLang);

    if (needGemini) {
      const { videoTitle, description, tags } = transcriptHintsFromVideoMeta(meta);
      console.log('[update-meta] Thiếu trường Gemini → tải transcript + Gemini...');

      const transcriptOpts = {
        updateTranscript: false,
        // outputDir: videoDir,
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
      };
      const dl = await downloadTranscript(url, transcriptOpts);
      console.log('🚀 ~ processOneVideoMetaUpdate ~ dl:', dl);
      await finalizeDownloadedTranscript(url, dl, {
        ...transcriptOpts,
        // outputDir: videoDir,
      });
      meta = readVideoMetaFile(videoDir) || meta;
    } else {
      console.log('[update-meta] Đủ 4 trường Gemini — bỏ qua transcript.');
    }

    const titleG = String(meta?.titleGemini || '').trim();
    const summaryG = String(meta?.summaryGemini || '').trim();

    if (needThumb) {
      if (titleG && summaryG) {
        const srcThumbWebp = path.join(videoDir, 'thumbnail.webp');
        if (fs.existsSync(srcThumbWebp)) {
          fs.mkdirSync(FLOW_DOWNLOADS_DIR, { recursive: true });
          fs.copyFileSync(srcThumbWebp, path.join(FLOW_DOWNLOADS_DIR, 'thumbnail.webp'));
          console.log('[update-meta] Đã copy thumbnail.webp từ thư mục video → downloads/ (chuẩn bị Flow).');
        } else {
          console.warn('[update-meta] Không có thumbnail.webp trong thư mục video — Flow có thể không đính kèm ảnh gốc.');
        }

        console.log('[update-meta] Chưa có thumbnail .png/.jpg/.jpeg → chạy Flow...');
        const { build, isNeedImage } = resolveThumbnailPromptBuilder(prompts, thumbnailPromptKey);
        try {
          await runCreateThumbnailFlow({
            prompt: build(titleG, summaryG),
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

    emptyDownloadsDir(FLOW_DOWNLOADS_DIR);
    console.log('[update-meta] Đã dọn thư mục downloads/.');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[update-meta] Lỗi: ${msg}`);
    return { ok: false, reason: msg };
  }
}
