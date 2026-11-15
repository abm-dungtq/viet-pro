# Router thể loại doanh nghiệp và sản phẩm

Chọn đúng một hồ sơ khi viết tài liệu công việc hoặc sản phẩm. Thư mục này tách riêng khỏi `publishing/` để quy chuẩn nội dung công việc không xung đột với schema kiểm kênh nền tảng.

## Chọn đúng một hồ sơ

| Nhu cầu viết | Hồ sơ | Kết hợp tối thiểu |
|---|---|---|
| Báo cáo lãnh đạo, bản tin sáng, tờ trình duyệt | `executive-brief.md` | `editorial/hook-close.md`, `review/lead.md` |
| Email chào hàng, đề xuất thương mại, follow-up | `b2b-email.md` | `editorial/hook-close.md`, `review/lead.md` |
| Trang bán sản phẩm, khóa học, SaaS, dịch vụ | `landing-page.md` | `editorial/hook-close.md`, `review/lead.md` |
| Mẫu quảng cáo trả phí Meta, Google, TikTok, LinkedIn | `paid-ads.md` | `editorial/hook-close.md`, file kênh |
| Nhãn nút, thông báo lỗi, hướng dẫn giao diện | `ui-microcopy.md` | `review/lead.md` |
| Nội dung trang trình bày và ghi chú người nói | `slide-deck.md` | `editorial/hook-close.md`, `review/lead.md` |

## Cách phối hợp kiểm duyệt và cấu hình

1. Đọc `.viet-pro.json` ở gốc dự án (nếu có) để khóa vùng miền (`dialect`), ngôi xưng (`pronouns`), từ giữ nguyên (`keep_terms`), cụm cấm (`banned_phrases`), CTA bắt buộc (`mandatory_cta`), chính sách tự chứng kiến (`allow_first_hand`) và thể loại mặc định (`default_genre`).
2. Nếu cần xuất ra một kênh xã hội cụ thể (như LinkedIn hay Facebook), đọc thêm tối đa một file trong `publishing/`. Không tự nhân nhiều kênh khi người dùng chưa yêu cầu.
3. Với bài từ 800 chữ trở lên, chuyển thể từ 3 kênh hoặc mức `heavy`, lập phiếu rà độc lập `02-review-ticket` trước khi chốt bản cuối.
4. Đầu ra mặc định là bản thảo sẵn sàng dùng; không tự gửi thư, đăng bài hay chạy quảng cáo khi chưa có lệnh và phê duyệt rõ ràng.
