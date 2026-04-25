/**
 * Tạo video từ audio + video stock
 * - Audio từ folder downloads
 * - N video stock từ MaVidMedia/backgrounds/<tên> (VIDEO_STORAGE_ROOT trong settings; N = STOCK_VIDEO_COUNT, cat, dog, ...)
 * - Bước 1: chỉnh tempo audio (ffmpeg atempo; nhỏ hơn 1 = chậm hơn → thời lượng dài hơn)
 * - Độ dài video = độ dài audio (sau khi chỉnh tốc độ), loop video nếu không đủ
 * - (Tuỳ chọn) Lớp video overlay từ `MaVidMedia/backgrounds/overlay/`: 1 file (tên sắp A–Z), chậm ×3 (setpts×3), zoom ~20% (scale 1.2, crop 1280×720 — cạnh dưới), opacity 80%, lặp vô hạn; ưu tiên pre-bake 1 vòng tới `overlay/.cache` rồi trộn
 * - (Tuỳ chọn) Video “bar chart” từ `assets/chart/`: 1 file (A–Z), scale góc phải trên (`main_w-overlay_w-m`), `stream_loop` theo hết thời lượng; vẽ trước layer logo nếu có (logo vẫn nằm trên cùng)
 * - Phụ đề: copy file .srt/.vtt từ downloads/ — nếu SPEED ≠ 1 sẽ tự động scale timestamps; ASS dùng NotoSansJP-Black (viền ~6% cỡ chữ + bóng nhẹ)
 * - Ghép stock: crossfade (xfade) giữa các clip — clip cũ mờ dần, clip mới sáng dần; encode nền stock dùng cùng encoder với bước merge (NVENC/AMF/QSV/libx264 theo hardware.util)
 * - Chỉ batch: đọc CSV/Excel, tải từng link rồi xử lý
 * - `main({ stockFolder, stockVideoCount, audioSpeed, showLogo, channel })` — xem JSDoc `main`
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { MAKE_VIDEO_MODE, STOCK_VIDEO, SUBTITLE, LOGO } from './constants/index.js';
import { resolveStockBackgroundsDir } from './utils/stockBackgroundsPath.js';
import { resolveChannelsDir } from './utils/channelsStoragePath.js';
import { convertAudioFile } from './convertAudio.js';
import { GPU_INFO } from './utils/hardware.util.js';
import { unlinkProgressSidecarForSpreadsheet } from './syncProgressToSpreadsheet.js';

const DEFAULT_STOCK_FOLDER = 'nature';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOWNLOADS_DIR = path.join(ROOT, 'downloads');
const OUTPUT_DIR = path.join(ROOT, 'outputs');
const ASSET_CHART_DIR = path.join(ROOT, 'assets', 'chart');
const SUBTITLE_FONT_FILE = path.join(ROOT, 'assets', 'fonts', 'NotoSansJP-Black.ttf');
const SUBTITLE_FONT_DIR = path.join(ROOT, 'assets', 'fonts');
// ==========================================
// THIẾT LẬP PHỤ ĐỀ (Dễ dàng thay đổi)
// ==========================================
const CUSTOM_SUBTITLE_FONT_SIZE = 90; // Giảm để hiển thị ~20 ký tự CJK/dòng (90 → 13 ký tự, 58 → 20 ký tự)
const CUSTOM_SUBTITLE_LINE_GAP_PX = 0; // Khoảng cách pixel cộng thêm giữa các dòng (0 là mặc định sát nhau)
const CUSTOM_SUBTITLE_PADDING_HORIZONTAL = 0; // Khoảng cách pixel từ text ra mép trái/phải video
/** Khoảng cách từ cạnh dưới khung hình tới đáy hộp phụ đề (và vùng chữ). */
const SUBTITLE_MARGIN_BOTTOM_PX = 40;
// ==========================================
const STOCK_VIDEO_HFLIP_PROBABILITY = 0.3;

/** Tên thư mục con cạnh `backgrounds/<stock>/`: `backgrounds/overlay/`. Nếu có file video, trộn lên nền stock. */
const STOCK_OVERLAY_DIR = 'overlay';
/** Nhân `PTS` (3 = một lần phát gấp 3 thời lượng, tốc độ ~1/3). */
const STOCK_OVERLAY_PTS_MULT = 3;
/** Scale 1.2 (≈ zoom 20%) rồi `crop` về `CANVAS` — cạnh dưới lớp cắt trùng đáy nguồn (lấy vùng phía dưới). */
const STOCK_OVERLAY_ZOOM = 1.2;
const STOCK_OVERLAY_OPACITY = 0.8;
/** Rộng tối đa (px) khi thu chart đặt góc phải trên. */
const CHART_CORNER_MAX_WIDTH = 400;
const CHART_MARGIN_TOP = 20;
const CHART_MARGIN_RIGHT = 20;

/** Face name trong TTF — khớp NotoSansJP-Black.ttf (libass + ffmpeg `fontsdir`). */
const SUBTITLE_FONT_ASS_NAME = 'Noto Sans JP Black';

/** Tốc độ phát audio (atempo): mỗi lần render chọn ngẫu nhiên trong khoảng này */
const SPEED_MIN = 0.91;
const SPEED_MAX = 0.95;

/** @returns {number} Giá trị trong [SPEED_MIN, SPEED_MAX) */
export function randomPlaybackSpeed() {
  return SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
}

/**
 * Ưu tiên: `options.audioSpeed` → `randomPlaybackSpeed()`.
 * @param {object} [options]
 * @param {number} [options.audioSpeed]
 */
export function resolveAudioSpeed(options = {}) {
  const o = options.audioSpeed;
  if (o != null && Number.isFinite(Number(o)) && Number(o) > 0) return Number(o);
  return randomPlaybackSpeed();
}

/** Một lần lấy mẫu khi load module (tương thích import cũ). */
export const SPEED = randomPlaybackSpeed();

/**
 * Chuỗi filter: scale/pad, yuv420p, CFR, settb — dùng cho -vf và cho từng nhánh trước xfade
 */
