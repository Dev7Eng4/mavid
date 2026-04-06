/**
 * Upload tuần tự file .mp4 lên YouTube qua trình duyệt profile GPM (API Local + CDP).
 * Mỗi thư mục con (sắp xếp tên) trong `MaVidMedia/channels/{channelFolder}/` có ít nhất một .mp4 → một lần upload.
 *
 * @param {object} params
 * @param {string} params.gpmProfileId — id profile GPM (UUID)
 * @param {string} params.channelFolder — tên thư mục kênh (an toàn, không ..)
 * @param {number | null | undefined} params.maxUploads — giới hạn số video; null/undefined = tất cả thư mục hợp lệ
 * @param {string} [params.gpmApiBase] — ví dụ http://127.0.0.1:19995/api/v3
 */
import fs from 'fs';
import path from 'path';
import { clickElement, delay, getRandomNumber, scrollUntilVisible } from '../utils/dom.util.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { connectPlaywrightToGpmProfile, stopGpmProfile } from './openGpmPlaywright.js';
import { execFile } from 'child_process';

/** @param {string} base */
function apiRootForPlaywright(base) {
  const s = String(base || '')
    .trim()
    .replace(/\/+$/, '');
  if (s.endsWith('/api/v3')) return s.slice(0, -'/api/v3'.length);
  return s || 'http://127.0.0.1:19995';
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

/**
 * Danh sách thư mục con có .mp4, sắp xếp tên (ổn định).
 * @param {string} channelAbs
 * @param {number | null} maxUploads
 */
function listUploadJobs(channelAbs, maxUploads) {
  if (!fs.existsSync(channelAbs)) throw new Error(`Không tìm thấy thư mục kênh: ${channelAbs}`);
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

/**
 * youtube.com → nút Tạo → «Tải video lên» → chọn file mp4 (giống người dùng).
 * Mỗi step dùng clickElement riêng biệt, dễ quản lý & debug.
 * @param {import('playwright').Page} page
 * @param {string} mp4Path — đường dẫn tuyệt đối đến file .mp4 cần upload
 */
async function openUploadAndSelectFile(page, mp4Path) {
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
  await clickElement(page, '/html/body/ytd-app/div[1]/div[2]/ytd-masthead/div[4]/div[3]/div[2]/ytd-button-renderer/yt-button-shape/button');
  await delay(getRandomNumber(500));

  // ── Step 3: Chọn mục "Tải video lên" (Upload videos) trong menu ─────
  console.log('[upload] Step 3: Chọn mục Tải video lên...');
  await clickElement(
    page,
    '/html/body/ytd-app/ytd-popup-container/tp-yt-iron-dropdown/div/ytd-multi-page-menu-renderer/div[3]/div[1]/yt-multi-page-menu-section-renderer/div[2]/ytd-compact-link-renderer[1]/a',
  );
  await delay(getRandomNumber(3000));

  await clickElement(
    page,
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-uploads-file-picker/div/ytcp-button/ytcp-button-shape/button',
  );

  // await moveToTopLeft(page, 100, 100);
  await page.mouse.move(200, 200, { steps: 20 });

  await delay(4000);

  execFile('uploadVideoTest.exe', [path.dirname(mp4Path), path.basename(mp4Path)]);
  // execFile('uploadVideo.exe', [
  //   'D:\\yup\\channels\\2ch-qp3vc\\jnwgkjqgxHM',
  //   '【2ch馴れ初め】お隣さんの美人女子大生を 住み込みで雇った結果、年下の彼女が出来た.mp4',
  // ]);

  console.log(`[upload] ✓ Đã set file: ${mp4Path}`);

  await page.waitForTimeout(getRandomNumber(1000));

  // ── Step 5: Chờ YouTube xử lý upload và chuyển sang form "Chi tiết" ───
  //    workflow-step chuyển từ "SELECT_FILES" → bước khác khi upload bắt đầu.
  console.log('[upload] Step 5: Chờ YouTube xử lý file...');

  try {
    // Cách 1: Chờ workflow-step thay đổi (không còn SELECT_FILES)
    await page.waitForSelector('ytcp-uploads-dialog:not([workflow-step="SELECT_FILES"])', {
      state: 'attached',
      timeout: 60000,
    });
  } catch {}
  console.log('[upload] ✓ Form chi tiết đã xuất hiện — sẵn sàng edit title/description');
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
 * Đọc video-meta.json từ folder video và điền title, description, tags vào form YouTube Studio.
 * Mỗi step riêng biệt, dễ quản lý & debug.
 * @param {import('playwright').Page} page
 * @param {string} videoFolderPath — đường dẫn tuyệt đối đến folder chứa video-meta.json
 */
async function fillVideoDetails(page, videoFolderPath) {
  // ── Đọc video-meta.json ─────────────────────────────────────────────────
  const meta = getMetaInfo(videoFolderPath);

  const title = meta.titleGemini || meta.title || '';
  const description = meta.descriptionGemini || meta.description || '';
  const tagsGemini = meta.tagsGemini || '';
  const tags = meta.tags || '';

  // ── Step 1: Xóa title cũ và nhập title mới ────────────────────────────
  if (title) {
    console.log('[edit] Step 1: Nhập Title...');
    const titleXpath =
      '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[1]/ytcp-video-title/div/ytcp-social-suggestions-textbox/ytcp-form-input-container/div[1]/div[2]/div/ytcp-social-suggestion-input/div';
    await clickElement(page, titleXpath);
    await delay(500);
    // Chọn tất cả text cũ và xóa
    await page.keyboard.press('Control+A');
    await delay(200);
    await page.keyboard.press('Backspace');
    await delay(300);
    // Nhập title mới
    await page.keyboard.insertText(title);
    console.log('[edit] ✓ Đã nhập Title');
    await delay(500);
  }

  // ── Step 2: Nhập Description ──────────────────────────────────────────
  if (description) {
    console.log('[edit] Step 2: Nhập Description...');
    const descXpath =
      '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[2]/ytcp-video-description/div/ytcp-social-suggestions-textbox/ytcp-form-input-container/div[1]/div[2]/div/ytcp-social-suggestion-input/div';
    await clickElement(page, descXpath);
    await delay(500);
    await page.keyboard.press('Control+A');
    await delay(200);
    await page.keyboard.press('Backspace');
    await delay(300);
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

  // upload thumbnail
  const thumbXpath =
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[3]/ytcp-video-thumbnail-editor/div[4]/ytcp-video-custom-still-editor/div/ytcp-thumbnail-uploader/ytcp-thumbnail-editor/div[1]/ytcp-ve/button';

  await scrollUntilVisible(page, thumbXpath, true, 100);

  // Lưu ý: Tôi đã thêm thao tác click gọi hộp thoại chọn file, vì thường phải click thì file dialog mới hiện ra.
  await clickElement(page, thumbXpath);

  await page.mouse.move(200, 150, { steps: 20 });

  await delay(4000);

  // Tìm file ảnh trong folder (jpg, png,  jpeg)
  const imageExts = ['.jpg', '.jpeg', '.png'];
  const folderFiles = fs.readdirSync(videoFolderPath);
  const imageFile = folderFiles.find(f => imageExts.includes(path.extname(f).toLowerCase()));

  if (imageFile) {
    execFile('uploadVideoTest.exe', [videoFolderPath, imageFile]);
    console.log(`[edit] ✓ Gọi uploadVideo.exe cho thumbnail: ${imageFile}`);

    const btnUploadThumb = page.locator(`xpath=${thumbXpath}`);
    let found = false;

    for (let i = 0; i < 15; i++) {
      const count = await btnUploadThumb.count();

      if (count <= 0) {
        found = true;
        break;
      }

      await page.waitForTimeout(1000);
    }

    if (!found) {
      console.log('Đã upload thumbnail thành công');
    }
  } else {
    console.log(`[edit] ⚠ Không tìm thấy file thumbnail (.jpg, .png...) trong ${videoFolderPath}`);
  }

  // ── Step 3: Scroll xuống cuối và click "Hiển thị thêm" (Show more) ────
  console.log('[edit] Step 3: Click "Hiển thị thêm" (Show more)...');
  const showMoreXpath =
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/div/ytcp-button/ytcp-button-shape/button';
  // Scroll xuống để nút "Show more" hiện ra
  const box = await page.locator('xpath=/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]').boundingBox();

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
  await clickElement(page, showMoreXpath);
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

      await scrollUntilVisible(
        page,
        '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-advanced/div[7]/ytcp-form-input-container',
        true,
      );
    }

    const tagsXpath =
      '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-advanced/div[7]/ytcp-form-input-container/div[1]/div/ytcp-free-text-chip-bar/ytcp-chip-bar/div/input';
    await clickElement(page, tagsXpath);
    await delay(500);

    await page.keyboard.insertText(tagsGemini);
    await delay(500);
  }

  console.log('[edit] ✓ Hoàn thành điền thông tin video! Sang bước tiếp theo');
  await clickElement(
    page,
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[2]/div/div[2]/ytcp-button[2]/ytcp-button-shape/button',
  );
}

async function addRelatedVideo(page, videoFolderPath) {
  const meta = getMetaInfo(videoFolderPath);

  // thêm video liên quan
  await clickElement(
    page,
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-uploads-video-elements/div[3]/ytcp-button[2]/ytcp-button-shape/button',
  );

  await delay(3000);

  // chọn template đầu tiên
  await clickElement(
    page,
    '/html/body/ytve-endscreen-modal/ytve-modal-host/ytcp-dialog/tp-yt-paper-dialog/div[2]/div/ytve-editor/div[1]/div/ytve-endscreen-editor-options-panel/div[2]/div/ytve-endscreen-template-picker/div/div/div/div[1]/div[1]',
  );

  if (meta?.uploadedVideos && meta?.uploadedVideos === 2) {
    // click element
    await clickElement(
      page,
      '/html/body/ytve-endscreen-modal/ytve-modal-host/ytcp-dialog/tp-yt-paper-dialog/div[2]/div/ytve-editor/div[1]/div/ytve-endscreen-editor-options-panel/div[1]/ytcp-button/ytcp-button-shape/button',
    );

    await delay(500);
    // chọn video
    await clickElement(page, '/html/body/ytcp-text-menu/tp-yt-paper-dialog/div/tp-yt-paper-listbox/tp-yt-paper-item[1]');
  }

  // save
  await clickElement(
    page,
    '/html/body/ytve-endscreen-modal/ytve-modal-host/ytcp-dialog/tp-yt-paper-dialog/div[1]/div/div[2]/div/div[2]/ytcp-button/ytcp-button-shape/button',
  );

  await delay(5000);

  // goto check video
  await clickElement(
    page,
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[2]/div/div[2]/ytcp-button[2]/ytcp-button-shape/button',
  );

  await delay(2000);

  // goto visibility
  await clickElement(
    page,

    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[2]/div/div[2]/ytcp-button[2]/ytcp-button-shape/button',
  );
}

async function chooseVisibility(page) {
  // chọn Schedule
  await clickElement(
    page,
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-uploads-review/div[2]/div[1]/ytcp-video-visibility-select/div[3]',
  );

  await delay(1500);
}

/**
 * @param {Record<string, unknown>} raw
 */
export default async function main(raw = {}) {
  const gpmProfileId = typeof raw.gpmProfileId === 'string' ? raw.gpmProfileId.trim() : '';
  if (!gpmProfileId) throw new Error('Thiếu gpmProfileId.');

  const channelFolder = assertSafeChannelFolder(typeof raw.channelFolder === 'string' ? raw.channelFolder : '');
  const maxRaw = raw.maxUploads;
  const maxUploads =
    maxRaw == null || maxRaw === '' ? null : Number.isFinite(Number(maxRaw)) && Number(maxRaw) > 0 ? Math.floor(Number(maxRaw)) : null;

  const apiBase = apiRootForPlaywright(typeof raw.gpmApiBase === 'string' ? raw.gpmApiBase : process.env.GPM_API_BASE);

  const channelAbs = path.join(resolveChannelsDir(), channelFolder);
  const jobs = listUploadJobs(channelAbs, maxUploads);

  if (jobs.length === 0) {
    throw new Error(
      `Không có thư mục con nào chứa file .mp4 trong ${channelAbs} (đã giới hạn ${maxUploads == null ? 'tất cả' : maxUploads} video).`,
    );
  }

  console.log(`[upload] Kênh «${channelFolder}»: ${jobs.length} video — GPM profile ${gpmProfileId}`);

  const gpmOpts = { apiBase };

  let browser;
  try {
    const connected = await connectPlaywrightToGpmProfile(gpmProfileId, gpmOpts);
    browser = connected.browser;
    let page = connected.page;

    for (let i = 0; i < jobs.length; i++) {
      const { folderName, folderPath, mp4Path } = jobs[i];
      console.log(`[upload] (${i + 1}/${jobs.length}) Thư mục «${folderName}» → ${path.basename(mp4Path)}`);

      try {
        await openUploadAndSelectFile(page, mp4Path);

        // Sau khi upload xong → điền title, description, tags
        await fillVideoDetails(page, folderPath);
        await addRelatedVideo(page, folderPath);
        await chooseVisibility(page);
      } catch (e) {
        console.warn('[upload]', e instanceof Error ? e.message : e);
      }

      if (i < jobs.length - 1) {
        await delay(2500 + Math.random() * 1500);
      }
    }

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
