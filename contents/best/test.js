/**
 * Test Step 1: đọc file .srt trong `downloads/` → chunk → gửi LLM → validate JSON.
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
import runStep1 from './step1/index.js';

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
 * @returns {Promise<{ outputPath: string, chunkCount: number, lineCount: number, srtPath: string, chunkAnalyses: object[] }>}
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

  const { context, page } = await openChromeProfile({ profile, visible: true });

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
    const resolvedOutputPath =
      outputPath ?? path.join(path.dirname(srtPath), `${srtBaseName}.step1.json`);

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
    const summary = await testStep1({ downloadsDir, maxChunks });
    console.log('[testStep1] Hoàn thành —', summary.chunkCount, 'chunk,', summary.lineCount, 'dòng.');
  } catch (err) {
    console.error('[testStep1] Lỗi:', err);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] != null && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  main();
}
