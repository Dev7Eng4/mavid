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
export function validateJsonResponse(raw, isJSON = true) {
  const cleaned = stripJsonCodeFence(raw);
  if (!cleaned) {
    throw new Error(`Trả về response rỗng.`);
  }
  if (isJSON) {
    JSON.parse(cleaned);
  }
}
