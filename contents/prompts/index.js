import { DEFAULT_PROMPT_LANG } from '../constants/defaultPromptLang.js';
import {
  createPromptToCreateThumbnailFromImage,
  createPromptToCreateThumbnailOnlyTextFromImage,
  promptToCreateThumbnail,
} from './ja/createImage.js';

export const PROMPTS_CREATE_THUMBNAIL = {
  ja2CHOnlyText: createPromptToCreateThumbnailOnlyTextFromImage,
  ja2CHFromOldThumbnail: promptToCreateThumbnail,
  // ja2CHNewImage: createPromptToCreateThumbnailNewImage,
};

export const PROMPTS_NEED_IMAGE = ['ja2CHFromOldThumbnail'];

export const PROMPTS_CREATE_THUMBNAIL_OPTIONS = [
  { label: 'Japan 2CH Từ thumbnail cũ', value: 'ja2CHFromOldThumbnail' },
  { label: 'Japan 2CH Chỉ text', value: 'ja2CHOnlyText' },
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
