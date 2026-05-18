export function validateStep1Output(output) {
  const errors = [];

  if (!output.chunk_id) errors.push('Missing chunk_id');

  if (!output.line_range) errors.push('Missing line_range');

  if (typeof output.line_range.start_line_id !== 'number' || typeof output.line_range.end_line_id !== 'number') {
    errors.push('Invalid line_range');
  }

  if (!output.chunk_summary) {
    errors.push('Missing chunk_summary');
  }

  if (!Array.isArray(output.important_points)) {
    errors.push('important_points must be an array');
  }

  if (!Array.isArray(output.visual_candidates)) {
    errors.push('visual_candidates must be an array');
  }

  if (!output.continuity_context_for_next_chunk) {
    errors.push('Missing continuity_context_for_next_chunk');
  }

  if (!output.quality_check?.line_ids_preserved) {
    errors.push('Line IDs not confirmed as preserved');
  }

  if (!output.quality_check?.no_timestamps_invented) {
    errors.push('AI may have invented timestamps');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Step 1 output: ${errors.join(', ')}`);
  }

  return true;
}
