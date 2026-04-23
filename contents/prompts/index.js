import { DEFAULT_PROMPT_LANG } from '../constants/defaultPromptLang.js';

/**
 * Tên hàm export trong createImage.js cần ảnh tham chiếu (Flow attach thumbnail).
 * Trùng cách cũ: `ja2CHFromOldThumbnail` → `promptToCreateThumbnailSukatto`.
 */
export const PROMPTS_NEED_IMAGE = ['promptToCreateThumbnailSukatto'];

/**
 * Key cũ trong `mavid-channel-config` / bản `PROMPTS_CREATE_THUMBNAIL` (đã bỏ) → tên export thực trong `createImage.js`.
 * Ví dụ cấu hình vẫn lưu `jaLoveStory` trong khi UI mới dùng `promptToCreateThumbnailLove`.
 */
export const THUMBNAIL_PROMPT_KEY_ALIASES = {
  jaLoveStory: 'promptToCreateThumbnailLove',
  ja2CHFromOldThumbnail: 'promptToCreateThumbnailSukatto',
  jaSukattoImage: 'promptToCreateThumbnailSukatto',
  jaSukattoFullText: 'promptToCreateThumbnailSukattoFulLText',
  ja2CHOnlyText: 'createPromptToCreateThumbnailOnlyTextFromImage',
};

/**
 * @param {Record<string, unknown>} prompts - kết quả `loadPromptByLanguage` (createImage + createVideoInfo)
 * @param {string|null|undefined} styleKey - rỗng = tự động (`promptToCreateThumbnail`); hoặc tên export, vd. `promptToCreateThumbnailLove`
 * @returns {{ build: (title: string, summary: string) => string, isNeedImage: boolean, usedStyleKey: string, didFallback: boolean }}
 */
export function resolveThumbnailPromptBuilder(prompts, styleKey) {
  const raw = String(styleKey ?? '').trim();
  const def = prompts.promptToCreateThumbnail;
  if (typeof def !== 'function') {
    throw new Error('resolveThumbnailPromptBuilder: thiếu hàm promptToCreateThumbnail trong gói ngôn ngữ');
  }
  if (!raw) {
    return { build: def, isNeedImage: false, usedStyleKey: '', didFallback: false };
  }
  const k = THUMBNAIL_PROMPT_KEY_ALIASES[raw] || raw;
  const candidate = prompts[k];
  if (typeof candidate === 'function') {
    return {
      build: /** @type {(title: string, summary: string) => string} */ (candidate),
      isNeedImage: PROMPTS_NEED_IMAGE.includes(k),
      usedStyleKey: k,
      didFallback: false,
    };
  }
  console.warn(
    `[thumbnail] Style "${raw}" (→ "${k}") không có trong gói createImage (hoặc không phải hàm) — dùng promptToCreateThumbnail (tự động).`
  );
  return { build: def, isNeedImage: false, usedStyleKey: '', didFallback: true };
}

export const PROMPTS_CREATE_THUMBNAIL_OPTIONS = [
  { label: 'Tự động', value: '' },
  // { label: 'Japan 2CH Chỉ text', value: 'ja2CHOnlyText' },
  {
    label: '[JAPAN] Love Story',
    value: 'promptToCreateThumbnailLove',
  },
  {
    label: '[JAPAN] Sukatto Full Text',
    value: 'promptToCreateThumbnailSukattoFulLText',
  },
  {
    label: '[JAPAN] Sukatto Image',
    value: 'promptToCreateThumbnailSukatto',
  },
  // { label: '2CH New Image', value: 'ja2CHNewImage' },
];

const FALLBACK_LANG = 'ja';

/**
 * Dynamic import prompts theo ngôn ngữ: ./<lang>/createVideoInfo.js + ./<lang>/createImage.js.
 * Nếu không có thư mục lang → fallback ja.
 */
export async function loadPromptByLanguage(language) {
  const lang = String(language || DEFAULT_PROMPT_LANG).toLowerCase();

  async function importVideoInfo() {
    try {
      return await import(`./${lang}/createVideoInfo.js`);
    } catch {
      if (lang !== FALLBACK_LANG) {
        console.log(`Không tìm thấy createVideoInfo cho "${lang}", dùng "${FALLBACK_LANG}".`);
      }
      return await import(`./${FALLBACK_LANG}/createVideoInfo.js`);
    }
  }

  async function importCreateImage() {
    try {
      return await import(`./${lang}/createImage.js`);
    } catch {
      if (lang !== FALLBACK_LANG) {
        console.log(`Không tìm thấy createImage cho "${lang}", dùng "${FALLBACK_LANG}".`);
      }
      return await import(`./${FALLBACK_LANG}/createImage.js`);
    }
  }

  const [videoInfo, createImage] = await Promise.all([importVideoInfo(), importCreateImage()]);
  return {
    ...videoInfo,
    ...createImage,
  };
}
