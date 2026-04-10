/**
 * Playwright + GPM-Login:
 *
 * 1) API (mặc định): GPM mở Chrome qua GET `/api/v3/profiles/start/{id}` → trong `data` lấy
 *    `remote_debugging_address` → chờ cổng TCP mở (tránh ECONNREFUSED) → `chromium.connectOverCDP('http://…')`.
 *    Lưu ý: một số bản GPM trả `data.success: false` dù browser đã mở — miễn có `remote_debugging_address` là vẫn nối CDP.
 *    Yêu cầu: GPM-Login đang chạy, API Local (mặc định port 19995).
 *
 * 2) Thư mục profile: `chromium.launchPersistentContext(đường_dẫn)` — user-data = folder profile GPM.
 *    Binary: **Chromium/GPM** (browser.exe / chrome.exe), không dùng Chrome Google hệ thống.
 *    Thứ tự: `GPM_CHROMIUM_PATH` (hoặc cấu hình trong app) → tự tìm quanh `GPM_DATA_ROOT` và
 *    thư mục cha của profile → lỗi nếu không thấy.
 *
 * Tài liệu API: https://docs.gpmloginapp.com/api-document/mo-profile
 *
 * Biến môi trường (API):
 *   GPM_API_BASE   — mặc định http://127.0.0.1:19995
 *   GPM_API_TOKEN  — Bearer nếu bật khóa API
 *
 * CLI API:
 *   node contents/scripts/openGpmPlaywright.js <profile_id> [url_mở_đầu]
 *
 * CLI folder (MaVid / Electron):
 *   node contents/scripts/openGpmPlaywright.js --folder <đường_dẫn_thư_mục_profile> [url]
 *
 * Import:
 *   import { connectPlaywrightToGpmProfile, connectPlaywrightToProfileFolder, closeProfile } from './scripts/openGpmPlaywright.js';
 */

import fs from 'fs';
import net from 'net';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse `http://127.0.0.1:63559` → host + port (Playwright/CDP).
 * @param {string} cdpHttpUrl
 * @returns {{ host: string, port: number }}
 */
function cdpUrlToHostPort(cdpHttpUrl) {
  const href = cdpHttpUrl.startsWith('http://') || cdpHttpUrl.startsWith('https://') ? cdpHttpUrl : `http://${cdpHttpUrl}`;
  const u = new URL(href);
  const port = u.port;
  if (!port) throw new Error(`CDP URL thiếu cổng: ${cdpHttpUrl}`);
  const n = Number(port);
  if (!Number.isFinite(n) || n < 1 || n > 65535) throw new Error(`Cổng CDP không hợp lệ: ${port}`);
  return { host: u.hostname, port: n };
}

/**
 * GPM trả `remote_debugging_address` ngay khi bắt đầu khởi chạy browser; cổng CDP có thể chưa listen → ECONNREFUSED.
 * Chờ TCP mở rồi mới gọi `connectOverCDP`.
 *
 * @param {string} host
 * @param {number} port
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=120000]
 * @param {number} [opts.pollMs=400]
 */

