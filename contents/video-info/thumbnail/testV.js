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
export const SAMPLE_TITLE_VERTICAL = '妊娠発覚から崩壊へ──インフルエンサー妻と夫の遠距離婚崩壊劇';

export const SAMPLE_SUMMARY_VERTICAL = {
  overview:
    '本作品は、インフルエンサーとして活動する妻と会社員の夫の結婚生活から始まり、妊娠発覚による遠距離生活への移行、次第に生じる不信感、そしてホストクラブを舞台とした裏の関係の暴露を経て、最終的に離婚と再出発へ至る夫婦崩壊の一連の物語である。日常の小さな違和感が積み重なり、信頼が崩壊していく過程が段階的に描かれる。',
  key_takeaways: [
    '夫婦は当初、都市生活と共有マンション購入により安定した生活基盤を築いていた',
    '妻の妊娠発覚により一時的に幸福な転機が訪れるが、同時に遠距離生活が始まる',
    '遠距離生活の中で連絡不整合が増え、夫は徐々に不信感を強める',
    '妻の失踪とSNS調査によりホストクラブとの関係や金銭問題が浮上する',
    '対面での暴露により妊娠詐称疑惑や裏の関係が明らかになる',
    '最終的に離婚が成立し、双方が別々の人生を歩み始める',
  ],
  structured_sections: [
    {
      heading: '結婚生活と妊娠による転機',
      bullets: [
        '会社員の夫とインフルエンサーの妻による都市型結婚生活',
        '共有名義マンションでの生活基盤の確立',
        '長期出張決定と妻の妊娠発覚',
        '妻の体調を優先し単身赴任を決断',
      ],
    },
    {
      heading: '遠距離生活と不信感の芽生え',
      bullets: [
        'ビデオ通話中心の遠距離夫婦生活が開始',
        '妻の説明と実態に微妙な齟齬が発生',
        '連絡不通や帰省説明への違和感が蓄積',
        '夫が徐々に疑念を抱き始める',
      ],
    },
    {
      heading: '失踪と裏の関係の発覚',
      bullets: [
        '帰宅時に自宅の異変と妻の失踪が発覚',
        'マンション売却と離婚の告白',
        'SNS調査により歌舞伎町やホストとの関係が浮上',
        'ホストクラブでの常連化と妊娠詐称疑惑が明らかになる',
      ],
    },
    {
      heading: '対面暴露と離婚・再出発',
      bullets: [
        'ホストクラブでの直接対面と真相の暴露',
        '妊娠詐称と金銭的搾取の疑惑が確定的に露呈',
        'SNS炎上により社会的にも拡散',
        '離婚成立と慰謝料請求',
        'それぞれが別の人生へ再出発',
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
