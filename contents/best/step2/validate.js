export function validateStep2Output(finalAnalysis) {
  const errors = [];

  if (finalAnalysis.step !== 'step_2_final_content_analysis') {
    errors.push('Invalid step name');
  }

  if (!finalAnalysis.final_summary?.overview) {
    errors.push('Missing final_summary.overview');
  }

  if (!Array.isArray(finalAnalysis.chapters) || finalAnalysis.chapters.length === 0) {
    errors.push('Missing chapters');
  }

  for (const chapter of finalAnalysis.chapters || []) {
    if (!chapter.line_range) {
      errors.push(`Chapter ${chapter.chapter_id} missing line_range`);
    }

    if (typeof chapter.line_range.start_line_id !== 'number' || typeof chapter.line_range.end_line_id !== 'number') {
      errors.push(`Chapter ${chapter.chapter_id} has invalid line_range`);
    }

    if (!chapter.chapter_title_ja) {
      errors.push(`Chapter ${chapter.chapter_id} missing Japanese title`);
    }
  }

  if (!finalAnalysis.youtube_metadata?.recommended_title) {
    errors.push('Missing youtube_metadata.recommended_title');
  }

  if (!Array.isArray(finalAnalysis.hero_moment_candidates)) {
    errors.push('hero_moment_candidates must be an array');
  }

  for (const hero of finalAnalysis.hero_moment_candidates || []) {
    if (!hero.line_range) {
      errors.push(`Hero moment rank ${hero.rank} missing line_range`);
    }
  }

  if (!finalAnalysis.visual_direction_brief?.overall_visual_concept) {
    errors.push('Missing visual_direction_brief.overall_visual_concept');
  }

  if (!finalAnalysis.quality_check?.line_ids_preserved) {
    errors.push('Line IDs not preserved');
  }

  if (!finalAnalysis.quality_check?.no_timestamps_invented) {
    errors.push('Timestamps may have been invented');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Step 2 finalAnalysis: ${errors.join(', ')}`);
  }

  return true;
}
