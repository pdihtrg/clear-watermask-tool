# SVG Studio

Web tĩnh, không cần cài thư viện. Mở `dist/index.html` để dùng hoặc chạy:

```powershell
python -m http.server 8080 --directory dist
```

Truy cập http://localhost:8080 bằng Chrome/Edge để dùng nút Copy ảnh. Clipboard cần HTTPS hoặc localhost và quyền trình duyệt.

Chọn/kéo thả nhiều SVG để tự động xoá chữ `Visual Paradigm Enterprise [evaluation copy]`, phần tử có ID/class watermark, và các cụm chữ bổ sung. Chọn xuất SVG vector để zoom không vỡ nét hoặc PNG để chia sẻ/copy ảnh. SVG copy vào clipboard dưới dạng mã; PNG copy trực tiếp như ảnh. Có thể tắt xoá watermark, đổi độ phân giải/nền PNG và áp dụng lại. Tải riêng file hoặc tất cả dưới dạng ZIP. File lỗi được báo riêng, không dừng cả lượt.

Không sửa SVG gốc, không gửi nội dung file lên server. Watermark dạng path hoặc gộp vào bitmap không được tự nhận diện. Mỗi ảnh được giới hạn 32 triệu pixel để giảm nguy cơ hết bộ nhớ; cạnh dài tối đa theo cấu hình. SVG tham chiếu tài nguyên ngoài phải nhúng ảnh trước.
