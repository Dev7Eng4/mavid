import path from 'path';
import fs from 'fs';
import { PATHS } from '../../../constants/paths.js';
import { parseSrtToObjects } from '../../../utils/srt.util.js';
import { getSubtitleFile } from '../../shared.js';

export async function convertTranscript(folder = PATHS.DOWNLOADS) {
  const dir = path.resolve(folder);

  if (!fs.existsSync(dir)) {
    throw new Error(`loadTranscriptFromDownloads: không tìm thấy thư mục ${dir}`);
  }

  const srtPath = getSubtitleFile(dir);
  if (!srtPath) {
    throw new Error(`loadTranscriptFromDownloads: không có file .srt/.vtt trong ${dir}`);
  }

  const ext = path.extname(srtPath).toLowerCase();
  if (ext !== '.srt') {
    throw new Error(`loadTranscriptFromDownloads: hiện chỉ hỗ trợ .srt, nhận được ${path.basename(srtPath)}`);
  }

  const transcriptContent = fs.readFileSync(srtPath, 'utf8');

  const transcriptObjects = parseSrtToObjects(transcriptContent).map((cue, index) => {
    const id = Number.parseInt(cue.id, 10);
    return {
      id: Number.isFinite(id) ? id : index + 1,
      text: cue.text.trim(),
      startTime: cue.timeline.split('-->')[0].trim(),
      endTime: cue.timeline.split('-->')[1].trim(),
    };
  });

  return transcriptObjects;
}
