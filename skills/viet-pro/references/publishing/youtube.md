---
schema: viet-pro/platform-profile@1
id: youtube
name: YouTube
tier: 1
counting: graphemes
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: long, field: max_title_chars, value: 100, confidence: O, source: yt-video-settings }
  - { surface: long, field: max_description_chars, value: 5000, confidence: O, source: yt-video-settings }
  - { surface: long, field: max_hashtags, value: 60, confidence: O, source: yt-hashtags, note: "quá 60 thì YouTube bỏ qua mọi hashtag" }
  - { surface: shorts, field: max_title_chars, value: 100, confidence: O, source: yt-video-settings }
  - { surface: shorts, field: max_description_chars, value: 5000, confidence: O, source: yt-video-settings }
  - { surface: shorts, field: max_hashtags, value: 60, confidence: O, source: yt-hashtags }
  - { surface: shorts, field: max_duration_s, value: 180, confidence: O, source: yt-shorts-upload }
sources:
  - { id: yt-video-settings, url: "https://support.google.com/youtube/answer/57407", accessed: 2026-10-16 }
  - { id: yt-hashtags, url: "https://support.google.com/youtube/answer/6390658", accessed: 2026-10-16 }
  - { id: yt-chapters, url: "https://support.google.com/youtube/answer/9884579", accessed: 2026-10-16 }
  - { id: yt-how-works, url: "https://www.youtube.com/howyoutubeworks/product-features/recommendations", accessed: 2026-10-16 }
  - { id: yt-shorts-upload, url: "https://support.google.com/youtube/answer/12779649", accessed: 2026-10-17 }
  - { id: sej-inauthentic, url: "https://www.searchenginejournal.com/youtube-monetization-update-spam-not-reaction-channels/550755/", accessed: 2026-10-16 }
---
# YouTube — Tiêu đề, Mô tả, Chapter

**Mục đích:** Viết tiêu đề, mô tả, chapter và hashtag cho video YouTube dài và Shorts. Kịch bản lời thoại đọc ở `video-script.md`.

## Giới hạn

- Tiêu đề tối đa 100 ký tự, mô tả tối đa 5.000 ký tự.
- Hashtag: tối đa 3 tag hiện cạnh tiêu đề. Video có hơn 60 hashtag thì YouTube bỏ qua toàn bộ. Hashtag không có dấu cách, và tag không liên quan tới video có thể khiến video bị gỡ.
- Chapter: mốc đầu là `00:00`, ít nhất 3 mốc theo thứ tự tăng dần, mỗi chapter dài từ 10 giây.
- Shorts tối đa 3 phút với video dọc hoặc vuông.
- Kiểm bằng `node <thư-mục-skill>/scripts/check-platform.mjs youtube <file>`, trong đó file có hai khối `## title` và `## description`. Với Shorts, thêm `--surface shorts`.

## Tiêu đề

- Tiêu đề tiếng Việt thường dài và bị cắt trên điện thoại, nên đặt từ khóa và lời hứa chính trong khoảng 60-70 ký tự đầu (kinh nghiệm thực hành, chưa có số liệu chính thức).
- Tiêu đề phải khớp nội dung. Giật tít làm người xem bỏ sớm và chấm thấp trong khảo sát, mà khảo sát là tín hiệu xếp hạng chính.
- Giữ nguyên tên riêng, con số và mốc thời gian của brief.

## Mô tả

1. 2-3 dòng đầu: video giải quyết việc gì cho ai, kèm thông tin chính. Đây là phần hiện trước "Xem thêm".
2. Chapter, mỗi mốc một dòng: `00:00 Tên phần`.
3. Nguồn và link nhắc trong video.
4. Dòng công bố tài trợ nếu có.
5. Tối đa 3 hashtag ở cuối.

## Xếp hạng

YouTube đo "valued watchtime" bằng khảo sát người xem (chỉ tính 4-5 sao) và một mô hình dự đoán điểm khảo sát. Like, dislike, share và "Không quan tâm" là các tín hiệu riêng. Vì vậy, viết để người xem thấy đáng thời gian, đừng chỉ nhắm vào lượt nhấp.

## Điều bị hạ phân phối hoặc mất kiếm tiền

Từ 15/07/2025, chính sách "repetitious content" đổi tên thành "inauthentic content", nhắm vào nội dung sản xuất hàng loạt và lặp lại. Kênh reaction và bình luận có góc nhìn riêng không bị nhắm tới. Khi chuyển một bài ra nhiều video, mỗi video phải có góc riêng.

## Công bố

- Nội dung chỉnh sửa hoặc tổng hợp bằng AI mà trông như thật phải bật nhãn "altered or synthetic content".
- Quảng cáo trả tiền phải đánh dấu ô "paid promotion", và mô tả phải có dòng công bố tiếng Việt (xem cổng công bố trong `lead.md`).

## Checklist

- [ ] [auto] Tiêu đề ≤100, mô tả ≤5.000, hashtag ≤60 (`check-platform.mjs youtube`)
- [ ] Từ khóa và lời hứa trong khoảng 60-70 ký tự đầu của tiêu đề
- [ ] Chapter bắt đầu `00:00`, ít nhất 3 mốc, mỗi phần từ 10 giây
- [ ] 2-3 dòng đầu mô tả nói rõ video giúp gì
- [ ] Tối đa 3 hashtag liên quan; có dòng công bố nếu là nội dung tài trợ
