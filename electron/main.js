import { app, BrowserWindow, ipcMain, Menu, globalShortcut, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveGpmChromiumExecutable } from '../contents/scripts/openGpmPlaywright.js';
import { getDefaultVideoStorageRoot, MAVID_MEDIA_FOLDER } from '../contents/constants/defaultVideoStorageRoot.js';
import { mergeAppSettingsObjects, normalizeUserConstantsOverlay } from '../contents/constants/mergeConstantsOverlay.js';
import { OVERLAY_KEYS } from '../contents/constants/constantsExportKeys.js';
import { buildConstantsModuleBase, expandAppSettingsIntoModule } from '../contents/constants/constantsModuleBase.js';
import { getAppSettingsUserJsonPath } from '../contents/constants/userConstantsPaths.js';
import { mapIndexDataToProps, mapIndexDataToHeaders, mapPropToHeader } from '../contents/constants/indexColumnMapping.js';
import { GPM_API_DEFAULT_ORIGIN } from '../contents/constants/gpmApi.js';

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const GPM_API_V3_ROOT = (process.env.GPM_API_BASE || GPM_API_DEFAULT_ORIGIN).replace(/\/$/, '');
const CONSTANTS_DIR = path.join(ROOT, 'contents', 'constants');
const CONSTANTS_INDEX_FILE = path.join(CONSTANTS_DIR, 'index.js');
const MAVID_CHANNEL_CONFIG_FILENAME = 'mavid-channel-config.json';
const OUTPUTS_DIR = path.join(ROOT, 'outputs');
const DOWNLOADS_DIR = path.join(ROOT, 'downloads');
let mainWindow = null;

// --------------- Script runner ---------------

const ALLOWED_NPM_SCRIPTS = new Set([
  'tao-chrome-profile',
  'lay-thong-tin-youtube',
  'tao-batch-video-tu-audio',
  'tao-batch-video-reup-full',
  'tao-thumbnail-flow',
  'tom-tat-meta-tu-transcript',
  'syncVideosToDrive',
]);

/** Chỉ dùng cho `run-npm-script` (spawn npm). */
let npmJobRunning = false;
/** Số lần gọi `run-script` đang thực thi (cho phép nhiều script song song). */
let activeRunScriptCount = 0;

/** Bọc console cho run-script — refcount để nhiều job song song không restore sai. */
let runScriptConsoleWrapDepth = 0;
/** @type {{ log: typeof console.log; warn: typeof console.warn; error: typeof console.error } | null} */
let runScriptConsolePinned = null;

function beginRunScriptConsoleCapture() {
  if (runScriptConsoleWrapDepth === 0) {
    runScriptConsolePinned = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    const base = runScriptConsolePinned;
    console.log = (...args) => {
      base.log.apply(console, args);
    };
    console.warn = (...args) => {
      const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      broadcastScriptError(`[warn] ${line}`);
      base.warn.apply(console, args);
    };
    console.error = (...args) => {
      const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      broadcastScriptError(`[error] ${line}`);
      base.error.apply(console, args);
    };
  }
  runScriptConsoleWrapDepth += 1;
}

function endRunScriptConsoleCapture() {
  runScriptConsoleWrapDepth = Math.max(0, runScriptConsoleWrapDepth - 1);
  if (runScriptConsoleWrapDepth === 0 && runScriptConsolePinned) {
    console.log = runScriptConsolePinned.log;
    console.warn = runScriptConsolePinned.warn;
    console.error = runScriptConsolePinned.error;
    runScriptConsolePinned = null;
  }
}

/** Dòng giống lỗi trên stdout npm — đẩy lên tab Logs. */
const NPM_STDOUT_ERR_LIKE =
  /^(Error|RangeError|TypeError|ReferenceError|SyntaxError):|\bUnhandledPromiseRejection\b|\bnpm ERR!|\bELIFECYCLE\b|\bERR_MODULE_NOT_FOUND\b|\bCannot find module\b|\bFATAL\b|\bAssertionError\b/i;

/**
 * FFmpeg (và nhiều CLI) ghi tiến độ ra stderr; không phải lỗi.
 * Chỉ gửi tab Logs khi dòng thực sự giống warning/error.
 */
function isReportableNpmStderrLine(t) {
  const s = String(t).trim();
  if (!s) return false;
  if (/^\[mavid-(log|warn|err)\]\s?/i.test(s)) return true;
  if (NPM_STDOUT_ERR_LIKE.test(s)) return true;
  if (/\[(error|fatal|warning)\]/i.test(s)) return true;
  if (/^\(node:\d+\)\s*(Warning|ExperimentalWarning)/i.test(s)) return true;
  if (/^\s*npm\s+WARN\b/i.test(s)) return true;
  if (/^\s*npm\s+ERR!/i.test(s)) return true;
  if (/^warning[\s:]/i.test(s)) return true;
  return false;
}

/** Dòng từ `contents/utils/logToLogsPage.util.js` → tab Logs (không tiền tố [stderr]). */
function formatMavidUiLogLine(t) {
  const s = String(t).trim();
  const logMark = '[mavid-log]';
  const warnMark = '[mavid-warn]';
  const errMark = '[mavid-err]';
  if (s.startsWith(logMark)) return `[MaVid] ${s.slice(logMark.length).trim()}`;
  if (s.startsWith(warnMark)) return `[warn] ${s.slice(warnMark.length).trim()}`;
  if (s.startsWith(errMark)) return `[error] ${s.slice(errMark.length).trim()}`;
  return null;
}

/** Ghi ra terminal process Electron (dev), không gửi UI Logs. */
function writeRunnerTerminalLine(line) {
  process.stdout.write(`[log] ${line}\n`);
}

/** Log lỗi tab Logs — lưu file để đóng/mở app vẫn còn (chỉ xóa khi user bấm Xóa). */
const MAX_PERSISTED_ERROR_LOG_LINES = 3000;

function getErrorLogFilePath() {
  return path.join(app.getPath('userData'), 'mavid-error-logs.json');
}

function readPersistedErrorLogs() {
  const p = getErrorLogFilePath();
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    return Array.isArray(j.lines) ? j.lines.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writePersistedErrorLogs(lines) {
  const p = getErrorLogFilePath();
  const trimmed = lines.length > MAX_PERSISTED_ERROR_LOG_LINES ? lines.slice(-MAX_PERSISTED_ERROR_LOG_LINES) : [...lines];
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ lines: trimmed }, null, 0), 'utf8');
}

function appendPersistedErrorLogLine(line) {
  const s = typeof line === 'string' ? line : String(line);
  if (!String(s).trim()) return;
  const cur = readPersistedErrorLogs();
  cur.push(s);
  writePersistedErrorLogs(cur);
}

function clearPersistedErrorLogsFile() {
  writePersistedErrorLogs([]);
}

/** Chỉ lỗi / stderr / console.error — tab Logs trong app (đã ghi file trước khi push IPC). */
function broadcastScriptError(line) {
  const s = typeof line === 'string' ? line : String(line);
  if (!String(s).trim()) return;
  appendPersistedErrorLogLine(s);
  try {
    const wins = BrowserWindow.getAllWindows();
    for (const w of wins) {
      if (!w.isDestroyed()) w.webContents.send('script-error-log', s);
    }
  } catch {
    /* ignore */
  }
}

/** Tiến trình con của `run-npm-script` (để có thể kill khi user bấm Dừng). */
let npmChildProcess = null;
let npmRunUserCancelled = false;

function killNpmSpawnTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
      detached: true,
    });
    killer.unref();
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

