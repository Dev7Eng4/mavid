/**
 * Reset Chrome profiles trong chrome-profile/profileN.
 *
 *   node contents/scripts/resetSubProfiles.js           # sub (mặc định)
 *   node contents/scripts/resetSubProfiles.js --main    # main: profile1 … profile(START)
 *   node contents/scripts/resetSubProfiles.js --all     # main + sub
 *
 * Import:
 *   import { resetSubProfiles, resetMainProfiles, setupMainProfiles } from './scripts/resetSubProfiles.js';
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openChromeProfile } from './makeChromeProfile.js';

const START_SUB_PROFILE = 3;
const TOTAL_SUB_PROFILES = 7;
const OPEN_DURATION_MS = 1000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const PROFILES_ROOT = path.join(ROOT, 'chrome-profile');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getProfileDir(profileNum) {
  return path.join(PROFILES_ROOT, `profile${profileNum}`);
}

/** @returns {number[]} profile1 … profile(START_SUB_PROFILE) */

export function getMainProfileNumbers() {
  const nums = [];

  for (let n = 1; n <= START_SUB_PROFILE; n++) {
    nums.push(n);
  }

  return nums;
}

/** @returns {number[]} profile(START+1) … profile(START + TOTAL) */

export function getSubProfileNumbers() {
  const nums = [];

  for (let i = 0; i < TOTAL_SUB_PROFILES; i++) {
    nums.push(START_SUB_PROFILE + 1 + i);
  }

  return nums;
}

/**
 * Quét chrome-profile — profile có 1 <= số <= START_SUB_PROFILE.
 * @returns {number[]}
 */

export function listExistingMainProfiles() {
  if (!fs.existsSync(PROFILES_ROOT)) return [];

  const found = [];

  for (const entry of fs.readdirSync(PROFILES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const match = entry.name.match(/^profile(\d+)$/);
    if (!match) continue;

    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= START_SUB_PROFILE) found.push(n);
  }

  return found.sort((a, b) => a - b);
}

/**
 * Quét chrome-profile — profile có số > START_SUB_PROFILE.
 * @returns {number[]}
 */

