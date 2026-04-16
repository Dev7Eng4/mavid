import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export const DEFAULT_TABLE_PAGE_SIZE = 2;

export interface ClientPaginationResult {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  /** Chỉ số bắt đầu (0-based) trong mảng đầy đủ */
  startIndex: number;
  totalPages: number;
  pageSize: number;
  goFirstPage: () => void;
}

/**
 * Phân trang phía client cho bảng (cắt mảng bằng slice(startIndex, startIndex + pageSize)).
 */
export function useClientPagination(itemCount: number, pageSize: number = DEFAULT_TABLE_PAGE_SIZE): ClientPaginationResult {
  const [page, setPage] = useState(1);
  const totalPages = useMemo(() => {
    if (itemCount <= 0) return 1;
    return Math.max(1, Math.ceil(itemCount / pageSize));
  }, [itemCount, pageSize]);

  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    page: safePage,
    setPage,
    startIndex,
    totalPages,
    pageSize,
    goFirstPage: () => setPage(1),
  };
}
