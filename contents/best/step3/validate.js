export function validateStep3Output(visualPackage) {
  const errors = [];

  if (visualPackage.step !== 'step_3_visual_bible_and_hero_image') {
    errors.push('Invalid step name');
  }

  if (!visualPackage.visual_bible?.overall_visual_concept) {
    errors.push('Missing visual_bible.overall_visual_concept');
  }

  if (!visualPackage.visual_bible?.image_prompt_base) {
    errors.push('Missing visual_bible.image_prompt_base');
  }

  if (!visualPackage.visual_bible?.global_negative_prompt) {
    errors.push('Missing visual_bible.global_negative_prompt');
  }

  if (!visualPackage.selected_hero_moment?.line_range) {
    errors.push('Selected hero moment missing line_range');
  }

  if (!visualPackage.hero_image_package?.thumbnail_hero_image?.image_prompt) {
    errors.push('Missing thumbnail hero image prompt');
  }

  if (!visualPackage.hero_image_package?.video_opening_image?.image_prompt) {
    errors.push('Missing video opening image prompt');
  }

  const imagePrompts = [
    visualPackage.hero_image_package?.thumbnail_hero_image?.image_prompt || '',
    visualPackage.hero_image_package?.video_opening_image?.image_prompt || '',
  ];

  for (const prompt of imagePrompts) {
    const lower = prompt.toLowerCase();

    if (!lower.includes('no text')) {
      errors.push("Image prompt missing 'no text'");
    }

    if (!lower.includes('no watermark')) {
      errors.push("Image prompt missing 'no watermark'");
    }
  }

  if (!visualPackage.visual_consistency_rules) {
    errors.push('Missing visual_consistency_rules');
  }

  if (!visualPackage.global_image_prompt_template?.template) {
    errors.push('Missing global_image_prompt_template.template');
  }

  if (!visualPackage.quality_check?.ready_for_step_4) {
    errors.push('Output not ready for Step 4');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Step 3 visualPackage: ${errors.join(', ')}`);
  }

  return true;
}
