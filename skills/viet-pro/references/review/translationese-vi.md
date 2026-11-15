# Văn dịch tiếng Việt

File này dùng để sửa câu bị dịch sát từ tiếng Anh: đúng ngữ pháp nhưng người Việt không nói như vậy. Linter (`scripts/lib/lint.mjs`) tự động phát cảnh báo `translationese-cluster` (mức `WARN`) khi một đoạn tụ từ **3 dấu hiệu trở lên** và `translationese-filler-density` khi mật độ hư từ dịch thuật đạt từ **115/1.000 chữ** trở lên. Chỉ sửa khi các dấu hiệu tụ thành cụm hoặc làm câu nặng nề; không cấm từng từ riêng lẻ, và miễn trừ tự động cho văn bản hành chính/pháp lý (`Số: ...`, `Kính gửi:`, `Căn cứ ...`, `Điều ...`).

## Giữ nguyên khi

- Văn bản hành chính và văn bản pháp lý ("việc", "thực hiện", "đối với", "các", "những" là văn phong chuẩn ở đây).
- Trích dẫn, tên văn bản, tên chương trình hoặc thuật ngữ chuyên ngành cố định.
- Giọng mẫu của người dùng chủ đích dùng các cấu trúc này.

## Dấu hiệu

### Danh từ hóa bằng "việc/sự"

Dấu hiệu: động từ bị bọc thành danh từ rồi làm chủ ngữ, câu thêm một tầng mà không thêm nghĩa.
Trước: "Việc áp dụng phần mềm mới giúp cho sự phối hợp giữa các phòng trở nên nhanh hơn."
Sau: "Từ khi dùng phần mềm mới, các phòng phối hợp nhanh hơn."

### "Một cách + tính từ"

Dấu hiệu: trạng từ tiếng Anh dịch thành cụm "một cách…" trong khi tiếng Việt chỉ cần tính từ.
Trước: "Đội ngũ xử lý đơn hàng một cách nhanh chóng và một cách chính xác."
Sau: "Đội ngũ xử lý đơn hàng nhanh và đúng."

### Bị động có tác nhân "được… bởi"

Dấu hiệu: câu bị động kiểu "was developed by" giữ nguyên trật tự tiếng Anh. Bị động "được/bị" không kèm tác nhân vẫn tự nhiên trong tiếng Việt; đừng cấm bị động nói chung.
Trước: "Ứng dụng được phát triển bởi một nhóm sinh viên Đà Nẵng."
Sau: "Một nhóm sinh viên Đà Nẵng làm ra ứng dụng này."

### "Thông qua việc"

Dấu hiệu: "through + V-ing" dịch thành "thông qua việc", kéo câu dài thêm.
Trước: "Cửa hàng tăng doanh thu thông qua việc mở rộng giờ bán buổi tối."
Sau: "Cửa hàng tăng doanh thu nhờ bán thêm buổi tối."

### "Đối với X thì"

Dấu hiệu: vỏ chủ đề "đối với… thì/mà nói" mở câu dù chủ đề đã rõ.
Trước: "Đối với khách hàng mới thì chúng tôi tặng phí giao hàng tháng đầu."
Sau: "Khách hàng mới được miễn phí giao hàng tháng đầu."

### Động từ rỗng "thực hiện/tiến hành + danh từ"

Dấu hiệu: động từ chính bị thay bằng "thực hiện", "tiến hành", "đưa ra" cộng danh từ.
Trước: "Nhóm sẽ tiến hành kiểm tra và đưa ra sự điều chỉnh trong tuần tới."
Sau: "Tuần tới nhóm sẽ kiểm tra và điều chỉnh."

### Cụm marketing dịch

Dấu hiệu: ẩn dụ quảng cáo tiếng Anh dịch nguyên: "mở khóa tiềm năng", "nâng tầm trải nghiệm", "hành trình chuyển đổi số", "bức tranh toàn cảnh".
Trước: "Khóa học giúp bạn mở khóa tiềm năng và nâng tầm trải nghiệm học tiếng Anh."
Sau: "Sau khóa học, bạn đọc được email công việc bằng tiếng Anh mà không cần tra từ."

### "Đóng vai trò quan trọng"

Dấu hiệu: "plays an important role" thay cho việc nói rõ vai trò đó là gì. Cụm này đã thấm vào văn viết tiếng Việt từ lâu, nên chỉ sửa khi nó che mất nội dung.
Trước: "Bao bì đóng vai trò quan trọng trong quyết định mua hàng."
Sau: "Nhiều khách chọn hộp quà chỉ vì bao bì đẹp."

### "Điều này có nghĩa là"

Dấu hiệu: câu diễn lại "This means that" mở đầu, nhắc lại điều câu trước đã nói.
Trước: "Giá nguyên liệu tăng 10%. Điều này có nghĩa là chi phí sản xuất sẽ cao hơn."
Sau: "Giá nguyên liệu tăng 10%, nên chi phí sản xuất cũng tăng."

### Chuỗi "của" lồng nhau

Dấu hiệu: định ngữ xếp chồng kiểu "the X of the Y of the Z", chủ ngữ bị lạc giữa câu.
Trước: "Sự hài lòng của khách hàng của chuỗi cửa hàng của công ty tăng lên."
Sau: "Khách của chuỗi cửa hàng hài lòng hơn trước."

### Mệnh đề quan hệ gượng ("nơi mà", "điều mà") và câu dịch sáo

Dấu hiệu: "where/which/what" dịch thẳng thành *"nơi mà"*, *"lý do mà"*, *"thời điểm mà"*, *"công cụ này cho phép bạn"*, hoặc thành ngữ dịch sát như *"ở cuối ngày"*, *"tin tốt là"*, *"cuối cùng nhưng không kém phần quan trọng"*.
Trước: "Đây là thời điểm mà bảng số liệu này cho phép bạn kiểm soát chi phí."
Sau: "Lúc này, bảng số liệu giúp bạn kiểm soát chi phí."

### Từ thừa nghĩa lặp lại (`pleonasm-vi`) và dày đặc hư từ (`translationese-filler-density`)

Dấu hiệu: ghép hai từ đồng nghĩa cạnh nhau (*"hiện nay đang"*, *"đang trong quá trình"*, *"hoàn toàn đầy đủ"*, *"vẫn còn đang"*, *"tái ... lại"*) hoặc nhồi quá nhiều *"một"*, *"các"*, *"những"*, *"được"*, *"sẽ"*, *"đã"*, *"rằng"*, *"của bạn"* làm câu dài lê thê.
Trước: "Hiện nay hệ thống của bạn vẫn còn đang trong quá trình tái kiểm tra lại toàn bộ các dữ liệu."
Sau: "Hệ thống đang kiểm tra lại toàn bộ dữ liệu."

## Cách sửa

1. Đọc cả đoạn, đánh dấu các dấu hiệu trên. Chỉ sửa khi chúng đi thành cụm trong cùng một đoạn.
2. Tìm động từ thật và chủ thể thật, đưa lên đầu câu.
3. Giữ nguyên số liệu, tên riêng, trích dẫn và mức độ chắc chắn của câu gốc.
4. Đọc lại thành tiếng. Nếu câu sửa nghe như văn nói quá mức so với kênh, lùi lại một bước.
