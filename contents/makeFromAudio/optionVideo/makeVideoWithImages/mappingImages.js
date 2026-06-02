import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertTranscript } from './convertTranscript.js';
import { PATHS } from '../../../constants/paths.js';

const JPG_EXT = /\.jpe?g$/i;
const FIRST_SCENE_START_TIME = '00:00:00,000';

function filenameToMapping(filename) {
  const base = filename.replace(JPG_EXT, '');
  const parts = base.split('-');

  if (parts.length === 1) {
    const n = Number(parts[0]);
    if (!Number.isFinite(n)) {
      throw new Error(`Tên ảnh không hợp lệ: ${filename} (cần dạng 14.jpg hoặc start-end.jpg)`);
    }
    return { start: n, end: n, file: filename };
  }

  if (parts.length === 2) {
    const start = Number(parts[0]);
    const end = Number(parts[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`Tên ảnh không hợp lệ: ${filename} (cần dạng 14.jpg hoặc start-end.jpg)`);
    }
    return { start, end, file: filename };
  }

  throw new Error(`Tên ảnh không hợp lệ: ${filename} (cần dạng 14.jpg hoặc start-end.jpg)`);
}

/**
 * Sắp xếp theo start, điều chỉnh khoảng trống giữa end và start của item kế tiếp.
 * @param {Array<{ start: number, end: number, file: string }>} objectImages
 * @returns {Array<{ start: number, end: number, file: string }>}
 */
export function convertedObjectImages(objectImages) {
  const items = objectImages.map(item => ({ ...item })).sort((a, b) => a.start - b.start);

  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i];
    const next = items[i + 1];
    const gap = next.start - current.end;

    if (gap <= 3) {
      current.end = next.start;
    } else {
      const share = Math.ceil(gap / 2);
      current.end += share;
      next.start = current.end;
    }
  }

  return items;
}

/**
 * @param {Array<{ start: number, end: number, file: string }>} converted
 * @param {Array<{ id: number, endTime: string }>} transcriptObjects
 * @returns {Array<{ start: number, end: number, file: string, startTime: string, endTime: string }>}
 */
export function mapConvertedToTranscriptTimestamps(converted, transcriptObjects) {
  const byId = new Map(transcriptObjects.map(t => [t.id, t]));

  const endTimeOf = id => {
    const cue = byId.get(id);
    if (!cue) {
      throw new Error(`mappingImages: không tìm thấy transcript id=${id}`);
    }
    return cue.endTime;
  };

  return converted.map((item, index) => ({
    start: item.start,
    end: item.end,
    file: item.file,
    startTime: index === 0 ? FIRST_SCENE_START_TIME : endTimeOf(item.start),
    endTime: endTimeOf(item.end),
  }));
}

export async function main(transcriptObjects, folder, totalScenes) {
  const imagesDir = path.join(folder, 'images');

  if (!fs.existsSync(imagesDir)) {
    throw new Error(`mappingImages: không tìm thấy ${imagesDir}`);
  }

  const objectImages = fs
    .readdirSync(imagesDir)
    .filter(name => JPG_EXT.test(name) && !name.startsWith('.') && !name.startsWith('_'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map(filenameToMapping);

  if (objectImages.length !== totalScenes) {
    throw new Error(`mappingImages: số ảnh (${objectImages.length}) khác số scene (${totalScenes})`);
  }

  const converted = convertedObjectImages(objectImages);
  const mapped = mapConvertedToTranscriptTimestamps(converted, transcriptObjects);

  return mapped;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const folder = process.argv[2] ? path.resolve(process.argv[2]) : PATHS.DOWNLOADS;

  convertTranscript(folder)
    .then(transcriptObjects => main(transcriptObjects, folder, 10))
    .catch(err => {
      console.error(err.message ?? err);
      process.exit(1);
    });
}
