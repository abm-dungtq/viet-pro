# Microcopy giao diện (UI Microcopy)

## Mục đích và người đọc

Dùng cho toàn bộ chữ ngắn trên web, ứng dụng di động và công cụ nội bộ: nhãn nút (button), tiêu đề hộp thoại xác nhận, thông báo lỗi, trạng thái trống (empty state), gợi ý ô nhập (placeholder), tooltip, nhãn trạng thái và thông báo kết quả (toast).

Người đọc đang tập trung hoàn thành tác vụ và chỉ liếc qua chữ trong 1-2 giây. Từ ngữ dư thừa hoặc mơ hồ dễ khiến người dùng bấm nhầm hoặc bỏ dở thao tác.

## Cấu trúc chuẩn theo thành phần

1. **Nhãn nút và liên kết hành động (1-4 từ)**
   Bắt đầu bằng động từ cụ thể kèm đối tượng tác động ("Lưu thay đổi", "Tạo đơn mới", "Xuất file CSV"). Với thao tác không thể hoàn tác, ghi rõ hậu quả trên nút ("Xóa vĩnh viễn tài khoản"). Tránh nhãn mơ hồ như "OK", "Có", "Xác nhận".
2. **Thông báo lỗi (1-2 câu, đủ 3 phần)**
   Nêu rõ chuyện gì vừa xảy ra, nguyên nhân cụ thể và cách khắc phục ngay. Ví dụ: "Không thể tải tệp lên vì dung lượng vượt quá 10 MB. Hãy nén tệp hoặc chọn bản PDF dưới 10 MB."
3. **Trạng thái trống (Empty state)**
   Gồm 1 câu nêu chức năng màn hình khi có dữ liệu, 1 gợi ý bước đầu tiên và 1 nút tạo mới đồng bộ nhãn với thanh công cụ chính.
4. **Hộp thoại xác nhận (Confirmation modal)**
   Tiêu đề đặt câu hỏi nêu đích danh đối tượng ("Xóa mẫu báo cáo tháng 10?"), thân 1 câu giải thích hệ quả nếu có, cặp nút phân biệt rõ hành động chính và nút hủy ("Giữ lại" hoặc "Hủy thao tác").
5. **Gợi ý nhập liệu và mô tả trường**
   Placeholder chỉ đưa ví dụ định dạng ("ví dụ 0901234567"); quy tắc bắt buộc hay điều kiện mật khẩu đặt ở dòng mô tả cố định dưới ô nhập để không mất khi người dùng gõ.

## Giọng văn và ngôi xưng

- Ngắn, trực diện, bình tĩnh và tôn trọng thao tác người dùng.
- Nhãn nút và tiêu đề nhỏ không cần đại từ nhân xưng; câu hướng dẫn và báo lỗi dùng thống nhất một ngôi ("bạn" hoặc "Anh/Chị") theo `.viet-pro.json`.
- Nhất quán tuyệt đối 1 thuật ngữ cho 1 khái niệm trên toàn sản phẩm (đã chọn "Không gian làm việc" thì không đổi thành "Nhóm" hay "Dự án" ở màn hình sau).

## Chống sáo ngữ riêng của thể loại

- Cấm câu báo lỗi sáo rỗng ("Rất tiếc! Đã có sự cố bất ngờ, vui lòng thử lại sau") khi hệ thống đã biết rõ nguyên nhân.
- Cấm đổ lỗi hoặc lên giọng ("Bạn đã nhập sai định dạng!", "Thao tác không hợp lệ!").
- Cấm lộ mã lỗi nội bộ ("NullPointerException", "HTTP 500 timeout") trực tiếp trước mắt người dùng; nếu cần mã tra cứu, đặt gọn cuối dòng.
- Cấm viết hoa toàn bộ câu hoặc đặt dấu chấm than vào nhãn nút và thông báo lỗi thông thường.

## Checklist rà trước bàn giao

- [ ] Nhãn nút mở bằng động từ cụ thể, khớp đúng hành động thực tế?
- [ ] Thông báo lỗi đủ 3 phần: chuyện xảy ra, nguyên nhân và cách sửa ngay?
- [ ] Thuật ngữ đối tượng và trạng thái nhất quán 100% giữa các màn hình?
- [ ] Không đổ lỗi người dùng và không lộ mã lỗi kỹ thuật thô?
- [ ] Văn bản vừa khung giao diện, không còn placeholder thừa?
