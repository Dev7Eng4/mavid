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
import { delay } from '../utils/dom.util.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';
import { connectPlaywrightToGpmProfile, stopGpmProfile } from './openGpmPlaywright.js';

/** @param {string} base */
function apiRootForPlaywright(base) {
  const s = String(base || '').trim().replace(/\/+$/, '');
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
    jobs.push({ folderName: name, mp4Path: mp4 });
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
 * youtube.com → nút Tạo → «Tải video lên» / Upload videos (giống người dùng).
 * @param {import('playwright').Page} page
 */
async function openUploadViaCreateMenu(page) {
  await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await humanWarmup(page);

  try {
    await page.keyboard.press('Escape');
    await delay(400);
  } catch {
    /* ignore */
  }

  const createLocators = [
    page.getByRole('button', { name: /^Tạo$/i }),
    page.getByRole('button', { name: /^Create$/i }),
    page.locator('yt-icon-button[aria-label*="Tạo" i]'),
    page.locator('yt-icon-button[aria-label*="Create" i]'),
    page.locator('#buttons yt-icon-button button').first(),
  ];

  let openedMenu = false;
  for (const loc of createLocators) {
    try {
      const el = loc.first();
      if (await el.isVisible({ timeout: 4000 }).catch(() => false)) {
        const box = await el.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 });
          await delay(350 + Math.random() * 500);
          await el.click({ timeout: 8000 });
          openedMenu = true;
          break;
        }
      }
    } catch {
      /* thử locator khác */
    }
  }

  if (!openedMenu) {
    throw new Error('Không bấm được nút Tạo trên YouTube.');
  }

  await delay(700 + Math.random() * 800);

  const uploadLinks = [
    page.getByRole('link', { name: /Tải video lên/i }),
    page.getByRole('link', { name: /Upload videos/i }),
    page.getByRole('link', { name: /Upload$/i }),
    page.locator('a[href*="upload"]').filter({ has: page.locator('tp-yt-paper-item-body, yt-formatted-string') }).first(),
  ];

  let picked = false;
  for (const loc of uploadLinks) {
    try {
      const el = loc.first();
      if (await el.isVisible({ timeout: 6000 }).catch(() => false)) {
        const box = await el.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
          await delay(400 + Math.random() * 450);
          await el.click({ timeout: 10000 });
          picked = true;
          break;
        }
      }
    } catch {
      /* next */
    }
  }

  if (!picked) {
    throw new Error('Không thấy mục «Tải video lên» / Upload videos sau khi mở menu Tạo.');
  }

  await delay(2000 + Math.random() * 1200);
  await page.waitForSelector('input[type=file]', { timeout: 90000 });
}

/**
 * @param {import('playwright').Page} page
 */
async function openUploadFallbackDirect(page) {
  console.log('[upload] Fallback: mở https://www.youtube.com/upload');
  await page.goto('https://www.youtube.com/upload', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await humanWarmup(page);
  await page.waitForSelector('input[type=file]', { timeout: 90000 });
}

/**
 * @param {import('playwright').Page} page
 * @param {string} mp4Path
 */
async function attachMp4HumanLike(page, mp4Path) {
  await humanWarmup(page);
  const input = page.locator('input[type=file]').first();
  await input.waitFor({ state: 'attached', timeout: 30000 });
  await input.setInputFiles(mp4Path);
  console.log(`[upload] Đã gắn file: ${mp4Path}`);
  await delay(1500 + Math.random() * 1000);
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
    maxRaw == null || maxRaw === ''
      ? null
      : Number.isFinite(Number(maxRaw)) && Number(maxRaw) > 0
        ? Math.floor(Number(maxRaw))
        : null;

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
      const { folderName, mp4Path } = jobs[i];
      console.log(`[upload] (${i + 1}/${jobs.length}) Thư mục «${folderName}» → ${path.basename(mp4Path)}`);

      if (i === 0) {
        try {
          await openUploadViaCreateMenu(page);
        } catch (e) {
          console.warn('[upload]', e instanceof Error ? e.message : e);
          await openUploadFallbackDirect(page);
        }
      } else {
        await openUploadFallbackDirect(page);
      }

      await attachMp4HumanLike(page, mp4Path);

      if (i < jobs.length - 1) {
        await delay(2500 + Math.random() * 1500);
      }
    }

    await browser.close().catch(() => {});
    browser = null;

    try {
      await stopGpmProfile(gpmProfileId, gpmOpts);
    } catch (e) {
      console.warn('[upload] stopGpmProfile:', e instanceof Error ? e.message : e);
    }

    return { ok: true, uploaded: jobs.length, channelFolder, jobs: jobs.map(j => ({ folder: j.folderName, file: path.basename(j.mp4Path) })) };
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
