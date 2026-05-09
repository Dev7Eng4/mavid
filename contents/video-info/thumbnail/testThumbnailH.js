/**
 * Test pipeline jaHorizontal đầy đưủ — bắt đầu từ `generateAnalysisAndTextForThumbnailHorizontal`:
 * Gemini 3 bước → Flow (`flow-thumbnail.jpg`) → ghép chữ (Playwright + `thumbnailHorizontalFlowComposite.html`).
 *
 * Không có chế độ stub: yêu cầu Chrome profile Playwright (`PLAYWRIGHT_PROFILES[0]`), Gemini, Flow và
 * (`npx playwright install chromium` nếu chưa có).
 *
 * Chạy từ root repo:
 *   node contents/video-info/thumbnail/testThumbnailH.js
 * Chỉ test ghép chữ (ảnh nền từ `contents/downloads`, Playwright):
 *   node contents/video-info/thumbnail/testThumbnailH.js --composite
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadPromptByLanguage } from '../../prompts/index.js';
import { generateAnalysisAndTextForThumbnailHorizontal } from './jaHorizontal/thumbnailHorizontalGemini.js';
import { renderThumbnailHorizontalFlowCompositeToPath } from './jaHorizontal/thumbnailComposite.cli.js';
import { optimizeFlowThumbnailJpegIfLarge } from './thumbnailOptimize.util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Ảnh nền mẫu cho test composite — đặt file `.jpg`/`.jpeg` vào đây. */
export const THUMBNAIL_TEST_DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

/** Payload tối thiểu giống bước visual Gemini (`thumbnailHorizontalFlowComposite.html` → `mergeFlow`). */
const SAMPLE_FLOW_LAYOUT_COMPOSITE = {
  visual_prompt: 'local test composite',
  thumbnail_copy: {
    line_1: '妊娠した妻の相手は同じ',
    line_2: '手は同じマンションの大学生',
    line_3: 'DNA鑑定で家庭が崩壊',
    twist_line: '衝撃の結末!?',
  },
  color_strategy: {
    line_1_fill: '#FFF200',
    line_2_fill: '#FF2A2A',
    line_3_fill: '#FFFFFF',
    top_text_stroke: '#000000',
    twist_fill: '#FFFFFF',
    twist_stroke: '#000000',
    twist_bg: '#CC0000',
  },
};

/** Title / summary mẫu — cùng hướng dữ liệu với pipeline thật (summary là object, Gemini nhận JSON). */
const SAMPLE_TITLE = '安定した家庭の崩壊から再生へ：DNA鑑定が引き起こした離婚劇の全記録';

const SAMPLE_SUMMARY = {
  overview:
    '本作は、都内で安定した家庭生活を送っていた40歳男性が、妻の妊娠をきっかけにDNA鑑定で不貞を突き止め、同マンション内の大学生との不倫発覚から家庭崩壊、法的対立、そして離婚成立を経て、最終的に新たな人生へと再出発していくまでの一連の記録である。平穏な日常から急激に崩壊へ転じ、感情的対立と制度的解決を経て再生へ至る長期的な人間ドラマが描かれる。',
  key_takeaways: [
    '安定した家庭生活が妻の妊娠を契機に崩壊へ転じる',
    'DNA鑑定により不貞と父子関係の否定が確定する',
    '不倫相手が同マンション在住の大学生であることが判明する',
    '離婚・示談交渉を通じて法的解決へ移行する',
    '子供たちへの告知により家庭崩壊が決定的となる',
    '最終的に離婚成立後、生活再建と新たな人間関係が描かれる',
  ],
  structured_sections: [
    {
      heading: '安定した家庭の前提と日常',
      bullets: [
        '製薬会社勤務の男性が都内マンションで妻・子供3人と生活',
        '学生時代からの交際を経て結婚し、住宅購入も順調',
        '計画通りの人生設計の中で安定した家庭を築いていた',
      ],
    },
    {
      heading: '疑念の発生とDNA鑑定による崩壊の引き金',
      bullets: ['妻の妊娠に違和感を抱きDNA鑑定を実施', '胎児が自分の子ではないと判明し衝撃が走る', '父親特定と不倫調査へと方向転換する'],
    },
    {
      heading: '不倫相手の特定と真相の急速な解明',
      bullets: [
        '妹からの情報提供を契機に同マンションの大学生が浮上',
        'DNA結果と生活情報から不倫関係が確定的になる',
        '調査が進み当事者特定へと至る',
      ],
    },
    {
      heading: '不倫発覚と家庭関係の破綻開始',
      bullets: ['妻が不倫を認め謝罪する', '夫が離婚を宣言し関係が対立構造へ移行', '家庭関係が修復不能な段階に突入する'],
    },
    {
      heading: '離婚交渉と完全な決裂',
      bullets: ['妻が離婚回避を懇願するも交渉は難航', '条件提示を巡り対立が激化', '関係修復不可能が確定する'],
    },
    {
      heading: '子供への告知と家庭崩壊の拡大',
      bullets: ['子供たちに不倫と妊娠の事実を告知', '強い拒絶反応により精神的混乱が発生', '子供たちが実家へ避難し家庭機能が崩壊する'],
    },
    {
      heading: '法的対立と示談交渉の長期化',
      bullets: ['弁護士を介した示談交渉が開始される', '大学生側との責任・慰謝料を巡る対立が激化', '最終的に制度的解決へと収束する'],
    },
    {
      heading: '離婚成立と生活再建',
      bullets: ['離婚が正式に成立し関係が完全に解消される', '元妻は生活圏から離れ家族は分離される', '語り手側は子供と共に生活を再建する'],
    },
    {
      heading: '数年後の再出発',
      bullets: ['バツイチ女性との新たな出会いが描かれる', '子供や犬を通じた家族的交流が進む', '過去を乗り越え前向きな人生へ移行する'],
    },
  ],
};

