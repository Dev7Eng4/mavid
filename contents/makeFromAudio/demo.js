import youtubedl from 'youtube-dl-exec';

async function downloadVideo(url = 'https://www.youtube.com/watch?v=3_o9H1f8H5s', outputPath = './video.mp4') {
  const preferredFormats = [
    // 480p không âm thanh
    'bestvideo[height=480][ext=mp4]',
    'bestvideo[height=480]',
    // Backup: 360p
    'bestvideo[height=360][ext=mp4]',
    'bestvideo[height=360]',
    // Backup: 720p (nếu không có 480 hoặc thấp hơn)
    'bestvideo[height=720][ext=mp4]',
    'bestvideo[height=720]',
    // Backup cuối: video tốt nhất không âm thanh
    'bestvideo[ext=mp4]',
    'bestvideo',
  ];

  for (const format of preferredFormats) {
    try {
      console.log(`Thử tải với format: ${format}`);

      await youtubedl(url, {
        format,
        output: outputPath,
        noAudio: true,
      });

      console.log(`✅ Tải thành công với format: ${format}`);
      return { success: true, format };
    } catch (err) {
      console.warn(`⚠️ Format "${format}" không khả dụng, thử format tiếp theo...`);
    }
  }

  throw new Error('❌ Không thể tải video với bất kỳ format nào.');
}

// Sử dụng
const videoUrl = 'https://www.youtube.com/watch?v=3_o9H1f8H5s';

downloadVideo(videoUrl, './output.mp4')
  .then(result => console.log('Kết quả:', result))
  .catch(err => console.error(err.message));