export function listExistingProfilesFromStart() {
  if (!fs.existsSync(PROFILES_ROOT)) return [];

  const found = [];

  for (const entry of fs.readdirSync(PROFILES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const match = entry.name.match(/^profile(\d+)$/);
    if (!match) continue;

    const n = parseInt(match[1], 10);
    if (n > START_SUB_PROFILE) found.push(n);
  }

  return found.sort((a, b) => a - b);
}

/**
 * @param {number} profileNum
 * @param {string} logPrefix
 */

function deleteProfileDir(profileNum, logPrefix) {
  const dir = getProfileDir(profileNum);

  if (!fs.existsSync(dir)) return;

  fs.rmSync(dir, { recursive: true, force: true });

  console.log(`[${logPrefix}] Đã xóa profile${profileNum} (${dir})`);
}

/**
 * @param {number} profileNum
 * @param {string} logPrefix
 */

async function initProfile(profileNum, logPrefix) {
  console.log(`[${logPrefix}] Đang khởi tạo profile${profileNum}…`);

  const { context, page } = await openChromeProfile({ profile: profileNum, visible: true });

  await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await sleep(OPEN_DURATION_MS);

  await context.close();

  console.log(`[${logPrefix}] Đã khởi tạo profile${profileNum}.`);
}

/**
 * @param {object} opts
 * @param {string} opts.logPrefix
 * @param {number[]} opts.targetNums
 * @param {number[]} opts.existing
 * @param {string} opts.rangeLabel
 */

async function resetProfileRange({ logPrefix, targetNums, existing, rangeLabel }) {
  if (targetNums.length === 0) {
    console.log(`[${logPrefix}] Không có profile nào trong phạm vi ${rangeLabel}.`);

    return { targetNums, deleted: [] };
  }

  console.log(`[${logPrefix}] Phạm vi tạo lại: profile${targetNums[0]} … profile${targetNums[targetNums.length - 1]}`);

  if (existing.length > 0) {
    console.log(`[${logPrefix}] Profile đang tồn tại (${rangeLabel}): ${existing.map(n => `profile${n}`).join(', ')}`);

    for (const n of existing) {
      deleteProfileDir(n, logPrefix);
    }
  } else {
    console.log(`[${logPrefix}] Không có profile nào trong phạm vi ${rangeLabel}.`);
  }

  for (const n of targetNums) {
    await initProfile(n, logPrefix);
  }

  return { targetNums, deleted: existing };
}

/**
 * Tạo main profile còn thiếu (không xóa profile đã có), rồi mở tất cả main profile.
 */

export async function setupMainProfiles() {
  const logPrefix = 'setupMainProfiles';

  const targetNums = getMainProfileNumbers();
  const existing = listExistingMainProfiles();
  const missing = targetNums.filter(n => !existing.includes(n));

  console.log(`[${logPrefix}] Main profile: profile${targetNums[0]} … profile${targetNums[targetNums.length - 1]}`);

  if (missing.length > 0) {
    console.log(`[${logPrefix}] Thiếu: ${missing.map(n => `profile${n}`).join(', ')} — đang tạo…`);

    for (const n of missing) {
      await initProfile(n, logPrefix);
    }
  } else {
    console.log(`[${logPrefix}] Đã có đủ main profile: ${existing.map(n => `profile${n}`).join(', ')}`);
  }

  console.log(`[${logPrefix}] Đang mở tất cả main profile…`);

  const opened = await Promise.all(
    targetNums.map(async n => {
      const { context, page } = await openChromeProfile({ profile: n, visible: true });

      await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

      return { context, n };
    }),
  );

  console.log(`\n[${logPrefix}] Đã mở ${opened.length} cửa sổ Chrome. Nhấn Enter để đóng tất cả.\n`);

  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  for (const { context, n } of opened) {
    await context.close();
    console.log(`[${logPrefix}] Đã đóng profile${n}.`);
  }

  console.log(`[${logPrefix}] Hoàn tất.`);

  return { targetNums, created: missing };
}

/**
 * Xóa profile1 … profile(START_SUB_PROFILE) (nếu có), rồi tạo lại.
 */

export async function resetMainProfiles() {
  const logPrefix = 'resetMainProfiles';

  const targetNums = getMainProfileNumbers();

  const existing = listExistingMainProfiles();

  console.log(`[${logPrefix}] START_SUB_PROFILE=${START_SUB_PROFILE} (main: 1 … ${START_SUB_PROFILE})`);

  await resetProfileRange({
    logPrefix,
    targetNums,
    existing,
    rangeLabel: `1 … ${START_SUB_PROFILE}`,
  });

  console.log(`[${logPrefix}] Hoàn tất.`);

  return { targetNums, deleted: existing };
}

/**
 * Xóa mọi profile sau START_SUB_PROFILE (nếu có), rồi tạo lại TOTAL_SUB_PROFILES profile.
 */

export async function resetSubProfiles() {
  const logPrefix = 'resetSubProfiles';

  const targetNums = getSubProfileNumbers();

  const existing = listExistingProfilesFromStart();

  console.log(`[${logPrefix}] START=${START_SUB_PROFILE}, TOTAL=${TOTAL_SUB_PROFILES}`);

  await resetProfileRange({
    logPrefix,

    targetNums,

    existing,

    rangeLabel: `> ${START_SUB_PROFILE}`,
  });

  console.log(`[${logPrefix}] Hoàn tất.`);

  return { targetNums, deleted: existing };
}

function parseCliMode(argv) {
  const hasMain = argv.includes('--main');

  const hasSub = argv.includes('--sub');

  const hasAll = argv.includes('--all');

  if (hasAll) return 'all';

  if (hasMain && hasSub) return 'all';

  if (hasMain) return 'main';

  if (hasSub) return 'sub';

  return 'sub';
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const mode = parseCliMode(process.argv.slice(2));

  const run = async () => {
    if (mode === 'main') {
      await resetMainProfiles();
    } else if (mode === 'all') {
      await resetMainProfiles();

      await resetSubProfiles();
    } else {
      await resetSubProfiles();
    }
  };

  run().catch(err => {
    console.error(err);

    process.exit(1);
  });
}

export default resetSubProfiles;
