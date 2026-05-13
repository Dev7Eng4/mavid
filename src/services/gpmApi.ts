/**
 * Client gọi GPM Local API v3 (trình duyệt đang chạy, API bật mặc định port 19995).
 * - **Electron**: gọi qua `window.runner.gpmApiRequest` (main process, không CORS).
 * - **Chỉ Vite dev**: dùng proxy `/gpm-proxy` → `127.0.0.1:19995` (cùng origin với localhost:5173).
 * @see https://docs.gpmloginapp.com/api-document/mo-profile
 */

import { GPM_API_DEFAULT_ORIGIN, GPM_API_VERSION } from '@contents/constants/gpmApi.js';

export const GPM_API_V3_DEFAULT_BASE = GPM_API_DEFAULT_ORIGIN;

export class GpmApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown = undefined) {
    super(message);
    this.name = 'GpmApiError';
    this.status = status;
    this.body = body;
  }
}

export interface GpmApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface GpmStartProfileData {
  remote_debugging_address?: string;
  remote_debugging_port?: number;
  profile_id?: string;
}

/** Query GET `profiles` — ví dụ `?group=Ebay&page=1&per_page=100`. */
export type GpmProfilesListQuery = Partial<{
  group: string;
  page: number | string;
  per_page: number | string;
  search: string;
  sort: string;
}>;

export interface GpmApiClientOptions {
  /** Mặc định {@link GPM_API_V3_DEFAULT_BASE}; có thể ghi đè bằng `VITE_GPM_API_BASE`. */
  baseUrl?: string;
  /** Bearer khi bật khóa API Local; hoặc `VITE_GPM_API_TOKEN`. */
  token?: string | null;
  fetchImpl?: typeof fetch;
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function joinApiPath(baseUrl: string, path: string): string {
  const b = trimSlash(baseUrl);
  const p = path.replace(/^\/+/, '');
  return `${b}/${p}`;
}

function viteEnv(key: 'VITE_GPM_API_BASE' | 'VITE_GPM_API_TOKEN'): string | undefined {
  const v = import.meta.env[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function buildDefaultHeaders(token: string | null | undefined): Headers {
  const h = new Headers({ Accept: 'application/json' });
  const t = token?.trim() || viteEnv('VITE_GPM_API_TOKEN');
  if (t) h.set('Authorization', `Bearer ${t}`);
  return h;
}

function isGpmElectronBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.runner?.gpmApiRequest === 'function';
}

function assertSuccess<T>(json: unknown, status: number): GpmApiEnvelope<T> {
  if (!json || typeof json !== 'object') {
    throw new GpmApiError('GPM API trả dữ liệu không hợp lệ', status, json);
  }
  const o = json as GpmApiEnvelope<T>;
  if (!o.success) {
    throw new GpmApiError(o.message || `GPM API lỗi (${status})`, status, o);
  }
  return o;
}

function parseJsonBody(text: string, status: number): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GpmApiError(`GPM API không trả JSON (${status}): ${text.slice(0, 200)}`, status, text);
  }
}

/**
 * Factory client — dùng trong renderer (Vite). Có thể tạo nhiều instance (base/token khác nhau).
 */
export function createGpmApiClient(options: GpmApiClientOptions = {}) {
  const envBase = viteEnv('VITE_GPM_API_BASE');
  const explicitBase = options.baseUrl ?? envBase;
  const canonicalBase = trimSlash(explicitBase ?? GPM_API_V3_DEFAULT_BASE);
  /** Base dùng cho `fetch` trực tiếp (không qua Electron): dev + không ghi đè URL → proxy Vite. */
  const fetchBaseUrl =
    explicitBase != null
      ? trimSlash(explicitBase)
      : import.meta.env.DEV && typeof window !== 'undefined'
        ? `${window.location.origin}/gpm-proxy/api/v3`
        : canonicalBase;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function requestJson<T>(path: string, init?: RequestInit): Promise<GpmApiEnvelope<T>> {
    const headers = buildDefaultHeaders(options.token ?? null);
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }
    const method = init?.method ?? 'GET';

    let status: number;
    let text: string;

    if (isGpmElectronBridgeAvailable()) {
      const r = await window.runner.gpmApiRequest({
        path,
        method,
        headers: Object.fromEntries(headers.entries()),
      });
      if (r.error && r.bodyText === '') {
        throw new GpmApiError(r.error, r.status || 0);
      }
      status = r.status;
      text = r.bodyText;
    } else {
      const url = joinApiPath(fetchBaseUrl, path);
      const res = await fetchImpl(url, { ...init, method, headers });
      status = res.status;
      text = await res.text();
    }

    const json = parseJsonBody(text, status);
    return assertSuccess<T>(json, status);
  }

  return {
    /** URL API thật (hiển thị / tài liệu); traffic có thể đi qua proxy hoặc IPC. */
    getBaseUrl: () => canonicalBase,

    /** GET `profiles` — ví dụ đầy đủ: `profiles?group=Ebay&page=1&per_page=100`. */
    listProfiles(query: GpmProfilesListQuery = {}) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== '') q.set(k, String(v));
      }
      const qs = q.toString();
      const p = qs ? `profiles?${qs}` : 'profiles';
      return requestJson<unknown>(p);
    },

    /** GET `profiles/start/{id}` — mở profile (GPM khởi chạy browser, trả CDP). */
    startProfile(
      profileId: string,
      query: Partial<{
        win_scale: string | number;
        win_pos: string;
        win_size: string;
        addination_args: string;
      }> = {},
    ) {
      const id = encodeURIComponent(profileId);
      const q = new URLSearchParams();
      if (query.win_scale != null) q.set('win_scale', String(query.win_scale));
      if (query.win_pos) q.set('win_pos', query.win_pos);
      if (query.win_size) q.set('win_size', query.win_size);
      if (query.addination_args) q.set('addination_args', query.addination_args);
      const qs = q.toString();
      const p = qs ? `profiles/start/${id}?${qs}` : `profiles/start/${id}`;
      return requestJson<GpmStartProfileData>(p);
    },

    /** Đóng profile trong GPM. */
    // closeProfile(profileId: string) {
    //   const id = encodeURIComponent(profileId);
    //   const endpoint = GPM_API_VERSION === 'V2' ? 'stop' : 'close';
    //   return requestJson<unknown>(`profiles/${endpoint}/${id}`);
    // },
  };
}

export type GpmApiClient = ReturnType<typeof createGpmApiClient>;

/** Client mặc định (base + token từ env Vite nếu có). */
export const gpmApi = createGpmApiClient();

/**
 * Chuẩn hóa `remote_debugging_address` (vd. `127.0.0.1:53378`) thành URL cho Playwright `connectOverCDP`.
 */
export function gpmRemoteDebuggingToCdpUrl(addr: string): string {
  const a = addr.trim();
  if (!a) return '';
  if (a.startsWith('http://') || a.startsWith('https://')) return a.replace(/\/+$/, '');
  return `http://${a}`;
}
