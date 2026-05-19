export function validateChapterScenePlan(plan, chapterContext) {
  const errors = [];

  if (plan.step !== 'step_4_create_chapter_scenes') {
    errors.push('Invalid step');
  }

  if (plan.chapter_id !== chapterContext.chapter_id) {
    errors.push('chapter_id mismatch');
  }

  if (!Array.isArray(plan.scenes) || plan.scenes.length === 0) {
    errors.push('No scenes returned');
  }

  const chapterStart = chapterContext.line_range.start_line_id;
  const chapterEnd = chapterContext.line_range.end_line_id;

  let previousStart = -Infinity;

  for (const scene of plan.scenes || []) {
    if (!scene.local_scene_id) {
      errors.push('Scene missing local_scene_id');
    }

    if (scene.chapter_id !== chapterContext.chapter_id) {
      errors.push(`${scene.local_scene_id} has wrong chapter_id`);
    }

    if (!scene.line_range) {
      errors.push(`${scene.local_scene_id} missing line_range`);
      continue;
    }

    const { start_line_id, end_line_id } = scene.line_range;

    if (typeof start_line_id !== 'number' || typeof end_line_id !== 'number') {
      errors.push(`${scene.local_scene_id} invalid line_range type`);
      continue;
    }

    if (start_line_id > end_line_id) {
      errors.push(`${scene.local_scene_id} start_line_id > end_line_id`);
    }

    if (start_line_id < chapterStart || end_line_id > chapterEnd) {
      errors.push(`${scene.local_scene_id} line_range outside chapter range`);
    }

    if (start_line_id < previousStart) {
      errors.push(`${scene.local_scene_id} line_range not ordered`);
    }

    previousStart = start_line_id;

    if (!scene.image_prompt) {
      errors.push(`${scene.local_scene_id} missing image_prompt`);
    }

    if (!scene.negative_prompt) {
      errors.push(`${scene.local_scene_id} missing negative_prompt`);
    }

    const promptLower = String(scene.image_prompt || '').toLowerCase();

    if (!promptLower.includes('no text')) {
      errors.push(`${scene.local_scene_id} image_prompt missing "no text"`);
    }

    if (!promptLower.includes('no subtitles')) {
      errors.push(`${scene.local_scene_id} image_prompt missing "no subtitles"`);
    }

    if (!promptLower.includes('no watermark')) {
      errors.push(`${scene.local_scene_id} image_prompt missing "no watermark"`);
    }
  }

  const recommended = chapterContext.recommended_scene_count || 0;
  const actual = plan.scenes?.length || 0;

  if (recommended > 0) {
    const minAcceptable = Math.max(1, recommended - 1);
    const maxAcceptable = recommended + 2;

    if (actual < minAcceptable || actual > maxAcceptable) {
      errors.push(`Scene count unreasonable: recommended=${recommended}, actual=${actual}`);
    }
  }

  if (!plan.quality_check?.ready_for_merge) {
    errors.push('quality_check.ready_for_merge is not true');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid chapter scene plan for ${chapterContext.chapter_id}: ${errors.join(', ')}`);
  }

  return true;
}

export function validateFinalScenePlan(finalScenePlan, chapters) {
  const errors = [];

  if (finalScenePlan.step !== 'step_4_scene_planning') {
    errors.push('Invalid final scene plan step');
  }

  if (!Array.isArray(finalScenePlan.scenes) || finalScenePlan.scenes.length === 0) {
    errors.push('No final scenes');
  }

  const chapterIds = new Set(chapters.map(ch => ch.chapter_id));
  const coveredChapterIds = new Set(finalScenePlan.scenes.map(scene => scene.chapter_id));

  for (const chapterId of chapterIds) {
    if (!coveredChapterIds.has(chapterId)) {
      errors.push(`Chapter ${chapterId} has no scenes`);
    }
  }

  const sortedScenes = [...finalScenePlan.scenes].sort((a, b) => a.global_scene_index - b.global_scene_index);

  for (let i = 0; i < sortedScenes.length; i++) {
    const scene = sortedScenes[i];

    if (!scene.scene_id) {
      errors.push(`Scene at index ${i} missing scene_id`);
    }

    if (!scene.line_range) {
      errors.push(`${scene.scene_id} missing line_range`);
      continue;
    }

    if (!scene.image_prompt) {
      errors.push(`${scene.scene_id} missing image_prompt`);
    }

    if (!scene.negative_prompt) {
      errors.push(`${scene.scene_id} missing negative_prompt`);
    }

    const promptLower = String(scene.image_prompt || '').toLowerCase();

    if (!promptLower.includes('no text')) {
      errors.push(`${scene.scene_id} prompt missing no text`);
    }

    if (!promptLower.includes('no watermark')) {
      errors.push(`${scene.scene_id} prompt missing no watermark`);
    }

    if (i > 0) {
      const prev = sortedScenes[i - 1];

      if (scene.line_range.start_line_id < prev.line_range.start_line_id) {
        errors.push(`${scene.scene_id} starts before previous scene ${prev.scene_id}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid final scene plan: ${errors.join(', ')}`);
  }

  return true;
}
