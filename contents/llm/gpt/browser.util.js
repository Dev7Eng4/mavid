import { GPT_CONFIG } from './gptAppDefaults.js';
import { clearContent, clickElement, getRandomNumber } from '../../utils/dom.util.js';
import { GPT_SELECTOR } from './selectors.js';
import { validateJsonResponse } from '../text.util.js';

/**
 * ChatGPT đổi nút composer sang trạng thái Stop khi model đang stream.
 * Nếu không detect được (UI lạ), logic chờ chỉ dựa trên độ dài text ổn định.
 */
async function isChatGptStreaming(page) {
  const btn = page.locator(GPT_SELECTOR.composerSendButton).first();
  if ((await btn.count()) === 0) return false;
  const label = (await btn.getAttribute('aria-label')) ?? '';
  return /stop/i.test(label);
}

/**
 * Đợi tin assistant cuối có nội dung, stream xong (không còn nút Stop),
 * rồi text không đổi trong stableMs — tránh đóng sớm khi token vẫn đang chảy.
 */
export async function waitForGptResponse(page, timeoutMs = 150000) {
  const responseLocator = page.locator(GPT_SELECTOR.responseBlock).last();
  await responseLocator.waitFor({ state: 'visible', timeout: timeoutMs });

  const pollIntervalMs = 400;
  const stableMs = 8000;
  const start = Date.now();
  let previousLength = -1;
  let stableAccum = 0;

  while (Date.now() - start < timeoutMs) {
    const streaming = await isChatGptStreaming(page);
    const text = await responseLocator.innerText();
    const len = text.trim().length;

    if (len === 0) {
      await page.waitForTimeout(pollIntervalMs);
      continue;
    }

    if (streaming) {
      previousLength = len;
      stableAccum = 0;
      await page.waitForTimeout(pollIntervalMs);
      continue;
    }

    if (len !== previousLength) {
      previousLength = len;
      stableAccum = 0;
    } else {
      stableAccum += pollIntervalMs;
      if (stableAccum >= stableMs) {
        return text;
      }
    }

    await page.waitForTimeout(pollIntervalMs);
  }

  throw new Error('Timeout waiting for ChatGPT response');
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<{ text: string, hasCodeBlock: boolean }>}
 */
export async function extractGptResponse(page) {
  const responseLocator = page.locator(GPT_SELECTOR.responseBlock).last();
  await responseLocator.waitFor({ state: 'attached', timeout: 15000 });

  const specificCodeLocator = responseLocator.locator(GPT_SELECTOR.responseCodeBlock);
  if ((await specificCodeLocator.count()) > 0) {
    return { text: (await specificCodeLocator.last().innerText()).trim(), hasCodeBlock: true };
  }

  const anyCodeLocator = responseLocator.locator('code');
  if ((await anyCodeLocator.count()) > 0) {
    return { text: (await anyCodeLocator.last().innerText()).trim(), hasCodeBlock: true };
  }

  return { text: (await responseLocator.innerText()).trim(), hasCodeBlock: false };
}

export async function sendPromptToGpt(page, prompt, options = {}) {
  const { requireCodeBlock = false } = options;

  await page.keyboard.press('Escape');

  await clickElement(page, GPT_SELECTOR.editor);
  await page.waitForTimeout(getRandomNumber(500, 500));
  await clearContent(page);
  await page.waitForTimeout(getRandomNumber(500, 300));
  await page.keyboard.insertText(prompt);
  await page.waitForTimeout(getRandomNumber(300, 300));
  await page.keyboard.press('Enter');

  await waitForGptResponse(page, 150000);

  const { text, hasCodeBlock } = await extractGptResponse(page);

  if (requireCodeBlock && !hasCodeBlock) {
    const preview = text ? text.slice(0, 200).replace(/\s+/g, ' ') : '(empty)';
    throw new Error(`ChatGPT response không chứa code block (có thể bị stop). Preview: "${preview}"`);
  }

  return text;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {object} [options]
 */
export async function sendPromptToGptWithRetry(page, prompt, options = {}) {
  const {
    maxRetries = 2,
    retryDelayMs = 2000,
    validate = validateJsonResponse,
    label = 'ChatGPT',
    requireCodeBlock = true,
  } = options;
  const totalAttempts = Math.max(1, maxRetries + 1);
  let lastErr = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const raw = await sendPromptToGpt(page, prompt, { requireCodeBlock });
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

export async function openGptPage(page) {
  await page.goto(GPT_CONFIG.URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(getRandomNumber(500));
  await page.locator(GPT_SELECTOR.editor).waitFor({ state: 'visible', timeout: 30000 });
}
