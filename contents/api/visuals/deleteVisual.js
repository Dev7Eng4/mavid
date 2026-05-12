import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getVisualsDirPath } from '../urls/getListAllPaths.js';

export async function deleteVisual({ channelId }) {
  if (!channelId) {
    return { ok: false, error: 'empty_channel_id' };
  }

  const dir = getVisualsDirPath();
  const filePath = path.join(dir, `${channelId}.json`);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { ok: false, error: 'File not found' };
  }

  try {
    await fsp.unlink(filePath);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Delete failed' };
  }
}

export default deleteVisual;
