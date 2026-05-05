/**
 * Parse phản hồi theo format prompt tạo meta (niche / title / description / tags).
 */
import { META_DATA } from '../constants/index.js';
import { stripJsonCodeFence } from '../gemini/browser.util.js';

/**
 * Parse phản hồi đúng theo # Output Format trong promptCreateVideoMeta:
 * Niche → Title → Description → Tags (mỗi nhãn nằm trên 1 dòng riêng, nội dung phía dưới).
 */
export function parseCreateMetaInfoResponse(metaRaw) {
  let text = String(metaRaw || '').trim();
  text = stripJsonCodeFence(text);

  const L = META_DATA;
  const labels = [
    { key: 'niche', label: L.NICHE },
    { key: 'title', label: L.TITLE },
    { key: 'description', label: L.DESCRIPTION },
    { key: 'tags', label: L.TAGS },
  ];

  const positions = [];
  for (const { key, label } of labels) {
    const re = new RegExp(`^${label}\\s*$`, 'im');
    const m = re.exec(text);
    if (m) positions.push({ key, start: m.index, contentStart: m.index + m[0].length });
  }
  positions.sort((a, b) => a.start - b.start);

  const result = { niche: '', title: '', description: '', tags: '' };
  for (let i = 0; i < positions.length; i++) {
    const end = i < positions.length - 1 ? positions[i + 1].start : text.length;
    result[positions[i].key] = text.slice(positions[i].contentStart, end).trim();
  }
  return result;
}
