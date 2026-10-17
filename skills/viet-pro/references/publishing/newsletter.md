---
schema: viet-pro/platform-profile@1
id: newsletter
name: Newsletter / Email
tier: 2
counting: graphemes
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: email, field: max_title_chars, value: 50, confidence: F, source: activecampaign-subject, note: "tiêu đề email (## title)" }
sources:
  - { id: activecampaign-subject, url: "https://www.activecampaign.com/glossary/subject-line-length", accessed: 2026-10-17 }
---
# Newsletter / Email — Format Hiển Thị

**Nhân viên:** newsletter.md — Ban Xuất bản (publishing/)
**Mục đích:** Format bài thành email newsletter (Substack, Mailchimp, email tay). Chỉ format + cắt, không đổi nội dung.

---

## Nguyên tắc cốt lõi

- **1 email = 1 chủ đề = 1 CTA.** Draft nhiều nhánh → giữ nhánh mạnh nhất, các nhánh khác cắt bỏ (ghi chú cho user: "có thể làm email kỳ sau")
- Độ dài đích 50-70% draft — người đọc email không cuộn như đọc blog
- Email là THƯ, không phải bài đăng: giọng như viết cho một người cụ thể

## Cấu trúc

```
[Meta block đầu file:]
Subject (3 phương án): mỗi cái ≤50 ký tự — 1 tò mò, 1 lợi ích trực tiếp, 1 số liệu
Preview text: ≤90 ký tự — nối tiếp subject, KHÔNG lặp lại subject

[Chào — tùy chọn, 1 dòng, có thể bỏ]

[Mở 1-2 câu CÁ NHÂN — vì sao mình viết cái này hôm nay; kéo thẳng vào chủ đề]

[Thân: 3-5 đoạn ngắn-trung — cắt từ luận điểm mạnh nhất của draft, giữ logic chain]

[Insight kết — 1-2 câu]

[CTA duy nhất — trả lời email / đọc bài đầy đủ / chia sẻ; 1 dòng riêng]

[P.S. — tùy chọn, 1 câu; dùng cho ý phụ đắt giá hoặc CTA mềm thứ hai]
```

## Quy tắc kênh

- Subject không viết hoa toàn bộ, không emoji spam (tối đa 1), không từ ngữ giật tít rỗng ("SỐC", "KHÔNG THỂ TIN")
- Đoạn ≤4 câu — email đọc trên mobile
- Format tối giản: plaintext là mặc định; đậm/nghiêng chỉ khi nền tảng hỗ trợ và ≤2 chỗ
- Link: 1-2 link tối đa, anchor text tự nhiên
- Giọng "mình/bạn" — thân mật hơn blog, chững hơn Facebook

---

## Checklist

- [ ] 3 phương án subject ≤50 ký tự, preview ≤90
- [ ] Mở bằng 1-2 câu cá nhân, vào thẳng chủ đề
- [ ] 1 chủ đề duy nhất, 50-70% độ dài draft
- [ ] 1 CTA duy nhất, dòng riêng
- [ ] Đoạn ≤4 câu, tối đa 2 link
- [ ] Copy-paste vào trình gửi email được ngay
