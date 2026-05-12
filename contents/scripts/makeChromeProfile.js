/**
 * Tạo / load Chrome profile persistent.
 * Mỗi profile lưu trong chrome-profile/profile1, chrome-profile/profile2, ...
 * Lần đầu: chạy `node contents/scripts/makeChromeProfile.js [số]` để đăng nhập Google.
 * Các lần sau: load lại profile đã lưu, không cần đăng nhập lại.
 *
 * Cách dùng:
 *   import { openChromeProfile } from './scripts/makeChromeProfile.js';
 *   const { context, page } = await openChromeProfile({ profile: 1 });
 *   // ... dùng page ...
 *   await context.close();
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const PROFILES_ROOT = path.join(ROOT, 'chrome-profile');

function getProfileDir(profileNum) {
  return path.join(PROFILES_ROOT, `profile${profileNum}`);
}

/**
 * Mở Chrome với persistent context (profile lưu trên ổ đĩa).
 * @param {object} [options]
 * @param {number}  [options.profile=1] - Số profile (1, 2, 3, ...)
 * @param {boolean} [options.headless=false] - Chạy ẩn browser
 * @param {string}  [options.windowPosition='-2000,-2000'] - Vị trí cửa sổ (mặc định ngoài màn hình)
 * @param {boolean} [options.visible=true] - true = hiển thị bình thường (maximized), false = ẩn ngoài màn hình
 * @returns {Promise<{context: import('playwright').BrowserContext, page: import('playwright').Page}>}
 */
export async function openChromeProfile(options = {}) {
  const { profile = 1, headless = false, windowPosition, visible = true } = options;

  const profileDir = path.resolve(getProfileDir(profile));
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const args = ['--no-sandbox', '--disable-blink-features=AutomationControlled'];

  if (!visible) {
    args.push('--start-minimized');
    args.push(`--window-position=${windowPosition || '-2000,-2000'}`);
  } else {
    args.push('--start-maximized');
  }

  console.log(`Đang mở Chrome với profile${profile} (${profileDir})`);

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless,
    args,
    viewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  return { context, page };
}

/**
 * Chạy trực tiếp file này để tạo profile + đăng nhập Google lần đầu.
 * Sau khi đăng nhập xong → đóng browser → session đã được lưu.
 *
 *   node contents/scripts/makeChromeProfile.js        → setup profile1
 *   node contents/scripts/makeChromeProfile.js 2      → setup profile2
 */
/**
 * Tìm số profile tiếp theo chưa được dùng.
 * Quét chrome-profile/ → lấy các thư mục profileN → trả về max(N) + 1.
 */
function getNextProfileNum() {
  if (!fs.existsSync(PROFILES_ROOT)) return 1;
  const entries = fs.readdirSync(PROFILES_ROOT, { withFileTypes: true });
  let maxNum = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^profile(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return maxNum + 1;
}

async function main() {
  // Nếu truyền số cụ thể → dùng số đó (mở lại profile cũ).
  // Không truyền số → tự tạo profile mới (số tiếp theo).
  const explicitNum = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const profileNum = explicitNum || getNextProfileNum();
  const profileDir = getProfileDir(profileNum);

  console.log(`Đang mở Chrome để tạo profile${profileNum}...`);
  console.log(`Profile sẽ lưu tại: ${profileDir}`);

  const { context, page } = await openChromeProfile({ profile: profileNum, visible: true });

  await page.goto('https://accounts.google.com', { waitUntil: 'domcontentloaded' });

  console.log('\n====================================');
  console.log('Hãy đăng nhập Google trong cửa sổ Chrome vừa mở.');
  console.log('Sau khi đăng nhập xong, nhấn Enter ở đây để đóng browser.');
  console.log('====================================\n');

  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  await context.close();
  console.log(`Đã lưu profile${profileNum}. Các lần sau sẽ tự động dùng session này.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export default openChromeProfile;
