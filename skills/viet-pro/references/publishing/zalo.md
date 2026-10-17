---
schema: viet-pro/platform-profile@1
id: zalo
name: Zalo OA
tier: 1
counting: graphemes
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: oa-broadcast, field: max_title_chars, value: 100, confidence: F, source: caresoft-zalo }
  - { surface: oa-broadcast, field: max_chars, value: 250, confidence: F, source: caresoft-zalo, note: "mỗi thẻ text" }
  - { surface: oa-message, field: max_chars, value: 2000, confidence: F, source: esms-zalo }
sources:
  - { id: caresoft-zalo, url: "https://doc.caresoft.vn/danh-sach-tinh-nang/zalo/tin-nhan-truyen-thong-va-tin-nhan-giao-dich", accessed: 2026-10-17 }
  - { id: esms-zalo, url: "https://helpcenter.esms.vn/cau-hoi-thuong-gap/zalo-oa", accessed: 2026-10-17 }
---
# Zalo OA — Format Hiển Thị

**Nhân viên:** zalo.md — Ban Xuất bản (publishing/)
**Mục đích:** Format nội dung cho Zalo Official Account (broadcast/tin nhắn) và Zalo cá nhân/nhóm. Chỉ format + cắt, không đổi nội dung.

**Mặc định:** Zalo OA broadcast. Cá nhân/nhóm khi user chỉ định.

---

## 1. Zalo OA Broadcast (MẶC ĐỊNH)

### Nguyên tắc cốt lõi

- **Ngắn nhất trong mọi kênh:** 300-800 ký tự thân tin. Zalo là tin nhắn, không phải bài đăng — người nhận đọc như tin từ người quen
- 1 tin = 1 thông điệp = 1 CTA. Không nhồi nhiều ý
- Plaintext thuần: không markdown, không heading; xuống dòng tạo nhịp

### Cấu trúc

```
[Tiêu đề tin — ≤100 ký tự, lợi ích trực tiếp hoặc thông tin chính, không giật tít rỗng]

[Thân 2-4 đoạn cực ngắn (1-2 câu/đoạn) — thông điệp chính + 1 dẫn chứng đắt nhất]

[CTA — 1 dòng: bấm xem / trả lời tin / gọi số... ; nếu OA có button thì ghi rõ text button ≤20 ký tự]
```

### Quy tắc kênh

- Giọng gần gũi, tôn trọng; xưng hô theo tệp khách hàng user chỉ định (anh/chị — mặc định, bạn — tệp trẻ). Không rõ tệp → hỏi lại TBT (NEEDS_CONTEXT)
- Emoji: tối đa 2, chỉ đầu tiêu đề hoặc trước CTA
- Không link trần dài — ghi chú "[link rút gọn]" cho user thay
- Số liệu: giữ 1 con số đắt nhất, bỏ phần còn lại

## 2. Zalo cá nhân / nhóm (khi user chỉ định)

- Như tin nhắn thường: 100-500 ký tự, không tiêu đề, giọng đúng quan hệ (bạn bè/đối tác)
- Nội dung dài → tách 2-3 tin nhắn liên tiếp, mỗi tin 1 ý trọn

---

## Checklist

- [ ] Tiêu đề ≤100 ký tự, lợi ích trực tiếp
- [ ] Thân 300-800 ký tự, đoạn 1-2 câu
- [ ] 1 thông điệp + 1 CTA duy nhất
- [ ] Plaintext, ≤2 emoji
- [ ] Xưng hô đúng tệp khách
- [ ] Copy-paste gửi được ngay