ipcMain.handle('cancel-running-job', async () => {
  if (!npmChildProcess || npmChildProcess.killed) {
    return { ok: false, reason: 'no-npm-job' };
  }
  npmRunUserCancelled = true;
  killNpmSpawnTree(npmChildProcess);
  return { ok: true };
});

ipcMain.handle('minimize-app', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (win) {
    win.minimize();
  }
  return { ok: true };
});

ipcMain.handle('get-persisted-error-logs', async () => ({
  lines: readPersistedErrorLogs(),
}));

ipcMain.handle('append-persisted-error-log', async (_event, { line }) => {
  if (typeof line !== 'string' || !line.trim()) return { ok: false };
  appendPersistedErrorLogLine(line);
  return { ok: true };
});

ipcMain.handle('clear-persisted-error-logs', async () => {
  clearPersistedErrorLogsFile();
  return { ok: true };
});

ipcMain.handle('run-npm-script', async (_event, { npmScript, extraEnv }) => {
  if (!npmScript || typeof npmScript !== 'string') throw new Error('npmScript không hợp lệ.');
  if (!ALLOWED_NPM_SCRIPTS.has(npmScript)) throw new Error(`Script không được phép: ${npmScript}`);
  if (npmJobRunning) throw new Error('Đang có job npm chạy. Vui lòng chờ kết thúc.');
  // Một job `npm run` tại một thời điểm (`npmJobRunning`). `run-script` (vd. upload YouTube) không bị chặn
  // khi npm đang chạy — cho phép tạo video và upload song song; tránh trùng profile GPM nếu hai luồng cùng email.

  npmJobRunning = true;
  npmRunUserCancelled = false;

  writeRunnerTerminalLine(`[MaVid] Bắt đầu: npm run ${npmScript}`);

  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const childEnv = extraEnv ? { ...process.env, ...extraEnv } : process.env;
    const { code, cancelled } = await new Promise((resolve, reject) => {
      const child = spawn(`${npmCmd} run "${npmScript}"`, [], {
        cwd: ROOT,
        env: childEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      npmChildProcess = child;

      child.stdout.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const l of lines) {
          const t = l.trim();
          if (!t) continue;
          writeRunnerTerminalLine(t);
          if (NPM_STDOUT_ERR_LIKE.test(t)) broadcastScriptError(`[npm stdout] ${t}`);
        }
      });

      child.stderr.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const l of lines) {
          const t = l.trim();
          if (!t) continue;
          writeRunnerTerminalLine(`[stderr] ${t}`);
          if (isReportableNpmStderrLine(t)) {
            const mavidUi = formatMavidUiLogLine(t);
            broadcastScriptError(mavidUi ?? `[stderr] ${t}`);
          }
        }
      });

      child.on('close', c => {
        npmChildProcess = null;
        const wasCancelled = npmRunUserCancelled;
        npmRunUserCancelled = false;
        resolve({ code: c ?? 1, cancelled: wasCancelled });
      });

      child.on('error', err => {
        npmChildProcess = null;
        npmRunUserCancelled = false;
        reject(err);
      });
    });

    if (cancelled) {
      writeRunnerTerminalLine('[MaVid] Đã dừng theo yêu cầu (tiến trình npm đã kết thúc).');
      return { code: code, cancelled: true };
    }

    if (code !== 0) {
      const msg = `[MaVid] npm script thoát với code ${code}`;
      writeRunnerTerminalLine(msg);
      broadcastScriptError(msg);
      throw new Error(`npm script exited with code ${code}`);
    }

    writeRunnerTerminalLine('[MaVid] Hoàn thành.');
    return { code: 0, cancelled: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.startsWith('npm script exited with code')) {
      broadcastScriptError(`[MaVid] Lỗi npm: ${msg}`);
    }
    throw e;
  } finally {
    npmJobRunning = false;
    npmChildProcess = null;
    npmRunUserCancelled = false;
  }
});

// --------------- Direct Script Runner ---------------

const SCRIPT_MAP = {
  getInfoChannel: '../contents/video-info/getInfoChannel.js',
  addChannelFromForm: '../contents/scripts/addChannel.js',
  downloadVideo: '../contents/video-info/downloadVideo.js',
  createBatchVideo: '../contents/scripts/createBatchVideo.js',
  makeChromeProfile: '../contents/scripts/makeChromeProfile.js',
  createThumbnailFlow: '../contents/video-info/thumbnail/createThumbnailFlow.js',
  summaryMetaFromTranscript: '../contents/scripts/summaryMetaFromTranscript.js',
  uploadYoutubeViaGpm: '../contents/youtube/uploadViaGpm.js',
  updateChannelVideosMeta: '../contents/scripts/updateChannelVideosMeta.js',
  addVisualResource: '../contents/visual-resource/index.js',
};

ipcMain.handle('run-script', async (_event, { script, params = {} }) => {
  if (!script || typeof script !== 'string') throw new Error('script không hợp lệ.');
  if (!SCRIPT_MAP[script]) throw new Error(`Script không được phép: ${script}`);

  activeRunScriptCount += 1;
  beginRunScriptConsoleCapture();

  writeRunnerTerminalLine(`[MaVid] Bắt đầu: ${script}`);

  try {
    const modulePath = SCRIPT_MAP[script];
    const moduleUrl = pathToFileURL(path.join(__dirname, modulePath)).toString();
    const module = await import(`${moduleUrl}?cacheBust=${Date.now()}`);

    const result = await module.default(params);

    writeRunnerTerminalLine('[MaVid] Hoàn thành.');
    return { success: true, data: result };
  } catch (err) {
    const em = err instanceof Error ? err.message : String(err);
    broadcastScriptError(`[MaVid] Lỗi: ${em}`);
    throw err;
  } finally {
    endRunScriptConsoleCapture();
    activeRunScriptCount = Math.max(0, activeRunScriptCount - 1);
  }
});

// --------------- input.txt ---------------

const INPUT_FILE = path.join(ROOT, 'input.txt');

ipcMain.handle('read-input-file', async () => {
  if (!fs.existsSync(INPUT_FILE)) return '';
  return fs.readFileSync(INPUT_FILE, 'utf-8');
});

ipcMain.handle('write-input-file', async (_event, { content }) => {
  if (typeof content !== 'string') throw new Error('content không hợp lệ.');
  fs.writeFileSync(INPUT_FILE, content, 'utf-8');
  return { ok: true };
});

// --------------- Nhóm (màn hình Group — `MaVidMedia/channels/group.json`) ---------------
// resolveChannelsDirFromDisk() — định nghĩa ở dưới (function hoisted).

const GROUP_JSON_BASENAME = 'group.json';

function parseMavidGroupsJson(raw) {
  const j = JSON.parse(raw);
  const items = Array.isArray(j.items) ? j.items : [];
  return {
    items: items
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        id: String(x.id ?? '').trim(),
        name: String(x.name ?? '').trim(),
      }))
      .filter(x => x.id),
  };
}

function readMavidGroupsFile(absPath) {
  try {
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return { items: [] };
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    return parseMavidGroupsJson(raw);
  } catch {
    return { items: [] };
  }
}

ipcMain.handle('get-mavid-groups', async () => {
  const channelsDir = await resolveChannelsDirFromDisk();
  return readMavidGroupsFile(path.join(channelsDir, GROUP_JSON_BASENAME));
});

