export function validateStep4Output(scenePlan, chapters = []) {
  const errors = [];

  if (scenePlan.step !== 'step_4_scene_planning') {
    errors.push('Invalid step name');
  }

  if (!Array.isArray(scenePlan.scenes) || scenePlan.scenes.length === 0) {
    errors.push('Missing scenes');
  }

  const chapterMap = new Map(chapters.map(ch => [ch.chapter_id, ch]));

  for (const scene of scenePlan.scenes || []) {
    if (!scene.scene_id) {
      errors.push('Scene missing scene_id');
    }

    if (!scene.chapter_id) {
      errors.push(`${scene.scene_id} missing chapter_id`);
    }

    if (!scene.line_range) {
      errors.push(`${scene.scene_id} missing line_range`);
    } else {
      const { start_line_id, end_line_id } = scene.line_range;

      if (typeof start_line_id !== 'number' || typeof end_line_id !== 'number') {
        errors.push(`${scene.scene_id} invalid line_range`);
      }

      if (start_line_id > end_line_id) {
        errors.push(`${scene.scene_id} line_range start > end`);
      }

      const chapter = chapterMap.get(scene.chapter_id);
      if (chapter) {
        if (start_line_id < chapter.line_range.start_line_id || end_line_id > chapter.line_range.end_line_id) {
          errors.push(`${scene.scene_id} line_range outside chapter range`);
        }
      }
    }

    if (!scene.image_prompt) {
      errors.push(`${scene.scene_id} missing image_prompt`);
    }

    if (!scene.negative_prompt) {
      errors.push(`${scene.scene_id} missing negative_prompt`);
    }

    const promptLower = (scene.image_prompt || '').toLowerCase();

    if (!promptLower.includes('no text')) {
      errors.push(`${scene.scene_id} image_prompt missing no text`);
    }

    if (!promptLower.includes('no watermark')) {
      errors.push(`${scene.scene_id} image_prompt missing no watermark`);
    }

    if (!scene.visual_description) {
      errors.push(`${scene.scene_id} missing visual_description`);
    }
  }

  const coveredChapterIds = new Set((scenePlan.scenes || []).map(scene => scene.chapter_id));

  for (const chapter of chapters) {
    if (!coveredChapterIds.has(chapter.chapter_id)) {
      errors.push(`Chapter ${chapter.chapter_id} has no scenes`);
    }
  }

  if (!scenePlan.quality_check?.ready_for_image_generation) {
    errors.push('Output not ready for image generation');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Step 4 scenePlan: ${errors.join(', ')}`);
  }

  return true;
}
