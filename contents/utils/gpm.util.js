/**
 * Tự động tìm GPM Profile ID bằng cách khớp Name Profile = Email trong config.
 * @param {string} email
 * @returns {Promise<string | null>}
 */
export async function resolveGpmProfileIdByEmail(email) {
  if (!email || !email.trim()) return null;
  const normEmail = email.trim().toLowerCase();
  const apiBase = process.env.GPM_API_BASE || 'http://127.0.0.1:19995';
  const url = apiBase.replace(/\/+$/, '') + '/api/v3/profiles?per_page=500';

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const hit = json.data.find(
        p =>
          String(p.name || '')
            .trim()
            .toLowerCase() === normEmail
      );
      return hit?.id || null;
    }
  } catch (e) {
    console.warn(`[gpm] Không thể tự động lấy danh sách profiles từ GPM Local API: ${e.message}`);
  }
  return null;
}
