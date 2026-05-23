import { PATHS } from '../../../constants/paths.js';
import { generateImageForScenes } from '../../../makeVideoSlide/generateImageForScenes.js';
import { DOWNLOADS_DIR } from '../../shared.js';
import { createImagePromptsFromScenes } from './createPromptImageForScene.js';
import { createSceneSpecsFromBeats } from './createScenesFromBeat.js';
import { createVisualBeats } from './createVisualBeat.js';

export async function makeVideoWithSlideImage(options = {}) {
  const { perVideoDir, originalTitle, audioSpeed: speedIn, logoPath: logoPathOpt, downloadsDir = DOWNLOADS_DIR, videoLanguage } = options;

  console.log('🔄 Đang tạo visual beats...');
  const { segmentResults } = await createVisualBeats({ downloadsDir });

  console.log('🔄 Đang tạo scene specs...');
  const { manifestPath, scenes } = await createSceneSpecsFromBeats(segmentResults);

  console.log('🔄 Đang tạo image prompts...');
  const { imagePrompts } = await createImagePromptsFromScenes(scenes);

  console.log('🔄 Đang tạo ảnh...');
  const { saved } = await generateImageForScenes(imagePrompts, downloadsDir);

  console.log('🔄 Đã tạo xong!');
}

export default async function main() {
  await makeVideoWithSlideImage({
    downloadsDir: PATHS.DOWNLOADS,
  });
}

main();
