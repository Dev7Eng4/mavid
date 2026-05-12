/**
 * Shared utilities cho tất cả options tạo video từ audio.
 * Được dùng bởi index.js, optionVideo/*.js, subtitle.js, và các option khác trong tương lai.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..', '..');
export const DOWNLOADS_DIR = path.join(ROOT, 'downloads');
export const OUTPUT_DIR = path.join(ROOT, 'outputs');
export const DEFAULT_STOCK_FOLDER = 'nature';

import { resolveStockBackgroundsDir } from '../utils/stockBackgroundsPath.js';
import { resolveChannelsDir } from '../utils/channelsStoragePath.js';

export { resolveStockBackgroundsDir, resolveChannelsDir };

// ==========================================
// AUDIO SPEED
// ==========================================

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

// ==========================================
// MEDIA DURATION
// ==========================================

/** Cache kết quả ffprobe (theo mtime+size) để tránh spawn lặp khi lập kế hoạch nhiều clip stock */
const mediaDurationCache = new Map();

/**
 * Lấy duration (giây) của file media bằng ffprobe
 */
export async function getDuration(filePath) {
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
export async function getAudioDurationSeconds(filePath) {
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

// ==========================================
// FORMATTING / HELPERS
// ==========================================

/** Hiển thị m:ss (vd 13:08) — dùng log so sánh thời lượng */
export function formatClockDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '?';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Loại bỏ các ký tự không hợp lệ cho tên file
 */
export function sanitizeFilename(name) {
  if (!name) return '';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==========================================
// FILE DISCOVERY
// ==========================================

export function getImageFilesFromDir(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map(f => path.join(dir, f));
}

/**
 * Liệt kê các file video (mp4/mov/mkv/webm, bỏ file ẩn) trong thư mục, đã sort theo tên.
 */
export function listVideoFilesInDir(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => /\.(mp4|mov|mkv|webm)$/i.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b))
    .map(f => path.join(dir, f));
}

/**
 * Lấy file audio đầu tiên từ downloads
 */
export function getAudioFile(dir = DOWNLOADS_DIR) {
  const files = fs.readdirSync(dir).filter(f => /\.(mp3|m4a|wav|aac)$/i.test(f));
  if (files.length === 0) throw new Error('Không tìm thấy file audio trong downloads/');
  return path.join(dir, files[0]);
}

/**
 * Tìm file phụ đề trong downloads: bất kỳ .srt hoặc .vtt nào (không dùng `*.srt.cleaned` — bản lưu trước Gemini).
 * Có nhiều file cùng loại → chọn tên sắp xếp alphabet; có cả .srt và .vtt → ưu tiên .srt.
 */
export function getSubtitleFile(dir = DOWNLOADS_DIR) {
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
export function getLatestJobDownloadsDir() {
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

export function getSubtitleFormatLabel(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.srt') return 'SRT';
  if (ext === '.vtt') return 'VTT';
  return ext.slice(1).toUpperCase() || '?';
}

// ==========================================
// FFMPEG
// ==========================================

export const ffmpegSpawnAsync = args =>
  new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: 'inherit', shell: false });
    child.on('close', code => {
      if (code !== 0) reject(new Error(`ffmpeg exited with code ${code}`));
      else resolve();
    });
    child.on('error', err => reject(err));
  });

// ==========================================
// LOGO / CHANNEL / STOCK FOLDER HELPERS
// ==========================================

const CHANNELS_ROOT = resolveChannelsDir();

/**
 * Ảnh đầu tiên (png/jpg/…) trong `MaVidMedia/channels/{channel}`.
 * `channel` lấy từ options.channel hoặc MAVID_CHANNEL; không có thì dùng destFolder (thư mục chứa file Excel).
 */
export function resolveLogoFromChannelFolder(mainOptions, destFolder) {
  const channelName =
    (mainOptions.channel && String(mainOptions.channel).trim()) ||
    (process.env.MAVID_CHANNEL && String(process.env.MAVID_CHANNEL).trim()) ||
    '';
  const dir = channelName ? path.join(CHANNELS_ROOT, channelName) : destFolder;
  const imgs = getImageFilesFromDir(dir);
  return imgs.length > 0 ? imgs[0] : null;
}

/** Tên folder con trong MaVidMedia/backgrounds khi dòng Excel không có background. */
export function resolveDefaultStockFolder(mainOptions) {
  const o = mainOptions.stockFolder;
  if (o != null && String(o).trim()) return String(o).trim();

  return DEFAULT_STOCK_FOLDER;
}
