import { GEMINI_CONFIG } from './geminiAppDefaults.js';
import { clearContent, clickElement, delay, getRandomNumber } from '../../utils/dom.util.js';
import { GEMINI_SELECTOR } from './selectors.js';
import { validateJsonResponse } from '../text.util.js';

export async function waitForGeminiResponse(page, timeoutMs = 150000) {
  const btnMicrophoneLocator = page.locator(GEMINI_SELECTOR.btnMicrophone);
  // const btnStartLocator = page.locator(GEMINI_SELECTOR.btnStart);

  await delay(1000);
  await btnMicrophoneLocator.waitFor({ state: 'visible', timeout: timeoutMs });
  // await expect(btnStartLocator).toHaveAttribute('aria-disabled', 'false', { timeout: 60000 });

  const responseLocator = page.locator(GEMINI_SELECTOR.responseBlock).last();

  await responseLocator.waitFor({ state: 'visible', timeout: 10000 });

  let previousLength = -1;
  let stableTime = 0;
  const checkInterval = 1000;
  const requiredStableTime = 4000;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const currentText = await responseLocator.innerText();
    const currentLength = currentText.length;

    if (currentLength === previousLength && currentLength > 0) {
      stableTime += checkInterval;
      if (stableTime >= requiredStableTime) {
        break;
      }
    } else {
      stableTime = 0;
      previousLength = currentLength;
    }

    await page.waitForTimeout(checkInterval);
  }
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<{ text: string, hasCodeBlock: boolean }>}
 */
export async function extractGeminiResponse(page, requireCodeBlock = false) {
  const responseLocator = page.locator(GEMINI_SELECTOR.responseBlock).last();
  await responseLocator.waitFor({ state: 'visible', timeout: 5000 });

  if (requireCodeBlock) {
    const specificCodeLocator = responseLocator.locator(GEMINI_SELECTOR.responseCodeBlock);
    if ((await specificCodeLocator.count()) > 0) {
      return { text: (await specificCodeLocator.last().innerText()).trim(), hasCodeBlock: true };
    }
  }

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

  await waitForGeminiResponse(page);

  const { text, hasCodeBlock } = await extractGeminiResponse(page, requireCodeBlock);

  if (requireCodeBlock && !hasCodeBlock) {
    const preview = text ? text.slice(0, 200).replace(/\s+/g, ' ') : '(empty)';
    throw new Error(`Gemini response không chứa code block (có thể bị stop). Preview: "${preview}"`);
  }

  return text;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {object} [options]
 */
export async function sendPromptToGeminiWithRetry(page, prompt, options = {}) {
  const { maxRetries = 2, retryDelayMs = 2000, validate = validateJsonResponse, label = 'Gemini', requireCodeBlock = true } = options;
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
