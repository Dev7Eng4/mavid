/**
 * Test nhanh: mở Chat (Gemini hoặc ChatGPT tùy `LLM_PROVIDER`), gửi prompt, in kết quả.
 *
 * Chạy:
 *   node contents/llm/test.js "Câu hỏi của bạn"
 *   LLM_PROVIDER=gpt LLM_TEST_PROFILE=2 node contents/llm/test.js
 *
 * Yêu cầu: Chrome profile đã đăng nhập đúng dịch vụ (Google cho Gemini / OpenAI cho GPT).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { openChatPage, sendPrompt } from './browser.util.js';
import { LLM_PROVIDER } from './provider.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';

const __filename = fileURLToPath(import.meta.url);

const DEFAULT_PROMPT = 'Trả lời ngắn gọn: 2 + 2 bằng mấy?';

function defaultProfile() {
  const fromEnv = process.env.LLM_TEST_PROFILE || process.env.GEMINI_TEST_PROFILE || process.env.GPT_TEST_PROFILE;
  const n = Number(fromEnv);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * @param {object} [options]
 * @param {string} [options.prompt]
 * @param {number} [options.profile]
 * @param {boolean} [options.visible=true]
 * @param {boolean} [options.thinkingMode=false] — Chỉ khi `LLM_PROVIDER=gemini`
 * @param {boolean} [options.closeBrowser=true]
 * @returns {Promise<string>}
 */
export async function testSendPromptToLlm(options = {}) {
  const { prompt = DEFAULT_PROMPT, profile = defaultProfile(), visible = true, thinkingMode = false, closeBrowser = true } = options;

  const { context, page } = await openChromeProfile({ profile, visible });

  try {
    await openChatPage(page, { thinkingMode });
    return await sendPrompt(page, prompt, { requireCodeBlock: false });
  } finally {
    if (closeBrowser) {
      await context.close().catch(() => {});
    }
  }
}

async function main() {
  const argvPrompt = process.argv.slice(2).join(' ').trim();
  const prompt = argvPrompt || DEFAULT_PROMPT;

  console.log(`LLM_PROVIDER=${LLM_PROVIDER}`);
  console.log('Prompt:', prompt);

  try {
    const result = await testSendPromptToLlm({ prompt });
    console.log('\n--- Kết quả LLM ---\n');
    console.log(result);
    console.log('\n--- Hết ---\n');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] != null && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  main();
}
