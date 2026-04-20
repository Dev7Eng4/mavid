/**
 * Download video YouTube sử dụng youtube-dl-exec
 * Xử lý: lấy thông tin video + tải video
 */

import youtubedl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { detectVideoLang, getLanguageOptions } from './utils/detectLanguage.util.js';

import { MAKE_VIDEO_MODE, LANGUAGES_NEED_UPDATE_TRANSCRIPT } from './constants/index.js';
import { optimizeFlowThumbnailJpegIfLarge } from './flow/thumbnailOptimize.util.js';
import { loadPromptByLanguage } from './prompts/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'downloads');
const INPUT_FILE = path.join(__dirname, '..', 'input.txt');
const OUTPUT_FILE = path.join(DEFAULT_OUTPUT_DIR, 'output.json');

/**
 * Lấy thông tin video đơn lẻ
 */
async function getVideoInfo(url) {
  const raw = await youtubedl(url, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  return {
    type: 'video',
    title: raw.title,
    description: raw.description || '',
    tags: raw.tags || [],
    metadata: {
      id: raw.id,
      url: raw.webpage_url || raw.url,
      duration: raw.duration,
      view_count: raw.view_count,
      like_count: raw.like_count,
      upload_date: raw.upload_date,
      uploader: raw.uploader,
      channel_id: raw.channel_id,
      channel_url: raw.channel_url,
      thumbnail: raw.thumbnail,
      categories: raw.categories || [],
    },
  };
}

/**
 * Download video từ URL
 * @param {string} url - Link video YouTube
 * @param {object} options - Tùy chọn
 * @param {string} options.outputDir - Thư mục lưu file (mặc định: ./downloads)
 * @param {string} options.format - Format video (mặc định: best)
 * @returns {Promise<string>} - Đường dẫn file đã tải
 */
async function downloadVideo(url, options = {}) {
  const { outputDir = DEFAULT_OUTPUT_DIR, format = 'best' } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputTemplate = path.join(outputDir, '%(title)s-%(id)s.%(ext)s');

  console.log('Đang tải video...');

  const FORMAT_H264_MP4 =
    'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/' +
    'bestvideo[vcodec^=avc1]+bestaudio/' +
    'best[vcodec^=avc1][ext=mp4]/' +
    'best[vcodec^=avc1]/' +
    '22/18/' +
    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

  const actualFormat = format === 'best' ? FORMAT_H264_MP4 : format;

  const subprocess = youtubedl.exec(url, {
    output: outputTemplate,
    format: actualFormat,
    mergeOutputFormat: 'mp4',
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  let lastPercent = -1;
  const updateProgress = chunk => {
    const text = chunk.toString();
    const match = text.match(/(\d+\.?\d*)%/);
    if (match) {
      const percent = parseFloat(match[1]);
      if (percent >= 0 && percent <= 100 && Math.floor(percent) !== Math.floor(lastPercent)) {
        lastPercent = percent;
        process.stdout.write(`\rĐang tải: ${percent.toFixed(1)}%`);
      }
    }
  };
  subprocess.stderr?.on('data', updateProgress);
  subprocess.stdout?.on('data', updateProgress);

  await subprocess;

  if (lastPercent >= 0) process.stdout.write('\n');
  console.log('Tải video xong!');

  return outputDir;
}

async function downloadThumbnail(url, options = {}) {
  const { outputDir = DEFAULT_OUTPUT_DIR } = options;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, 'thumbnail.%(ext)s');
  console.log('Đang tải thumbnail...');

  await youtubedl(url, {
    output: outputTemplate,
    skipDownload: true,
    writeThumbnail: true,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });
  console.log('Tải thumbnail xong!');
}

async function cleanVttTranscriptsToSrt(outputDir) {
  const { cleanSrt } = await import('./utils/srt.util.js');
  const vttFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.vtt'));
  for (const file of vttFiles) {
    const vttPath = path.join(outputDir, file);
    cleanSrt(vttPath);
    fs.unlinkSync(vttPath);
  }
}

async function processVttTranscriptsWithGemini(
  url,
  outputDir,
  {
    updateTranscript = true,
    videoTitle,
    description,
    tags,
    callback,
    language,
    thumbnailFlowOutputDir = null,
    generateThumbnailWithFlow = true,
    thumbnailPrompt = null,
  }
) {
  const { cleanSrt } = await import('./utils/srt.util.js');
  const { updateVideoInfo } = await import('./gemini/updateContent.js');
  const { PROMPTS_CREATE_THUMBNAIL, PROMPTS_NEED_IMAGE } = await import('./prompts/index.js');

  const vttFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.vtt'));
  console.log('🚀 ~ processVttTranscriptsWithGemini ~ vttFiles:', vttFiles);
  for (const file of vttFiles) {
    const vttPath = path.join(outputDir, file);
    cleanSrt(vttPath);
    fs.unlinkSync(vttPath);

    const srtPath = vttPath.replace(/\.vtt$/i, '.srt');
    if (!fs.existsSync(srtPath)) continue;

    const content = fs.readFileSync(srtPath, 'utf8');
    console.log(`Bắt đầu update nội dung SRT bằng Gemini trong cùng một phiên xử lý...`);
    let finalSrt = content;

    try {
      const geminiOut = await updateVideoInfo(content, {
        updateTranscript,
        title: videoTitle,
        description,
        tags,
        language,
      });

      finalSrt = geminiOut.srt;
      if ('title' in geminiOut && typeof callback === 'function') {
        try {
          await Promise.resolve(
            callback({
              url,
              title: geminiOut.title,
              description: geminiOut.description ?? '',
              tags: geminiOut.tags ?? '',
              summary: geminiOut.summary ?? '',
            })
          );
          console.log('✅ Đã gửi title/description/tags/summary (Gemini) qua callback.');
        } catch (cbErr) {
          console.warn('callback:', cbErr.message);
        }
      }

      if (generateThumbnailWithFlow && thumbnailFlowOutputDir && geminiOut.title != null && geminiOut.summary != null) {
        const titleG = String(geminiOut.title).trim();
        const summaryG = String(geminiOut.summary).trim();
        if (titleG && summaryG) {
          console.log('[thumbnail-flow] Tạo thumbnail từ title/summary Gemini →', path.basename(thumbnailFlowOutputDir));
          try {
            const { runCreateThumbnailFlow } = await import('./flow/runCreateThumbnail.js');

            const prompts = await loadPromptByLanguage(language);

            let promptFn = PROMPTS_CREATE_THUMBNAIL[thumbnailPrompt];
            if (!promptFn) {
              console.warn(
                `[thumbnail-flow] thumbnailPrompt "${thumbnailPrompt}" không hợp lệ hoặc thiếu, dùng fallback ja2CHFromOldThumbnail`
              );
              promptFn = PROMPTS_CREATE_THUMBNAIL.ja2CHFromOldThumbnail;
            }

            const isNeedImage = PROMPTS_NEED_IMAGE.includes(thumbnailPrompt);

            await runCreateThumbnailFlow({
              prompt: prompts.promptToCreateThumbnail(titleG, summaryG),
              pathSave: thumbnailFlowOutputDir,
              exportName: 'flow-thumbnail',
              isNeedImage,
            });
            const flowThumbPath = path.join(thumbnailFlowOutputDir, 'flow-thumbnail.jpg');
            await optimizeFlowThumbnailJpegIfLarge(flowThumbPath);
            console.log('[thumbnail-flow] Đã lưu flow-thumbnail.jpg trong folder video.');
          } catch (thumbErr) {
            console.warn('[thumbnail-flow]', thumbErr.message);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi xử lý hàng loạt qua Gemini:', err.message);
    }

    fs.writeFileSync(srtPath, finalSrt.trim() + '\n', 'utf-8');
    console.log(`✅ Đã update SRT qua Gemini cho ${path.basename(srtPath)}`);
  }
}

/**
 * Sau khi `downloadTranscript` tải xong: clean VTT→SRT và/hoặc pipeline Gemini + thumbnail Flow (khi `subFormat: 'vtt'`).
 * Với `subFormat: 'srt'` không làm gì thêm (file .srt đã nằm trong outputDir).
 * @param {string} url
 * @param {{ transcriptLang: string | null }} downloadResult — kết quả từ `downloadTranscript`
 * @param {object} [options]
 * @param {boolean} [options.updateTranscript=true]
 * @param {string} [options.outputDir]
 * @param {'srt'|'vtt'} [options.subFormat='srt']
 * @param {string} [options.videoTitle]
 * @param {string} [options.description]
 * @param {string[]} [options.tags]
 * @param {(p: { url: string, title: string, description: string, tags: string }) => void | Promise<void>} [options.callback]
 * @param {boolean} [options.vttOnlyClean=false]
 * @param {string|null} [options.thumbnailFlowOutputDir]
 * @param {boolean} [options.generateThumbnailWithFlow=true]
 * @param {string|null} [options.thumbnailPrompt]
 */
async function finalizeDownloadedTranscript(url, downloadResult, options = {}) {
  const { transcriptLang } = downloadResult;
  const {
    updateTranscript = true,
    outputDir = DEFAULT_OUTPUT_DIR,
    subFormat = 'vtt',
    videoTitle = '',
    description = '',
    tags = [],
    callback,
    vttOnlyClean = false,
    thumbnailFlowOutputDir = null,
    generateThumbnailWithFlow = true,
    thumbnailPrompt = null,
  } = options;

  const targetFormat = subFormat === 'vtt' ? 'vtt' : 'srt';

  const needsGeminiTranscriptUpdate =
    updateTranscript &&
    transcriptLang != null &&
    LANGUAGES_NEED_UPDATE_TRANSCRIPT.some(l => String(l).toLowerCase() === String(transcriptLang).toLowerCase());
  console.log('🚀 ~ finalizeDownloadedTranscript ~ needsGeminiTranscriptUpdate:', needsGeminiTranscriptUpdate);

  if (targetFormat === 'vtt') {
    // await cleanVttTranscriptsToSrt(outputDir);
    if (vttOnlyClean) {
      await cleanVttTranscriptsToSrt(outputDir);
    } else {
      await processVttTranscriptsWithGemini(url, outputDir, {
        updateTranscript: needsGeminiTranscriptUpdate,
        videoTitle,
        description,
        tags,
        callback,
        language: transcriptLang,
        thumbnailFlowOutputDir,
        generateThumbnailWithFlow,
        thumbnailPrompt,
      });
    }
  }
}

async function downloadTranscript(url, options = {}) {
  const { outputDir = DEFAULT_OUTPUT_DIR, subFormat = 'vtt', videoTitle = '' } = options;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(title)s-%(id)s.%(ext)s');

  const targetFormat = subFormat === 'vtt' ? 'vtt' : 'srt';
  const detectedLang = detectVideoLang(videoTitle);
  const langOrder = [detectedLang, ...getLanguageOptions()].filter((l, i, a) => a.indexOf(l) === i);
  let lastErr = null;
  let transcriptLang = null;

  for (const lang of langOrder) {
    try {
      console.log(`Đang tải transcript (${lang.toUpperCase()}${lang === detectedLang ? ' - detected' : ''})...`);
      await youtubedl(url, {
        output: outputTemplate,
        skipDownload: true,
        writeSub: false,
        writeAutoSub: true,
        convertSubs: targetFormat,
        subLangs: lang,
        sleepSubtitles: 5,
        noCheckCertificates: true,
        noWarnings: true,
        addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      });
      lastErr = null;
      transcriptLang = lang;
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`Không tải được ${lang}:`, err.message);
    }
  }

  if (lastErr) throw lastErr;

  console.log('Tải transcript xong!');
  return { transcriptLang, outputDir };
}

/**
 * Tải audio (extract từ video)
 */
async function downloadAudio(url, options = {}) {
  const { outputDir = DEFAULT_OUTPUT_DIR, audioFormat = 'mp3' } = options;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(title)s-%(id)s.%(ext)s');

  console.log('Đang tải audio...');

  const subprocess = youtubedl.exec(url, {
    output: outputTemplate,
    extractAudio: true,
    audioFormat,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  let lastPercent = -1;
  const updateProgress = chunk => {
    const text = chunk.toString();
    const match = text.match(/(\d+\.?\d*)%/);
    if (match) {
      const percent = parseFloat(match[1]);
      if (percent >= 0 && percent <= 100 && Math.floor(percent) !== Math.floor(lastPercent)) {
        lastPercent = percent;
        process.stdout.write(`\rĐang tải audio: ${percent.toFixed(1)}%`);
      }
    }
  };
  subprocess.stderr?.on('data', updateProgress);
  subprocess.stdout?.on('data', updateProgress);

  await subprocess;
  if (lastPercent >= 0) process.stdout.write('\n');
  console.log('Tải audio xong!');
  return outputDir;
}

/**
 * Tải 1 video: video + transcript + audio (dùng cho xử lý batch)
 * @param {string} url - Link YouTube
 * @param {object} [options]
 * @param {(p: { url: string, title: string, description: string, tags: string }) => void | Promise<void>} [options.callback] - Truyền xuống `finalizeDownloadedTranscript` → Gemini (batch: cập nhật progress từ makeVideoFromAudio)
 * @param {string} [options.thumbnailChannelRoot] — thư mục kênh (cha của từng folder video-id); nếu có, sau Gemini gọi Flow lưu `flow-thumbnail.jpg` trong `thumbnailChannelRoot/<videoId>/` (thumbnail YouTube vẫn tải về downloads, batch copy thành `thumbnail.*`)
 * @param {boolean} [options.generateThumbnailWithFlow=true] — tắt nếu không muốn chạy Flow
 * @returns {Promise<(object & { filePath?: string }) | null>} - Thông tin video; `filePath` = file video trong downloads/ (khi tải được)
 */
async function downloadSingleVideo(url, options = {}) {
  const {
    callback,
    mode = MAKE_VIDEO_MODE.REUP_FULL,
    thumbnailChannelRoot = null,
    generateThumbnailWithFlow = true,
    thumbnailPrompt = null,
    outputDir = DEFAULT_OUTPUT_DIR,
  } = options;

  const actualOutputDir = outputDir;

  if (!fs.existsSync(actualOutputDir)) {
    fs.mkdirSync(actualOutputDir, { recursive: true });
  } else {
    const entries = fs.readdirSync(actualOutputDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(actualOutputDir, entry.name);
      if (entry.isFile()) {
        fs.unlinkSync(fullPath);
      } else {
        fs.rmSync(fullPath, { recursive: true });
      }
    }
  }

  try {
    const result = await getVideoInfo(url);
    console.log('🚀 ~ downloadSingleVideo ~ result:', result);

    let thumbnailFlowOutputDir = null;
    if (generateThumbnailWithFlow && thumbnailChannelRoot && result.metadata?.id) {
      thumbnailFlowOutputDir = path.join(thumbnailChannelRoot, result.metadata.id);
      fs.mkdirSync(thumbnailFlowOutputDir, { recursive: true });
    }

    await downloadThumbnail(url, { outputDir: actualOutputDir });

    // [OPT-2] Song song hóa download video + transcript (transcript tải subtitle riêng, không cần file video local)
    const transcriptOptions = {
      outputDir: actualOutputDir,
      videoTitle: result.title,
    };

    async function downloadAndFinalizeTranscript() {
      const dl = await downloadTranscript(url, transcriptOptions);
      await finalizeDownloadedTranscript(url, dl, {
        ...transcriptOptions,
        updateTranscript: mode === MAKE_VIDEO_MODE.FROM_AUDIO,
        description: result.description,
        tags: result.tags,
        callback,
        thumbnailFlowOutputDir,
        generateThumbnailWithFlow,
        thumbnailPrompt,
      });
    }

    if (mode === MAKE_VIDEO_MODE.FROM_AUDIO) {
      // FROM_AUDIO: tuần tự (transcript cần updateTranscript = true, phụ thuộc tiến trình)
      await downloadAudio(url, { outputDir: actualOutputDir });
      try {
        await downloadAndFinalizeTranscript();
      } catch (err) {
        console.warn('Không tải được transcript:', err.message);
      }
    } else {
      // REUP_FULL: song song hóa → tiết kiệm ~5-10 phút
      console.log('[OPT-2] Song song: download video + transcript/Gemini/thumbnail...');
      const [videoResult, transcriptResult] = await Promise.allSettled([
        downloadVideo(url, { outputDir: actualOutputDir }),
        downloadAndFinalizeTranscript().catch(err => {
          console.warn('Không tải được transcript:', err.message);
        }),
      ]);
      if (videoResult.status === 'rejected') {
        throw videoResult.reason;
      }
    }

    const videoExt = /\.(mp4|mkv|mov|webm|avi)$/i;
    const mediaFiles = fs.readdirSync(actualOutputDir).filter(f => videoExt.test(f));
    const videoId = result.metadata?.id;
    if (mediaFiles.length > 0) {
      let pick = mediaFiles[0];
      if (videoId) {
        const byId = mediaFiles.find(f => f.includes(videoId));
        if (byId) pick = byId;
      }
      result.filePath = path.join(actualOutputDir, pick);
    }

    return result;
  } catch (err) {
    console.error(`Lỗi tải ${url}:`, err.message);
    return null;
  }
}

/**
 * Main: đọc input.txt, lấy thông tin video + tải
 */
async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('Không tìm thấy file input.txt');
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT_FILE, 'utf-8').trim();
  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && (l.startsWith('http://') || l.startsWith('https://')));

  if (lines.length === 0) {
    console.error('File input.txt không có link hợp lệ.');
    process.exit(1);
  }

  const url = lines[0];
  console.log(`Đang xử lý: ${url}`);

  try {
    if (fs.existsSync(DEFAULT_OUTPUT_DIR)) {
      const entries = fs.readdirSync(DEFAULT_OUTPUT_DIR, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(DEFAULT_OUTPUT_DIR, entry.name);
        if (entry.isFile()) {
          fs.unlinkSync(fullPath);
        } else {
          fs.rmSync(fullPath, { recursive: true });
        }
      }
      console.log('Đã xóa file cũ trong downloads/');
    } else {
      fs.mkdirSync(DEFAULT_OUTPUT_DIR, { recursive: true });
    }

    const result = await getVideoInfo(url);
    const output = JSON.stringify(result, null, 2);
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    console.log('Đã lưu thông tin vào downloads/output.json');

    await downloadThumbnail(url);
    await downloadVideo(url);
    await downloadAudio(url);

    let mergedResult = { ...result };
    try {
      const transcriptOpts = {
        videoTitle: result.title,
        description: result.description,
        tags: result.tags,
        callback: ({ title, description, tags, summary }) => {
          if (title != null && String(title).trim() !== '') mergedResult.title = String(title).trim();
          if (description != null) mergedResult.description = description;
          if (tags != null) mergedResult.tags = tags;
          if (summary != null) mergedResult.summary = summary;
        },
      };
      const dl = await downloadTranscript(url, transcriptOpts);
      await finalizeDownloadedTranscript(url, dl, transcriptOpts);
    } catch (err) {
      console.warn('Không tải được transcript (có thể do 429):', err.message);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedResult, null, 2), 'utf-8');
    console.log('Đã cập nhật downloads/output.json (title/description/tags từ Gemini qua callback nếu có).');
  } catch (err) {
    console.error('Lỗi:', err.message);
    if (err.stderr) console.error('Chi tiết:', err.stderr);
    process.exit(1);
  }
}

export default downloadVideo;
export {
  main,
  getVideoInfo,
  downloadThumbnail,
  downloadTranscript,
  finalizeDownloadedTranscript,
  cleanVttTranscriptsToSrt,
  downloadAudio,
  downloadSingleVideo,
};
