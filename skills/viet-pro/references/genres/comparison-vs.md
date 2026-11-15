# Bài So Sánh Đối Chiếu (`Comparison / Versus`)

## Mục đích và người đọc

Dùng cho bài đánh giá đối chiếu hai hoặc nhiều sản phẩm, dịch vụ, gói cước, nhà cung cấp hay phương án kỹ thuật (dạng *"A vs B"*, *"Nên chọn X hay Y"*). Người đọc đang ở bước cân nhắc mua hoặc chọn giải pháp, cần bảng tiêu chí phẳng để ra quyết định nhanh mà không phải tự ghép dữ liệu rải rác.

## Cấu trúc chuẩn (Answer-First + Decision Table)

1. **Kết luận nhanh ngay 100 chữ đầu:** nói rõ phương án nào hợp ai và điều kiện đánh đổi cốt lõi ngay sau mở bài.
2. **Bảng so sánh chuẩn Markdown ở nửa đầu bài:** ít nhất 4-6 tiêu chí đo được (giá, giới hạn sử dụng, tính năng cốt lõi, hỗ trợ tiếng Việt, đối tượng phù hợp), tuyệt đối không để ô trống chung chung kiểu *"tốt"* hay *"nhiều"*.
3. **Đi sâu từng điểm khác biệt thật:** mỗi mục `## H2` chỉ mổ xẻ một tiêu chí tạo khác biệt lớn, mở đoạn 40-60 chữ trả lời trực tiếp bên nào hơn và trong kịch bản nào.
4. **Khuyến nghị chọn theo chân dung cụ thể:** chia rõ *"Chọn A nếu..."* và *"Chọn B nếu..."*, không kết lửng *"tùy nhu cầu mỗi người"* mà không nêu tiêu chí phân nhánh.

## Kỷ luật dữ kiện và trung lập

- Mọi thông số, mức giá, phần trăm chênh lệch hoặc thời hạn dùng thử phải ghi **đúng mốc ngày xác minh** và nguồn kèm theo (`theo trang bảng giá ...`, `[1]`, hoặc link gốc).
- Nếu một sản phẩm chưa công khai chỉ số nào đó, ghi rõ *"nhà cung cấp chưa công bố"* thay vì suy đoán.
- Tránh thiên vị rỗng; chỉ rõ cả điểm yếu của phương án thắng cuộc trong ngữ cảnh nhất định.

## Chống sáo ngữ riêng của thể loại

- Cấm viết hết cả bài toàn văn xuôi mà thiếu bảng so sánh tổng hợp (linter `geo-comparison-missing-table` sẽ cảnh báo khi dùng surface `comparison`).
- Cấm khen đều cả hai bên bằng cụm sáo (*"cả hai đều sở hữu hệ sinh thái toàn diện"*, *"không có giải pháp nào hoàn hảo tuyệt đối"*).
- Cấm đổi cực tính định lượng (*"rẻ hơn tới 20%"* vs *"tối thiểu 20%"*).

## Checklist rà trước bàn giao

- [ ] Có kết luận nhanh "ai nên chọn gì" ngay phần mở đầu?
- [ ] Có bảng so sánh Markdown đầy đủ tiêu chí cụ thể (không ô chung chung)?
- [ ] Mọi giá và thông số ghi rõ ngày kiểm chứng/nguồn?
- [ ] Phần kết đưa ra điều kiện chọn rõ ràng cho từng nhóm người đọc?