ipcMain.handle('set-mavid-groups', async (_event, { items }) => {
  if (!Array.isArray(items)) throw new Error('items không hợp lệ.');
  const seen = new Set();
  const norm = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const id = String(it.id ?? '').trim();
    const name = String(it.name ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    norm.push({ id, name });
  }
  const channelsDir = await resolveChannelsDirFromDisk();
  fs.mkdirSync(channelsDir, { recursive: true });
  const absPath = path.join(channelsDir, GROUP_JSON_BASENAME);
  fs.writeFileSync(absPath, JSON.stringify({ version: 1, items: norm }, null, 2), 'utf8');
  return { ok: true };
});

// --------------- Warning (màn hình Warning — `MaVidMedia/channels/warning.json`) ---------------

const WARNING_JSON_BASENAME = 'warning.json';

function parseMavidWarningsJson(raw) {
  const j = JSON.parse(raw);
  const items = Array.isArray(j.items) ? j.items : [];
  return {
    items: items
      .filter(x => x && typeof x === 'object')
      .map(x => ({
        id: String(x.id ?? '').trim(),
        channelLink: String(x.channelLink ?? '').trim(),
        note: String(x.note ?? '').trim(),
      }))
      .filter(x => x.id),
  };
}

function readMavidWarningsFile(absPath) {
  try {
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return { items: [] };
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    return parseMavidWarningsJson(raw);
  } catch {
    return { items: [] };
  }
}

ipcMain.handle('get-mavid-warnings', async () => {
  const channelsDir = await resolveChannelsDirFromDisk();
  return readMavidWarningsFile(path.join(channelsDir, WARNING_JSON_BASENAME));
});

ipcMain.handle('set-mavid-warnings', async (_event, { items }) => {
  if (!Array.isArray(items)) throw new Error('items không hợp lệ.');
  const seen = new Set();
  const norm = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const id = String(it.id ?? '').trim();
    const channelLink = String(it.channelLink ?? '').trim();
    const note = String(it.note ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    norm.push({ id, channelLink, note });
  }
  const channelsDir = await resolveChannelsDirFromDisk();
  fs.mkdirSync(channelsDir, { recursive: true });
  const absPath = path.join(channelsDir, WARNING_JSON_BASENAME);
  fs.writeFileSync(absPath, JSON.stringify({ version: 1, items: norm }, null, 2), 'utf8');
  return { ok: true };
});

// --------------- GPM: thư mục dữ liệu + đọc SQLite Profiles ---------------

let sqlJsPromise = null;

function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const initSqlJs = (await import('sql.js')).default;
      const wasmRoot = path.join(ROOT, 'node_modules', 'sql.js', 'dist');
      return initSqlJs({
        locateFile: file => path.join(wasmRoot, file),
      });
    })();
  }
  return sqlJsPromise;
}

function gpmSettingsPath() {
  return path.join(app.getPath('userData'), 'gpm-settings.json');
}

function readGpmSettings() {
  try {
    const raw = fs.readFileSync(gpmSettingsPath(), 'utf8');
    const j = JSON.parse(raw);
    return {
      dataFolder: typeof j.dataFolder === 'string' && j.dataFolder.trim() ? j.dataFolder.trim() : null,
      browserExe: typeof j.browserExe === 'string' && j.browserExe.trim() ? j.browserExe.trim() : null,
    };
  } catch {
    return { dataFolder: null, browserExe: null };
  }
}

/** @param {{ dataFolder?: string | null; browserExe?: string | null }} updates */
function writeGpmSettings(updates) {
  const cur = readGpmSettings();
  const next = {
    dataFolder: 'dataFolder' in updates ? updates.dataFolder : cur.dataFolder,
    browserExe: 'browserExe' in updates ? updates.browserExe : cur.browserExe,
  };
  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  const obj = {};
  if (next.dataFolder) obj.dataFolder = next.dataFolder;
  if (next.browserExe) obj.browserExe = next.browserExe;
  fs.writeFileSync(gpmSettingsPath(), JSON.stringify(obj, null, 2), 'utf8');
}

function readGpmDataFolder() {
  return readGpmSettings().dataFolder;
}

function writeGpmDataFolder(dataFolder) {
  writeGpmSettings({ dataFolder });
}

function findDbFilesInFolder(folder) {
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) return [];
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.toLowerCase().endsWith('.db'))
    .map(d => path.join(folder, d.name))
    .sort();
}

function resolveProfilesTableName(db) {
  const r = db.exec(`SELECT name FROM sqlite_master WHERE type='table'`);
  if (!r.length || !r[0].values?.length) return null;
  const nameCol = r[0].columns.findIndex(c => String(c).toLowerCase() === 'name');
  const col = nameCol >= 0 ? nameCol : 0;
  for (const row of r[0].values) {
    const t = String(row[col] ?? '');
    if (t.toLowerCase() === 'profiles') return t;
  }
  return null;
}

function cellToString(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  if (v instanceof Uint8Array) return new TextDecoder().decode(v);
  return String(v);
}

function rowToGpmProfile(cols, row) {
  const lower = cols.map(c => String(c).toLowerCase());
  const get = (...names) => {
    for (const n of names) {
      const i = lower.indexOf(n.toLowerCase());
      if (i >= 0) return cellToString(row[i]);
    }
    return '';
  };
  return {
    id: get('id'),
    name: get('name'),
    profilePath: get('profilepath'),
  };
}

async function readProfilesFromDbFile(dbPath) {
  const SQL = await getSqlJs();
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  try {
    const table = resolveProfilesTableName(db);
    if (!table) return [];
    const quoted = `"${String(table).replace(/"/g, '""')}"`;
    const res = db.exec(`SELECT * FROM ${quoted}`);
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map(row => rowToGpmProfile(columns, row));
  } finally {
    db.close();
  }
}

async function loadGpmProfilesFromDbFiles(dbFiles) {
  const byId = new Map();
  for (const file of dbFiles) {
    try {
      const rows = await readProfilesFromDbFile(file);
      for (const row of rows) {
        const key = row.id || `${file}:${row.name}:${row.profilePath}`;
        if (!byId.has(key)) byId.set(key, row);
      }
    } catch (e) {
      console.error('[MaVid] loadGpmProfilesFromDbFiles:', file, e);
    }
  }
  return [...byId.values()];
}

ipcMain.handle('get-gpm-data-folder', async () => ({ path: readGpmDataFolder() }));

ipcMain.handle('select-gpm-browser-exe', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const r = await dialog.showOpenDialog(win ?? undefined, {
    properties: ['openFile'],
    title: 'Chọn trình duyệt GPM (browser.exe hoặc chrome.exe)',
    filters:
      process.platform === 'win32'
        ? [
            { name: 'Executable', extensions: ['exe'] },
            { name: 'Tất cả', extensions: ['*'] },
          ]
        : [{ name: 'Tất cả', extensions: ['*'] }],
  });
  if (r.canceled || !r.filePaths?.length) return { ok: false, cancelled: true };
  const p = r.filePaths[0];
  try {
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return { ok: false, reason: 'not-found' };
  } catch {
    return { ok: false, reason: 'not-found' };
  }
  writeGpmSettings({ browserExe: p });
  return { ok: true, path: p };
});

ipcMain.handle('clear-gpm-browser-exe', async () => {
  writeGpmSettings({ browserExe: null });
  return { ok: true, path: null };
});

ipcMain.handle('select-gpm-data-folder', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const r = await dialog.showOpenDialog(win ?? undefined, {
    properties: ['openDirectory'],
    title: 'Chọn thư mục dữ liệu GPM',
  });
  if (r.canceled || !r.filePaths?.length) return { ok: false, cancelled: true };
  const p = r.filePaths[0];
  writeGpmDataFolder(p);
  return { ok: true, path: p };
});

