/**
 * Setup main Chrome profiles (profile1 … profile{START_SUB_PROFILE}): tạo nếu thiếu, rồi mở tất cả.
 *
 *   node contents/scripts/setupProfile.js
 *   npm run setup-profile
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { setupMainProfiles } from './resetSubProfiles.js';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  setupMainProfiles().catch(err => {
    console.error(err);

    process.exit(1);
  });
}

export default setupMainProfiles;
