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
import { clickElement, delay } from '../utils/dom.util.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { connectPlaywrightToGpmProfile, stopGpmProfile } from './openGpmPlaywright.js';

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
  await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 120000 });
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
  await delay(700 + Math.random() * 800);

  // ── Step 3: Chọn mục "Tải video lên" (Upload videos) trong menu ─────
  console.log('[upload] Step 3: Chọn mục Tải video lên...');
  await clickElement(
    page,
    '/html/body/ytd-app/ytd-popup-container/tp-yt-iron-dropdown/div/ytd-multi-page-menu-renderer/div[3]/div[1]/yt-multi-page-menu-section-renderer/div[2]/ytd-compact-link-renderer[1]/a',
  );
  await delay(2000 + Math.random() * 1200);

  // Chờ upload dialog xuất hiện (element ẩn, dùng 'attached' thay vì 'visible')
  await page.waitForSelector('ytcp-uploads-dialog', { state: 'attached', timeout: 30000 });
  console.log('[upload] ✓ Upload dialog đã xuất hiện');

  // ── Step 4: Set file trực tiếp qua input[type=file] ẩn ────────────────
  //    Không click nút "Chọn tệp" → tránh popup native của OS.
  //    setInputFiles() dispatch event 'change' mà YouTube cần.

  console.log(`[upload] Step 4: Set file ${path.basename(mp4Path)}...`);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: 'attached', timeout: 30000 });
  await fileInput.setInputFiles(mp4Path);
  console.log(`[upload] ✓ Đã set file: ${mp4Path}`);

  await delay(1000);

  await clickElement(
    page,
    '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-uploads-file-picker/div/ytcp-button/ytcp-button-shape/button',
  );

  // ── Step 5: Chờ YouTube xử lý upload và chuyển sang form "Chi tiết" ───
  //    workflow-step chuyển từ "SELECT_FILES" → bước khác khi upload bắt đầu.
  console.log('[upload] Step 5: Chờ YouTube xử lý file...');
  try {
    // Cách 1: Chờ workflow-step thay đổi (không còn SELECT_FILES)
    await page.waitForSelector('ytcp-uploads-dialog:not([workflow-step="SELECT_FILES"])', {
      state: 'attached',
      timeout: 60000,
    });
    console.log('[upload] ✓ YouTube đã nhận file — đang chuyển sang form chi tiết');
  } catch {
    // Cách 2: Nếu cách 1 không được, thử chờ metadata editor
    console.log('[upload] ⚠ workflow-step không đổi, thử chờ metadata editor...');
    await page.waitForSelector('ytcp-video-metadata-editor, #details', {
      state: 'attached',
      timeout: 120000,
    });
  }
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
  const metaPath = path.join(videoFolderPath, 'video-meta.json');
  if (!fs.existsSync(metaPath)) {
    console.warn(`[edit] ⚠ Không tìm thấy ${metaPath} — bỏ qua edit details.`);
    return;
  }

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    console.warn(`[edit] ⚠ Lỗi đọc video-meta.json: ${e.message}`);
    return;
  }

  const title = meta.titleGemini || meta.title || '';
  const description = meta.descriptionGemini || meta.description || '';
  const tags = meta.tagsGemini || meta.tags || '';

  console.log(`[edit] Bắt đầu điền thông tin video...`);
  console.log(`[edit]   Title: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`);
  console.log(`[edit]   Description: ${description.substring(0, 60)}${description.length > 60 ? '...' : ''}`);
  console.log(`[edit]   Tags: ${tags.substring(0, 60)}${tags.length > 60 ? '...' : ''}`);

  // ── Step 1: Xóa title cũ và nhập title mới ────────────────────────────
  if (title) {
    console.log('[edit] Step 1: Nhập Title...');
    const titleXpath = '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[1]/ytcp-video-title/div/ytcp-social-suggestions-textbox/ytcp-form-input-container/div[1]/div[2]/div/ytcp-social-suggestion-input/div';
    await clickElement(page, titleXpath);
    await delay(500);
    // Chọn tất cả text cũ và xóa
    await page.keyboard.press('Control+A');
    await delay(200);
    await page.keyboard.press('Backspace');
    await delay(300);
    // Nhập title mới
    await page.keyboard.type(title, { delay: 30 });
    console.log('[edit] ✓ Đã nhập Title');
    await delay(500);
  }

  // ── Step 2: Nhập Description ──────────────────────────────────────────
  if (description) {
    console.log('[edit] Step 2: Nhập Description...');
    const descXpath = '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-basics/div[2]/ytcp-video-description/div/ytcp-social-suggestions-textbox/ytcp-form-input-container/div[1]/div[2]/div/ytcp-social-suggestion-input/div';
    await clickElement(page, descXpath);
    await delay(500);
    await page.keyboard.press('Control+A');
    await delay(200);
    await page.keyboard.press('Backspace');
    await delay(300);
    await page.keyboard.type(description, { delay: 10 });
    console.log('[edit] ✓ Đã nhập Description');
    await delay(500);
  }

  // ── Step 3: Scroll xuống cuối và click "Hiển thị thêm" (Show more) ────
  console.log('[edit] Step 3: Click "Hiển thị thêm" (Show more)...');
  const showMoreXpath = '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/div/ytcp-button/ytcp-button-shape/button';
  // Scroll xuống để nút "Show more" hiện ra
  await page.evaluate(() => {
    const dialog = document.querySelector('ytcp-uploads-dialog tp-yt-paper-dialog');
    if (dialog) dialog.scrollTop = dialog.scrollHeight;
  });
  await delay(1000);
  await clickElement(page, showMoreXpath);
  console.log('[edit] ✓ Đã click "Hiển thị thêm"');
  await delay(1500);

  // ── Step 4: Scroll xuống và nhập Tags ─────────────────────────────────
  if (tags) {
    console.log('[edit] Step 4: Nhập Tags...');
    // Scroll xuống phần Tags
    await page.evaluate(() => {
      const dialog = document.querySelector('ytcp-uploads-dialog tp-yt-paper-dialog');
      if (dialog) dialog.scrollTop = dialog.scrollHeight;
    });
    await delay(1000);

    const tagsXpath = '/html/body/ytcp-uploads-dialog/tp-yt-paper-dialog/div/ytcp-animatable[1]/ytcp-ve/ytcp-video-metadata-editor/div/ytcp-video-metadata-editor-advanced/div[7]/ytcp-form-input-container/div[1]/div/ytcp-free-text-chip-bar/ytcp-chip-bar/div/input';
    await clickElement(page, tagsXpath);
    await delay(500);

    // Nhập từng tag, phân tách bằng dấu phẩy → mỗi tag nhấn Enter để tạo chip
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    for (const tag of tagList) {
      await page.keyboard.type(tag, { delay: 20 });
      await delay(200);
      await page.keyboard.press('Enter');
      await delay(300);
    }
    console.log(`[edit] ✓ Đã nhập ${tagList.length} tags`);
    await delay(500);
  }

  console.log('[edit] ✓ Hoàn thành điền thông tin video!');
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
