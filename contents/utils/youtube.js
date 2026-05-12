/**
 * Trích video ID YouTube (11 ký tự) từ URL.
 * @param {string} url
 * @returns {string|null}
 */
export function extractYoutubeVideoId(url) {
  const s = String(url ?? '').trim();
  if (!s) return null;
  const m = s.match(/(?:[?&]v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
