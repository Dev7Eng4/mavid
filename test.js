import { execFile } from 'child_process';
import fs from 'fs';

async function main() {
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync('video-meta.json', 'utf8'));
    console.log('🚀 ~ main ~ meta:', meta);
  } catch (e) {
    console.warn(`[edit] ⚠ Lỗi đọc video-meta.json: ${e.message}`);
    return;
  }

  const title = meta.titleGemini || meta.title || '';
  const description = meta.descriptionGemini || meta.description || '';
  const tagsGemini = meta.tagsGemini || '';
  console.log('🚀 ~ fillVideoDetails ~ tagsGemini:', tagsGemini);
  const tags = meta.tags || '';
  console.log('🚀 ~ fillVideoDetails ~ tags:', tags);
}

main();
