/**
 * Chia transcript (output convertTranscript) thành từng 100 dòng + 10 dòng ngữ cảnh,
 * gửi promptSegmentTranscriptToVisualBeats qua LLM, lưu JSON vào downloads/.
 *
 * Dùng:
 *   node contents/makeVideoSlide/createVisualBeat.js
 *   node contents/makeVideoSlide/createVisualBeat.js path/to/file.srt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { PATHS } from '../../../constants/paths.js';
import { openChatPage, sendPromptWithRetry } from '../../../llm/browser.util.js';
import { stripJsonCodeFence, validateJsonResponse } from '../../../llm/text.util.js';
import openChromeProfile from '../../../scripts/makeChromeProfile.js';
import {
  convertSrtFile,
  loadTranscriptFromDownloads,
  saveTranscript,
  transcriptOutputPath,
  transcriptToIdText,
} from './convertTranscript.js';
import { promptSegmentTranscriptToVisualBeats } from './prompts.js';

const BATCH_SIZE = 100;
const CONTEXT_LINES = 10;

/** @param {string} srtPath */
export function visualBeatsManifestPath(srtPath) {
  const base = path.basename(srtPath, path.extname(srtPath));
  return path.join(path.dirname(srtPath), `${base}.visual-beats.json`);
}

/**
 * @param {string} srtPath
 * @param {number} segmentIndex — 1-based
 */
export function visualBeatsSegmentPath(srtPath, segmentIndex) {
  const base = path.basename(srtPath, path.extname(srtPath));
  const n = String(segmentIndex).padStart(3, '0');
  return path.join(path.dirname(srtPath), `${base}.visual-beats-seg${n}.json`);
}

/**
 * @param {string} content
 * @returns {{ id: number, text: string }[]}
 */
export function parseTranscriptIdText(content) {
  const lines = String(content ?? '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const m = line.match(/^\[(\d+)\]\s*(.*)$/s);
    if (!m) {
      throw new Error(`parseTranscriptIdText: không parse được dòng ${index + 1}: ${line.slice(0, 80)}`);
    }
    return { id: Number.parseInt(m[1], 10), text: m[2] };
  });
}

/**
 * @param {{ id: number, text: string }[]} transcript
 * @param {{ batchSize?: number, contextLines?: number }} [options]
 */
export function createTranscriptSegments(transcript, options = {}) {
  const batchSize = options.batchSize ?? BATCH_SIZE;
  const contextLines = options.contextLines ?? CONTEXT_LINES;

  if (!Array.isArray(transcript) || transcript.length === 0) {
    throw new Error('createTranscriptSegments: transcript rỗng');
  }

  /** @type {Array<{ segmentIndex: number, startLineId: number, endLineId: number, previousLines: { id: number, text: string }[], currentLines: { id: number, text: string }[] }>} */
  const segments = [];

  for (let start = 0; start < transcript.length; start += batchSize) {
    const end = Math.min(start + batchSize, transcript.length);
    const previousLines = start > 0 ? transcript.slice(Math.max(0, start - contextLines), start) : [];
    const currentLines = transcript.slice(start, end);

    segments.push({
      segmentIndex: segments.length + 1,
      startLineId: currentLines[0].id,
      endLineId: currentLines[currentLines.length - 1].id,
      previousLines,
      currentLines,
    });
  }

  return segments;
}

/**
 * @param {string} filePath
 * @param {unknown} data
 */
export function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return filePath;
}

/**
 * @param {{ id: number, text: string }[]} lines
 * @returns {string}
 */
export function linesToNumberedTranscript(lines) {
  return transcriptToIdText(lines);
}

/**
 * @param {{ previousLines: { id: number, text: string }[], currentLines: { id: number, text: string }[] }} segment
 */
export function buildVisualBeatsPrompt(segment) {
  return promptSegmentTranscriptToVisualBeats({
    previousNumberedTranscript: linesToNumberedTranscript(segment.previousLines),
    numberedTranscript: linesToNumberedTranscript(segment.currentLines),
  });
}

