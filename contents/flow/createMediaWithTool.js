import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { clickElement, delay, humanScroll } from '../utils/dom.util.js';
import { getResponseImages, openFlow } from './browser.util.js';
import { FLOW_DOWNLOADS_DIR } from './paths.util.js';
import { FLOW_SELECTOR } from './selectors.js';

/** Theo dõi vị trí chuột trên page (dùng cho đường di chuyển tự nhiên hơn). */
async function initMouseTracking(page) {
  await page.evaluate(() => {
    if (window.__mouseTrackingInstalled) return;
    window.__mouseTrackingInstalled = true;
    document.addEventListener(
      'mousemove',
      e => {
        window.__mouseX = e.clientX;
        window.__mouseY = e.clientY;
      },
      { passive: true }
    );
    window.__mouseX = innerWidth / 2;
    window.__mouseY = innerHeight / 2;
  });
}

/** Di chuyển chuột ngẫu nhiên nhẹ — mô phỏng người đang nhìn UI. */
async function humanIdle(page, moves = 2) {
  const vp = page.viewportSize();
  const width = vp?.width ?? 1280;
  const height = vp?.height ?? 720;

  for (let i = 0; i < moves; i++) {
    const x = width * (0.15 + Math.random() * 0.55);
    const y = height * (0.12 + Math.random() * 0.5);
    const steps = Math.floor(10 + Math.random() * 18);
    await page.mouse.move(x, y, { steps });
    await delay(60, 150);
  }
  await delay(180, 320);
}

/** Cuộn từ từ nếu nút gần sát mép viewport. */
async function ensureButtonInView(page, locator) {
  const needsScroll = await locator
    .evaluate(el => {
      const rect = el.getBoundingClientRect();
      const h = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < 48 || rect.bottom > h - 48;
    })
    .catch(() => true);

  if (!needsScroll) return;

  const box = await locator.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2 + (Math.random() * 20 - 10), box.y + box.height / 2, {
      steps: Math.floor(12 + Math.random() * 10),
    });
    await delay(100, 180);
  }
  await humanScroll(page, 90 + Math.random() * 110);
  await delay(220, 380);
}

/** Nút Tools: icon apps_spark_2 trong i.google-symbols (nhãn "Tools" nằm trong span ẩn). */
function getToolsButton(page) {
  return page
    .locator(FLOW_SELECTOR.btnTools)
    .or(page.locator(`xpath=${FLOW_SELECTOR.btnToolsWrapper}`))
    .first();
}

/**
 * Locator theo nhãn hiển thị trên UI Flow (ví dụ: `page.getByText('Create with Flow', { exact: true })`).
 * @param {import('playwright').Page} page
 * @param {string} label
 */
function getFlowButtonByText(page, label) {
  if (label === 'Tools') return getToolsButton(page);
  return page.getByText(label, { exact: true });
}

/**
 * Click nút Flow theo nhãn — di chuyển chuột + jitter + delay ngẫu nhiên (qua clickElement).
 * @param {import('playwright').Page} page
 * @param {string} label
 */
async function clickFlowButtonByText(page, label) {
  const btn = getFlowButtonByText(page, label);
  await btn.waitFor({ state: 'visible', timeout: 30000 });

  await delay(350, 450);
  await ensureButtonInView(page, btn);

  try {
    await btn.hover({ timeout: 8000 });
    await delay(100, 220);
  } catch {
    /* hover thất bại vẫn click bằng mouse.move trong clickElement */
  }

  await clickElement(page, btn, false, true);
}

