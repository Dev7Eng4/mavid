import { LLM_PROVIDER } from './provider.js';
import { openGeminiPage, sendPromptToGemini, sendPromptToGeminiWithRetry } from './gemini/browser.util.js';
import { openGptPage, sendPromptToGpt, sendPromptToGptWithRetry } from './gpt/browser.util.js';

/**
 * @param {import('playwright').Page} page
 * @param {object} [options]
 * @param {boolean} [options.thinkingMode=false] — Chỉ áp dụng khi `LLM_PROVIDER === 'gemini'`.
 */
export async function openChatPage(page, { thinkingMode = false } = {}) {
  if (LLM_PROVIDER === 'gpt') {
    return openGptPage(page);
  }
  return openGeminiPage(page, thinkingMode);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {object} [options]
 */
export async function sendPrompt(page, prompt, options = {}) {
  if (LLM_PROVIDER === 'gpt') {
    return sendPromptToGpt(page, prompt, options);
  }
  return sendPromptToGemini(page, prompt, options);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} prompt
 * @param {object} [options]
 */
export async function sendPromptWithRetry(page, prompt, options = {}) {
  if (LLM_PROVIDER === 'gpt') {
    return sendPromptToGptWithRetry(page, prompt, options);
  }
  return sendPromptToGeminiWithRetry(page, prompt, options);
}
