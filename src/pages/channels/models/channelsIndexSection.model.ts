import type { ChannelRow } from '@/types';

/**
 * Cột hiển thị bảng index trên trang Channels — cố định và đúng thứ tự.
 * Key là prop name (camelCase) sau khi mapping từ Excel header.
 * Cột 1 trong `<table>` là checkbox; cột dữ liệu đầu tiên là link.
 */
export const CHANNELS_INDEX_VISIBLE_COLUMNS = [
  'id',
  'link',
  'email',
  'lastUpload',
  'status',
] as const;

/** Nhãn hiển thị (header bảng) cho từng prop name — giữ tên gốc quen thuộc. */
export const CHANNELS_INDEX_COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  link: 'LINK',
  email: 'EMAIL',
  lastUpload: 'LAST UPLOAD',
  status: 'STATUS',
};

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
  indexHeaders: string[];
  indexListError: string | null;
  indexLoading: boolean;
  indexSaving: boolean;
  indexDraftRows: ChannelRow[];
  pageIndexRows: ChannelRow[];
  indexPag: ChannelsIndexPagination;
  /** colSpan ô trống / loading — checkbox + cột dữ liệu. */
  indexColCount: number;
  selectedRowIndices: ReadonlySet<number>;
  onToggleRowSelected: (globalIndex: number) => void;
  /** Bật/tắt chọn hết các dòng đang hiển thị trên trang phân trang hiện tại. */
  onToggleSelectAllOnPage: () => void;
  /** Thao tác: Mở form sửa channel của dòng được chọn */
  onOpenEditRow: (globalIndex: number) => void;
  /** Thao tác: Mở chi tiết (chuyển sang xem detail) của channel được chọn */
  onOpenDetailRow: (globalIndex: number) => void;
  /** Checkbox header: đã chọn hết dòng trên trang. */
  pageSelectAll: boolean;
  /** Checkbox header: indeterminate — chỉ một phần dòng trên trang được chọn. */
  pageSelectSome: boolean;
}
