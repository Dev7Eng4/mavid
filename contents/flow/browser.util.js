/**
 * Playwright: mở project Flow, cấu hình scene, gửi prompt, lấy ảnh từ API batchGenerateImages.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { delay, clickElement } from '../utils/dom.util.js';
import { flowSettings } from '../constants/index.js';
import { FLOW_SELECTOR } from './selectors.js';
import { resolveFlowChromeProfile } from './chromeProfile.util.js';
import { FLOW_DOWNLOADS_DIR } from './paths.util.js';
import { FLOW_SETTINGS } from '../constant/index.js';
import { openMyTool } from './createMediaWithTool.js';

async function superClear(page, context) {
  try {
    await context.clearCookies();
  } catch {
    /* ignore */
  }
}

export async function openFlow(page, projectId) {
  let internalProjectId = projectId;

  if (!projectId) {
    await page.goto(FLOW_SETTINGS.FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await clickElement(page, FLOW_SELECTOR.btnNewProject, true);

    internalProjectId = await getProjectId(page);
  } else {
    await page.goto(`${FLOW_SETTINGS.FLOW_PROJECT_URL}/${projectId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await closeAnyPopup(page);
  // await setupFlow(page);

  return internalProjectId;
}

export async function openFlowPage({ profile = 1, projectId }) {
  const { context, page } = await openChromeProfile({ profile, visible: true });

  await page.goto(`${FLOW_SETTINGS.FLOW_PROJECT_URL}/${projectId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(500);

  await page.keyboard.press('Escape');

  await closeAnyPopup(page);

  await setupFlow(page);

  return { context, page };
}

async function closeAnyPopup(page) {
  const dialogs = page.locator("div[data-state='open'][role='dialog']");
  const count = await dialogs.count();
  const isDialogOpen = count > 0;

  if (isDialogOpen) {
    console.log('Có popup hiện. Đang tắt popup!');
    try {
      const buttonXPath = 'html/body/div[1]/div[2]/div[2]/button';
      await clickElement(page, buttonXPath);
      await delay(500);
    } catch (error) {
      console.error('❌ Lỗi: Tắt popup không thành công', error);
    }

    try {
      const buttonXPath = "div[data-state='open'][role='dialog'] button";
      await clickElement(page, buttonXPath);
      await delay(500);
    } catch (error) {
      console.error('❌ Lỗi: Tắt popup không thành công', error);
    }
  }
}

async function setupFlow(page) {
  try {
    const createWithFlowText = page.getByText('Create with Flow', { exact: true });

    if (await createWithFlowText.isVisible()) {
      console.log('🔄 Đang Create with Flow...');
      await delay(2000);
      await clickElement(page, FLOW_SELECTOR.btnCreateWithFlow, true);
    }

    await clickElement(page, FLOW_SELECTOR.btnConfig, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionRatio, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionQuantity, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionModel, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionModelPro, true);

    await page.keyboard.press('Escape');

    await delay(500);
  } catch (error) {
    console.error('❌ Lỗi: Setup flow:', error);
    throw error;
  }
}

export async function attachImage(page, pathSave) {
  try {
    if (fs.existsSync(pathSave)) {
      console.log('🔄 Đang attach ảnh thumbnail...');
      const files = fs.readdirSync(pathSave);
      const thumbFile = files.find(f => f.startsWith('thumbnail.'));

      if (thumbFile) {
        console.log('🔄 Đang click button attach...');
        await clickElement(page, FLOW_SELECTOR.btnAttach);

        await delay(2000);

        console.log('🔄 Đang click button upload image...');

        const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), clickElement(page, FLOW_SELECTOR.btnUploadImage, true)]);
        console.log('🔄 Đang set files...');
        await fileChooser.setFiles(path.join(pathSave, thumbFile));
        console.log('🔄 Đã set files...');
        await delay(2900);

        console.log('[flow] Đang chờ nút xử lý được enable (upload hoàn tất)...');
        await page.waitForFunction(
          xpath => {
            const btn = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return btn && !btn.disabled;
          },
          FLOW_SELECTOR.btnCreateHaveImage,
          { timeout: 60000 }
        );
        console.log('✅ Nút đã sẵn sàng!');

        await delay(2000);
      }
    }
  } catch (error) {
    console.error('❌ Lỗi: Attach image:', error);
    throw error;
  }
}

export async function inputPromptCreateImage(page, prompt) {
  await clickElement(page, FLOW_SELECTOR.textbox);
  await delay(1000);
  await page.keyboard.insertText(prompt);

  await page.keyboard.press('Enter');
}

async function getProjectId(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      async res => {
        const isMatch = res.url().includes(`https://labs.google/fx/api/trpc/project.createProject`);

        if (isMatch) return true;

        return false;
      },
      { timeout: 3 * 60 * 1000 }
    ),
  ]);

  const data = await response.json();
  const projectId = data?.result?.data?.json?.result?.projectId;

  if (!projectId) throw new Error('Không lấy được projectId từ flow', response);

  return projectId;
}

