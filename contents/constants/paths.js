import path from 'path';

const ROOT_DIR = path.join(__dirname, '..', '..');

export const PATHS = {
  ROOT: ROOT_DIR,
  DOWNLOADS: path.join(ROOT_DIR, 'downloads'),
  OUTPUTS: path.join(ROOT_DIR, 'outputs'),
  ASSETS: path.join(ROOT_DIR, 'assets'),
};
