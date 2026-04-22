/**
 * Gán mốc publish (từ `getYoutubePublishPlan`) cho từng job upload theo độ dài video:
 * video ngắn → suất sáng/chiều; video dài → suất tối (chiều muộn/đêm).
 */
import fs from 'fs';
import { execFileSync } from 'child_process';

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
 * Sáng + chiều: 06:00–17:59. Tối: còn lại (phù hợp video dài).
 * @param {Date} when
 */
function isDaySlotLocal(when) {
  const h = when.getHours();
  return h >= 6 && h < 18;
}

/**
 * Thời lượng .mp4 (giây) — ffprobe.
 * @param {string} mp4Path
 * @returns {number | null}
 */
export function getMp4DurationSeconds(mp4Path) {
  if (!mp4Path || !fs.existsSync(mp4Path)) return null;
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp4Path],
      { encoding: 'utf-8' }
    ).trim();
    const n = parseFloat(out);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Sau khi đã có danh sách job (thứ tự upload) và lịch publish cùng độ dài:
 * hoán vị slot sao cho video ngắn ưu tiên suất ban ngày, video dài ưu tiên suất tối.
 * Nếu không đọc được duration nào hoặc lệch độ dài mảng → trả về `schedule` gốc.
 *
 * @param {Array<{ mp4Path?: string }>} jobs
 * @param {Array<{ date: string, time: string, iso?: string }>} schedule
 * @returns {Array<{ date: string, time: string, iso?: string }>}
 */
export function assignPublishSlotsByVideoDuration(jobs, schedule) {
  if (!Array.isArray(jobs) || !Array.isArray(schedule) || jobs.length !== schedule.length || schedule.length === 0) {
    return schedule;
  }

  const durations = jobs.map(j => getMp4DurationSeconds(j?.mp4Path));
  if (!durations.some(d => d != null)) {
    return schedule;
  }

  const fallback = durations.filter(d => d != null).sort((a, b) => a - b);
  const midFallback = fallback.length ? fallback[Math.floor(fallback.length / 2)] : 0;
  const durResolved = durations.map(d => (d != null ? d : midFallback));

  /** @type {{ idx: number, when: Date, day: boolean }[]} */
  const meta = [];
  for (let i = 0; i < schedule.length; i++) {
    const when = scheduleSlotToLocalDate(schedule[i]);
    if (!when) return schedule;
    meta.push({ idx: i, when, day: isDaySlotLocal(when) });
  }

  const daySlots = meta.filter(m => m.day).sort((a, b) => a.when.getTime() - b.when.getTime());
  const nightSlots = meta.filter(m => !m.day).sort((a, b) => a.when.getTime() - b.when.getTime());

  if (daySlots.length + nightSlots.length !== meta.length) return schedule;

  const n = jobs.length;
  const sortedJobIdx = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const da = durResolved[a];
    const db = durResolved[b];
    if (da !== db) return da - db;
    return a - b;
  });

  const shortestForDay = sortedJobIdx.slice(0, daySlots.length);
  const longestForNight = sortedJobIdx.slice(n - nightSlots.length, n);

  if (new Set([...shortestForDay, ...longestForNight]).size !== n) {
    return schedule;
  }

  /** @type {Array<{ date: string, time: string, iso?: string } | null>} */
  const out = Array(n).fill(null);
  for (let u = 0; u < daySlots.length; u++) {
    const jobIdx = shortestForDay[u];
    out[jobIdx] = schedule[daySlots[u].idx];
  }
  for (let v = 0; v < nightSlots.length; v++) {
    const jobIdx = longestForNight[v];
    out[jobIdx] = schedule[nightSlots[v].idx];
  }

  if (out.some(s => s == null)) return schedule;
  return /** @type {typeof schedule} */ (out);
}

/**
 * Mốc publish muộn nhất (theo thời gian thực) trong danh sách — dùng khi lịch đã bị gán lại theo độ dài video
 * (không còn trùng thứ tự upload A, B, C).
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
