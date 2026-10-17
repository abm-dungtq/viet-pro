---
schema: viet-pro/platform-profile@1
id: linkedin
name: LinkedIn
tier: 2
counting: graphemes
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: post, field: max_chars, value: 3000, confidence: F, source: authoredup-li, note: "trang help chính thức a528176 ghi 3.000 nhưng chưa tải được để kiểm" }
  - { surface: post, field: fold_chars, value: 140, confidence: F, source: authoredup-li, note: "điện thoại; máy tính khoảng 210" }
  - { surface: article, field: max_title_chars, value: 100, confidence: F, source: authoredup-li }
sources:
  - { id: authoredup-li, url: "https://authoredup.com/blog/linkedin-character-limit", accessed: 2026-10-17 }
  - { id: ppc-land-li-feed, url: "https://ppc.land/linkedin-rebuilds-its-feed-from-scratch-with-llms-and-gpu-powered-ranking/", accessed: 2026-10-16 }
---
# LinkedIn — Format Hiển Thị

**Nhân viên:** linkedin.md — Ban Xuất bản (publishing/)
**Mục đích:** Format nội dung cho LinkedIn post và article. Chỉ format, không viết nội dung.

**Mặc định:** LinkedIn post. Article chỉ khi user chỉ định rõ.

---

## 1. LinkedIn Post (MẶC ĐỊNH)

### Nguyên tắc cốt lõi

- Độ dài đích 1.300-3.000 ký tự. LinkedIn cắt "see more" ở khoảng 210 ký tự trên máy tính và khoảng 140 trên điện thoại (kinh nghiệm thực hành), nên ý chính phải nằm trong 140 ký tự đầu
- **Dòng 1 phải tự đứng được:** nêu thông tin hoặc vấn đề đủ rõ trước "see more"; tò mò chỉ là lựa chọn, không được che ý chính
- Đoạn NGẮN 1-3 câu, nhiều khoảng trắng — người đọc lướt trên mobile
- KHÔNG markdown (LinkedIn không render `**`, `#`) — plaintext thuần
- Không bullet ký tự `-`; nếu cần liệt kê ngắn dùng `→` hoặc số `1.` `2.` (tối đa 1 khối/bài)

### Cấu trúc

```
[Dòng mở — 1 câu, đứng riêng và có thông tin]

[1-2 câu mở rộng hook, tạo tension]

[Thân: 3-6 đoạn ngắn — mỗi đoạn 1 ý, cắt từ luận điểm mạnh nhất của draft]

[Insight kết — 1-2 câu, có thể tách dòng]

[Câu hỏi mở thảo luận HOẶC CTA nhẹ]

[0-3 hashtag nếu brief cần — dòng cuối cùng, tiếng Việt không dấu hoặc tiếng Anh phổ biến]
```

### Quy tắc kênh

- Giọng "mình" hoặc "tôi", professional nhưng không cứng — như chia sẻ với đồng nghiệp
- Link ngoài: LinkedIn chưa từng xác nhận hạ bài có link. Mẹo "để link ở comment" chỉ là kinh nghiệm truyền miệng; nếu link là nội dung chính thì dán trong thân bài, đặt sau ý chính
- Nhấn mạnh: LinkedIn post không render bold; chỉ tách dòng hoặc IN HOA khi thêm nghĩa, đúng giọng mẫu hoặc brief yêu cầu
- Số liệu giữ nguyên từ draft, ghi nguồn ngắn gọn inline

## 2. LinkedIn Article (khi user chỉ định)

- Giữ heading, cấu trúc như draft gốc (article hỗ trợ rich text)
- Tiêu đề ≤100 ký tự, không dấu hai chấm
- Thêm 1 đoạn dẫn ~2 câu trước H2 đầu tiên

---

## Checklist — Post

- [ ] Dòng 1 tự đứng được và nêu rõ vấn đề trước "see more"
- [ ] 1.300-3.000 ký tự, đoạn 1-3 câu
- [ ] Không markdown, không bullet `-`
- [ ] Link (nếu có) đặt sau ý chính
- [ ] Nếu có IN HOA, mỗi cụm đều có lý do rõ
- [ ] Tối đa 3 hashtag ở dòng cuối, chỉ khi brief cần
- [ ] Copy-paste đăng được ngay
