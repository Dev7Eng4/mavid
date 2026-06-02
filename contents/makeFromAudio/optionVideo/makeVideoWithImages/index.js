import fs from 'fs';
import path from 'path';
import { convertTranscript } from './convertTranscript.js';
import { main as createBeats } from './createBeats.js';
import { main as createImagePrompts } from './createImagePrompt.js';
import { main as createSceneSpecs } from './createSceneSpecs.js';
import { main as detechNiche } from './detechNiche.js';
import { main as makeVideo } from './makeVideo.js';
import { main as mappingImages } from './mappingImages.js';
import { DOWNLOADS_DIR } from '../../shared.js';

const JPG_EXT = /\.jpe?g$/i;

/**
 * Lọc ra các imagePrompt chưa có ảnh riêng trong objectImages.
 * Một prompt được coi là thiếu ảnh khi:
 * - Không có file trùng tên (start-end), hoặc
 * - Trùng tên với prompt trước đó (nhiều scene cùng line range chỉ map 1 file).
 * @param {Array<{ name: string, prompt: string }>} imagePrompts
 * @param {Array<{ file: string }>} objectImages
 * @returns {Array<{ name: string, prompt: string }>}
 */
export function filterImagePromptsWithoutFiles(imagePrompts, objectImages) {
  const existingNames = new Set(objectImages.map(item => item.file.replace(JPG_EXT, '')));
  const assignedNames = new Set();

  return imagePrompts.filter(item => {
    if (!existingNames.has(item.name)) return true;
    if (assignedNames.has(item.name)) return true;
    assignedNames.add(item.name);
    return false;
  });
}

export async function makeVideoWithImages(options = {}) {
  const { perVideoDir, originalTitle, audioSpeed: speedIn, downloadsDir = DOWNLOADS_DIR, videoLanguage } = options;
  const transcriptObjects = await convertTranscript(downloadsDir);

  const detectedNiche = await detechNiche(transcriptObjects);
  // fs.writeFileSync('detectedNiche.json', JSON.stringify(detectedNiche, null, 2), 'utf8');

  // const { niche_config, style_config } = resolveProjectConfigs({
  //   nicheId: detectedNiche.niche_config,
  //   styleId: detectedNiche.style_config,
  // });

  const visualBeats = await createBeats(transcriptObjects, detectedNiche.niche_config, detectedNiche.style_config);
  // fs.writeFileSync('visualBeats.json', JSON.stringify(visualBeats, null, 2), 'utf8');

  const sceneSpecs = await createSceneSpecs(visualBeats, detectedNiche.niche_config, detectedNiche.style_config);
  // fs.writeFileSync('sceneSpecs.json', JSON.stringify(sceneSpecs, null, 2), 'utf8');

  const imageScenePrompts = await createImagePrompts(sceneSpecs, detectedNiche.niche_config, detectedNiche.style_config);

  fs.writeFileSync(path.join(downloadsDir, 'imageScenePrompts.json'), JSON.stringify(imageScenePrompts, null, 2), 'utf8');

  // await generateImages(imageScenePrompts, folder);

  const objectImages = await mappingImages(transcriptObjects, folder, 134);

  await makeVideo(objectImages, folder);
}

// makeVideoWithImages();
