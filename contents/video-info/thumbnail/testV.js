/**
 * Test jaVertical:
 *   - Pipeline đầy đủ: Gemini → Flow → ghép chữ (`generateBottomTextThumbnailJaVertical`).
 *   - Chỉ ghép: ảnh JPEG trong `contents/downloads` + payload mẫu (`--composite`).
 *
 * Cần Chrome profile Playwright, Gemini, Flow, Chromium (`npx playwright install chromium`).
 *
 * Chạy từ root repo:
 *   node contents/video-info/thumbnail/testV.js
 * Chỉ test composite:
 *   node contents/video-info/thumbnail/testV.js --composite
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadPromptByLanguage } from '../../prompts/index.js';
import { generateBottomTextThumbnailJaVertical } from './jaVertical/thumbnailVerticalGemini.js';
import { renderThumbnailVerticalFlowCompositeToPath } from './jaVertical/thumbnailComposite.cli.js';
import { optimizeFlowThumbnailJpegIfLarge } from './thumbnailOptimize.util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Ảnh nền mẫu — đặt file `.jpg`/`.jpeg` vào đây. */
export const THUMBNAIL_TEST_DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

/** Title / summary mẫu — kiểu dữ liệu giống pipeline thật (summary object → Gemini). */
export const SAMPLE_TITLE_VERTICAL = '離婚を迫った夫が凍りついた――15年前の火災事件と白川み咲の復讐が暴く黒崎家崩壊の真実';

export const SAMPLE_SUMMARY_VERTICAL = {
  overview:
    '孤児として育ったみさは、黒崎家の御曹司・高一との政略結婚後、3年間にわたり侮辱と屈辱に耐え続けていた。しかしその沈黙は服従ではなく、15年前に起きた工場火災事件への復讐を果たすための計画だった。離婚を迫る高一の前で露わになった壮絶な火傷痕をきっかけに、封印されていた過去が動き出す。やがて、黒崎家当主・岩尾の贖罪、15年前の事件隠蔽、白川家壊滅の真相、高一の出生の秘密が次々と暴露され、高一と愛人さやは社会的・法的に崩壊していく。一方のみさは、自身の傷と過去を受け入れ、白川家の名を取り戻しながら、新たな人生と社会再建へ踏み出していく。',
  key_takeaways: [
    'みさは15年前の工場火災被害者・白川み咲本人だった',
    '高一は15年前の火災事件に深く関与していた',
    '黒崎岩尾は罪悪感からみさの復讐計画を支援していた',
    'みさは3年間かけて高一の不正証拠を収集していた',
    '高一は黒崎家から廃嫡され、最終的に法的制裁を受けた',
    'さやも財産と立場を失い社会的に転落した',
    '白川誠一が裏で証拠流出や資金遮断を支援していた',
    'みさは傷跡と過去を受け入れ、白川グループ再建へ進み始めた',
  ],
  structured_sections: [
    {
      heading: '離婚要求から始まる崩壊',
      bullets: ['高一が離婚届への署名を迫る', '愛人の妊娠と侮辱でみさを追い詰めようとする', '露わになった火傷痕が15年前の記憶を呼び起こす'],
    },
    {
      heading: '15年前の事件と復讐計画',
      bullets: [
        'みさが復讐目的で結婚生活に耐えていたと判明する',
        '黒崎岩尾が事件の真相を把握していたことが示される',
        '高一は過去の罪と向き合い始め錯乱する',
      ],
    },
    {
      heading: '権力逆転と真相暴露',
      bullets: ['佐藤弁護士と黒服たちの登場で力関係が逆転する', 'みさが白川み咲であることが明かされる', '高一は廃嫡と財産剥奪を宣告される'],
    },
    {
      heading: '法的制裁と社会的崩壊',
      bullets: ['警察が15年前の事件で高一を逮捕する', 'さやも損害賠償と社会的制裁に追い込まれる', '村雨の事件隠蔽も暴露され失脚する'],
    },
    {
      heading: '再生と未来への歩み',
      bullets: [
        'みさは白川姓として再出発を決意する',
        '黒崎屋敷跡地は支援施設と公園へ生まれ変わる',
        '復讐を終えたみさが生き残った意味を受け入れる',
      ],
    },
  ],
};

/** Payload giống JSON Gemini `promptToCreateBottomTextThumbnailSpec` (`thumbnailVerticalFlowComposite.html` → `mergeFlow`). */
export const SAMPLE_FLOW_LAYOUT_VERTICAL = {
  visual_prompt: 'local test composite',
  detected_niche: 'DNA / affair drama (test stub)',
  thumbnail_copy: {
    top_quote_enabled: true,
    top_quote: '「もう許せない」',
    bottom_line_1: '同マンDNA鑑定で不倫発覚、家庭は',
    bottom_line_2: '一瞬で崩壊へ',
  },
  text_color: {
    theme: 'yellow_red_betrayal',
    bottom_line_1: { fill: '#FFFFFF', stroke: '#111111' },
    bottom_line_2: { fill: '#FF2A2A', stroke: '#111111' },
    top_quote: { fill: '#FFFFFF', stroke: '#111111' },
    reason: 'test stub',
  },
};

/**
 * @param {object} [opts]
 * @param {string} [opts.downloadsDir] — mặc định `contents/downloads` (`THUMBNAIL_TEST_DOWNLOADS_DIR`)
 * @param {string} [opts.backgroundImageName] — tên file trong thư mục; bỏ trống → lấy `.jpg`/`.jpeg` đầu tiên (sort tên)
 * @param {string} [opts.outFileName='flow-composite-vertical-test.jpg']
 * @param {Record<string, unknown>} [opts.flowLayout] — mặc định `SAMPLE_FLOW_LAYOUT_VERTICAL`
 * @returns {Promise<{ backgroundImagePath: string, outPath: string }>}
 */
