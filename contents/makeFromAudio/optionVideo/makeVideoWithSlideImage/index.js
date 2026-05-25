import fs from 'fs';

import path from 'path';

import { PATHS } from '../../../constants/paths.js';

import { generateImageForScenes } from './generateImageForScenes.js';

import { DOWNLOADS_DIR, resolveAudioSpeed } from '../../shared.js';

import { assembleSlideVideo } from './assembleSlideVideo.js';

import { createImagePromptsFromScenes } from './createPromptImageForScene.js';

import { createSceneSpecsFromBeats } from './createScenesFromBeat.js';

import { createVisualBeats, saveJsonFile } from './createVisualBeat.js';

export async function makeVideoWithSlideImage(options = {}) {
  const { perVideoDir, originalTitle, audioSpeed: speedIn, logoPath: logoPathOpt, downloadsDir = DOWNLOADS_DIR, videoLanguage } = options;

  const speed = resolveAudioSpeed({ audioSpeed: speedIn });

  console.log('🔄 Đang tạo visual beats...');

  const { transcriptObjects, segmentResults } = await createVisualBeats({ downloadsDir });

  console.log('🔄 Đang tạo scene specs...');

  const { manifestPath, scenes } = await createSceneSpecsFromBeats(segmentResults);

  console.log('🔄 Đang tạo image prompts...');

  const { imagePrompts } = await createImagePromptsFromScenes(scenes);

  saveJsonFile(path.join(downloadsDir, 'scene-prompts.json'), {
    scenes,
    imagePrompts,
  });

  const imagesDir = path.join(downloadsDir, 'images');

  fs.mkdirSync(imagesDir, { recursive: true });

  console.log('🔄 Đang tạo ảnh...');

  await generateImageForScenes(imagePrompts, imagesDir);

  console.log('🔄 Đang ghép video slide...');

  const { outputPath } = await assembleSlideVideo({
    transcriptObjects,

    imagesDir,

    downloadsDir,

    audioSpeed: speed,

    perVideoDir,

    originalTitle,

    logoPath: logoPathOpt,

    videoLanguage,
  });

  console.log(`🔄 Đã tạo xong: ${outputPath}`);

  return { outputPath };
}

// export default async function main() {

//   await makeVideoWithSlideImage({

//     downloadsDir: PATHS.DOWNLOADS,

//   });

// }

// main();