/**
 * @param {object} [opts]
 * @param {string} [opts.downloadsDir] — mặc định `contents/downloads` (`THUMBNAIL_TEST_DOWNLOADS_DIR`)
 * @param {string} [opts.backgroundImageName] — tên file trong thư mục; nếu không truyền, lấy file `.jpg`/`.jpeg` đầu tiên (theo thứ tự tên)
 * @param {string} [opts.outFileName='flow-composite-test.jpg'] — file JPEG ghi trong cùng thư mục
 * @param {Record<string, unknown>} [opts.flowLayout] — mặc định `SAMPLE_FLOW_LAYOUT_COMPOSITE` (chữ overlay mẫu)
 * @returns {Promise<{ backgroundImagePath: string, outPath: string }>}
 */
export async function testRenderThumbnailHorizontalFlowCompositeToPath({
  downloadsDir = THUMBNAIL_TEST_DOWNLOADS_DIR,
  backgroundImageName,
  outFileName = 'flow-composite-test.jpg',
  flowLayout = SAMPLE_FLOW_LAYOUT_COMPOSITE,
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
        `testRenderThumbnailHorizontalFlowCompositeToPath: không có file .jpg/.jpeg trong ${downloadsDir}. Hãy đặt ít nhất một ảnh nền (JPEG) vào thư mục này.`,
      );
    }
    bgName = names[0];
  }

  const backgroundImagePath = path.join(downloadsDir, bgName);
  if (!fs.existsSync(backgroundImagePath) || !lowerOk(bgName)) {
    throw new Error(
      `testRenderThumbnailHorizontalFlowCompositeToPath: cần file ảnh nền .jpg/.jpeg (CLI embed data:image/jpeg): ${backgroundImagePath}`,
    );
  }

  const outPath = path.join(downloadsDir, outFileName);

  console.log('=== Test renderThumbnailHorizontalFlowCompositeToPath ===');
  console.log(`downloadsDir: ${downloadsDir}`);
  console.log(`background: ${bgName}`);
  console.log(`out: ${outFileName}`);

  const t0 = Date.now();
  await renderThumbnailHorizontalFlowCompositeToPath({
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

  console.log(`\n✓ JPEG composite: ${outPath} (${st.size} bytes)`);
  console.log(`elapsed: ${elapsed}s`);

  return { backgroundImagePath, outPath };
}

/**
 * @param {object} [opts]
 * @param {Record<string, any>} [opts.prompts] — nếu bỏ trống: `loadPromptByLanguage(language)`
 * @param {string|null|undefined} [opts.language='ja']
 * @param {string} [opts.title=SAMPLE_TITLE]
 * @param {object|string} [opts.summary=SAMPLE_SUMMARY]
 * @param {string} [opts.outDir] — thư mục làm việc + lưu `flow-thumbnail.jpg` (mặc định: thư mục Downloads)
 * @param {string} [opts.logTag='test-thumbnail-h']
 * @returns {Promise<{ outPath: string, visualResult: Record<string, unknown> }>}
 */
export async function testJaHorizontalFromGemini({
  prompts: promptsArg,
  language = 'ja',
  title = SAMPLE_TITLE,
  summary = SAMPLE_SUMMARY,
  outDir,
  logTag = 'test-thumbnail-h',
} = {}) {
  const prompts = promptsArg ?? (await loadPromptByLanguage(language));
  const dir = outDir ?? path.join(os.homedir(), 'Downloads');
  fs.mkdirSync(dir, { recursive: true });

  const outPath = path.join(dir, 'flow-thumbnail.jpg');

  console.log('=== Test generateAnalysisAndTextForThumbnailHorizontal (jaHorizontal) ===');
  console.log(`outputDir: ${dir}`);

  const t0 = Date.now();
  const visualResult = await generateAnalysisAndTextForThumbnailHorizontal({
    prompts,
    title,
    summary,
    outputDir: dir,
    logTag,
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

  return { outPath, visualResult };
}

async function main() {
  if (process.argv.includes('--composite')) {
    await testRenderThumbnailHorizontalFlowCompositeToPath();
    return;
  }
  await testJaHorizontalFromGemini();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
