import { resolveVideoConfig } from '../resolveNicheAndStyle.js';
import { promptStep1ChunkAnalysis } from './prompt.js';
import { validateStep1Output } from './validate.js';

function createTranscriptChunks(lines, options = {}) {
  const { targetLinesPerChunk = 160, overlapLines = 10, maxCharactersPerChunk = 9000 } = options;

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 1;

  while (startIndex < lines.length) {
    let endIndex = Math.min(startIndex + targetLinesPerChunk, lines.length);

    let currentTextLength = lines.slice(startIndex, endIndex).reduce((sum, line) => sum + line.text.length, 0);

    while (currentTextLength > maxCharactersPerChunk && endIndex > startIndex + 20) {
      endIndex -= 10;
      currentTextLength = lines.slice(startIndex, endIndex).reduce((sum, line) => sum + line.text.length, 0);
    }

    const chunkLines = lines.slice(startIndex, endIndex);

    const hasOverlap = chunkIndex > 1;
    const overlapStartIndex = hasOverlap ? startIndex : null;
    const overlapEndIndex = hasOverlap ? Math.min(startIndex + overlapLines - 1, endIndex - 1) : null;

    const newContentStartIndex = hasOverlap ? Math.min(startIndex + overlapLines, endIndex - 1) : startIndex;

    chunks.push({
      chunk_id: `chunk_${String(chunkIndex).padStart(3, '0')}`,
      line_range: {
        start_line_id: chunkLines[0].line_id,
        end_line_id: chunkLines[chunkLines.length - 1].line_id,
      },
      overlap: {
        has_overlap: hasOverlap,
        overlap_line_range: hasOverlap
          ? {
              start_line_id: lines[overlapStartIndex].line_id,
              end_line_id: lines[overlapEndIndex].line_id,
            }
          : null,
        new_content_line_range: {
          start_line_id: lines[newContentStartIndex].line_id,
          end_line_id: chunkLines[chunkLines.length - 1].line_id,
        },
      },
      lines_text: chunkLines.map(line => `[${line.line_id}] ${line.text}`).join('\n'),
    });

    if (endIndex >= lines.length) break;

    startIndex = Math.max(0, endIndex - overlapLines);
    chunkIndex++;
  }

  return chunks;
}

const pickStep1Rules = resolvedConfig => {
  return {
    niche_id: resolvedConfig.niche.id,
    content_type: resolvedConfig.niche.contentType,
    analysis_focus: resolvedConfig.niche.analysisFocus,
    chunk_analysis_rules: resolvedConfig.niche.chunkAnalysisRules,
    visual_rules: {
      heroImageType: resolvedConfig.niche.visualRules.heroImageType,
      avoidVisuals: resolvedConfig.niche.visualRules.avoidVisuals,
      visualMood: resolvedConfig.niche.visualRules.visualMood,
    },
    scene_rules: {
      sceneTypes: resolvedConfig.niche.sceneRules.sceneTypes,
    },
    safety_rules: resolvedConfig.niche.safetyRules,
    transcript_rules: resolvedConfig.global.transcriptRules,
  };
};

export default async function main(
  transcriptLines,
  options = {
    niche: 'japanese_audio_drama',
    visualStyle: 'cinematic',
    videoDurationSeconds: 100,
  }
) {
  // const transcriptLines = [
  //   { line_id: 1, text: 'text line 1' },
  //   { line_id: 2, text: 'text line 2' },
  //   { line_id: 3, text: 'text line 3' },
  //   { line_id: 4, text: 'text line 4' },
  //   { line_id: 5, text: 'text line 5' },
  //   { line_id: 6, text: 'text line 6' },
  // ];
  const chunks = createTranscriptChunks(transcriptLines, {
    targetLinesPerChunk: 160,
    overlapLines: 10,
    maxCharactersPerChunk: 9000,
    language: 'ja',
  });

  const resolvedConfig = resolveVideoConfig({
    niche: options.niche,
    visualStyle: options.visualStyle,
    videoDurationSeconds: options.videoDurationSeconds,
  });

  const step1Rules = pickStep1Rules(resolvedConfig);

  let previousContext = {
    available: false,
    continuity_summary: '',
    active_characters: [],
    active_topics: [],
    active_conflicts: [],
    open_loops: [],
    last_known_state: '',
  };

  const chunkAnalyses = [];

  for (const chunk of chunks) {
    const prompt = promptStep1ChunkAnalysis({
      chunkId: chunk.chunk_id,
      videoContext: {
        niche_id: resolvedConfig.niche.id,
        visual_style_id: resolvedConfig.visualStyle.id,
        language: options.language,
        output_type: 'audio_image_video',
      },
      step1Rules,
      previousContext,
      transcriptChunk: chunk,
    });

    const result = await callAI(prompt);

    const parsed = JSON.parse(result);

    validateStep1Output(parsed);

    chunkAnalyses.push(parsed);

    previousContext = {
      available: true,
      ...parsed.continuity_context_for_next_chunk,
    };
  }
}
