import type { ChannelRow } from '@/types';

/**
 * Cột hiển thị bảng index trên trang Channels — cố định và đúng thứ tự.
 * Giá trị ô lấy từ `index.xlsx` theo khóa cột thực tế (map ID ↔ ID hoặc CHANNEL).
 */
export const CHANNELS_INDEX_VISIBLE_COLUMNS = [
  'ID',
  'LINK',
  'EMAIL',
  'LOẠI VIDEO',
  'THỜI GIAN VIDEO',
  'LAST UPLOAD',
  'STATUS',
] as const;

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
  /** Tiêu đề cột đọc từ index.xlsx (dòng 1) — dùng để map ô vào `CHANNELS_INDEX_VISIBLE_COLUMNS`. */
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
  /** Checkbox header: đã chọn hết dòng trên trang. */
  pageSelectAll: boolean;
  /** Checkbox header: indeterminate — chỉ một phần dòng trên trang được chọn. */
  pageSelectSome: boolean;
}
