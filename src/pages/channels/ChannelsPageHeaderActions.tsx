import { AppButton } from '@/components/ui/AppButton';
import { RefreshIcon, SpinnerIcon } from '@/components/ui/Icons';

export interface ChannelsPageHeaderActionsProps {
  selectedChannel: string | null;
  hasIndexRows: boolean;
  indexSaving: boolean;
  indexLoading: boolean;
  indexBatchVideo: { current: number; total: number; channelLabel: string } | null;
  indexCreateVideoQueueLength: number;
  canRunIndexBatchVideo: boolean;
  uploadChannelsLength: number;
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
  indexCreateVideoQueueLength,
  canRunIndexBatchVideo,
  uploadChannelsLength,
  youtubeUploadProgress,
  refreshBusy,
  onOpenCreateVideo,
  onOpenAddChannel,
  onOpenUploadVideo,
  onUploadToGoogleDrive,
  onBackToIndex,
  onRefresh,
}: ChannelsPageHeaderActionsProps) {
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
                variant='primary'
                onClick={onOpenCreateVideo}
                disabled={
                  indexLoading || indexSaving || indexBatchVideo !== null || indexCreateVideoQueueLength === 0 || !canRunIndexBatchVideo
                }
                title={
                  indexCreateVideoQueueLength === 0
                    ? 'Cần ít nhất một dòng có ID/CHANNEL và LOẠI VIDEO (from_audio hoặc reup_full).'
                    : `Mở hộp thoại chọn kênh — ${indexCreateVideoQueueLength} lượt chạy theo bảng index hiện tại.`
                }
              >
                {indexBatchVideo ? (
                  <span className='inline-flex items-center gap-2 max-w-[min(100vw-2rem,28rem)] min-w-0'>
                    <SpinnerIcon className='w-4 h-4 shrink-0' />
                    <span className='truncate'>
                      Tạo video {indexBatchVideo.current}/{indexBatchVideo.total}: {indexBatchVideo.channelLabel}
                    </span>
                  </span>
                ) : (
                  `Tạo video (${indexCreateVideoQueueLength} kênh)`
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
            disabled={indexLoading || uploadChannelsLength === 0 || youtubeUploadProgress !== null}
            title={
              uploadChannelsLength === 0
                ? 'Cần ít nhất một dòng index có thư mục kênh (ID/CHANNEL) và cột EMAIL có giá trị.'
                : youtubeUploadProgress
                  ? 'Đang upload YouTube — chờ kết thúc hoặc xem GPM / tab Logs.'
                  : 'Lịch upload video theo kênh (chỉ kênh có email trong index).'
            }
          >
            {youtubeUploadProgress ? (
              <span className='inline-flex items-center gap-2 max-w-[min(100vw-2rem,28rem)] min-w-0'>
                <SpinnerIcon className='w-4 h-4 shrink-0' />
                <span className='truncate'>
                  Đang upload {youtubeUploadProgress.current}/{youtubeUploadProgress.total}: {youtubeUploadProgress.channelLabel}
                </span>
              </span>
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
