import { AppButton } from '@/components/ui/AppButton';
import { RefreshIcon, SpinnerIcon } from '@/components/ui/Icons';

export interface ChannelsPageHeaderActionsProps {
  selectedChannel: string | null;
  hasIndexRows: boolean;
  loading: boolean;
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

  /** Số kênh đủ ID+EMAIL trong phần đã chọn (Upload video). */
  uploadEligibleSelectedCount: number;
  /** Số luồng upload YouTube (runScript) đang chạy song song — hiển thị cạnh nút Upload video. */
  youtubeUploadActiveThreads: number;
  refreshBusy: boolean;
  onOpenCreateVideo: () => void;
  onOpenAddChannel: () => void;
  onOpenUploadVideo: () => void;
  /** Đồng bộ MaVidMedia/videos → Google Drive (terminal riêng). */
  onUploadToGoogleDrive: () => void;
  onBackToIndex: () => void;
  onRefresh: () => void;
  /** Màn chi tiết kênh: nút cập nhật meta cạnh Tải lại. */
  detailUpdateMeta?: {
    updateMetaBusy: boolean;
    /** Số dòng đã chọn có status «Đã tạo video» (hiển thị trên nút). */
    createdVideoSelectedCount: number;
    /** Có ít nhất một dòng đã chọn là «Đã tạo video». */
    hasCreatedVideoInSelection: boolean;
    onUpdateMeta: () => void | Promise<void>;
  };
  /** Chi tiết kênh: Tạo video / Upload video (cùng hàng với Cập nhật meta). */
  detailBulkVideo?: {
    createVideoBusy: boolean;
    detailUploadPrepBusy: boolean;
    emptyStatusSelectedCount: number;
    createdVideoSelectedCount: number;
    canCreateVideo: boolean;
    canUploadVideo: boolean;
    onCreateVideo: () => void;
    onUploadVideo: () => void | Promise<void>;
  };
}

export function ChannelsPageHeaderActions({
  selectedChannel,
  hasIndexRows,
  loading,
  indexBatchVideo,
  indexSelectedRowCount,
  indexCreateVideoEligibleSelectedCount,
  canRunIndexBatchVideo,
  indexSingleSelectedRowIndex: _indexSingleSelectedRowIndex,
  indexSingleSelectedFolder: _indexSingleSelectedFolder,
  uploadEligibleSelectedCount,
  youtubeUploadActiveThreads,
  refreshBusy,
  onOpenCreateVideo,
  onOpenAddChannel,
  onOpenUploadVideo,
  onUploadToGoogleDrive,
  onBackToIndex,
  onRefresh,
  detailUpdateMeta,
  detailBulkVideo,
}: ChannelsPageHeaderActionsProps) {
  const indexActionsLocked = loading || indexBatchVideo !== null;

  return (
    <>
      {!selectedChannel && (
        <>
          {hasIndexRows && (
            <>
              <AppButton
                type='button'
                variant='primary'
                onClick={onOpenCreateVideo}
                disabled={indexActionsLocked || indexCreateVideoEligibleSelectedCount === 0 || !canRunIndexBatchVideo}
                title='Create video'
              >
                Create Video
              </AppButton>
            </>
          )}
          <AppButton type='button' variant='primary' onClick={onOpenAddChannel} disabled={loading} title=''>
            Mapping
          </AppButton>
          <AppButton
            type='button'
            variant='primary'
            onClick={onOpenUploadVideo}
            disabled={loading || uploadEligibleSelectedCount === 0}
            title='Upload videos to YouTube'
          >
            Upload
          </AppButton>
          <AppButton
            type='button'
            variant='secondary'
            onClick={() => void onUploadToGoogleDrive()}
            disabled={loading}
            title='Clean up videos to Google Drive'
          >
            Clean
          </AppButton>
        </>
      )}
      {selectedChannel && (
        <AppButton type='button' variant='neutral' onClick={onBackToIndex}>
          ← List
        </AppButton>
      )}
      {selectedChannel && detailBulkVideo ? (
        <>
          <AppButton
            type='button'
            variant='primary'
            disabled={!detailBulkVideo.canCreateVideo || detailBulkVideo.createVideoBusy || refreshBusy}
            title={
              !detailBulkVideo.canCreateVideo
                ? 'Cần cột LINK VIDEO + STATUS, kênh phải có trong index (EMAIL, LOẠI VIDEO) và ít nhất một dòng đã chọn có status trống + link hợp lệ.'
                : 'Chỉ tạo video cho các dòng đã chọn có status trống (chưa tạo).'
            }
            onClick={() => detailBulkVideo.onCreateVideo()}
          >
            {detailBulkVideo.createVideoBusy ? (
              <span className='inline-flex items-center gap-2'>
                <SpinnerIcon className='w-4 h-4' />
                Creating video…
              </span>
            ) : (
              'Tạo video'
            )}
          </AppButton>
          <AppButton
            type='button'
            variant='secondary'
            disabled={!detailBulkVideo.canUploadVideo || detailBulkVideo.detailUploadPrepBusy || refreshBusy}
            title={
              !detailBulkVideo.canUploadVideo
                ? 'Cần cột LINK VIDEO + STATUS, kênh trong index có EMAIL, và ít nhất một dòng đã chọn có status «Đã tạo video» + link YouTube (?v=…).'
                : 'Upload các video đã chọn có status «Đã tạo video» (đủ thư mục .mp4 + thumbnail).'
            }
            onClick={() => void detailBulkVideo.onUploadVideo()}
          >
            {detailBulkVideo.detailUploadPrepBusy ? (
              <span className='inline-flex items-center gap-2'>
                <SpinnerIcon className='w-4 h-4' />
                Preparing…
              </span>
            ) : detailBulkVideo.createdVideoSelectedCount > 0 ? (
              `Upload video (${detailBulkVideo.createdVideoSelectedCount})`
            ) : (
              'Upload video'
            )}
          </AppButton>
        </>
      ) : null}
      {selectedChannel && detailUpdateMeta ? (
        <AppButton
          type='button'
          variant='secondary'
          disabled={detailUpdateMeta.updateMetaBusy || refreshBusy || !detailUpdateMeta.hasCreatedVideoInSelection}
          title={
            !detailUpdateMeta.hasCreatedVideoInSelection
              ? 'Chọn ít nhất một dòng có status «Đã tạo video».'
              : 'Chỉ xử lý các dòng đã chọn có status «Đã tạo video»: thiếu Gemini (4 trường) hoặc thiếu thumbnail .png/.jpg/.jpeg.'
          }
          onClick={() => void detailUpdateMeta.onUpdateMeta()}
        >
          {detailUpdateMeta.updateMetaBusy ? (
            <span className='inline-flex items-center gap-2'>
              <SpinnerIcon className='w-4 h-4' />
              Updating meta…
            </span>
          ) : (
            `Cập nhật meta${detailUpdateMeta.createdVideoSelectedCount > 0 ? ` (${detailUpdateMeta.createdVideoSelectedCount})` : ''}`
          )}
        </AppButton>
      ) : null}
      <AppButton type='button' variant='secondary' onClick={() => void onRefresh()} disabled={refreshBusy}>
        {refreshBusy ? <SpinnerIcon className='w-4 h-4' /> : <RefreshIcon className='w-4 h-4' />}
        <span>{refreshBusy ? 'Loading...' : 'Refresh'}</span>
      </AppButton>
    </>
  );
}
