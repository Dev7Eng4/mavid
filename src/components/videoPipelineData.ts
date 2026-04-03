export type ScriptDef = {
  id: string;
  title: string;
  npmScript: string;
  summary: string;
  inputs: string[];
  outputs: string[];
};

export const scriptDefs: ScriptDef[] = [
  {
    id: 'chrome-profile',
    title: 'Tạo / Load Chrome profile',
    npmScript: 'tao-chrome-profile',
    summary: 'Mở Chrome persistent để đăng nhập Google lần đầu (cần thao tác tay).',
    inputs: ['Không có (mặc định dùng profile1).'],
    outputs: ['chrome-profile/profileN (lưu session).'],
  },
  {
    id: 'youtube-info',
    title: 'Lấy thông tin YouTube (video/channel/playlist)',
    npmScript: 'lay-thong-tin-youtube (video, channel)',
    summary: 'Đọc `input.txt` (URL đầu tiên), tạo/ cập nhật file Excel trong `channels/`.',
    inputs: ['`input.txt` (ít nhất 1 URL YouTube).'],
    outputs: ['`channels/<id>/<id>.xlsx` (hoặc cập nhật file hiện có).'],
  },
  {
    id: 'batch-from-audio',
    title: 'Tạo batch video từ audio',
    npmScript: 'tao-batch-video-tu-audio',
    summary: 'Lấy danh sách video từ `channels/` rồi tạo video theo pipeline from_audio.',
    inputs: ['Thư mục `channels/` đã có output.xlsx/output.csv.', 'Có thể script sẽ hỏi chọn channel folder nếu có nhiều folder.'],
    outputs: ['Tạo file video trong `remade_videos/` theo từng videoId.'],
  },
  {
    id: 'batch-reup-full',
    title: 'Tạo batch video reup full',
    npmScript: 'tao-batch-video-reup-full',
    summary: 'Remake full: thêm overlay ảnh/video cho từng video trong danh sách batch.',
    inputs: ['Thư mục `channels/` đã có output.xlsx/output.csv.', 'Có thể script sẽ hỏi chọn channel folder nếu có nhiều folder.'],
    outputs: ['Tạo file video trong `remade_videos/` theo từng videoId.'],
  },
  {
    id: 'remake-from-full',
    title: 'Làm lại video (remade_videos)',
    npmScript: 'lam-lai-video',
    summary: 'Chạy `makeVideoFromFull.js` để remake tất cả video trong `downloads/`.',
    inputs: ['`downloads/` chứa video nguồn.', '`backgrounds/overlay/` chứa overlay ảnh/video.'],
    outputs: ['`remade_videos/<video>_remade.mp4` hoặc theo cấu trúc script.'],
  },
  {
    id: 'thumbnail-flow',
    title: 'Tạo thumbnail flow',
    npmScript: 'tao-thumbnail-flow',
    summary: 'Tạo thumbnail bằng Google Flow (Playwright).',
    inputs: ['(Tùy script) path save và output basename có thể truyền qua CLI.'],
    outputs: ['Thư mục `images/` và file thumbnail theo output basename.'],
  },
  {
    id: 'meta-from-transcript',
    title: 'Tóm tắt meta từ transcript',
    npmScript: 'tom-tat-meta-tu-transcript',
    summary: 'Đọc URL đầu tiên từ `input.txt`, tải transcript, rồi dùng Gemini tóm tắt meta.',
    inputs: ['`input.txt` (URL video).'],
    outputs: ['`downloads/meta-from-transcript.json`.'],
  },
];

