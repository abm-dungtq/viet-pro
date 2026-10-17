# Schema hồ sơ nền tảng

Mỗi file kênh trong `skills/viet-pro/references/publishing/` (trừ `lead.md` và `repurpose-matrix.md`) là một hồ sơ nền tảng. Frontmatter chứa các giới hạn mà máy kiểm được; phần thân là hướng dẫn viết cho người và cho agent. Hồ sơ được đọc bởi:

- `scripts/check-platform.mjs`: kiểm bản thảo và kiểm hồ sơ (`--validate`);
- tool `check_platform` của `scripts/mcp-server.mjs`;
- `tests/check-freshness.mjs`, dùng hai khóa `last_verified` và `review_by`.

Parser nằm ở `scripts/lib/profile.mjs`.

## Ví dụ

```yaml
---
schema: viet-pro/platform-profile@1
id: threads
name: Threads
tier: 2
counting: utf8_bytes_emoji
segments: "---"
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: post, field: max_chars, value: 500, confidence: O, source: threads-api }
  - { surface: post, field: max_topic_tags, value: 1, confidence: O, source: threads-api }
sources:
  - { id: threads-api, url: "https://developers.facebook.com/docs/threads/posts", accessed: 2026-10-16 }
---
```

## Tập con YAML được hỗ trợ

Frontmatter chỉ dùng hai dạng dòng:
- `khóa: giá trị` ở cấp đầu;
- phần tử danh sách viết trên một dòng, thụt hai dấu cách: `  - { khóa: giá trị, ... }`.

Giá trị có thể là:
- số nguyên;
- chuỗi trần;
- chuỗi trong ngoặc kép: bắt buộc khi chuỗi có dấu phẩy, hoặc mở đầu bằng `[`, `{`, `#`, `|`, `>`, `&`, `*`, `!`.

Parser báo lỗi kèm số dòng khi gặp mọi dạng khác: lồng sâu, block scalar, anchor, mảng, chú thích `#` sau giá trị. Lý do: repo không dùng phụ thuộc npm, và một parser nhỏ nhưng chặt dễ kiểm hơn một parser YAML đầy đủ viết tay.

## Khóa cấp đầu

| Khóa | Bắt buộc | Ý nghĩa |
|---|---|---|
| `schema` | có | Luôn là `viet-pro/platform-profile@1` |
| `id` | có | Trùng tên file, không có `.md` |
| `name` | có | Tên hiển thị |
| `tier` | có | 1 = hồ sơ sâu, 2 = đầy đủ, 3 = gọn (xếp theo thị trường Việt Nam) |
| `counting` | có | Cách đếm mặc định cho các giới hạn độ dài |
| `segments` | không | `"---"`: bản thảo là chuỗi bài tách bằng dòng `---`, và `max_chars` áp cho từng bài |
| `last_verified`, `review_by` | có | Ngày kiểm chứng gần nhất và hạn rà lại, dạng `YYYY-MM-DD` |
| `limits` | có | Danh sách giới hạn; viết `limits: []` nếu kênh không có giới hạn cứng |
| `sources` | có | Danh sách nguồn; mỗi giới hạn trỏ tới một `id` trong danh sách này |

## Giới hạn

Mỗi phần tử trong `limits` có các khóa sau:
- `surface`: bề mặt đăng, ví dụ `post`, `page`, `shorts`, `long`. Khi người dùng không chọn, công cụ dùng surface xuất hiện đầu tiên.
- `field`: loại giới hạn, xem bảng dưới.
- `value`: số nguyên dương.
- `confidence`: độ tin cậy, xem mục riêng bên dưới.
- `source`: id của một nguồn trong `sources`.
- `count` (không bắt buộc): ghi đè `counting` cho riêng giới hạn này.
- `scope` (không bắt buộc): chỉ nhận `whole`, nghĩa là đo cả bài dù hồ sơ có `segments`. Ví dụ text attachment của Threads là một khối liền.
- `note` (không bắt buộc): ghi chú cho người đọc.

