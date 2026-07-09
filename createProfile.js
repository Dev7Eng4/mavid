import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { GPM_API_DEFAULT_ORIGIN, GPM_API_VERSION } from './contents/constants/gpmApi.js';

/** Giá trị mặc định khi chạy `node createProfile.js` không truyền tham số. */
export const DEFAULT_CREATE_PROFILE = {
  profileName: 'ABCDER',
  groupName: 'All',
  rawProxy: '',
};

function trimSlash(s) {
  return String(s).replace(/\/+$/, '');
}

function resolveGpmApiV3Root(explicitBase) {
  const raw = trimSlash(explicitBase || process.env.GPM_API_BASE || GPM_API_DEFAULT_ORIGIN).trim();
  // Nếu explicitBase đã có dạng .../api/v3 thì giữ nguyên.
  if (/\/api\/v\d+$/i.test(raw)) return raw;
  const isV2 = GPM_API_VERSION === 'V2';
  return `${raw}/api/${isV2 ? 'v1' : 'v3'}`;
}

function gpmHeaders() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const t = process.env.GPM_API_TOKEN?.trim();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function fetchLike(url, init) {
  // Node 18+ có fetch sẵn; Node 16 thì không.
  if (typeof fetch === 'function') {
    return fetch(url, init);
  }

  const u = new URL(url);
  const isHttps = u.protocol === 'https:';
  const lib = isHttps ? https : http;

  const headers = init?.headers ?? {};
  const method = init?.method ?? 'GET';
  const body = init?.body;

  const result = await new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method,
        headers,
      },
      res => {
        res.setEncoding('utf8');
        let out = '';
        res.on('data', chunk => {
          out += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, text: out }));
      }
    );

    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });

  return {
    status: result.statusCode,
    text: async () => result.text,
  };
}

/**
 * Tạo profile GPM qua Local API.
 *
 * POST /api/v3/profiles/create
 * Body: { profile_name, group_name, raw_proxy, ...extra }
 *
 * @param {object} params
 * @param {string} params.profileName - Tên profile (bắt buộc)
 * @param {string} [params.groupName='All'] - Nhóm profile
 * @param {string} [params.rawProxy=''] - Proxy raw (vd: socks5://IP:Port:User:Pass)
 * @param {object} [params.extra={}] - Các field nâng cao khác do API hỗ trợ
 * @param {string} [params.apiBase] - Override base API (origin hoặc đã có /api/v3)
 * @returns {Promise<object>} - data từ response (vd: id, profile_path, ...)
 */
export async function createGpmProfile({ profileName, groupName = 'All', rawProxy = '', extra = {}, apiBase } = {}) {
  if (!profileName || typeof profileName !== 'string') {
    throw new Error('createGpmProfile: cần profileName (string).');
  }

  const root = resolveGpmApiV3Root(apiBase);
  const url = `${root}/profiles/create`;

  const body = {
    profile_name: profileName,
    group_name: groupName,
    raw_proxy: rawProxy,
    ...(extra && typeof extra === 'object' ? extra : {}),
  };

  const res = await fetchLike(url, {
    method: 'POST',
    headers: gpmHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`GPM API không trả JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!json || typeof json !== 'object' || !json.success) {
    const msg = json?.message || `GPM create profile thất bại (${res.status}).`;
    throw new Error(msg);
  }

  if (!json.data || typeof json.data !== 'object') {
    throw new Error('GPM API: thiếu `data` trong response create profile.');
  }

  return json.data;
}

async function main() {
  const profileName = process.argv[2] || DEFAULT_CREATE_PROFILE.profileName;
  const groupName = process.argv[3] ?? DEFAULT_CREATE_PROFILE.groupName;
  const rawProxy = process.argv[4] ?? DEFAULT_CREATE_PROFILE.rawProxy;

  if (!process.argv[2]) {
    console.log(`Dùng giá trị mặc định: profileName="${profileName}", groupName="${groupName}", rawProxy="${rawProxy}"`);
  }

  const data = await createGpmProfile({ profileName, groupName, rawProxy });
  const id = data?.id ?? '(no id)';
  const name = data?.name ?? '(no name)';
  const profilePath = data?.profile_path ?? '';
  console.log(`Đã tạo profile: id=${id} name=${name}${profilePath ? ` profile_path=${profilePath}` : ''}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch(err => {
    console.error(err?.message || err);
    process.exit(1);
  });
}

export default createGpmProfile;
