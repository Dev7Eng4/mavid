import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const CONSTANTS_DIR = path.join(ROOT, 'contents', 'constants');
const CONSTANTS_INDEX_FILE = path.join(CONSTANTS_DIR, 'index.js');
const CHANNELS_DIR = path.join(ROOT, 'channels');
const OUTPUTS_DIR = path.join(ROOT, 'outputs');
const DOWNLOADS_DIR = path.join(ROOT, 'downloads');
const BACKGROUNDS_DIR = path.join(ROOT, 'assets', 'backgrounds');

let mainWindow = null;

// --------------- Script runner ---------------

const ALLOWED_NPM_SCRIPTS = new Set([
  'tao-chrome-profile',
  'lay-thong-tin-youtube (video, channel)',
  'tao-batch-video-tu-audio',
  'tao-batch-video-reup-full',
  'tao-thumbnail-flow',
  'tom-tat-meta-tu-transcript',
]);

let jobRunning = false;

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
    } catch { /* ignore */ }
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

ipcMain.handle('run-npm-script', async (_event, { npmScript, extraEnv }) => {
  if (!npmScript || typeof npmScript !== 'string') throw new Error('npmScript không hợp lệ.');
  if (!ALLOWED_NPM_SCRIPTS.has(npmScript)) throw new Error(`Script không được phép: ${npmScript}`);
  if (jobRunning) throw new Error('Đang có job chạy. Vui lòng chờ kết thúc.');

  jobRunning = true;
  npmRunUserCancelled = false;

  function sendLog(line) {
    process.stdout.write(`[log] ${line}\n`);
    try {
      const wins = BrowserWindow.getAllWindows();
      for (const w of wins) {
        if (!w.isDestroyed()) w.webContents.send('script-log', line);
      }
    } catch { /* window closed */ }
  }

  sendLog(`[MaVid] Bắt đầu: npm run ${npmScript}`);

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
        for (const l of lines) if (l.trim()) sendLog(l);
      });

      child.stderr.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const l of lines) if (l.trim()) sendLog(`[stderr] ${l}`);
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
      sendLog('[MaVid] Đã dừng theo yêu cầu (tiến trình npm đã kết thúc).');
      return { code: code, cancelled: true };
    }

    if (code !== 0) {
      sendLog(`[MaVid] Script kết thúc với code ${code}`);
      throw new Error(`npm script exited with code ${code}`);
    }

    sendLog('[MaVid] Hoàn thành.');
    return { code: 0, cancelled: false };
  } finally {
    jobRunning = false;
    npmChildProcess = null;
    npmRunUserCancelled = false;
  }
});

// --------------- Direct Script Runner ---------------

const SCRIPT_MAP = {
  getInfoChannel: '../contents/getInfoChannel.js',
  downloadVideo: '../contents/downloadVideo.js',
  createBatchVideo: '../contents/scripts/createBatchVideo.js',
  makeChromeProfile: '../contents/scripts/makeChromeProfile.js',
  createThumbnailFlow: '../contents/scripts/createThumbnailFlow.js',
  summaryMetaFromTranscript: '../contents/scripts/summaryMetaFromTranscript.js',
};