ipcMain.handle('load-gpm-profiles', async () => {
  const { dataFolder: folder, browserExe } = readGpmSettings();
  if (!folder) {
    return {
      ok: true,
      path: null,
      browserExe,
      profiles: [],
      dbFiles: [],
      message: 'Chưa chọn thư mục dữ liệu GPM.',
    };
  }
  if (!fs.existsSync(folder)) {
    return {
      ok: true,
      path: folder,
      browserExe,
      profiles: [],
      dbFiles: [],
      message: 'Thư mục đã lưu không còn tồn tại.',
    };
  }
  const dbFiles = findDbFilesInFolder(folder);
  if (!dbFiles.length) {
    return {
      ok: true,
      path: folder,
      browserExe,
      profiles: [],
      dbFiles: [],
      message: 'Không tìm thấy file .db trong thư mục đã chọn.',
    };
  }
  const profiles = await loadGpmProfilesFromDbFiles(dbFiles);
  return {
    ok: true,
    path: folder,
    browserExe,
    profiles,
    dbFiles: dbFiles.map(f => path.basename(f)),
    message: null,
  };
});

/** `profileKey` (id UI) → tiến trình `node openGpmPlaywright.js --folder …` */
const gpmPlaywrightFolderChildren = new Map();

function resolveGpmProfileDirectory(gpmRoot, profilePath) {
  if (!profilePath || typeof profilePath !== 'string' || !profilePath.trim()) return null;
  const raw = profilePath.trim();
  let resolved;
  if (path.isAbsolute(raw)) {
    resolved = path.normalize(raw);
  } else {
    if (!gpmRoot || typeof gpmRoot !== 'string' || !gpmRoot.trim()) return null;
    resolved = path.normalize(path.join(gpmRoot.trim(), raw));
  }
  try {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) return null;
  } catch {
    return null;
  }
  return resolved;
}

/** Renderer gọi API Local GPM qua main (không CORS, kể cả khi load file://). */
function registerGpmApiRequestIpc() {
  const ch = 'gpm-api-request';
  try {
    ipcMain.removeHandler(ch);
  } catch {
    /* ignore */
  }
  ipcMain.handle(ch, async (_event, payload) => {
    const rawPath = payload?.path;
    if (typeof rawPath !== 'string' || !rawPath.trim()) {
      return { ok: false, status: 0, bodyText: '', error: 'missing-path' };
    }
    const rel = rawPath.replace(/^\/+/, '');
    const url = `${GPM_API_V3_ROOT}/${rel}`;
    const method = typeof payload?.method === 'string' && payload.method.trim() ? payload.method.trim() : 'GET';
    const h = new Headers();
    h.set('Accept', 'application/json');
    const extra = payload?.headers && typeof payload.headers === 'object' && !Array.isArray(payload.headers) ? payload.headers : {};
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== '') h.set(k, String(v));
    }
    const t = process.env.GPM_API_TOKEN?.trim();
    if (t && !h.has('Authorization')) h.set('Authorization', `Bearer ${t}`);
    try {
      const res = await fetch(url, { method, headers: h });
      const bodyText = await res.text();
      return { ok: res.ok, status: res.status, bodyText };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, status: 0, bodyText: '', error: msg };
    }
  });
}

function registerGpmPlaywrightFolderIpc() {
  const gpmPwChannels = ['gpm-playwright-list-open', 'gpm-playwright-start-folder', 'gpm-playwright-stop-folder'];
  for (const ch of gpmPwChannels) {
    try {
      ipcMain.removeHandler(ch);
    } catch {
      /* ignore */
    }
  }

  ipcMain.handle('gpm-playwright-list-open', async () => ({
    keys: [...gpmPlaywrightFolderChildren.keys()],
  }));

  ipcMain.handle('gpm-playwright-start-folder', async (_event, { gpmRoot, profilePath, profileKey, startUrl }) => {
    const key = typeof profileKey === 'string' && profileKey.trim() ? profileKey.trim() : '';
    if (!key) return { ok: false, reason: 'missing-profile-key' };
    if (gpmPlaywrightFolderChildren.has(key)) return { ok: false, reason: 'already-running' };

    const resolved = resolveGpmProfileDirectory(gpmRoot, profilePath);
    if (!resolved) return { ok: false, reason: 'invalid-profile-path' };

    const scriptPath = path.join(ROOT, 'contents', 'scripts', 'openGpmPlaywright.js');
    if (!fs.existsSync(scriptPath)) return { ok: false, reason: 'script-missing' };

    const url = typeof startUrl === 'string' && startUrl.trim() ? startUrl.trim() : 'https://www.google.com';

    const gpmSt = readGpmSettings();
    const gpmRootTrim = gpmRoot.trim();
    const env = { ...process.env, GPM_DATA_ROOT: gpmRootTrim };
    if (gpmSt.browserExe) env.GPM_CHROMIUM_PATH = gpmSt.browserExe;

    const preferredExe = gpmSt.browserExe?.trim() || process.env.GPM_CHROMIUM_PATH?.trim() || '';
    try {
      resolveGpmChromiumExecutable(resolved, gpmRootTrim, preferredExe || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, reason: 'gpm-browser-not-found', detail: msg };
    }

    const child = spawn('node', [scriptPath, '--folder', resolved, url], {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });
    child.stderr?.on('data', buf => {
      const t = buf.toString().trimEnd();
      if (t) console.error('[openGpmPlaywright]', t);
    });

    child.on('error', err => {
      console.error('[MaVid] gpm-playwright-start-folder:', err);
      gpmPlaywrightFolderChildren.delete(key);
    });
    child.once('exit', (code, signal) => {
      gpmPlaywrightFolderChildren.delete(key);
      if (code !== 0 && code != null) {
        console.warn(`[MaVid] openGpmPlaywright folder exit code=${code} signal=${signal ?? ''}`);
      }
    });

    gpmPlaywrightFolderChildren.set(key, child);
    return { ok: true, resolvedDir: resolved };
  });

  ipcMain.handle('gpm-playwright-stop-folder', async (_event, { profileKey }) => {
    const key = typeof profileKey === 'string' ? profileKey.trim() : '';
    if (!key) return { ok: false, reason: 'missing-profile-key' };
    const child = gpmPlaywrightFolderChildren.get(key);
    if (!child) return { ok: false, reason: 'not-running' };

    try {
      child.kill('SIGTERM');
    } catch (e) {
      console.error('[MaVid] gpm-playwright-stop-folder:', e);
    }

    setTimeout(() => {
      try {
        const c = gpmPlaywrightFolderChildren.get(key);
        if (c === child && !child.killed) {
          killNpmSpawnTree(child);
        }
      } catch {
        /* ignore */
      }
    }, 5000);

    return { ok: true };
  });
}

// --------------- Constants read/write ---------------

/** Bản build đóng gói: settings riêng từng máy (không ghi được vào app.asar). */
const USER_CONSTANTS_JSON_BASENAME = 'mavid-user-constants.json';

function getUserConstantsJsonPath() {
  return path.join(app.getPath('userData'), USER_CONSTANTS_JSON_BASENAME);
}

