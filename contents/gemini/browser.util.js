/**
 * Tương tác Playwright với giao diện web Gemini.
 */
import { GEMINI_CONFIG } from './geminiAppDefaults.js';
import { clearContent, clickElement, getRandomNumber } from '../utils/dom.util.js';
import { GEMINI_SELECTOR } from './selectors.js';

// export async function waitForGeminiResponse(page, timeoutMs = 120000) {
//   await page.waitForSelector('.model-response-text, .response-content, .message-content', {
//     timeout: timeoutMs,
//   });

//   const startTime = Date.now();
//   while (Date.now() - startTime < timeoutMs) {
//     const isStreaming = await page.evaluate(() => {
//       const stopBtn = document.querySelector('button[aria-label="Stop response"], mat-icon[data-mat-icon-name="stop_circle"]');
//       if (stopBtn) {
//         const rect = stopBtn.getBoundingClientRect();
//         return rect.width > 0 && rect.height > 0;
//       }
//       return false;
//     });

//     if (!isStreaming) break;
//     await page.waitForTimeout(1000);
//   }

//   await page.waitForTimeout(2000);
// }

export async function waitForGeminiResponse(page, timeoutMs = 150000) {
  // 1. Lấy phần tử chứa câu trả lời cuối cùng (mới nhất)
  const responseLocator = page.locator('.model-response-text, .response-content, .message-content').last();

  // Đợi phần tử bắt đầu xuất hiện
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
  const responseLocator = page
    .locator('.model-response-text, .response-content, .message-content, div[data-message-author-role="model"]')
    .last();
  await responseLocator.waitFor({ state: 'attached', timeout: 15000 });

  const specificCodeLocator = responseLocator.locator('code[data-test-id="code-content"]');
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

  // return page.evaluate(() => {
  //   const responses = Array.from(
  //     document.querySelectorAll('.model-response-text, .response-content, .message-content, div[data-message-author-role="model"]')
  //   );

  //   if (responses.length === 0) return '';

  //   const lastResponse = responses[responses.length - 1];

  //   const codeBlocks = lastResponse.querySelectorAll('code[data-test-id="code-content"]');

  //   if (codeBlocks.length > 0) {
  //     return (codeBlocks[codeBlocks.length - 1].innerText || codeBlocks[codeBlocks.length - 1].textContent || '').trim();
  //   }

  //   const anyCode = lastResponse.querySelectorAll('code');
  //   if (anyCode.length > 0) {
  //     return (anyCode[anyCode.length - 1].innerText || anyCode[anyCode.length - 1].textContent || '').trim();
  //   }

  //   return (lastResponse.innerText || lastResponse.textContent || '').trim();
  // });
}

export async function chooseThinkingMode(page) {
  await clickElement(page, GEMINI_SELECTOR.btnSelectMode);
  await page.waitForTimeout(500);
  await clickElement(page, GEMINI_SELECTOR.thinkingMode);
}

/**
 * Gửi prompt tới Gemini và lấy response text.
 *
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {object} [options]
 * @param {boolean} [options.requireCodeBlock=false]
 *   Nếu `true`, throw error khi response không chứa thẻ `<code>` (ví dụ Gemini hiển thị
 *   "You stopped this response" hoặc chỉ trả về text thường) — dùng để trigger retry
 *   ở `sendPromptToGeminiWithRetry`. Mặc định `false` để giữ tương thích với caller cũ.
 * @returns {Promise<string>}
 */
export async function sendPromptToGemini(page, prompt, options = {}) {
  const { requireCodeBlock = false } = options;

  await page.keyboard.press('Escape');

  await clickElement(page, GEMINI_SELECTOR.editor);
  await page.waitForTimeout(500);
  await clearContent(page);
  await page.waitForTimeout(500);
  await page.keyboard.insertText(prompt);
  await page.waitForTimeout(300);
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
 * @param {(raw: string) => any | Promise<any>} [options.validate]
 *   Hàm validate response — nếu throw thì xem như fail và retry.
 *   Ví dụ: validate JSON parse hợp lệ.
 * @param {string} [options.label='Gemini'] Nhãn dùng để log.
 * @param {boolean} [options.requireCodeBlock=true]
 *   Nếu `true` (mặc định), response phải chứa thẻ `<code>` — nếu không sẽ retry
 *   (bắt được case "You stopped this response" hoặc Gemini chỉ trả text thường).
 * @returns {Promise<string>} Raw response từ Gemini sau khi pass validate.
 */
export async function sendPromptToGeminiWithRetry(page, prompt, options = {}) {
  const { maxRetries = 2, retryDelayMs = 2000, validate = null, label = 'Gemini', requireCodeBlock = true } = options;
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

  await page.waitForTimeout(getRandomNumber(1000));

  if (thinkingMode) {
    await chooseThinkingMode(page);
  }
}
