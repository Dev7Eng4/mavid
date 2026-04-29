import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { downloadSingleVideo } from '../downloadVideo.js';
import { processImageOption } from './imageOption.js';
import { MAKE_VIDEO_MODE } from '../constants/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

async function main() {
  const url = 'https://www.youtube.com/watch?v=YVieJHhkkpY';
  console.log(`=== Test Make Video Image Option (Full Flow) ===`);
  console.log(`URL: ${url}`);

  const isolatedDownloadsDir = path.join(ROOT, 'downloads', `test_imageOption_${Date.now()}`);
  fs.mkdirSync(isolatedDownloadsDir, { recursive: true });

  console.log(`\n[1] Đang tải video/audio và xử lý phụ đề vào: ${isolatedDownloadsDir}`);
  const dlResult = await downloadSingleVideo(url, {
    mode: MAKE_VIDEO_MODE.FROM_AUDIO,
    outputDir: isolatedDownloadsDir,
  });

  if (!dlResult) {
    console.error('Tải video thất bại. Vui lòng kiểm tra lại quá trình download.');
    process.exit(1);
  }

  console.log(`\n[2] Tải hoàn tất! Bắt đầu gọi processImageOption...`);

  // Dựng đường dẫn thư mục xuất riêng biệt để kiểm tra kết quả cuối cùng (giống batch mode)
  const perVideoDir = path.join(ROOT, 'outputs', `test_imageOption_result_${Date.now()}`);

  try {
    const result = await processImageOption({
      downloadsDir: isolatedDownloadsDir,
      videoLanguage: 'ja', // Mặc định dùng 'ja' hoặc để undefined cho hàm tự detect
      bgNameArg: null,
      originalTitle: dlResult.title,
      description: dlResult.description,
      tags: dlResult.tags,
      url: url,
      perVideoDir: perVideoDir, // processStockVideo ở Bước 6 sẽ dùng biến này để copy thành phẩm ra đây
      autoGenerateImage: true,
    });

    console.log(`\n=== KẾT QUẢ THÀNH CÔNG ===`);
    console.log(`Tổng chapters xử lý: ${result.allChapters.length}`);
    console.log(`Tổng ảnh sinh ra (prompts): ${result.chapterImagePrompts.length}`);
    console.log(`Thư mục lưu video đầu ra: ${perVideoDir}`);
    console.log(`Thư mục chứa tài nguyên tải về: ${isolatedDownloadsDir}`);

    // Lưu kết quả JSON ra perVideoDir để theo dõi các prompt đã dùng
    fs.mkdirSync(perVideoDir, { recursive: true });
    const outputPath = path.join(perVideoDir, 'imageOption_prompts_result.json');
    const { allObjects, ...saveData } = result;
    fs.writeFileSync(outputPath, JSON.stringify(saveData, null, 2), 'utf-8');
    console.log(`Đã lưu file log JSON tại: ${outputPath}`);
  } catch (e) {
    console.error(`\nLỗi khi chạy processImageOption: ${e.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled Error:', err.message || err);
  process.exit(1);
});