/** Mở menu Tools → My tools trên trang Flow (hành vi giống người dùng). */
export async function openMyTool(page) {
  await initMouseTracking(page);
  await delay(450, 650);
  await humanIdle(page, 1);

  console.log('🔄 Đang mở Tools...');
  await clickFlowButtonByText(page, 'Tools');

  await delay(650, 950);
  await humanIdle(page, 1);

  console.log('🔄 Đang mở My tools...');
  await clickFlowButtonByText(page, 'My Tools');

  await delay(650, 950);
  await humanIdle(page, 1);

  console.log('🔄 Đang mở MaVidMedia...');
  await clickFlowButtonByText(page, 'MavidMedia');

  await page.waitForTimeout(4000);
  await delay(380, 580);

  console.log('🔄 Đang chờ UI MaVid trong iframe...');
  await waitForMaVidToolFrame(page);
}

/** Locator iframe đầu tiên trên trang. */
function getFirstIframe(page) {
  return page.locator(FLOW_SELECTOR.toolIframe).first();
}

/** FrameLocator — nội dung bên trong iframe đầu tiên. */
function getToolFrame(page) {
  return getFirstIframe(page).contentFrame();
}

/** Chờ có iframe, rồi editor MaVid trong iframe đầu tiên. */
export async function waitForMaVidToolFrame(page, timeoutMs = 60000) {
  const iframe = getFirstIframe(page);
  await iframe.waitFor({ state: 'attached', timeout: timeoutMs });

  const iframes = page.locator(FLOW_SELECTOR.toolIframe);
  const count = await iframes.count();
  console.log(`📦 Số iframe: ${count} — dùng iframe đầu tiên`);
  for (let i = 0; i < count; i++) {
    const el = iframes.nth(i);
    const title = (await el.getAttribute('title')) ?? '';
    const src = (await el.getAttribute('src')) ?? '';
    console.log(`   [${i}] title="${title}" src=${src ? `${src.slice(0, 60)}…` : '(rỗng)'}`);
  }

  const editor = getToolFrame(page).locator(FLOW_SELECTOR.toolEditorPrompt);
  await editor.waitFor({ state: 'visible', timeout: timeoutMs });
}

/**
 * @param {import('playwright').Page} page
 * @param {string} selector — selector trong document iframe
 */
function getToolLocator(page, selector) {
  return getToolFrame(page).locator(selector);
}

export async function startCreate(page, prompts) {
  const prompt = getToolLocator(page, FLOW_SELECTOR.toolEditorPrompt);
  await prompt.waitFor({ state: 'visible', timeout: 30000 });

  await clickElement(page, prompt, false, true);
  await delay(1000);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');

  await page.waitForTimeout(300, 500);

  await page.keyboard.insertText(JSON.stringify(prompts));
  await page.keyboard.press('Enter');

  const btnGenerate = getToolLocator(page, FLOW_SELECTOR.btnToolGenerate);
  await btnGenerate.waitFor({ state: 'visible', timeout: 30000 });
  await clickElement(page, btnGenerate, false, true);

  // await delay(10000);
}

/**
 * Mở Chrome + Flow, gửi batch prompt qua MaVid tool, lưu ảnh theo `name`.
 * @param {object} params
 * @param {Array<{ name: string, prompt: string }>} params.prompts
 * @param {string} [params.pathSave]
 * @param {number} [params.profile=1]
 */
export async function createBatchMedia({ prompts, pathSave = FLOW_DOWNLOADS_DIR, profile = 1 }) {
  const { context, page } = await openChromeProfile({ profile, visible: true });

  try {
    const projectId = await openFlow(page);

    await openMyTool(page);

    const result = await getResponseImages({
      page,
      projectId,
      folder: pathSave,
      prompts,
      trigger: () => startCreate(page, prompts),
    });

    if (result.saved.length) {
      console.log(
        '   Ảnh đã lưu:',
        result.saved.map(s => s.path)
      );
    }
    if (result.failed.length) {
      console.log(
        '   Ảnh lỗi:',
        result.failed.map(f => `${f.exportName}: ${f.reason}`)
      );
    }

    console.log(`✅ Batch xong — ${result.downloaded} thành công, ${result.errors} lỗi / ${result.total} tổng`);
    return result;
  } finally {
    console.log('🔒 Đang đóng browser...');
    await delay(1500, 500);
    await context.close();
  }
}