Giá trị chuỗi trần không được chứa ` #` hay `: `, và không mở đầu bằng `'`; khi cần thì đặt trong ngoặc kép.

| `field` | Đo trên | Ghi chú |
|---|---|---|
| `max_chars` | `body`, hoặc `caption` nếu không có body | Tách theo đoạn khi có `segments` |
| `max_caption_chars` | `caption`, hoặc `body` | |
| `max_title_chars` | `title` | Nhiều dòng dưới `## title` là các phương án, đo từng dòng |
| `max_description_chars` | `description` | |
| `max_hashtags`, `max_topic_tags` | toàn bài, hoặc từng đoạn khi có `segments` | Hashtag phải có ít nhất một chữ cái, nên `#1` không bị tính. `max_topic_tags` luôn chỉ WARN, vì Threads giữ tag đầu chứ không từ chối bài |
| `max_links` | toàn bài, hoặc từng đoạn khi có `segments` | Chỉ đếm URL có `http://` hoặc `https://` |
| `fold_chars` | `body` hoặc `caption` | Luôn chỉ WARN: nhắc đặt ý chính trước điểm "Xem thêm" |
| `max_duration_s` | không đo | Chỉ kiểm ở `--validate`, vì không đo được thời lượng từ văn bản |

## Cách đếm

Mọi cách đếm đều chuẩn hóa NFC trước.

| `counting` | Đếm |
|---|---|
| `graphemes` | Ký tự người đọc thấy (`Intl.Segmenter`) |
| `utf16` | Đơn vị UTF-16 |
| `utf8_bytes` | Byte UTF-8 |
| `utf8_bytes_emoji` | Grapheme thường tính 1; grapheme emoji (`\p{Extended_Pictographic}`, cờ quốc gia hoặc keycap) tính bằng số byte UTF-8 của nó. Đây là cách Threads đếm |
| `x_weighted` | Cách đếm có trọng số của X (`lib/x-weighted.mjs`) |
| `words` | Từ, tức các cụm chữ và số liền nhau |

## Bản thảo

Bản thảo chia trường bằng heading `## title`, `## description`, `## caption`, `## body`; không có heading nào thì cả bài là `body`. Heading trong khối ``` bị bỏ qua. Khối `---` ở đầu chỉ bị coi là frontmatter khi mọi dòng là khóa quen thuộc (`title:`, `description:`, `tags:`...), để bài đầu của một thread dạng `Lưu ý: ...` không bị mất. Khi hồ sơ có giới hạn cho một trường mà bản thảo thiếu khối đó, công cụ báo WARN thay vì bỏ qua im lặng.

## Độ tin cậy

| Mã | Nghĩa | Khi bị vượt |
|---|---|---|
| O | Tài liệu chính thức: help center, API, mã nguồn, văn bản luật | ERROR |
| E | Phát biểu của lãnh đạo hoặc nhân viên nền tảng | ERROR |
| S | Báo chí hoặc nhiều nguồn thứ cấp độc lập | ERROR |
| F | Truyền miệng, con số từ tool hoặc vendor | Chỉ WARN |

Không nâng một con số lên mức cao hơn khi chưa có nguồn tương ứng. Nếu chưa chắc thì ghi F: bản thảo vẫn được nhắc nhưng không bị chặn.

## Rà soát khi tới `review_by`

`tests/run-all.sh` báo đỏ khi một hồ sơ quá hạn và báo `SOON` khi còn dưới 14 ngày. Khi rà soát:

1. Mở lại từng `url` trong `sources`. Với giới hạn chỉ thấy trong app, dán thử một bài tiếng Việt có dấu.
2. Sửa `value` hoặc `confidence` nếu nguồn đã đổi. Ghi `accessed` là ngày vừa kiểm.
3. Đặt `last_verified` là hôm nay, và `review_by` cách hôm nay 3 tháng (6 tháng nếu mọi giới hạn đều là O). Với tính năng đang thử nghiệm thì đặt 60 ngày.
4. Chạy `node skills/viet-pro/scripts/check-platform.mjs --validate` và `bash tests/run-all.sh`.
