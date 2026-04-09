/**
 * Upload tuần tự file .mp4 lên YouTube qua trình duyệt profile GPM (API Local + CDP).
 * Mỗi thư mục con (sắp xếp tên) trong `MaVidMedia/channels/{channelFolder}/` có ít nhất một .mp4 → một lần upload.
 *
 * @param {object} params
 * @param {string} params.gpmProfileId — id profile GPM (UUID)
 * @param {string} params.channelFolder — tên thư mục kênh (an toàn, không ..)
 * @param {number | null | undefined} params.maxUploads — giới hạn số video; null/undefined = tất cả thư mục hợp lệ
 * @param {string[]} [params.uploadFolderNames] — nếu có: chỉ upload các thư mục con này, đúng thứ tự (khớp batch vừa tạo)
 * @param {string} [params.gpmApiBase] — ưu tiên; nếu thiếu dùng `process.env.GPM_API_BASE` (vd. http://127.0.0.1:19995/api/v3), sau đó `GPM_API_ORIGIN` (chỉ origin), cuối cùng mặc định cục bộ — không cần build lại app khi đổi qua biến môi trường.
 * @param {string} [params.email] — email kênh trong `mavid-channel-config.json` → `getYoutubePublishPlan` (ngày/giờ public) ở bước Schedule.
 */
import fs from 'fs';
import path from 'path';
import { clearContent, clickElement, clickXPathElement, delay, getRandomNumber, scrollUntilVisible } from '../utils/dom.util.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { syncChannelAfterYoutubeUpload } from '../utils/youtubeUploadAfterSync.js';
import { getYoutubePublishPlan } from '../utils/youtube.util.js';
import { connectPlaywrightToGpmProfile } from './openGpmPlaywright.js';
import { execFile } from 'child_process';

const YOUTUBE_SELECTOR = {
  btnCreate: '#buttons ytd-button-renderer button',
  btnUploadVideo: '#items ytd-compact-link-renderer:nth-of-type(1) a',
  btnSelectFile: '#select-files-button button',
  formDetails: 'ytcp-uploads-dialog:not([workflow-step="SELECT_FILES"])',
  titleBox: '#title-wrapper #textbox',
  descriptionBox: '#description-wrapper #textbox',
  thumbnailBox: '#custom-still-editor-wrapper #select-button',
  boxUpload: '#scrollable-content',
  btnShowMore: '#toggle-button button',
  tagsBox: '#tags-container',
  tagsInput: '#tags-container input',
  btnNextToRelatedStep: '#next-button button',
  btnAddVideoRelated: '#endscreens-button button',
  btnChooseTemplate: '#cards-row > div:nth-of-type(1) .template-preview',
  btnSelectElement: '#add-element-menu-button button',
  btnSelectVideo: '#paper-list #text-item-0',
  btnSaveRelatedVideo: '#save-button button',
  btnNextToCheckStep: '#next-button button',
  btnNextToVisibilityStep: '#next-button button',
  btnChooseSchedule: '#visibility-container #second-container',
  btnSelectDate: '#datepicker-trigger div',
  inputDate: 'ytcp-date-picker #labelAndInputContainer input',
  inputTime: '.ytcp-datetime-picker input',
  btnSaveSchedule: '#done-button button',
  popupScheduleSuccess: '#dialog ytcp-video-thumbnail-with-info',
  popupProcessing: 'ytcp-uploads-still-processing-dialog #dialog',
  // btnClosePopupProcessing: 'ytcp-uploads-still-processing-dialog #close-button button',
  // btnClosePopupScheduleSuccess: '#close-button button',
  popupWarning: 'ytcp-prechecks-warning-dialog #dialog',
  btnGotItWarning: 'ytcp-prechecks-warning-dialog #primary-action-button button',
};

/**
 * Chuẩn hóa base GPM → origin cho Playwright (bỏ hậu tố /api/v3 nếu có).
 * Thứ tự: tham số → `GPM_API_BASE` → `GPM_API_ORIGIN` → mặc định.
 * @param {string} [explicitBase]
 */
