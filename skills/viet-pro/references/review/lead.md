# Router kiểm duyệt

Rà theo rủi ro và brief, không áp house style máy móc.

## Chọn reference

- Dấu câu/khoảng cách: `punctuation.md`.
- Viết hoa/tiêu đề: `capitalization.md`.
- Độ tự nhiên: `natural.md` và router `anti-ai.md`. Đọc `translationese-vi.md` và `document-tics.md` khi cần rà sâu giọng Việt (`review-vietnamese-voice`); đọc toàn bộ `humanizer-patterns.md` khi người dùng yêu cầu humanize/audit hoặc khi nhiều dấu hiệu tụ trong cùng đoạn. Đây là tín hiệu biên tập, không phải công cụ xác định tác giả.
- Tone, thuật ngữ và xung đột quy tắc: `consistency.md`.
- Số liệu, quote, claim hiện hành hoặc nội dung nhạy cảm: `fact-check.md`.

Chạy `scripts/lint-vietnamese-content.mjs` khi có file Markdown. Lint cung cấp vị trí cần xem lại; WARN không phải lỗi tự động. Luôn rà nội dung trong ngữ cảnh và tôn trọng style guide người dùng đã chọn.

## Phán quyết

- `DUYỆT NỘI DUNG`: đúng brief, đủ bằng chứng và đạt yêu cầu ngôn ngữ/kênh.
- `CẦN SỬA`: nêu đoạn cụ thể, loại lỗi, tác động và cách sửa tối thiểu.
- `BLOCKED`: thiếu dữ kiện/quyền/nguồn khiến không thể đánh giá trung thực.

Một agent tự rà bài của chính mình là self-review, không phải review độc lập. Chỉ gọi là độc lập khi một context/agent khác thực sự đánh giá output mà không được mớm kết luận.

`DUYỆT NỘI DUNG` không đồng nghĩa đã được phép đăng hoặc gửi ra ngoài.
