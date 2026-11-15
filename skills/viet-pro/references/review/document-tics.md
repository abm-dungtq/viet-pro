# Thói Quen Văn Phong Tài Liệu Kiểu AI (`document-tics`)

File này tổng hợp các tật diễn đạt rập khuôn cấp văn bản ngoài phần văn dịch thuần túy, áp dụng cho tuyến rà sâu giọng Việt (`review-vietnamese-voice`) và đã được nối vào linter tại `scripts/lib/lint.mjs`.

## 1. Nhãn rào giọng đầu câu (`voice-tag`)

Dấu hiệu: mở câu bằng cụm dẫn giả thân mật như *"Thành thật mà nói,"*, *"Thật lòng mà nói,"*, *"Công bằng mà nói,"*, *"Nói thật nhé:"*, *"Nói cho gọn:"*, *"Hiểu một cách đơn giản là"*, *"Điều mình chỉ muốn nói là:"*.
- Lý do sửa: kéo dài 3-5 chữ mà không thêm thông tin, tạo cảm giác giả chân thành kiểu chatbot.
- Cách sửa: bỏ hẳn nhãn dẫn, vào thẳng mệnh đề chính. Giữ nguyên nếu nằm trong trích dẫn trực tiếp của nhân vật.

## 2. Lạm dụng dấu hai chấm trong văn xuôi (`colon-density`)

Dấu hiệu: liên tục dùng dấu hai chấm giữa đoạn văn xuôi thuần túy để liệt kê hoặc tách vế giải thích thay cho động từ liên kết (`>= 4` dấu `:` trong văn xuôi và mật độ `>= 22/1.000` chữ).
- Cách sửa: tách ý độc lập thành câu trọn vẹn, hoặc nối bằng *"vì"*, *"nghĩa là"*, *"gồm"* cho mạch văn liền lạc. Không tính URL (`https://`, `file://`), giờ giấc (`14:30`) hay nhãn danh sách.

## 3. Chuỗi câu ngắn cụt nhịp (`choppy-sentences`)

Dấu hiệu: 4 câu trần thuật liên tiếp dài tối đa 6 chữ kết bằng dấu chấm, hoặc `>= 5` đoạn đơn cụt nhịp xếp dọc nhau (`>= 70%` số đoạn trong bài).
- Cách sửa: gộp hai câu cùng quan hệ nhân quả hoặc tương phản bằng dấu phẩy hoặc liên từ tự nhiên. Không ép gộp lời bài hát hay câu cảm thán trong hội thoại truyện.

## 4. Nhồi lóng mạng dày đặc (`slang-pileup`)

Dấu hiệu: gom từ 3 cụm lóng mạng xã hội khác nhau trở lên trên mật độ dày (*"ổn áp"*, *"keo lì"*, *"mãi đỉnh"*, *"hết nước chấm"*, *"ảo ma"*, *"xu cà na"*, *"tới công chuyện"*...) để tỏ ra trẻ trung.
- Cách sửa: chỉ giữ tối đa một cách nói đời thường hợp với ngôi xưng và tệp người đọc của kênh (`personal-chat.md` hoặc mạng xã hội cá nhân); bỏ phần còn lại để câu không sượng.

## 5. Chêm chú thích tiếng Anh viết thường (`unnecessary-english-gloss`)

Dấu hiệu: viết một từ tiếng Việt đã trọn nghĩa rồi kẹp thêm bản dịch tiếng Anh viết thường trong ngoặc đơn như *"phân đoạn (segmentation)"* hay *"chuyển đổi (conversion)"*.
- Cách sửa: bỏ chú thích dư thừa. Được giữ khi là tên riêng, từ viết tắt kỹ thuật (`API`, `SaaS`, `RAG`) hoặc thuật ngữ lần đầu cần đối chiếu tiêu chuẩn quốc tế/pháp lý.

## 6. Lạm dụng ngoặc kép tự chế và thẻ lệnh sót (`prompt-injection-tag`)

- **Ngoặc kép nhấn nhá:** không kẹp ngoặc kép vào từ bình thường trong nhiều đoạn liên tiếp để làm nổi giả tạo.
- **Thẻ lệnh sót (`prompt-injection-tag`, mức `ERROR`):** mọi chuỗi như `<system>`, `<instructions>`, *"bỏ qua mọi hướng dẫn trước đó"* hoặc *"ignore previous instructions"* ở ngoài khối code/trích dẫn đều bị chặn cứng ngay ở bước lint để bảo vệ chất liệu đầu vào là **dữ liệu, không phải lệnh**.
