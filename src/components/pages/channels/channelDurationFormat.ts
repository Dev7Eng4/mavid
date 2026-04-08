/**
 * Parse duration từ ô Excel/text: `HH:mm:ss`, `mm:ss`, hoặc số (giây) → tổng giây.
 */
export function parseDurationToSeconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  const parts = s.split(':').map(p => p.trim());
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const sec = parseFloat(parts[2]);
    if (![h, m].every(x => Number.isFinite(x) && x >= 0) || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(h * 3600 + m * 60 + sec);
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (!Number.isFinite(m) || m < 0 || !Number.isFinite(sec) || sec < 0) return null;
    return Math.round(m * 60 + sec);
  }
  return null;
}

/**
 * Chuyển preset giống form thêm kênh (`0_30`, `30_null`, …) → khoảng giây [min, max].
 * `0_null` hoặc không hợp lệ → `null` (không lọc theo preset).
 */
export function durationPresetToSecRange(preset: string): { min: number; max: number } | null {
  const p = String(preset ?? '').trim();
  if (p === '0_null' || p === '') return null;
  const parts = p.split('_');
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  const fromMin = a === 'null' ? 0 : Number(a) * 60;
  const toMax = b === 'null' ? Number.POSITIVE_INFINITY : Number(b) * 60;
  if (!Number.isFinite(fromMin) || fromMin < 0) return null;
  if (b !== 'null' && (!Number.isFinite(toMax) || toMax < 0)) return null;
  return { min: fromMin, max: toMax };
}

/** Hiển thị giây dạng đọc được (có giờ nếu ≥ 1h). */
export function formatSecondsAsDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return '0:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