const PC_DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

/** Tìm file ảnh trong thư mục Downloads của PC theo tên (basename, không phân biệt hoa thường). */
function findImageInPcDownloads(name) {
  if (!name || !fs.existsSync(PC_DOWNLOADS_DIR)) return null;

  const trimmed = String(name).trim();
  const exactPath = path.join(PC_DOWNLOADS_DIR, trimmed);
  if (fs.existsSync(exactPath) && IMAGE_EXT_RE.test(trimmed)) {
    return exactPath;
  }

  const lowerBase = path.parse(trimmed).name.toLowerCase();
  for (const f of fs.readdirSync(PC_DOWNLOADS_DIR)) {
    if (!IMAGE_EXT_RE.test(f)) continue;
    if (path.parse(f).name.toLowerCase() === lowerBase) {
      return path.join(PC_DOWNLOADS_DIR, f);
    }
  }
  return null;
}

/**
 * Tìm ảnh có tên `name` trong Downloads của PC, copy vào `folderPath`.
 * @param {string} name — tên file hoặc basename (không bắt buộc đuôi)
 * @param {string} folderPath — thư mục đích
 * @returns {string} đường dẫn file đã copy
 */
export function copyImageToFolder(name, folderPath) {
  const imagePath = findImageInPcDownloads(name);
  if (!imagePath) {
    throw new Error(`copyImageToFolder: không tìm thấy ảnh "${name}" trong ${PC_DOWNLOADS_DIR}`);
  }

  fs.mkdirSync(folderPath, { recursive: true });
  const destPath = path.join(folderPath, path.basename(imagePath));
  fs.copyFileSync(imagePath, destPath);
  return destPath;
}

function batchGenerateImagesUrl(projectId) {
  return `https://aisandbox-pa.googleapis.com/v1/projects/${projectId}/flowMedia:batchGenerateImages`;
}

function isBatchGenerateImagesUrl(url, projectId) {
  return String(url).includes(batchGenerateImagesUrl(projectId));
}

function extractImageUrlsFromBatchData(data) {
  const media = data?.media ?? [];
  return media.map(m => m?.image?.generatedImage?.fifeUrl).filter(Boolean);
}

async function saveImageFromUrl(imageUrl, folder, exportName) {
  const imageData = await fetch(imageUrl);
  const imageBuffer = await imageData.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
  const base64OutputPath = path.join(folder, `${exportName}.jpg`);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(base64OutputPath, imageBase64, 'base64');
  return base64OutputPath;
}

async function saveImageFromBatchData(data, folder, exportName) {
  const imageUrl = extractImageUrlsFromBatchData(data)[0];
  if (!imageUrl) {
    throw new Error(`Không lấy được ảnh từ flow cho ${exportName}`);
  }
  return saveImageFromUrl(imageUrl, folder, exportName);
}

