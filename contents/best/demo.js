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
import { main as runStep3 } from './step3/index.js';
import { main as runStep4 } from './step4/index.js';
import { NICHE_CONFIGS } from './niche-config/index.js';
import { VISUAL_STYLE_CONFIGS } from './visual-style/index.js';

const __filename = fileURLToPath(import.meta.url);

const CHUNK_TARGET_LINES = 160;
const CHUNK_OVERLAP_LINES = 10;

function transcriptLinesFromSrtObjects(objects) {
  return objects.map((obj, index) => {
    const lineId = Number.parseInt(obj.id, 10);
    return {
      line_id: Number.isFinite(lineId) ? lineId : index + 1,
      text: obj.text,
    };
  });
}

function truncateTranscriptForMaxChunks(transcriptLines, maxChunks) {
  if (maxChunks == null) return transcriptLines;
  const maxLines = CHUNK_TARGET_LINES + Math.max(0, maxChunks - 1) * (CHUNK_TARGET_LINES - CHUNK_OVERLAP_LINES);
  return transcriptLines.slice(0, Math.min(maxLines, transcriptLines.length));
}

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

function saveStep4Result(srtPath, resultStep4) {
  const srtBaseName = path.basename(srtPath, path.extname(srtPath));
  const outputPath = path.join(path.dirname(srtPath), `${srtBaseName}.step4.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ ...resultStep4 }, null, 2), 'utf8');
  console.log(`✅ Đã lưu step4: ${outputPath}`);
  return outputPath;
}

export async function demo() {
  const { srtPath, transcriptLines, videoDurationSeconds } = loadTranscriptFromDownloads();
  console.log('🚀 ~ demo ~ transcriptLines:', transcriptLines);

  const resolvedConfig = resolveVideoConfig({
    niche: 'personal_finance_social_security_retirement_japan',
    visualStyle: 'semi_realistic_illustration',
    videoDurationSeconds: videoDurationSeconds,
  });

  const chunkAnalyses = await runStep1(transcriptLines, resolvedConfig, {
    niche: 'senior_health_japan',
    visualStyle: 'soft_anime',
    videoDurationSeconds: videoDurationSeconds,
  });
  console.log('🚀 ~ demo ~ resultStep1:', chunkAnalyses);

  const resultStep2 = await runStep2(chunkAnalyses, resolvedConfig, {
    videoDurationSeconds: videoDurationSeconds,
  });
  console.log('🚀 ~ demo ~ resultStep2:', resultStep2);

  const resultStep3 = await runStep3(resultStep2, resolvedConfig, {
    videoDurationSeconds: videoDurationSeconds,
  });
  console.log('🚀 ~ demo ~ resultStep3:', resultStep3);

  const resultStep4 = await runStep4(chunkAnalyses, resultStep2, resultStep3, resolvedConfig, {
    videoDurationSeconds: videoDurationSeconds,
  });
  console.log('🚀 ~ demo ~ resultStep4:', resultStep4);

  saveStep4Result(srtPath, resultStep4);
}

demo();
