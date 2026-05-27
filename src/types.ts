export type Page = 'pipeline' | 'create-video' | 'settings' | 'channels' | 'visual' | 'groups' | 'warnings' | 'analyst' | 'gpm' | 'logs';

export type ScriptId =
  | 'tao-chrome-profile'
  | 'lay-thong-tin-youtube'
  | 'tao-batch-video-tu-audio'
  | 'createBatchVideo'
  | 'tao-batch-video-reup-full'
  | 'tao-thumbnail-flow';

export interface ScriptDef {
  id: ScriptId;
  title: string;
  summary: string;
  npmScript: string;
}

export const scriptDefs: ScriptDef[] = [
  {
    id: 'tao-chrome-profile',
    title: 'Tạo Chrome Profile',
    summary: 'Tạo profile Chrome (Playwright) để đăng nhập Google cho Gemini/Flow.',
    npmScript: 'tao-chrome-profile',
  },
  {
    id: 'lay-thong-tin-youtube',
    title: 'Lấy thông tin YouTube',
    summary: 'Đọc URL từ input.txt, lấy info kênh/playlist, xuất Excel vào MaVidMedia/channels/.',
    npmScript: 'lay-thong-tin-youtube',
  },
  {
    id: 'tao-batch-video-tu-audio',
    title: 'Tạo batch video từ audio',
    summary: 'Tạo video hàng loạt từ audio + stock clips (FFmpeg, phụ đề, logo).',
    npmScript: 'tao-batch-video-tu-audio',
  },
  {
    id: 'tao-batch-video-reup-full',
    title: 'Tạo batch video reup full',
    summary: 'Reup video hàng loạt bằng overlay ảnh/video lên video gốc.',
    npmScript: 'tao-batch-video-reup-full',
  },
  {
    id: 'createBatchVideo',
    title: 'Tạo batch video',
    summary: 'Tạo video hàng loạt từ audio + stock clips (FFmpeg, phụ đề, logo).',
    npmScript: 'create-batch-video',
  },
  {
    id: 'tao-thumbnail-flow',
    title: 'Tạo thumbnail (Flow)',
    summary: 'Tạo thumbnail qua Google Flow với prompt AI.',
    npmScript: 'tao-thumbnail-flow',
  },
];

export interface AppStats {
  channels: number;
  outputs: number;
  downloads: number;
}

/** Phần chỉnh qua Settings / JSON user — khớp `APP_SETTINGS` trong contents/constants. */
export interface AppSettingsModel {
  FLOW: { PROJECT_ID: string; CHROME_PROFILE: number };
  VIDEO: { MAX_SCHEDULED_DAYS: number; MAX_VIDEOS_PREPARE_AHEAD: number };
  /**
   * Thư mục `MaVidMedia`: bên trong có `backgrounds/`, `videos/`, `channels/`.
   * Rỗng → app gợi ý mặc định (Windows: ổ không C:; macOS: volume ngoài hoặc HOME).
   */
  STORAGE: string;
}

export interface ConstantsUiModel {
  APP_SETTINGS: AppSettingsModel;
}

export interface ChannelFile {
  name: string;
  path: string;
  modifiedAt: string;
}

export interface ChannelRow {
  [key: string]: any;
}

export interface ChannelData {
  headers: string[];
  rows: ChannelRow[];
}

/** Một profile GPM từ API Local (GET …/profiles) hoặc nguồn tương đương. */
export interface GpmProfileRow {
  id: string;
  name: string;
  profilePath: string;
}

/** Nhóm lưu trong `MaVidMedia/channels/group.json`. */
export interface Group {
  id: string;
  name: string;
}

/** Cảnh báo lưu trong `MaVidMedia/channels/warning.json`. */
export interface MavidWarningRow {
  id: string;
  channelLink: string;
  note: string;
}

export interface LoadGpmProfilesResult {
  ok: boolean;
  path: string | null;
  /** Trình duyệt GPM tùy chọn (browser.exe / chrome.exe), lưu trong gpm-settings.json */
  browserExe: string | null;
  profiles: GpmProfileRow[];
  dbFiles: string[];
  message: string | null;
}

export interface GpmPlaywrightStartFolderPayload {
  gpmRoot: string;
  profilePath: string;
  /** Khóa ổn định theo dòng (vd. Id hoặc `gpm-row-${i}`). */
  profileKey: string;
  startUrl?: string;
}

export type GpmPlaywrightStartFolderResult = { ok: true; resolvedDir: string } | { ok: false; reason: string; detail?: string };

export type GpmPlaywrightStopFolderResult = { ok: true } | { ok: false; reason: string };

export interface GpmPlaywrightListOpenResult {
  keys: string[];
}

export interface SelectGpmDataFolderResult {
  ok: boolean;
  cancelled?: boolean;
  path?: string;
}

export type SelectGpmBrowserExeResult = { ok: true; path: string } | { ok: false; cancelled?: boolean; reason?: string };