function loadUserConstantsOverlay() {
  try {
    const p = getUserConstantsJsonPath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[MaVid] Không đọc/parse được mavid-user-constants.json:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Khi import `contents/constants/index.js` thất bại — cùng nguồn với `constantsModuleBase.js`. */
function getDefaultConstantsModule() {
  return buildConstantsModuleBase();
}

function constantsModToUiModel(mod) {
  return { APP_SETTINGS: mod.APP_SETTINGS };
}

function applyDefaultVideoStorageRootToUiModel(model) {
  const m = { ...model };
  const prev = m.APP_SETTINGS && typeof m.APP_SETTINGS === 'object' ? m.APP_SETTINGS : {};
  const AS = { ...prev };
  const root = AS.STORAGE;
  if (typeof root !== 'string' || !root.trim()) {
    AS.STORAGE = getDefaultVideoStorageRoot();
  }
  m.APP_SETTINGS = AS;
  return m;
}

/** Thư mục con trong `MaVidMedia`. */
const VIDEO_STORAGE_CHILD_DIRS = ['backgrounds', 'videos', 'channels'];

async function resolveStockBackgroundsDirFromDisk() {
  const mod = await importConstantsFresh();
  let root = typeof mod.VIDEO_STORAGE_ROOT === 'string' ? mod.VIDEO_STORAGE_ROOT.trim() : '';
  if (!root) root = getDefaultVideoStorageRoot();
  return path.join(root, 'backgrounds');
}

/**
 * Đọc danh sách stock video channels từ assets/visual-resource/stock.
 * Mỗi subfolder chứa mavid-config.json với { channelId, channelName }.
 * @returns {{ id: string, label: string }[]}
 */
function listVisualResourceStockChannels() {
  const stockDir = path.join(ROOT, 'assets', 'visual-resource', 'stock');
  if (!fs.existsSync(stockDir)) return [];

  return fs
    .readdirSync(stockDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const configPath = path.join(stockDir, d.name, 'mavid-config.json');
      if (!fs.existsSync(configPath)) return null;
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return { id: config.channelId || d.name, label: config.channelName || d.name };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function resolveChannelsDirFromDisk() {
  const mod = await importConstantsFresh();
  let root = typeof mod.VIDEO_STORAGE_ROOT === 'string' ? mod.VIDEO_STORAGE_ROOT.trim() : '';
  if (!root) root = getDefaultVideoStorageRoot();
  return path.join(root, 'channels');
}

/**
 * Đường dẫn tuyệt đối trong thư mục kênh (MaVidMedia/channels).
 * UI có thể gửi `channels/index.xlsx` hoặc `index.xlsx` — bỏ tiền tố `channels/`.
 */
async function resolvePathUnderChannelsDir(filePath) {
  const channelsDir = await resolveChannelsDirFromDisk();
  if (path.isAbsolute(filePath)) {
    return { channelsDir, abs: path.normalize(filePath) };
  }
  let rel = String(filePath)
    .replace(/^[/\\]+/, '')
    .replace(/\\/g, '/');
  const prefix = 'channels/';
  if (rel.toLowerCase().startsWith(prefix)) {
    rel = rel.slice(prefix.length);
  }
  return { channelsDir, abs: path.normalize(path.join(channelsDir, rel)) };
}

async function importConstantsFresh() {
  if (!fs.existsSync(CONSTANTS_INDEX_FILE)) {
    throw new Error(`Không tìm thấy: ${CONSTANTS_INDEX_FILE}`);
  }
  let mod;
  try {
    const moduleUrl = pathToFileURL(CONSTANTS_INDEX_FILE).toString();
    mod = await import(`${moduleUrl}?cacheBust=${Date.now()}`);
  } catch (e) {
    console.warn(
      '[MaVid] Không import được contents/constants/index.js. Dùng giá trị fallback trong main cho đến khi sửa lỗi / Lưu settings.',
      e instanceof Error ? e.message : e,
    );
    mod = getDefaultConstantsModule();
  }
  const plain = { ...mod };
  if (app.isPackaged) {
    const overlay = loadUserConstantsOverlay();
    const norm = normalizeUserConstantsOverlay(overlay);
    if (norm?.APP_SETTINGS) {
      plain.APP_SETTINGS = mergeAppSettingsObjects(plain.APP_SETTINGS, norm.APP_SETTINGS);
    }
  }
  return expandAppSettingsIntoModule(plain);
}

async function writeConstantsFiles(nextValues) {
  const payload = {};
  for (const key of OVERLAY_KEYS) {
    if (nextValues[key] !== undefined) payload[key] = nextValues[key];
  }

  if (app.isPackaged) {
    const userPath = getUserConstantsJsonPath();
    fs.mkdirSync(path.dirname(userPath), { recursive: true });
    fs.writeFileSync(userPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
    console.log('[MaVid] Đã lưu settings riêng máy (bản build):', userPath);
    return;
  }

  const userPath = getAppSettingsUserJsonPath();
  fs.mkdirSync(path.dirname(userPath), { recursive: true });
  fs.writeFileSync(userPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  console.log('[MaVid] Đã lưu settings (overlay, không ghi appSettings.js):', userPath);
}

ipcMain.handle('get-constants-ui-model', async () => {
  const mod = await importConstantsFresh();
  return applyDefaultVideoStorageRootToUiModel(constantsModToUiModel(mod));
});

/** Giá trị factory (repo), không overlay user — dùng nút Reset Settings. */
ipcMain.handle('get-constants-factory-ui-model', async () => {
  const mod = buildConstantsModuleBase();
  return applyDefaultVideoStorageRootToUiModel(constantsModToUiModel(mod));
});

ipcMain.handle('save-constants-ui-model', async (_event, { modelPatch }) => {
  if (!modelPatch || typeof modelPatch !== 'object') throw new Error('modelPatch không hợp lệ.');

  const mod = await importConstantsFresh();
  const nextValues = { ...mod };
  for (const key of Object.keys(modelPatch)) {
    if (!OVERLAY_KEYS.includes(key)) continue;
    if (key === 'APP_SETTINGS' && modelPatch.APP_SETTINGS && typeof modelPatch.APP_SETTINGS === 'object') {
      nextValues.APP_SETTINGS = mergeAppSettingsObjects(mod.APP_SETTINGS, modelPatch.APP_SETTINGS);
    } else {
      nextValues[key] = modelPatch[key];
    }
  }

  await writeConstantsFiles(nextValues);
  return { ok: true };
});

/**
 * Chọn thư mục cha (vd. ổ D:\\); tạo `MaVidMedia/backgrounds`, `MaVidMedia/videos`, `MaVidMedia/channels`;
 * ghi `APP_SETTINGS.STORAGE` = đường dẫn tới `MaVidMedia`.
 */
ipcMain.handle('select-video-storage-folder', async (_event, { currentPath } = {}) => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const defaultMaVidRoot = getDefaultVideoStorageRoot();
  let defaultPath = path.dirname(defaultMaVidRoot);
  if (typeof currentPath === 'string' && currentPath.trim()) {
    const cp = path.normalize(currentPath.trim());
    try {
      if (path.basename(cp).toLowerCase() === MAVID_MEDIA_FOLDER.toLowerCase()) {
        defaultPath = path.dirname(cp);
      } else if (fs.existsSync(cp)) {
        defaultPath = cp;
      }
    } catch {
      /* giữ defaultPath */
    }
  }
  try {
    if (!fs.existsSync(defaultPath)) defaultPath = path.dirname(defaultMaVidRoot);
  } catch {
    defaultPath = path.dirname(defaultMaVidRoot);
  }
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn thư mục chứa MaVidMedia',
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths?.length) return { ok: false, path: null };
  const parentDir = path.normalize(r.filePaths[0]);
  const root = path.join(parentDir, MAVID_MEDIA_FOLDER);
  for (const sub of VIDEO_STORAGE_CHILD_DIRS) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
  const mod = await importConstantsFresh();
  const nextValues = {
    ...mod,
    APP_SETTINGS: { ...mod.APP_SETTINGS, STORAGE: root },
  };
  await writeConstantsFiles(nextValues);
  return { ok: true, path: root };
});

// --------------- Backgrounds ---------------

ipcMain.handle('list-backgrounds', async () => {
  const dir = await resolveStockBackgroundsDirFromDisk();
  const localFolders = fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => ({ id: d.name, label: d.name, source: 'local' }))
    : [];

  const stockChannels = listVisualResourceStockChannels().map(ch => ({
    ...ch,
    source: 'stock',
  }));

  return [...localFolders, ...stockChannels].sort((a, b) => a.label.localeCompare(b.label));
});

// --------------- Channel Folders ---------------

ipcMain.handle('list-channel-folders', async () => {
  const channelsDir = await resolveChannelsDirFromDisk();
  if (!fs.existsSync(channelsDir)) return [];
  return fs
    .readdirSync(channelsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));
});

/** Email đã dùng: index.xlsx + cột EMAIL trong mỗi file kênh con (MaVidMedia/channels/<tên>/*.xlsx|.csv). */
ipcMain.handle('list-registered-channel-emails', async () => {
  const channelsDir = await resolveChannelsDirFromDisk();
  const set = new Set();
  const normEmail = e =>
    String(e ?? '')
      .trim()
      .toLowerCase();

  const indexPath = path.join(channelsDir, 'index.xlsx');
  if (fs.existsSync(indexPath)) {
    const data = await readSpreadsheetAsChannelData(indexPath);
    const emailKey = data.headers.find(h => normHeaderCell(h) === 'EMAIL');
    if (emailKey) {
      for (const row of data.rows) {
        const v = normEmail(row[emailKey]);
        if (v) set.add(v);
      }
    }
  }

  if (fs.existsSync(channelsDir)) {
    const subs = fs.readdirSync(channelsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const ent of subs) {
      const dir = path.join(channelsDir, ent.name);
      const names = fs.readdirSync(dir);
      const dataFiles = names
        .filter(f => /\.xlsx$/i.test(f) || /\.csv$/i.test(f))
        .sort((a, b) => {
          const ax = /\.xlsx$/i.test(a);
          const bx = /\.xlsx$/i.test(b);
          if (ax && !bx) return -1;
          if (!ax && bx) return 1;
          return a.localeCompare(b);
        });
      if (dataFiles.length === 0) continue;
      const fullPath = path.join(dir, dataFiles[0]);
      const data = await readSpreadsheetAsChannelData(fullPath);
      const emailKey = data.headers.find(h => normHeaderCell(h) === 'EMAIL');
      if (!emailKey) continue;
      for (const row of data.rows) {
        const v = normEmail(row[emailKey]);
        if (v) set.add(v);
      }
    }
  }

  return [...set].sort((a, b) => a.localeCompare(b));
});

/** Tên preset (`NAME`) từ contents/constants/overlayOptions.js — không import makeVideoFromFull (tránh load GPU/ffmpeg khi mở UI). */
ipcMain.handle('get-overlay-option-names', async () => {
  const modPath = path.join(ROOT, 'contents', 'constants', 'overlayOptions.js');
  if (!fs.existsSync(modPath)) return [];
  try {
    const href = pathToFileURL(modPath).href;
    const mod = await import(`${href}?t=${Date.now()}`);
    const arr = mod.OVERLAY_OPTIONS || [];
    return arr.map(o => String(o.NAME ?? '').trim()).filter(Boolean);
  } catch (e) {
    console.error('[MaVid] get-overlay-option-names:', e);
    return [];
  }
});

// --------------- Stats ---------------

function countFiles(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile()).length;
  } catch {
    return 0;
  }
}

