export const getRandomNumber = (number, size = 1000) => number + Math.random() * size;

const randomBetween = (min, max) => min + Math.random() * (max - min);

function bezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Sinh số ngẫu nhiên trong khoảng [min, max] */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

export const delay = (ms, size = 1000) =>
  new Promise(resolve => {
    return setTimeout(resolve, getRandomNumber(ms, 1000));
  });

export async function moveToTopLeft(
  page,
  /* toạ độ đích — mặc định góc trên trái */
  targetX = 0,
  targetY = 0,
  options = {
    steps: 60,
    minDelay: 8,
    maxDelay: 20,
    overshoot: true,
  }
) {
  const { steps = 60, minDelay = 8, maxDelay = 20, overshoot = true } = options;

  // Lấy vị trí chuột hiện tại qua evaluate
  const { startX, startY } = await page.evaluate(() => ({
    startX: window.__mouseX ?? innerWidth / 2,
    startY: window.__mouseY ?? innerHeight / 2,
  }));

  // Theo dõi toạ độ chuột phía client
  await page.evaluate(() => {
    document.addEventListener(
      'mousemove',
      e => {
        window.__mouseX = e.clientX;
        window.__mouseY = e.clientY;
      },
      { once: false }
    );
  });

  // Điểm kiểm soát Bezier ngẫu nhiên —
  // tạo cảm giác đường cong tự nhiên, không thẳng
  const cp1x = rand(startX * 0.2, startX * 0.8);
  const cp1y = rand(startY * 0.1, startY * 0.5);
  const cp2x = rand(targetX, targetX + startX * 0.3);
  const cp2y = rand(targetY, targetY + startY * 0.3);

  // Tuỳ chọn overshoot: vượt qua góc một chút rồi quay lại
  const endX = overshoot ? rand(-5, 3) : targetX;
  const endY = overshoot ? rand(-5, 3) : targetY;

  // Di chuyển theo đường cong
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Easing: chậm đầu, nhanh giữa, chậm cuối
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const x = Math.round(bezier(ease, startX, cp1x, cp2x, endX));
    const y = Math.round(bezier(ease, startY, cp1y, cp2y, endY));

    await page.mouse.move(x, y);

    // Delay ngẫu nhiên — tạo nhịp điệu không đều như tay người
    const delay = rand(minDelay, maxDelay);
    await sleep(delay);
  }

  // Nếu overshoot, correction nhẹ về đúng góc trái
  if (overshoot) {
    await sleep(rand(40, 80));
    await page.mouse.move(targetX, targetY);
  }
}

export const clickElement = async (page, selector, isXpath = false, isElement = false) => {
  const element = isElement ? selector : isXpath ? page.locator(`xpath=${selector}`) : selectElement(page, selector);
  console.log('🚀 ~ clickElement ~ element:', element);

  const box = await element.boundingBox();

  if (!box) throw new Error('Element not found');

  const targetPosition = {
    x: box.x + box.width * randomBetween(0.3, 0.7),
    y: box.y + box.height * randomBetween(0.3, 0.7),
  };

  const steps = Math.floor(randomBetween(20, 35));

  await page.mouse.move(targetPosition.x, targetPosition.y, { steps });

  const jitterCount = Math.floor(randomBetween(2, 5));

  for (let i = 0; i < jitterCount; i++) {
    await page.mouse.move(targetPosition.x + randomBetween(-2, 2), targetPosition.y + randomBetween(-2, 2));
    await delay(randomBetween(30, 80));
  }

  await delay(randomBetween(150, 600));

  const clickTarget = {
    x: targetPosition.x + randomBetween(-3, 3),
    y: targetPosition.y + randomBetween(-3, 3),
  };

  await page.mouse.move(clickTarget.x, clickTarget.y);

  // await page.mouse.click(position.x, position.y);
  await page.mouse.down();
  await delay(randomBetween(50, 180));
  await page.mouse.up();
};

export const clickXPathElement = async (page, selector) => {
  await clickElement(page, selector, true);
};

export const selectElement = (page, selector) => {
  return page.locator(selector).first();
};

async function humanScroll(page, distance) {
  // Người thật không cuộn 1 cú wheel = 300px
  // Họ lăn nhiều tick nhỏ liên tiếp, tốc độ không đều
  const tickSize = 80 + Math.random() * 40; // ~80-120px mỗi tick
  const ticks = Math.ceil(distance / tickSize);

  for (let i = 0; i < ticks; i++) {
    const amount = tickSize + Math.random() * 20;
    await page.mouse.wheel(0, amount);

    // Delay giữa các tick: không đều, đôi khi dừng nhẹ
    await page.waitForTimeout(30 + Math.random() * 60);
  }

  // Đôi khi người thật dừng lại đọc nội dung
  if (Math.random() < 0.3) {
    await page.waitForTimeout(400 + Math.random() * 600);
  }
}

