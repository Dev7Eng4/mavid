export const DETAIL_PAGE_SIZE = 15;

export const INDEX_FILE = 'channels/index.xlsx';

export const COLUMN_KEYS = [
  {
    columnKey: 'ID',
    convertKey: 'id',
  },
  {
    columnKey: 'LINK',
    convertKey: 'link',
  },
  {
    columnKey: 'EMAIL',
    convertKey: 'email',
  },
  {
    columnKey: 'KÊNH CỦA TÔI',
    convertKey: 'myChannel',
  },
  {
    columnKey: 'LOẠI VIDEO',
    convertKey: 'videoType',
  },
  {
    columnKey: 'THỜI GIAN VIDEO',
    convertKey: 'videoDuration',
  },
  {
    columnKey: 'LAST UPLOAD',
    convertKey: 'lastUpload',
  },
  {
    columnKey: 'BACKGROUND',
    convertKey: 'background',
  },
  {
    columnKey: 'STATUS',
    convertKey: 'status',
  },
];

export const TABLE_COLUMNS = [
  {
    key: 'ID',
    label: 'ID',
  },
  {
    key: 'LINK',
    label: 'LINK',
  },
  {
    key: 'EMAIL',
    label: 'EMAIL',
  },
  {
    key: 'LAST UPLOAD',
    label: 'LẦN TẢI LÊN GẦN NHẤT',
  },
  {
    key: 'STATUS',
    label: 'TRẠNG THÁI',
  },
  {
    key: 'ACTIONS',
    label: 'HÀNH ĐỘNG',
  },
];

export const VIDEO_STATUS = {
  CREATED: 'Đã tạo video',
  UPLOADED: 'Đã tải lên',
};

export const VIDEO_MAKE_TYPE = {
  FROM_AUDIO: 'from_audio',
  REUP_FULL: 'reup_full',
};
