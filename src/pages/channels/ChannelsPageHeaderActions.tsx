import { AppButton } from '@/components/ui/AppButton';
import { RefreshIcon, SpinnerIcon } from '@/components/ui/Icons';

export interface ChannelsPageHeaderActionsProps {
  selectedChannel: string | null;
  hasIndexRows: boolean;
  indexSaving: boolean;
  indexLoading: boolean;
  indexBatchVideo: { current: number; total: number; channelLabel: string } | null;
  /** Số dòng đã tick trên bảng index (Tạo video). */
  indexSelectedRowCount: number;
  /** Trong phần đã chọn, số kênh đủ điều kiện chạy script tạo video. */
  indexCreateVideoEligibleSelectedCount: number;
  canRunIndexBatchVideo: boolean;
  /** Chỉnh sửa / chi tiết: bật khi đúng một dòng được chọn. */
  indexSingleSelectedRowIndex: number | null;
  /** Folder kênh (ID) của dòng đơn chọn — null nếu thiếu ID. */
  indexSingleSelectedFolder: string | null;
  onOpenEditSelectedRow: () => void;
  onOpenDetailSelectedRow: () => void;
  /** Số kênh đủ ID+EMAIL trong phần đã chọn (Upload video). */
  uploadEligibleSelectedCount: number;
  /** Đang chạy upload YouTube (GPM) — hiển thị trên nút Upload video. */
  youtubeUploadProgress: { current: number; total: number; channelLabel: string } | null;
  refreshBusy: boolean;
  onOpenCreateVideo: () => void;
  onOpenAddChannel: () => void;
  onOpenUploadVideo: () => void;
  /** Đồng bộ MaVidMedia/videos → Google Drive (terminal riêng). */
  onUploadToGoogleDrive: () => void;
  onBackToIndex: () => void;
  onRefresh: () => void;
}