async function isElementInViewport(page, selector, isFullXpath = false) {
  // const locator = isFullXpath ? page.locator(`xpath=${selector}`) : page.locator(selector);

  // const count = await locator.count();
  // if (count === 0) return false;

  // return locator.evaluate(el => {
  //   const rect = el.getBoundingClientRect();
  //   return rect.top >= 0 && rect.bottom <= window.innerHeight;
  // });
  const locator = isFullXpath ? page.locator(`xpath=${selector}`) : page.locator(selector);

  // Tránh lỗi strict mode nếu có nhiều element, ta lấy cái đầu tiên
  const firstLocator = locator.first();

  const count = await firstLocator.count();
  if (count === 0) return false;

  return firstLocator.evaluate(el => {
    const rect = el.getBoundingClientRect();

    // Sử dụng window.inner... hoặc document.documentElement.client... để hỗ trợ nhiều trình duyệt
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth &&
      rect.width > 0 && // Đảm bảo element không bị vô hình
      rect.height > 0
    );
  });
}

async function isElementFullyInViewport(page, selector, isFullXpath = false) {
  const locator = isFullXpath ? page.locator(`xpath=${selector}`) : page.locator(selector);
  const firstLocator = locator.first();

  // 1. Kiểm tra element có tồn tại trong DOM không
  const count = await firstLocator.count();
  if (count === 0) return false;

  // 2. [QUAN TRỌNG] Playwright sẽ check xem UI có thực sự "nhìn thấy được" không
  // (loại trừ display: none, opacity: 0, visibility: hidden...)
  const isVisible = await firstLocator.isVisible();
  if (!isVisible) return false;

  // 3. Kiểm tra tọa độ đảm bảo lọt thỏm 100% trong khung nhìn
  return firstLocator.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    // Edge case: Nếu bản thân phần tử to hơn cả cái màn hình,
    // thì không bao giờ có chuyện "toàn bộ UI ở trong viewport" được.
    if (rect.height > windowHeight || rect.width > windowWidth) {
      return false;
    }

    // Trả về true CHỈ KHI toàn bộ 4 cạnh đều cách mép màn hình một khoảng >= 0
    return (
      rect.top >= 0 && // Không lẹm lên trên
      rect.left >= 0 && // Không lẹm sang trái
      rect.bottom <= windowHeight - 100 && // Không lẹm xuống dưới
      rect.right <= windowWidth // Không lẹm sang phải
    );
  });
}

export async function scrollUntilVisible(page, selector, isFullXpath = false, jump = 200) {
  const maxAttempts = 25;

  for (let i = 0; i < maxAttempts; i++) {
    if (await isElementFullyInViewport(page, selector, isFullXpath)) return;

    // Cuộn từng đoạn ngắn, không nhảy một cú 500px
    await humanScroll(page, jump + Math.random() * 100);
  }

  throw new Error(`Không tìm thấy "${selector}"`);
}

export async function clearContent(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.waitForTimeout(300);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);
}

export const isVisible = async (locator, timeout = 8000) => {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
};

/**
 * Poll `locator.isVisible()` theo chu kỳ — dùng sau khi đóng dialog khác: popup kế thường mount trễ,
 * hoặc `waitFor(visible)` kết thúc sớm khi DOM đang chuyển.
 * @param {import('playwright').Page} page
 * @param {import('playwright').Locator[]} locators
 * @param {{ timeoutMs?: number, intervalMs?: number, settleMs?: number }} [options]
 * @returns {Promise<boolean[]>} — cờ visible tương ứng từng locator (sau bước settle)
 */
export async function pollUntilAnyLocatorVisible(page, locators, options = {}) {
  const { timeoutMs = 15000, intervalMs = 350, settleMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;

  /** @type {boolean[]} */
  let flags = locators.map(() => false);

  while (Date.now() < deadline) {
    flags = await Promise.all(locators.map(l => l.isVisible().catch(() => false)));
    if (flags.some(Boolean)) break;
    await page.waitForTimeout(intervalMs);
  }

  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
    flags = await Promise.all(locators.map(l => l.isVisible().catch(() => false)));
  }

  return flags;
}
