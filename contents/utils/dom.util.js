export const getRandomNumber = number => number + Math.random() * 1000;
const randomBetween = (min, max) => min + Math.random() * (max - min);

function bezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Sinh số ngẫu nhiên trong khoảng [min, max] */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

export const delay = ms =>
  new Promise(resolve => {
    return setTimeout(resolve, getRandomNumber(ms));
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

export const clickElement = async (page, selector, isXpath = false) => {
  const element = isXpath ? page.locator(`xpath=${selector}`) : selectElement(page, selector);
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
    const delay = 30 + Math.random() * 60;
    await page.waitForTimeout(delay);
  }

  // Đôi khi người thật dừng lại đọc nội dung
  if (Math.random() < 0.3) {
    await page.waitForTimeout(400 + Math.random() * 600);
  }
}

async function isElementInViewport(page, selector, isFullXpath = false) {
  const locator = isFullXpath ? page.locator(`xpath=${selector}`) : page.locator(selector);

  const count = await locator.count();
  if (count === 0) return false;

  return locator.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  });
}

export async function scrollUntilVisible(page, selector, isFullXpath = false, jump = 200) {
  const maxAttempts = 25;

  for (let i = 0; i < maxAttempts; i++) {
    if (await isElementInViewport(page, selector, isFullXpath)) return;

    // Cuộn từng đoạn ngắn, không nhảy một cú 500px
    await humanScroll(page, jump + Math.random() * 200);
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
