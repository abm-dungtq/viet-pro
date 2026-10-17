---
last_verified: 2026-10-16
review_by: 2027-01-16
---
# X (Twitter) Thread & Threads — Format Hiển Thị

**Nhân viên:** x-thread.md — Ban Xuất bản (publishing/)
**Mục đích:** Format nội dung thành thread cho X và post cho Threads. Chỉ format, không viết nội dung.

**Mặc định:** X thread. Threads (Meta) khi user chỉ định.

---

## 1. X Thread (MẶC ĐỊNH)

### Nguyên tắc cốt lõi

- Mỗi tweet ≤280 theo cách đếm có trọng số của X: chữ có dấu thuộc dải U+1EA0-U+1EF9 (ế, ộ, ạ, ữ…) tính 2, URL luôn tính 23. Một câu tiếng Việt thường dài thêm 10-20% so với số ký tự nhìn thấy. Kiểm bằng `node <thư-mục-skill>/scripts/check-x-length.mjs <file>` (ngăn các tweet bằng dòng trống, hoặc bằng dòng `---` khi một tweet có nhiều đoạn).
- **Tweet 1 phải TỰ ĐỨNG ĐƯỢC** — người không đọc thread vẫn nhận được giá trị; đây là hook + lời hứa nội dung
- 1 tweet = 1 ý trọn vẹn. Không cắt câu giữa chừng sang tweet sau
- 5-12 tweet/thread. Quá 12 → cắt bớt ý, không phải viết ngắn từng ý đi
- Đánh số cuối tweet dạng `(2/9)` từ tweet 2 trở đi; tweet 1 không đánh số

### Cấu trúc

```
Tweet 1:  Mở bài tự đứng — dữ kiện / nhận định / câu hỏi liên quan trực tiếp
Tweet 2:  Bối cảnh tối thiểu — vì sao chuyện này đáng quan tâm (2/n)
Tweet 3-n-2: Mỗi tweet 1 luận điểm/bằng chứng, theo đúng thứ tự logic chain của draft
Tweet n-1: Insight chốt — câu đáng nhớ nhất
Tweet n:  Dữ kiện hoặc kết luận ngắn HOẶC CTA nếu brief yêu cầu
```

### Quy tắc kênh

- Cắt bỏ TOÀN BỘ câu chuyển tiếp ("Tuy nhiên", "Bên cạnh đó") — thread tự chuyển bằng cấu trúc
- Giọng gọn, trực diện; vẫn thuần Việt, không trộn tiếng Anh
- Số liệu: mỗi tweet chứa tối đa 1-2 con số, ghi nguồn ở tweet riêng gần cuối nếu cần
- Link để tweet cuối, không rải giữa thread

## 2. Threads (Meta) — khi user chỉ định

- ≤500 ký tự/post, chuỗi 3-7 post
- Mỗi bài 1 topic tag, tối đa 5 link; emoji đếm theo số byte UTF-8 (Threads API docs, 2025).
- Giọng casual hơn X, gần Facebook cá nhân
- Không đánh số bắt buộc; post đầu vẫn phải tự đứng được

---

## Checklist

- [ ] Tweet 1 tự đứng, không đánh số; mọi tweet qua `check-x-length.mjs`
- [ ] 1 ý/tweet, không cắt câu giữa chừng
- [ ] 5-12 tweet, đánh số `(k/n)` từ tweet 2
- [ ] Không từ nối thừa giữa các tweet
- [ ] Tweet cuối có thông tin/kết luận rõ hoặc CTA được brief yêu cầu
- [ ] Output file: mỗi tweet 1 khối, ngăn cách dòng `---`
