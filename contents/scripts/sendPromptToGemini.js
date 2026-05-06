/**
 * Test nhanh: mở chat LLM (Gemini hoặc ChatGPT tùy `LLM_PROVIDER`) trong Chrome profile đã
 * đăng nhập, gửi prompt, lấy text trả về.
 *
 *   node contents/scripts/sendPromptToGemini.js "Câu hỏi của bạn"
 *   LLM_PROVIDER=gpt GEMINI_TEST_PROFILE=2 node contents/scripts/sendPromptToGemini.js
 *
 * Yêu cầu: profile đã đăng nhập đúng dịch vụ tương ứng.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { openChatPage, sendPrompt } from '../llm/index.js';
import { openChromeProfile } from './makeChromeProfile.js';
import { promptToDetectNiche } from '../prompts/ja/createVideoInfo.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * @param {object} [options]
 * @param {string} [options.prompt]
 * @param {number} [options.profile=2] — `chrome-profile/profileN`
 * @param {boolean} [options.visible=true]
 * @param {boolean} [options.thinkingMode=false] — Chỉ khi `LLM_PROVIDER=gemini`
 * @param {boolean} [options.closeBrowser=true]
 * @returns {Promise<string>}
 */
export async function testSendPromptToLlm(options = {}) {
  const { prompt = promptToDetectNiche('test', 'test'), profile = 2, visible = true, thinkingMode = false, closeBrowser = true } = options;

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

/** @deprecated Dùng `testSendPromptToLlm`. */
export const testSendPromptToGemini = testSendPromptToLlm;

async function main() {
  const argvPrompt = process.argv.slice(2).join(' ').trim();
  const prompt =
    argvPrompt ||
    promptToDetectNiche(
      `朝、目が覚めると、カーテンの隙間からやわらかな光が差し込んでいた。外では鳥のさえずりが聞こえ、まるで一日の始まりを優しく知らせてくれているようだった。私はゆっくりとベッドから起き上がり、温かいコーヒーを入れる。湯気が立ち上るカップを手にすると、不思議と心が落ち着く。忙しい毎日の中で、こうした何気ない時間こそが、本当の幸せなのかもしれない。

通勤の途中、いつもと同じ道を歩きながら、ふと季節の変化に気づく。昨日まで咲いていなかった花が、今日は鮮やかに色づいている。そんな小さな発見が、心を少しだけ軽くしてくれる。仕事は決して楽ではないが、同僚との何気ない会話や、誰かの「ありがとう」という一言が、大きな励みになる。

夜になると、街の灯りが静かに輝き始める。家に帰り、一日の出来事を振り返りながら、今日も無事に過ごせたことに感謝する。特別なことは何もない一日だったかもしれない。それでも、その積み重ねが人生を形作っていくのだと思う。小さな幸せに気づける心を、これからも大切にしていきたい。`,
      `人生は、無数の選択の連続でできている。朝何を食べるかという小さなことから、将来どの道を選ぶかという大きな決断まで、私たちは常に何かを選び続けている。しかし、その一つ一つの選択に正解があるとは限らない。むしろ、選んだ後にどう行動するかが、より重要なのではないだろうか。

時には、自分の選択に迷い、不安になることもある。他人と比べてしまい、自分の道が正しいのか疑問に思うこともあるだろう。それでも、自分自身の気持ちに正直でいることが、最終的には後悔の少ない人生につながるはずだ。他人の期待ではなく、自分の価値観に基づいて選ぶこと。それは簡単なようで、とても難しい。

失敗することもあるだろう。しかし、その経験こそが次の選択をより良いものにしてくれる。重要なのは、立ち止まらずに前へ進み続けることだ。どんなに遠回りに見えても、その道には必ず意味がある。人生において無駄な経験など一つもない。そう信じて、一歩一歩、自分のペースで歩んでいけばいいのだ。`,
    );

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
