/**
 * Test pipeline best: Step 1 → Step 2.
 *
 * Step 1: đọc file .srt trong `downloads/` → chunk → gửi LLM → validate JSON.
 * Step 2: tổng hợp chunk analyses → final content analysis (một lần gọi LLM).
 *
 * Chạy từ root repo:
 *   node contents/best/test.js
 *   node contents/best/test.js "D:/mavid/downloads"
 *   node contents/best/test.js "" 2
 *
 * Tham số:
 *   argv[2] — thư mục downloads (mặc định `downloads/` ở root repo)
 *   argv[3] — maxChunks (số chunk tối đa, để debug; bỏ qua = chạy hết)
 *
 * Biến môi trường:
 *   BEST_STEP1_NICHE          — mặc định japanese_audio_drama
 *   BEST_STEP1_VISUAL_STYLE   — mặc định cinematic
 *   BEST_STEP1_LANGUAGE       — mặc định ja
 *   LLM_TEST_PROFILE          — Chrome profile (mặc định 2)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../constants/paths.js';
import { openChatPage, sendPromptWithRetry, stripJsonCodeFence, validateJsonResponse } from '../llm/index.js';
import { openChromeProfile } from '../scripts/makeChromeProfile.js';
import { getSrtDurationInMinutes, parseSrtToObjects } from '../utils/srt.util.js';
import { getSubtitleFile } from '../makeFromAudio/shared.js';
import { resolveVideoConfig } from './resolveNicheAndStyle.js';
import runStep1 from './step1/index.js';
import { main as runStep2 } from './step2/index.js';

const __filename = fileURLToPath(import.meta.url);

const CHUNK_TARGET_LINES = 160;
const CHUNK_OVERLAP_LINES = 10;

function defaultProfile() {
  const fromEnv = process.env.LLM_TEST_PROFILE || process.env.GEMINI_TEST_PROFILE || process.env.GPT_TEST_PROFILE;
  const n = Number(fromEnv);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * @param {{ id: string, timeline: string, text: string }[]} objects
 * @returns {{ line_id: number, text: string }[]}
 */
function transcriptLinesFromSrtObjects(objects) {
  return objects.map((obj, index) => {
    const lineId = Number.parseInt(obj.id, 10);
    return {
      line_id: Number.isFinite(lineId) ? lineId : index + 1,
      text: obj.text,
    };
  });
}

/**
 * Ước lượng số dòng transcript cần để giới hạn số chunk (debug).
 * @param {{ line_id: number, text: string }[]} transcriptLines
 * @param {number} maxChunks
 */
function truncateTranscriptForMaxChunks(transcriptLines, maxChunks) {
  if (maxChunks == null) return transcriptLines;
  const maxLines = CHUNK_TARGET_LINES + Math.max(0, maxChunks - 1) * (CHUNK_TARGET_LINES - CHUNK_OVERLAP_LINES);
  return transcriptLines.slice(0, Math.min(maxLines, transcriptLines.length));
}

/**
 * Đọc SRT từ thư mục downloads (ưu tiên .srt, sau đó .vtt qua getSubtitleFile).
 * @param {string} [downloadsDir]
 * @returns {{ srtPath: string, transcriptLines: { line_id: number, text: string }[], videoDurationSeconds: number }}
 */
export function loadTranscriptFromDownloads(downloadsDir = PATHS.DOWNLOADS) {
  const dir = path.resolve(downloadsDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`loadTranscriptFromDownloads: không tìm thấy thư mục ${dir}`);
  }

  const srtPath = getSubtitleFile(dir);
  if (!srtPath) {
    throw new Error(`loadTranscriptFromDownloads: không có file .srt/.vtt trong ${dir}`);
  }

  const ext = path.extname(srtPath).toLowerCase();
  if (ext !== '.srt') {
    throw new Error(`loadTranscriptFromDownloads: hiện chỉ hỗ trợ .srt, nhận được ${path.basename(srtPath)}`);
  }

  const raw = fs.readFileSync(srtPath, 'utf8');
  const objects = parseSrtToObjects(raw);
  const transcriptLines = transcriptLinesFromSrtObjects(objects);

  if (transcriptLines.length === 0) {
    throw new Error(`loadTranscriptFromDownloads: parse SRT rỗng — ${srtPath}`);
  }

  const cuesForDuration = raw
    .replace(/\r/g, '')
    .trim()
    .split(/\n\n+/)
    .map(c => c.trim())
    .filter(Boolean);
  const durationMin = getSrtDurationInMinutes(cuesForDuration);
  const videoDurationSeconds = Math.round(durationMin * 60);

  return { srtPath, transcriptLines, videoDurationSeconds };
}

