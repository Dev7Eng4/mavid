import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateRandomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function main() {
  const demoDir = __dirname;
  console.log(`Đang quét thư mục: ${demoDir}`);

  // Tìm tất cả các file excel (.xlsx, .xls) trong thư mục
  const files = fs.readdirSync(demoDir);
  const excelFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return (ext === '.xlsx' || ext === '.xls') && !file.startsWith('~$');
  });

  if (excelFiles.length === 0) {
    console.log('Không tìm thấy file Excel nào trong thư mục này.');
    return;
  }

  excelFiles.forEach(fileName => {
    const filePath = path.join(demoDir, fileName);
    console.log(`\n----------------------------------------`);
    console.log(`Đọc file: ${fileName}`);
    console.log(`----------------------------------------`);

    try {
      const workbook = XLSX.readFile(filePath);
      
      // Duyệt qua từng sheet trong file
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Chuyển sheet thành dạng array of objects (mỗi hàng là 1 object, key là tiêu đề cột)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (rawData.length === 0) {
          console.log(`Sheet [${sheetName}]: Không có dữ liệu.`);
          return;
        }

        // Tìm cột có tên chứa từ khóa "status" hoặc "trạng thái" (không phân biệt hoa thường)
        const firstRow = rawData[0];
        const statusKeys = Object.keys(firstRow).filter(key => {
          const keyLower = key.toLowerCase();
          return keyLower.includes('status') || keyLower.includes('trạng thái') || keyLower.includes('trạng_thái');
        });

        if (statusKeys.length === 0) {
          console.log(`Sheet [${sheetName}]: Không tìm thấy cột nào có tên tương tự 'status' hoặc 'trạng thái'.`);
          // Nếu không tìm thấy cột status rõ ràng, liệt kê các cột hiện có để người dùng biết
          console.log(`Các cột hiện có: ${Object.keys(firstRow).join(', ')}`);
          return;
        }

        console.log(`Sheet [${sheetName}]: Tìm thấy các cột trạng thái: ${statusKeys.join(', ')}`);

        // Lọc các hàng có ít nhất một cột status không trống
        const itemsWithStatus = rawData.filter(row => {
          return statusKeys.some(key => {
            const val = String(row[key] || '').trim();
            return val !== '';
          });
        });

        if (itemsWithStatus.length === 0) {
          console.log(`Sheet [${sheetName}]: Không có hàng nào có thông tin status.`);
        } else {
          console.log(`Sheet [${sheetName}]: Tìm thấy ${itemsWithStatus.length}/${rawData.length} hàng có status:`);
          
          const results = [];

          itemsWithStatus.forEach((item, index) => {
            // Tạo chuỗi mô tả các trường của item để in ra cho đẹp
            const details = Object.entries(item)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ');
            console.log(`  ${index + 1}. ${details}`);

            // Lấy link video và trích xuất videoId
            const linkKey = Object.keys(item).find(k => 
              k.toLowerCase().includes('link video') || 
              k.toLowerCase().includes('link') || 
              k.toLowerCase().includes('url')
            );
            
            let videoId = '';
            if (linkKey && item[linkKey]) {
              const urlStr = String(item[linkKey]).trim();
              try {
                // Hỗ trợ cả url đầy đủ hoặc chỉ là tham số
                if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be')) {
                  const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
                  if (urlObj.hostname.includes('youtu.be')) {
                    videoId = urlObj.pathname.substring(1);
                  } else {
                    videoId = urlObj.searchParams.get('v') || '';
                  }
                } else {
                  // Fallback dùng regex tìm v=...
                  const match = urlStr.match(/[?&]v=([^&#]+)/);
                  if (match) {
                    videoId = match[1];
                  } else {
                    videoId = urlStr;
                  }
                }
              } catch (e) {
                // Regex fallback nếu parse URL lỗi
                const match = urlStr.match(/[?&]v=([^&#]+)/);
                videoId = match ? match[1] : urlStr;
              }
            }

            // Lấy status đầu tiên tìm thấy
            const rawStatus = String(item[statusKeys[0]] || '').trim();
            let status = rawStatus;
            if (rawStatus === 'Đã tạo video') {
              status = 'Created';
            } else if (rawStatus === 'Đã đăng video') {
              status = 'Uploaded';
            }

            if (videoId) {
              results.push({
                id: generateRandomId(),
                videoId,
                title: '',
                status
              });
            }
          });

          // Lưu kết quả vào file videos.json trong cùng thư mục
          const outputPath = path.join(demoDir, 'videos.json');
          fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
          console.log(`\nĐã lưu ${results.length} items vào file: ${outputPath}`);
        }
      });
    } catch (error) {
      console.error(`Lỗi khi đọc file ${fileName}:`, error.message);
    }
  });
}

main();


