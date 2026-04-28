/**
 * Entry point — Router chọn option tạo video từ audio.
 *
 * Option 1 (mặc định): Stock video + overlay + bar chart  → stockVideoOption.js
 * Option 2 (sắp tới):  Tạo video từ ảnh                   → (imageOption.js — chưa triển khai)
 *
 * Shared utilities      → shared.js
 * Xử lý phụ đề         → subtitle.js
 */

import fs from 'fs';
import path from 'path';

import { MAKE_VIDEO_MODE } from '../constants/index.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { unlinkProgressSidecarForSpreadsheet } from '../syncProgressToSpreadsheet.js';

import {
  DOWNLOADS_DIR,
  OUTPUT_DIR,
  ROOT,
  randomPlaybackSpeed,
  resolveAudioSpeed,
  SPEED,
  getLatestJobDownloadsDir,
  getImageFilesFromDir,
  shouldShowLogo,
  resolveLogoFromChannelFolder,
  resolveDefaultStockFolder,
} from './shared.js';

import { processStockVideo } from './stockVideoOption.js';
import { processImageOption } from './imageOption.js';
import { OPTIONS_CONTENT } from './constant.js';

// Re-export cho backward compatibility (convertAudio.js, v.v.)
export { randomPlaybackSpeed, resolveAudioSpeed, SPEED };

const CHANNELS_ROOT = resolveChannelsDir();

const defaultOption = process.env.MAVID_VIDEO_OPTION || OPTIONS_CONTENT[0].value;

// ==========================================
// TEST: tạo video từ audio có sẵn trong downloads
// ==========================================

/**
 * Test nhanh: tạo video từ audio + phụ đề đã có trong một thư mục — không download, không Gemini, không pipeline transcript.
 *
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {boolean} [options.preferLatestJobFolder=true]
 * @param {string} [options.stockFolder]
 * @param {number} [options.audioSpeed]
 * @param {number} [options.stockVideoCount]
 * @param {boolean} [options.showLogo]
 * @param {string} [options.channel]
 * @param {string} [options.logoSearchDir]
 * @param {string|null} [options.logoPath]
 * @param {string} [options.perVideoDir]
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {string|string[]} [options.tags]
 * @param {string} [options.videoLanguage]
 * @returns {Promise<{ downloadsDir: string, ok: true }>}
 */
export async function testMakeVideoFromDownloads(options = {}) {
  let downloadsDir = options.downloadsDir;
  if (!downloadsDir) {
    downloadsDir = options.preferLatestJobFolder !== false ? getLatestJobDownloadsDir() || DOWNLOADS_DIR : DOWNLOADS_DIR;
  }
  downloadsDir = path.resolve(downloadsDir);

  const stockFolder = resolveDefaultStockFolder(options);
  const wantLogo = shouldShowLogo(options);
  const explicitLogo = options.logoPath != null && String(options.logoPath).trim() && fs.existsSync(options.logoPath);
  const runLogoPath = explicitLogo
    ? options.logoPath
    : wantLogo
      ? resolveLogoFromChannelFolder(options, options.logoSearchDir || path.dirname(downloadsDir))
      : null;
  if (wantLogo && runLogoPath) {
    console.log(`[logo] ${runLogoPath}`);
  } else if (wantLogo && !runLogoPath) {
    console.warn('[logo] showLogo bật nhưng không có ảnh logo hợp lệ.');
  }

  const currentOption = options.option || defaultOption;

  if (currentOption === 'IN' || currentOption === 'SI') {
    await processImageOption({
      bgNameArg: stockFolder,
      downloadsDir,
      logoPath: runLogoPath,
      audioSpeed: options.audioSpeed,
      stockVideoCount: options.stockVideoCount,
      perVideoDir: options.perVideoDir,
      originalTitle: options.title,
      description: options.description || '',
      tags: options.tags || '',
      url: undefined,
      geminiByUrl: undefined,
      videoLanguage: options.videoLanguage,
      imageNoiseMode: currentOption === 'IN',
    });
  } else {
    // Mặc định dùng Option 1: Stock Video
    await processStockVideo(stockFolder, {
      downloadsDir,
      logoPath: runLogoPath,
      audioSpeed: options.audioSpeed,
      stockVideoCount: options.stockVideoCount,
      perVideoDir: options.perVideoDir,
      originalTitle: options.title,
      description: options.description || '',
      tags: options.tags || '',
      url: undefined,
      geminiByUrl: undefined,
      videoLanguage: options.videoLanguage,
    });
  }

  return { downloadsDir, ok: true };
}