export function ChannelsPageHeaderActions({
  selectedChannel,
  hasIndexRows,
  indexSaving,
  indexLoading,
  indexBatchVideo,
  indexSelectedRowCount,
  indexCreateVideoEligibleSelectedCount,
  canRunIndexBatchVideo,
  indexSingleSelectedRowIndex,
  indexSingleSelectedFolder,
  onOpenEditSelectedRow,
  onOpenDetailSelectedRow,
  uploadEligibleSelectedCount,
  youtubeUploadProgress,
  refreshBusy,
  onOpenCreateVideo,
  onOpenAddChannel,
  onOpenUploadVideo,
  onUploadToGoogleDrive,
  onBackToIndex,
  onRefresh,
}: ChannelsPageHeaderActionsProps) {
  const indexActionsLocked = indexLoading || indexSaving || indexBatchVideo !== null;
  const canEditSingleSelected = !indexActionsLocked && indexSingleSelectedRowIndex !== null;
  const canOpenDetailSelected = canEditSingleSelected && Boolean(indexSingleSelectedFolder?.trim());

  return (
    <>
      {!selectedChannel && (
        <>
          {hasIndexRows ? (
            <>
              {indexSaving ? (
                <span className='text-sm inline-flex items-center gap-2' style={{ color: 'var(--text-muted)' }}>
                  <SpinnerIcon className='w-4 h-4' />
                  Đang lưu index…
                </span>
              ) : null}
              <AppButton
                type='button'
                variant='secondary'
                onClick={onOpenEditSelectedRow}
                disabled={!canEditSingleSelected}
                title={
                  indexSingleSelectedRowIndex == null
                    ? 'Chọn đúng một dòng trên bảng (checkbox) để sửa kênh đó.'
                    : 'Sửa dòng index đã chọn'
                }
              >
                Sửa
              </AppButton>
              <AppButton
                type='button'
                variant='primary'
                onClick={onOpenDetailSelectedRow}
                disabled={!canOpenDetailSelected}
                title={
                  indexSingleSelectedRowIndex == null
                    ? 'Chọn đúng một dòng trên bảng để mở chi tiết kênh.'
                    : !indexSingleSelectedFolder?.trim()
                      ? 'Dòng đã chọn cần có ID/CHANNEL (thư mục kênh) để mở chi tiết.'
                      : `Mở chi tiết kênh «${indexSingleSelectedFolder}»`
                }
              >
                Chi tiết
              </AppButton>
              <AppButton
                type='button'
                variant='primary'
                onClick={onOpenCreateVideo}
                disabled={
                  indexActionsLocked ||
                  indexSelectedRowCount === 0 ||
                  indexCreateVideoEligibleSelectedCount === 0 ||
                  !canRunIndexBatchVideo
                }
                title={
                  indexSelectedRowCount === 0
                    ? 'Tick chọn ít nhất một dòng trên bảng index (cột đầu), rồi bấm Tạo video.'
                    : indexCreateVideoEligibleSelectedCount === 0
                      ? 'Các dòng đã chọn cần có ID/CHANNEL, EMAIL và LOẠI VIDEO (from_audio hoặc reup_full).'
                      : `Mở hộp thoại — tạo video cho ${indexCreateVideoEligibleSelectedCount} kênh đã chọn (đủ điều kiện).`
                }
              >
                {indexBatchVideo ? (
                  <span className='inline-flex items-center gap-2 max-w-[min(100vw-2rem,28rem)] min-w-0'>
                    <SpinnerIcon className='w-4 h-4 shrink-0' />
                    <span className='truncate'>
                      Tạo video {indexBatchVideo.current}/{indexBatchVideo.total}: {indexBatchVideo.channelLabel}
                    </span>
                  </span>
                ) : indexCreateVideoEligibleSelectedCount > 0 ? (
                  `Tạo video (${indexCreateVideoEligibleSelectedCount})`
                ) : (
                  'Tạo video'
                )}
              </AppButton>
            </>
          ) : null}
          <AppButton
            type='button'
            variant='secondary'
            onClick={onOpenAddChannel}
            disabled={indexLoading}
            title='Tạo thư mục kênh và tạo/cập nhật MaVidMedia/channels/index.xlsx (không cần có sẵn index)'
          >
            Thêm channel
          </AppButton>
          <AppButton
            type='button'
            variant='primary'
            onClick={onOpenUploadVideo}
            disabled={
              indexLoading ||
              indexSaving ||
              indexBatchVideo !== null ||
              indexSelectedRowCount === 0 ||
              uploadEligibleSelectedCount === 0 ||
              youtubeUploadProgress !== null
            }
            title={
              indexBatchVideo !== null
                ? 'Đang chạy tạo video — chờ xong rồi thử lại.'
                : indexSelectedRowCount === 0
                  ? 'Tick chọn ít nhất một dòng trên bảng index, rồi bấm Upload video.'
                  : uploadEligibleSelectedCount === 0
                    ? 'Các dòng đã chọn cần có ID/CHANNEL và EMAIL để upload.'
                    : youtubeUploadProgress
                      ? 'Đang upload YouTube — chờ kết thúc hoặc xem GPM / tab Logs.'
                      : `Mở hộp thoại — upload cho ${uploadEligibleSelectedCount} kênh đã chọn (đủ điều kiện).`
            }
          >
            {youtubeUploadProgress ? (
              <span className='inline-flex items-center gap-2 max-w-[min(100vw-2rem,28rem)] min-w-0'>
                <SpinnerIcon className='w-4 h-4 shrink-0' />
                <span className='truncate'>
                  Đang upload {youtubeUploadProgress.current}/{youtubeUploadProgress.total}: {youtubeUploadProgress.channelLabel}
                </span>
              </span>
            ) : uploadEligibleSelectedCount > 0 ? (
              `Upload video (${uploadEligibleSelectedCount})`
            ) : (
              'Upload video'
            )}
          </AppButton>
          <AppButton
            type='button'
            variant='secondary'
            onClick={() => void onUploadToGoogleDrive()}
            disabled={indexLoading}
            title='Chạy đồng bộ MaVidMedia/videos → Google Drive trong nền (npm run syncVideosToDrive). OAuth lần đầu có thể mở trình duyệt.'
          >
            Upload to Google Drive
          </AppButton>
        </>
      )}
      {selectedChannel && (
        <AppButton type='button' variant='neutral' onClick={onBackToIndex}>
          ← Danh sách
        </AppButton>
      )}
      <AppButton type='button' variant='secondary' onClick={() => void onRefresh()} disabled={refreshBusy}>
        {refreshBusy ? <SpinnerIcon className='w-4 h-4' /> : <RefreshIcon className='w-4 h-4' />}
        <span>{refreshBusy ? 'Đang tải...' : 'Tải lại'}</span>
      </AppButton>
    </>
  );
}
