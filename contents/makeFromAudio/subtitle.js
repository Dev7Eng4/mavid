/**
 * Xử lý phụ đề: scale SRT timestamps, chuyển SRT → ASS, cấu hình style.
 * Tách riêng để dễ maintain — dùng chung cho tất cả options tạo video.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STOCK_VIDEO, SUBTITLE } from '../constants/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

// ==========================================
// THIẾT LẬP PHỤ ĐỀ (Dễ dàng thay đổi)
// ==========================================
export const CUSTOM_SUBTITLE_FONT_SIZE = 90; // Giảm để hiển thị ~20 ký tự CJK/dòng (90 → 13 ký tự, 58 → 20 ký tự)
export const CUSTOM_SUBTITLE_LINE_GAP_PX = 0; // Khoảng cách pixel cộng thêm giữa các dòng (0 là mặc định sát nhau)
export const CUSTOM_SUBTITLE_PADDING_HORIZONTAL = 0; // Khoảng cách pixel từ text ra mép trái/phải video
/** Khoảng cách từ cạnh dưới khung hình tới đáy hộp phụ đề (và vùng chữ). */
export const SUBTITLE_MARGIN_BOTTOM_PX = 40;
// ==========================================

export const SUBTITLE_FONT_FILE = path.join(ROOT, 'assets', 'fonts', 'NotoSansJP-Black.ttf');
export const SUBTITLE_FONT_DIR = path.join(ROOT, 'assets', 'fonts');
/** Face name trong TTF — khớp NotoSansJP-Black.ttf (libass + ffmpeg `fontsdir`). */
export const SUBTITLE_FONT_ASS_NAME = 'Noto Sans JP Black';

const SUBTITLE_OPTIONS = {
  jaWhite: {
    style: (outlinePx, shadowPx) =>
      `Style: Default,Noto Sans JP Black,${CUSTOM_SUBTITLE_FONT_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,${SUBTITLE.CHAR_SPACING},0,1,${outlinePx},${shadowPx},2,${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},0,1\r`,
    events: (start, end, eventMarginV, baseText) => `Dialogue: 0,${start},${end},Default,,0,0,${eventMarginV},,${baseText}\n`,
  },
  jaCyan: {
    style: (outlinePx, shadowPx) =>
      `Style: Default,Noto Sans JP Black,${CUSTOM_SUBTITLE_FONT_SIZE},&H00FFF0B4,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,${SUBTITLE.CHAR_SPACING},0,1,${outlinePx},${shadowPx},2,${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},0,1\r`,
    events: (start, end, eventMarginV, baseText) => `Dialogue: 0,${start},${end},Default,,0,0,${eventMarginV},,${baseText}\n`,
  },
  jaTextWhiteBlueShadow: {
    style: (glowPx, outlinePx, shadowPx) =>
      `Style: Glow,Noto Sans JP Black,${CUSTOM_SUBTITLE_FONT_SIZE},&H00C8FF00,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,${SUBTITLE.CHAR_SPACING},0,1,${glowPx},0,2,${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},0,1\r
   Style: Default,Noto Sans JP Black,${CUSTOM_SUBTITLE_FONT_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,${SUBTITLE.CHAR_SPACING},0,1,${outlinePx},0,2,${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},0,1\r`,
    events: (
      start,
      end,
      eventMarginV,
      baseText,
    ) => `Dialogue: 0,${start},${end},Glow,,0,0,${eventMarginV},,{\\blur10}${baseText}\nDialogue: 1,${start},${end},Default,,0,0,${eventMarginV},,${baseText}\n
   `,
  },
};

// ==========================================
// SRT TIME HELPERS
// ==========================================

/** Parse SRT time "HH:MM:SS,mmm" → tổng milliseconds */
export function srtTimeToMs(h, m, s, ms) {
  return Number.parseInt(h) * 3600000 + Number.parseInt(m) * 60000 + Number.parseInt(s) * 1000 + Number.parseInt(ms);
}

