---
schema: viet-pro/platform-profile@1
id: blog-seo
name: Blog SEO & GEO
tier: 1
counting: words
last_verified: 2026-11-15
review_by: 2027-02-15
limits:
  - { surface: article, field: max_title_chars, value: 60, count: graphemes, confidence: F, source: google-title-links, note: "SERP Google khuyến nghị tiêu đề ngắn gọn dễ hiển thị trọn vẹn" }
  - { surface: article, field: max_description_chars, value: 155, count: graphemes, confidence: F, source: google-snippets, note: "Snippet Google thường cắt quanh 155 ký tự" }
  - { surface: pillar, field: max_title_chars, value: 60, count: graphemes, confidence: F, source: google-title-links }
  - { surface: pillar, field: max_description_chars, value: 155, count: graphemes, confidence: F, source: google-snippets }
  - { surface: comparison, field: max_title_chars, value: 60, count: graphemes, confidence: F, source: google-title-links }
  - { surface: comparison, field: max_description_chars, value: 155, count: graphemes, confidence: F, source: google-snippets }
sources:
  - { id: google-title-links, url: "https://developers.google.com/search/docs/appearance/title-link", accessed: 2026-11-15 }
  - { id: google-snippets, url: "https://developers.google.com/search/docs/appearance/snippet", accessed: 2026-11-15 }
---
# Blog SEO & GEO — Format Hiển Thị

**Nhân viên:** blog-seo.md - Ban Xuất bản (`publishing/`)
**Mục đích:** Chuẩn hóa On-Page SEO và tối ưu trích dẫn cho công cụ tìm kiếm AI (GEO - Answer-First) mà vẫn giữ giọng văn tiếng Việt tự nhiên.

**NGOẠI LỆ khai báo (xem `review/consistency.md`):** blog SEO ĐƯỢC dùng heading, bảng so sánh và bullet danh sách thực sự; không áp quy tắc cấm heading của storytelling thuần túy.

---

## 3 bề mặt (`--surface`)

- **`article` (mặc định, >= 600 chữ):** bài hướng dẫn, phân tích chuyên đề hoặc giải đáp search intent cụ thể.
- **`pillar` (>= 1.500 chữ, tối thiểu 4 `## H2`):** bài trụ cột bao phủ toàn bộ chủ đề và điều hướng sang bài vệ tinh.
- **`comparison` (>= 800 chữ, bắt buộc có bảng Markdown):** bài so sánh đối chiếu `A vs B` (kết hợp `genres/comparison-vs.md`).

## Meta 3 tầng và cấu trúc

Công cụ `viet-pro check-platform blog-seo` và `viet-pro gate --platform blog-seo` đọc metadata theo thứ tự ưu tiên:
1. Cờ CLI: `--keyword "..." --slug "..." --title "..." --description "..."`
2. YAML frontmatter ở đầu bản thảo (`title`, `description`, `slug`, `keyword`, `meta_title`, `meta_description`)
3. Khối `## title`, `## description`, `## body` (hoặc thẻ `# H1` đầu tiên)

```markdown
# H1 duy nhất chứa từ khóa chính (<= 60 ký tự, không dấu hai chấm)

[Mở bài 1-2 đoạn: trả lời thẳng search intent, đưa từ khóa chính xuất hiện tự nhiên trong 150 chữ đầu]

## Câu hỏi hoặc luận điểm 1 (không nhảy cấp H1 -> H3)

[Câu đầu 40-60 chữ trả lời trực tiếp kết luận; số liệu % hoặc tỷ lệ tăng gấp lần phải gắn nguồn ngay cùng câu hoặc câu kế]
```

## Quy tắc On-Page SEO & GEO

- **Từ khóa tự nhiên:** đặt đúng một từ khóa chính ở H1/meta title và trong 150 chữ đầu; giữ mật độ dưới `3,5%`, tuyệt đối không nhồi từ khóa gây gượng câu.
- **Slug URL:** viết thường không dấu, nối bằng `-`, dưới `75` ký tự (`huong-dan-kiem-ke-kho`); linter báo `ERROR` nếu slug có dấu tiếng Việt hoặc khoảng trắng.
- **Answer-First cho GEO:** mọi `## H2` (đặc biệt tiêu đề dạng câu hỏi) mở đầu bằng kết luận trực diện thay vì rào đón *"Trong bối cảnh hiện nay..."* hay đoạn mở dài trên `90` chữ (`seo-h2-wall`, `geo-question-h2-no-direct-answer`).
- **Số liệu kiểm chứng được:** các nhận định có con số `%` hoặc mức tăng `gấp N lần` phải kèm nguồn (`theo ...`, `[1]`, URL) trừ ví dụ giả định đã ghi rõ (*"ví dụ"*, *"quán mẫu"*).
- **Placeholder cần dọn trước khi xuất bản:** `[liên kết: ...]` và `[ảnh: ...]` bị nhắc `WARN` (`seo-bracket-placeholder`) để người viết nhớ thay đường link và mô tả ảnh thật.