function countDirs(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).length;
  } catch {
    return 0;
  }
}

ipcMain.handle('get-stats', async () => {
  const channelsDir = await resolveChannelsDirFromDisk();
  return {
    channels: countFiles(channelsDir),
    outputs: countFiles(OUTPUTS_DIR) + countDirs(OUTPUTS_DIR),
    downloads: countFiles(DOWNLOADS_DIR) + countDirs(DOWNLOADS_DIR),
  };
});

// --------------- Visual Resource ---------------

ipcMain.handle('list-visual-resources', async () => {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'contents', 'visual-resource', 'getListVisualResources.js')).toString();
  const { default: getListVisualResources } = await import(`${moduleUrl}?cacheBust=${Date.now()}`);
  return getListVisualResources();
});

// --------------- Channels ---------------

ipcMain.handle('list-channels', async () => {
  const channelsDir = await resolveChannelsDirFromDisk();
  if (!fs.existsSync(channelsDir)) return [];
  const entries = fs.readdirSync(channelsDir, { withFileTypes: true });
  return entries
    .filter(d => d.isFile() && (d.name.endsWith('.xlsx') || d.name.endsWith('.csv')))
    .map(d => {
      const fullPath = path.join(channelsDir, d.name);
      const stat = fs.statSync(fullPath);
      return { name: d.name, path: fullPath, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
});

function isPathInsideDir(parentDir, candidatePath) {
  const parent = path.resolve(parentDir) + path.sep;
  const child = path.resolve(candidatePath);
  return child === path.resolve(parentDir) || child.startsWith(parent);
}

function assertSafeChannelFolderName(name) {
  if (name == null || typeof name !== 'string' || !name.trim()) {
    throw new Error('channelFolder không hợp lệ.');
  }
  const t = name.trim();
  if (t.includes('..') || t.includes('/') || t.includes('\\')) {
    throw new Error('Tên channel không hợp lệ.');
  }
  return t;
}

async function readXlsxAsChannelData(absPath) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(absPath);
  } catch {
    return { headers: [], rows: [] };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const headerRow = sheet.getRow(1);

  /** `eachCell` mặc định bỏ ô trống → mảng tiêu đề bị co cột, giá trị lệch (vd. STATUS vào LAST UPLOAD). */
  let maxCol = 0;
  for (let rowNum = 1; rowNum <= sheet.rowCount; rowNum++) {
    sheet.getRow(rowNum).eachCell((cell, colNumber) => {
      if (colNumber > maxCol) maxCol = colNumber;
    });
  }
  if (maxCol < 1) return { headers: [], rows: [] };

  const headers = [];
  for (let c = 1; c <= maxCol; c++) {
    const cell = headerRow.getCell(c);
    const raw = cell.text ?? cell.value;
    const t = raw == null ? '' : String(raw).trim();
    headers.push(t || `Col${c}`);
  }

  const rows = [];
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const obj = {};
    for (let c = 1; c <= maxCol; c++) {
      const key = headers[c - 1] || `Col${c}`;
      const cell = row.getCell(c);
      obj[key] = cell.text ?? cell.value ?? '';
    }
    rows.push(obj);
  }
  return { headers, rows };
}

async function readSpreadsheetAsChannelData(absPath) {
  if (!fs.existsSync(absPath)) return { headers: [], rows: [] };
  const stat = fs.statSync(absPath);
  if (stat.size === 0) return { headers: [], rows: [] };
  const lower = absPath.toLowerCase();
  if (lower.endsWith('.xlsx')) return readXlsxAsChannelData(absPath);
  return { headers: [], rows: [] };
}

function normHeaderCell(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase();
}

/** Khớp constants trong contents/getInfoChannel.js (dropdown index.xlsx). */
const INDEX_VIDEO_TYPE_OPTIONS = ['audio', 'video'];
const INDEX_THOI_GIAN_OPTIONS = [15, 20, 30, 60];

ipcMain.handle('read-channel-data', async (_event, { filePath }) => {
  if (!filePath || typeof filePath !== 'string') throw new Error('FilePath không hợp lệ.');

  const { channelsDir, abs: norm } = await resolvePathUnderChannelsDir(filePath);

  if (!isPathInsideDir(channelsDir, norm)) throw new Error('Truy cập bị từ chối.');

  if (!fs.existsSync(norm)) return { headers: [], rows: [] };
  const st = fs.statSync(norm);
  if (st.size === 0) return { headers: [], rows: [] };

  const raw = await readSpreadsheetAsChannelData(norm);
  // Map Excel headers (tiếng Việt) → camelCase prop names cho frontend
  return raw;
});

/**
 * Ghi lại `channels/index.xlsx` từ dữ liệu UI (giữ sheet "Channels", áp lại data validation).
 */
ipcMain.handle('write-channel-index', async (_event, { filePath, headers, rows }) => {
  if (!filePath || typeof filePath !== 'string') throw new Error('filePath không hợp lệ.');
  const { channelsDir, abs: norm } = await resolvePathUnderChannelsDir(filePath);
  const indexOnly = path.join(channelsDir, 'index.xlsx');
  if (path.resolve(norm) !== path.resolve(indexOnly)) {
    throw new Error('Chỉ được ghi channels/index.xlsx (MaVidMedia/channels).');
  }
  if (!Array.isArray(headers) || headers.length === 0 || !headers.every(h => typeof h === 'string' && h.trim())) {
    throw new Error('headers không hợp lệ.');
  }
  if (!Array.isArray(rows)) throw new Error('rows không hợp lệ.');

  // Reverse-map: prop names → Excel headers (tiếng Việt)
  const mapped = mapIndexDataToHeaders({ headers, rows });
  const excelHeaders = mapped.headers;
  const excelRows = mapped.rows;

  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Channels', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.addRow(excelHeaders);

  for (const row of excelRows) {
    const values = excelHeaders.map(h => {
      const v = row?.[h];
      if (v == null || v === '') return '';
      return typeof v === 'number' ? v : String(v);
    });
    sheet.addRow(values);
  }

  const colWidths = {
    CHANNEL: 45,
    LINK: 60,
    ID: 40,
    EMAIL: 45,
    'KÊNH CỦA TÔI': 36,
    'LOẠI VIDEO': 18,
    'THỜI GIAN VIDEO': 18,
    BACKGROUND: 22,
    'LAST UPLOAD': 30,
    STATUS: 12,
    Group: 28,
  };
  sheet.columns = excelHeaders.map(h => ({ width: colWidths[h] ?? 20 }));

  const typeCol = excelHeaders.findIndex(h => normHeaderCell(h) === normHeaderCell('LOẠI VIDEO')) + 1;
  const thoiGianCol = excelHeaders.findIndex(h => normHeaderCell(h) === normHeaderCell('THỜI GIAN VIDEO')) + 1;
  const bgCol = excelHeaders.findIndex(h => normHeaderCell(h) === normHeaderCell('BACKGROUND')) + 1;
  const statusCol = excelHeaders.findIndex(h => normHeaderCell(h) === normHeaderCell('STATUS')) + 1;

  const backgroundsDir = await resolveStockBackgroundsDirFromDisk();
  let bgOptions = [];
  if (fs.existsSync(backgroundsDir)) {
    bgOptions = fs.readdirSync(backgroundsDir).filter(f => fs.statSync(path.join(backgroundsDir, f)).isDirectory());
  }

  const typeFormula = `"${INDEX_VIDEO_TYPE_OPTIONS.join(',')}"`;
  const thoiGianFormula = `"${INDEX_THOI_GIAN_OPTIONS.join(',')}"`;
  const statusFormula = '"INIT,LIVE,STOPPED"';

  for (let r = 2; r <= sheet.rowCount; r++) {
    if (typeCol > 0) {
      sheet.getRow(r).getCell(typeCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [typeFormula],
      };
    }
    if (thoiGianCol > 0) {
      sheet.getRow(r).getCell(thoiGianCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [thoiGianFormula],
      };
    }
    if (bgCol > 0 && bgOptions.length > 0) {
      const bgFormula = `"${bgOptions.join(',')}"`;
      sheet.getRow(r).getCell(bgCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [bgFormula],
      };
    }
    if (statusCol > 0) {
      sheet.getRow(r).getCell(statusCol).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [statusFormula],
      };
    }
  }

  fs.mkdirSync(channelsDir, { recursive: true });
  await workbook.xlsx.writeFile(norm);
  return { ok: true };
});

