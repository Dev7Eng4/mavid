export const prompt = () => `
Bạn là một biên kịch chuyên nghiệp. Hãy phân tích đoạn hội thoại/transcript dưới đây (từ ${timeRange}):

Tóm tắt ngắn gọn diễn biến chính (không quá 3 câu).

Liệt kê các nhân vật xuất hiện và trạng thái cảm xúc của họ.

Xác định bối cảnh không gian (phòng ngủ, ngoài đường, quán cà phê...).

Ghi lại các từ khóa hình ảnh quan trọng (ví dụ: chiếc nhẫn bị vỡ, cơn mưa tầm tã).

Transcript: ${content}
`;
