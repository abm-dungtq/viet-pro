---
schema: viet-pro/platform-profile@1
id: x-thread
name: X (Twitter)
tier: 2
counting: x_weighted
segments: "---"
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: post, field: max_chars, value: 280, confidence: O, source: twitter-text-v3 }
  - { surface: premium, field: max_chars, value: 25000, confidence: F, source: hootsuite-x-premium, note: "trang help.x.com ghi 25.000 nhưng chưa tải được để kiểm" }
sources:
  - { id: twitter-text-v3, url: "https://github.com/twitter/twitter-text/blob/master/config/v3.json", accessed: 2026-10-16 }
  - { id: hootsuite-x-premium, url: "https://www.hootsuite.com/whats-new/longer-captions-for-x-twitter-premium-users", accessed: 2026-10-17 }
---
# X (Twitter) Thread — Format Hiển Thị

**Nhân viên:** x-thread.md — Ban Xuất bản (publishing/)
**Mục đích:** Format nội dung thành thread cho X. Chỉ format, không viết nội dung.

Bài cho Threads (Meta) đọc ở `threads.md`.

---

## 1. X Thread (MẶC ĐỊNH)

### Nguyên tắc cốt lõi

- Mỗi tweet ≤280 theo cách đếm có trọng số của X: chữ có dấu thuộc dải U+1EA0-U+1EF9 (ế, ộ, ạ, ữ…) tính 2, URL luôn tính 23. Một câu tiếng Việt thường dài thêm 10-20% so với số ký tự nhìn thấy. Kiểm bằng `node <thư-mục-skill>/scripts/check-x-length.mjs <file>` (ngăn các tweet bằng dòng trống, hoặc bằng dòng `---` khi một tweet có nhiều đoạn), hoặc `check-platform.mjs x-thread <file>` khi các tweet ngăn bằng `---`.
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
- Link đặt ở tweet nói về nó. Không cần dồn link xuống tweet cuối: lãnh đạo X nói nền tảng không còn hạ bài có link (07/2026, chưa có tài liệu chính thức)

---

## Checklist

- [ ] Tweet 1 tự đứng, không đánh số; mọi tweet qua `check-x-length.mjs`
- [ ] 1 ý/tweet, không cắt câu giữa chừng
- [ ] 5-12 tweet, đánh số `(k/n)` từ tweet 2
- [ ] Không từ nối thừa giữa các tweet
- [ ] Tweet cuối có thông tin/kết luận rõ hoặc CTA được brief yêu cầu
- [ ] Output file: mỗi tweet 1 khối, ngăn cách dòng `---`
