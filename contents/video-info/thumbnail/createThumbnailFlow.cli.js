/**
 * CLI: npm run tao-thumbnail-flow -- [thư_mục_lưu] [tên_file_không_đuôi]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { runCreateThumbnailFlow } from './runCreateThumbnailFlow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..', '..');

async function cliMain() {
  const argv = process.argv.slice(2);
  const pathSave = path.resolve(argv[0] || path.join(ROOT, 'downloads'));
  const exportName = argv[1] || 'image-created-by-flow';
  const { createPromptReCreateThumbnail } = await import('../../prompts/ja/createImage.js');
  await runCreateThumbnailFlow({
    prompt: createPromptReCreateThumbnail(),
    pathSave,
    exportName,
  });
}

cliMain().catch(err => {
  console.error(err);
  process.exit(1);
});

