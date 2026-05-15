/**
 * Tính lịch publish YouTube Studio từ preset + `publishTimes` trong mavid-channel-config.
 */
import { getChannelConfig } from '../api/channels/getChannelConfig.js';
import { findChannelRowById, pickPublishFieldsFromChannelRow } from '../channel/index.js';

function parseVideosPerDayPreset(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/\u2013/g, '-');
  if (s === '1-2') return '1-2';
  if (s === '1/2' || s === '1/3') return s;
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 24) {
    return String(n);
  }
  return '1';
}

/**
 * Preset `1-2` → 3 ô giờ; `1/2` | `1/3` → 1 ô (một giờ, cách 2 / 3 ngày lịch mỗi video);
 * `"1"`…`"24"` → số suất mỗi ngày.
 * @param {string} preset
 */
function timeSlotCountForPreset(preset) {
  if (preset === '1/2' || preset === '1/3') return 1;
  if (preset === '1-2') return 3;
  return Number(preset);
}

/** @param {string} preset */
function calendarSpacingDaysForPreset(preset) {
  if (preset === '1/2') return 2;
  if (preset === '1/3') return 3;
  return 0;
}

/** @param {Date} a @param {Date} b — local start-of-day */
function diffLocalCalendarDays(a, b) {
  const t0 = startOfLocalDay(a).getTime();
  const t1 = startOfLocalDay(b).getTime();
  return Math.round((t1 - t0) / 86400000);
}

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

