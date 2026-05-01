import type { ChannelRow } from '@/types';

/**
 * Cột hiển thị bảng index trên trang Channels — cố định và đúng thứ tự.
 * Key là prop name (camelCase) sau khi mapping từ Excel header.
 * Cột 1 trong `<table>` là checkbox; cột dữ liệu đầu tiên là link.
 */
export const CHANNELS_INDEX_VISIBLE_COLUMNS = ['id', 'link', 'email', 'mavidGroupId', 'lastUpload', 'status'] as const;

/** Nhãn hiển thị (header bảng) cho từng prop name — giữ tên gốc quen thuộc. */
export const CHANNELS_INDEX_COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  link: 'LINK',
  email: 'EMAIL',
  mavidGroupId: 'NHÓM',
  lastUpload: 'LAST UPLOAD',
  status: 'STATUS',
};

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
    show: true,
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
    show: true,
  },
  {
    key: 'myChannel',
    label: 'MY CHANNEL',
    index: 6,
    show: true,
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
    show: true,
  },
  {
    key: 'group',
    label: 'GROUP',
    index: 10,
    show: true,
  },
  {
    key: 'status',
    label: 'STATUS',
    index: 11,
    show: true,
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

/** Alias tương thích — cùng danh sách với `CHANNELS_INDEX_VISIBLE_COLUMNS`. */
export const CHANNELS_INDEX_TABLE_HEADERS = CHANNELS_INDEX_VISIBLE_COLUMNS;

export interface ChannelsIndexPagination {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
  startIndex: number;
}

export interface ChannelsIndexSectionProps {
  /** Prop names đọc từ index.xlsx (đã mapping từ header gốc) — dùng làm key trên `ChannelRow`. */
  channels: ChannelRow[];
  loading: boolean;
  /** Một trang: các dòng hiển thị (sau lọc + slice). */
  pageIndexRows: ChannelRow[];
  /**
   * Cùng độ dài `pageIndexRows` — chỉ số 0-based trong `indexDraftRows` (dòng thật trong file index).
   * Cần khi bảng dùng lọc email/nhóm (checkbox / Sửa / Chi tiết theo dòng gốc).
   */
  /** Số dòng thỏa bộ lọc (0 nếu không dòng nào khớp). */
  indexFilteredCount: number;
  indexPag: ChannelsIndexPagination;
  /** colSpan ô trống / loading — checkbox + cột dữ liệu. */
  indexColCount: number;
  selectedRows: Set<string>;
  onToggleRowSelected: (rowId: string) => void;
  /** Bật/tắt chọn hết các dòng đang hiển thị trên trang phân trang hiện tại. */
  onToggleSelectAllOnPage: () => void;
  /** Thao tác: Mở form sửa channel của dòng được chọn */
  onOpenEditRow: (rowId: string) => void;
  /** Thao tác: Mở chi tiết (chuyển sang xem detail) của channel được chọn */
  onOpenDetailRow: (rowId: string) => void;
  /** Checkbox header: đã chọn hết dòng trên trang. */
  pageSelectAll: boolean;
  /** Checkbox header: indeterminate — chỉ một phần dòng trên trang được chọn. */
  pageSelectSome: boolean;
  /** Map id nhóm (cột Group / mavidGroupId) → tên hiển thị từ group.json. */
  groupNameById?: Readonly<Record<string, string>>;
}
