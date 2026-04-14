import type { ChannelRow } from '@/types';

/** Cột hiển thị bảng index (cố định; khớp MaVidMedia/channels/index.xlsx). */
export const CHANNELS_INDEX_TABLE_HEADERS = ['ID', 'LINK', 'EMAIL', 'LOẠI VIDEO', 'THỜI GIAN VIDEO', 'LAST UPLOAD'] as const;

export interface ChannelsIndexPagination {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  pageSize: number;
  startIndex: number;
}

export interface ChannelsIndexSectionProps {
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
