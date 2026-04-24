import { GPM_API_DEFAULT_ORIGIN } from '../constants/gpmApi.js';

/**
 * Tự động tìm GPM Profile ID bằng cách khớp Name Profile = Email trong config.
 * @param {string} email
 * @returns {Promise<string | null>}
 */
export async function resolveGpmProfileIdByEmail(email) {
  if (!email || !email.trim()) return null;
  const normEmail = email.trim().toLowerCase();
  const apiBase = process.env.GPM_API_BASE || GPM_API_DEFAULT_ORIGIN;
  const url = apiBase.replace(/\/+$/, '') + '/profiles?per_page=500';

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      const list = (typeof json.data === 'object' && Array.isArray(json.data.data))
        ? json.data.data
        : (Array.isArray(json.data) ? json.data : []);
      const hit = list.find(
        p =>
          String(p.name || '')
            .trim()
            .toLowerCase() === normEmail,
      );
      return hit?.id || null;
    }
  } catch (e) {
    console.warn(`[gpm] Không thể tự động lấy danh sách profiles từ GPM Local API: ${e.message}`);
  }
  return null;
}
