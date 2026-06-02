import fs from 'fs';
import path from 'path';

import { VIDEO_MAKE_MODE, VIDEO_MAKE_OPTION } from '../constant/index.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { unlinkProgressSidecarForSpreadsheet } from '../syncProgressToSpreadsheet.js';

import { OUTPUT_DIR, ROOT, resolveLogoFromChannelFolder, resolveDefaultStockFolder } from './shared.js';

import { OPTIONS_CONTENT } from './constant.js';
import { makeVideoWithImageNoise } from './optionVideo/makeVideoWithImageNoise.js';
import { makeVideoWithOverlayImageNoise } from './optionVideo/makeVideoWithOverlayImageNoise.js';
import { makeVideoWithSlideImage } from './optionVideo/makeVideoWithSlideImage/index.js';
import { makeVideoWithImages } from './optionVideo/makeVideoWithImages/index.js';

const CHANNELS_ROOT = resolveChannelsDir();

const defaultOption = process.env.MAVID_VIDEO_OPTION || OPTIONS_CONTENT[0].value;

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
    return { success: false, processedCount: 0, processedFolderNames: [] };
  }

  const generateGeneralImage = options.overlay === VIDEO_MAKE_OPTION.IN || options.overlay === VIDEO_MAKE_OPTION.SI;
  const generateSceneImages = options.overlay === VIDEO_MAKE_OPTION.AGI;

  const processedFolderNames = [];

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

  const wantLogo = options.showLogo;
  const runLogoPath = wantLogo ? resolveLogoFromChannelFolder(options, destFolder) : null;
  if (wantLogo && runLogoPath) {
    console.log(`[logo] ${runLogoPath}`);
  } else if (wantLogo && !runLogoPath) {
    console.warn('[logo] showLogo bật nhưng không có ảnh (.png/.jpg/...) trong folder channel.');
  }

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
    const url = items[itemIndex];
    const isolatedDownloadsDir = path.join(ROOT, 'downloads', `job_${Date.now()}_${itemIndex}`);

    const { default: prepareVideoInfo } = await import('../video-info/prepareVideoInfo.js');

    return prepareVideoInfo({
      url,
      options: {
        mode: VIDEO_MAKE_MODE.FROM_AUDIO,
        outputDir: isolatedDownloadsDir,
        thumbnailOptions: {
          prompt: options.thumbnailPrompt,
        },
        generateGeneralImage,
        generateSceneImages: false,
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
    const url = items[i];
    console.log(`\n[${i + 1}/${items.length}] Chờ tải/xử lý metadata: ${url}`);

    const dlResult = await nextDownloadPromise;

    if (i + 1 < items.length) {
      console.log(
        `\n>>> [Pipeline] Bắt đầu tải trước video [${i + 2}/${items.length}] trong lúc đang render video [${i + 1}/${items.length}]...`
      );
      nextDownloadPromise = startDownload(i + 1);
    } else {
      nextDownloadPromise = null;
    }

    if (dlResult && dlResult.result) {
      const { result, isolatedDownloadsDir } = dlResult;
      const perVideoDir = resolveVideoOutputDir(result.videoId);

      try {
        const currentOption = options.overlay || defaultOption;
        const perItemOptions = {
          videoLanguage: result.lang,
          perVideoDir,
          downloadsDir: isolatedDownloadsDir,
          originalTitle: result.title,
          audioSpeed: batchAudioSpeedOverride,
        };

        // kiểm tra xem có background.jpg trong isolatedDownloadsDir không

        if (generateGeneralImage) {
          const backgroundPath = path.join(isolatedDownloadsDir, 'background.jpg');
          if (!fs.existsSync(backgroundPath)) {
            console.warn(`[main] Không tìm thấy background.jpg trong ${isolatedDownloadsDir}`);
            continue;
          }
        }

        if (currentOption === VIDEO_MAKE_OPTION.IN) {
          await makeVideoWithImageNoise(perItemOptions);
        } else if (currentOption === VIDEO_MAKE_OPTION.SI) {
          await makeVideoWithOverlayImageNoise(defaultStockFolder, perItemOptions);
        } else if (currentOption === VIDEO_MAKE_OPTION.AGI) {
          await makeVideoWithImages(perItemOptions);
        } else {
          console.warn(`[main] Bỏ qua option không hỗ trợ: ${currentOption} (chỉ còn IN | SI).`);
        }

        console.log(`ĐÃ HOÀN THÀNH VIDEO: ${url}`);

        if (fs.existsSync(OUTPUT_DIR)) {
          // const outputFiles = fs.readdirSync(OUTPUT_DIR);
          // for (const f of outputFiles) {
          //   try {
          //     fs.unlinkSync(path.join(OUTPUT_DIR, f));
          //   } catch (e) {}
          // }
          console.log('Đã dọn dẹp outputs/ cẩn thận cho video tiếp theo.');
        }

        if (fs.existsSync(isolatedDownloadsDir)) {
          // fs.rmSync(isolatedDownloadsDir, { recursive: true, force: true });
        }

        progressData[url] = {
          status: 'Đã tạo video',
        };
        fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf8');
        await flushProgressToSpreadsheet();
        processedFolderNames.push(String(result.videoId).trim() || 'unknown_id');
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
  };
}

export default main;
