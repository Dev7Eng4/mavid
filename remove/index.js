import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CẤU HÌNH XÓA NỀN XANH (CHROMA KEY)
// ============================================================
const CONFIG = {
  // Thư mục chứa video đầu vào (chính là folder này)
  inputDir: __dirname,

  // Thư mục xuất video sau khi xóa nền
  outputDir: path.join(__dirname, 'output'),

  // Màu nền cần xóa: 'green' | 'blue' | hex color (vd: '0x00FF00')
  chromaColor: '#65A2D8',

  // Độ nhạy với màu (0.0 - 1.0): tăng để xóa nhiều vùng gần xanh hơn
  similarity: 0.8,

  // Độ pha trộn biên (0.0 - 1.0): tăng để viền mịn hơn
  blend: 0.5,

  // Định dạng video đầu vào được hỗ trợ
  videoExtensions: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'],

  // Codec xuất: libvpx-vp9 (WebM hỗ trợ kênh alpha trong suốt)
  outputFormat: 'webm',
};

// ============================================================

const LOG = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[OK]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  step: (msg) => console.log(`\x1b[35m[STEP]\x1b[0m ${msg}`),
};

/**
 * Lấy danh sách video trong thư mục inputDir
 */
function getVideoFiles(dir) {
  if (!fs.existsSync(dir)) {
    LOG.error(`Thư mục không tồn tại: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir);
  const videos = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return CONFIG.videoExtensions.includes(ext);
  });

  return videos;
}

/**
 * Xóa nền xanh cho một video bằng FFmpeg chromakey filter
 * Output: WebM với kênh alpha (trong suốt)
 */
async function removeGreenBackground(inputFile, outputFile) {
  // FFmpeg filter chromakey:
  //   color=<màu cần xóa>
  //   similarity=<độ nhạy>
  //   blend=<độ mịn viền>
  const chromaFilter = `chromakey=color=${CONFIG.chromaColor}:similarity=${CONFIG.similarity}:blend=${CONFIG.blend}`;

  const args = [
    '-y',                    // Ghi đè file nếu đã tồn tại
    '-i', inputFile,         // File đầu vào
    '-vf', chromaFilter,     // Filter xóa nền xanh
    '-c:v', 'libvpx-vp9',   // Codec VP9 hỗ trợ alpha (trong suốt)
    '-pix_fmt', 'yuva420p',  // Pixel format có kênh alpha
    '-b:v', '0',             // Bitrate tự động (chất lượng tốt nhất)
    '-crf', '18',            // Chất lượng (0=tốt nhất, 63=xấu nhất)
    '-auto-alt-ref', '0',    // Tắt alt-ref để hỗ trợ alpha trong VP9
    '-c:a', 'libopus',       // Codec âm thanh cho WebM
    outputFile,
  ];

  LOG.step(`Đang xử lý: ${path.basename(inputFile)}`);
  LOG.info(`Output: ${outputFile}`);

  const startTime = Date.now();

  try {
    await execFileAsync('ffmpeg', args, {
      maxBuffer: 1024 * 1024 * 50, // 50MB buffer
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    LOG.success(`Hoàn thành trong ${elapsed}s → ${path.basename(outputFile)}`);
    return { success: true, output: outputFile };
  } catch (err) {
    LOG.error(`Thất bại: ${path.basename(inputFile)}`);
    LOG.error(err.stderr || err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Hàm chính: quét folder → xóa nền xanh → lưu vào /output
 */
async function main() {
  console.log('\n' + '='.repeat(55));
  console.log('   🎬  XÓA NỀN XANH (CHROMA KEY REMOVAL)');
  console.log('='.repeat(55));

  // Tạo thư mục output nếu chưa có
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    LOG.info(`Đã tạo thư mục output: ${CONFIG.outputDir}`);
  }

  // Lấy danh sách video trong folder remove
  const videos = getVideoFiles(CONFIG.inputDir);

  if (videos.length === 0) {
    LOG.warn('Không tìm thấy video nào trong folder remove!');
    LOG.info(`Hỗ trợ định dạng: ${CONFIG.videoExtensions.join(', ')}`);
    return;
  }

  console.log(`\n📁 Tìm thấy ${videos.length} video:\n`);
  videos.forEach((v, i) => LOG.info(`  ${i + 1}. ${v}`));
  console.log('');

  // Xử lý từng video
  const results = [];
  for (let i = 0; i < videos.length; i++) {
    const videoFile = videos[i];
    const inputPath = path.join(CONFIG.inputDir, videoFile);
    const baseName = path.basename(videoFile, path.extname(videoFile));
    const outputPath = path.join(CONFIG.outputDir, `${baseName}_no_bg.${CONFIG.outputFormat}`);

    console.log(`\n[${i + 1}/${videos.length}] ─────────────────────────────────`);
    const result = await removeGreenBackground(inputPath, outputPath);
    results.push({ file: videoFile, ...result });
  }

  // Tổng kết
  console.log('\n' + '='.repeat(55));
  console.log('   📊  KẾT QUẢ XỬ LÝ');
  console.log('='.repeat(55));

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  LOG.success(`Thành công: ${succeeded.length}/${results.length} video`);

  if (failed.length > 0) {
    LOG.error(`Thất bại: ${failed.length} video`);
    failed.forEach((r) => LOG.error(`  ✗ ${r.file}`));
  }

  if (succeeded.length > 0) {
    console.log(`\n📂 Video đã xóa nền được lưu tại:\n   ${CONFIG.outputDir}\n`);
  }
}

main().catch((err) => {
  LOG.error('Lỗi không mong muốn: ' + err.message);
  process.exit(1);
});