async function waitForCdpPort(host, port, { timeoutMs = 120000, pollMs = 400 } = {}) {
  const start = Date.now();
  /** @type {string} */
  let lastErr = 'ECONNREFUSED';
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise(resolve => {
      const socket = net.connect(
        {
          host,
          port,
          family: net.isIPv6(host) ? 6 : 4,
        },
        () => {
          socket.destroy();
          resolve(true);
        }
      );
      const t = Math.min(2500, Math.max(200, pollMs * 2));
      socket.setTimeout(t);
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', err => {
        lastErr = err && typeof err === 'object' && 'code' in err ? String(err.code) : String(err?.message || err);
        resolve(false);
      });
    });
    if (ok) {
      await sleep(200);
      return;
    }
    await sleep(pollMs);
  }
  throw new Error(`CDP chưa lắng nghe tại ${host}:${port} sau ${timeoutMs}ms (lỗi: ${lastErr}). Đợi GPM mở xong profile hoặc thử lại.`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @param {string} p */
function tryExistingFile(p) {
  try {
    const abs = path.resolve(p);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Các đường tương đối thường gặp (GPM / antidetect) từ một thư mục gốc.
 * @param {string} root
 * @returns {string[]}
 */
function gpmBrowserPathsUnderRoot(root) {
  const r = path.resolve(root);
  const out = [];
  if (process.platform === 'win32') {
    const rel = [
      ['browser', 'browser.exe'],
      ['browser', 'chrome.exe'],
      ['Browser', 'browser.exe'],
      ['chrome', 'chrome.exe'],
      ['Chromium', 'chrome.exe'],
      ['chromium', 'chrome.exe'],
      ['orbita-browser', 'chrome.exe'],
      ['chrome-win', 'chrome.exe'],
      ['gp-browser', 'chrome.exe'],
    ];
    for (const parts of rel) out.push(path.join(r, ...parts));
  } else if (process.platform === 'darwin') {
    out.push(path.join(r, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
  } else {
    out.push(path.join(r, 'chrome', 'chrome'), path.join(r, 'browser', 'chrome'));
  }
  return out;
}

/**
 * Đường dẫn tuyệt đối tới chrome/chromium của GPM (không phải Google Chrome cài máy).
 * @param {string} profileDir — thư mục user-data profile
 * @param {string} [dataRoot] — thư mục dữ liệu GPM (MaVid: `GPM_DATA_ROOT`)
 * @param {string} [preferredExe] — ưu tiên trên env (vd. từ gpm-settings.json)
 * @returns {string}
 */
export function resolveGpmChromiumExecutable(profileDir, dataRoot, preferredExe) {
  const explicit = preferredExe?.trim() || process.env.GPM_CHROMIUM_PATH?.trim() || '';
  if (explicit) {
    const x = tryExistingFile(explicit);
    if (x) return x;
    throw new Error(`Đường dẫn trình duyệt GPM không tồn tại: ${explicit}`);
  }

  const candidates = [];
  const dr = dataRoot?.trim();
  if (dr) candidates.push(...gpmBrowserPathsUnderRoot(dr));

  let d = path.resolve(profileDir);
  const seen = new Set();
  for (let i = 0; i < 16 && d && !seen.has(d); i++) {
    seen.add(d);
    if (process.platform === 'win32') {
      candidates.push(path.join(d, 'browser.exe'), path.join(d, 'chrome.exe'), path.join(d, 'chromium.exe'));
    }
    candidates.push(...gpmBrowserPathsUnderRoot(d));
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }

  for (const c of candidates) {
    const x = tryExistingFile(c);
    if (x) return x;
  }

  throw new Error(
    'Không tìm thấy trình duyệt GPM (browser.exe / chrome.exe). Trong tab GPM hãy «Chọn browser GPM», hoặc đặt biến môi trường GPM_CHROMIUM_PATH trỏ tới file .exe của GPM.'
  );
}

/** @param {string} [base] */
function normalizeApiBase(base) {
  const b = (base || process.env.GPM_API_BASE || 'http://127.0.0.1:19995').replace(/\/$/, '');
  return b;
}

/**
 * Root API v3 cho `fetch` — khớp Electron `GPM_API_V3_ROOT` và `createGpmApiClient` (`…/api/v3`).
 * @param {string} [explicitBase] — chỉ origin (`http://127.0.0.1:19995`) hoặc đã kết thúc bằng `/api/v3`
 */
function resolveGpmApiV3Root(explicitBase) {
  const raw = String(explicitBase || process.env.GPM_API_BASE || 'http://127.0.0.1:19995')
    .trim()
    .replace(/\/+$/, '');
  if (/\/api\/v3$/i.test(raw)) return raw;
  return `${raw}/api/v3`;
}

/** @returns {Record<string, string>} */
function gpmHeaders() {
  const h = { Accept: 'application/json' };
  const t = process.env.GPM_API_TOKEN?.trim();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/**
 * `remote_debugging_address` từ GPM → URL cho `chromium.connectOverCDP`.
 * @param {string} addr — vd. `127.0.0.1:53378` hoặc đã có `http://`
 */
export function gpmRemoteDebuggingAddressToCdpUrl(addr) {
  const s = String(addr ?? '').trim();
  if (!s) throw new Error('remote_debugging_address rỗng.');
  if (s.startsWith('http://') || s.startsWith('https://')) return s.replace(/\/+$/, '');
  return `http://${s}`;
}

/**
 * Gọi API mở profile GPM (Chrome do GPM khởi chạy) — Playwright chỉ nối CDP, không tự launch browser.
 *
 * Response kiểu:
 * `{ "success": true, "data": { "profile_id": "…", "remote_debugging_address": "127.0.0.1:53378", "browser_location": "…", "success": false }, "message": "OK" }`
 * Trường `data.success` có thể `false`; vẫn nối CDP nếu envelope `success` và có `remote_debugging_address`.
 *
 * @param {string} profileId — id profile (UUID)
 * @param {object} [options]
 * @param {string} [options.apiBase] — host API, vd. `http://127.0.0.1:19995`
 * @param {string} [options.win_scale] — 0..1
 * @param {string} [options.win_pos] — "x,y"
 * @param {string} [options.win_size] — "width,height"
 * @param {string} [options.addination_args] — tham số dòng lệnh browser (nâng cao)
 * @returns {Promise<{ cdpHttpUrl: string, profileId: string, raw: object }>}
 */
export async function startGpmProfile(profileId, options = {}) {
  if (!profileId || typeof profileId !== 'string') {
    throw new Error('startGpmProfile: cần profileId (string).');
  }
  const base = normalizeApiBase(options.apiBase);
  const url = new URL(`/api/v3/profiles/start/${encodeURIComponent(profileId)}`, base);
  if (options.win_scale != null) url.searchParams.set('win_scale', String(options.win_scale));
  if (options.win_pos) url.searchParams.set('win_pos', options.win_pos);
  if (options.win_size) url.searchParams.set('win_size', options.win_size);
  if (options.addination_args) url.searchParams.set('addination_args', options.addination_args);

  const res = await fetch(url.toString(), { method: 'GET', headers: gpmHeaders() });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`GPM API không trả JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!json.success) {
    throw new Error(json.message || `GPM start profile thất bại (${res.status})`);
  }

  const d = json.data;
  if (!d || typeof d !== 'object') {
    throw new Error('GPM API: thiếu `data` trong response start profile.');
  }

  const addr = d.remote_debugging_address;
  if (!addr || typeof addr !== 'string' || !String(addr).trim()) {
    throw new Error('GPM không trả `remote_debugging_address` trong `data`. Kiểm tra profile / GPM đang chạy.');
  }

  if (d.success === false) {
    console.warn('[GPM] `data.success === false` nhưng envelope OK và có remote_debugging_address — vẫn dùng connectOverCDP.');
  }

  const cdpHttpUrl = gpmRemoteDebuggingAddressToCdpUrl(addr);
  const resolvedProfileId = (typeof d.profile_id === 'string' && d.profile_id.trim()) || profileId;

  if (typeof d.browser_location === 'string' && d.browser_location.trim()) {
    console.log(`[GPM] browser_location: ${d.browser_location}`);
  }
  console.log(`[GPM] connectOverCDP → ${cdpHttpUrl} (profile_id=${resolvedProfileId})`);

  return {
    cdpHttpUrl,
    profileId: resolvedProfileId,
    raw: d,
  };
}

/**
 * Đóng Chrome/profile do GPM mở — **bắt buộc** gọi API này (giống `gpmApi.closeProfile` trong app).
 * `GET {apiV3Root}/profiles/close/{profileId}`
 * @param {string} profileId
 * @param {object} [options]
 * @param {string} [options.apiBase] — origin hoặc base đã có `/api/v3` (ưu tiên khớp `GPM_API_BASE` / `apiRootForPlaywright`)
 */
export async function closeProfile(profileId, options = {}) {
  if (!profileId || typeof profileId !== 'string' || !profileId.trim()) {
    throw new Error('closeProfile: cần profileId (string).');
  }
  const root = resolveGpmApiV3Root(options.apiBase);
  const url = `${root}/profiles/close/${encodeURIComponent(profileId.trim())}`;
  const res = await fetch(url, { method: 'GET', headers: gpmHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    throw new Error(json.message || `GPM closeProfile lỗi (${res.status})`);
  }
  return json;
}

/** Alias tên cũ — cùng {@link closeProfile}. */
export async function stopGpmProfile(profileId, options = {}) {
  return closeProfile(profileId, options);
}

/**
 * GPM `startProfile` (API) → chờ CDP → `chromium.connectOverCDP(remote_debugging_address)`.
 * @param {string} profileId
 * @param {object} [options] — truyền thêm cho startGpmProfile (apiBase, win_scale, …)
 * @param {number} [options.cdpWaitTimeoutMs] — chờ cổng CDP (mặc định 120000)
 * @param {number} [options.cdpPollMs] — khoảng cách giữa các lần thử (mặc định 400)
 * @returns {Promise<{ browser: import('playwright').Browser, context: import('playwright').BrowserContext, page: import('playwright').Page, gpm: Awaited<ReturnType<typeof startGpmProfile>> }>}
 */
export async function connectPlaywrightToGpmProfile(profileId, options = {}) {
  const { cdpWaitTimeoutMs, cdpPollMs, ...startOpts } = options;
  const gpm = await startGpmProfile(profileId, startOpts);
  const { host, port } = cdpUrlToHostPort(gpm.cdpHttpUrl);
  const waitMs = Number.isFinite(Number(cdpWaitTimeoutMs)) && Number(cdpWaitTimeoutMs) > 0 ? Number(cdpWaitTimeoutMs) : 120000;
  const poll = Number.isFinite(Number(cdpPollMs)) && Number(cdpPollMs) > 0 ? Number(cdpPollMs) : 400;

  console.log(`[GPM] Chờ CDP ${host}:${port} sẵn sàng (tối đa ${waitMs}ms)…`);
  await waitForCdpPort(host, port, { timeoutMs: waitMs, pollMs: poll });

  let browser;
  const connectDeadline = Date.now() + 30000;
  let lastConnectErr = null;
  while (Date.now() < connectDeadline) {
    try {
      browser = await chromium.connectOverCDP(gpm.cdpHttpUrl);
      break;
    } catch (e) {
      lastConnectErr = e;
      await sleep(500);
    }
  }
  if (!browser) {
    throw lastConnectErr instanceof Error ? lastConnectErr : new Error(String(lastConnectErr));
  }

  const contexts = browser.contexts();
  const context = contexts[0] || (await browser.newContext());
  const pages = context.pages();
  const page = pages[0] || (await context.newPage());

  return { browser, context, page, gpm };
}

/**
 * Mở Playwright với user-data = thư mục profile trên đĩa (không gọi API GPM).
 * @param {string} profileDir — đường dẫn tuyệt đối tới folder profile
 * @param {object} [options]
 * @param {import('playwright').LaunchPersistentContextOptions} [options.launchOptions] — merge vào launchPersistentContext
 */
export async function connectPlaywrightToProfileFolder(profileDir, options = {}) {
  const dir = path.resolve(profileDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Thư mục profile không tồn tại: ${dir}`);
  }

  const dataRoot = process.env.GPM_DATA_ROOT?.trim() || '';
  const mergedLO = { ...(options.launchOptions || {}) };
  if (!mergedLO.executablePath || !String(mergedLO.executablePath).trim()) {
    mergedLO.executablePath = resolveGpmChromiumExecutable(dir, dataRoot);
  }
  const launchOptions = {
    headless: false,
    viewport: null,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
    ...mergedLO,
  };

  const context = await chromium.launchPersistentContext(dir, launchOptions);
  const pages = context.pages();
  const page = pages[0] || (await context.newPage());

  return { context, page };
}

/**
 * Giữ process sống cho tới SIGTERM/SIGINT hoặc một dòng stdin (giống chế độ API).
 * @param {import('playwright').BrowserContext} context
 */
async function waitUntilCloseSignal(context) {
  let settled = false;
  const finish = async () => {
    if (settled) return;
    settled = true;
    try {
      await context.close();
    } catch {
      /* ignore */
    }
  };

  return new Promise(resolve => {
    const done = () => {
      void finish().then(() => resolve());
    };

    process.once('SIGTERM', done);
    process.once('SIGINT', done);

    try {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', () => done());
    } catch {
      /* stdin không có (Electron spawn stdio ignore) — chỉ SIGTERM */
    }
  });
}

/**
 * Danh sách profile (phân trang). GET /api/v3/profiles
 * @param {object} [query] — page, per_page, group_id, search, sort
 */
export async function listGpmProfiles(query = {}) {
  const base = normalizeApiBase();
  const url = new URL('/api/v3/profiles', base);
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { method: 'GET', headers: gpmHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    throw new Error(json.message || `GPM list profiles lỗi (${res.status})`);
  }
  return json;
}

async function mainFolderMode() {
  const idx = process.argv.indexOf('--folder');
  if (idx < 0 || !process.argv[idx + 1]) {
    console.error('Thiếu tham số: --folder <đường_dẫn_thư_mục_profile>');
    process.exit(1);
  }
  const profileDir = path.resolve(process.argv[idx + 1]);
  const startUrl = process.argv[idx + 2] || process.env.GPM_START_URL || 'https://www.google.com';

  console.log(`Chế độ folder profile: ${profileDir}`);
  const dataRoot = process.env.GPM_DATA_ROOT?.trim() || '';
  let exe;
  try {
    exe = resolveGpmChromiumExecutable(profileDir, dataRoot);
    console.log(`Browser GPM: ${exe}`);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }

  const { context, page } = await connectPlaywrightToProfileFolder(profileDir, {
    launchOptions: { executablePath: exe },
  });
  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  console.log(`Đã mở: ${startUrl}`);
  console.log('Đóng: SIGTERM từ app hoặc nhấn Enter (nếu có stdin).');

  await waitUntilCloseSignal(context);
  console.log('Đã đóng Playwright (folder).');
}

async function mainApiMode() {
  const profileId = process.argv[2] || process.env.GPM_PROFILE_ID;
  if (!profileId) {
    console.error('Cách dùng: node contents/scripts/openGpmPlaywright.js <profile_id> [url]');
    console.error('Hoặc: node contents/scripts/openGpmPlaywright.js --folder <path> [url]');
    console.error('Hoặc đặt GPM_PROFILE_ID trong môi trường.');
    process.exit(1);
  }

  const startUrl = process.argv[3] || 'https://www.google.com';

  console.log(`GPM API: ${normalizeApiBase()}`);
  console.log(`Đang mở profile: ${profileId}`);

  const { browser, page, gpm } = await connectPlaywrightToGpmProfile(profileId);
  console.log(`Đã nối CDP: ${gpm.cdpHttpUrl}`);

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  console.log(`Đã mở: ${startUrl}`);
  console.log('\nNhấn Enter để đóng browser và gọi API đóng profile GPM...');

  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  await browser.close();
  try {
    await closeProfile(profileId);
    console.log('Đã đóng profile trong GPM (API closeProfile).');
  } catch (e) {
    console.warn('Không đóng profile qua API (có thể đã tắt tay):', e.message);
  }
}

async function main() {
  if (process.argv.includes('--folder')) {
    await mainFolderMode();
    return;
  }
  await mainApiMode();
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export default connectPlaywrightToGpmProfile;
