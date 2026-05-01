import type { ChannelRow } from '@/types';

export const DETAIL_TABLE_LOADING_HEADERS = ['LINK VIDEO', 'VIEWS', 'DURATION', 'STATUS', 'START FROM'] as const;

/** Lọc status cố định ở chi tiết kênh (khớp text trong cột STATUS). */
export const DETAIL_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '__all__', label: 'Tất cả' },
  { value: '', label: 'Chưa tạo video' },
  { value: 'Đã tạo video', label: 'Đã tạo video' },
  { value: 'Đã đăng video', label: 'Đã đăng video' },
];

export interface ChannelDetailLayoutModel {
  meta: { email: string; channelName: string; channelTags: string };
  tableHeaders: string[];
  showEmail: boolean;
  showChannelName: boolean;
  showTags: boolean;
  linkVideoKey?: string;
  durationKey?: string;
  statusKey?: string;
  startFromKey?: string;
}

export interface ChannelsDetailPagination {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
}

export interface ChannelsDetailSectionProps {
  detailLoading: boolean;
  detailRowsLength: number;
  detailActionError: string | null;
  filterLink: string;
  onFilterLinkChange: (v: string) => void;
  filterDurationPreset: string;
  onFilterDurationPresetChange: (v: string) => void;
  filterStatusFixed: string;
  onFilterStatusFixedChange: (v: string) => void;
  durationSelectOptions: { value: string; label: string }[];
  detailColCount: number;
  pageDetailRows: ChannelRow[];
  detailPag: ChannelsDetailPagination;
  /** Checkbox chi tiết — state nằm ở parent (nút Cập nhật meta trên header). */
  detailSelectedRowIndices: Set<string>;
  onToggleDetailRowSelected: (originalRowLink: string) => void;
  /** Chọn tất cả / bỏ chọn các dòng đang hiển thị trên trang (sau lọc + phân trang). */
  detailPageSelectAll: boolean;
  detailPageSelectSome: boolean;
  onToggleDetailSelectAllOnPage: () => void;
}
