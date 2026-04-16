import './loadRootEnv.util.js';

/**
 * OAuth2 cho Google Drive API.
 *
 * Cách 1 — file: `oauth-credentials.json` (JSON OAuth Client từ Google Cloud, mục `installed` hoặc `web`).
 * Cách 2 — env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`;
 * redirect: `GOOGLE_REDIRECT_URI` (một URL cố định) hoặc `GOOGLE_OAUTH_PORT` / mặc định cổng 59247.
 *
 * Nếu **không** đặt `GOOGLE_REDIRECT_URI`: app thử lần lượt các cổng `startPort … startPort+N-1` (mặc định 59247–59270)
 * cho đến khi bind được — tránh EADDRINUSE. Trên Google Cloud cần thêm **toàn bộ** URI redirect tương ứng (xem `OAUTH_LOOPBACK_URIS_DOC`).
 *
 * Token lưu `oauth-token.json` (gitignore).
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Cần quyền đủ để tìm/tạo thư mục trong My Drive và upload cây thư mục. */
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(__dirname, 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'oauth-token.json');

/** Cổng bắt đầu khi quét (không có GOOGLE_REDIRECT_URI). */
const DEFAULT_OAUTH_PORT = 59247;
const DEFAULT_REDIRECT_URI = `http://127.0.0.1:${DEFAULT_OAUTH_PORT}`;

/** Số cổng thử tuần tự (59247…59246+N). */
const OAUTH_PORT_SCAN_COUNT = 24;

/** Gợi ý copy vào Google Cloud → Authorized redirect URIs (khi dùng quét cổng, host 127.0.0.1). */
export const OAUTH_LOOPBACK_URIS_DOC = Array.from(
  { length: OAUTH_PORT_SCAN_COUNT },
  (_, i) => `http://127.0.0.1:${DEFAULT_OAUTH_PORT + i}`
);

/**
 * @param {string | undefined} redirectFromCredentialsFile
 * @returns {{ redirectUri: string, redirectFixed: boolean }}
 */
function resolveRedirectOptions(redirectFromCredentialsFile) {
  const full = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  if (full) {
    return { redirectUri: full, redirectFixed: true };
  }
  const p = (process.env.GOOGLE_OAUTH_PORT || '').trim();
  if (p && /^\d+$/.test(p)) {
    return { redirectUri: `http://127.0.0.1:${p}`, redirectFixed: false };
  }
  const fromFile = redirectFromCredentialsFile?.trim();
  if (fromFile) {
    return { redirectUri: fromFile, redirectFixed: false };
  }
  return { redirectUri: DEFAULT_REDIRECT_URI, redirectFixed: false };
}

/**
 * @returns {{ clientId: string, clientSecret: string, redirectUri: string, redirectFixed: boolean } | null}
 */
function loadOAuthConfig() {
  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      const j = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      const c = j.installed || j.web;
      if (c?.client_id && c?.client_secret) {
        const redirects = Array.isArray(c.redirect_uris) ? c.redirect_uris : [];
        const fromFile = redirects[0]?.trim();
        const ro = resolveRedirectOptions(fromFile || undefined);
        return { clientId: c.client_id, clientSecret: c.client_secret, ...ro };
      }
    } catch {
      /* fall through env */
    }
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return null;
  const ro = resolveRedirectOptions(undefined);
  return { clientId, clientSecret, ...ro };
}

/** @param {string} url */
function openBrowser(url) {
  const u = String(url);
  if (process.platform === 'win32') {
    spawn('rundll32', ['url.dll,FileProtocolHandler', u], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [u], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [u], { detached: true, stdio: 'ignore' }).unref();
  }
}

/**
 * @param {string} hostname
 * @param {number} port
 * @returns {Promise<http.Server>}
 */
function listenOAuthServer(hostname, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', err => {
      reject(err);
    });
    server.listen(port, hostname, () => {
      server.removeAllListeners('error');
      resolve(server);
    });
  });
}

/**
 * @param {{ clientId: string, clientSecret: string, redirectUri: string, redirectFixed: boolean }} config
 */
