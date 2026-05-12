import path from 'path';
import fs from 'fs';
import { ASSETS_DIR, SUB_FOLDERS } from './constant.js';

export default function getListVisualResources() {
  const results = [];

  for (const subFolder of SUB_FOLDERS) {
    const subDir = path.join(ASSETS_DIR, subFolder);
    if (!fs.existsSync(subDir)) continue;

    const channelDirs = fs.readdirSync(subDir, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const dir of channelDirs) {
      const configPath = path.join(subDir, dir.name, 'mavid-config.json');
      if (!fs.existsSync(configPath)) continue;

      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        results.push({
          channelId: config.channelId,
          channelName: config.channelName,
          type: config.type,
        });
      } catch {
        console.warn(`[visual-resource] Không đọc được config: ${configPath}`);
      }
    }
  }

  return results;
}
