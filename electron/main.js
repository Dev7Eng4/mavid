import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const CONSTANTS_DIR = path.join(ROOT, 'contents', 'constants');

const ALLOWED_NPM_SCRIPTS = new Set([
  'tao-chrome-profile',
  'lay-thong-tin-youtube (video, channel)',
  'tao-batch-video-tu-audio',
  'tao-batch-video-reup-full',
  'lam-lai-video',
  'tao-thumbnail-flow',
  'tom-tat-meta-tu-transcript',
]);

let jobRunning = false;

ipcMain.handle('run-npm-script', async (_event, { npmScript }) => {
  if (!npmScript || typeof npmScript !== 'string') {
    throw new Error('npmScript không hợp lệ.');
  }
  if (!ALLOWED_NPM_SCRIPTS.has(npmScript)) {
    throw new Error(`Script không được phép: ${npmScript}`);
  }
  if (jobRunning) {
    throw new Error('Đang có job chạy. Vui lòng chờ kết thúc.');
  }

  jobRunning = true;
  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await new Promise((resolve, reject) => {
      const child = spawn(npmCmd, ['run', npmScript], {
        cwd: ROOT,
        env: process.env,
        stdio: 'inherit',
      });
      child.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`npm script exited with code ${code}`));
      });
      child.on('error', reject);
    });
    return { code: 0 };
  } finally {
    jobRunning = false;
  }
});

function safeResolveConstantsFile(file) {
  if (!file || typeof file !== 'string') throw new Error('File không hợp lệ.');
  // Chỉ cho phép tên file (không path) để tránh traversal.
  if (file.includes('/') || file.includes('\\')) throw new Error('File không hợp lệ.');

  const fullPath = path.join(CONSTANTS_DIR, file);
  const normalized = path.normalize(fullPath);
  if (!normalized.startsWith(path.normalize(CONSTANTS_DIR))) {
    throw new Error('Truy cập file bị từ chối.');
  }
  return fullPath;
}

ipcMain.handle('list-constants-files', async () => {
  if (!fs.existsSync(CONSTANTS_DIR)) return [];
  return fs
    .readdirSync(CONSTANTS_DIR, { withFileTypes: true })
    .filter(d => d.isFile())
    .map(d => d.name);
});

ipcMain.handle('read-constants-file', async (_event, { file }) => {
  const fullPath = safeResolveConstantsFile(file);
  return fs.readFileSync(fullPath, 'utf-8');
});

ipcMain.handle('write-constants-file', async (_event, { file, content }) => {
  const fullPath = safeResolveConstantsFile(file);
  if (typeof content !== 'string') throw new Error('Nội dung không hợp lệ.');
  fs.writeFileSync(fullPath, content, 'utf-8');
  return { ok: true };
});

async function waitForDevServer(url, timeoutMs = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      // Chỉ cần server phản hồi là được.
      if (res && (res.ok || res.status)) return true;
    } catch {
      // Chờ retry.
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return false;
}

async function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Không bật nodeIntegration để an toàn hơn.
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Tắt thanh menu chuẩn (File/Edit/Window/Help...) theo yêu cầu.
  win.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;

  // Dev: load từ Vite server, Prod: load từ dist.
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
    // macOS: nếu không còn window thì mở lại.
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

