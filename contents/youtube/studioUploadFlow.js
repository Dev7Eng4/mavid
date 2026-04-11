/**
 * Các bước UI Playwright trên YouTube Studio (upload file, điền form, lịch).
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { clearContent, clickElement, delay, getRandomNumber, scrollUntilVisible } from '../utils/dom.util.js';
import { YOUTUBE_SELECTOR } from './studioSelectors.js';

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
  console.log('[upload] Step 1: Mở trang YouTube...');
  await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  try {
    await page.keyboard.press('Escape');
    await delay(400);
  } catch {
    /* ignore */
  }

  await delay(1000);

  console.log('[upload] Step 2: Bấm nút Tạo (Create)...');
  await clickElement(page, YOUTUBE_SELECTOR.btnCreate);
  await delay(500);

  console.log('[upload] Step 3: Chọn mục Tải video lên...');
  await clickElement(page, YOUTUBE_SELECTOR.btnUploadVideo);
  await delay(3000);

  await selectFile(page, mp4Path);
}

export async function selectFile(page, mp4Path) {
  // 1. Tạo CDP Session kết nối với trang hiện tại
  const session = await page.context().newCDPSession(page);

  // 2. Mô phỏng hành vi: Di chuột vào nút thay vì click để tránh mở cửa sổ Windows
  const btnLoc = page.locator(YOUTUBE_SELECTOR.btnSelectFile);
  await btnLoc.hover();
  await page.mouse.move(getRandomNumber(100), getRandomNumber(300), { steps: 20 });

  // Giả vờ chờ khoảng 2-3 giây như người dùng đang duyệt file trong máy tính
  await delay(2500);

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

  // Nghỉ 1 nhịp sau khi up để giống hành vi thật
  await page.waitForTimeout(getRandomNumber(1000));

  // await clickElement(page, YOUTUBE_SELECTOR.btnSelectFile);

  // await page.mouse.move(getRandomNumber(100), getRandomNumber(300), { steps: 20 });

  // execFile('uploadFile.exe', [path.dirname(mp4Path), path.basename(mp4Path)]);

  // await delay(2500);

  // console.log(`[upload] ✓ Đã set file: ${mp4Path}`);

  // await page.waitForTimeout(getRandomNumber(1000));

  console.log('[upload] Step 5: Chờ YouTube xử lý file...');

  try {
    await page.waitForSelector(YOUTUBE_SELECTOR.formDetails, {
      state: 'attached',
      timeout: 60000,
    });
  } catch {}
  console.log('[upload] ✓ Form chi tiết đã xuất hiện — sẵn sàng edit title/description');
}

/**
 * @param {import('playwright').Page} page
 * @param {string} videoFolderPath — đường dẫn tuyệt đối đến folder chứa video-meta.json
 */
export async function fillVideoDetails(page, videoFolderPath) {
  const meta = await getMetaInfo(videoFolderPath);
  console.log('🚀 ~ fillVideoDetails ~ meta:', meta);

  const title = meta.titleGemini || meta.title || '';
  const description = meta.descriptionGemini || meta.description || '';
  const tagsGemini = meta.tagsGemini || '';
  const tags = meta.tags || '';

  if (title) {
    console.log('[edit] Step 1: Nhập Title...');

    await clickElement(page, YOUTUBE_SELECTOR.titleBox);
    await delay(500);
    await clearContent(page);
    await page.keyboard.insertText(title);
    console.log('[edit] ✓ Đã nhập Title');
    await delay(500);
  }

  await delay(2000);

  if (description) {
    console.log('[edit] Step 2: Nhập Description...');

    await clickElement(page, YOUTUBE_SELECTOR.descriptionBox);
    await delay(500);
    await clearContent(page);
    await page.keyboard.insertText(description);
    console.log('[edit] ✓ Đã nhập Description');
    await delay(500);
  }

  try {
    await page.keyboard.press('Escape');
    await delay(400);
  } catch {
    /* ignore */
  }

  await scrollUntilVisible(page, YOUTUBE_SELECTOR.thumbnailBox, false, 50);

  await delay(2000);

  const imageExts = ['.jpg', '.jpeg', '.png'];
  const folderFiles = fs.readdirSync(videoFolderPath);
  const imageFile = folderFiles.find(f => imageExts.includes(path.extname(f).toLowerCase()));

  if (imageFile) {
    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), clickElement(page, YOUTUBE_SELECTOR.thumbnailBox)]);

    await delay(1000);

    await fileChooser.setFiles(path.join(videoFolderPath, imageFile));
  } else {
    console.log(`[edit] ⚠ Không tìm thấy file thumbnail (.jpg, .png...) trong ${videoFolderPath}`);
  }

  await delay(4000);

  console.log('[edit] Step 3: Click "Hiển thị thêm" (Show more)...');

  const box = await page.locator(`${YOUTUBE_SELECTOR.boxUpload}`).boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(100 + Math.random() * 200);
    }
  }
  await delay(1000);
  await clickElement(page, YOUTUBE_SELECTOR.btnShowMore);
  console.log('[edit] ✓ Đã click "Hiển thị thêm"');
  await delay(1500);

  if (tags || tagsGemini) {
    console.log('[edit] Step 4: Nhập Tags...');

    if (box) {
      await page.mouse.move(box.x + box.width / 2 + (Math.random() * 20 - 10), box.y + box.height / 2 + (Math.random() * 20 - 10));

      await scrollUntilVisible(page, YOUTUBE_SELECTOR.tagsBox);
    }

    await clickElement(page, YOUTUBE_SELECTOR.tagsInput);
    await delay(500);

    await page.keyboard.insertText(tagsGemini);
    await delay(1500);
  }

  console.log('[edit] ✓ Hoàn thành điền thông tin video! Sang bước tiếp theo');
  await clickElement(page, YOUTUBE_SELECTOR.btnNextToRelatedStep);
}

