export const MIN_DURATION_VIDEO = 480;

export const CHANNEL_COLUMNS = ['LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS'];

export const VIDEO_STATUS_OPTIONS = ['', 'Đã tạo video', 'Đã đăng video'];

export const VIDEO_TYPE_OPTIONS = [
  {
    value: 'from_audio',
    label: 'Tạo từ audio',
  },
  {
    value: 'reup_full',
    label: 'Tạo từ toàn bộ video',
  },
];

export const VIDEO_DURATION_OPTIONS = ['Tất cả', '0 - 30 phút', '0 - 60 phút', '30 - 60 phút', 'Từ 30 phút', 'Từ 60 phút'];

export const CHANNEL_CONFIG_FILE = 'mavid-channel-config.json';