ipcMain.handle('run-script', async (_event, { script, params = {} }) => {
  if (!script || typeof script !== 'string') throw new Error('script không hợp lệ.');
  if (!SCRIPT_MAP[script]) throw new Error(`Script không được phép: ${script}`);
  if (jobRunning) throw new Error('Đang có job chạy. Vui lòng chờ kết thúc.');

  jobRunning = true;

  function sendLog(line) {
    process.stdout.write(`[log] ${line}\n`);
    try {
      const wins = BrowserWindow.getAllWindows();
      for (const w of wins) {
        if (!w.isDestroyed()) w.webContents.send('script-log', line);
      }
    } catch { /* window closed */ }
  }

  // Intercept console.log/warn/error
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => {
    const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    sendLog(line);
    originalLog.apply(console, args);
  };
  console.warn = (...args) => {
    const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    sendLog(`[warn] ${line}`);
    originalWarn.apply(console, args);
  };
  console.error = (...args) => {
    const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    sendLog(`[error] ${line}`);
    originalError.apply(console, args);
  };

  sendLog(`[MaVid] Bắt đầu: ${script}`);

  try {
    const modulePath = SCRIPT_MAP[script];
    const moduleUrl = pathToFileURL(path.join(__dirname, modulePath)).toString();
    const module = await import(`${moduleUrl}?cacheBust=${Date.now()}`);
    
    const result = await module.default(params);
    
    sendLog('[MaVid] Hoàn thành.');
    return { success: true, data: result };
  } catch (err) {
    sendLog(`[MaVid] Lỗi: ${err.message}`);
    throw err;
  } finally {
    // Restore console
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    jobRunning = false;
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

// --------------- Constants read/write ---------------

const CONSTANT_EXPORT_KEYS = [
  'MAKE_VIDEO_MODE', 'VIDEO_TYPE', 'flowSettings', 'GEMINI_CONFIG',
  'GEMINI_CHUNK_SIZE', 'LANGUAGES_NEED_UPDATE_TRANSCRIPT', 'META_DATA',
  'DEFAULT_VIDEO', 'AUDIO_SPEED', 'STOCK_VIDEO', 'SUBTITLE', 'LOGO',
];

async function importConstantsFresh() {
  if (!fs.existsSync(CONSTANTS_INDEX_FILE)) {
    throw new Error(`Không tìm thấy: ${CONSTANTS_INDEX_FILE}`);
  }
  const moduleUrl = pathToFileURL(CONSTANTS_INDEX_FILE).toString();
  return import(`${moduleUrl}?cacheBust=${Date.now()}`);
}

ipcMain.handle('get-constants-ui-model', async () => {
  const mod = await importConstantsFresh();
  const model = {};
  for (const key of CONSTANT_EXPORT_KEYS) model[key] = mod[key];
  return model;
});

ipcMain.handle('save-constants-ui-model', async (_event, { modelPatch }) => {
  if (!modelPatch || typeof modelPatch !== 'object') throw new Error('modelPatch không hợp lệ.');

  const mod = await importConstantsFresh();
  const nextValues = { ...mod };
  for (const key of Object.keys(modelPatch)) {
    if (!CONSTANT_EXPORT_KEYS.includes(key)) continue;
    nextValues[key] = modelPatch[key];
  }

  const header = `// Auto-generated by MaVid UI (edit settings)\n// File path: contents/constants/index.js\n\n`;
  const body = CONSTANT_EXPORT_KEYS.map(name => {
    return `export const ${name} = ${JSON.stringify(nextValues[name], null, 2)};`;
  }).join('\n\n');

  fs.writeFileSync(CONSTANTS_INDEX_FILE, header + body + '\n', 'utf-8');
  return { ok: true };
});

// --------------- Backgrounds ---------------

ipcMain.handle('list-backgrounds', async () => {
  if (!fs.existsSync(BACKGROUNDS_DIR)) return [];
  return fs.readdirSync(BACKGROUNDS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));
});

// --------------- Channel Folders ---------------

ipcMain.handle('list-channel-folders', async () => {
  if (!fs.existsSync(CHANNELS_DIR)) return [];
  return fs.readdirSync(CHANNELS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b));
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
  } catch { return 0; }
}

function countDirs(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).length;
  } catch { return 0; }
}

ipcMain.handle('get-stats', async () => {
  return {
    channels: countFiles(CHANNELS_DIR),
    outputs: countFiles(OUTPUTS_DIR) + countDirs(OUTPUTS_DIR),
    downloads: countFiles(DOWNLOADS_DIR) + countDirs(DOWNLOADS_DIR),
  };
});

// --------------- Channels ---------------

ipcMain.handle('list-channels', async () => {
  if (!fs.existsSync(CHANNELS_DIR)) return [];
  const entries = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true });
  return entries
    .filter(d => d.isFile() && (d.name.endsWith('.xlsx') || d.name.endsWith('.csv')))
    .map(d => {
      const fullPath = path.join(CHANNELS_DIR, d.name);
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
  const headers = [];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNum) => {
    headers[colNum - 1] = cell.text || `Col${colNum}`;
  });
  const rows = [];
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const obj = {};
    row.eachCell((cell, colNum) => {
      const key = headers[colNum - 1] || `Col${colNum}`;
      obj[key] = cell.text ?? cell.value;
    });
    rows.push(obj);
  });
  return { headers: headers.filter(Boolean), rows };
}

function readCsvAsChannelData(absPath) {
  try {
    const content = fs.readFileSync(absPath, 'utf-8').replace(/^\uFEFF/, '');
    const lines = content.split(/\n/).map(l => l.trimEnd()).filter(l => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseLine = line => line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const headers = parseLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? '';
      });
      rows.push(obj);
    }
    return { headers, rows };
  } catch {
    return { headers: [], rows: [] };
  }
}

async function readSpreadsheetAsChannelData(absPath) {
  if (!fs.existsSync(absPath)) return { headers: [], rows: [] };
  const stat = fs.statSync(absPath);
  if (stat.size === 0) return { headers: [], rows: [] };
  const lower = absPath.toLowerCase();
  if (lower.endsWith('.csv')) return readCsvAsChannelData(absPath);
  if (lower.endsWith('.xlsx')) return readXlsxAsChannelData(absPath);
  return { headers: [], rows: [] };
}

function normHeaderCell(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase();
}

/** Khớp constants trong contents/getInfoChannel.js (dropdown index.xlsx). */
const INDEX_VIDEO_TYPE_OPTIONS = ['from_audio', 'reup_full'];
const INDEX_THOI_GIAN_OPTIONS = [15, 20, 30, 60];