function defaultLlmProfile() {
  const fromEnv = process.env.LLM_TEST_PROFILE || process.env.GEMINI_TEST_PROFILE || process.env.GPT_TEST_PROFILE;
  const n = Number(fromEnv);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * @param {string} raw
 * @returns {Record<string, unknown>}
 */
export function parseVisualBeatsResponse(raw) {
  const cleaned = stripJsonCodeFence(raw);
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.beats)) {
    throw new Error('parseVisualBeatsResponse: JSON thiếu mảng "beats"');
  }
  return parsed;
}

/**
 * @param {{ id: number, text: string }[]} transcript
 * @param {object} [options]
 * @param {string} [options.srtPath] — dùng để đặt tên file output trong downloads
 * @param {number} [options.profile]
 * @param {boolean} [options.visible]
 * @param {boolean} [options.thinkingMode]
 * @param {number} [options.batchSize]
 * @param {number} [options.contextLines]
 * @param {(info: { segmentIndex: number, total: number }) => void} [options.onSegmentStart]
 */
export async function segmentTranscriptToVisualBeats(transcript, options = {}) {
  const {
    srtPath = PATHS.DOWNLOADS,
    profile = defaultLlmProfile(),
    visible = true,
    thinkingMode = false,
    batchSize = BATCH_SIZE,
    contextLines = CONTEXT_LINES,
    onSegmentStart,
  } = options;

  const segments = createTranscriptSegments(transcript, { batchSize, contextLines });
  console.log('🚀 ~ segmentTranscriptToVisualBeats ~ segments:', segments[0].currentLines[0]);

  /** @type {Array<Record<string, unknown>>} */
  const segmentResults = [];

  const { context, page } = await openChromeProfile({ profile, visible });

  try {
    await openChatPage(page, { thinkingMode });

    for (const segment of segments) {
      onSegmentStart?.({ segmentIndex: segment.segmentIndex, total: segments.length });

      const prompt = buildVisualBeatsPrompt(segment);
      const raw = await sendPromptWithRetry(page, prompt, {
        validate: validateJsonResponse,
        label: `[visual-beats] seg ${String(segment.segmentIndex).padStart(3, '0')}`,
      });

      const beatsPayload = parseVisualBeatsResponse(raw);
      const record = {
        segment_index: segment.segmentIndex,
        line_range: {
          start_line_id: segment.startLineId,
          end_line_id: segment.endLineId,
        },
        context_line_ids: segment.previousLines.map(l => l.id),
        beats: beatsPayload.beats,
      };

      const segmentPath = visualBeatsSegmentPath(srtPath, segment.segmentIndex);
      // saveJsonFile(segmentPath, record);
      segmentResults.push(...beatsPayload.beats);

      console.log(
        `✅ segment ${segment.segmentIndex}/${segments.length} → ${path.basename(segmentPath)} (${beatsPayload.beats.length} beats)`
      );
    }
  } finally {
    await context.close().catch(() => {});
  }

  const manifestPath = visualBeatsManifestPath(srtPath);
  // saveJsonFile(manifestPath, segmentResults);

  return { manifestPath, segmentResults };
}

/**
 * @param {object} [options]
 * @param {string} [options.downloadsDir]
 * @param {string} [options.srtPath]
 * @param {number} [options.profile]
 * @param {boolean} [options.visible]
 */
export async function createVisualBeats(options = {}) {
  const { downloadsDir = PATHS.DOWNLOADS, profile, visible } = options;

  const { srtPath, transcript } = loadTranscriptFromDownloads(downloadsDir);

  const result = await segmentTranscriptToVisualBeats(transcript, {
    srtPath,
    profile,
    visible,
    onSegmentStart: ({ segmentIndex, total }) => {
      console.log(`⏳ Đang xử lý segment ${segmentIndex}/${total}...`);
    },
  });

  console.log(`📦 Manifest: ${result.manifestPath}`);
  return { transcriptObjects: transcript, ...result };
}

export default async function main() {
  const argPath = process.argv[2];
  await createVisualBeats(argPath ? { srtPath: argPath } : {});
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
