export const MIN_DURATION_VIDEO = 1080;

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

export const CHANNELS = [
  {
    key: 'id',
    label: 'ID',
    index: 1,
  },
  {
    key: 'link',
    label: 'LINK',
    index: 2,
  },
  {
    key: 'email',
    label: 'EMAIL',
    index: 3,
  },
  {
    key: 'myChannel',
    label: 'KÊNH CỦA TÔI',
    index: 4,
  },
  {
    key: 'videoType',
    label: 'LOẠI VIDEO',
    index: 5,
  },
  {
    key: 'durationMinutes',
    label: 'THỜI GIAN VIDEO',
    index: 6,
  },
  {
    key: 'background',
    label: 'BACKGROUND',
    index: 7,
  },
  {
    key: 'lastUpload',
    label: 'LAST UPLOAD',
    index: 8,
  },
  {
    key: 'group',
    label: 'GROUP',
    index: 9,
  },
  {
    key: 'status',
    label: 'STATUS',
    index: 10,
  },
];

export const CHANNEL_DETAIL = [
  {
    id: 'link',
    label: 'LINK',
    index: 1,
  },
  {
    id: 'views',
    label: 'VIEWS',
    index: 2,
  },
  {
    id: 'duration',
    label: 'DURATION',
    index: 3,
  },
  {
    id: 'status',
    label: 'STATUS',
    index: 4,
  },
];
