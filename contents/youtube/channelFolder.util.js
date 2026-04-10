/**
 * Kiểm tra tên thư mục kênh (MaVidMedia/channels/&lt;id&gt;/).
 * @param {string} name
 */
export function assertSafeChannelFolder(name) {
  if (!name || typeof name !== 'string' || !name.trim()) throw new Error('Thiếu channelFolder (channel id).');
  const t = name.trim();
  if (t.includes('..') || t.includes('/') || t.includes('\\')) throw new Error('Tên thư mục kênh không hợp lệ.');
  return t;
}