export async function testRenderThumbnailVerticalFlowCompositeToPath({
  downloadsDir = THUMBNAIL_TEST_DOWNLOADS_DIR,
  backgroundImageName,
  outFileName = 'flow-composite-vertical-test.jpg',
  flowLayout = SAMPLE_FLOW_LAYOUT_VERTICAL,
} = {}) {
  fs.mkdirSync(downloadsDir, { recursive: true });

  const lowerOk = name => /\.(jpe?g)$/i.test(name);
  let bgName = backgroundImageName;
  if (!bgName) {
    const names = fs
      .readdirSync(downloadsDir)
      .filter(n => lowerOk(n) && fs.statSync(path.join(downloadsDir, n)).isFile())
      .sort((a, b) => a.localeCompare(b, 'en'));
    if (!names.length) {
      throw new Error(
        `testRenderThumbnailVerticalFlowCompositeToPath: không có file .jpg/.jpeg trong ${downloadsDir}. Hãy đặt ít nhất một ảnh nền (JPEG).`,
      );
    }
    bgName = names[0];
  }

  const backgroundImagePath = path.join(downloadsDir, bgName);
  if (!fs.existsSync(backgroundImagePath) || !lowerOk(bgName)) {
    throw new Error(
      `testRenderThumbnailVerticalFlowCompositeToPath: cần ảnh nền .jpg/.jpeg (CLI nhúng data:image/jpeg): ${backgroundImagePath}`,
    );
  }

  const outPath = path.join(downloadsDir, outFileName);

  console.log('=== Test renderThumbnailVerticalFlowCompositeToPath ===');
  console.log(`downloadsDir: ${downloadsDir}`);
  console.log(`background: ${bgName}`);
  console.log(`out: ${outFileName}`);

  const t0 = Date.now();
  await renderThumbnailVerticalFlowCompositeToPath({
    backgroundImagePath,
    flowLayout,
    outPath,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!fs.existsSync(outPath)) {
    throw new Error(`Thiếu file đầu ra: ${outPath}`);
  }
  const st = fs.statSync(outPath);
  if (st.size < 2048) {
    throw new Error(`File quá nhỏ (có thể render lỗi): ${outPath} (${st.size} bytes)`);
  }

  console.log(`\n✓ JPEG composite (vertical): ${outPath} (${st.size} bytes)`);
  console.log(`elapsed: ${elapsed}s`);

  return { backgroundImagePath, outPath };
}

/**
 * Test pipeline Gemini 1 bước → Flow → `thumbnailVerticalFlowComposite` (ghi `flow-thumbnail.jpg`).
 *
 * @param {object} [opts]
 * @param {Record<string, any>} [opts.prompts] — nếu bỏ trống: `loadPromptByLanguage(language)`
 * @param {string|null|undefined} [opts.language='ja']
 * @param {string} [opts.title=SAMPLE_TITLE_VERTICAL]
 * @param {object|string} [opts.summary=SAMPLE_SUMMARY_VERTICAL]
 * @param {string} [opts.outDir] — mặc định Documents/Downloads; lưu `flow-thumbnail.jpg`
 * @param {string} [opts.logTag='test-thumbnail-v']
 * @param {string} [opts.visualStyle] — truyền xuống `promptToCreateBottomTextThumbnailSpec` / chọn preset (vd. `'cinematic' | 'anime'` trong `VISUAL_PROMPT_CONSTANTS`)
 * @returns {Promise<{ outPath: string, specResult: Record<string, unknown> }>}
 */
export async function testGenerateBottomTextThumbnailJaVertical({
  prompts: promptsArg,
  language = 'ja',
  title = SAMPLE_TITLE_VERTICAL,
  summary = SAMPLE_SUMMARY_VERTICAL,
  outDir,
  logTag = 'test-thumbnail-v',
  visualStyle,
} = {}) {
  const prompts = promptsArg ?? (await loadPromptByLanguage(language));
  const dir = outDir ?? path.join(os.homedir(), 'Downloads');
  fs.mkdirSync(dir, { recursive: true });

  const outPath = path.join(dir, 'flow-thumbnail.jpg');

  console.log('=== Test generateBottomTextThumbnailJaVertical (jaVertical) ===');
  console.log(`outputDir: ${dir}`);

  const t0 = Date.now();
  const specResult = await generateBottomTextThumbnailJaVertical({
    prompts,
    title,
    summary,
    outputDir: dir,
    logTag,
    ...(visualStyle != null ? { visualStyle } : {}),
  });
  await optimizeFlowThumbnailJpegIfLarge(outPath);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!fs.existsSync(outPath)) {
    throw new Error(`Thiếu file đầu ra: ${outPath}`);
  }
  const st = fs.statSync(outPath);
  if (st.size < 2048) {
    throw new Error(`File quá nhỏ (có thể render lỗi): ${outPath} (${st.size} bytes)`);
  }

  console.log(`\n✓ JPEG: ${outPath} (${st.size} bytes)`);
  console.log(`elapsed: ${elapsed}s`);

  return { outPath, specResult };
}

async function main() {
  if (process.argv.includes('--composite')) {
    await testRenderThumbnailVerticalFlowCompositeToPath();
    return;
  }
  await testGenerateBottomTextThumbnailJaVertical();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