async function authorizeInteractive(config, tokenPath) {
  const { clientId, clientSecret, redirectUri: templateUri, redirectFixed } = config;

  let hostname;
  let startPort;
  try {
    const u = new URL(templateUri);
    hostname = u.hostname;
    startPort = u.port ? Number(u.port) : DEFAULT_OAUTH_PORT;
  } catch {
    throw new Error(`GOOGLE_REDIRECT_URI / redirect không hợp lệ: ${templateUri}`);
  }

  const portsToTry = redirectFixed
    ? [startPort]
    : Array.from({ length: OAUTH_PORT_SCAN_COUNT }, (_, i) => startPort + i);

  let server = /** @type {http.Server | null} */ (null);
  let boundPort = -1;

  for (const p of portsToTry) {
    try {
      server = await listenOAuthServer(hostname, p);
      boundPort = p;
      break;
    } catch (e) {
      const ne = /** @type {NodeJS.ErrnoException} */ (e);
      if (ne.code !== 'EADDRINUSE') {
        throw ne instanceof Error ? ne : new Error(String(ne));
      }
    }
  }

  if (!server || boundPort < 0) {
    const range = `${portsToTry[0]}–${portsToTry[portsToTry.length - 1]}`;
    throw new Error(
      redirectFixed
        ? `Cổng OAuth ${hostname}:${startPort} đang bận. Đổi GOOGLE_REDIRECT_URI / GOOGLE_OAUTH_PORT sang cổng trống và thêm URI đó vào Google Cloud, hoặc bỏ GOOGLE_REDIRECT_URI để app quét cổng ${DEFAULT_OAUTH_PORT}–${DEFAULT_OAUTH_PORT + OAUTH_PORT_SCAN_COUNT - 1}.`
        : `Không bind được cổng nào trong ${range} trên ${hostname}. Giải phóng một cổng hoặc thêm toàn bộ URI http://${hostname}:<cổng> (trong dải) vào Google Cloud → Authorized redirect URIs.`
    );
  }

  const effectiveRedirect = `http://${hostname}:${boundPort}`;
  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: effectiveRedirect,
  });

  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      try {
        const u = new URL(req.url || '/', effectiveRedirect);
        const c = u.searchParams.get('code');
        const err = u.searchParams.get('error');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (c) {
          res.end('<p>Đăng nhập Google thành công. Bạn có thể đóng tab này.</p>');
          server.close(() => resolve(c));
        } else if (err) {
          const desc = u.searchParams.get('error_description') || err;
          res.end(`<p>Lỗi OAuth: ${desc}</p>`);
          server.close(() => reject(new Error(String(desc))));
        } else {
          res.end('<p>Không nhận được mã.</p>');
          server.close(() => reject(new Error('Thiếu mã OAuth (code).')));
        }
      } catch (e) {
        server.close(() => reject(e instanceof Error ? e : new Error(String(e))));
      }
    });

    server.on('error', err => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    const authUrl = oauth2Client.generateAuthUrl({
      response_type: 'code',
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
    openBrowser(authUrl);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(tokenPath, JSON.stringify(tokens), 'utf8');
  return oauth2Client;
}

/**
 * @returns {Promise<OAuth2Client>}
 */
export async function getOAuthClient() {
  const config = loadOAuthConfig();
  if (!config) {
    throw new Error(
      `Thiếu cấu hình OAuth: đặt contents/ggdrive/oauth-credentials.json, hoặc GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET. ` +
        `Redirect: GOOGLE_REDIRECT_URI (một URI cố định) hoặc để trống và thêm các URI ${DEFAULT_OAUTH_PORT}–${DEFAULT_OAUTH_PORT + OAUTH_PORT_SCAN_COUNT - 1} trên 127.0.0.1 vào Google Cloud (xem OAUTH_LOOPBACK_URIS_DOC).`
    );
  }

  if (fs.existsSync(TOKEN_PATH)) {
    const oauth2Client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
    try {
      oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
      await oauth2Client.getAccessToken();
      return oauth2Client;
    } catch {
      try {
        fs.unlinkSync(TOKEN_PATH);
      } catch {
        /* ignore */
      }
    }
  }

  return authorizeInteractive(config, TOKEN_PATH);
}

/**
 * @returns {Promise<import('googleapis').drive_v3.Drive>}
 */
export async function getDrive() {
  const auth = await getOAuthClient();
  return google.drive({ version: 'v3', auth });
}
