import fs from 'fs';

// Hàm tự parse nội dung file SRT thay cho thư viện
const parseSrt = srtData => {
  // Chuẩn hóa ký tự xuống dòng (tránh lỗi trên các HĐH khác nhau) và chia thành các block
  const blocks = srtData.replace(/\r\n/g, '\n').split('\n\n');
  const items = [];

  blocks.forEach(block => {
    if (!block.trim()) return; // Bỏ qua các block rỗng

    const lines = block.split('\n');
    if (lines.length >= 3) {
      // Dòng 0 là ID, dòng 1 là thời gian, từ dòng 2 trở đi là nội dung
      const timeLine = lines[1];
      const timeParts = timeLine.split(' --> ');

      if (timeParts.length === 2) {
        items.push({
          startTime: timeParts[0].trim(),
          endTime: timeParts[1].trim(),
          text: lines.slice(2).join(' ').trim(), // Nối nhiều dòng text thành 1 dòng
        });
      }
    }
  });

  return items;
};

// Helper để convert "00:00:20,000" sang ms
const timeToMS = timeStr => {
  const [h, m, s] = timeStr.split(':');
  const [sec, ms] = s.split(',');
  return (+h * 3600 + +m * 60 + +sec) * 1000 + +ms;
};

const processSrt = filePath => {
  const srtData = fs.readFileSync(filePath, 'utf8');
  const items = parseSrt(srtData); // Dùng hàm tự viết ở trên

  if (items.length === 0) return [];

  const CHUNK_DURATION_MS = 180 * 1000; // 3 phút
  let chunks = [];
  let currentChunk = { startTime: items[0].startTime, text: [] };

  items.forEach((item, index) => {
    const currentTime = timeToMS(item.startTime);
    const chunkStartTime = timeToMS(currentChunk.startTime);

    if (currentTime - chunkStartTime > CHUNK_DURATION_MS) {
      chunks.push({
        // Dùng endTime của item trước đó để đóng timeRange cho chính xác
        timeRange: `${currentChunk.startTime} --> ${items[index - 1].endTime}`,
        content: currentChunk.text.join(' '),
      });
      // Reset chunk mới
      currentChunk = { startTime: item.startTime, text: [item.text] };
    } else {
      currentChunk.text.push(item.text);
    }
  });

  // Đẩy chunk cuối cùng vào mảng (code cũ của bạn bị thiếu phần này)
  if (currentChunk.text.length > 0) {
    chunks.push({
      timeRange: `${currentChunk.startTime} --> ${items[items.length - 1].endTime}`,
      content: currentChunk.text.join(' '),
    });
  }

  return chunks;
};

const chunks = processSrt(
  '../../downloads/콩팥 녹이는 최악의 과일 4가지 vs 죽어가는 신장 살리는 기적의 과일 4가지! 30년 신장내과 명의의 밥상 공개 - 만성신부전 식단 -신장 - 신장건강 - 노후건강 - 건강 팁-SXiglNLv_Ig.ko.srt'
);
console.log(chunks);
// console.log(chunks.map(item => item.content).join(' '));
