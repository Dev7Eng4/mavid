import { createPromptToCreateThumbnailFromImage, createPromptToCreateThumbnailOnlyTextFromImage } from './ja/createImage.js';

export const PROMPTS_CREATE_THUMBNAIL = {
  ja2CHOnlyText: createPromptToCreateThumbnailOnlyTextFromImage,
  ja2CHFromOldThumbnail: createPromptToCreateThumbnailFromImage,
  // ja2CHNewImage: createPromptToCreateThumbnailNewImage,
};

export const PROMPTS_NEED_IMAGE = ['ja2CHFromOldThumbnail'];

export const PROMPTS_CREATE_THUMBNAIL_OPTIONS = [
  { label: 'Japan 2CH Chỉ text', value: 'ja2CHOnlyText' },
  { label: 'Japan 2CH Từ thumbnail cũ', value: 'ja2CHFromOldThumbnail' },
  // { label: '2CH New Image', value: 'ja2CHNewImage' },
];