/** Dữ liệu đọc từ `MaVidMedia/channels/{channelFolder}/*.xlsx|*.csv` (file đầu tiên). */
export interface ChannelFolderDataResult extends ChannelData {
  fileName: string | null;
  channelFolder: string;
}

export interface BackgroundOption {
  id: string;
  label: string;
  /** 'local' = folder trong MaVidMedia/backgrounds; 'stock' = kênh visual (`MaVidMedia/visuals/*.json`, cùng nguồn `listVisualResources`) */
  source: 'local' | 'stock';
}

/** Nguồn nền: chọn folder stock cố định, hoặc tự động (số clip theo độ dài audio, folder mặc định). */
export type VideoFromAudioBackgroundSource = 'stock' | 'auto';

export interface VideoReupFullConfig {
  channel: string;
  email: string;
  maxVideosPerBatch: number;
  /** Tên preset khớp `OVERLAY_OPTIONS[].NAME` (vd. Option 1). */
  overlay?: string;
}

export interface VideoFromAudioConfig {
  channel: string;
  email?: string;
  background: string;
  /** Mặc định `stock` (popup Pipeline). Tab Tạo video có thể chọn `auto`. */
  backgroundSource?: VideoFromAudioBackgroundSource;
  stockVideoCount: number;
  audioSpeed: number;
  showLogo: boolean;
  /** Số video tối đa xử lý mỗi lần chạy batch (mặc định 5). */
  maxVideosPerBatch: number;
  /** 0 = không lọc; >0 = chỉ dòng có cột DURATION ≥ N phút. */
  minDurationMinutes?: number;
  /** Tùy chọn nâng cao (ví dụ: stock/image cho audio). */
  overlay?: string;
}

export type DirectScriptId = string;

export interface ScriptResult<T = unknown> {
  success: boolean;
  data?: T;
}

export interface GetInfoChannelParams {
  url?: string;
  urls?: string[];
}

/** Payload gửi tới `contents/addChannelFromForm.js` (Electron run-script). */
/** Tham số `uploadYoutubeViaGpm` — GPM API + thư mục kênh MaVidMedia/channels. */
export interface UploadYoutubeViaGpmParams {
  gpmProfileId: string;
  channelFolder: string;
  /** Khớp `channels[].email` trong `mavid-channel-config.json` — dùng cho lịch publish (getYoutubePublishPlan). */
  email?: string;
  /** null/undefined = upload tất cả thư mục con có .mp4 */
  maxUploads?: number | null;
  /** Thứ tự upload cố định (vd. batch vừa tạo); không truyền = quét thư mục, sort tên, lấy từ trên xuống theo maxUploads */
  uploadFolderNames?: string[];
  /** Base API GPM, ví dụ `http://127.0.0.1:19995/api/v3` */
  gpmApiBase?: string;
}

export interface AddChannelFromFormParams {
  url: string;
  formMeta: {
    channels: {
      email: string;
      myChannel?: string;
      /** ID nhóm trong `group.json`. */
      groupId?: string;
      videoType: 'audio' | 'video';
      durationMinuteFrom: number;
      durationMinuteTo: number | null;
      background: string;
      /** Chỉ dùng khi `videoType === 'video'` — tên trong OVERLAY_OPTIONS. */
      overlay?: string;
      /** Khớp `PROMPTS_CREATE_THUMBNAIL_OPTIONS[].value` trong contents/prompts/index.js */
      thumbnailPrompt?: string;
      videosPerDayPreset: string;
      publishTimes: string[];
    }[];
    folderIdOverride?: string;
  };
}

export interface GetInfoChannelResult {
  success: boolean;
  processedCount: number;
  results: Array<{
    url: string;
    type: string;
    channelName?: string;
    channelId?: string;
    channelLink?: string;
    videoCount?: number;
    outputFile?: string;
    message?: string;
  }>;
}

/** `MaVidMedia/channels/{folder}/mavid-channel-config.json` — đồng bộ với form Thêm/Sửa channel. */
export interface MavidChannelConfigItem {
  id?: string;
  email?: string;
  myChannel?: string;
  videoType?: string;
  durationMinuteFrom?: number;
  durationMinuteTo?: number | null;
  background?: string;
  /** Preset reup full — khớp OVERLAY_OPTIONS[].NAME */
  overlay?: string;
  /** Khớp `PROMPTS_CREATE_THUMBNAIL_OPTIONS[].value` (Flow / thumbnail). */
  thumbnailPrompt?: string;
  videosPerDayPreset?: string;
  publishTimes?: string[];
  uploadedVideos?: number;
  latestUploadDate?: string;
  latestUploadTime?: string;
}

export interface MavidChannelConfig {
  version?: number;
  channels?: MavidChannelConfigItem[];
  channelUrl?: string;
  channelLink?: string;
  channelName?: string;
  folderId?: string;
  lastUpload?: string;
  youtube?: { usernameId?: string; channelId?: string | null };
  createdAt?: string;