/**
 * Ghép cặp request POST ↔ response batchGenerateImages, lưu từng ảnh ngay khi API trả về.
 * Tránh lỗi N× waitForResponse bị response cũ/trùng chiếm slot hoặc chỉ lưu sau khi tất cả xong.
 *
 * @param {object} params
 * @param {import('playwright').Page} params.page
 * @param {string} params.projectId
 * @param {string} params.folder
 * @param {Array<{ name: string }>} params.prompts — thứ tự `name` khớp thứ tự request POST
 * @param {() => Promise<void>} params.trigger
 * @param {number} [params.timeoutMs=180000] — timeout cơ bản; tự cộng thêm theo số ảnh
 * @returns {Promise<{ saved: Array<{ exportName: string, path: string }>, failed: Array<{ exportName: string, reason: string, status?: number }>, total: number, downloaded: number, errors: number }>}
 */
export async function getResponseImages({ page, projectId, folder, prompts, trigger, timeoutMs = 3 * 60 * 1000 }) {
  if (!prompts?.length) {
    return { saved: [], failed: [], total: 0, downloaded: 0, errors: 0 };
  }

  const expected = prompts.length;
  const nameQueue = prompts.map(p => p.name);
  /** @type {Map<import('playwright').Request, string>} */
  const requestToName = new Map();
  const saved = [];
  /** @type {Array<{ exportName: string, reason: string, status?: number }>} */
  const failed = [];
  let armed = false;
  let inFlight = 0;
  let settled = false;

  return new Promise((resolve, reject) => {
    const totalTimeoutMs = timeoutMs + expected * 2 * 60 * 1000;

    const buildResult = () => ({
      saved: [...saved],
      failed: [...failed],
      total: expected,
      downloaded: saved.length,
      errors: failed.length,
    });

    const logProgress = () => {
      console.log(`📊 Tiến độ: ${saved.length} thành công / ${failed.length} lỗi / ${expected} tổng`);
    };

    const isProcessed = exportName => saved.some(s => s.exportName === exportName) || failed.some(f => f.exportName === exportName);

    const recordFailure = (exportName, reason, status) => {
      if (isProcessed(exportName)) return;
      failed.push({
        exportName,
        reason,
        ...(status != null && { status }),
      });
      console.warn(`❌ [${exportName}] ${reason}`);
      logProgress();
    };

    const markRemainingFailed = reason => {
      const remaining = [...nameQueue, ...requestToName.values()];
      nameQueue.length = 0;
      requestToName.clear();
      for (const exportName of remaining) {
        recordFailure(exportName, reason);
      }
    };

    const finish = fn => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      page.off('request', onRequest);
      page.off('response', onResponse);
      fn();
    };

    const tryResolve = () => {
      if (saved.length + failed.length >= expected && inFlight === 0) {
        logProgress();
        console.log('✅ Đã xử lý xong tất cả prompts');
        finish(() => resolve(buildResult()));
      }
    };

    const timer = setTimeout(() => {
      markRemainingFailed('timeout — không hoàn tất request/response');
      if (saved.length + failed.length > 0) {
        console.warn(`⚠️ Timeout — kết thúc với ${saved.length} thành công, ${failed.length} lỗi`);
        finish(() => resolve(buildResult()));
        return;
      }
      finish(() => reject(new Error(`Timeout ${totalTimeoutMs}ms: không nhận response batchGenerateImages nào`)));
    }, totalTimeoutMs);

    const onRequest = req => {
      if (!armed || settled) return;
      if (req.method() !== 'POST') return;
      if (!isBatchGenerateImagesUrl(req.url(), projectId)) return;

      const exportName = nameQueue.shift();
      if (!exportName) {
        console.warn('⚠️ batchGenerateImages request thừa — không còn tên export');
        return;
      }
      requestToName.set(req, exportName);
      console.log(`📤 [${exportName}] batchGenerateImages request (${expected - nameQueue.length}/${expected})`);
    };

    const onResponse = async res => {
      if (settled) return;
      const req = res.request();
      const exportName = requestToName.get(req);
      if (!exportName) return;

      requestToName.delete(req);
      inFlight++;

      try {
        const status = res.status();
        if (status === 403) {
          recordFailure(exportName, '403 — không có quyền truy cập hoặc bị chặn', 403);
          return;
        }
        if (status === 400) {
          recordFailure(exportName, '400 — vi phạm chính sách tạo ảnh', 400);
          return;
        }
        if (status > 400) {
          recordFailure(exportName, `server trả lỗi ${status}`, status);
          return;
        }

        const data = await res.json();
        const urls = extractImageUrlsFromBatchData(data);
        console.log('🚀 ~ getResponseImages ~ data:', exportName, data);

        if (!urls.length) {
          recordFailure(exportName, 'response không có URL ảnh');
          return;
        }

        const extraNames = [exportName];
        while (extraNames.length < urls.length && nameQueue.length > 0) {
          extraNames.push(nameQueue.shift());
        }

        for (let i = 0; i < urls.length; i++) {
          if (saved.length + failed.length >= expected) break;
          const name = extraNames[i] ?? `${exportName}-${i + 1}`;
          if (isProcessed(name)) continue;

          try {
            const filePath = await saveImageFromUrl(urls[i], folder, name);
            saved.push({ exportName: name, path: filePath });
            console.log(`✅ Đã lưu ${name}.jpg (${saved.length}/${expected})`);
            logProgress();
          } catch (err) {
            recordFailure(name, err.message || 'lỗi lưu file');
          }
        }
      } catch (err) {
        recordFailure(exportName, err.message || 'lỗi xử lý response');
      } finally {
        inFlight--;
        tryResolve();
      }
    };

    page.on('request', onRequest);
    page.on('response', onResponse);

    armed = true;
    Promise.resolve()
      .then(() => trigger())
      .catch(err => finish(() => reject(err)));
  });
}