/**
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {number|null} [options.maxChunks]
 * @param {string} [options.niche]
 * @param {string} [options.visualStyle]
 * @param {string} [options.language]
 * @param {number} [options.profile]
 * @param {boolean} [options.closeBrowser=true]
 * @param {string|null} [options.outputPath] — ghi JSON kết quả; null = `<downloads>/<tên-srt>.step1.json`
 * @param {import('playwright').BrowserContext} [options.browserContext] — tái dùng context từ lần mở trước
 * @param {import('playwright').Page} [options.page]
 * @returns {Promise<{ outputPath: string, chunkCount: number, lineCount: number, srtPath: string, chunkAnalyses: object[], niche: string, visualStyle: string, language: string, videoDurationSeconds: number, browserContext?: import('playwright').BrowserContext, page?: import('playwright').Page }>}
 */
export async function testStep1(options = {}) {
  const {
    downloadsDir = PATHS.DOWNLOADS,
    maxChunks = null,
    niche = process.env.BEST_STEP1_NICHE || 'japanese_audio_drama',
    visualStyle = process.env.BEST_STEP1_VISUAL_STYLE || 'cinematic',
    language = process.env.BEST_STEP1_LANGUAGE || 'ja',
    profile = defaultProfile(),
    closeBrowser = true,
    outputPath = null,
    browserContext: existingContext = null,
    page: existingPage = null,
  } = options;

  const { srtPath, transcriptLines, videoDurationSeconds } = loadTranscriptFromDownloads(downloadsDir);
  const linesForRun = truncateTranscriptForMaxChunks(transcriptLines, maxChunks);

  console.log('[testStep1] SRT:', srtPath);
  console.log('[testStep1] Dòng transcript:', transcriptLines.length);
  if (maxChunks != null) {
    console.log('[testStep1] Giới hạn debug — dùng', linesForRun.length, 'dòng (~', maxChunks, 'chunk)');
  }
  console.log('[testStep1] Ước lượng thời lượng:', videoDurationSeconds, 'giây');
  console.log('[testStep1] niche:', niche, '| visualStyle:', visualStyle, '| language:', language);

  const ownsBrowser = existingContext == null;
  let context = existingContext;
  let page = existingPage;
  if (ownsBrowser) {
    ({ context, page } = await openChromeProfile({ profile, visible: true }));
  }

  const chunkAnalyses = [];
  let chunkIndex = 0;
  const previousCallAI = globalThis.callAI;

  try {
    await openChatPage(page, { thinkingMode: false });

    globalThis.callAI = async prompt => {
      chunkIndex += 1;
      console.log(`[testStep1] Chunk ${chunkIndex}…`);

      const raw = await sendPromptWithRetry(page, prompt, {
        requireCodeBlock: false,
        validate: validateJsonResponse,
        maxRetries: 2,
        retryDelayMs: 3000,
        label: '[best/step1]',
      });
      const result = stripJsonCodeFence(raw);
      chunkAnalyses.push(JSON.parse(result));
      return result;
    };

    await runStep1(linesForRun, {
      niche,
      visualStyle,
      videoDurationSeconds,
      language,
    });

    const srtBaseName = path.basename(srtPath, path.extname(srtPath));
    const resolvedOutputPath = outputPath ?? path.join(path.dirname(srtPath), `${srtBaseName}.step1.json`);

    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
    fs.writeFileSync(
      resolvedOutputPath,
      JSON.stringify(
        {
          meta: {
            srtPath,
            lineCount: transcriptLines.length,
            linesProcessed: linesForRun.length,
            videoDurationSeconds,
            niche,
            visualStyle,
            language,
            chunkCount: chunkAnalyses.length,
          },
          chunkAnalyses,
        },
        null,
        2
      ),
      'utf8'
    );

    console.log('[testStep1] Đã ghi:', resolvedOutputPath);

    return {
      outputPath: resolvedOutputPath,
      chunkCount: chunkAnalyses.length,
      lineCount: transcriptLines.length,
      srtPath,
      chunkAnalyses,
      niche,
      visualStyle,
      language,
      videoDurationSeconds,
      ...(closeBrowser ? {} : { browserContext: context, page }),
    };
  } finally {
    if (previousCallAI === undefined) {
      delete globalThis.callAI;
    } else {
      globalThis.callAI = previousCallAI;
    }

    if (closeBrowser) {
      await context.close().catch(() => {});
    }
  }
}