// ==========================================
// BATCH: Main function
// ==========================================

/**
 * Main: tạo video từ audio + stock (chỉ batch — cần `items` từ CSV/Excel).
 *
 * @param {object} [options]
 * @param {number} [options.audioSpeed]
 * @param {string} [options.stockFolder]
 * @param {boolean} [options.showLogo]
 * @param {string} [options.channel]
 * @param {boolean} [options.syncProgressToSpreadsheet=true]
 */
async function main(options = {}) {
  const syncProgressToSpreadsheet = options.syncProgressToSpreadsheet !== false;
  const inputFile = options.inputFile || null;
  const items = options.items || [];
  if (items.length === 0) {
    console.log('Không có items để xử lý batch.');
    return { success: false, processedCount: 0, processedFolderNames: [] };
  }

  const processedFolderNames = [];

  const { downloadSingleVideo } = await import('../downloadVideo.js');

  const defaultStockFolder = resolveDefaultStockFolder(options);
  const batchAudioSpeedOverride =
    options.audioSpeed != null && Number.isFinite(Number(options.audioSpeed)) && Number(options.audioSpeed) > 0
      ? Number(options.audioSpeed)
      : undefined;

  const actualInputFile = inputFile;
  let destFolder = resolveChannelsDir();
  if (actualInputFile) {
    destFolder = path.dirname(actualInputFile);
  }

  const progressFile = actualInputFile
    ? actualInputFile.replace(/\.(xlsx|csv)$/, '_progress.json')
    : path.join(CHANNELS_ROOT, 'progress.json');
  let progressData = {};
  if (fs.existsSync(progressFile)) {
    try {
      progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    } catch (e) {}
  }

  /** @type {{ syncProgressStatusToSpreadsheet?: (f: string, d: object) => Promise<void> } | null} */
  let syncProgressModule = null;
  async function flushProgressToSpreadsheet() {
    if (!syncProgressToSpreadsheet || !actualInputFile) return;
    try {
      if (!syncProgressModule) {
        syncProgressModule = await import('../syncProgressToSpreadsheet.js');
      }
      await syncProgressModule.syncProgressStatusToSpreadsheet(actualInputFile, progressData);
    } catch (e) {
      console.warn('[sync] Đồng bộ STATUS → Excel/CSV:', e.message);
    }
  }

  const wantLogo = shouldShowLogo(options);
  const runLogoPath = wantLogo ? resolveLogoFromChannelFolder(options, destFolder) : null;
  if (wantLogo && runLogoPath) {
    console.log(`[logo] ${runLogoPath}`);
  } else if (wantLogo && !runLogoPath) {
    console.warn('[logo] showLogo bật nhưng không có ảnh (.png/.jpg/...) trong folder channel.');
  }

  const geminiByUrl = {};

  function resolveVideoOutputDir(videoId) {
    const base = videoId || 'unknown_id';
    const dir = path.join(destFolder, base);
    return dir;
  }

  // Clean folder outputs
  if (fs.existsSync(OUTPUT_DIR)) {
    const outputFiles = fs.readdirSync(OUTPUT_DIR);
    for (const f of outputFiles) {
      try {
        fs.unlinkSync(path.join(OUTPUT_DIR, f));
      } catch (e) {}
    }
    console.log('Đã dọn dẹp thư mục outputs/ trước khi chạy batch.');
  }

  let nextDownloadPromise = null;

  async function startDownload(itemIndex) {
    if (itemIndex >= items.length) return null;
    const { url } = items[itemIndex];
    const isolatedDownloadsDir = path.join(ROOT, 'downloads', `job_${Date.now()}_${itemIndex}`);

    return downloadSingleVideo(url, {
      mode: MAKE_VIDEO_MODE.FROM_AUDIO,
      thumbnailChannelRoot: destFolder,
      thumbnailPrompt: options.thumbnailPrompt,
      outputDir: isolatedDownloadsDir,
      overlay: options.overlay,
      callback: ({ title: gemTitle, description: gemDesc, tags: gemTags, summary: gemSummary }) => {
        const tagsStr = typeof gemTags === 'string' ? gemTags : Array.isArray(gemTags) ? gemTags.join(', ') : '';
        geminiByUrl[url] = {
          title: gemTitle || '',
          description: gemDesc || '',
          tags: tagsStr,
          summary: gemSummary || '',
        };
        console.log('Đã nhận title/description/tags/summary từ Gemini (sẽ ghi video-meta.json sau khi render).');
      },
    })
      .then(result => ({ result, isolatedDownloadsDir }))
      .catch(err => {
        console.error(`Lỗi tải video ${url}:`, err.message);
        return { result: null, isolatedDownloadsDir };
      });
  }

  if (items.length > 0) {
    console.log(`\n[Pipeline] Bắt đầu tải video đầu tiên...`);
    nextDownloadPromise = startDownload(0);
  }

  for (let i = 0; i < items.length; i++) {
    const { url, background } = items[i];
    console.log(`\n[${i + 1}/${items.length}] Chờ tải/xử lý metadata: ${url} (Background: ${background})`);

    const dlResult = await nextDownloadPromise;

    if (i + 1 < items.length) {
      console.log(
        `\n>>> [Pipeline] Bắt đầu tải trước video [${i + 2}/${items.length}] trong lúc đang render video [${i + 1}/${items.length}]...`,
      );
      nextDownloadPromise = startDownload(i + 1);
    } else {
      nextDownloadPromise = null;
    }

    if (dlResult && dlResult.result) {
      const { result, isolatedDownloadsDir } = dlResult;
      const videoId = result.metadata?.id || 'unknown_id';
      const perVideoDir = resolveVideoOutputDir(videoId);

      try {
        const currentOption = result.overlay || options.overlay || options.option || defaultOption;
        if (currentOption === 'IN' || currentOption === 'SI') {
          await processImageOption({
            bgNameArg: background || defaultStockFolder,
            logoPath: runLogoPath,
            perVideoDir,
            downloadsDir: isolatedDownloadsDir,
            originalTitle: result.title,
            description: result.description,
            tags: result.tags,
            url,
            geminiByUrl,
            audioSpeed: batchAudioSpeedOverride,
            imageNoiseMode: currentOption === 'IN',
          });
        } else {
          await processStockVideo(background || defaultStockFolder, {
            logoPath: runLogoPath,
            perVideoDir,
            downloadsDir: isolatedDownloadsDir,
            originalTitle: result.title,
            description: result.description,
            tags: result.tags,
            url,
            geminiByUrl,
            audioSpeed: batchAudioSpeedOverride,
          });
        }
        console.log(`ĐÃ HOÀN THÀNH VIDEO: ${url}`);

        if (fs.existsSync(OUTPUT_DIR)) {
          const outputFiles = fs.readdirSync(OUTPUT_DIR);
          for (const f of outputFiles) {
            try {
              fs.unlinkSync(path.join(OUTPUT_DIR, f));
            } catch (e) {}
          }
          console.log('Đã dọn dẹp outputs/ cẩn thận cho video tiếp theo.');
        }

        if (fs.existsSync(isolatedDownloadsDir)) {
          fs.rmSync(isolatedDownloadsDir, { recursive: true, force: true });
        }

        progressData[url] = {
          status: 'Đã tạo video',
        };
        fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf8');
        await flushProgressToSpreadsheet();
        processedFolderNames.push(String(videoId).trim() || 'unknown_id');
      } catch (err) {
        console.error('Lỗi tạo video:', err.message);
      }
    } else if (dlResult && dlResult.isolatedDownloadsDir) {
      if (fs.existsSync(dlResult.isolatedDownloadsDir)) {
        fs.rmSync(dlResult.isolatedDownloadsDir, { recursive: true, force: true });
      }
    }
  }

  if (syncProgressToSpreadsheet) {
    await flushProgressToSpreadsheet();
    unlinkProgressSidecarForSpreadsheet(actualInputFile);
  }

  console.log(`\nHoàn thành xử lý ${items.length} video.`);

  return {
    success: processedFolderNames.length > 0,
    processedCount: processedFolderNames.length,
    processedFolderNames,
  };
}

export default main;