function apiRootForPlaywright(explicitBase) {
  const explicit = typeof explicitBase === 'string' ? explicitBase.trim() : '';
  const fromEnv = (process.env.GPM_API_BASE || '').trim();
  const s = (explicit || fromEnv).replace(/\/+$/, '');
  if (s.endsWith('/api/v3')) return s.slice(0, -'/api/v3'.length);
  if (s) return s;
  const origin = (process.env.GPM_API_ORIGIN || '').trim().replace(/\/+$/, '');
  return origin || 'http://127.0.0.1:19995';
}

/** @param {string} name */
function assertSafeChannelFolder(name) {
  if (!name || typeof name !== 'string' || !name.trim()) throw new Error('Thiếu channelFolder.');
  const t = name.trim();
  if (t.includes('..') || t.includes('/') || t.includes('\\')) throw new Error('Tên thư mục kênh không hợp lệ.');
  return t;
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
function firstMp4InDir(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  const files = fs
    .readdirSync(dir)
    .filter(f => /\.mp4$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return files.length ? path.join(dir, files[0]) : null;
}

/** @param {string} name */
function assertSafeSubfolderName(name) {
  const t = String(name || '').trim();
  if (!t) return null;
  if (t.includes('..') || t.includes('/') || t.includes('\\')) return null;
  return t;
}

/**
 * Danh sách thư mục con có .mp4.
 * - Có `folderNamesOrder`: theo đúng thứ tự danh sách (chỉ thư mục có .mp4), tối đa `maxUploads` nếu có.
 * - Không có: quét thư mục kênh, sắp xếp tên tăng dần, lấy từ trên xuống tới `maxUploads`.
 * @param {string} channelAbs
 * @param {number | null} maxUploads
 * @param {string[] | null | undefined} folderNamesOrder
 */
function listUploadJobs(channelAbs, maxUploads, folderNamesOrder) {
  if (!fs.existsSync(channelAbs)) throw new Error(`Không tìm thấy thư mục kênh: ${channelAbs}`);

  if (Array.isArray(folderNamesOrder) && folderNamesOrder.length > 0) {
    const jobs = [];
    for (const raw of folderNamesOrder) {
      const name = assertSafeSubfolderName(raw);
      if (!name) continue;
      const sub = path.join(channelAbs, name);
      const mp4 = firstMp4InDir(sub);
      if (!mp4) {
        console.warn(`[upload] Bỏ qua «${name}» — không có file .mp4 trong thư mục.`);
        continue;
      }
      jobs.push({ folderName: name, folderPath: sub, mp4Path: mp4 });
      if (maxUploads != null && Number.isFinite(maxUploads) && maxUploads > 0 && jobs.length >= maxUploads) break;
    }
    return jobs;
  }

  const entries = fs.readdirSync(channelAbs, { withFileTypes: true });
  const dirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const jobs = [];
  for (const name of dirs) {
    const sub = path.join(channelAbs, name);
    const mp4 = firstMp4InDir(sub);
    if (!mp4) continue;
    jobs.push({ folderName: name, folderPath: sub, mp4Path: mp4 });
    if (maxUploads != null && Number.isFinite(maxUploads) && maxUploads > 0 && jobs.length >= maxUploads) break;
  }
  return jobs;
}

/** @param {import('playwright').Page} page */
async function humanWarmup(page) {
  await delay(600 + Math.random() * 900);
  const vp = page.viewportSize();
  const w = vp?.width ?? 1280;
  const h = vp?.height ?? 720;
  for (let i = 0; i < 4; i++) {
    const x = 80 + Math.random() * (w * 0.75);
    const y = 80 + Math.random() * (h * 0.55);
    await page.mouse.move(x, y, { steps: 18 + Math.floor(Math.random() * 15) });
    await delay(180 + Math.random() * 420);
  }
  try {
    await page.mouse.wheel(0, 120 + Math.random() * 180);
    await delay(400 + Math.random() * 350);
  } catch {
    /* ignore */
  }
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
 * Mỗi step dùng clickElement riêng biệt, dễ quản lý & debug.
 * @param {import('playwright').Page} page
 * @param {string} mp4Path — đường dẫn tuyệt đối đến file .mp4 cần upload
 */
async function openYoutubeUpload(page, mp4Path) {
  // ── Step 1: Mở trang YouTube ──────────────────────────────────────────
  console.log('[upload] Step 1: Mở trang YouTube...');
  await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // await humanWarmup(page);

  try {
    await page.keyboard.press('Escape');
    await delay(400);
  } catch {
    /* ignore */
  }

  // ── Step 2: Bấm nút "Tạo" (Create) trên thanh masthead ──────────────
  console.log('[upload] Step 2: Bấm nút Tạo (Create)...');
  await clickElement(page, YOUTUBE_SELECTOR.btnCreate);
  await delay(500);

  // ── Step 3: Chọn mục "Tải video lên" (Upload videos) trong menu ─────
  console.log('[upload] Step 3: Chọn mục Tải video lên...');
  await clickElement(page, YOUTUBE_SELECTOR.btnUploadVideo);
  await delay(3000);

  await selectFile(page, mp4Path);
}

async function selectFile(page, mp4Path) {
  await clickElement(page, YOUTUBE_SELECTOR.btnSelectFile);
  // const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), clickXPathElement(page, YOUTUBE_SELECTOR.btnSelectFile)]);
  // const fileChooser = await page.waitForEvent('filechooser');
  // console.log('fileChooser', fileChooser);
  // await clickElement(
  //   page,
  //   YOUTUBE_SELECTOR.btnSelectFile
  // );

  await page.mouse.move(getRandomNumber(100), getRandomNumber(300), { steps: 20 });

  // await fileChooser.setFiles(mp4Path);

  execFile('uploadFile.exe', [path.dirname(mp4Path), path.basename(mp4Path)]);

  await delay(2500);

  console.log(`[upload] ✓ Đã set file: ${mp4Path}`);

  await page.waitForTimeout(getRandomNumber(1000));

  // ── Step 5: Chờ YouTube xử lý upload và chuyển sang form "Chi tiết" ───
  //    workflow-step chuyển từ "SELECT_FILES" → bước khác khi upload bắt đầu.
  console.log('[upload] Step 5: Chờ YouTube xử lý file...');

  try {
    // Cách 1: Chờ workflow-step thay đổi (không còn SELECT_FILES)
    await page.waitForSelector(YOUTUBE_SELECTOR.formDetails, {
      state: 'attached',
      timeout: 60000,
    });
  } catch {}
  console.log('[upload] ✓ Form chi tiết đã xuất hiện — sẵn sàng edit title/description');
}

/**
 * Đọc video-meta.json từ folder video và điền title, description, tags vào form YouTube Studio.
 * Mỗi step riêng biệt, dễ quản lý & debug.
 * @param {import('playwright').Page} page
 * @param {string} videoFolderPath — đường dẫn tuyệt đối đến folder chứa video-meta.json
 */
async function fillVideoDetails(page, videoFolderPath) {
  // ── Đọc video-meta.json ─────────────────────────────────────────────────
  const meta = await getMetaInfo(videoFolderPath);
  console.log('🚀 ~ fillVideoDetails ~ meta:', meta);

  const title = meta.titleGemini || meta.title || '';
  const description = meta.descriptionGemini || meta.description || '';
  const tagsGemini = meta.tagsGemini || '';
  const tags = meta.tags || '';

  // ── Step 1: Xóa title cũ và nhập title mới ────────────────────────────
  if (title) {
    console.log('[edit] Step 1: Nhập Title...');

    await clickElement(page, YOUTUBE_SELECTOR.titleBox);
    await delay(500);
    await clearContent(page);
    // Nhập title mới
    await page.keyboard.insertText(title);
    console.log('[edit] ✓ Đã nhập Title');
    await delay(500);
  }

  // ── Step 2: Nhập Description ──────────────────────────────────────────
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

  // await clickXPathElement(page, YOUTUBE_SELECTOR.thumbnailBox);

  // await page.mouse.move(200, 150, { steps: 20 });

  await delay(2000);

  // Tìm file ảnh trong folder (jpg, png,  jpeg)
  const imageExts = ['.jpg', '.jpeg', '.png'];
  const folderFiles = fs.readdirSync(videoFolderPath);
  const imageFile = folderFiles.find(f => imageExts.includes(path.extname(f).toLowerCase()));

  if (imageFile) {
    // execFile('uploadVideoTest.exe', [videoFolderPath, imageFile]);
    // console.log(`[edit] ✓ Gọi uploadVideo.exe cho thumbnail: ${imageFile}`);

    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), clickElement(page, YOUTUBE_SELECTOR.thumbnailBox)]);

    await delay(1000);

    await fileChooser.setFiles(path.join(videoFolderPath, imageFile));

    // const btnUploadThumb = page.locator(`xpath=${thumbXpath}`);
    // let found = false;

    // for (let i = 0; i < 15; i++) {
    //   const count = await btnUploadThumb.count();

    //   if (count <= 0) {
    //     found = true;
    //     break;
    //   }

    //   await page.waitForTimeout(1000);
    // }

    // if (!found) {
    //   console.log('Đã upload thumbnail thành công');
    // }
  } else {
    console.log(`[edit] ⚠ Không tìm thấy file thumbnail (.jpg, .png...) trong ${videoFolderPath}`);
  }

  await delay(4000);

  // ── Step 3: Scroll xuống cuối và click "Hiển thị thêm" (Show more) ────
  console.log('[edit] Step 3: Click "Hiển thị thêm" (Show more)...');

  // Scroll xuống để nút "Show more" hiện ra
  const box = await page.locator(`${YOUTUBE_SELECTOR.boxUpload}`).boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(100 + Math.random() * 200);
    }
  }
  // await page.evaluate(() => {
  //   const dialog = document.querySelector('ytcp-uploads-dialog tp-yt-paper-dialog');
  //   if (dialog) dialog.scrollTop = dialog.scrollHeight;
  // });
  await delay(1000);
  await clickElement(page, YOUTUBE_SELECTOR.btnShowMore);
  console.log('[edit] ✓ Đã click "Hiển thị thêm"');
  await delay(1500);

  // ── Step 4: Scroll xuống và nhập Tags ─────────────────────────────────
  if (tags || tagsGemini) {
    console.log('[edit] Step 4: Nhập Tags...');
    // Scroll xuống phần Tags

    // 👉 lấy vị trí của vùng scroll
    // const box = await scrollEl.boundingBox();

    if (box) {
      // await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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

async function addRelatedVideo(page, isNeedAddRelatedVideo = false) {
  // thêm video liên quan
  await clickElement(page, YOUTUBE_SELECTOR.btnAddVideoRelated);

  await delay(3000);

  // chọn template đầu tiên
  await clickElement(page, YOUTUBE_SELECTOR.btnChooseTemplate);

  // if (isNeedAddRelatedVideo) {
  // click element
  await clickElement(page, YOUTUBE_SELECTOR.btnSelectElement);

  await delay(500);
  // chọn video
  await clickElement(page, YOUTUBE_SELECTOR.btnSelectVideo);
  // }

  // save
  await clickElement(page, YOUTUBE_SELECTOR.btnSaveRelatedVideo);

  await delay(5000);

  // goto check video
  await clickElement(page, YOUTUBE_SELECTOR.btnNextToCheckStep);

  await delay(2000);

  // goto visibility
  await clickElement(page, YOUTUBE_SELECTOR.btnNextToVisibilityStep);
}

/**
 * Chọn «Lên lịch» (Schedule); nếu có `slot` (từ `getYoutubePublishPlan` ở `main`) thì điền ngày/giờ.
 * @param {import('playwright').Page} page
 * @param {{ slot?: { date: string, time: string, iso?: string } | null, jobIndex: number, totalJobs: number }} ctx — `slot.date` MM/DD/YYYY
 */
async function chooseVisibility(page, ctx) {
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

  await page.waitForSelector(YOUTUBE_SELECTOR.popupWarning, {
    state: 'visible',
    timeout: 30000,
  });
  await delay(1000);
  await clickElement(page, YOUTUBE_SELECTOR.btnGotItWarning);
  await delay(2000);

  await page.reload();
}

/**
 * @param {Record<string, unknown>} raw
 */
export default async function main(raw = {}) {
  const gpmProfileId = typeof raw.gpmProfileId === 'string' ? raw.gpmProfileId.trim() : '';
  if (!gpmProfileId) throw new Error('Thiếu gpmProfileId.');

  const channelFolder = assertSafeChannelFolder(typeof raw.channelFolder === 'string' ? raw.channelFolder : '');
  const scheduleEmail = typeof raw.email === 'string' ? raw.email.trim() : '';
  const maxRaw = raw.maxUploads;
  const maxUploads =
    maxRaw == null || maxRaw === '' ? null : Number.isFinite(Number(maxRaw)) && Number(maxRaw) > 0 ? Math.floor(Number(maxRaw)) : null;

  const apiBase = apiRootForPlaywright(typeof raw.gpmApiBase === 'string' ? raw.gpmApiBase.trim() : '');

  const uploadFolderNames = Array.isArray(raw.uploadFolderNames)
    ? raw.uploadFolderNames.map(x => String(x ?? '').trim()).filter(Boolean)
    : null;

  const channelAbs = path.join(resolveChannelsDir(), channelFolder);
  const jobs = listUploadJobs(channelAbs, maxUploads, uploadFolderNames && uploadFolderNames.length > 0 ? uploadFolderNames : null);

  if (jobs.length === 0) {
    throw new Error(
      `Không có thư mục con nào chứa file .mp4 trong ${channelAbs} (đã giới hạn ${maxUploads == null ? 'tất cả' : maxUploads} video).`
    );
  }

  console.log(`[upload] Kênh «${channelFolder}»: ${jobs.length} video — GPM profile ${gpmProfileId}`);

  /** @type {Array<{ date: string, time: string, iso: string }> | null} */
  let publishSchedule = null;
  /** `uploadedVideos` trong config trước batch (cho addRelatedVideo). */
  let baselineUploadedVideosFromConfig = 0;
  if (scheduleEmail) {
    try {
      const { schedule, settings } = getYoutubePublishPlan({
        channelFolder,
        email: scheduleEmail,
        uploadCount: jobs.length,
      });
      publishSchedule = schedule;
      baselineUploadedVideosFromConfig = Number.isFinite(Number(settings?.uploadedVideos))
        ? Math.max(0, Math.floor(Number(settings.uploadedVideos)))
        : 0;
      console.log(`[upload] getYoutubePublishPlan: ${schedule.length} mốc (email «${scheduleEmail}»).`);
    } catch (e) {
      console.warn('[upload] getYoutubePublishPlan:', e instanceof Error ? e.message : e);
    }
  } else {
    console.warn('[upload] Thiếu email — không tính lịch publish, chỉ bấm Schedule.');
  }

  const gpmOpts = { apiBase };

  let browser;
  try {
    const connected = await connectPlaywrightToGpmProfile(gpmProfileId, gpmOpts);
    browser = connected.browser;
    let page = connected.page;

    /** Thư mục video đã chạy xong toàn bộ bước upload + schedule (theo thứ tự jobs). */
    const successfulFolderNames = [];

    for (let i = 0; i < jobs.length; i++) {
      const { folderName, folderPath, mp4Path } = jobs[i];
      console.log(`[upload] (${i + 1}/${jobs.length}) Thư mục «${folderName}» → ${path.basename(mp4Path)}`);

      try {
        (await i) === 0 ? openYoutubeUpload(page, mp4Path) : selectFile(page, mp4Path);

        // Sau khi upload xong → điền title, description, tags
        await fillVideoDetails(page, folderPath);
        await addRelatedVideo(page, baselineUploadedVideosFromConfig === 2);
        await chooseVisibility(page, {
          slot: publishSchedule?.[i] ?? null,
          jobIndex: i,
          totalJobs: jobs.length,
        });
        successfulFolderNames.push(folderName);
      } catch (e) {
        console.warn('[upload]', e instanceof Error ? e.message : e);
      }

      if (i < jobs.length - 1) {
        await delay(2500 + Math.random() * 1500);
      }
    }

    await syncChannelAfterYoutubeUpload({
      channelFolder,
      email: scheduleEmail,
      successfulFolderNames,
      publishSchedule,
    });

    // await browser.close().catch(() => {});
    // browser = null;

    // try {
    //   await stopGpmProfile(gpmProfileId, gpmOpts);
    // } catch (e) {
    //   console.warn('[upload] stopGpmProfile:', e instanceof Error ? e.message : e);
    // }

    return {
      ok: true,
      uploaded: jobs.length,
      uploadedSuccessful: successfulFolderNames.length,
      channelFolder,
      jobs: jobs.map(j => ({ folder: j.folderName, file: path.basename(j.mp4Path) })),
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}