function stockNormalizeFilterInner(slowmoFactor, isFlip = false) {
  const { CANVAS_W: w, CANVAS_H: h, FPS: f, SLOWMO_FACTOR } = STOCK_VIDEO;
  const factor = slowmoFactor ?? SLOWMO_FACTOR;
  const slowmo = factor !== 1.0 ? `,setpts=${factor.toFixed(4)}*PTS` : '';
  const flipFilter = isFlip ? ',hflip' : '';
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p${flipFilter}${slowmo},fps=${f},settb=tb=1/90000,setsar=1`;
}

function stockNormalizeFilterChain(inputLabel, outLabel, slowmoFactor, isFlip = false) {
  return `[${inputLabel}]${stockNormalizeFilterInner(slowmoFactor, isFlip)}[${outLabel}]`;
}

/**
 * SPEED được dùng làm hệ số atempo cho audio.
 * Nhỏ hơn 1 = đọc chậm hơn → thời lượng dài hơn.
 * Ví dụ 0.94 → ~6.4% dài hơn.
 * Khi SPEED ≠ 1, timestamps trong SRT cũng được scale theo.
 */

function getImageFilesFromDir(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map(f => path.join(dir, f));
}

/**
 * Video overlay trong `backgrounds/overlay/` (không quét sâu thư mục con, trừ tệp ở gốc).
 * @param {string} overlayDir
 * @returns {string[]}
 */
function getOverlayVideoFiles(overlayDir) {
  if (!overlayDir || !fs.existsSync(overlayDir)) return [];
  return fs
    .readdirSync(overlayDir)
    .filter(f => /\.(mp4|mov|mkv|webm)$/i.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b))
    .map(f => path.join(overlayDir, f));
}

/** File đầu tiên (A–Z) hoặc `null` */
function pickFirstOverlayVideo(overlayDir) {
  const v = getOverlayVideoFiles(overlayDir);
  return v[0] || null;
}

/**
 * Cùng quy tắc lọc video như `getOverlayVideoFiles`, từ `assets/chart/`.
 * @param {string} [dir=ASSET_CHART_DIR]
 * @returns {string[]}
 */
function getChartVideoFiles(dir = ASSET_CHART_DIR) {
  return getOverlayVideoFiles(dir);
}

/** File đầu tiên trong `assets/chart` hoặc `null` */
function pickFirstChartVideo() {
  const v = getChartVideoFiles(ASSET_CHART_DIR);
  return v[0] || null;
}

/**
 * Sau `setpts`, scale → crop `CANVAS_W×H`: canh ngang giữa, cạnh dưới khung lấy từ đáy nguồn (`y=ih-oh`).
 * @returns {string} Chuỗi bộ lọc (dùng nối sau dấu phẩy, không bắt đầu bằng `,`)
 */
function stockOverlayScaleCropAlphaSubchain() {
  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const z = STOCK_OVERLAY_ZOOM;
  const a = STOCK_OVERLAY_OPACITY;
  return `scale=w='iw*${z}':h='ih*${z}',crop=${w}:${h}:(iw-ow)/2:ih-oh,format=yuva420p,colorchannelmixer=aa=${a}`;
}

/**
 * Một lần xử lý: setpts×N, zoom + crop từ đáy, alpha — ProRes 4444 yuva (giống mẫu `makeVideoFromFull`).
 * @param {string} sourcePath
 * @param {string} cacheDir
 * @returns {Promise<string|null>} Đường dẫn file cache hoặc `null` nếu thất bại
 */
async function getPrebakedStockOverlayVideo(sourcePath, cacheDir) {
  const w = STOCK_VIDEO.CANVAS_W;
  const h = STOCK_VIDEO.CANVAS_H;
  const st = fs.statSync(sourcePath);
  const zTag = Math.round(STOCK_OVERLAY_ZOOM * 100);
  const aTag = Math.round(STOCK_OVERLAY_OPACITY * 100);
  const cacheKey = `ov_${path.parse(sourcePath).name}_${w}x${h}_s${STOCK_OVERLAY_PTS_MULT}_z${zTag}_a${aTag}_bot_${st.mtimeMs}.mov`;
  const cachePath = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cachePath)) {
    console.log(`[overlay] Dùng cache: ${path.basename(cachePath)}`);
    return cachePath;
  }
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const vf = `setpts=${STOCK_OVERLAY_PTS_MULT}*PTS,${stockOverlayScaleCropAlphaSubchain()}`;
  const cmd = `ffmpeg -hide_banner -loglevel error -y -i "${sourcePath}" -vf "${vf}" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${cachePath}"`;
  try {
    await execAsync(cmd, { maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    console.warn('[overlay] Pre-cache thất bại, dùng bước trộn single-pass với bản gốc:', e.message);
    return null;
  }
  console.log(`[overlay] Đã tạo cache: ${path.basename(cachePath)}`);
  return cachePath;
}

/** Cache kết quả ffprobe (theo mtime+size) để tránh spawn lặp khi lập kế hoạch nhiều clip stock */
const mediaDurationCache = new Map();

/**
 * Lấy duration (giây) của file media bằng ffprobe
 */
async function getDuration(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return 0;
  const st = fs.statSync(filePath);
  const cacheKey = `fmt:${filePath}:${st.mtimeMs}:${st.size}`;
  if (mediaDurationCache.has(cacheKey)) return mediaDurationCache.get(cacheKey);

  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  try {
    const { stdout } = await execAsync(cmd);
    const dur = parseFloat(stdout.trim()) || 0;
    mediaDurationCache.set(cacheKey, dur);
    return dur;
  } catch (err) {
    console.warn('ffprobe error:', err.message);
    return 0;
  }
}

/**
 * Độ dài luồng audio (giây) — ưu tiên stream a:0, fallback format.duration.
 */
async function getAudioDurationSeconds(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return 0;
  const st = fs.statSync(filePath);
  const cacheKey = `a0:${filePath}:${st.mtimeMs}:${st.size}`;
  if (mediaDurationCache.has(cacheKey)) return mediaDurationCache.get(cacheKey);

  const streamCmd = `ffprobe -v error -select_streams a:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  try {
    const { stdout } = await execAsync(streamCmd);
    const streamDur = parseFloat(stdout.trim());
    if (Number.isFinite(streamDur) && streamDur > 0) {
      mediaDurationCache.set(cacheKey, streamDur);
      return streamDur;
    }
  } catch (err) {
    // fallback
  }
  const fallback = await getDuration(filePath);
  mediaDurationCache.set(cacheKey, fallback);
  return fallback;
}

/** Hiển thị m:ss (vd 13:08) — dùng log so sánh thời lượng */
function formatClockDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '?';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Loại bỏ các ký tự không hợp lệ cho tên file
 */
function sanitizeFilename(name) {
  if (!name) return '';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

/**
 * Lấy file audio đầu tiên từ downloads
 */
function getAudioFile(dir = DOWNLOADS_DIR) {
  const files = fs.readdirSync(dir).filter(f => /\.(mp3|m4a|wav|aac)$/i.test(f));
  if (files.length === 0) throw new Error('Không tìm thấy file audio trong downloads/');
  return path.join(dir, files[0]);
}

/**
 * Tìm file phụ đề trong downloads: bất kỳ .srt hoặc .vtt nào (không dùng `*.srt.cleaned` — bản lưu trước Gemini).
 * Có nhiều file cùng loại → chọn tên sắp xếp alphabet; có cả .srt và .vtt → ưu tiên .srt.
 */
function getSubtitleFile(dir = DOWNLOADS_DIR) {
  if (!fs.existsSync(dir)) return null;
  const names = fs.readdirSync(dir);
  const srts = names.filter(f => /\.srt$/i.test(f)).sort((a, b) => a.localeCompare(b));
  const vtts = names.filter(f => /\.vtt$/i.test(f)).sort((a, b) => a.localeCompare(b));
  const pick = srts[0] || vtts[0];
  return pick ? path.join(dir, pick) : null;
}

/**
 * Thư mục `downloads/job_<timestamp>_*` có mtime mới nhất (batch download), hoặc null.
 */
function getLatestJobDownloadsDir() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return null;
  const entries = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter(name => /^job_\d+_/i.test(name))
    .map(name => {
      const full = path.join(DOWNLOADS_DIR, name);
      try {
        return { full, mtimeMs: fs.statSync(full).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries.length ? entries[0].full : null;
}

function getSubtitleFormatLabel(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.srt') return 'SRT';
  if (ext === '.vtt') return 'VTT';
  return ext.slice(1).toUpperCase() || '?';
}

/**
 * Phụ đề kiểu Nhật: không hộp nền, chữ cyan/viền đen dày. Ưu tiên `videoLanguage`; không có thì nhận diện `.ja.srt` / `.ja.vtt`.
 * @param {string|null} subtitlePath
 * @param {string} [videoLanguage] - vd. `ja`, `ko` (từ transcript / cấu hình)
 */
function resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage) {
  const raw = videoLanguage != null && String(videoLanguage).trim() ? String(videoLanguage).trim().toLowerCase() : '';
  if (raw === 'ja' || raw === 'jp') return true;
  if (raw && raw !== 'ja' && raw !== 'jp') return false;
  if (!subtitlePath) return false;
  return /\.ja\.(srt|vtt)$/i.test(path.basename(subtitlePath));
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Đọc cấu hình theo dõi lượt dùng video stock
 */
function getStockUsage() {
  try {
    const rootDir = resolveStockBackgroundsDir();
    const usageFile = path.join(rootDir, 'stock_usage.json');
    if (fs.existsSync(usageFile)) {
      return JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    }
  } catch (e) {
    console.warn('Không thể đọc stock_usage.json', e.message);
  }
  return {};
}

/**
 * Cập nhật số lượt dùng của các segment
 */
function updateStockUsage(usedSegments, backgroundsDir) {
  try {
    const rootDir = resolveStockBackgroundsDir();
    const usageFile = path.join(rootDir, 'stock_usage.json');
    const folderName = path.basename(backgroundsDir);
    const usage = getStockUsage();

    for (const seg of usedSegments) {
      if (!seg || !seg.path) continue;
      // Dùng format thư mục/tên file để tránh nhầm clip trùng tên
      const fileName = path.basename(seg.path);
      const key = `${folderName}/${fileName}`;
      usage[key] = (usage[key] || 0) + 1;
    }

    fs.writeFileSync(usageFile, JSON.stringify(usage, null, 2), 'utf8');
  } catch (e) {
    console.warn('Không thể ghi stock_usage.json', e.message);
  }
}

/**
 * Lấy toàn bộ video stock từ thư mục background, xáo trộn sau đó sort theo tần suất sử dụng (ít dùng lên trước)
 */
function getStockVideos(backgroundsDir) {
  const files = fs.readdirSync(backgroundsDir).filter(f => /\.(mp4|mov|mkv|webm)$/i.test(f));
  if (files.length === 0) {
    throw new Error(`Không có video trong ${backgroundsDir}`);
  }

  const usage = getStockUsage();
  const folderName = path.basename(backgroundsDir);

  // Trộn trước để những clip cùng số lần dùng xuất hiện ngẫu nhiên không bị trùng pattern
  const shuffled = shuffleArray(files);

  // Sort theo số lần dùng tăng dần (ít dùng lên đỉnh)
  shuffled.sort((a, b) => {
    const keyA = `${folderName}/${a}`;
    const keyB = `${folderName}/${b}`;
    const countA = usage[keyA] || 0;
    const countB = usage[keyB] || 0;
    return countA - countB;
  });

  return shuffled.map(f => path.join(backgroundsDir, f));
}

/**
 * Lặp clip cho đến khi **độ dài sau xfade** (sum − (n−1)×fade) >= requiredXfadeOutputSec.
 * Trước đây chỉ so tổng sum clip → lệch (n−1)×fade (vd ~40 clip × 1s ≈ mất 40s) → cuối video đứng hình.
 */
async function buildStockSegmentPlan(videoPaths, requiredXfadeOutputSec) {
  const segments = [];
  let accumulated = 0;
  let idx = 0;
  while (true) {
    const i = idx % videoPaths.length;
    const slowmoFactor = 1.4 + Math.random() * (1.7 - 1.4);
    // Chỉ lấy thời lượng của video được thêm
    const baseDuration = await getDuration(videoPaths[i]);
    const duration = baseDuration * slowmoFactor;
    const isFlip = Math.random() < STOCK_VIDEO_HFLIP_PROBABILITY;
    segments.push({ path: videoPaths[i], duration, slowmoFactor, isFlip });
    accumulated += duration;
    idx++;

    const currentDurations = segments.map(s => s.duration);
    const minSegmentDur = Math.min(...currentDurations);
    const fadeEst = Math.max(0.15, Math.min(STOCK_VIDEO.CROSSFADE_SEC, minSegmentDur * 0.45));

    const n = segments.length;
    const xfadeLen = n <= 1 ? accumulated : accumulated - (n - 1) * fadeEst;
    if (xfadeLen >= requiredXfadeOutputSec) break;
  }

  // Trộn video segments theo yêu cầu: "thứ tự video stock ghép lại thành video cũng sắp random"
  return shuffleArray(segments);
}

const ffmpegSpawnAsync = args =>
  new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: 'inherit', shell: false });
    child.on('close', code => {
      if (code !== 0) reject(new Error(`ffmpeg exited with code ${code}`));
      else resolve();
    });
    child.on('error', err => reject(err));
  });

/** Parse SRT time "HH:MM:SS,mmm" → tổng milliseconds */
function srtTimeToMs(h, m, s, ms) {
  return Number.parseInt(h) * 3600000 + Number.parseInt(m) * 60000 + Number.parseInt(s) * 1000 + Number.parseInt(ms);
}

/** milliseconds → "HH:MM:SS,mmm" */
function msToSrtTime(totalMs) {
  const ms = Math.round(totalMs);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msPart = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(msPart).padStart(3, '0')}`;
}

/**
 * Scale timestamps trong file SRT theo hệ số speed.
 * Khi SPEED < 1 (chậm hơn), audio dài hơn → timestamps phải giãn ra (nhân 1/speed).
 * Khi SPEED > 1 (nhanh hơn), audio ngắn hơn → timestamps phải co lại (nhân 1/speed).
 * @param {string} srtPath - File SRT gốc
 * @param {string} outputSrtPath - File SRT đã scale
 * @param {number} speed - Tốc độ (vd: 0.91)
 */
function scaleSrtTimestamps(srtPath, outputSrtPath, speed) {
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

/** Đường dẫn cho filter ffmpeg `subtitles=` (Windows drive, dấu nháy). */
function escapePathForFfmpegSubtitles(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
}

/**
 * Chuyển SRT sang định dạng file ASS với cấu hình Style: Box nền Mờ, dễ đọc (mặc định); JA: chữ cyan nhạt + viền đen dày (không dùng drawbox — bỏ ở bước ffmpeg).
 * @param {string} srtPath - Đường dẫn file SRT đầu vào
 * @param {string} assPath - Nơi lưu file ASS đầu ra
 * @param {boolean} [japaneseStyle=false]
 */
function convertSrtToAss(srtPath, assPath, japaneseStyle = false) {
  const content = fs.readFileSync(srtPath, 'utf8').replace(/\r/g, '');
  const cues = content.split(/\n\n+/).filter(Boolean);

  const fontName = fs.existsSync(SUBTITLE_FONT_FILE) ? SUBTITLE_FONT_ASS_NAME : 'Arial';
  /** Viền đen: JA dày hơn; các ngôn ngữ khác ~6% cỡ chữ */
  const outlinePx = japaneseStyle ? 8.5 : +(CUSTOM_SUBTITLE_FONT_SIZE * 0.06).toFixed(2);
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
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${STOCK_VIDEO.CANVAS_W}
PlayResY: ${STOCK_VIDEO.CANVAS_H}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${CUSTOM_SUBTITLE_FONT_SIZE},${primaryColour},${secondaryColour},${outlineColour},${backColour},-1,0,0,0,100,100,${SUBTITLE.CHAR_SPACING},0,1,${outlinePx},${shadowPx},2,${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},${CUSTOM_SUBTITLE_PADDING_HORIZONTAL},0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

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

    events += `Dialogue: 0,${start},${end},Default,,0,0,${eventMarginV},,${baseText}\n`;
  }

  fs.writeFileSync(assPath, header + events, 'utf-8');
}

/**
 * Xử lý 1: tạo video từ audio có sẵn trong downloads
 * @param {string} bgNameArg - Tên background
 * @param {object} [options] - Tùy chọn
 * @param {string} [options.perVideoDir] - Batch: thư mục xuất của riêng video này
 * @param {string} [options.originalTitle] - Tiêu đề gốc YouTube
 * @param {string} [options.description] - Mô tả gốc
 * @param {string} [options.tags] - Tags gốc
 * @param {string} [options.url] - URL video (dùng cho lookup geminiByUrl)
 * @param {object} [options.geminiByUrl] - Map chứa metadata từ Gemini
 * @param {number} [options.audioSpeed] - atempo; bỏ qua → `resolveAudioSpeed({})` (random)
 * @param {number} [options.stockVideoCount] - Số clip stock; 0 / undefined → getDynamicStockVideoCount
 * @param {string|null} [options.logoPath] - File logo (đã resolve); null → không vẽ logo
 * @param {string} [options.downloadsDir] - Thư mục chứa thư mục download của riêng video này
 * @param {string} [options.videoLanguage] - Ngôn ngữ video/transcript (`ja` → phụ đề không hộp, chữ cyan viền đen). Mặc định suy từ tên file `.ja.srt`/`.ja.vtt`.
 */
async function processOne(bgNameArg, options = {}) {
  const {
    perVideoDir,
    originalTitle,
    description,
    tags,
    url,
    geminiByUrl,
    audioSpeed: speedIn,
    stockVideoCount: stockCountOpt,
    logoPath: logoPathOpt,
    downloadsDir = DOWNLOADS_DIR,
    videoLanguage,
  } = options;
  const speed = speedIn != null && Number.isFinite(Number(speedIn)) && Number(speedIn) > 0 ? Number(speedIn) : resolveAudioSpeed({});
  const stockBgRoot = resolveStockBackgroundsDir();
  let backgroundName = bgNameArg || DEFAULT_STOCK_FOLDER;
  let backgroundsDir = path.join(stockBgRoot, backgroundName);

  if (!fs.existsSync(backgroundsDir)) {
    console.warn(`Không tìm thấy folder backgrounds/${backgroundName}/ (MaVidMedia/backgrounds), thử "nature"`);
    backgroundName = DEFAULT_STOCK_FOLDER;
    backgroundsDir = path.join(stockBgRoot, backgroundName);
  }

  if (!fs.existsSync(downloadsDir)) {
    throw new Error('Không tìm thấy folder ' + downloadsDir);
  }
  if (!fs.existsSync(backgroundsDir)) {
    throw new Error(
      `Không tìm thấy folder stock "${backgroundName}" trong ${stockBgRoot}/ — kiểm tra Settings (VIDEO_STORAGE_ROOT) và tạo thư mục con tương ứng.`,
    );
  }

  const audioPath = getAudioFile(downloadsDir);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Chỉnh tốc độ audio trong Graph
  const originalAudioDuration = await getAudioDurationSeconds(audioPath);
  const audioDurationAfterTempo = originalAudioDuration / speed;
  console.log(
    `Thời lượng audio gốc: ${originalAudioDuration.toFixed(1)}s, sau atempo (SPEED=${speed}): ${formatClockDuration(
      audioDurationAfterTempo,
    )} (${audioDurationAfterTempo.toFixed(1)}s)`,
  );

  // 2. Lấy toàn bộ video stock
  const videoPaths = getStockVideos(backgroundsDir);
  console.log(`Đã nạp danh sách ${videoPaths.length} stock video từ thư mục (sẽ chọn ngẫu nhiên để ghép).`);

  // 3. Xử lý phụ đề (scale timestamps nếu SPEED != 1)
  let subtitlePath = getSubtitleFile(downloadsDir);
  const useJaSubtitleStyle = resolveJapaneseSubtitleStyle(subtitlePath, videoLanguage);
  let scaledSrtPath = null;
  if (subtitlePath && speed !== 1) {
    scaledSrtPath = path.join(OUTPUT_DIR, 'temp_scaled_sub' + path.extname(subtitlePath));
    scaleSrtTimestamps(subtitlePath, scaledSrtPath, speed);
    subtitlePath = scaledSrtPath;
    console.log(`Phụ đề (đã scale theo SPEED=${speed}): ${path.basename(scaledSrtPath)}`);
  } else if (subtitlePath) {
    console.log(`Phụ đề: ${path.basename(subtitlePath)}`);
  }

  const baseName = originalTitle ? sanitizeFilename(originalTitle) : path.basename(audioPath, path.extname(audioPath));
  const filterScriptPath = path.join(OUTPUT_DIR, 'filter_complex.txt');
  const tempSubPath = subtitlePath ? path.join(OUTPUT_DIR, 'temp_sub.ass') : null;
  const outputPath = path.join(OUTPUT_DIR, `${baseName}-with-bg.mp4`);

  const stockRenderTarget = audioDurationAfterTempo + STOCK_VIDEO.RENDER_EXTRA_SEC;
  const stockSegments = await buildStockSegmentPlan(videoPaths, stockRenderTarget);

  console.log(`Đang dựng video Single-Pass Pipeline (${stockSegments.length} clip stock, encode: ${GPU_INFO.encoderLabel})...`);

  updateStockUsage(stockSegments, backgroundsDir);

  const logoPathForMerge = logoPathOpt != null && String(logoPathOpt).trim() && fs.existsSync(logoPathOpt) ? logoPathOpt : null;
  const hasLogo = Boolean(logoPathForMerge);

  const stockOverlayDir = path.join(stockBgRoot, STOCK_OVERLAY_DIR);
  const stockOverlaySourcePath = pickFirstOverlayVideo(stockOverlayDir);
  const hasStockOverlay = Boolean(stockOverlaySourcePath);
  let usePrebakedOverlay = false;
  /** Khi `hasStockOverlay` — bản gốc hoặc file cache. */
  let pathForOverlayInput = null;
  if (hasStockOverlay) {
    const prebaked = await getPrebakedStockOverlayVideo(stockOverlaySourcePath, path.join(stockOverlayDir, '.cache'));
    usePrebakedOverlay = Boolean(prebaked);
    pathForOverlayInput = prebaked || stockOverlaySourcePath;
  } else {
    if (fs.existsSync(stockOverlayDir) && getOverlayVideoFiles(stockOverlayDir).length === 0) {
      console.log(`[overlay] Có thư mục ${STOCK_OVERLAY_DIR}/ nhưng không có file video (mp4/mov/mkv/webm) — bỏ qua lớp overlay.`);
    }
  }

  const chartSourcePath = pickFirstChartVideo();
  const hasChart = Boolean(chartSourcePath);
  if (fs.existsSync(ASSET_CHART_DIR) && getChartVideoFiles(ASSET_CHART_DIR).length === 0) {
    console.log('[chart] Thư mục assets/chart/ trống — bỏ qua lớp bar chart góc phải trên.');
  }

  // --- BUILD GRAPH ---
  const mergeArgs = ['-y'];
  let inputIdx = 0;

  // Videos: 0 to N-1
  for (const s of stockSegments) {
    if (stockSegments.length === 1 && s.duration < stockRenderTarget - 0.01) {
      mergeArgs.push('-stream_loop', '-1', '-i', s.path);
    } else {
      mergeArgs.push('-i', s.path);
    }
    inputIdx++;
  }

  let overlayIndex = -1;
  if (hasStockOverlay && pathForOverlayInput) {
    overlayIndex = inputIdx++;
    mergeArgs.push('-stream_loop', '-1', '-i', pathForOverlayInput);
    console.log(
      `[overlay] Lớp phủ: ${path.basename(stockOverlaySourcePath)} (merge: ${usePrebakedOverlay ? 'cache ProRes' : 'single-pass trên bản gốc'})`,
    );
  }

  const audioIndex = inputIdx++;
  mergeArgs.push('-i', audioPath);

  let chartIndex = -1;
  if (hasChart) {
    chartIndex = inputIdx++;
    mergeArgs.push('-stream_loop', '-1', '-i', chartSourcePath);
    console.log(
      `[chart] Góc phải trên: ${path.basename(chartSourcePath)} (max ${CHART_CORNER_MAX_WIDTH}px rộng, lặp theo hết video)`,
    );
  }

  let logoIndex = -1;
  if (hasLogo) {
    logoIndex = inputIdx++;
    mergeArgs.push('-i', logoPathForMerge);
  }

  const filterParts = [];

  // Audio graph
  filterParts.push(`[${audioIndex}:a]atempo=${speed}[aout]`);

  // Video Background graph
  let vBgLabel = 'vout_bg';
  if (stockSegments.length === 1) {
    filterParts.push(stockNormalizeFilterChain(`0:v`, vBgLabel, stockSegments[0].slowmoFactor, stockSegments[0].isFlip));
  } else {
    const minDur = Math.min(...stockSegments.map(s => s.duration));
    const fade = Math.max(0.15, Math.min(STOCK_VIDEO.CROSSFADE_SEC, minDur * 0.45));
    for (let i = 0; i < stockSegments.length; i++) {
      filterParts.push(stockNormalizeFilterChain(`${i}:v`, `s${i}`, stockSegments[i].slowmoFactor, stockSegments[i].isFlip));
    }
    let accLen = stockSegments[0].duration;
    let cur = 's0';
    for (let i = 1; i < stockSegments.length; i++) {
      const offset = accLen - fade;
      const outTag = i === stockSegments.length - 1 ? vBgLabel : `xf${i}`;
      filterParts.push(`[${cur}][s${i}]xfade=transition=fade:duration=${fade.toFixed(4)}:offset=${offset.toFixed(4)}[${outTag}]`);
      cur = outTag;
      accLen += stockSegments[i].duration - fade;
    }
  }

  let currentVLabel = vBgLabel;
  if (hasStockOverlay && overlayIndex >= 0) {
    if (usePrebakedOverlay) {
      filterParts.push(
        `[${overlayIndex}:v]fps=${STOCK_VIDEO.FPS},settb=tb=1/90000,setsar=1[ovlay]`,
      );
    } else {
      const pm = STOCK_OVERLAY_PTS_MULT;
      const chain = stockOverlayScaleCropAlphaSubchain();
      filterParts.push(
        `[${overlayIndex}:v]setpts=${pm}*PTS,${chain},fps=${STOCK_VIDEO.FPS},settb=tb=1/90000,setsar=1[ovlay]`,
      );
    }
    filterParts.push(`[${currentVLabel}][ovlay]overlay=0:0[v_plated]`);
    currentVLabel = 'v_plated';
  }

  // Drawbox + Subtitles Graph
  if (subtitlePath) {
    convertSrtToAss(subtitlePath, tempSubPath, useJaSubtitleStyle);
    const subPathEscaped = escapePathForFfmpegSubtitles(tempSubPath);
    const fontsDirEscaped = escapePathForFfmpegSubtitles(SUBTITLE_FONT_DIR);
    const subtitleBoxHeight = Math.floor(STOCK_VIDEO.CANVAS_H / 3);
    const drawboxFilter = `drawbox=x=0:y=ih-h-${SUBTITLE_MARGIN_BOTTOM_PX}:w=iw:h=${subtitleBoxHeight}:color=black@${SUBTITLE.BOX_OPACITY}:t=fill`;
    const subFilter = fs.existsSync(SUBTITLE_FONT_FILE)
      ? `subtitles='${subPathEscaped}:fontsdir=${fontsDirEscaped}'`
      : `subtitles='${subPathEscaped}'`;

    filterParts.push(`[${currentVLabel}]null[vpadded]`);
    if (useJaSubtitleStyle) {
      filterParts.push(`[vpadded]${subFilter}[v_subbed]`);
      console.log('Phụ đề (JA): không hộp nền — chữ cyan / viền đen dày.');
    } else {
      filterParts.push(`[vpadded]${drawboxFilter}[v1b]`);
      filterParts.push(`[v1b]${subFilter}[v_subbed]`);
    }
    currentVLabel = 'v_subbed';
  } else {
    filterParts.push(`[${currentVLabel}]null[vpadded]`);
    currentVLabel = 'vpadded';
  }

  // Bar chart (assets/chart) — góc phải trên, trước logo
  if (hasChart && chartIndex >= 0) {
    const wCap = CHART_CORNER_MAX_WIDTH;
    const mr = CHART_MARGIN_RIGHT;
    const mt = CHART_MARGIN_TOP;
    const f = STOCK_VIDEO.FPS;
    filterParts.push(
      `[${chartIndex}:v]scale=${wCap}:-2:flags=fast_bilinear,format=yuv420p,fps=${f},settb=tb=1/90000,setsar=1[chartvid]`,
    );
    filterParts.push(
      `[${currentVLabel}][chartvid]overlay=main_w-overlay_w-${mr}:${mt}[v_charted]`,
    );
    currentVLabel = 'v_charted';
  }

  // Logo Graph
  if (hasLogo) {
    const r = Math.floor(LOGO.SIZE / 2);
    const geqExpr = `if(lte(hypot(X-W/2,Y-H/2),${r}),255,0)`;
    filterParts.push(
      `[${logoIndex}:v]scale=${LOGO.SIZE}:${LOGO.SIZE}:flags=fast_bilinear,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${geqExpr}'[logo]`,
    );
    filterParts.push(`[${currentVLabel}][logo]overlay=main_w-overlay_w-${LOGO.MARGIN_RIGHT}:${LOGO.MARGIN_TOP}[vout_final]`);
    currentVLabel = 'vout_final';
  } else {
    filterParts.push(`[${currentVLabel}]copy[vout_final]`);
  }

  const fullGraph = filterParts.join(';');
  fs.writeFileSync(filterScriptPath, fullGraph, 'utf-8');

  mergeArgs.push(
    '-filter_complex_script',
    filterScriptPath,
    '-map',
    '[vout_final]',
    '-map',
    '[aout]',
    ...GPU_INFO.videoEncodeArgs,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-t',
    String(audioDurationAfterTempo),
    outputPath,
  );

  console.log(`Đang merge nội dung Single-Pass Pipeline...`);
  await ffmpegSpawnAsync(mergeArgs);

  if (fs.existsSync(filterScriptPath)) fs.unlinkSync(filterScriptPath);
  if (tempSubPath && fs.existsSync(tempSubPath)) fs.unlinkSync(tempSubPath);
  if (scaledSrtPath && fs.existsSync(scaledSrtPath)) fs.unlinkSync(scaledSrtPath);

  console.log(`\nĐã tạo: ${outputPath}`);

  // Nếu có perVideoDir (batch mode), copy kết quả và lưu metadata
  if (perVideoDir) {
    fs.mkdirSync(perVideoDir, { recursive: true });

    const destVideoPath = path.join(perVideoDir, `${baseName}.mp4`);
    fs.copyFileSync(outputPath, destVideoPath);
    console.log(`>>> Đã xuất video vào folder ID: ${destVideoPath}`);

    // Thumbnail YouTube (downloads) → thumbnail.{ext}; Flow → flow-thumbnail.jpg (cùng tồn tại)
    // Thumbnail YouTube, Flow và file Transcript (SRT/VTT)
    if (fs.existsSync(downloadsDir)) {
      const downloadFiles = fs.readdirSync(downloadsDir);

      // Thumbnail
      const thumbFile = downloadFiles.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      if (thumbFile) {
        const thumbExt = path.extname(thumbFile);
        const thumbDestPath = path.join(perVideoDir, `thumbnail${thumbExt}`);
        fs.copyFileSync(path.join(downloadsDir, thumbFile), thumbDestPath);
        console.log(`>>> Đã copy thumbnail YouTube: ${thumbDestPath}`);
      }

      // Transcript (Subtitle): .srt/.vtt và bản `*.srt.cleaned` (sau clean VTT, trước Gemini)
      const transcriptFiles = downloadFiles.filter(f => /\.(srt|vtt)$/i.test(f) || /\.srt\.cleaned$/i.test(f));
      for (const transcript of transcriptFiles) {
        const trDestPath = path.join(perVideoDir, transcript);
        fs.copyFileSync(path.join(downloadsDir, transcript), trDestPath);
        console.log(`>>> Đã lưu trữ file transcript gốc: ${trDestPath}`);
      }
    }
    const flowThumbJpg = path.join(perVideoDir, 'flow-thumbnail.jpg');
    if (fs.existsSync(flowThumbJpg)) {
      console.log(`>>> Đã có thumbnail Flow: ${flowThumbJpg}`);
    }

    // Đợi 1 chút để Gemini callback có thời gian cập nhật (nếu đang chạy song song)
    let gem = geminiByUrl && url ? geminiByUrl[url] : {};
    if (!gem || !gem.title) {
      await new Promise(r => setTimeout(r, 2000));
      gem = geminiByUrl && url ? geminiByUrl[url] : {};
    }

    const ytTagsStr = Array.isArray(tags) ? tags.join(', ') : tags || '';
    const metaPayload = {
      title: originalTitle || '',
      description: description || '',
      tags: ytTagsStr,
      titleGemini: gem?.title || '',
      descriptionGemini: gem?.description || '',
      tagsGemini: gem?.tags || '',
      summaryGemini: gem?.summary || '',
    };
    const metaPath = path.join(perVideoDir, 'video-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(metaPayload, null, 2), 'utf8');
    console.log(`>>> Đã lưu metadata: ${metaPath}`);
  }
}

/**
 * Test nhanh: tạo video từ audio + phụ đề đã có trong một thư mục — không download, không Gemini, không pipeline transcript.
 * Audio: file đầu tiên theo alphabet trong `downloadsDir` (mp3/m4a/wav/aac). Phụ đề: `getSubtitleFile` (ưu tiên .srt).
 *
 * @param {object} [options]
 * @param {string} [options.downloadsDir] - Folder chứa audio + .srt/.vtt. Mặc định: `job_*` mới nhất trong `downloads/`, không có thì `downloads/`.
 * @param {boolean} [options.preferLatestJobFolder=true] - Khi không truyền `downloadsDir`: ưu tiên thư mục job mới nhất.
 * @param {string} [options.stockFolder] - Tên folder trong MaVidMedia/backgrounds (mặc định giống batch: env / cat).
 * @param {number} [options.audioSpeed] - atempo; không set → random như `processOne`.
 * @param {number} [options.stockVideoCount]
 * @param {boolean} [options.showLogo]
 * @param {string} [options.channel] - Dùng khi resolve logo (kèm showLogo).
 * @param {string} [options.logoSearchDir] - Thư mục fallback khi resolve logo (mặc định: parent của `downloadsDir`).
 * @param {string|null} [options.logoPath] - Logo tường minh (ưu tiên hơn resolve từ channel).
 * @param {string} [options.perVideoDir] - Nếu set: copy video + transcript + video-meta tương tự batch. Nếu không: chỉ file trong `outputs/`.
 * @param {string} [options.title] - Tiêu đề cho tên file output / metadata.
 * @param {string} [options.description]
 * @param {string|string[]} [options.tags]
 * @param {string} [options.videoLanguage] - `ja` để ép style phụ đề Nhật (nếu không suy ra từ tên file).
 * @returns {Promise<{ downloadsDir: string, ok: true }>}
 */
export async function testMakeVideoFromDownloads(options = {}) {
  let downloadsDir = options.downloadsDir;
  if (!downloadsDir) {
    downloadsDir = options.preferLatestJobFolder !== false ? getLatestJobDownloadsDir() || DOWNLOADS_DIR : DOWNLOADS_DIR;
  }
  downloadsDir = path.resolve(downloadsDir);

  const stockFolder = resolveDefaultStockFolder(options);
  const wantLogo = shouldShowLogo(options);
  const explicitLogo = options.logoPath != null && String(options.logoPath).trim() && fs.existsSync(options.logoPath);
  const runLogoPath = explicitLogo
    ? options.logoPath
    : wantLogo
      ? resolveLogoFromChannelFolder(options, options.logoSearchDir || path.dirname(downloadsDir))
      : null;
  if (wantLogo && runLogoPath) {
    console.log(`[logo] ${runLogoPath}`);
  } else if (wantLogo && !runLogoPath) {
    console.warn('[logo] showLogo bật nhưng không có ảnh logo hợp lệ.');
  }

  await processOne(stockFolder, {
    downloadsDir,
    logoPath: runLogoPath,
    audioSpeed: options.audioSpeed,
    stockVideoCount: options.stockVideoCount,
    perVideoDir: options.perVideoDir,
    originalTitle: options.title,
    description: options.description || '',
    tags: options.tags || '',
    url: undefined,
    geminiByUrl: undefined,
    videoLanguage: options.videoLanguage,
  });

  return { downloadsDir, ok: true };
}

const CHANNELS_ROOT = resolveChannelsDir();

/** Ưu tiên `options.showLogo`; sau đó MAVID_SHOW_LOGO. */
function shouldShowLogo(mainOptions) {
  if (mainOptions.showLogo === false) return false;
  if (mainOptions.showLogo === true) return true;
  if (process.env.MAVID_SHOW_LOGO === '0') return false;
  if (process.env.MAVID_SHOW_LOGO === '1') return true;
  return false;
}

/**
 * Ảnh đầu tiên (png/jpg/…) trong `MaVidMedia/channels/{channel}`.
 * `channel` lấy từ options.channel hoặc MAVID_CHANNEL; không có thì dùng destFolder (thư mục chứa file Excel).
 */
function resolveLogoFromChannelFolder(mainOptions, destFolder) {
  const channelName =
    (mainOptions.channel && String(mainOptions.channel).trim()) ||
    (process.env.MAVID_CHANNEL && String(process.env.MAVID_CHANNEL).trim()) ||
    '';
  const dir = channelName ? path.join(CHANNELS_ROOT, channelName) : destFolder;
  const imgs = getImageFilesFromDir(dir);
  return imgs.length > 0 ? imgs[0] : null;
}

/** Tên folder con trong MaVidMedia/backgrounds khi dòng Excel không có background. */
function resolveDefaultStockFolder(mainOptions) {
  const o = mainOptions.stockFolder;
  if (o != null && String(o).trim()) return String(o).trim();
  const env = process.env.MAVID_BACKGROUND;
  if (env != null && String(env).trim()) return String(env).trim();
  return DEFAULT_STOCK_FOLDER;
}

/** Trả về số cố định hoặc undefined (để processOne + env quyết định / dynamic). */

/**
 * Main: tạo video từ audio + stock (chỉ batch — cần `items` từ CSV/Excel).
 *
 * @param {object} [options]
 * @param {number} [options.audioSpeed] — atempo; không set → `randomPlaybackSpeed()`
 * @param {string} [options.stockFolder] — Tên folder trong MaVidMedia/backgrounds (mặc định cat hoặc MAVID_BACKGROUND)
 * @param {boolean} [options.showLogo] — true: lấy ảnh logo trong `MaVidMedia/channels/{channel}`; false: không logo
 * @param {string} [options.channel] — Tên folder channel (kèm showLogo / MAVID_SHOW_LOGO=1)
 * @param {boolean} [options.syncProgressToSpreadsheet=true] — ghi cột STATUS vào Excel/CSV sau mỗi video (và khi có progress)
 */
async function main(options = {}) {
  const syncProgressToSpreadsheet = options.syncProgressToSpreadsheet !== false;
  const inputFile = options.inputFile || null;
  const items = options.items || [];
  if (items.length === 0) {
    console.log('Không có items để xử lý batch.');
    return { success: false, processedCount: 0, processedFolderNames: [] };
  }

  /** Tên thư mục con trong kênh (video ID), theo thứ tự tạo thành công — dùng cho upload GPM. */
  const processedFolderNames = [];

  const { downloadSingleVideo } = await import('./downloadVideo.js');

  const defaultStockFolder = resolveDefaultStockFolder(options);
  const batchAudioSpeedOverride =
    options.audioSpeed != null && Number.isFinite(Number(options.audioSpeed)) && Number(options.audioSpeed) > 0
      ? Number(options.audioSpeed)
      : undefined;

  // Tìm file thực tế được dùng để lấy thư mục đích (folder channel)
  const actualInputFile = inputFile;
  let destFolder = resolveChannelsDir();
  if (actualInputFile) {
    destFolder = path.dirname(actualInputFile);
  }

  const progressFile = actualInputFile
    ? actualInputFile.replace(/\.(xlsx|csv)$/, '_progress.json')
    : path.join(CHANNELS_ROOT, 'progress.json');
  let progressData = {};
  if (fs.existsSync(progressFile)) {
    try {
      progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    } catch (e) {}
  }

  /** @type {{ syncProgressStatusToSpreadsheet?: (f: string, d: object) => Promise<void> } | null} */
  let syncProgressModule = null;
  async function flushProgressToSpreadsheet() {
    if (!syncProgressToSpreadsheet || !actualInputFile) return;
    try {
      if (!syncProgressModule) {
        syncProgressModule = await import('./syncProgressToSpreadsheet.js');
      }
      await syncProgressModule.syncProgressStatusToSpreadsheet(actualInputFile, progressData);
    } catch (e) {
      console.warn('[sync] Đồng bộ STATUS → Excel/CSV:', e.message);
    }
  }

  const wantLogo = shouldShowLogo(options);
  const runLogoPath = wantLogo ? resolveLogoFromChannelFolder(options, destFolder) : null;
  if (wantLogo && runLogoPath) {
    console.log(`[logo] ${runLogoPath}`);
  } else if (wantLogo && !runLogoPath) {
    console.warn('[logo] showLogo bật nhưng không có ảnh (.png/.jpg/...) trong folder channel.');
  }

  /** Metadata Gemini theo URL (callback downloadTranscript) — ghi vào video-meta.json sau render */
  const geminiByUrl = {};

  /** Thư mục cho 1 video: destFolder/<videoID> */
  function resolveVideoOutputDir(videoId) {
    const base = videoId || 'unknown_id';
    const dir = path.join(destFolder, base);
    return dir;
  }

  // Luống bắt đầu batch -> Clean folder outputs
  if (fs.existsSync(OUTPUT_DIR)) {
    const outputFiles = fs.readdirSync(OUTPUT_DIR);
    for (const f of outputFiles) {
      try {
        fs.unlinkSync(path.join(OUTPUT_DIR, f));
      } catch (e) {}
    }
    console.log('Đã dọn dẹp thư mục outputs/ trước khi chạy batch.');
  }

  let nextDownloadPromise = null;

  async function startDownload(itemIndex) {
    if (itemIndex >= items.length) return null;
    const { url } = items[itemIndex];
    // Tạo folder download độc lập cho luồng tải đang chạy
    const isolatedDownloadsDir = path.join(ROOT, 'downloads', `job_${Date.now()}_${itemIndex}`);

    return downloadSingleVideo(url, {
      mode: MAKE_VIDEO_MODE.FROM_AUDIO,
      thumbnailChannelRoot: destFolder,
      thumbnailPrompt: options.thumbnailPrompt,
      outputDir: isolatedDownloadsDir,
      callback: ({ title: gemTitle, description: gemDesc, tags: gemTags, summary: gemSummary }) => {
        const tagsStr = typeof gemTags === 'string' ? gemTags : Array.isArray(gemTags) ? gemTags.join(', ') : '';
        geminiByUrl[url] = {
          title: gemTitle || '',
          description: gemDesc || '',
          tags: tagsStr,
          summary: gemSummary || '',
        };
        console.log('Đã nhận title/description/tags/summary từ Gemini (sẽ ghi video-meta.json sau khi render).');
      },
    })
      .then(result => ({ result, isolatedDownloadsDir }))
      .catch(err => {
        console.error(`Lỗi tải video ${url}:`, err.message);
        return { result: null, isolatedDownloadsDir };
      });
  }

  if (items.length > 0) {
    console.log(`\n[Pipeline] Bắt đầu tải video đầu tiên...`);
    nextDownloadPromise = startDownload(0);
  }

  for (let i = 0; i < items.length; i++) {
    const { url, background } = items[i];
    console.log(`\n[${i + 1}/${items.length}] Chờ tải/xử lý metadata: ${url} (Background: ${background})`);

    const dlResult = await nextDownloadPromise;

    if (i + 1 < items.length) {
      console.log(
        `\n>>> [Pipeline] Bắt đầu tải trước video [${i + 2}/${items.length}] trong lúc đang render video [${i + 1}/${items.length}]...`,
      );
      nextDownloadPromise = startDownload(i + 1);
    } else {
      nextDownloadPromise = null;
    }

    if (dlResult && dlResult.result) {
      const { result, isolatedDownloadsDir } = dlResult;
      const videoId = result.metadata?.id || 'unknown_id';
      const perVideoDir = resolveVideoOutputDir(videoId);

      try {
        await processOne(background || defaultStockFolder, {
          logoPath: runLogoPath,
          perVideoDir,
          downloadsDir: isolatedDownloadsDir,
          originalTitle: result.title,
          description: result.description,
          tags: result.tags,
          url,
          geminiByUrl,
          audioSpeed: batchAudioSpeedOverride,
        });
        console.log(`ĐÃ HOÀN THÀNH VIDEO: ${url}`);

        // Xóa tất cả file trong outputs để xử lý video tiếp theo (vẫn phải duy trì nếu outputs chứa kết quả mix)
        if (fs.existsSync(OUTPUT_DIR)) {
          const outputFiles = fs.readdirSync(OUTPUT_DIR);
          for (const f of outputFiles) {
            try {
              fs.unlinkSync(path.join(OUTPUT_DIR, f));
            } catch (e) {}
          }
          console.log('Đã dọn dẹp outputs/ cẩn thận cho video tiếp theo.');
        }

        // Xóa thư mục downloads định danh cho video hiện tại sau khi trích xuất và render xong
        if (fs.existsSync(isolatedDownloadsDir)) {
          fs.rmSync(isolatedDownloadsDir, { recursive: true, force: true });
        }

        // Chỉ đồng bộ STATUS vào Excel — title/description/tags nằm trong video-meta.json từng folder
        progressData[url] = {
          status: 'Đã tạo video',
        };
        fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf8');
        await flushProgressToSpreadsheet();
        processedFolderNames.push(String(videoId).trim() || 'unknown_id');
      } catch (err) {
        console.error('Lỗi tạo video:', err.message);
      }
    } else if (dlResult && dlResult.isolatedDownloadsDir) {
      // Nếu có thư mục rỗng được tạo ra nhưng tải lỗi thì dọn lun
      if (fs.existsSync(dlResult.isolatedDownloadsDir)) {
        fs.rmSync(dlResult.isolatedDownloadsDir, { recursive: true, force: true });
      }
    }
  }

  if (syncProgressToSpreadsheet) {
    await flushProgressToSpreadsheet();
    unlinkProgressSidecarForSpreadsheet(actualInputFile);
  }

  console.log(`\nHoàn thành xử lý ${items.length} video.`);

  return {
    success: processedFolderNames.length > 0,
    processedCount: processedFolderNames.length,
    processedFolderNames,
  };
}

export default main;
