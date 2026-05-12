import type { VideoPerDayPreset } from '../utils/channelIndexHelpers';

export const VIDEO_PER_DAY_OPTIONS: { value: VideoPerDayPreset; label: string }[] = [
  { value: '1/3', label: '1/3' },
  { value: '1/2', label: '1/2' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '1-2', label: '1–2 (2 suất cuối tuần)' },
];

export const VIDEO_MAKE_TYPE = {
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;
