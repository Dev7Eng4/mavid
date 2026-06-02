import fs from 'fs';
import path from 'path';
import { PROFILES_LOGIN } from '../../../constants/playwright-profile.js';
import { createBatchMedia } from '../../../flow/createMediaWithTool.js';

export async function main(imagePrompts, folder) {
  const imagesFolder = path.join(folder, 'images');
  fs.mkdirSync(imagesFolder, { recursive: true });

  const convertedImagePrompts = imagePrompts.map(ip => ({
    name: `${ip.start_line_id}-${ip.end_line_id}`,
    prompt: ip.final_prompt,
  }));

  const totalBatches = PROFILES_LOGIN.length;
  const itemsPerBatch = Math.ceil(convertedImagePrompts.length / totalBatches);

  const batches = Array.from({ length: totalBatches }, (_, i) => convertedImagePrompts.slice(i * itemsPerBatch, (i + 1) * itemsPerBatch));

  const activeConcurrency = Math.min(PROFILES_LOGIN.length, convertedImagePrompts.length);
  let nextBatchIndex = 0;

  async function workerProfile(workerIndex) {
    const profile = PROFILES_LOGIN[workerIndex];

    while (true) {
      const i = nextBatchIndex++;
      if (i >= totalBatches) break;

      const batch = batches[i];
      if (!batch.length) continue;

      const batchIndex = i + 1;
      console.log(`[generate-images] batch ${batchIndex}/${totalBatches} — ${batch.length} ảnh (profile ${profile})`);

      await createBatchMedia({
        prompts: { visuals: batch },
        pathSave: imagesFolder,
        profile,
      });
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));
  console.log('[generate-images] Hoàn tất tất cả batch');
}