export async function getResponseImage({ page, projectId, folder, exportName, trigger }) {
  const { saved, failed } = await getResponseImages({
    page,
    projectId,
    folder,
    prompts: [{ name: exportName }],
    trigger: trigger ?? (() => Promise.resolve()),
  });

  if (saved[0]) return saved[0];
  if (failed[0]) throw new Error(`[${exportName}] ${failed[0].reason}`);
  return null;
}

/**
 * @param {string} prompt
 * @param {string} browser
 * @param {string} pathSave — thư mục lưu `{exportName}.jpg`
 * @param {string} exportName — không đuôi
 * @param {object} [setting] — merge lên flowSettings
 * @param {boolean} [isNeedImage]
 */
export async function generateImageWithFlow(
  prompt,
  pathSave = FLOW_DOWNLOADS_DIR,
  exportName,
  setting = {},
  isNeedImage = false,
  pathOldImage
) {
  const cfg = { ...flowSettings, ...setting };

  const chromeProfile = resolveFlowChromeProfile(cfg);
  console.log('🔄 Đang generate ảnh thumbnail từ Flow...');

  // const { context, page } = await openChromeProfile({ profile: chromeProfile, visible: true });
  const { context, page } = await openFlowPage({ profile: chromeProfile, projectId: cfg.FLOW_PROJECT_ID });

  try {
    if (isNeedImage) {
      await attachImage(page, pathSave);
    }

    // await openMyTool(page);

    await getResponseImages({
      page,
      projectId: cfg.FLOW_PROJECT_ID,
      folder: pathSave,
      prompts: [{ name: exportName }],
      trigger: () => inputPromptCreateImage(page, prompt),
    });
  } catch (error) {
    console.error('❌ Lỗi: Tạo ảnh flow:', error);
    throw error;
  } finally {
    if (context) {
      console.log('🔒 Đang đóng browser...');
      await delay(3000);
      await context.close();
    }
  }
}