  // Backward compatibility properties
  email?: string;
  videoType?: string;
  durationMinutes?: number;
  background?: string;
  videosPerDayPreset?: string;
  publishTimes?: string[];
}

declare global {
  interface Window {
    runner: {
      runNpmScript: (npmScript: string, extraEnv?: Record<string, string>) => Promise<{ code: number; cancelled?: boolean }>;
      cancelRunningJob: () => Promise<{ ok: boolean; reason?: string }>;
      runScript: <T = unknown>(script: DirectScriptId, params?: Record<string, unknown>) => Promise<ScriptResult<T>>;
      getConstantsUiModel: () => Promise<ConstantsUiModel>;
      /** Mặc định repo (không overlay) + gợi ý VIDEO_STORAGE_ROOT — cho Reset form. */
      getConstantsFactoryUiModel: () => Promise<ConstantsUiModel>;
      saveConstantsUiModel: (modelPatch: Partial<ConstantsUiModel>) => Promise<{ ok: boolean }>;
      /** Chọn thư mục cha → tạo `MaVidMedia/{backgrounds,videos,channels}`, ghi `VIDEO_STORAGE_ROOT` = …/MaVidMedia. */
      selectVideoStorageFolder: (currentPath?: string | null) => Promise<{ ok: boolean; path: string | null }>;
      listChannels: () => Promise<ChannelFile[]>;
      readChannelData: (filePath: string) => Promise<ChannelData>;
      readChannelFolderData: (channelFolder: string) => Promise<ChannelFolderDataResult>;
      readMavidChannelConfig: (channelFolder: string) => Promise<MavidChannelConfig | null>;
      writeMavidChannelConfig: (payload: {
        channelFolder: string;
        /** Email dòng trước khi sửa — dùng để merge với bản cũ khi index/config lệch hoặc đổi email. */
        mergeFromPreviousEmail?: string;
        patch: Pick<MavidChannelConfig, 'channels'>;
      }) => Promise<{ ok: boolean }>;
      setChannelFolderStartFromRow: (channelFolder: string, dataRowIndex: number) => Promise<{ ok: boolean; fileName?: string }>;
      listVisualResources: () => Promise<{ channelId: string; channelName: string; type: string }[]>;
      listBackgrounds: () => Promise<BackgroundOption[]>;
      listChannelFolders: () => Promise<string[]>;
      /** Email đã có trong index.xlsx hoặc file kênh con (tránh trùng khi thêm kênh). */
      listRegisteredChannelEmails: () => Promise<string[]>;
      getOverlayOptionNames: () => Promise<string[]>;
      getStats: () => Promise<AppStats>;
      readInputFile: () => Promise<string>;
      writeInputFile: (content: string) => Promise<{ ok: boolean }>;
      getGpmDataFolder: () => Promise<{ path: string | null }>;
      selectGpmDataFolder: () => Promise<SelectGpmDataFolderResult>;
      loadGpmProfiles: () => Promise<LoadGpmProfilesResult>;
      selectGpmBrowserExe: () => Promise<SelectGpmBrowserExeResult>;
      clearGpmBrowserExe: () => Promise<{ ok: boolean; path: null }>;
      /** GET tới API GPM v3 qua main process (tránh CORS). `path`: phần sau `/api/v3/` (vd. `profiles?group=Ebay`). */
      gpmApiRequest: (payload: {
        path: string;
        method?: string;
        headers?: Record<string, string>;
      }) => Promise<{ ok: boolean; status: number; bodyText: string; error?: string }>;
      gpmPlaywrightListOpen: () => Promise<GpmPlaywrightListOpenResult>;
      gpmPlaywrightStartFolder: (payload: GpmPlaywrightStartFolderPayload) => Promise<GpmPlaywrightStartFolderResult>;
      gpmPlaywrightStopFolder: (profileKey: string) => Promise<GpmPlaywrightStopFolderResult>;
      /** Tab Logs: chỉ nhận lỗi (stderr, console.error, …), không phải full terminal. */
      onScriptErrorLog: (cb: (line: string) => void) => void;
      removeScriptErrorLogListener: () => void;
      getPersistedErrorLogs: () => Promise<{ lines: string[] }>;
      appendPersistedErrorLog: (line: string) => Promise<{ ok: boolean }>;
      clearPersistedErrorLogs: () => Promise<{ ok: boolean }>;
      minimizeApp: () => Promise<{ ok: boolean }>;
      getMavidGroups: () => Promise<{ items: Group[] }>;
      setMavidGroups: (payload: { items: Group[] }) => Promise<{ ok: boolean }>;
      getMavidWarnings: () => Promise<{ items: MavidWarningRow[] }>;
      setMavidWarnings: (payload: { items: MavidWarningRow[] }) => Promise<{ ok: boolean }>;
    };
  }
}
