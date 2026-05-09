import type { ChannelRow } from '@/types';

export type VideoMakeType = 'audio' | 'video';

/**
 * Cột hiển thị bảng index — khớp `CHANNELS` có `show: true`.
 * Key là prop name trên `ChannelRow` sau khi mapping từ Excel.
 */
export const CHANNELS_INDEX_VISIBLE_COLUMNS = ['channelLink', 'email', 'lastUpload', 'status', 'group', 'channelId'] as const;

/** Nhãn hiển thị phụ (documentation / export). */
export const CHANNELS_INDEX_COLUMN_LABELS: Record<string, string> = {
  channelLink: 'CHANNEL URL',
  email: 'LINKED EMAIL',
  channelId: 'ID THƯ MỤC',
  group: 'NHÓM',
  lastUpload: 'LAST UPLOAD',
  status: 'STATUS',
};

/**
 * Header bảng — có thể khác `label` (label khớp cột Excel cho convertIndexRowToChannel).
 */
export const CHANNEL_TABLE_HEADER_DISPLAY: Partial<Record<string, string>> = {
  channelLink: 'CHANNEL URL',
  email: 'LINKED EMAIL',
  channelId: 'ID THƯ MỤC',
  lastUpload: 'LAST UPLOAD',
  status: 'STATUS',
  group: 'NHÓM',
};

/**
 * Thứ tự trong mảng = thứ tự cột trên bảng.
 * `label` phải khớp header trong index.xlsx — không đổi tùy tiện.
 */
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
    show: false,
  },
  {
    key: 'email',
    label: 'EMAIL',
    index: 5,
    show: true,
  },
  {
    key: 'lastUpload',
    label: 'LAST UPLOAD',
    index: 9,
    show: true,
  },
  {
    key: 'status',
    label: 'STATUS',
    index: 11,
    show: true,
  },
  {
    key: 'group',
    label: 'GROUP',
    index: 10,
    show: true,
  },
  {
    key: 'channelName',
    label: 'CHANNEL NAME',
    index: 4,
  },
  {
    key: 'myChannel',
    label: 'MY CHANNEL',
    index: 6,
    show: false,
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
];

/** Alias — giữ cho code cũ tham chiếu. */
export const CHANNELS_INDEX_TABLE_HEADERS = CHANNELS_INDEX_VISIBLE_COLUMNS;

export interface ChannelsIndexPagination {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
  startIndex: number;
}

export interface ChannelsIndexSectionProps {
  channels: ChannelRow[];
  loading: boolean;
  pageIndexRows: ChannelRow[];
  indexFilteredCount: number;
  indexPag: ChannelsIndexPagination;
  indexColCount: number;
  selectedRows: Set<string>;
  onToggleRowSelected: (rowId: string) => void;
  onToggleSelectAllOnPage: () => void;
  onOpenEditRow: (rowId: string) => void;
  onOpenDetailRow: (rowId: string) => void;
  pageSelectAll: boolean;
  pageSelectSome: boolean;
  groupNameById?: Readonly<Record<string, string>>;

  toolbarSearch: string;
  onToolbarSearchChange: (value: string) => void;
  filterExpanded: boolean;
  onToggleFilterExpanded: () => void;
  groupFilter: string;
  groupFilterOptions: { value: string; label: string }[];
  onGroupFilterChange: (value: string) => void;
  onExportCsv: () => void;
}
