/**
 * Các bước UI Playwright trên YouTube Studio (upload file, điền form, lịch).
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  clearContent,
  clickElement,
  delay,
  getRandomNumber,
  humanScroll,
  isVisible,
  pollUntilAnyLocatorVisible,
  scrollUntilVisible,
} from '../utils/dom.util.js';
import { YOUTUBE_SELECTOR } from './studioSelectors.js';
import { logToLogsPage } from '../utils/logToLogsPage.util.js';

/** Giây trừ khỏi thời lượng video để lấy mốc Start time end screen. */
const RELATED_VIDEO_START_OFFSET_SEC = 17;

/**
 * Thời lượng file video (giây) — ffprobe format.duration.
 * @param {string} mp4Path
 * @returns {number | null}
 */
function getVideoDurationSeconds(mp4Path) {
  if (!mp4Path || !fs.existsSync(mp4Path)) return null;
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp4Path],
      { encoding: 'utf-8' },
    ).trim();
    const n = parseFloat(out);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Đổi thời lượng video (giây) → số giây start (floor(duration) − offset, tối thiểu 0).
 * @param {number} durationSeconds
 * @param {number} [offsetSec=RELATED_VIDEO_START_OFFSET_SEC]
 */
export function relatedVideoStartSecondsFromDuration(durationSeconds, offsetSec = RELATED_VIDEO_START_OFFSET_SEC) {
  return Math.max(0, Math.floor(Number(durationSeconds)) - offsetSec);
}

/**
 * Chuỗi thời gian cho ô Start (YouTube): dưới 1h là m:ss / mm:ss; từ 1h là h:mm:ss (không zero-leading giờ/phút khi < 10).
 * @param {number} totalSeconds — tổng giây đã là mốc start (đã trừ offset nếu cần ở bước trước)
 */