/**
 * @param {object} [options]
 * @param {object[]} [options.chunkAnalyses]
 * @param {string} [options.step1OutputPath] — đọc chunkAnalyses + meta từ file step1
 * @param {string} [options.srtPath] — dùng để đặt tên file output step2
 * @param {string} [options.niche]
 * @param {string} [options.visualStyle]
 * @param {string} [options.language]
 * @param {number} [options.videoDurationSeconds]
 * @param {number} [options.profile]
 * @param {boolean} [options.closeBrowser=true]
 * @param {string|null} [options.outputPath] — null = `<downloads>/<tên-srt>.step2.json`
 * @param {import('playwright').BrowserContext} [options.browserContext]
 * @param {import('playwright').Page} [options.page]
 * @returns {Promise<{ outputPath: string, srtPath: string, finalAnalysis: object }>}
 */
export async function testStep2(options = {}) {
  const {
    chunkAnalyses: chunkAnalysesInput = null,
    step1OutputPath = null,
    srtPath: srtPathInput = null,
    niche = process.env.BEST_STEP1_NICHE || 'japanese_audio_drama',
    visualStyle = process.env.BEST_STEP1_VISUAL_STYLE || 'cinematic',
    language = process.env.BEST_STEP1_LANGUAGE || 'ja',
    videoDurationSeconds = null,
    profile = defaultProfile(),
    closeBrowser = true,
    outputPath = null,
    browserContext: existingContext = null,
    page: existingPage = null,
  } = options;

  let chunkAnalyses = chunkAnalysesInput;
  let srtPath = srtPathInput;
  let resolvedNiche = niche;
  let resolvedVisualStyle = visualStyle;
  let resolvedLanguage = language;
  let resolvedVideoDurationSeconds = videoDurationSeconds;

  if (step1OutputPath) {
    const saved = JSON.parse(fs.readFileSync(step1OutputPath, 'utf8'));
    chunkAnalyses = saved.chunkAnalyses;
    const meta = saved.meta ?? {};
    srtPath = srtPath ?? meta.srtPath;
    resolvedNiche = meta.niche ?? resolvedNiche;
    resolvedVisualStyle = meta.visualStyle ?? resolvedVisualStyle;
    resolvedLanguage = meta.language ?? resolvedLanguage;
    resolvedVideoDurationSeconds = meta.videoDurationSeconds ?? resolvedVideoDurationSeconds;
  }

  if (!Array.isArray(chunkAnalyses) || chunkAnalyses.length === 0) {
    throw new Error('testStep2: thiếu chunkAnalyses (truyền trực tiếp hoặc qua step1OutputPath)');
  }

  if (resolvedVideoDurationSeconds == null) {
    throw new Error('testStep2: thiếu videoDurationSeconds');
  }

  if (!srtPath) {
    throw new Error('testStep2: thiếu srtPath (truyền trực tiếp hoặc lấy từ meta step1)');
  }

  console.log('[testStep2] Chunk analyses:', chunkAnalyses.length);
  console.log('[testStep2] niche:', resolvedNiche, '| visualStyle:', resolvedVisualStyle, '| language:', resolvedLanguage);
  console.log('[testStep2] Thời lượng:', resolvedVideoDurationSeconds, 'giây');

  const resolvedConfig = resolveVideoConfig({
    niche: resolvedNiche,
    visualStyle: resolvedVisualStyle,
    videoDurationSeconds: resolvedVideoDurationSeconds,
    language: resolvedLanguage,
  });

  const ownsBrowser = existingContext == null;
  let context = existingContext;
  let page = existingPage;
  if (ownsBrowser) {
    ({ context, page } = await openChromeProfile({ profile, visible: true }));
  }

  let finalAnalysis = null;
  const previousCallAI = globalThis.callAI;

  try {
    if (ownsBrowser) {
      await openChatPage(page, { thinkingMode: false });
    }

    globalThis.callAI = async prompt => {
      console.log('[testStep2] Gửi prompt final analysis…');

      const raw = await sendPromptWithRetry(page, prompt, {
        requireCodeBlock: false,
        validate: validateJsonResponse,
        maxRetries: 2,
        retryDelayMs: 3000,
        label: '[best/step2]',
      });
      const result = stripJsonCodeFence(raw);
      finalAnalysis = JSON.parse(result);
      return result;
    };

    await runStep2(chunkAnalyses, resolvedConfig, {
      language: resolvedLanguage,
      videoDurationSeconds: resolvedVideoDurationSeconds,
    });

    if (!finalAnalysis) {
      throw new Error('testStep2: không nhận được kết quả từ LLM');
    }

    const srtBaseName = path.basename(srtPath, path.extname(srtPath));
    const resolvedOutputPath = outputPath ?? path.join(path.dirname(srtPath), `${srtBaseName}.step2.json`);

    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
    fs.writeFileSync(
      resolvedOutputPath,
      JSON.stringify(
        {
          meta: {
            srtPath,
            step1ChunkCount: chunkAnalyses.length,
            videoDurationSeconds: resolvedVideoDurationSeconds,
            niche: resolvedNiche,
            visualStyle: resolvedVisualStyle,
            language: resolvedLanguage,
          },
          finalAnalysis,
        },
        null,
        2
      ),
      'utf8'
    );

    console.log('[testStep2] Đã ghi:', resolvedOutputPath);

    return {
      outputPath: resolvedOutputPath,
      srtPath,
      finalAnalysis,
    };
  } finally {
    if (previousCallAI === undefined) {
      delete globalThis.callAI;
    } else {
      globalThis.callAI = previousCallAI;
    }

    if (closeBrowser && ownsBrowser) {
      await context.close().catch(() => {});
    }
  }
}

