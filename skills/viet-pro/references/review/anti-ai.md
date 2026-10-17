# Router Humanizer

Humanizer là một lớp biên tập giúp văn xuôi rõ, cụ thể và tự nhiên hơn. Dấu hiệu trong tài liệu này **không chứng minh** văn bản do AI tạo ra.

## Chọn mức rà

- **Mặc định, kiểm tra nhẹ:** áp dụng cho mọi văn xuôi công khai. Tìm chatbot residue, mở bài dàn cảnh, công thức đối lập, nhãn bold trang trí, câu kết kịch tính và cụm dấu hiệu lặp lại. Chỉ sửa phần gây cản trở.
- **Rà đầy đủ:** đọc toàn bộ `humanizer-patterns.md` khi người dùng yêu cầu humanize, "bớt AI", audit dấu hiệu AI hoặc khi một đoạn có nhiều dấu hiệu đồng thời.
- **Không áp:** code, frontmatter, lệnh, dữ liệu có cấu trúc và đích URL. Với tài liệu kỹ thuật, chỉ sửa phần văn xuôi.

## Quy trình

1. **Phát hiện:** đánh dấu pattern và đoạn liên quan; pattern mạnh 1-5 có thể đáng sửa từ một lần xuất hiện, pattern yếu cần thành cụm hoặc gây hại rõ.
2. **Viết lại theo đoạn:** nêu ý chính sớm hơn, thay khái quát bằng chi tiết có sẵn, bỏ nhịp/cấu trúc trang trí. Không cố tình thêm lỗi để "giống người".
3. **Đối chiếu dữ kiện:** so trước/sau với tên, số, ngày, URL, quote (kể cả dấu bao quanh khi phải giữ nguyên), citation, thứ hạng, quan điểm, CTA được yêu cầu và chi tiết xảy ra đồng thời.
4. **Trả bản cuối:** mặc định chỉ đưa bản đã sửa và cảnh báo dữ kiện cần thiết. Khi người dùng yêu cầu audit, thêm pattern, đoạn liên quan, lý do sửa và nguy cơ mất dữ kiện.

- Khi đoạn văn có nhiều dấu hiệu dịch sát tiếng Anh cùng lúc ("việc/sự", "được… bởi", "thực hiện/tiến hành"…) hoặc người dùng nhờ sửa "văn dịch", đọc [translationese-vi.md](translationese-vi.md). Không áp cho văn bản hành chính.

## Nguyên tắc chặn sửa quá tay

- Brief và giọng mẫu đứng trên các heuristic phong cách.
- Một dấu gạch ngang, một câu ngắn, một phép đối lập hay một ẩn dụ có ích không phải lỗi.
- Nội dung marketing vẫn được thuyết phục và giữ CTA khi brief yêu cầu; chỉ bỏ phóng đại rỗng hoặc claim thiếu nguồn.
- Nếu bản gốc đã tự nhiên, giữ nguyên phần lớn câu chữ. Mục tiêu là thay đổi tối thiểu có ích, không đồng nhất hóa giọng viết.

Danh mục đầy đủ: `humanizer-patterns.md`. Linter chỉ bắt các dấu hiệu ổn định; pattern cần hiểu ngữ nghĩa phải do người/model rà trong ngữ cảnh.
