export type Page = 'pipeline' | 'settings' | 'channels' | 'logs';

export type ScriptId =
  | 'tao-chrome-profile'
  | 'lay-thong-tin-youtube (video, channel)'
  | 'tao-batch-video-tu-audio'
  | 'tao-batch-video-reup-full'
  | 'lam-lai-video'
  | 'tao-thumbnail-flow'
  | 'tom-tat-meta-tu-transcript';

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
    id: 'lay-thong-tin-youtube (video, channel)',
    title: 'Lấy thông tin YouTube',
    summary: 'Đọc URL từ input.txt, lấy info kênh/playlist, xuất Excel vào channels/.',
    npmScript: 'lay-thong-tin-youtube (video, channel)',
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
    id: 'lam-lai-video',
    title: 'Làm lại video',
    summary: 'Làm lại 1 video đơn lẻ (overlay lên video đã tải).',
    npmScript: 'lam-lai-video',
  },
  {
    id: 'tao-thumbnail-flow',
    title: 'Tạo thumbnail (Flow)',
    summary: 'Tạo thumbnail qua Google Flow với prompt AI.',
    npmScript: 'tao-thumbnail-flow',
  },
  {
    id: 'tom-tat-meta-tu-transcript',
    title: 'Tóm tắt meta từ transcript',
    summary: 'Lấy transcript video → gửi Gemini → tạo meta (title, desc, tags).',
    npmScript: 'tom-tat-meta-tu-transcript',
  },
];

export interface AppStats {
  channels: number;
  outputs: number;
  downloads: number;
}

export interface ConstantsUiModel {
  flowSettings: { FLOW_URL: string; FLOW_PROJECT_ID: string };
  GEMINI_CONFIG: { URL: string; MAX_CONCURRENT: number };
  GEMINI_CHUNK_SIZE: { UPDATE_TRANSCRIPT: number; SUMMARY_CONTENT: number };
  LANGUAGES_NEED_UPDATE_TRANSCRIPT: string[];
  META_DATA: { NICHE: string; TITLE: string; DESCRIPTION: string; TAGS: string };
  DEFAULT_VIDEO: { BACKGROUND_VIDEO: string };
  AUDIO_SPEED: number;
  STOCK_VIDEO: {
    CROSSFADE_SEC: number;
    RENDER_EXTRA_SEC: number;
    SLOWMO_FACTOR: number;
    CANVAS_W: number;
    CANVAS_H: number;
    FPS: number;
    BITRATE: string;
    MAX_BITRATE: string;
    BUFSIZE: string;
  };
  SUBTITLE: {
    BOX_HEIGHT: number;
    BOX_OPACITY: number;
    FONT_SIZE: number;
    PADDING_TOP: number;
    PADDING_HORIZONTAL: number;
    CHAR_SPACING: number;
  };
  LOGO: { SIZE: number; MARGIN_TOP: number; MARGIN_RIGHT: number };
}

export interface ChannelFile {
  name: string;
  path: string;
  modifiedAt: string;
}

export interface ChannelRow {
  [key: string]: string | number | boolean | null;
}

export interface ChannelData {
  headers: string[];
  rows: ChannelRow[];
}

export interface VideoFromAudioConfig {
  mode: 'single' | 'batch';
  channel: string;
  background: string;
  stockVideoCount: number;
  audioSpeed: number;
  showLogo: boolean;
}

declare global {
  interface Window {
    runner: {
      runNpmScript: (npmScript: string, extraEnv?: Record<string, string>) => Promise<{ code: number }>;
      getConstantsUiModel: () => Promise<ConstantsUiModel>;
      saveConstantsUiModel: (model: ConstantsUiModel) => Promise<{ ok: boolean }>;
      listChannels: () => Promise<ChannelFile[]>;
      readChannelData: (filePath: string) => Promise<ChannelData>;
      listBackgrounds: () => Promise<string[]>;
      listChannelFolders: () => Promise<string[]>;
      getStats: () => Promise<AppStats>;
      readInputFile: () => Promise<string>;
      writeInputFile: (content: string) => Promise<{ ok: boolean }>;
      onScriptLog: (cb: (line: string) => void) => void;
      removeScriptLogListener: () => void;
    };
  }
}
