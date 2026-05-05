import { GEMINI_CONFIG } from './geminiAppDefaults.js';
import { clearContent, clickElement, getRandomNumber } from '../utils/dom.util.js';
import { GEMINI_SELECTOR } from './selectors.js';

/**
 * Bỏ fence markdown nếu Gemini bọc ``` / ```json.
 * @param {string} text
 * @returns {string}
 */
export function stripJsonCodeFence(text) {
  return String(text ?? '')
    .trim()
    .replace(/^```[^\n]*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

/**
 * Validator mặc định cho sendPromptToGeminiWithRetry khi kỳ vọng Gemini trả JSON.
 * Throw nếu không parse được JSON (sau khi strip code fence) → trigger retry.
 * @param {string} raw
 */
export function validateGeminiJsonResponse(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) {
    throw new Error('Gemini trả về response rỗng.');
  }
  JSON.parse(cleaned);
}

export async function waitForGeminiResponseOld(page, timeoutMs = 150000) {
  const responseLocator = page.locator('.model-response-text, .response-content, .message-content').last();

  await responseLocator.waitFor({ state: 'visible', timeout: timeoutMs });

  let previousLength = -1;
  let stableTime = 0;
  const checkInterval = 1000; // Mỗi 1 giây kiểm tra 1 lần
  const requiredStableTime = 4000; // Cần 3 giây text không đổi để xác nhận là đã xong

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Chỉ lấy text ra đọc, hoàn toàn thụ động
    const currentText = await responseLocator.innerText();
    const currentLength = currentText.length;

    // Nếu độ dài text lớn hơn 0 và không đổi so với lần check trước
    if (currentLength === previousLength && currentLength > 0) {
      stableTime += checkInterval;
      if (stableTime >= requiredStableTime) {
        break; // Thoát vòng lặp, Gemini đã gõ xong
      }
    } else {
      // Nếu text có thay đổi (đang gõ), reset lại bộ đếm thời gian
      stableTime = 0;
      previousLength = currentLength;
    }

    await page.waitForTimeout(checkInterval);
  }
}

export async function waitForGeminiResponse(page, timeoutMs = 150000) {
  // Bước 1: Chờ response element xuất hiện
  const responseLocator = page.locator(GEMINI_SELECTOR.responseBlock).last();
  await responseLocator.waitFor({ state: 'visible', timeout: timeoutMs });

  // Bước 2: Inject MutationObserver vào browser, không poll từ bên ngoài
  const finalText = await page.evaluate(
    ({ selector, timeout, stableMs }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), timeout);

        // Lấy element cuối cùng khớp selector
        const getTarget = () => {
          const els = document.querySelectorAll(selector);
          return els[els.length - 1] || null;
        };

        let target = getTarget();
        if (!target) {
          clearTimeout(timer);
          return reject(new Error('Element not found'));
        }

        let stableTimer = null;

        const resetStable = () => {
          if (stableTimer) clearTimeout(stableTimer);
          stableTimer = setTimeout(() => {
            // Text đã ổn định đủ lâu → xong
            clearTimeout(timer);
            resolve(target.innerText);
          }, stableMs);
        };

        // Observe mutations thay vì poll
        const observer = new MutationObserver(() => {
          // Kiểm tra nếu element bị thay mới (re-render)
          const newTarget = getTarget();
          if (newTarget && newTarget !== target) {
            observer.observe(newTarget, { childList: true, subtree: true, characterData: true });
            target = newTarget;
          }
          resetStable();
        });

        observer.observe(target, { childList: true, subtree: true, characterData: true });

        // Khởi động đếm ngay (phòng case text đã có sẵn)
        resetStable();
      });
    },
    {
      selector: '.model-response-text, .response-content, .message-content',
      timeout: timeoutMs,
      stableMs: 4000,
    }
  );

  return finalText;
}

/**
 * Trích xuất response từ Gemini.
 * @param {import('playwright').Page} page
 * @returns {Promise<{ text: string, hasCodeBlock: boolean }>}
 *   - `hasCodeBlock = true` khi tìm thấy thẻ `<code>` trong response (response "đầy đủ").
 *   - `hasCodeBlock = false` khi phải fallback về `innerText` (thường là response bị stop /
 *     Gemini chỉ trả text thường — caller cần tự quyết retry hay không).
 */
export async function extractGeminiResponse(page) {
  // await page.waitForTimeout(1500);
  const responseLocator = page.locator(GEMINI_SELECTOR.responseBlock).last();
  await responseLocator.waitFor({ state: 'attached', timeout: 15000 });

  const specificCodeLocator = responseLocator.locator(GEMINI_SELECTOR.responseCodeBlock);
  if ((await specificCodeLocator.count()) > 0) {
    return { text: (await specificCodeLocator.last().innerText()).trim(), hasCodeBlock: true };
  }

  // 3. Fallback: Tìm thẻ code bất kỳ
  const anyCodeLocator = responseLocator.locator('code');
  if ((await anyCodeLocator.count()) > 0) {
    return { text: (await anyCodeLocator.last().innerText()).trim(), hasCodeBlock: true };
  }

  // 4. Fallback cuối cùng: Lấy toàn bộ text — coi như không có code block.
  return { text: (await responseLocator.innerText()).trim(), hasCodeBlock: false };
}

export async function chooseThinkingMode(page) {
  await clickElement(page, GEMINI_SELECTOR.btnSelectMode);
  await page.waitForTimeout(500);
  await clickElement(page, GEMINI_SELECTOR.thinkingMode);
}

export async function sendPromptToGemini(page, prompt, options = {}) {
  const { requireCodeBlock = false } = options;

  await page.keyboard.press('Escape');

  await clickElement(page, GEMINI_SELECTOR.editor);
  await page.waitForTimeout(getRandomNumber(500, 500));
  await clearContent(page);
  await page.waitForTimeout(getRandomNumber(500, 300));
  await page.keyboard.insertText(prompt);
  await page.waitForTimeout(getRandomNumber(300, 300));
  await page.keyboard.press('Enter');

  await waitForGeminiResponse(page, 150000);

  const { text, hasCodeBlock } = await extractGeminiResponse(page);

  if (requireCodeBlock && !hasCodeBlock) {
    const preview = text ? text.slice(0, 200).replace(/\s+/g, ' ') : '(empty)';
    throw new Error(`Gemini response không chứa code block (có thể bị stop). Preview: "${preview}"`);
  }

  return text;
}

/**
 * Gửi prompt tới Gemini với cơ chế retry.
 *
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {object} [options]
 * @param {number} [options.maxRetries=2] Số lần retry tối đa (tổng số lần thử = maxRetries + 1).
 * @param {number} [options.retryDelayMs=2000] Delay cơ bản giữa các lần retry (sẽ tăng dần theo attempt).
 * @param {(raw: string) => any | Promise<any> | null} [options.validate]
 *   Hàm validate response — nếu throw thì xem như fail và retry.
 *   Mặc định: `validateGeminiJsonResponse` (parse JSON sau khi strip code fence).
 *   Nếu muốn tắt validate (hành vi cũ), truyền `validate: null`.
 * @param {string} [options.label='Gemini'] Nhãn dùng để log.
 * @param {boolean} [options.requireCodeBlock=true]
 *   Nếu `true` (mặc định), response phải chứa thẻ `<code>` — nếu không sẽ retry
 *   (bắt được case "You stopped this response" hoặc Gemini chỉ trả text thường).
 * @returns {Promise<string>} Raw response từ Gemini sau khi pass validate.
 */
export async function sendPromptToGeminiWithRetry(page, prompt, options = {}) {
  const { maxRetries = 2, retryDelayMs = 2000, validate = validateGeminiJsonResponse, label = 'Gemini', requireCodeBlock = true } = options;
  const totalAttempts = Math.max(1, maxRetries + 1);
  let lastErr = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const raw = await sendPromptToGemini(page, prompt, { requireCodeBlock });
      if (typeof validate === 'function') {
        await validate(raw);
      }

      if (attempt > 1) {
        console.log(`[${label} retry] Lần ${attempt}/${totalAttempts} thành công.`);
      }

      return raw;
    } catch (err) {
      lastErr = err;
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[${label} retry] Lần ${attempt}/${totalAttempts} thất bại: ${reason}`);

      if (attempt < totalAttempts) {
        const waitMs = retryDelayMs * attempt;
        try {
          await page.waitForTimeout(waitMs);
        } catch {
          await new Promise(r => setTimeout(r, waitMs));
        }
      }
    }
  }

  throw lastErr ?? new Error(`[${label} retry] Hết ${totalAttempts} lần thử nhưng không xác định được lỗi.`);
}

export async function openGeminiPage(page, thinkingMode = false) {
  await page.goto(GEMINI_CONFIG.URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForTimeout(getRandomNumber(500));

  if (thinkingMode) {
    await chooseThinkingMode(page);
  }
}
