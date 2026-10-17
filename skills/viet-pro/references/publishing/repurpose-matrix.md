# Ma Trận Repurpose — 1 Bài Gốc → N Kênh

**Nhân viên:** repurpose-matrix.md — Ban Xuất bản (publishing/)
**Chức năng:** Chuẩn quy đổi khi xuất 1 draft ra nhiều kênh. TBT đọc khi thiết kế GATE đa kênh; publisher đọc khi được giao cắt lại độ dài.

---

## Nguyên tắc gốc

1. **Bài gốc dài nhất → cắt xuống, không nối ngược.** Draft luôn viết đủ chiều sâu (blog-level); các kênh ngắn CẮT từ đó. Không bao giờ viết bản ngắn rồi "độn" thành bản dài.
2. **Core message bất biến.** Mọi bản kênh cùng 1 insight, cùng số liệu. Khác nhau ở: hook, độ dài, giọng, format.
3. **Hook viết lại theo kênh, không copy.** Hook blog (được phép chậm) ≠ hook TikTok (3 giây) ≠ dòng đầu LinkedIn (trước "see more").
4. **Mỗi kênh = 1 output riêng.** Có thể chạy song song khi dùng subagent và quyền sở hữu file tách biệt; tác vụ nhỏ có thể xử lý tuần tự trong context chính.

## Bảng quy đổi

| Kênh | Độ dài đích | Hook đổi thế nào | Giọng | Cắt gì | Giữ gì |
|------|-------------|-------------------|-------|--------|--------|
| facebook (cá nhân) | 60-100% draft | Vào đề thẳng câu đầu, không tiêu đề | mình/tôi, kể cho bạn nghe | Heading, bullet, phần tham khảo | Logic chain liền mạch, đoạn dài |
| blog-seo | 100% draft + SEO | H1 chứa keyword, mở bài trả lời search intent | tôi/chúng ta, chững chạc | Không cắt — thêm meta, heading, TL;DR | Toàn bộ chiều sâu |
| newsletter | 50-70% draft | Subject ≤50 ký tự + câu mở cá nhân | thân mật, như thư riêng | Nhánh phụ, ví dụ thứ 2+ | 1 insight + 1 CTA duy nhất |
| linkedin | 1.300-3.000 ký tự | Dòng 1 đứng riêng, gây tò mò trước "see more" | mình/tôi professional | Chi tiết nền, giữ 2-3 luận điểm mạnh nhất | Insight + 1 ví dụ đắt nhất + số liệu chủ lực |
| x-thread | 5-12 tweet | Tweet 1 tự đứng được (≤280, đếm có trọng số) | gọn, trực diện | Mọi câu chuyển tiếp; 1 ý = 1 tweet | Insight, số liệu, kết luận hoặc CTA được yêu cầu |
| instagram | Caption ≤2.200 ký tự / carousel 6-10 slide | 125 ký tự đầu trước fold | gần gũi, cảm xúc | Lập luận dài — chỉ giữ kết luận từng bước | Insight dạng khẳng định ngắn + số liệu sốc |
| threads | 1-7 bài, mỗi bài ≤500 ký tự (emoji tính theo byte) | Bài đầu tự đứng, một ý kiến rõ | mình/bạn, gần FB cá nhân | Số liệu phụ, nhánh phụ | 1 ý mỗi bài + số liệu chủ lực |
| tiktok (caption) | Caption 1-3 dòng, ≤5 hashtag | Dòng đầu có cụm từ khóa người xem tìm | văn nói, nhanh | Gần hết — lời thoại nằm ở video-script | Tên sản phẩm, giá, cụm từ khóa |
| youtube (tiêu đề + mô tả) | Tiêu đề ≤100 ký tự, mô tả 2-3 dòng đầu + chapter | Từ khóa và lời hứa trong 60-70 ký tự đầu tiêu đề | rõ ràng, không giật tít | Lập luận dài — đã nằm trong video | Chapter, nguồn, dòng công bố |
| zalo | 300-800 ký tự | Tiêu đề ≤100 ký tự, lợi ích trực tiếp | gần gũi, tôn trọng (theo tệp khách) | Gần hết — chỉ thông điệp chính | 1 thông điệp + 1 CTA |
| video-script (ngắn) | 15-90 giây (~40-230 từ nói) | 3 giây đầu — dữ kiện/câu hỏi vào thẳng ý | văn nói, ngôi mình/bạn | Mọi thứ trừ 1 insight + 1-2 dẫn chứng | Insight + số liệu chính + CTA nếu brief yêu cầu |
| video-script (YouTube dài) | 5-15 phút | Cold-open 15-30s từ đoạn đắt nhất | văn nói, giữ chiều sâu | Ít — chuyển cấu trúc sang chapter | Toàn bộ lập luận, thêm re-hook mỗi 2-3 phút |

## Thứ tự sản xuất khuyến nghị (trọn bộ)

```
draft (blog-level) → review nội dung PASS
→ SONG SONG nhóm text: facebook, blog-seo, linkedin, newsletter, x-thread, threads, instagram, zalo
→ SONG SONG nhóm transformation: video-script (tách instance ngắn/dài nếu cần cả hai), kèm caption tiktok và tiêu đề/mô tả youtube
→ review format 1 lượt cuối cho toàn bộ published/
```

Lý do nhóm: text là message-preserving (giữ thông điệp, được cắt + viết lại hook); video là transformation (viết lại văn nói) — reviewer áp chuẩn khác nhau.

## Checklist TBT khi thiết kế GATE đa kênh

- [ ] Draft đã đủ sâu để cắt cho kênh dài nhất được yêu cầu?
- [ ] Danh sách kênh + độ dài đích ghi rõ trong GATE design?
- [ ] Mỗi kênh có đúng 1 file output và không có hai agent cùng sửa một file?
- [ ] Review format cuối gom toàn bộ published/ trong 1 lượt?
