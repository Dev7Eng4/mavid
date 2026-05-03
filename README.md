Xem xét giảm video reup xuống 720 để tăng tốc độc render

update thêm, có thể chọn video bắt đầu tạo hoặc bắt đầu upload : từ đầu đến cuối, ngược lại, random (sẽ lấy video đầu, cuối, giữa,...)

# AUDIO

- biến đổi video stock: lật ngang, zoom, crop, đổi màu , đổi tốc độ, có thể cắt nhỏ clip stock

- thêm sương, bụi rơi

- lưu số lần đã sử dụng -> chọn những video stock có số lần thấp

# BIẾN ĐỔI AUDIO

- thay đổi pitch cao độ: FFmpeg: asetrate=44100\*1.05,atempo=1/1.05 (Tăng pitch nhưng giữ nguyên tốc độ).
- Equalizer (Bộ cân bằng): Tăng dải Bass để giọng đọc có độ dày và ấm (giống các radio host chuyên nghiệp).
  -Chèn khoảng lặng (Pauses): Đây là kỹ thuật quan trọng nhất của storytelling. Hãy chèn những khoảng lặng 1-2 giây sau những câu nói gây sốc để người xem kịp "thấm".

# upload video

phần schedule phải scroll lên trk khi select

# trong detail khi click tạo thì không cần check 60 phút hay không

5

SUBTITLE LENGTH CONSTRAINT:

- Each subtitle line should be SHORT and readable.
- Prefer:
  - 15–40 Japanese characters per line (soft limit)
- HARD RULE:
  - Do NOT exceed ~50 characters unless absolutely necessary.
- If a sentence is long → split into multiple logical subtitle lines.

// update channel background loi

// retry của tạo scene chưa dc
// sau khi có scene phải validate thứ tự start, end index dung chưa, nếu cái nào ko đúng thì bỏ
// edge case -> không lấy dc response
