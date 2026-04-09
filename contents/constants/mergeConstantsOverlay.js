/**
 * Gộp overlay JSON lên object base (chỉ các khóa trong exportKeys).
 * Object lồng nhau được merge shallow một cấp: { ...base[key], ...overlay[key] }.
 */
export function mergeConstantsBaseWithUserOverlay(base, overlay, exportKeys) {
  if (!overlay || typeof overlay !== 'object') return base;
  const out = { ...base };
  for (const key of exportKeys) {
    if (!(key in overlay) || overlay[key] === undefined) continue;
    const b = base[key];
    const o = overlay[key];
    if (
      o !== null &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b)
    ) {
      out[key] = { ...b, ...o };
    } else {
      out[key] = o;
    }
  }
  return out;
}