ipcMain.handle('read-channel-folder-data', async (_event, { channelFolder }) => {
  const channelsDir = await resolveChannelsDirFromDisk();
  const safe = assertSafeChannelFolderName(channelFolder);
  const dir = path.join(channelsDir, safe);

  if (!isPathInsideDir(channelsDir, dir)) throw new Error('Truy cập bị từ chối.');

  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { headers: [], rows: [], fileName: null, channelFolder: safe };
  }

  const names = fs.readdirSync(dir);
  const dataFiles = names
    .filter(f => /\.xlsx$/i.test(f))
    .sort((a, b) => {
      const ax = /\.xlsx$/i.test(a);
      const bx = /\.xlsx$/i.test(b);
      if (ax && !bx) return -1;
      if (!ax && bx) return 1;
      return a.localeCompare(b);
    });

  if (dataFiles.length === 0) {
    return { headers: [], rows: [], fileName: null, channelFolder: safe };
  }

  const fileName = dataFiles[0];
  const fullPath = path.join(dir, fileName);
  const data = await readSpreadsheetAsChannelData(fullPath);
  return { ...data, fileName, channelFolder: safe };
});

/** Đọc `MaVidMedia/channels/{channelFolder}/mavid-channel-config.json` (null nếu không có / lỗi parse). */
ipcMain.handle('read-mavid-channel-config', async (_event, { channelFolder }) => {
  const channelsDir = await resolveChannelsDirFromDisk();
  const safe = assertSafeChannelFolderName(channelFolder);
  const dir = path.join(channelsDir, safe);
  if (!isPathInsideDir(channelsDir, dir) || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return null;
  }
  const p = path.join(dir, MAVID_CHANNEL_CONFIG_FILENAME);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

/**
 * Ghi merge `patch` vào `MaVidMedia/channels/{channelFolder}/mavid-channel-config.json`.
 * Chỉ cập nhật các khóa được phép (setup từ form); giữ nguyên channelUrl, youtube, createdAt, …
 */
/**
 * @param {string | undefined} e
 * @returns {string}
 */
function _normMavidChannelEmail(e) {
  return String(e ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Cập nhật một dòng `channels[]` từ form: hợp nhất sâu với bản cũ (groupId, lastUpload, …) và không
 * thay toàn bộ mảng bằng một phần tử.
 * @param {object | null} oldCh
 * @param {object} patchCh
 * @param {object} baseRoot
 */
function _mergeMavidConfigChannelRow(oldCh, patchCh, baseRoot) {
  const a = oldCh && typeof oldCh === 'object' ? oldCh : {};
  const b = patchCh && typeof patchCh === 'object' ? patchCh : {};
  const merged = { ...a, ...b };
  if (!_normMavidChannelEmail(merged.email) && _normMavidChannelEmail(a.email)) {
    merged.email = String(a.email).trim();
  }
  const uploadTrackingKeys = ['lastUpload', 'uploadedVideos', 'latestUploadDate', 'latestUploadTime'];
  for (const key of uploadTrackingKeys) {
    if (b[key] === undefined) {
      if (a[key] !== undefined) {
        merged[key] = a[key];
      } else if (baseRoot[key] !== undefined) {
        merged[key] = baseRoot[key];
      } else {
        if (key === 'uploadedVideos') merged[key] = 0;
        else if (key === 'latestUploadTime') merged[key] = '00:00';
        else merged[key] = '';
      }
    }
  }
  return merged;
}

ipcMain.handle('write-mavid-channel-config', async (_event, { channelFolder, patch, mergeFromPreviousEmail }) => {
  const channelsDir = await resolveChannelsDirFromDisk();
  const safe = assertSafeChannelFolderName(channelFolder);
  const dir = path.join(channelsDir, safe);
  if (!isPathInsideDir(channelsDir, dir) || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('Thư mục channel không tồn tại.');
  }
  if (!patch || typeof patch !== 'object') throw new Error('patch không hợp lệ.');
  const p = path.join(dir, MAVID_CHANNEL_CONFIG_FILENAME);
  let base = { version: 1, folderId: safe, channels: [] };
  if (fs.existsSync(p)) {
    try {
      base = { ...base, ...JSON.parse(fs.readFileSync(p, 'utf-8')) };
    } catch {
      throw new Error('File mavid-channel-config.json không đọc được (JSON hỏng).');
    }
  }
  const allowed = ['channels'];
  const clean = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) clean[k] = patch[k];
  }

  if (clean.channels != null) {
    if (!Array.isArray(clean.channels)) throw new Error('channels phải là mảng.');
    for (const ch of clean.channels) {
      if (ch.email != null && typeof ch.email !== 'string') throw new Error('email không hợp lệ.');
      if (ch.videoType != null && ch.videoType !== 'audio' && ch.videoType !== 'video') {
        throw new Error('videoType không hợp lệ.');
      }
      if (ch.durationMinuteFrom != null && (typeof ch.durationMinuteFrom !== 'number' || !Number.isFinite(ch.durationMinuteFrom))) {
        throw new Error('durationMinuteFrom không hợp lệ.');
      }
      if (ch.durationMinuteTo != null && (typeof ch.durationMinuteTo !== 'number' || !Number.isFinite(ch.durationMinuteTo))) {
        throw new Error('durationMinuteTo không hợp lệ.');
      }
      if (ch.background != null && typeof ch.background !== 'string') throw new Error('background không hợp lệ.');
      if (ch.overlay != null && typeof ch.overlay !== 'string') throw new Error('overlay không hợp lệ.');
      if (ch.videosPerDayPreset != null && typeof ch.videosPerDayPreset !== 'string') {
        throw new Error('videosPerDayPreset không hợp lệ.');
      }
      if (ch.publishTimes != null && !Array.isArray(ch.publishTimes)) throw new Error('publishTimes phải là mảng.');
    }

    const oldList = Array.isArray(base.channels) ? [...base.channels] : [];
    const prevNorm =
      typeof mergeFromPreviousEmail === 'string' && _normMavidChannelEmail(mergeFromPreviousEmail)
        ? _normMavidChannelEmail(mergeFromPreviousEmail)
        : null;
    const newList = [...oldList];

    const findIndexForPatch = patchCh => {
      const pNorm = _normMavidChannelEmail(patchCh && patchCh.email);
      if (pNorm) {
        const byNew = newList.findIndex(o => _normMavidChannelEmail(o && o.email) === pNorm);
        if (byNew >= 0) return byNew;
      }
      if (prevNorm) {
        const byPrev = newList.findIndex(o => _normMavidChannelEmail(o && o.email) === prevNorm);
        if (byPrev >= 0) return byPrev;
      }
      if (!pNorm && newList.length === 1) {
        return 0;
      }
      return -1;
    };

    for (const ch of clean.channels) {
      const idx = findIndexForPatch(ch);
      if (idx >= 0) {
        newList[idx] = _mergeMavidConfigChannelRow(newList[idx], ch, base);
      } else {
        newList.push(_mergeMavidConfigChannelRow(null, ch, base));
      }
    }
    clean.channels = newList;
  }

  const next = { ...base, ...clean };
  // Remove root-level upload tracking fields (now inside channels)
  delete next.lastUpload;
  delete next.uploadedVideos;
  delete next.latestUploadDate;
  delete next.latestUploadTime;
  if (typeof next.version !== 'number') next.version = 1;
  fs.writeFileSync(p, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  return { ok: true };
});

/**
 * Đánh dấu START FROM trên một dòng dữ liệu (xóa các dòng khác) — file .xlsx trong `MaVidMedia/channels/{channelFolder}/`.
 * `dataRowIndex`: 0 = dòng đầu sau header (khớp thứ tự `rows` từ read-channel-folder-data).
 */
ipcMain.handle('set-channel-folder-start-from-row', async (_event, { channelFolder, dataRowIndex }) => {
  const channelsDir = await resolveChannelsDirFromDisk();
  const safe = assertSafeChannelFolderName(channelFolder);
  if (typeof dataRowIndex !== 'number' || !Number.isInteger(dataRowIndex) || dataRowIndex < 0) {
    throw new Error('dataRowIndex không hợp lệ.');
  }
  const dir = path.join(channelsDir, safe);
  if (!isPathInsideDir(channelsDir, dir) || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('Thư mục channel không tồn tại.');
  }
  const names = fs.readdirSync(dir);
  const dataFiles = names
    .filter(f => /\.xlsx$/i.test(f) || /\.csv$/i.test(f))
    .sort((a, b) => {
      const ax = /\.xlsx$/i.test(a);
      const bx = /\.xlsx$/i.test(b);
      if (ax && !bx) return -1;
      if (!ax && bx) return 1;
      return a.localeCompare(b);
    });
  if (dataFiles.length === 0) throw new Error('Không có file dữ liệu trong thư mục channel.');
  const fileName = dataFiles[0];
  if (!/\.xlsx$/i.test(fileName)) {
    throw new Error('Chỉ file .xlsx mới đánh dấu được START FROM (CSV chưa hỗ trợ).');
  }
  const fullPath = path.join(dir, fileName);
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(fullPath);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new Error('File Excel không có dữ liệu.');

  let startCol = -1;
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const t = String(cell.text ?? cell.value ?? '')
      .trim()
      .toLowerCase();
    if (t === 'start from') startCol = colNumber;
  });
  if (startCol < 0) throw new Error('Không tìm thấy cột START FROM.');

  const excelRow = dataRowIndex + 2;
  if (excelRow > sheet.rowCount) throw new Error('Dòng không hợp lệ.');

  for (let r = 2; r <= sheet.rowCount; r++) {
    sheet.getRow(r).getCell(startCol).value = null;
  }
  sheet.getRow(excelRow).getCell(startCol).value = 'x';

  await workbook.xlsx.writeFile(fullPath);
  return { ok: true, fileName };
});

// --------------- Window ---------------

async function waitForDevServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res && (res.ok || res.status)) return true;
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setMenuBarVisibility(false);
  mainWindow = win;

  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    await waitForDevServer(VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadURL(pathToFileURL(indexHtml).toString());
  }

  return win;
}

function ensureDevUserConstantsFileExists() {
  if (app.isPackaged) return;
  try {
    const p = getAppSettingsUserJsonPath();
    if (fs.existsSync(p)) return;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, '{}\n', 'utf-8');
    console.log('[MaVid] Đã tạo', p, '(rỗng — chỉnh qua Settings → Lưu để ghi đầy đủ).');
  } catch (e) {
    console.warn('[MaVid] Không tạo được appSettings.user.json:', e instanceof Error ? e.message : e);
  }
}

app.whenReady().then(async () => {
  ensureDevUserConstantsFileExists();
  registerGpmApiRequestIpc();
  registerGpmPlaywrightFolderIpc();
  Menu.setApplicationMenu(null);
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