ipcMain.handle('read-channel-data', async (_event, { filePath }) => {
  if (!filePath || typeof filePath !== 'string') throw new Error('filePath không hợp lệ.');

  const norm = path.isAbsolute(filePath) ? path.normalize(filePath) : path.normalize(path.join(ROOT, filePath));

  if (!isPathInsideDir(CHANNELS_DIR, norm)) throw new Error('Truy cập bị từ chối.');

  if (!fs.existsSync(norm)) return { headers: [], rows: [] };
  const st = fs.statSync(norm);
  if (st.size === 0) return { headers: [], rows: [] };

  return readSpreadsheetAsChannelData(norm);
});

/**
 * Ghi lại `channels/index.xlsx` từ dữ liệu UI (giữ sheet "Channels", áp lại data validation).
 */
ipcMain.handle('write-channel-index', async (_event, { filePath, headers, rows }) => {
  if (!filePath || typeof filePath !== 'string') throw new Error('filePath không hợp lệ.');
  const norm = path.isAbsolute(filePath) ? path.normalize(filePath) : path.normalize(path.join(ROOT, filePath));
  const indexOnly = path.join(CHANNELS_DIR, 'index.xlsx');
  if (path.resolve(norm) !== path.resolve(indexOnly)) {
    throw new Error('Chỉ được ghi channels/index.xlsx.');
  }
  if (!Array.isArray(headers) || headers.length === 0 || !headers.every(h => typeof h === 'string' && h.trim())) {
    throw new Error('headers không hợp lệ.');
  }
  if (!Array.isArray(rows)) throw new Error('rows không hợp lệ.');

  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Channels', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.addRow(headers);

  for (const row of rows) {
    const values = headers.map(h => {
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
    'LOẠI VIDEO': 18,
    'THỜI GIAN VIDEO': 18,
    BACKGROUND: 22,
    'LAST UPLOAD': 30,
  };
  sheet.columns = headers.map(h => ({ width: colWidths[h] ?? 20 }));

  const typeCol = headers.findIndex(h => normHeaderCell(h) === normHeaderCell('LOẠI VIDEO')) + 1;
  const thoiGianCol = headers.findIndex(h => normHeaderCell(h) === normHeaderCell('THỜI GIAN VIDEO')) + 1;
  const bgCol = headers.findIndex(h => normHeaderCell(h) === normHeaderCell('BACKGROUND')) + 1;

  let bgOptions = [];
  if (fs.existsSync(BACKGROUNDS_DIR)) {
    bgOptions = fs.readdirSync(BACKGROUNDS_DIR).filter(f => fs.statSync(path.join(BACKGROUNDS_DIR, f)).isDirectory());
  }

  const typeFormula = `"${INDEX_VIDEO_TYPE_OPTIONS.join(',')}"`;
  const thoiGianFormula = `"${INDEX_THOI_GIAN_OPTIONS.join(',')}"`;

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
  }

  fs.mkdirSync(CHANNELS_DIR, { recursive: true });
  await workbook.xlsx.writeFile(norm);
  return { ok: true };
});

/** Đọc file .xlsx hoặc .csv đầu tiên (ưu tiên .xlsx) trong `channels/{channelFolder}/`. */
ipcMain.handle('read-channel-folder-data', async (_event, { channelFolder }) => {
  const safe = assertSafeChannelFolderName(channelFolder);
  const dir = path.join(CHANNELS_DIR, safe);
  if (!isPathInsideDir(CHANNELS_DIR, dir)) throw new Error('Truy cập bị từ chối.');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { headers: [], rows: [], fileName: null, channelFolder: safe };
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
  if (dataFiles.length === 0) {
    return { headers: [], rows: [], fileName: null, channelFolder: safe };
  }
  const fileName = dataFiles[0];
  const fullPath = path.join(dir, fileName);
  const data = await readSpreadsheetAsChannelData(fullPath);
  return { ...data, fileName, channelFolder: safe };
});

/**
 * Đánh dấu START FROM trên một dòng dữ liệu (xóa các dòng khác) — file .xlsx trong `channels/{channelFolder}/`.
 * `dataRowIndex`: 0 = dòng đầu sau header (khớp thứ tự `rows` từ read-channel-folder-data).
 */
ipcMain.handle('set-channel-folder-start-from-row', async (_event, { channelFolder, dataRowIndex }) => {
  const safe = assertSafeChannelFolderName(channelFolder);
  if (typeof dataRowIndex !== 'number' || !Number.isInteger(dataRowIndex) || dataRowIndex < 0) {
    throw new Error('dataRowIndex không hợp lệ.');
  }
  const dir = path.join(CHANNELS_DIR, safe);
  if (!isPathInsideDir(CHANNELS_DIR, dir) || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
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
    } catch { /* retry */ }
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

  win.on('closed', () => { mainWindow = null; });

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

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
