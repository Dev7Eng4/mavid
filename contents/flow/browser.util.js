/**
 * Playwright: mở project Flow, cấu hình scene, gửi prompt, lấy ảnh từ API batchGenerateImages.
 */
import fs from 'fs';
import path from 'path';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { delay, clickElement } from '../utils/dom.util.js';
import { flowSettings } from '../constants/index.js';
import { FLOW_SELECTOR } from './selectors.js';
import { resolveFlowChromeProfile } from './chromeProfile.util.js';
import { FLOW_DOWNLOADS_DIR } from './paths.util.js';

async function superClear(page, context) {
  try {
    await context.clearCookies();
  } catch {
    /* ignore */
  }
}

export async function openFlowPage(page, projectUrl) {
  await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(500);

  await page.keyboard.press('Escape');
}

/**
 * @param {string} prompt
 * @param {string} pathSave — thư mục lưu `{exportName}.jpg`
 * @param {string} exportName — không đuôi
 * @param {object} [setting] — merge lên flowSettings
 * @param {boolean} [isNeedImage]
 */
export async function generateImageWithFlow(prompt, pathSave, exportName, setting = {}, isNeedImage = false) {
  const cfg = { ...flowSettings, ...setting };
  const chromeProfile = resolveFlowChromeProfile(cfg);
  console.log('🔄 Đang generate ảnh thumbnail từ Flow...');

  const { context, page } = await openChromeProfile({ profile: chromeProfile, visible: true });

  try {
    await openFlowPage(page, cfg.FLOW_URL + cfg.FLOW_PROJECT_ID);

    const dialogs = page.locator("div[data-state='open'][role='dialog']");
    const count = await dialogs.count();
    const isDialogOpen = count > 0;

    if (isDialogOpen) {
      console.log('Có popup hiện. Đang tắt popup!');
      const buttonXPath = 'html/body/div[1]/div[2]/div[2]/button';
      await clickElement(page, buttonXPath);
      await delay(1000);
    }

    const createWithFlowText = page.getByText('Create with Flow', { exact: true });

    if (await createWithFlowText.isVisible()) {
      console.log('🔄 Đang Create with Flow...');
      await delay(3000);
      await clickElement(page, FLOW_SELECTOR.btnCreateWithFlow, true);
    }

    await clickElement(page, FLOW_SELECTOR.btnConfig, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionRatio, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionQuantity, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionModel, true);
    await clickElement(page, FLOW_SELECTOR.btnOptionModelPro, true);

    await page.keyboard.press('Escape');

    await delay(500);

    console.log('🔄 Đang check file exists...', isNeedImage, fs.existsSync(FLOW_DOWNLOADS_DIR));

    if (fs.existsSync(FLOW_DOWNLOADS_DIR)) {
      console.log('🔄 Đang attach ảnh thumbnail...');
      const files = fs.readdirSync(FLOW_DOWNLOADS_DIR);
      const thumbFile = files.find(f => f.startsWith('thumbnail.'));

      if (thumbFile) {
        console.log('🔄 Đang click button attach...');
        await clickElement(page, FLOW_SELECTOR.btnAttach, true);

        await delay(2000);

        console.log('🔄 Đang click button upload image...');

        const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), clickElement(page, FLOW_SELECTOR.btnUploadImage, true)]);
        console.log('🔄 Đang set files...');
        await fileChooser.setFiles(path.join(FLOW_DOWNLOADS_DIR, thumbFile));
        console.log('🔄 Đã set files...');
        await delay(2900);

        console.log('[flow] Đang chờ nút xử lý được enable (upload hoàn tất)...');
        await page.waitForFunction(
          xpath => {
            const btn = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return btn && !btn.disabled;
          },
          FLOW_SELECTOR.btnCreateHaveImage,
          { timeout: 60000 },
        );
        console.log('✅ Nút đã sẵn sàng!');

        await delay(2000);
      }
    }

    await clickElement(page, FLOW_SELECTOR.textbox);
    await delay(1000);
    await page.keyboard.insertText(prompt);

    await page.keyboard.press('Enter');

    const [response] = await Promise.all([
      page.waitForResponse(
        async res => {
          const isMatch = res
            .url()
            .includes(`https://aisandbox-pa.googleapis.com/v1/projects/${cfg.FLOW_PROJECT_ID}/flowMedia:batchGenerateImages`);

          if (isMatch) {
            if (res.status() === 403) {
              await superClear(page, context);
              throw new Error('Lỗi 403: Bạn không có quyền truy cập hoặc bị chặn!');
            }
            if (res.status() === 400) {
              throw new Error(`Lỗi vi phạm chính sách tạo ảnh`);
            }
            if (res.status() > 400) {
              throw new Error(`Server trả lỗi: ${res.status()}`);
            }
            return true;
          }
          return false;
        },
        { timeout: 3 * 60 * 1000 },
      ),
    ]);

    const data = await response.json();
    if (!data?.media[0]?.image?.generatedImage?.fifeUrl) throw new Error('Không lấy được ảnh từ flow', response);

    const imageUrl = data?.media[0].image.generatedImage.fifeUrl;
    const imageData = await fetch(imageUrl);
    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const base64OutputPath = path.join(pathSave, `${exportName}.jpg`);
    fs.mkdirSync(pathSave, { recursive: true });
    fs.writeFileSync(base64OutputPath, imageBase64, 'base64');
    console.log('✅ Đã lưu ảnh vào file:', base64OutputPath);
  } catch (error) {
    console.error('❌ Lỗi: Tạo thumbnail flow:', error);
    throw error;
  } finally {
    if (context) {
      console.log('🔒 Đang đóng browser...');
      await delay(3000);
      await context.close();
    }
  }
}