/** milliseconds → "HH:MM:SS,mmm" */
export function msToSrtTime(totalMs) {
  const ms = Math.round(totalMs);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msPart = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msPart).padStart(3, '0')}`;
}

// ==========================================
// SCALE SRT TIMESTAMPS
// ==========================================

/**
 * Scale timestamps trong file SRT theo hệ số speed.
 * Khi SPEED < 1 (chậm hơn), audio dài hơn → timestamps phải giãn ra (nhân 1/speed).
 * Khi SPEED > 1 (nhanh hơn), audio ngắn hơn → timestamps phải co lại (nhân 1/speed).
 * @param {string} srtPath - File SRT gốc
 * @param {string} outputSrtPath - File SRT đã scale
 * @param {number} speed - Tốc độ (vd: 0.91)
 */
export function scaleSrtTimestamps(srtPath, outputSrtPath, speed) {
  const content = fs.readFileSync(srtPath, 'utf8').replace(/\r/g, '');
  // Hệ số scale: duration_new = duration_old / speed
  // → timestamp_new = timestamp_old / speed
  const factor = 1 / speed;

  const timeRe = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/g;
  const scaled = content.replaceAll(timeRe, (match, h1, m1, s1, ms1, h2, m2, s2, ms2) => {
    const startMs = srtTimeToMs(h1, m1, s1, ms1) * factor;
    const endMs = srtTimeToMs(h2, m2, s2, ms2) * factor;
    return `${msToSrtTime(startMs)} --> ${msToSrtTime(endMs)}`;
  });

  fs.writeFileSync(outputSrtPath, scaled, 'utf-8');
  console.log(`Đã scale SRT timestamps (factor=${factor.toFixed(4)}, speed=${speed}): ${path.basename(outputSrtPath)}`);
}

// ==========================================
// ESCAPE PATH FOR FFMPEG SUBTITLES
// ==========================================

/** Đường dẫn cho filter ffmpeg `subtitles=` (Windows drive, dấu nháy). */
export function escapePathForFfmpegSubtitles(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
}

// ==========================================
// JAPANESE SUBTITLE STYLE
// ==========================================

/**
 * Phụ đề kiểu Nhật: không hộp nền, chữ cyan/viền đen dày. Ưu tiên `videoLanguage`; không có thì nhận diện `.ja.srt` / `.ja.vtt`.
 * @param {string|null} subtitlePath
 * @param {string} [videoLanguage] - vd. `ja`, `ko` (từ transcript / cấu hình)
 */
export function resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage) {
  const raw = videoLanguage != null && String(videoLanguage).trim() ? String(videoLanguage).trim().toLowerCase() : '';
  if (raw === 'ja' || raw === 'jp') return true;
  if (raw && raw !== 'ja' && raw !== 'jp') return false;
  if (!subtitlePath) return false;
  return /\.ja\.(srt|vtt)$/i.test(path.basename(subtitlePath));
}

// ==========================================
// CONVERT SRT → ASS
// ==========================================

/**
 * Chuyển SRT sang định dạng file ASS với cấu hình Style: Box nền Mờ, dễ đọc (mặc định); JA: chữ cyan nhạt + viền đen dày (không dùng drawbox — bỏ ở bước ffmpeg).
 * @param {string} srtPath - Đường dẫn file SRT đầu vào
 * @param {string} assPath - Nơi lưu file ASS đầu ra
 * @param {boolean} [japaneseStyle=false]
 */
export function convertSrtToAss(srtPath, assPath, japaneseStyle = false) {
  const content = fs.readFileSync(srtPath, 'utf8').replace(/\r/g, '');
  const cues = content.split(/\n\n+/).filter(Boolean);

  const fontName = fs.existsSync(SUBTITLE_FONT_FILE) ? SUBTITLE_FONT_ASS_NAME : 'Arial';
  const outlinePx = japaneseStyle ? 8.5 : +(CUSTOM_SUBTITLE_FONT_SIZE * 0.06).toFixed(2);

  // option 1 -> text white
  const glowPx = outlinePx + 8; // Độ dày cho lớp glow phía dưới viền đen
  /** ASS &HAABBGGRR */
  // const primaryColour = '&H00FFFFFF'; // Màu trắng
  // const secondaryColour = '&H000000FF';
  // const outlineColour = '&H00000000'; // Stroke đen
  const glowColour = '&H00C8FF00'; // Bóng xanh ngọc phát sáng #00FFC8

  // option 2 -> text cyan
  /** Viền đen: JA dày hơn; các ngôn ngữ khác ~6% cỡ chữ */
  const shadowPx = japaneseStyle ? 0.5 : 1.5;
  /** ASS &HAABBGGRR — cyan / xanh ngọc nhạt (RGB ~180,240,255) */
  const primaryColour = japaneseStyle ? '&H00FFF0B4' : '&H00FFFFFF';
  const secondaryColour = '&H000000FF';
  const outlineColour = '&H00000000';
  const backColour = '&H00000000';

  // H_box bằng 1/3 chiều cao video
  const subtitleBoxHeight = Math.floor(STOCK_VIDEO.CANVAS_H / 3);

  // Tâm Y của hộp phụ đề — dùng để tính MarginV cho từng dialogue event
  const boxMidY = Math.round(STOCK_VIDEO.CANVAS_H - SUBTITLE_MARGIN_BOTTOM_PX - subtitleBoxHeight / 2);

  // Alignment=2 (bottom-center): MarginL/MarginR thực sự kiểm soát khoảng cách trái/phải;
  // MarginV trong Style = 0 vì sẽ override per-event để căn giữa dọc trong hộp subtitle.
  const header = `[Script Info]\r
