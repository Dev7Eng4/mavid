import type { ChannelRow } from '../../../types';

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
  /** colSpan ô trống / loading — giữ đồng bộ với logic indexHeaders ở page. */
  indexColCount: number;
  onEditRow: (globalIndex: number) => void;
  onOpenChannel: (folder: string) => void;
}