/**
 * @param {import('playwright').Page} page
 * @param {boolean} [_isNeedAddRelatedVideo=false]
 * @param {string} [mp4Path] — đường dẫn .mp4 để ffprobe lấy duration và điền Start time (duration − 17s)
 */
export async function addRelatedVideo(page, _isNeedAddRelatedVideo = false, mp4Path) {
  await clickElement(page, YOUTUBE_SELECTOR.btnAddVideoRelated);
  await delay(4000);
  await clickElement(page, YOUTUBE_SELECTOR.btnChooseTemplate);

  if (_isNeedAddRelatedVideo) {
    await clickElement(page, YOUTUBE_SELECTOR.btnSelectElement);
    // await delay(500);
    await clickElement(page, YOUTUBE_SELECTOR.btnSelectVideo);
  }

  await clickElement(page, YOUTUBE_SELECTOR.startTime);
  await delay(400);

  if (mp4Path) {
    const dur = getVideoDurationSeconds(mp4Path);
    if (dur != null) {
      const stamp = formatRelatedVideoStartFromDuration(dur);
      await clearContent(page);
      await delay(300);
      await page.keyboard.insertText(stamp);
      console.log(`[edit] ✓ Start time end screen: ${stamp} (từ duration ${dur.toFixed(2)}s − ${RELATED_VIDEO_START_OFFSET_SEC}s)`);
    } else {
      console.warn(`[edit] ⚠ Không đọc được duration từ file — bỏ qua nhập Start time: ${mp4Path}`);
    }
  }

  await delay(500);
  await clickElement(page, YOUTUBE_SELECTOR.btnSaveRelatedVideo);
  await delay(2000);

  await clickElement(page, YOUTUBE_SELECTOR.btnNextToCheckStep);
  await delay(500);
  await clickElement(page, YOUTUBE_SELECTOR.btnNextToVisibilityStep);
}

/**
 * Chọn «Lên lịch» (Schedule); nếu có `slot` (từ `getYoutubePublishPlan`) thì điền ngày/giờ.
 * @param {import('playwright').Page} page
 * @param {{ slot?: { date: string, time: string, iso?: string } | null, jobIndex: number, totalJobs: number }} ctx — `slot.date` MM/DD/YYYY
 */
export async function chooseVisibility(page, ctx) {
  const slot = ctx?.slot;

  if (slot?.date && slot?.time) {
    await clickElement(page, YOUTUBE_SELECTOR.btnChooseSchedule);
    await delay(1500);
    await clickElement(page, YOUTUBE_SELECTOR.btnSelectDate);
    await delay(500);
    await clickElement(page, YOUTUBE_SELECTOR.inputDate);
    await clearContent(page);
    await delay(500);
    await page.keyboard.insertText(slot.date);
    await delay(500);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    await clickElement(page, YOUTUBE_SELECTOR.inputTime);
    await clearContent(page);
    await delay(500);
    await page.keyboard.insertText(slot.time);
    await delay(500);
    await page.keyboard.press('Enter');
  }

  await clickElement(page, YOUTUBE_SELECTOR.btnSaveSchedule);

  try {
    // Cố gắng chờ popup xuất hiện trong 3 giây
    await page.waitForSelector(YOUTUBE_SELECTOR.popupWarning, {
      state: 'visible',
      timeout: 3000,
    });

    // 👇 Nếu code lọt được xuống dòng này, nghĩa là popup ĐÃ XUẤT HIỆN
    console.log('[Info] Popup cảnh báo xuất hiện, đang tiến hành đóng...');
    await delay(1000);
    await clickElement(page, YOUTUBE_SELECTOR.btnGotItWarning);
    await delay(2000);
  } catch (error) {
    // 👇 Nếu sau 3 giây không có popup, Playwright sẽ nhảy vào đây.
    // Chúng ta không làm gì cả để tool bỏ qua và chạy tiếp các bước bên dưới.
    console.log('[Info] Không có popup cảnh báo, tiếp tục luồng chính.');
  }

  await page.reload({ timeout: 30000 });
}
