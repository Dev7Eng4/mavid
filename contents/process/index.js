import { PATHS } from '../constants/paths.js';
import { resolveProjectConfigs } from './config.js';
import { convertTranscript } from './convertTranscript.js';
import { main as detechNiche } from './detechNiche.js';
import { main as createBeats } from './createBeats.js';
import { main as createSceneSpecs } from './createSceneSpecs.js';

export async function main(folder = PATHS.DOWNLOADS) {
  const transcriptObjects = await convertTranscript(folder);

  const detectedNiche = await detechNiche(transcriptObjects);
  console.log('🚀 ~ main ~ detectedNiche:', detectedNiche);

  // const { niche_config, style_config } = resolveProjectConfigs({
  //   nicheId: detectedNiche.niche_config,
  //   styleId: detectedNiche.style_config,
  // });

  const visualBeatPrompt = await createBeats(transcriptObjects, detectedNiche.niche_config, detectedNiche.style_config);

  const sceneSpecsPrompt = await createSceneSpecs(visualBeatPrompt, detectedNiche.niche_config, detectedNiche.style_config);
  console.log('🚀 ~ main ~ sceneSpecsPrompt:', sceneSpecsPrompt);

  return;

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
