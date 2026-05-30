import { PATHS } from '../constants/paths.js';
import fs from 'fs';
import { resolveProjectConfigs } from './config.js';
import { convertTranscript } from './convertTranscript.js';
import { main as detechNiche } from './detechNiche.js';
import { main as createBeats } from './createBeats.js';
import { main as createSceneSpecs } from './createSceneSpecs.js';
import { main as createImagePrompts } from './createImagePrompt.js';
import { main as generateImages } from './generateImages.js';

export async function main(folder = PATHS.DOWNLOADS) {
  const transcriptObjects = await convertTranscript(folder);

  const detectedNiche = await detechNiche(transcriptObjects);
  fs.writeFileSync('detectedNiche.json', JSON.stringify(detectedNiche, null, 2), 'utf8');

  // const { niche_config, style_config } = resolveProjectConfigs({
  //   nicheId: detectedNiche.niche_config,
  //   styleId: detectedNiche.style_config,
  // });

  const visualBeats = await createBeats(transcriptObjects, detectedNiche.niche_config, detectedNiche.style_config);
  fs.writeFileSync('visualBeats.json', JSON.stringify(visualBeats, null, 2), 'utf8');

  const sceneSpecs = await createSceneSpecs(visualBeats, detectedNiche.niche_config, detectedNiche.style_config);
  fs.writeFileSync('sceneSpecs.json', JSON.stringify(sceneSpecs, null, 2), 'utf8');

  const imageScenePrompts = await createImagePrompts(sceneSpecs, detectedNiche.niche_config, detectedNiche.style_config);

  fs.writeFileSync('imageScenePrompts.json', JSON.stringify(imageScenePrompts, null, 2), 'utf8');

  await generateImages(imageScenePrompts, folder);
}

main();
