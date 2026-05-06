import { LLM_PROVIDER } from './provider.js';

const emptyLabel = () => (LLM_PROVIDER === 'gpt' ? 'ChatGPT' : 'Gemini');

/**
 * Bỏ fence markdown nếu model bọc ``` / ```json.
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
 * Validator mặc định cho sendPromptWithRetry khi kỳ vọng JSON.
 * @param {string} raw
 */
export function validateJsonResponse(raw) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) {
    throw new Error(`${emptyLabel()} trả về response rỗng.`);
  }
  JSON.parse(cleaned);
}