/**
 * Chạy Step 1 rồi Step 2 trong cùng một phiên Chrome.
 * @param {object} [options]
 * @returns {Promise<{ step1: object, step2: object }>}
 */
export async function testBestPipeline(options = {}) {
  const step1 = await testStep1({ ...options, closeBrowser: false });
  const step2 = await testStep2({
    ...options,
    chunkAnalyses: step1.chunkAnalyses,
    srtPath: step1.srtPath,
    niche: step1.niche,
    visualStyle: step1.visualStyle,
    language: step1.language,
    videoDurationSeconds: step1.videoDurationSeconds,
    browserContext: step1.browserContext,
    page: step1.page,
    closeBrowser: options.closeBrowser !== false,
  });
  return { step1, step2 };
}

function parseMaxChunks(argvValue) {
  if (argvValue == null || String(argvValue).trim() === '') return null;
  const n = Number(argvValue);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('maxChunks phải là số nguyên dương (ví dụ: node contents/best/test.js "" 2)');
  }
  return Math.floor(n);
}

async function main() {
  const downloadsArg = process.argv[2];
  const maxChunksArg = process.argv[3];

  const downloadsDir =
    downloadsArg != null && String(downloadsArg).trim() !== '' ? path.resolve(String(downloadsArg).trim()) : PATHS.DOWNLOADS;

  try {
    const maxChunks = parseMaxChunks(maxChunksArg);
    const { step1, step2 } = await testBestPipeline({ downloadsDir, maxChunks });
    console.log('[test] Hoàn thành — step1:', step1.chunkCount, 'chunk,', step1.lineCount, 'dòng | step2:', step2.outputPath);
  } catch (err) {
    console.error('[test] Lỗi:', err);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] != null && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  main();
}
