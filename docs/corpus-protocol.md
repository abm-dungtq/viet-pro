# Quy trình kho văn bản đo linter

## Mục đích

Đặt ngưỡng cho từng luật linter bằng số đo trên văn người viết và văn AI, trước khi bật bất kỳ luật nào theo mật độ từ ("việc", "thực hiện", "đối với"…). Không có kho này thì linter dễ phạt oan văn hành chính và báo chí, vốn tự nhiên đã dày các từ đó.

## Vị trí

- Kho nằm ở `/Volumes/2/Claude/Update-Skill/corpus/`, gồm hai thư mục `human/` và `ai/`.
- Kho nằm ngoài repo và **không bao giờ commit lên repo public**: nhiều bài còn trong thời hạn bảo hộ, chỉ được dùng để đo nội bộ.
- Mỗi thư mục có một `manifest.csv`, mỗi bài một dòng.

## Tiêu chí văn người viết

- Công bố trước 30/11/2022, ngày ChatGPT ra mắt. Văn sau mốc này có thể đã qua tay AI.
- Ghi vào `manifest.csv`: tên file, nguồn (URL hoặc tên sách/báo), ngày công bố, thể loại, quyền sử dụng (hết bảo hộ, không thuộc đối tượng bảo hộ, hoặc chỉ dùng để đo nội bộ).
- Đủ thể loại, mỗi thể loại ít nhất 15% kho: báo, blog, mạng xã hội, hành chính, văn chương.
- Không lấy bài có dữ liệu cá nhân của người khác (số điện thoại, địa chỉ, ảnh chụp tin nhắn riêng).

## Tiêu chí văn AI

- Sinh từ cùng chủ đề và cùng thể loại với văn người viết, để so cùng điều kiện.
- Ít nhất 3 họ mô hình (ví dụ Claude, GPT, Gemini), mỗi họ không quá một nửa kho.
- Ghi vào `manifest.csv`: tên file, model, ngày sinh, prompt dùng để sinh.
- Không sửa tay bài AI sau khi sinh.

## Quy mô

Bắt đầu với 100 bài mỗi bên. Mục tiêu 300 bài mỗi bên trước khi hạ hay nâng mức của một luật.

## Cách đo

```bash
node tests/corpus/measure-lint.mjs /Volumes/2/Claude/Update-Skill/corpus/human /Volumes/2/Claude/Update-Skill/corpus/ai
```

Script đếm số lần trúng của từng luật trên 1.000 chữ ở mỗi bên, rồi in tỷ lệ AI/người. Các file `SOURCES.md` và `README.md` không được tính. Lưu bảng kết quả kèm ngày đo vào mô tả PR khi đổi mức một luật.

## Quy tắc

- Luật nào có tỷ lệ AI/người nhỏ hơn 2 thì không được ở mức ERROR.
- Luật mới theo mật độ từ chỉ được thêm khi đã có số đo trên kho đủ 100 bài mỗi bên.
- Luật có tỷ lệ cao nhưng trúng ít hơn 1 lần trên 1.000 chữ ở cả hai bên thì giữ WARN, vì quá hiếm để làm cổng.
