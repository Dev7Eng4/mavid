import youtubeDl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Luôn dùng đường dẫn tuyệt đối cho cwd — tránh yt-dlp ghi nhầm theo thư mục chạy lệnh */
const DOWNLOADS_DIR = path.resolve(path.join(__dirname, '..', 'downloads'));

export const test = async () => {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }

    /**
     * Phụ đề tự động thường có ext dạng ja.vtt → tên file *.ja.vtt (không phải chỉ *.vtt).
     * Đặt cwd = downloads + output tương đối: trên Windows tránh lỗi với -o có dấu \.
     */
    const outputTemplate = '%(title)s-%(id)s.%(ext)s';

    await youtubeDl(
      'https://www.youtube.com/watch?v=tEGUhZfkezg',
      {
        output: outputTemplate,
        skipDownload: true,
        writeSub: false,
        writeAutoSub: true,
        convertSubs: 'vtt',
        subLangs: 'ja',
        sleepSubtitles: 5,
        noCheckCertificates: true,
        noWarnings: true,
        addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
      },
      { cwd: DOWNLOADS_DIR },
    );

    const vttInFolder = fs
      .readdirSync(DOWNLOADS_DIR)
      .filter((f) => f.endsWith('.vtt'))
      .map((f) => path.join(DOWNLOADS_DIR, f));
    const forThisVideo = vttInFolder.filter((p) => p.includes('tEGUhZfkezg'));

    console.log('Thư mục downloads:', DOWNLOADS_DIR);
    if (forThisVideo.length) {
      console.log('File VTT vừa tải (theo id video):');
      forThisVideo.forEach((p) => console.log(' ', p));
    } else if (vttInFolder.length) {
      console.log('Có file .vtt trong downloads (kiểm tra id nếu cần):');
      vttInFolder.slice(-5).forEach((p) => console.log(' ', p));
    } else {
      console.warn('Không thấy file .vtt trong downloads — kiểm tra yt-dlp / mạng.');
    }
  } catch (error) {
    console.error(error);
  }
};

test();