export function formatYoutubeRelatedStartStamp(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = String(sec).padStart(2, '0');
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${ss}:00`;
  }
  return `${m}:${ss}:00`;
}

/**
 * Từ thời lượng video (giây): trừ 17s rồi format stamp (vd 9:24, 25:32, 1:07:32).
 * @param {number} durationSeconds
 */
export function formatRelatedVideoStartFromDuration(durationSeconds) {
  return formatYoutubeRelatedStartStamp(relatedVideoStartSecondsFromDuration(durationSeconds));
}

async function getMetaInfo(videoFolderPath) {
  const metaPath = path.join(videoFolderPath, 'video-meta.json');
  if (!fs.existsSync(metaPath)) {
    console.warn(`[edit] ⚠ Không tìm thấy ${metaPath} — bỏ qua edit details.`);
    return;
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    return meta;
  } catch (e) {
    console.warn(`[edit] ⚠ Lỗi đọc video-meta.json: ${e.message}`);
    return;
  }
}

/**
 * youtube.com → nút Tạo → «Tải video lên» → chọn file mp4 (giống người dùng).
 * @param {import('playwright').Page} page
 * @param {string} mp4Path — đường dẫn tuyệt đối đến file .mp4 cần upload
 */
export async function openYoutubeUpload(page, mp4Path) {
  await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  try {
    await page.keyboard.press('Escape');
  } catch {
    /* ignore */
  }

  await delay(1000, 800);

  await page.keyboard.press('F11');

  await clickElement(page, YOUTUBE_SELECTOR.btnCreate);
  await delay(500, 300);

  await clickElement(page, YOUTUBE_SELECTOR.btnUploadVideo);

  await selectFile(page, mp4Path);
}

export async function selectFile(page, mp4Path) {
  await delay(4000);

  // 1. Tạo CDP Session kết nối với trang hiện tại
  const session = await page.context().newCDPSession(page);

  // 2. Mô phỏng hành vi: Di chuột vào nút thay vì click để tránh mở cửa sổ Windows
  const btnLoc = page.locator(YOUTUBE_SELECTOR.btnSelectFile);
  await btnLoc.hover();
  await page.mouse.move(getRandomNumber(100), getRandomNumber(300), { steps: 20 });

  // Giả vờ chờ khoảng 2-3 giây như người dùng đang duyệt file trong máy tính
  await delay(2000);

  // 3. Lấy Root DOM qua CDP
  const { root } = await session.send('DOM.getDocument', { depth: 0 });

  // 4. Tìm thẻ input nhận file của YouTube (Thường là thẻ bị ẩn display:none)
  // Lưu ý: Nếu Youtube thay đổi DOM, bạn tự update selector 'input[type="file"]' này nhé.
  const { nodeId } = await session.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: 'input[type="file"]',
  });

  // 5. Bắn thẳng đường dẫn file vào thẻ input qua CDP (Bypass luồng WebSocket 50MB)
  // Quan trọng: mp4Path phải là đường dẫn tuyệt đối nằm trên máy tính chạy GPM Login
  await session.send('DOM.setFileInputFiles', {
    nodeId: nodeId,
    files: [mp4Path],
  });

  console.log(`[upload] ✓ Đã set file qua CDP: ${mp4Path}`);

  await delay(500, 800);

  try {
    await page.waitForSelector(YOUTUBE_SELECTOR.formDetails, {
      state: 'attached',
      timeout: 15000,
    });
  } catch {}
}

/**
 * @param {import('playwright').Page} page
 * @param {string} videoFolderPath — đường dẫn tuyệt đối đến folder chứa video-meta.json
 */
export async function fillVideoDetails(page, videoFolderPath, showErrorLogs) {
  console.log('STEP 2: Fill Video Details');

  const meta = await getMetaInfo(videoFolderPath);

  const title = meta.seoTitle || '';
  const description = meta.seoDescription || '';
  const tags = '';

  await page.waitForTimeout(getRandomNumber(200));

  if (title) {
    await clickElement(page, YOUTUBE_SELECTOR.titleBox);
    await clearContent(page);
    await page.keyboard.insertText(title);
  } else {
    showErrorLogs(`Không tìm thấy title trong video-meta.json: ${videoFolderPath}`);
  }

  await delay(300, 200);

  if (description) {
    await clickElement(page, YOUTUBE_SELECTOR.descriptionBox);
    await clearContent(page);
    await page.keyboard.insertText(description);
  } else {
    showErrorLogs(`Không tìm thấy description trong video-meta.json: ${videoFolderPath}`);
  }

  try {
    await page.keyboard.press('Escape');
    await delay(200);
  } catch {
    /* ignore */
  }

  await delay(300, 200);

  // Di chuyển chuột vào vùng Modal Upload để wheel scroll có tác dụng
  const boxUpload = await page.locator(YOUTUBE_SELECTOR.boxUpload).boundingBox();
  if (boxUpload) {
    await page.mouse.move(
      boxUpload.x + boxUpload.width / 2 + (Math.random() * 20 - 10),
      boxUpload.y + boxUpload.height / 2 + (Math.random() * 20 - 10),
    );
  }

  await scrollUntilVisible(page, YOUTUBE_SELECTOR.thumbnailBox, false, 50);

  await delay(200, 500);

  const imageExts = ['.jpg', '.jpeg', '.png'];
  const folderFiles = fs.readdirSync(videoFolderPath);
  const imageFile = folderFiles.find(f => imageExts.includes(path.extname(f).toLowerCase()));

  if (imageFile) {
    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), clickElement(page, YOUTUBE_SELECTOR.btnSelectThumbnail)]);

    await delay(1000);

    await fileChooser.setFiles(path.join(videoFolderPath, imageFile));
  } else {
    showErrorLogs(`Không tìm thấy file thumbnail trong ${videoFolderPath}`);
  }

  await delay(200);

  const box = await page.locator(`${YOUTUBE_SELECTOR.boxUpload}`).boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width / 2 + (Math.random() * 20 - 10), box.y + box.height / 2 + (Math.random() * 20 - 10));

    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 200 + Math.random() * 100);
      await page.waitForTimeout(100 + Math.random() * 200);
    }
  }

  await delay(200);
  await clickElement(page, YOUTUBE_SELECTOR.btnShowMore);
  await delay(200);

  if (tags) {
    await scrollUntilVisible(page, YOUTUBE_SELECTOR.tagsBox, false, 100);
    await clickElement(page, YOUTUBE_SELECTOR.tagsInput);
    await delay(200);
    await page.keyboard.insertText(tags);
  } else {
    showErrorLogs(`Không tìm thấy tags trong video-meta.json: ${videoFolderPath}`);
  }

  await delay(500, 300);

  console.log('HOÀN THÀNH BƯỚC 2: Fill Video Details');
  await clickElement(page, YOUTUBE_SELECTOR.btnNextToRelatedStep);
}

/**
 * @param {import('playwright').Page} page
 * @param {boolean} [_isNeedAddRelatedVideo=false]
 * @param {string} [mp4Path] — đường dẫn .mp4 để ffprobe lấy duration và điền Start time (duration − 17s)
 */
export async function addRelatedVideo(page, _isNeedAddRelatedVideo = false, mp4Path, showErrorLogs) {
  console.log('STEP 3: Add Related Video');
  await delay(300, 300);

  await clickElement(page, YOUTUBE_SELECTOR.btnAddVideoRelated);
  await delay(2000);
  try {
    await page.waitForSelector(YOUTUBE_SELECTOR.boxChooseTemplate, {
      state: 'visible',
      timeout: 3000,
    });
    await delay(300, 200);
    await clickElement(page, YOUTUBE_SELECTOR.btnSpecificTemplate);
  } catch {
    showErrorLogs(`Không tìm thấy box choose template`);
  }

  await delay(200, 300);

  // if (_isNeedAddRelatedVideo) {
  await clickElement(page, YOUTUBE_SELECTOR.btnSelectElement);
  await clickElement(page, YOUTUBE_SELECTOR.btnSelectVideo);

  //   try {
  //     await page.waitForSelector(YOUTUBE_SELECTOR.boxChooseSpecificVideo, {
  //       state: 'attached',
  //       timeout: 3000,
  //     });
  //     await clickElement(page, YOUTUBE_SELECTOR.btnCloseChooseSpecificVideo);
  //   } catch {
  //     showErrorLogs(`Không tìm thấy box choose specific video`);
  //   }
  // }

  await delay(300, 500);

  if (mp4Path) {
    const dur = getVideoDurationSeconds(mp4Path);
    if (dur != null) {
      const stamp = formatRelatedVideoStartFromDuration(dur);

      const elementsTimeline = page.locator(YOUTUBE_SELECTOR.elementTimeline);

      try {
        for (let i = 0; i < 3; i++) {
          const ele = elementsTimeline.nth(i);

          if (ele) {
            await clickElement(page, ele, false, true);
            await delay(300, 500);

            await clickElement(page, YOUTUBE_SELECTOR.startTime);
            await delay(400, 500);

            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');

            await page.waitForTimeout(300, 500);

            await page.keyboard.insertText(stamp);
            await page.keyboard.press('Enter');
            await delay(300, 200);
          }
        }
      } catch (error) {
        // showErrorLogs(`Không tìm thấy box choose specific video`);
      }
    } else {
      console.warn(`[edit] ⚠ Không đọc được duration từ file — bỏ qua nhập Start time: ${mp4Path}`);
    }
  }

  await delay(200, 300);
  await clickElement(page, YOUTUBE_SELECTOR.btnSaveRelatedVideo);
  try {
    await page.waitForSelector(YOUTUBE_SELECTOR.boxEditDetailEndScreen, {
      state: 'detached',
      timeout: 3000,
    });
  } catch {
    showErrorLogs(`Không tìm thấy box edit detail end screen`);
  }
  await delay(500);

  await clickElement(page, YOUTUBE_SELECTOR.btnNextToCheckStep);
  await delay(200, 200);
  await clickElement(page, YOUTUBE_SELECTOR.btnNextToVisibilityStep);
}

/**
 * Chọn «Lên lịch» (Schedule); nếu có `slot` (từ kế hoạch publish) thì điền ngày/giờ.
 * Caller sắp hàng upload theo mốc giờ tăng dần; mỗi lần gọi truyền `slot` ứng với video hiện tại.
 * @param {import('playwright').Page} page
 * @param {{ slot?: { date: string, time: string, iso?: string } | null, jobIndex: number, totalJobs: number }} ctx — `slot.date` MM/DD/YYYY
 */
export async function chooseVisibility(page, ctx) {
  console.log('STEP 4: Choose Visibility');

  const slot = ctx?.slot;

  const boxUpload = await page.locator(YOUTUBE_SELECTOR.boxUpload).boundingBox();
  if (boxUpload) {
    await page.mouse.move(
      boxUpload.x + boxUpload.width / 2 + (Math.random() * 20 - 10),
      boxUpload.y + boxUpload.height / 2 + (Math.random() * 20 - 10),
    );
  }

  await humanScroll(page, 140);

  if (slot?.date && slot?.time) {
    await clickElement(page, YOUTUBE_SELECTOR.btnChooseSchedule);
    await delay(500, 200);
    await clickElement(page, YOUTUBE_SELECTOR.btnSelectDate);
    await delay(500, 300);
    await clickElement(page, YOUTUBE_SELECTOR.inputDate);
    await clearContent(page);
    await delay(500, 200);
    await page.keyboard.insertText(slot.date);
    await delay(500, 300);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    await clickElement(page, YOUTUBE_SELECTOR.inputTime);
    await clearContent(page);
    await delay(500, 200);
    await page.keyboard.insertText(slot.time);
    await delay(200, 300);
    await page.keyboard.press('Enter');
  }

  let isUploading = true;

  try {
    const progressUploadEle = page.locator(YOUTUBE_SELECTOR.progressUploadLabel);

    if (progressUploadEle) {
      while (isUploading) {
        const txt = await progressUploadEle.innerText();
        if (!txt.toUpperCase().includes('UPLOADING')) {
          isUploading = false;
        }

        await delay(1000);
      }
    }
  } catch {
    isUploading = false;
  }

  await clickElement(page, YOUTUBE_SELECTOR.btnSaveSchedule);
  await delay(2000, 100);

  try {
    await page.waitForSelector(YOUTUBE_SELECTOR.popupWarning, {
      state: 'visible',
      timeout: 4000,
    });

    await clickElement(page, YOUTUBE_SELECTOR.btnGotItWarning);
  } catch (error) {
    console.log('[Info] Không có popup cảnh báo, tiếp tục luồng chính.');
  }

  await delay(1000, 200);

  await page.reload({ timeout: 30000 });
}
