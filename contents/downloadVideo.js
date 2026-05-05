import fs, { promises as fsp } from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { detectVideoLang, getLanguageOptions } from './utils/detectLanguage.util.js';

import { LANGUAGES_NEED_UPDATE_TRANSCRIPT, MAKE_VIDEO_MODE } from './constants/index.js';
import { PATHS } from './constants/paths.js';

const INPUT_FILE = path.join(PATHS.ROOT, 'input.txt');
const OUTPUT_FILE = path.join(PATHS.DOWNLOADS, 'output.json');

/** Một số mã lỗi khi xóa file trên Windows (khoá bởi AV/Explorer/tiến trình khác) — nên thử lại. */
const RETRYABLE_FS_REMOVE_CODES = new Set(['EBUSY', 'EPERM', 'EACCES', 'EMFILE', 'EAGAIN']);

/**
 * Xóa file hoặc thư mục, retry khi bị EBUSY; sau cùng bỏ qua (cảnh báo) thay vì ném lỗi
 * để batch không dừng cả pipeline vì một file cũ còn bị khoá.
 * @param {string} fullPath
 * @param {boolean} isDirectory
 */
async function removePathWithRetry(fullPath, isDirectory) {
  const maxAttempts = 20;
  const baseMs = 120;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (isDirectory) {
        await fsp.rm(fullPath, { recursive: true, force: true });
      } else {
        await fsp.unlink(fullPath);
      }
      return;
    } catch (err) {
      if (err && err.code === 'ENOENT') return;
      lastErr = err;
      const code = err && err.code;
      const canRetry = RETRYABLE_FS_REMOVE_CODES.has(code) && attempt < maxAttempts;
      if (!canRetry) {
        console.warn(`[download] Không xóa được (bỏ qua): ${fullPath} — ${err.message}`);
        return;
      }
      const delay = Math.min(2500, baseMs * attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.warn(`[download] Hết số lần thử xóa, bỏ qua: ${fullPath} — ${lastErr && lastErr.message}`);
}

/**
 * Dọn nội dung thư mục output trước khi tải (từng entry, async + retry).
 * @param {string} dir
 */
async function clearOutputDirResilient(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile()) {
      await removePathWithRetry(fullPath, false);
    } else {
      await removePathWithRetry(fullPath, true);
    }
  }
}

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
  const { outputDir = PATHS.DOWNLOADS, format = 'best', maxHeight = 0 } = options;

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

  // Ưu tiên tải đúng height để giảm I/O; fallback về FORMAT_H264_MP4 nếu không có
  const FORMAT_H264_MP4_CAPPED =
    maxHeight > 0
      ? `bestvideo[height<=${maxHeight}][vcodec^=avc1]+bestaudio[ext=m4a]/` +
        `bestvideo[height<=${maxHeight}][vcodec^=avc1]+bestaudio/` +
        `best[height<=${maxHeight}][vcodec^=avc1][ext=mp4]/` +
        `best[height<=${maxHeight}][ext=mp4]/` +
        FORMAT_H264_MP4
      : null;

  const actualFormat = format !== 'best' ? format : FORMAT_H264_MP4_CAPPED ?? FORMAT_H264_MP4;

  if (maxHeight > 0) {
    console.log(`[DL] maxHeight=${maxHeight} → ưu tiên tải ≤${maxHeight}p để giảm I/O`);
  }

  const subprocess = youtubedl.exec(url, {
    output: outputTemplate,
    format: actualFormat,
    mergeOutputFormat: 'mp4',
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  // let lastPercent = -1;
  // const updateProgress = chunk => {
  //   const text = chunk.toString();
  //   const match = text.match(/(\d+\.?\d*)%/);
  //   if (match) {
  //     const percent = parseFloat(match[1]);
  //     if (percent >= 0 && percent <= 100 && Math.floor(percent) !== Math.floor(lastPercent)) {
  //       lastPercent = percent;
  //       process.stdout.write(`\rĐang tải: ${percent.toFixed(1)}%`);
  //     }
  //   }
  // };
  // subprocess.stderr?.on('data', updateProgress);
  // subprocess.stdout?.on('data', updateProgress);

  await subprocess;

  if (lastPercent >= 0) process.stdout.write('\n');
  console.log('Tải video xong!');

  return outputDir;
}

/**
 * Download video-only (không audio) từ URL, ưu tiên chất lượng HD.
 * Lưu ý: do chỉ lấy video stream, một số nguồn có thể là DASH (không có audio).
 * @param {string} url - Link video YouTube
 * @param {object} options - Tùy chọn
 * @param {string} options.outputDir - Thư mục lưu file (mặc định: ./downloads)
 * @param {string} options.format - Format yt-dlp (nếu truyền khác 'best' sẽ dùng trực tiếp)
 * @param {number} options.maxHeight - Giới hạn height (0 = không giới hạn)
 * @param {number} options.hdMinHeight - Ngưỡng "HD" tối thiểu (mặc định 720)
 * @returns {Promise<string>} - Đường dẫn thư mục đã tải
 */
async function downloadVideoVisual(url, options = {}) {
  const { outputDir = PATHS.DOWNLOADS, format = 'best', maxHeight = 0, hdMinHeight = 720 } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputTemplate = path.join(outputDir, '%(title)s-%(id)s.%(ext)s');

  console.log('Đang tải video (visual-only, không audio)...');

  const minH = Math.max(0, Number(hdMinHeight) || 0);

  const FORMAT_VIDEO_ONLY_H264_MP4 =
    `bestvideo[height>=1080][vcodec^=avc1][ext=mp4]/` +
    `bestvideo[height>=${minH}][vcodec^=avc1][ext=mp4]/` +
    `bestvideo[vcodec^=avc1][ext=mp4]/` +
    `bestvideo[ext=mp4]/` +
    `bestvideo`;

  const FORMAT_VIDEO_ONLY_H264_MP4_CAPPED =
    maxHeight > 0
      ? `bestvideo[height<=${maxHeight}][height>=1080][vcodec^=avc1][ext=mp4]/` +
        `bestvideo[height<=${maxHeight}][height>=${minH}][vcodec^=avc1][ext=mp4]/` +
        `bestvideo[height<=${maxHeight}][vcodec^=avc1][ext=mp4]/` +
        `bestvideo[height<=${maxHeight}][ext=mp4]/` +
        FORMAT_VIDEO_ONLY_H264_MP4
      : null;

  const actualFormat = format !== 'best' ? format : FORMAT_VIDEO_ONLY_H264_MP4_CAPPED ?? FORMAT_VIDEO_ONLY_H264_MP4;

  if (maxHeight > 0) {
    console.log(`[DL] (visual-only) maxHeight=${maxHeight} → ưu tiên tải ≤${maxHeight}p`);
  }

  await youtubedl.exec(url, {
    output: outputTemplate,
    format: actualFormat,
    mergeOutputFormat: 'mp4',
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  console.log('Tải video (visual-only) xong!');
  return outputDir;
}

async function downloadThumbnail(url, options = {}) {
  const { outputDir = PATHS.DOWNLOADS } = options;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, 'thumbnail.%(ext)s');

  await youtubedl(url, {
    output: outputTemplate,
    skipDownload: true,
    writeThumbnail: true,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });
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
  const { updateVideoInfo } = await import('./video-info/updateContent.js');

  const vttFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.vtt'));
  console.log('🚀 ~ processVttTranscriptsWithGemini ~ vttFiles:', vttFiles);
  for (const file of vttFiles) {
    const vttPath = path.join(outputDir, file);
    cleanSrt(vttPath);
    fs.unlinkSync(vttPath);

    const srtPath = vttPath.replace(/\.vtt$/i, '.srt');
    if (!fs.existsSync(srtPath)) continue;

    /** Bản sau clean VTT, trước khi Gemini ghi đè `*.srt` (đuôi `.srt.cleaned` để không bị `getSubtitleFile` chọn nhầm). */
    const cleanBackupPath = `${srtPath}.cleaned`;
    fs.copyFileSync(srtPath, cleanBackupPath);
    console.log(`Đã lưu bản SRT sau clean (trước Gemini): ${path.basename(cleanBackupPath)}`);

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
            const { generateFlowThumbnailFromGemini } = await import('./thumbnail/generateFlowThumbnail.js');
            await generateFlowThumbnailFromGemini({
              title: titleG,
              summary: summaryG,
              outputDir: thumbnailFlowOutputDir,
              language,
              thumbnailPromptKey: thumbnailPrompt,
              logTag: 'thumbnail-flow',
            });
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
    outputDir = PATHS.DOWNLOADS,
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
  const { outputDir = PATHS.DOWNLOADS, subFormat = 'vtt', videoTitle = '' } = options;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(title)s-%(id)s.%(ext)s');

  const targetFormat = subFormat === 'vtt' ? 'vtt' : 'srt';
  const detectedLang = detectVideoLang(videoTitle);
  const langOrder = [detectedLang, ...getLanguageOptions()].filter((l, i, a) => a.indexOf(l) === i);
  let lastErr = null;
  let transcriptLang = null;

  for (const lang of langOrder) {
    try {
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

  return { transcriptLang, outputDir };
}

async function downloadAudio(url, options = {}) {
  const { outputDir = PATHS.DOWNLOADS, audioFormat = 'mp3' } = options;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputTemplate = path.join(outputDir, '%(title)s-%(id)s.%(ext)s');

  const subprocess = youtubedl.exec(url, {
    output: outputTemplate,
    extractAudio: true,
    audioFormat,
    noCheckCertificates: true,
    noWarnings: true,
    addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
  });

  await subprocess;
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
    outputDir = PATHS.DOWNLOADS,
    downloadMaxHeight = 0,
  } = options;

  const actualOutputDir = outputDir;

  if (!fs.existsSync(actualOutputDir)) {
    fs.mkdirSync(actualOutputDir, { recursive: true });
  } else {
    await clearOutputDirResilient(actualOutputDir);
  }

  try {
    const result = await getVideoInfo(url);

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
        downloadVideo(url, { outputDir: actualOutputDir, maxHeight: downloadMaxHeight }),
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

    // Đính kèm các cấu hình mở rộng (như overlay - stock/image option) vào result
    if (options.overlay) result.overlay = options.overlay;

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
    if (fs.existsSync(PATHS.DOWNLOADS)) {
      const entries = fs.readdirSync(PATHS.DOWNLOADS, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(PATHS.DOWNLOADS, entry.name);
        if (entry.isFile()) {
          fs.unlinkSync(fullPath);
        } else {
          fs.rmSync(fullPath, { recursive: true });
        }
      }
      console.log('Đã xóa file cũ trong downloads/');
    } else {
      fs.mkdirSync(PATHS.DOWNLOADS, { recursive: true });
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
  cleanVttTranscriptsToSrt,
  downloadAudio,
  downloadSingleVideo,
  downloadThumbnail,
  downloadTranscript,
  downloadVideoVisual,
  finalizeDownloadedTranscript,
  getVideoInfo,
  main,
};
