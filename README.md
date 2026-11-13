# SVG Studio

Web tĩnh, chạy hoàn toàn trong trình duyệt, không cần backend hay thư viện cài thêm. Kéo thả/chọn nhiều SVG để:

- Tự xoá chữ watermark Visual Paradigm, ID/class có `watermark`, hoặc cụm chữ do bạn nhập.
- Mở **Chọn phần tử cần xoá** trên từng ảnh để xoá thủ công một hay nhiều phần tử SVG.
- Xuất PNG nền trong suốt/trắng, JPG nền trắng, hoặc SVG vector đã chỉnh sửa.
- Copy PNG, tải từng file, hoặc tải tất cả trong ZIP.

SVG gốc không bị sửa. Nội dung file không rời khỏi trình duyệt. Watermark đã gộp vào path/ảnh không thể nhận diện an toàn tự động.

## Chạy thử trên máy

```powershell
python -m http.server 8765 --directory dist
```

Mở http://localhost:8765 bằng Chrome hoặc Edge để dùng copy ảnh.

## Đưa lên GitHub Pages

1. Đẩy thư mục dự án này lên một repository GitHub (nhánh `main`).
2. Trong repository, mở **Settings → Pages** và chọn **GitHub Actions** làm nguồn deploy.
3. Mỗi lần đẩy commit lên `main`, workflow sẽ xuất bản nội dung trong `dist/`.

Để xuất SVG từ Visual Paradigm, mở sơ đồ rồi chọn **Project → Export → Active Diagram as Image…**, chọn định dạng **SVG** và lưu file. Sau đó tải SVG lên đây. Tên mục có thể hơi khác giữa các phiên bản Visual Paradigm. [Hướng dẫn chính thức](https://www.visual-paradigm.com/support/documents/vpuserguide/124/131/6559_exportingact.html).