ScriptType: v4.00+\r
PlayResX: ${STOCK_VIDEO.CANVAS_W}\r
PlayResY: ${STOCK_VIDEO.CANVAS_H}\r
WrapStyle: 1\r
\r
[V4+ Styles]\r
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\r
${SUBTITLE_OPTIONS.jaWhite.style(outlinePx, shadowPx)}
\r
[Events]\r
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\r
`;

  // Style: Default,${fontName},${CUSTOM_SUBTITLE_FONT_SIZE},${primaryColour},${secondaryColour},${outlineColour},${backColour},-1,0,0,0,100,100,${SUBTITLE.CHAR_SPACING},0,1,${outlinePx},${shadowPx},2,${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},0,1\r
  let events = '';
  for (const cue of cues) {
    const lines = cue
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    const timeRe = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) \-\-\> (\d{2}):(\d{2}):(\d{2}),(\d{3})/;
    let timeLineIdx = -1;
    let match = null;

    for (let i = 0; i < lines.length; i++) {
      match = lines[i].match(timeRe);
      if (match) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1 || !match) continue;

    // ASS time format: H:MM:SS.cs (cents của giây) thay vì HH:MM:SS,ms
    const formatTime = (h, m, s, ms) => {
      const cs = Math.floor(parseInt(ms) / 10)
        .toString()
        .padStart(2, '0');
      return `${parseInt(h)}:${m}:${s}.${cs}`;
    };

    const start = formatTime(match[1], match[2], match[3], match[4]);
    const end = formatTime(match[5], match[6], match[7], match[8]);

    const textLines = lines.slice(timeLineIdx + 1);

    // Tính toán số lượng kí tự tối đa trên 1 dòng để tự động quấn dòng (Word Wrap Programmatic cho chữ CJK)
    const cw = STOCK_VIDEO.CANVAS_W - CUSTOM_SUBTITLE_PADDING_HORIZONTAL * 2;
    const cSize = CUSTOM_SUBTITLE_FONT_SIZE - SUBTITLE.CHAR_SPACING * 5;
    const maxCharsPerLine = Math.max(1, Math.floor(cw / cSize));

    const wrappedLines = [];
    for (const rawLine of textLines) {
      let currentLine = '';
      // dùng Array.from để tách an toàn cả unicode emoji nếu có
      for (const char of Array.from(rawLine)) {
        if (currentLine.length >= maxCharsPerLine) {
          wrappedLines.push(currentLine);
          currentLine = '';
        }
        currentLine += char;
      }
      if (currentLine) wrappedLines.push(currentLine);
    }

    // Line spacing giả lập bằng việc chèn 1 dòng trống cực nhỏ giữa 2 dòng thực tế
    const extraGapPx = CUSTOM_SUBTITLE_LINE_GAP_PX;
    const lineBreakStr = extraGapPx > 0 ? `\\N{\\fs${extraGapPx}}\\h\\N{\\fs${CUSTOM_SUBTITLE_FONT_SIZE}}` : '\\N';

    const baseText = wrappedLines.join(lineBreakStr);

    // Tính MarginV per-event để căn giữa dọc trong hộp subtitle (Alignment=2: đáy text = CANVAS_H - marginV)
    const numLines = wrappedLines.length;
    const totalTextH = numLines * CUSTOM_SUBTITLE_FONT_SIZE + Math.max(0, numLines - 1) * CUSTOM_SUBTITLE_LINE_GAP_PX;
    // textBottom = boxMidY + totalTextH/2; marginV = CANVAS_H - textBottom
    const eventMarginV = Math.max(0, Math.round(STOCK_VIDEO.CANVAS_H - boxMidY - totalTextH / 2));

    // option 1
    // events += `Dialogue: 0,${start},${end},Default,,0,0,${eventMarginV},,${baseText}\n`;
    events += SUBTITLE_OPTIONS.jaWhite.events(start, end, eventMarginV, baseText);

    // option 2
    // Lớp 0: Dùng Style Glow kết hợp tag \blur để làm nhoè tạo hiệu ứng phát sáng mềm
    // events += `Dialogue: 0,${start},${end},Glow,,0,0,${eventMarginV},,{\\blur10}${baseText}\n`;
    // Lớp 1: Chữ trắng viền đen sắc nét đè lên trên
    // events += `Dialogue: 1,${start},${end},Default,,0,0,${eventMarginV},,${baseText}\n`;
  }

  fs.writeFileSync(assPath, header + events, 'utf-8');
}
