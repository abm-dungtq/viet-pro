---
schema: viet-pro/platform-profile@1
id: tiktok
name: TikTok
tier: 1
counting: graphemes
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: video, field: max_hashtags, value: 5, confidence: F, source: mediapost-hashtag-limit }
  - { surface: api, field: max_caption_chars, value: 2200, count: utf16, confidence: O, source: tiktok-api-direct-post }
  - { surface: api, field: max_hashtags, value: 5, confidence: F, source: mediapost-hashtag-limit }
  - { surface: photo, field: max_title_chars, value: 90, count: utf16, confidence: O, source: tiktok-api-photo-post }
  - { surface: photo, field: max_description_chars, value: 4000, count: utf16, confidence: O, source: tiktok-api-photo-post }
  - { surface: photo, field: max_hashtags, value: 5, confidence: F, source: mediapost-hashtag-limit }
sources:
  - { id: tiktok-api-direct-post, url: "https://developers.tiktok.com/doc/content-posting-api-reference-direct-post", accessed: 2026-10-16 }
  - { id: tiktok-api-photo-post, url: "https://developers.tiktok.com/doc/content-posting-api-reference-photo-post", accessed: 2026-10-17 }
  - { id: mediapost-hashtag-limit, url: "https://www.mediapost.com/publications/article/408371/tiktok-limits-hashtags-as-algorithms-become-more-s.html", accessed: 2026-10-16 }
  - { id: tiktok-fyf-standards, url: "https://www.tiktok.com/community-guidelines/en/fyf-standards", accessed: 2026-10-16 }
  - { id: tiktok-recommends, url: "https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you", accessed: 2026-10-16 }
  - { id: tiktok-commercial-disclosure, url: "https://ads.tiktok.com/help/article/how-to-turn-on-the-commercial-content-disclosure-setting-in-tiktok", accessed: 2026-10-16 }
---
# TikTok — Caption, Tìm kiếm và Quy tắc kênh

**Mục đích:** Viết caption, chữ trên hình và ghi chú đăng cho TikTok. Kịch bản lời thoại đọc ở `video-script.md`; file này lo phần còn lại của bài đăng.

## Giới hạn

- Caption đăng qua API tối đa 2.200 đơn vị UTF-16. Các tool nói caption trong app được tới 4.000 ký tự, nhưng chưa có nguồn kiểm chứng được, nên công cụ chỉ kiểm hashtag khi đăng trong app. Giữ caption ngắn: người xem đọc 1-2 dòng đầu. Kiểm bằng `node <thư-mục-skill>/scripts/check-platform.mjs tiktok <file>`, thêm `--surface api` khi đăng qua công cụ lên lịch.
- Tối đa 5 hashtag mỗi bài. App có cảnh báo "Maximum 5 hashtags", nhưng TikTok chưa ra thông báo chính thức, nên công cụ chỉ cảnh báo (WARN) khi vượt.
- Bài ảnh (photo post) đăng qua API: tiêu đề 90, mô tả 4.000 đơn vị UTF-16 (`--surface photo`).

## Tìm kiếm trên TikTok

Người Việt dùng TikTok như một công cụ tìm kiếm: "review…", "cách làm…", có dấu lẫn không dấu. TikTok chưa công bố cơ chế tìm kiếm. Kinh nghiệm thực hành thống nhất rằng caption, chữ trên hình, lời nói và hashtag đều được đọc. Vì vậy:

1. Chọn một cụm từ khóa mà người xem thật sự gõ. Creator Search Insights là công cụ chính thức để tra cụm này.
2. Nói cụm đó trong vài giây đầu của lời thoại.
3. Đặt cụm đó lên hình bằng công cụ chữ của TikTok.
4. Lặp lại tự nhiên trong 1-2 dòng caption đầu.

Cách lặp này là heuristic, nhưng an toàn vì nó cũng giúp người xem biết ngay video nói về gì.

## Caption

- Dòng đầu nói video giải quyết việc gì cho ai. Không mở bằng lời chào.
- Giữ tên sản phẩm, giá và điều kiện khuyến mãi đúng như brief, không làm tròn giá.
- 3-5 hashtag sát nội dung: một tag ngách, một tag sản phẩm hoặc địa phương. Không dùng tag trend không liên quan.
- CTA một hành động: "lưu lại", "xem giỏ hàng", "bình luận size". Không xin follow đổi quà.

## Điều bị loại khỏi For You Feed

Theo bộ tiêu chuẩn FYF, các loại sau bị loại:
- nội dung lấy lại của người khác mà không thêm gì mới;
- clip mang watermark hoặc logo nền tảng khác;
- video chỉnh sửa tối thiểu;
- lời hứa "like đổi like" hoặc tặng quà giả;
- tuyên bố sai để kéo view.

Ở thị trường có TikTok Shop như Việt Nam, phiên LIVE dẫn người xem ra ngoài nền tảng để mua hàng cũng không lên FYF. Nội dung AI mô tả người hoặc cảnh trông như thật phải gắn nhãn AI.

## Xếp hạng

TikTok công bố ba nhóm tín hiệu:
- tương tác: like, share, follow, bình luận, video người xem tự tạo;
- thông tin video: caption, âm thanh, hashtag;
- thiết lập thiết bị và tài khoản. Nhóm này có trọng số thấp.

Xem hết một video dài là tín hiệu mạnh. Số follower không phải yếu tố trực tiếp.

## Công bố quảng cáo

Nội dung thương mại phải bật "Commercial Content Disclosure". Quảng cáo cho bên thứ ba dùng nhãn "Paid partnership". Lời thoại hoặc caption cũng cần dòng công bố tiếng Việt (xem cổng công bố trong `lead.md`).

## Checklist

- [ ] [auto] Caption trong giới hạn, ≤5 hashtag (`check-platform.mjs tiktok`)
- [ ] Cụm từ khóa có trong lời nói đầu, chữ trên hình và 1-2 dòng caption đầu
- [ ] Tên sản phẩm, giá, điều kiện khuyến mãi khớp brief
- [ ] CTA một hành động; không xin follow đổi quà
- [ ] Nội dung tài trợ: bật Commercial Content Disclosure và có dòng công bố
