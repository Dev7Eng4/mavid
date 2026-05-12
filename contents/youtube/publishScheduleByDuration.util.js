/**
 * So khớp mốc lịch publish (từ `getYoutubePublishPlan`) với thời gian thực — dùng khi sync sau upload.
 */

/**
 * @param {string} raw
 * @returns {{ h: number, m: number } | null}
 */
function parseHHmm(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const parts = s.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

/**
 * Parse `slot.date` MM/DD/YYYY + `slot.time` HH:mm → Date local.
 * @param {{ date: string, time: string, iso?: string }} slot
 * @returns {Date | null}
 */
export function scheduleSlotToLocalDate(slot) {
  const ds = String(slot?.date ?? '').trim();
  const m = ds.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mo = parseInt(m[1], 10);
  const d = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  const tm = parseHHmm(slot?.time);
  if (!Number.isFinite(mo) || !Number.isFinite(d) || !Number.isFinite(y) || !tm) return null;
  const dt = new Date(y, mo - 1, d, tm.h, tm.m, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

/**
 * Mốc publish muộn nhất trong danh sách thành công — dùng cập nhật `latestUpload*` trong config.
 *
 * @param {Array<{ date?: string, time?: string, iso?: string } | null | undefined>} slots
 * @returns {{ date: string, time: string, iso?: string } | null}
 */
export function pickChronologicallyLatestSlot(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  /** @type {{ date: string, time: string, iso?: string } | null} */
  let best = null;
  let bestMs = -Infinity;
  for (const s of slots) {
    if (!s || typeof s !== 'object') continue;
    const iso = String(s.iso ?? '').trim();
    let ms = NaN;
    if (iso) {
      const d = new Date(iso);
      ms = d.getTime();
    } else {
      const d = scheduleSlotToLocalDate(
        /** @type {{ date: string, time: string }} */ (s)
      );
      ms = d ? d.getTime() : NaN;
    }
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = /** @type {{ date: string, time: string, iso?: string }} */ (s);
    }
  }
  if (!best) return null;
  const dateOk = String(best.date ?? '').trim();
  const timeOk = String(best.time ?? '').trim();
  return dateOk && timeOk ? best : null;
}
