---
schema: viet-pro/platform-profile@1
id: blog-seo
name: Blog SEO
tier: 1
counting: words
last_verified: 2026-10-16
review_by: 2027-01-16
limits: []
sources: []
---
# Blog SEO — Format Hiển Thị

**Nhân viên:** blog-seo.md — Ban Xuất bản (publishing/)
**Mục đích:** Format bài cho blog/website chuẩn SEO. Chỉ format + bổ sung meta, không đổi nội dung.

**NGOẠI LỆ khai báo (xem review/consistency.md):** blog SEO ĐƯỢC dùng heading và (hạn chế) bullet — không áp quy tắc "không heading trong storytelling" của natural.md.

---

## Nguyên tắc cốt lõi

- Giữ 100% chiều sâu draft — blog là bản dài nhất, không cắt
- Keyword chính do TBT/user cung cấp; không có → chọn cụm tự nhiên nhất từ core message, ghi chú lại
- Keyword xuất hiện TỰ NHIÊN: H1, 1-2 H2, đoạn mở, đoạn kết. KHÔNG nhồi nhét — bài đọc lên phải vẫn là văn người viết

## Cấu trúc

```
# H1 — duy nhất, chứa keyword, ≤60 ký tự lý tưởng, không dấu hai chấm

[Meta block — đặt đầu file trong comment hoặc frontmatter:]
Meta title: ≤60 ký tự, chứa keyword
Meta description: ≤155 ký tự, chứa keyword + lời hứa giá trị

[Mở bài 1-2 đoạn — trả lời THẲNG search intent: người tìm keyword này muốn biết gì, nói ngay]

[TL;DR 3-5 dòng — tùy chọn, bài >1.500 từ nên có]

## H2 theo luận điểm chính (3-6 H2, mỗi H2 có thể chứa H3)
[Thân bài giữ nguyên văn draft — chỉ chèn heading tại ranh giới luận điểm]

## Kết luận (H2 cuối)
[Giữ kết bài draft — không recap máy móc]
```

## Quy tắc kênh

- Heading: chỉ viết hoa chữ đầu (đúng capitalization.md), noun phrase, không câu hỏi trừ khi match search intent rõ
- Internal link: chèn placeholder `[liên kết: chủ đề liên quan]` tại 2-3 điểm tự nhiên — user tự thay link thật
- Bullet: CHỈ cho danh sách thực sự (specs, bước làm) — thân lập luận vẫn văn xuôi
- Ảnh: chèn placeholder `[ảnh: mô tả + alt text gợi ý]` sau mở bài và mỗi 2-3 section
- Độ dài đoạn theo mạch ý của draft; có thể dùng 70-20-10 như tín hiệu rà nhịp, không phải quota và không ép đoạn ngắn "cho SEO"

---

## Checklist

- [ ] H1 duy nhất, chứa keyword, không dấu hai chấm
- [ ] Meta title ≤60 + meta description ≤155 ký tự
- [ ] Mở bài trả lời search intent trong 2 đoạn đầu
- [ ] Keyword tự nhiên (H1, 1-2 H2, mở, kết) — đọc không thấy nhồi
- [ ] Heading chỉ viết hoa chữ đầu
- [ ] 2-3 internal link placeholder
- [ ] Giữ 100% chiều sâu + kết bài draft
