---
schema: viet-pro/platform-profile@1
id: instagram
name: Instagram
tier: 2
counting: graphemes
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: post, field: max_chars, value: 2200, confidence: O, source: ig-graph-media }
  - { surface: post, field: max_hashtags, value: 5, confidence: S, source: smt-ig-hashtags }
  - { surface: post, field: fold_chars, value: 125, confidence: F, source: sendible-ig }
sources:
  - { id: ig-graph-media, url: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media", accessed: 2026-10-17 }
  - { id: smt-ig-hashtags, url: "https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/", accessed: 2026-10-17 }
  - { id: sendible-ig, url: "https://www.sendible.com/insights/instagram-character-limit", accessed: 2026-10-17 }
---
# Instagram — Format Hiển Thị

**Nhân viên:** instagram.md — Ban Xuất bản (publishing/)
**Mục đích:** Format nội dung cho Instagram caption và carousel. Chỉ format + cắt, không đổi nội dung.

**Mặc định:** caption đơn. Carousel khi user chỉ định hoặc bài có 4+ luận điểm rõ.

---

## 1. Caption (MẶC ĐỊNH)

### Nguyên tắc cốt lõi

- Tổng ≤2.200 ký tự; **125 ký tự đầu quyết định** — hiện trước "more", phải chứa hook trọn vẹn
- Instagram là kênh cảm xúc: giữ insight + câu chuyện, cắt lập luận dài (chỉ giữ kết luận từng bước)
- Plaintext, xuống dòng nhiều; dùng dòng trống + ký tự chấm `.` đơn trên dòng riêng để ngắt khối khi cần

### Cấu trúc

```
[Hook ≤125 ký tự — khẳng định mạnh / số liệu / câu hỏi]

[Thân 3-5 khối cực ngắn (1-3 câu) — chuyện + insight, giọng gần gũi]

[Insight chốt — 1 câu tách riêng]

[CTA — comment/share/save; "save lại để đọc sau" hợp kênh này]

[Hashtag cuối caption: tối đa 5 tag, ưu tiên tag đúng chủ đề để tìm kiếm; hashtag không tự tăng tiếp cận]
```

## 2. Carousel (khi user chỉ định)

Output: text từng slide, 6-10 slide, ≤30 từ/slide.

```
Slide 1:  HOOK — cụm 5-10 từ, chữ lớn (đây là "tiêu đề" duy nhất được phép)
Slide 2:  Đặt vấn đề — 1-2 câu
Slide 3-n-1: Mỗi slide 1 luận điểm/số liệu — 1 câu chính + 1 câu phụ tối đa
Slide n-1: Insight chốt
Slide n:  CTA (follow/save) + tên tác giả/kênh
```

Kèm caption ngắn 300-500 ký tự tóm hook + CTA (dùng mục 1 rút gọn).

### Quy tắc kênh

- Mỗi slide tự đứng được — người xem có thể vào giữa chừng
- Số liệu: 1 con số/slide, viết to (đưa vào dòng chính)
- Giọng "mình/bạn", cảm xúc hơn LinkedIn, chững hơn TikTok

---

## Checklist

- [ ] Hook trọn trong 125 ký tự đầu (caption) / slide 1 ≤10 từ (carousel)
- [ ] Caption ≤2.200 ký tự; slide ≤30 từ
- [ ] Insight chốt tách riêng
- [ ] CTA phù hợp kênh (save/share/comment)
- [ ] Tối đa 5 hashtag (giới hạn của Instagram từ 12/2025)
- [ ] Copy-paste đăng được ngay
