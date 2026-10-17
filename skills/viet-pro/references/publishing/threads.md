---
schema: viet-pro/platform-profile@1
id: threads
name: Threads (Meta)
tier: 2
counting: utf8_bytes_emoji
segments: "---"
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: post, field: max_chars, value: 500, confidence: O, source: threads-api-posts }
  - { surface: post, field: max_topic_tags, value: 1, confidence: O, source: threads-api-posts }
  - { surface: post, field: max_links, value: 5, confidence: O, source: threads-api-posts }
  - { surface: attachment, field: max_chars, value: 10000, scope: whole, confidence: E, source: meta-text-attachment }
sources:
  - { id: threads-api-posts, url: "https://developers.facebook.com/documentation/threads/posts", accessed: 2026-10-16 }
  - { id: meta-text-attachment, url: "https://about.fb.com/news/2025/09/attach-text-threads-posts-share-longer-perspectives/", accessed: 2026-10-16 }
---
# Threads — Format Hiển Thị

**Mục đích:** Format nội dung thành bài hoặc chuỗi bài Threads. Chỉ format, không viết nội dung.

## Giới hạn

- Mỗi bài tối đa 500 ký tự. Emoji tính bằng số byte UTF-8, nên một emoji thường chiếm 4 ký tự và emoji ghép (gia đình, màu da) chiếm 8-18. Chữ tiếng Việt có dấu tính 1.
- Mỗi bài chỉ có 1 topic tag, dài 1-50 ký tự. Nếu viết nhiều tag, Threads chỉ lấy tag hợp lệ đầu tiên.
- Tối đa 5 link mỗi bài. URL đầu tiên thành thẻ xem trước, nên đặt link quan trọng nhất lên trước.
- Cần nói dài hơn 500 ký tự trong một bài: dùng text attachment (tối đa 10.000 ký tự, có in đậm, in nghiêng, gạch chân), hoặc tách thành chuỗi bài.
- Kiểm bằng `node <thư-mục-skill>/scripts/check-platform.mjs threads <file>`. Chuỗi bài ngăn bằng dòng `---`; text attachment kiểm bằng `--surface attachment`.

## Cấu trúc

- Bài đầu tự đứng được: người chỉ đọc bài này vẫn nhận được ý chính.
- Chuỗi 3-7 bài. Bài nối thêm không cần đánh số.
- Mỗi bài một ý. Không cắt câu giữa hai bài.

## Giọng và khán giả Việt

- Khoảng 4,65 triệu người dùng ở Việt Nam, phần lớn đi sang từ Instagram: trẻ, đô thị.
- Giọng gần Facebook cá nhân, ngắn hơn: một ý kiến, một trải nghiệm, một câu hỏi thật.
- Xưng mình/bạn. Không dùng giọng thông cáo.

## Điều bị hạ phân phối

- Threads ưu tiên tài khoản người đọc đang theo dõi và hạ các reply rẻ tiền kiểu engagement bait (phát biểu của Mosseri, chưa có tài liệu chính thức về xếp hạng).
- Không kêu gọi "reply 'có' để nhận…". Nếu cần CTA, CTA phải là một hành động cụ thể.

## Công bố quảng cáo

Bài có tài trợ hoặc quà tặng phải có dòng công bố tiếng Việt ở đầu bài, và bật nhãn "Paid partnership" khi đăng (xem cổng công bố trong `lead.md`).

## Checklist

- [ ] [auto] Mỗi bài ≤500 theo cách đếm của Threads, ≤1 topic tag, ≤5 link (`check-platform.mjs threads`)
- [ ] Bài đầu tự đứng được; 1 ý mỗi bài
- [ ] Link quan trọng nhất đứng đầu
- [ ] Không engagement bait; có dòng công bố nếu là nội dung tài trợ
- [ ] Output file: mỗi bài một khối, ngăn bằng dòng `---`
