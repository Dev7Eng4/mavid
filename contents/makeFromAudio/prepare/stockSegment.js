/**
 * Stock Segment Planner
 *
 * Lập kế hoạch ghép các segment từ folder stock backgrounds local:
 * - Liệt kê + load-balance theo `stock_usage.json`
 * - Tạo plan segment với slowmo factor + hflip ngẫu nhiên
 * - Cập nhật usage sau khi chọn
 */

import fs from 'fs';
import path from 'path';

import { STOCK_VIDEO } from '../../constants/index.js';
import { resolveStockBackgroundsDir, shuffleArray, getDuration } from '../shared.js';

/** Xác suất hflip ngẫu nhiên cho mỗi segment */
export const STOCK_VIDEO_HFLIP_PROBABILITY = 0.3;

/**
 * Đọc file `stock_usage.json` (ở root backgrounds dir) để cân bằng tần suất chọn video.
 * @returns {Record<string, number>}
 */
export function getStockUsage() {
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
 * Cộng dồn USED cho các segment đã chọn → ghi `stock_usage.json`.
 * @param {Array<{ path: string }>} usedSegments
 * @param {string} backgroundsDir
 */
export function updateStockUsage(usedSegments, backgroundsDir) {
  try {
    const rootDir = resolveStockBackgroundsDir();
    const usageFile = path.join(rootDir, 'stock_usage.json');
    const folderName = path.basename(backgroundsDir);
    const usage = getStockUsage();

    for (const seg of usedSegments) {
      if (!seg || !seg.path) continue;
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
 * Liệt kê video stock trong folder, shuffle rồi sort lại theo `usage` (least-used trước).
 * @param {string} backgroundsDir
 * @returns {string[]} mảng path tuyệt đối
 */
export function getStockVideos(backgroundsDir) {
  const files = fs.readdirSync(backgroundsDir).filter(f => /\.(mp4|mov|mkv|webm)$/i.test(f));
  if (files.length === 0) {
    throw new Error(`Không có video trong ${backgroundsDir}`);
  }

  const usage = getStockUsage();
  const folderName = path.basename(backgroundsDir);

  const shuffled = shuffleArray(files);

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
 * Build segment plan: lặp video paths, mỗi cái cấp `slowmoFactor` ∈ [1.4, 1.7) + xác suất hflip.
 * Tổng độ dài (đã trừ xfade overlap nếu USE_XFADE) >= `requiredOutputSec`.
 *
 * @param {string[]} videoPaths
 * @param {number} requiredOutputSec
 * @returns {Promise<Array<{ path: string, duration: number, slowmoFactor: number, isFlip: boolean }>>}
 */
export async function buildStockSegmentPlan(videoPaths, requiredOutputSec) {
  const useXfade = STOCK_VIDEO.USE_XFADE === true;
  const segments = [];
  let accumulated = 0;
  let idx = 0;
  while (true) {
    const i = idx % videoPaths.length;
    const slowmoFactor = 1.4 + Math.random() * (1.7 - 1.4);
    const baseDuration = await getDuration(videoPaths[i]);
    const duration = baseDuration * slowmoFactor;
    const isFlip = Math.random() < STOCK_VIDEO_HFLIP_PROBABILITY;
    segments.push({ path: videoPaths[i], duration, slowmoFactor, isFlip });
    accumulated += duration;
    idx++;

    let effectiveLen = accumulated;
    if (useXfade && segments.length > 1) {
      const minSegmentDur = Math.min(...segments.map(s => s.duration));
      const fadeEst = Math.max(0.15, Math.min(STOCK_VIDEO.CROSSFADE_SEC, minSegmentDur * 0.45));
      effectiveLen = accumulated - (segments.length - 1) * fadeEst;
    }
    if (effectiveLen >= requiredOutputSec) break;
  }

  return shuffleArray(segments);
}