/** @param {{ h: number, m: number }} t */
function wallClockToHHmm(t) {
  return `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
}

/**
 * @param {string[]} publishTimes
 * @param {number} slotCount
 */
function normalizePublishTimes(publishTimes, slotCount) {
  const arr = Array.isArray(publishTimes) ? publishTimes.map(t => String(t ?? '').trim()).filter(Boolean) : [];
  const out = [];
  for (let i = 0; i < slotCount; i++) {
    const p = parseHHmm(arr[i] ?? '');
    out.push(p ? wallClockToHHmm(p) : '09:00');
  }
  return out;
}

/** Parse `latestUploadDate` trong config app — vẫn là DD/MM/YYYY (getInfoChannel / index). */
function parseDdMmYyyy(ddmmyyyy) {
  const s = String(ddmmyyyy ?? '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) return null;
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** @param {Date} d */
function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** @param {Date} d */
function addLocalDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** @param {Date} d — local */
function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Các mốc giờ trong một ngày (local), đã sắp xếp tăng dần.
 * Preset `1-2`: ngày thường chỉ suất 0; cuối tuần suất 1 và 2.
 * Preset `1/2`, `1/3`: một suất/ngày (ô 0), khoảng cách ngày do bước `nextPublish…` xử lý.
 * Preset số (`"1"`…`"24"`, không gồm `1-2`): mỗi ngày dùng lần lượt 1…N suất từ `timesHHmm`.
 * @param {Date} calendarDay — bất kỳ mốc trong ngày
 * @param {string} preset — `"1-2"` | `"1/2"` | `"1/3"` | `"1"`…`"24"`
 * @param {string[]} timesHHmm — đã chuẩn hóa đủ số ô theo preset
 */
function slotTimesForCalendarDay(calendarDay, preset, timesHHmm) {
  const dayStart = startOfLocalDay(calendarDay);
  const y = dayStart.getFullYear();
  const mo = dayStart.getMonth();
  const da = dayStart.getDate();

  /** @param {number} idx */
  const atIndex = idx => {
    const p = parseHHmm(timesHHmm[idx] ?? '09:00');
    if (!p) return null;
    return new Date(y, mo, da, p.h, p.m, 0, 0);
  };

  /** @type {Date[]} */
  let slots = [];
  if (preset === '1-2') {
    if (isWeekend(dayStart)) {
      const a = atIndex(1);
      const b = atIndex(2);
      if (a) slots.push(a);
      if (b) slots.push(b);
    } else {
      const a = atIndex(0);
      if (a) slots.push(a);
    }
  } else if (preset === '1' || preset === '1/2' || preset === '1/3') {
    const a = atIndex(0);
    if (a) slots.push(a);
  } else {
    const count = Number(preset);
    if (Number.isFinite(count) && count >= 1 && count <= 24) {
      for (let i = 0; i < count; i++) {
        const t = atIndex(i);
        if (t) slots.push(t);
      }
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}

/**
 * Tìm mốc publish local đầu tiên sau `cursor` (không bao gồm cursor).
 * @param {Date} cursor
 * @param {string} preset
 * @param {string[]} timesHHmm
 */
function nextPublishAfter(cursor, preset, timesHHmm) {
  let day = startOfLocalDay(cursor);
  for (let guard = 0; guard < 800; guard++) {
    const slots = slotTimesForCalendarDay(day, preset, timesHHmm);
    for (const when of slots) {
      if (when.getTime() > cursor.getTime()) return when;
    }
    day = addLocalDays(day, 1);
  }
  throw new Error('Không tìm được suất publish trong phạm vi ~800 ngày.');
}

/**
 * Lần publish tiếp theo: các mốc cách nhau đúng `spacingDays` ngày lịch so với `lastPublishRef`,
 * giờ từ `timesHHmm[0]`, phải sau `notBefore`.
 * @param {Date} lastPublishRef — mốc neo chu kỳ (đỉnh nhảy bội của spacing)
 * @param {number} spacingDays — 2 hoặc 3
 * @param {string[]} timesHHmm
 * @param {Date} notBefore
 */
function nextPublishOnCalendarInterval(lastPublishRef, spacingDays, timesHHmm, notBefore) {
  const slot = parseHHmm(timesHHmm[0] ?? '09:00');
  const sh = slot ? slot.h : 9;
  const sm = slot ? slot.m : 0;
  const refDay = startOfLocalDay(lastPublishRef);
  /** @type {Date} */
  let probeDay = addLocalDays(refDay, spacingDays);

  for (let guard = 0; guard < 800; guard++) {
    const y = probeDay.getFullYear();
    const mo = probeDay.getMonth();
    const da = probeDay.getDate();
    const candidate = new Date(y, mo, da, sh, sm, 0, 0);
    const gap = diffLocalCalendarDays(refDay, probeDay);
    if (gap >= spacingDays && candidate.getTime() > notBefore.getTime()) {
      return candidate;
    }
    probeDay = addLocalDays(probeDay, spacingDays);
  }
  throw new Error('Không tìm được suất publish interval trong phạm vi ~800 bước.');
}

function hasParsableLatestUpload(settings) {
  return !!(parseDdMmYyyy(settings.latestUploadDate) && parseHHmm(settings.latestUploadTime));
}

/**
 * Neo thời gian: sau lần publish ghi trong config (nếu parse được), không nhỏ hơn hiện tại.
 * @param {ReturnType<typeof pickPublishFieldsFromChannelRow>} settings
 */
function scheduleCursorFromSettings(settings) {
  const now = new Date();
  const d = parseDdMmYyyy(settings.latestUploadDate);
  const t = parseHHmm(settings.latestUploadTime);
  if (d && t) {
    const ref = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m, 0, 0);
    return ref.getTime() > now.getTime() ? ref : now;
  }
  return now;
}

/** Ngày-giờ publish cuối ghi trong config (nếu parse được). */
function latestUploadMoment(settings) {
  const d = parseDdMmYyyy(settings.latestUploadDate);
  const t = parseHHmm(settings.latestUploadTime);
  if (!d || !t) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m, 0, 0);
}

/** Chuỗi ngày trong `schedule[].date` — MM/DD/YYYY (khớp nhập liệu kiểu Mỹ / YouTube Studio). */
function toMmDdYyyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Đọc `mavid-channel-config.json`, chọn `channels[]` theo `id`, trả về các trường lịch
 * và danh sách ngày/giờ public dự kiến cho `uploadCount` video (theo preset + publishTimes).
 *
 * @param {object} params
 * @param {string} params.channelFolder — tên thư mục kênh (channel id)
 * @param {string} params.id
 * @param {number} params.uploadCount — số video cần mốc publish
 * @returns {{
 *   settings: ReturnType<typeof pickPublishFieldsFromChannelRow> & { preset: string, publishTimesNormalized: string[] },
 *   schedule: Array<{ date: string, time: string, iso: string }> — `date` dạng MM/DD/YYYY
 * }}
 */
export async function getYoutubePublishPlan({ channelFolder, id, uploadCount }) {
  const n = Number(uploadCount);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error('uploadCount phải là số nguyên ≥ 0.');
  }

  const config = await getChannelConfig(channelFolder);
  const row = findChannelRowById(config, id);
  if (!row) throw new Error(`Không tìm thấy id «${String(id).trim()}» trong mavid-channel-config.json.`);

  const base = pickPublishFieldsFromChannelRow(row);
  const preset = parseVideosPerDayPreset(base.videosPerDayPreset);
  const slotCount = timeSlotCountForPreset(preset);
  const publishTimesNormalized = normalizePublishTimes(base.publishTimes, slotCount);

  const settings = {
    ...base,
    preset,
    publishTimesNormalized,
  };

  /** @type {Array<{ date: string, time: string, iso: string }>} */
  const schedule = [];
  if (n === 0) return { settings, schedule };

  let cursor = scheduleCursorFromSettings(base);
  const timesForAlgo = publishTimesNormalized;
  const spacing = calendarSpacingDaysForPreset(preset);
  /** Neo chu kỳ config (latestUpload*) hoặc suất đã tính; `null` = chưa có anchor từ config. */
  let intervalRef = spacing > 0 && hasParsableLatestUpload(base) ? latestUploadMoment(base) : null;

  for (let i = 0; i < n; i++) {
    let when;
    if (spacing > 0) {
      /**
       * Không có `latestUpload*` → suất đầu giống preset `1` (không chờ thêm spacing từ "hôm nay");
       * có anchor → các mốc cách nhau bội số của `spacing` ngày lịch.
       */
      if (i === 0 && !intervalRef) {
        when = nextPublishAfter(cursor, '1', timesForAlgo);
      } else {
        const refAnchor = intervalRef ?? cursor;
        when = nextPublishOnCalendarInterval(refAnchor, spacing, timesForAlgo, cursor);
      }
    } else {
      when = nextPublishAfter(cursor, preset, timesForAlgo);
    }
    intervalRef = when;
    const hh = when.getHours();
    const mm = when.getMinutes();
    const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    schedule.push({
      date: toMmDdYyyy(when),
      time,
      iso: when.toISOString(),
    });
    cursor = when;
  }

  return { settings, schedule };
}
