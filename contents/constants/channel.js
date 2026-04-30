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
    key: 'channelId',
    label: 'CHANNEL ID',
    index: 2,
  },
  {
    key: 'channelLink',
    label: 'CHANNEL LINK',
    index: 3,
  },
  {
    key: 'channelName',
    label: 'CHANNEL NAME',
    index: 4,
  },
  {
    key: 'email',
    label: 'EMAIL',
    index: 5,
  },
  {
    key: 'myChannel',
    label: 'MY CHANNEL',
    index: 6,
  },
  {
    key: 'videoType',
    label: 'VIDEO TYPE',
    index: 7,
  },
  {
    key: 'durationMinutes',
    label: 'VIDEO DURATION',
    index: 8,
  },
  {
    key: 'lastUpload',
    label: 'LAST UPLOAD',
    index: 9,
  },
  {
    key: 'group',
    label: 'GROUP',
    index: 10,
  },
  {
    key: 'status',
    label: 'STATUS',
    index: 11,
  },
];

export const CHANNEL_DETAIL = [
  {
    key: 'link',
    label: 'LINK VIDEO',
    index: 1,
  },
  {
    key: 'views',
    label: 'VIEWS',
    index: 2,
  },
  {
    key: 'duration',
    label: 'DURATION',
    index: 3,
  },
  {
    key: 'status',
    label: 'STATUS',
    index: 4,
  },
  // {
  //   key: 'email',
  //   label: 'EMAIL',
  //   index: 5,
  // },
];
