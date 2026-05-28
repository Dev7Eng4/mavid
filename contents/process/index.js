import { PATHS } from '../constants/paths';

export async function main(folder = PATHS.DOWNLOADS) {
  const transcriptObjects = await convertTranscript(folder);

  const { niche_config, style_config } = resolveProjectConfigs({
    nicheId: 'senior_scam_prevention',
    styleId: undefined,
  });

  // Step 2
  const visualBeatPrompt = promptExtractVisualBeatsFromTranscriptBatch({
    batchId,
    nicheConfig: niche_config,
    styleConfig: style_config,
    previousPreviewContext,
    currentNumberedTranscript,
    nextPreviewContext,
  });

  // Step 3
  const sceneSpecPrompt = promptCreateSceneSpecsFromVisualBeatsBatch({
    batchId,
    sceneStartIndex,
    projectContext,
    nicheConfig: niche_config,
    styleConfig: style_config,
    sceneGenerationConfig,
    previousBeatPreview,
    currentVisualBeats,
    nextBeatPreview,
  });

  // Step 4
  const imagePromptPrompt = promptCreateImagePromptsFromSceneSpecsBatch({
    batchId,
    projectContext,
    nicheConfig: niche_config,
    styleConfig: style_config,
    imagePromptConfig,
    previousScenePreview,
    currentSceneSpecs,
    nextScenePreview,
  });
}

main();
