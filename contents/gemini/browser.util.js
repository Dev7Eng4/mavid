/**
 * Tương tác Playwright với giao diện web Gemini.
 */
import { GEMINI_CONFIG } from '../constants/index.js';
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

export async function waitForGeminiResponse(page, timeoutMs = 120000) {
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

export async function extractGeminiResponse(page) {
  // await page.waitForTimeout(1500);
  const responseLocator = page
    .locator('.model-response-text, .response-content, .message-content, div[data-message-author-role="model"]')
    .last();
  await responseLocator.waitFor({ state: 'attached', timeout: 5000 });

  const specificCodeLocator = responseLocator.locator('code[data-test-id="code-content"]');
  if ((await specificCodeLocator.count()) > 0) {
    return (await specificCodeLocator.last().innerText()).trim();
  }

  // 3. Fallback: Tìm thẻ code bất kỳ
  const anyCodeLocator = responseLocator.locator('code');
  if ((await anyCodeLocator.count()) > 0) {
    return (await anyCodeLocator.last().innerText()).trim();
  }

  // 4. Fallback cuối cùng: Lấy toàn bộ text
  return (await responseLocator.innerText()).trim();

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

export async function sendPromptToGemini(page, prompt) {
  await page.keyboard.press('Escape');

  await clickElement(page, GEMINI_SELECTOR.editor);
  await page.waitForTimeout(500);
  await clearContent(page);
  await page.waitForTimeout(500);
  await page.keyboard.insertText(prompt);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');

  await waitForGeminiResponse(page, 150000);

  const result = await extractGeminiResponse(page);
  return result;
}

export async function openGeminiPage(page) {
  await page.goto(GEMINI_CONFIG.URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForTimeout(getRandomNumber(1000));

  await chooseThinkingMode(page);
}
