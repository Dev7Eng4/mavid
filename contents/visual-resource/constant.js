import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'visual-resource');
export const ROOT_DIR = path.join(__dirname, '..', '..');

export const VISUAL_RESOURCE_TYPES = {
  NARRATOR: 'N',
  STOCK_VIDEO: 'S',
};

export const SUB_FOLDERS = ['narrator', 'stock'];
