# Viết Pro (`viet-pro v6.2.0`)

Bạn giao cho trợ lý AI viết một bài đăng Facebook hay bản tin nội bộ bằng tiếng Việt. Ba giây sau, màn hình trả về đoạn văn đúng chính tả nhưng mở đầu bằng *"Trong bối cảnh kỷ nguyên số hiện nay"*. Giữa bài lặp lại *"Việc triển khai giải pháp thực hiện vai trò then chốt thông qua việc tối ưu hóa"*, rồi kết bằng *"Và đó mới là điều đáng suy ngẫm."* Tệ hơn, AI còn âm thầm đổi con số *"giảm tối đa 15%"* thành *"giảm tối thiểu 15%"*.

Người Việt không viết như vậy, còn tòa soạn hay đội vận hành cũng không thể duyệt bản thảo làm sai lệch số liệu rồi đẩy thẳng ra ngoài.

**Viết Pro (`viet-pro`)** là hệ thống điều phối biên tập, khóa dữ kiện và kiểm soát xuất bản tiếng Việt dành cho **Google Antigravity**, **Claude Code**, **OpenAI Codex** và **AgentKit**. Kiến trúc **CLI-first** (`~/.local/bin/viet-pro`, không phụ thuộc gói `npm` ngoài, tốn **0 token khởi động**) tích hợp cổng `viet-pro gate`, chấm điểm dấu hiệu AI `0-100` (`viet-pro scan`) và kiểm tra PowerPoint `.pptx` bản địa (`pptx.mjs`). Công cụ cũng rà **On-Page SEO & GEO** (`seo.mjs`), lọc **46 nhóm lỗi diễn đạt tiếng Việt**, đối chiếu dữ kiện hai chiều và gắn **Runtime Hooks** chặn xuất bản chưa qua cổng trên cả ba môi trường chạy.

---

## Điểm mới nổi bật trong bản phát hành v6.2.0

| Khía cạnh | Trước đây (`v6.1.0`) | Bản `v6.2.0` (AI Scorer 0-100 + .pptx Bản địa + Precision 46 nhóm) |
| :--- | :--- | :--- |
| **Chấm điểm AI `0-100` (`scan`)** | Chỉ cảnh báo theo dòng qua `lint`, thiếu thang đo tổng hợp `0-100` và chưa miễn trừ câu phủ định hay YAML frontmatter. | Bổ sung `viet-pro scan` (`scripts/lib/score.mjs`) và tool MCP `scan_vietnamese`. Máy chấm `0-100` trên `28+` nhóm trọng số, hỗ trợ `--max`, `--titles`, `--meta`, `--chat`, `--text`, bỏ qua phủ định/frontmatter và tách nhóm `to_confirm`. |
| **Kiểm tra `.pptx` bản địa** | Chỉ có hướng dẫn *Assertion-Evidence* bằng chữ, chưa đọc trực tiếp tệp PowerPoint. | Thêm `scripts/lib/pptx.mjs` giải nén PKZIP (`Store` + `Deflate`) bằng Node.js thuần. Mô-đun chạy `10` tiêu chí *Assertion-Evidence* trực tiếp qua `scan`, `lint`, `compare --before` và `gate --before`. |
| **Lọc `46` nhóm & Tách `house-style`** | Gồm `34` nhóm (31 cốt lõi + 3 cấu hình), gộp gu trình bày chung nên dễ báo thừa trên văn bản ngoài luồng. | Nâng lên **46 nhóm** (`40` mặc định, `3` `--chat`, `3` cấu hình dự án; thêm `empty-promise`, `self-outline`, `empty-summary-closer`, `engagement-bait`, `inspirational-slogan`, `vague-authority`, `bold-heading-abuse`, `emoji-section-lead`, `calqued-prose`). Tách `em-dash`, `oxford-comma`, `heading-colon` qua `--no-house-style`. |
| **Đối chiếu dữ kiện chặt hơn** | Kiểm tra số/ngày, cực tính, TTS, `hai..mười`, `quantity_word` và `shade`; chưa bắt mã inline `` `code` `` hay tên riêng viết hoa. | Bắt thêm `MISMATCH [inlineCode]` và mở rộng từ rào đón `SHADE_WORDS` (bảo vệ *"chỉ ra"*). Phát cảnh báo `REVIEW` cho số chữ (`hai..mười`), thứ/tháng (`thứ năm`, `tháng ba`), tên riêng (`GDPR`, `Vinalight`), đồng thời so sánh hai tệp `.pptx`. |
| **Cổng `gate` & Ngân sách tuyến** | Chưa gắn ngưỡng trần điểm AI vào `gate` và `.viet-pro.json`; gói skill `75` tệp (`core 16.761 B`). | Thêm `max_ai_score` (`--max-ai-score <N>`) và `house_style` (`--no-house-style`) vào `.viet-pro.json`, `gate` cùng tem SHA-256. Gói skill **`78` tệp** giữ lõi `16.826 / 18.432 byte`, `29` tuyến `<= 22.528 byte`, `0` tệp mồ côi. |

---

## Trước và sau khi đi qua cổng `viet-pro gate`

Ví dụ rút gọn dưới đây tổng hợp các lỗi điển hình từ bộ ca kiểm thử của dự án để minh họa cách Viết Pro giữ nguyên số liệu gốc khi gọt bỏ văn phong AI.

**Bản nháp thô (đối chiếu với bản gốc có *"62% nhân viên"*, *"giảm tối đa 18%"*, *"ngày 10/09/2026 [1]"*):**

```text
Chắc chắn rồi! Dưới đây là bài viết của bạn.

Trong bối cảnh thị trường cạnh tranh khốc liệt, việc triển khai khóa học AI 6 tuần đóng vai trò quan trọng trong việc mở khóa tiềm năng nhân sự. Thông qua việc tiến hành áp dụng bài tập thực tế một cách nhanh chóng, tỷ lệ hoàn đơn giảm tối thiểu 18% trong 120 đơn đầu tiên.

Không ai còn có thể làm ngơ.

Và đó mới là điều đáng suy ngẫm.

-> Bước 1: Khi chạy viet-pro gate --before ban-goc.md (dừng ngay tại compare, không ghi tem):
  - FAIL  MISMATCH [numberOrDate] "62%": 1 -> 0 (thiếu số liệu gốc)
  - FAIL  MISMATCH [numberOrDate] "10/09/2026": 1 -> 0 (thiếu mốc ngày)
  - FAIL  MISMATCH [citation] "[1]": 1 -> 0 (rớt nguồn trích dẫn)
  - FAIL  MISMATCH [polarity] "18%": "tối đa" -> "tối thiểu" (đảo chiều định lượng)
  - GATE FAIL [compare]

-> Bước 2: Khi chạy viet-pro lint --route-hint riêng trên bản nháp thô:
  - WARN [chatbot-residue] "Dưới đây là"
  - WARN [staged-opener] "Trong bối cảnh thị trường cạnh tranh khốc liệt..."
  - WARN [dramatic-closer-repeat] "2 câu kết/fragment kịch tính"
  - WARN [translationese-cluster] "Cụm văn dịch (4 dấu hiệu): việc triển khai, một cách nhanh chóng..."
  - INFO [route-hint] "heavy"
```

#### Bản thảo hoàn chỉnh sau biên tập (`v6.2.0`, minh họa rút gọn)

```text
Khóa học nội bộ kéo dài 6 tuần và có 62% nhân viên hoàn thành. Từ tuần thứ tư, khi học viên lấy thẳng dữ liệu đơn hàng thật ra thực hành thay vì làm bài mẫu, tỷ lệ hoàn đơn trên mẫu 120 khách hàng giảm tối đa 18% tính đến ngày 10/09/2026 [1].

-> Báo cáo từ viet-pro gate --before ban-goc.md:
  - COMPARE PASS: Đủ 6 tuần, 62%, 18%, 120, 10/09/2026, [1]; giữ nguyên chiều "giảm tối đa"
  - LINT OK: 0 vi phạm trình bày và văn phong (route_hint: light)
  - DECISIONS: Rà nhịp điệu qua Gemini Decisions (hoặc degraded_no_decisions khi chạy offline)
  - STAMP: Đã cấp tem tại .viet-pro/stamps/<sha256>.json
```

---

## 6 trụ cột kiến trúc của Viết Pro v6.2.0

### 1. Cổng kiểm duyệt một lệnh `viet-pro gate` và tem băm SHA-256

Thay vì để AI chạy rời rạc từng bước kiểm tra, lệnh `viet-pro gate <file.md>` (hoặc `viet-pro gate --stdin` / `viet-pro gate -`) ghép toàn bộ quy trình kiểm định vào một đường ống duy nhất:

1. Đọc cấu hình dự án `.viet-pro.json` gần nhất (đi ngược lên tối đa tới thư mục gốc Git hoặc thư mục người dùng) để hợp nhất từ khóa bảo vệ `keep_terms`, danh sách cấm `banned_phrases`, `mandatory_cta`, chế độ thẻ TTS, `house_style` và ngưỡng trần `max_ai_score`.
2. Đối chiếu bảo toàn dữ kiện (`--before`) cho cả `.md` và `.pptx` để chặn rớt số liệu, đổi ngày tháng, mất liên kết, sửa mã inline `` `code` `` hay đảo cực tính quanh con số. Công cụ cũng phát cảnh báo `REVIEW` khi rớt từ rào đón (`SHADE_WORDS`), số chữ (`hai..mười`), thứ/tháng hoặc tên riêng viết hoa.
3. Chạy bộ lọc tiếng Việt tất định (`lint.mjs`) và chấm điểm AI (`score.mjs`) gồm 46 luật văn phong (`40` mặc định, `3` `--chat`, `3` cấu hình dự án). Có tùy chọn `--no-house-style` để tách `em-dash`, `oxford-comma`, `heading-colon` cùng `10` tiêu chuẩn slide `.pptx`, phân loại bài vào `light`, `standard` hoặc `heavy` và chặn sớm nếu điểm AI vượt `--max-ai-score`.
4. Kiểm tra giới hạn kênh phát hành (`--platform`) cho 12 hồ sơ nền tảng. Bao gồm kiểm tra On-Page SEO & GEO trên `blog-seo` (`--surface article|pillar|comparison`, `--keyword`, `--slug`, `--title`, `--description`).
5. Bắt buộc có phiếu rà độc lập `02-review-ticket.md` khi bài đạt từ `800` chữ, chuyển thể từ `3` kênh trở lên hoặc mang nhãn `heavy`. Phiếu hợp lệ phải có `verdict: DUYỆT NỘI DUNG`, tên `reviewer` độc lập (từ chối `self`, `auto`, `none`), `reviewed_sha256` khớp bản thảo và tối thiểu `60` từ nhận xét.
6. Chấm nhịp biên tập qua Gemini Decisions HTTPS và đóng tem bằng `fetch` chuẩn của Node.js (`x-goog-api-key` chỉ nằm trong HTTP header). Hệ thống kiểm tra chuỗi có dạng khóa bí mật (`AIza...`, `sk-...`, `ghp_...`, `PRIVATE KEY`) để ngắt trước khi gửi mạng, tự hạ về `skipped_no_key` (hoặc `error_network`) khi thiếu key/lỗi HTTP và lưu `ai_score_0_to_100` vào tem SHA-256. Khi vượt cổng, CLI ghi tệp tem vào `.viet-pro/stamps/<sha256>.json` (hoặc `~/.cache/viet-pro/stamps/stamps/<sha256>.json` trong thư mục dự phòng `~/.cache/viet-pro/stamps/` khi đọc từ `stdin` hay ngoài dự án; không bao giờ lưu khóa bí mật vào tem), tạo `.viet-pro/.gitignore` và tự thêm `.viet-pro/` vào `.gitignore` gốc nếu tệp này đã tồn tại.

### 2. Runtime Hooks chặn xuất bản chưa qua cổng trên 3 môi trường

Bộ hook mới gồm lõi đánh giá chung [`editorial-hook.mjs`](skills/viet-pro/scripts/hooks/editorial-hook.mjs) và ba adapter định dạng gói tin bản địa cho Antigravity (`agy-hook.mjs`), Claude Code (`claude-hook.mjs`) và OpenAI Codex (`codex-hook.mjs`). Khi cài qua `viet-pro install-hooks`, trình cài đặt tự chọn đường dẫn nhị phân Node ổn định (ưu tiên `/opt/homebrew/bin/node` hoặc `/usr/local/bin/node` thay vì đường dẫn phiên bản tạm trong Homebrew Cellar) để hook không gãy sau các đợt nâng cấp Node.

Hook hoạt động theo nguyên tắc chặn đúng chỗ cần chặn:
- Không làm phiền hỏi đáp và lập trình: mọi tệp mã nguồn, cấu hình JSON/YAML/TOML, tài liệu `README.md`, `CHANGELOG.md`, kế hoạch trong `plans/`, `docs/`, `tests/`, `.agents/`, `.claude/`, `.codex/`, `.gemini/` và hội thoại hỏi đáp kỹ thuật đều được cho qua.
- Nhận diện đúng sản phẩm viết: các tệp nội dung `.md`/`.txt` nằm trong `content/`, `articles/`, `drafts/`, `published/`, `posts/`, `newsletters/`, `scripts/voice/`, tệp có YAML frontmatter biên tập (`platform:`, `surface:`, `channel:`, `dialect:`, `voice_source:`) hoặc bản thảo tiếng Việt trên 80 chữ khi vừa mở một kỹ năng viết sẽ bị đánh dấu cần qua cổng.
- Chặn `PreToolUse` trước khi tác động ra ngoài: mọi lệnh chạm tới `tqd-publish`, `vieneu`, `elevenlabs`, `gws docs|slides|gmail` hay `publish-to-*` đều bị từ chối nếu bản thảo mục tiêu chưa có tem SHA-256 hợp lệ trong `.viet-pro/stamps/`. Hook `Stop` trên Antigravity đọc cờ `continuationActive` (Claude Code và Codex đọc `stop_hook_active`) để tránh vòng lặp vô hạn; mỗi adapter xuất đúng giao thức của host (JSON hoặc `stderr` kèm mã thoát `2` khi từ chối `PreToolUse` trên Claude Code).

### 3. Chặn văn dịch từ suy luận ngầm và bộ lọc tiếng Việt chính xác cao

Các mô hình suy luận sâu như **Gemini**, **Claude** và **Codex** thường lập dàn ý ngầm bằng cụm danh từ hóa tiếng Anh rồi dịch ngược sang tiếng Việt khi viết bài. Kỷ luật **Thinking-to-Prose Guardrail** trong [SKILL.md](skills/viet-pro/SKILL.md) buộc AI chốt từng ý ngay trong luồng suy nghĩ theo khuôn **Chủ thể thật + Động từ hành động tiếng Việt + Hệ quả đo được**, đồng thời không bê nguyên dàn ý gạch đầu dòng sang văn xuôi.

Ở lớp kiểm tra văn bản, Viết Pro tích hợp bản Việt hóa của **Humanizer 3.1.0** (kèm mẫu lọc có chọn lọc từ `4.0.0`, tuyệt đối giữ luật không bịa dữ kiện), tinh hoa từ `viet-nhu-nguoi v2.7.0` (`document-tics.md`, chấm điểm `0-100`, kiểm tra `.pptx`) cùng cẩm nang sửa văn dịch (`translationese-vi.md`). Bộ lọc `lint.mjs` và máy chấm điểm `score.mjs` tách xử lý theo ngữ cảnh để vừa bắt đúng lỗi vừa giữ nguyên văn phong tự nhiên:
- Bộ lọc `46` nhóm trong `lint.mjs` kết hợp với `28+` nhóm trọng số trong `score.mjs` giúp phát hiện lỗi nhất quán. Nhóm cũ gồm `prompt-injection-tag` (mức `ERROR`), `voice-tag`, `pleonasm-vi`, `unnecessary-english-gloss`, `translationese-filler-density`, `colon-density`, `choppy-sentences`, `slang-pileup` và `dialect-mix`. Bản `v6.2.0` bổ sung 9 cảm biến văn phong (`empty-promise`, `self-outline`, `empty-summary-closer`, `engagement-bait`, `inspirational-slogan`, `vague-authority`, `bold-heading-abuse`, `emoji-section-lead`, `calqued-prose`), 3 luật `--chat` (`chat-stiff`, `chat-formatted`, `chat-long`), 3 luật cấu hình dự án và 10 tiêu chuẩn slide *Assertion-Evidence* trên `.pptx`.
- Tách riêng `house-style` và miễn trừ hành chính bằng tùy chọn tắt `em-dash`, `oxford-comma`, `heading-colon` qua `--no-house-style` (hoặc `"house_style": false` trong `.viet-pro.json`). Các lỗi `translationese-cluster`, `translationese-filler-density`, `phrase-reuse` và `calqued-prose` tự động được miễn trừ trên công văn hành chính/pháp lý (`Số: ...`, `Kính gửi:`, `Căn cứ ...`, `Điều ...`). Đối chiếu trên `6` truyện ngắn văn học thuộc tập mẫu đối chứng ngoài của kho `anhnx000/viet-nhu-nguoi v2.7.0` (`tests/fixtures/nguoi-viet/*.txt`) ghi nhận `0/6` cảnh báo với `--no-house-style` và điểm `viet-pro scan` đạt `0-4/100` (`sạch`).
- Bảo vệ phủ định, frontmatter và `to_confirm` giúp `score.mjs` không tính nhầm từ khóa phủ định/trích dẫn hay trường YAML frontmatter, đồng thời tách riêng các trường hợp nhạy cảm vào mảng `to_confirm` để người viết tự quyết định.
- Vá lỗi kỹ thuật và chính tả Việt cho bảng Markdown/mã inline, đích URL `https://`/`file://`, thẻ TTS (`[nhanh]`, `[trầm]`, `[nhấn]`, `[kể]`, `[nghỉ 1s]`), ký tự dấu rời **Unicode NFD (`unicode-nfd`)** và lỗi **trộn quy tắc đặt dấu thanh cũ/mới (`inconsistent-tone-mark`: `hoà` và `hòa`)** trong cùng một bài.

### 4. Khóa chặt dữ kiện hai chiều và cấu hình dự án `.viet-pro.json`

Công cụ `compare.mjs` kiểm tra bản gốc và bản đã biên tập để bảo đảm câu văn mượt hơn nhưng không sai lệch sự thật:
- Bảo toàn URL, đích liên kết Markdown, số liệu, ngày tháng, nội dung trong ngoặc kép, ký hiệu trích dẫn `[1]`, thứ hạng (`#1`, `top 3`), thẻ TTS khi có dùng và mọi từ khóa truyền qua `--keep` theo ranh giới từ Unicode (chữ `"An"` không khớp nhầm vào `"Anh"`, số `"45.000"` khớp trong `"45.000đ"` nhưng chặn ngay `"45.0001"` hoặc `"145.000"`).
- Chuẩn hóa định dạng số hàng nghìn (`1.200` <-> `1,200` <-> `1200`, `45.000đ` <-> `45000đ`), đối soát số chữ `"hai"`..`"mười"` với số đếm `2..10` trước danh từ/loại từ hợp lệ (`"3 bước"` <-> `"ba bước"`), đồng thời phát cảnh báo `REVIEW [quantity_word]` và `REVIEW [shade]` khi bản sửa làm rơi lượng từ (*"hầu hết"*, *"toàn bộ"*) hoặc từ rào đón mức độ (*"có thể"*, *"khoảng"*).
- Quét cửa sổ ngữ cảnh tối đa 5 từ đứng trước mọi con số trong cùng câu để bắt lỗi tráo chiều hoặc đổi từ định lượng (*"tăng 12%"* thành *"giảm 12%"*, *"tối đa 15%"* thành *"tối thiểu 15%"*, *"ít nhất 3 năm"* thành *"nhiều nhất 3 năm"*, *"chưa tới 10 phút"* thành *"hơn 10 phút"*).
- Tính tỷ lệ từ thay đổi `edit_ratio` theo Levenshtein và cho phép khóa trần biên tập nhẹ qua `--max-edit-ratio`.

Để không phải nhập lặp lại cùng một bộ ràng buộc cho mỗi bài viết trong cùng thương hiệu, chạy `viet-pro init` để tạo `.viet-pro.json` ở gốc dự án (khởi tạo mặc định với `pronouns.self: "tôi"`, `allow_first_hand: true` và các mảng rỗng), sau đó tùy biến theo quy chuẩn riêng như mẫu dưới đây:

```json
{
  "schema": "viet-pro/config@1",
  "dialect": "northern",
  "pronouns": {
    "self": "mình",
    "reader": "bạn",
    "forbid_self_name": ""
  },
  "register": "editorial",
  "keep_terms": ["Viết Pro", "v6.2.0"],
  "banned_phrases": ["hàng đầu thị trường"],
  "mandatory_cta": "",
  "allow_first_hand": false,
  "tts_tags": true,
  "house_style": true,
  "max_ai_score": null,
  "default_platform": "",
  "default_genre": "executive-brief"
}
```

Khi `allow_first_hand` đặt là `false`, bộ lọc sẽ gắn cờ `unverified-first-hand` nếu người viết tự thêm câu chứng kiến cá nhân như *"mình đã dùng thử 3 tháng rồi"* mà chưa có nguồn xác thực (truyền cờ CLI `viet-pro gate --strict-first-hand` để nâng lên mức `ERROR` chặn cổng).

### 5. Hệ hồ sơ 12 kênh xuất bản, SEO/GEO, âm vận Suno AI và 8 thể loại công việc

Viết Pro tách rõ hồ sơ kiểm tra kỹ thuật mạng xã hội khỏi quy chuẩn thể loại tài liệu công việc để không xung đột schema:

- 12 hồ sơ kênh xuất bản (`references/publishing/`): Facebook (`facebook`, chặn Markdown trang cá nhân và lỗi ngắt dòng `broetry-line-breaks`), LinkedIn (`linkedin`, 3.000 ký tự, điểm gập 140 ký tự), X / Twitter (`x-thread`, trọng số `twitter-text v3`) và Threads (`threads`, 500 ký tự, 1 topic tag). Nhóm ngắn và video gồm TikTok (`tiktok`), Instagram (`instagram`, trần 5 hashtag), YouTube (`youtube`, chapter từ `00:00`), Zalo OA (`zalo`), Newsletter (`newsletter`) và Kịch bản Video (`video-script`, tốc độ 2,5 - 3 chữ/giây). Hai hồ sơ chuyên sâu gồm Blog SEO & GEO (`blog-seo` + `scripts/lib/seo.mjs` với 3 bề mặt `article | pillar | comparison`) và Suno AI v4.5 - v6 (`suno` + `suno.mjs`).
- Thư viện thể loại công việc và sản phẩm gồm 8 hồ sơ (`references/genres/`): báo cáo lãnh đạo (`executive-brief.md`), email B2B (`b2b-email.md`), trang bán hàng (`landing-page.md`) và mẫu quảng cáo trả phí (`paid-ads.md`). Bốn mẫu còn lại gồm microcopy giao diện (`ui-microcopy.md`), slide thuyết trình *Assertion-Evidence* (`slide-deck.md`), tin nhắn cá nhân (`personal-chat.md`) và bài so sánh đối chiếu (`comparison-vs.md`).

### 6. Ngân sách ngữ cảnh theo tuyến và kiểm thử tự động hai tầng

Thay vì kìm dung lượng bằng ngưỡng tăng trưởng cứng toàn kho gây cản trở khi thêm thể loại mới, `tests/check-route-budget.mjs` kiểm soát theo tuyến đọc thực tế:
- Phần lõi nạp mặc định (`SKILL.md` + `references/review/anti-ai.md`) giữ dưới 18 KiB (`18.432 byte`, hiện tại đạt `16.826 byte`).
- 29 tuyến đọc sâu (nghiên cứu, biên tập, 8 thể loại, chuyển thể đa kênh, `review-humanize-deep` và `review-vietnamese-voice`) đều giữ phần tài liệu đọc thêm ở mức tối đa 22 KiB (`22.528 byte`, lớn nhất hiện `21.425 byte`).
- Mỗi tệp thể loại trong `references/genres/` không vượt quá 4 KiB (`4.096 byte`) và `0` tệp Markdown mồ côi nằm ngoài cây định tuyến.

Song hành với đó là bộ kiểm thử tất định `bash tests/run-all.sh` (chạy trên macOS và Linux qua GitHub Actions, không cần mạng hay API key) và bộ đánh giá hành vi mô hình `tests/eval/run-eval.mjs` gồm **23 ca kiểm thử thực tế**.

---

## Cài đặt và khởi tạo trong 1 phút

Mở **Terminal** (yêu cầu **Node.js `>= 20`**) và chạy trình cài đặt tự động:

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/v6.2.0/install.sh | bash
```

Trình cài đặt `install.sh` thực hiện an toàn qua 5 bước:
1. Kiểm tra mã băm SHA-256 của toàn bộ 78 tệp trong gói skill đối chiếu với `SKILL_SHA256SUMS`.
2. Nhận diện các môi trường sẵn có trên máy gồm `~/.gemini/config/skills` (Google Antigravity app/IDE), `~/.gemini/antigravity-cli/skills` (Antigravity CLI), `~/.claude/skills` (Claude Code) và `~/.agents/skills` (OpenAI Codex).
3. Dựng bản cài tại thư mục tạm rồi hoán đổi nguyên vẹn cả thư mục để lỗi mạng giữa chừng không làm hỏng bản đang chạy.
4. Di dời bản cũ (kể cả thư mục Codex cũ `~/.codex/skills/viet-pro`) sang `~/.viet-pro-backups/` nằm ngoài vùng quét của tác nhân.
5. Tạo symlink `~/.local/bin/viet-pro` trỏ tới `bin/viet-pro.mjs` và tự dọn đăng ký MCP `viet-pro` cũ trong cấu hình host mà vẫn bảo toàn nguyên vẹn `skillUsage` cùng các MCP server khác.

Sau khi cài xong, chạy nhanh ba lệnh để kích hoạt đầy đủ cổng kiểm duyệt và hook:

```bash
viet-pro doctor                 # Kiểm tra Node, skill lõi, khóa Gemini và hook (dưới 50ms)
viet-pro install-hooks          # Gắn hook an toàn cho Antigravity, Claude Code và Codex
viet-pro init                   # (Tùy chọn) Tạo .viet-pro.json trong thư mục dự án hiện tại
```

Nếu muốn `viet-pro gate` chấm thêm nhịp văn bằng **Gemini Decisions API**, đặt biến môi trường `GEMINI_API_KEY` trong shell hoặc `~/.env` (hoặc `~/.gemini/.env`). Khi không có key, `viet-pro gate` vẫn chạy đầy đủ các lớp kiểm tra tất định cục bộ và cấp tem ở chế độ `degraded_no_decisions`.

### Cài đặt dạng Plugin cho Claude Code

Nếu chỉ dùng riêng Claude Code qua Plugin Marketplace (cung cấp skill và chuẩn CLI, không tự bật MCP ngầm):

```bash
claude plugin marketplace add abm-dungtq/viet-pro
claude plugin install viet-pro@viet-pro
```

Chỉ nên giữ một trong hai cách cài trên Claude Code để tránh nạp trùng hai bản song song.

### Cầu nối MCP dự phòng cho client không có shell

Trong các môi trường ngoài không cấp quyền gọi terminal, bạn có thể khai báo server stdio qua lệnh `viet-pro mcp` (hoặc `node skills/viet-pro/scripts/mcp-server.mjs`). Chi tiết cấu hình cho từng client và từng cờ của `install.sh` nằm tại [INSTALL.md](INSTALL.md).

---

## Bảng tham chiếu nhanh CLI `viet-pro`

| Lệnh | Tác dụng chính | Tùy chọn tiêu biểu |
| :--- | :--- | :--- |
| `viet-pro gate <file.md\|deck.pptx>` | Chạy đủ 6 bước kiểm duyệt và đóng tem SHA-256 (truyền `-` hoặc `--stdin` để đọc luồng chuẩn) | `--before`, `--keep`, `--platform`, `--surface`, `--keyword`, `--slug`, `--title`, `--description`, `--channels`, `--review-ticket`, `--max-edit-ratio`, `--max-ai-score`, `--no-house-style`, `--no-decisions`, `--json` |
| `viet-pro lint <file.md\|deck.pptx>...` | Chạy `40` quy tắc mặc định (`43` khi bật `--chat`) trong bộ `46` nhóm của `lint.mjs`; đọc `house_style`, `register`, `keep_terms` từ `.viet-pro.json` (`3` luật dự án còn lại chạy qua `gate`), cộng `10` kiểm tra slide `.pptx` | `--keep "Tên riêng"`, `--no-house-style`, `--chat`, `--route-hint` |
| `viet-pro scan <file.md\|deck.pptx>...` | Tính điểm AI `0-100` (`score.mjs`), bỏ qua câu phủ định/YAML frontmatter, tách `to_confirm` và rà slide `.pptx` | `--json`, `--max <0..100>`, `--titles`, `--meta`, `--chat`, `--text`, `--stdin`, `--register` |
| `viet-pro compare <before> <after>` | Đối chiếu bảo toàn dữ kiện (`.md`/`.pptx`), cực tính, mã inline `` `code` ``, thẻ TTS, `hai..mười`, lượng/rào đón (`SHADE_WORDS`), thứ/tháng, tên riêng và `edit_ratio` | `--keep`, `--strict-quotes`, `--max-edit-ratio` |
| `viet-pro check-platform <id> <file.md>` | Đo giới hạn ký tự, broetry, chapter, SEO/GEO hoặc âm vận Suno | `--surface <bề-mặt>`, `--keyword`, `--slug`, `--title`, `--description`, `--validate`, `--self-test` |
| `viet-pro check-x-length <thread.md>` | Đếm độ dài từng tweet theo trọng số `twitter-text v3` | `--self-test` |
| `viet-pro init [dir]` | Tạo tệp cấu hình dự án `.viet-pro.json` theo schema `viet-pro/config@1` | `--dialect`, `--register`, `--self`, `--reader`, `--platform`, `--force` |
| `viet-pro verify-stamp <file.md>` | Xác minh tem trong `.viet-pro/stamps/` còn khớp mã SHA-256 hiện tại | `--max-age-ms`, `--stamp-dir`, `--json` |
| `viet-pro doctor` | Chẩn đoán nhanh phiên bản, file lõi, cấu hình `.viet-pro.json`, key và hook | `--json` |
| `viet-pro install-hooks` | Cài hoặc làm mới hook trên cả 3 môi trường chạy | `--host all\|agy\|claude\|codex`, `--dry-run`, `--json` |
| `viet-pro mcp` | Khởi chạy MCP server qua stdio với 4 công cụ (`lint_vietnamese`, `scan_vietnamese`, `compare_preserved`, `check_platform`) | `--self-test` |

Ví dụ kiểm tra một bản thảo LinkedIn trước khi đăng:

```bash
viet-pro gate content/261115-bai-moi/published/linkedin.md \
  --before content/261115-bai-moi/01-draft.md \
  --platform linkedin \
  --keep "Viết Pro" \
  --max-edit-ratio 0.45
```

---

## Cách sử dụng thực chiến trên các Agent

### Cú pháp gọi nhanh

- Google Antigravity: gõ `/viet-pro <yêu cầu>` hoặc nêu trực tiếp yêu cầu viết và biên tập tiếng Việt.
- Claude Code: dùng `/viet-pro` (hoặc `/viet-pro:viet-pro` nếu cài từ marketplace plugin).
- OpenAI Codex: bắt đầu câu lệnh bằng `$viet-pro` (tự nhận diện nhờ `agents/openai.yaml`).

### 4 mẫu yêu cầu thông dụng

#### 1. Viết bài chuyên sâu theo kênh và khóa chặt số liệu

```text
/viet-pro Viết bài LinkedIn khoảng 300 chữ về việc công ty dùng AI hỗ trợ kiểm tra hợp đồng.
Độc giả là giám đốc vận hành và trưởng phòng pháp chế. Giọng điềm tĩnh, thực tế, không phô trương.
Số liệu bắt buộc giữ nguyên: thử nghiệm 6 tuần, thời gian rà sơ bộ giảm từ 45 phút xuống 12 phút, vẫn cần luật sư duyệt bước cuối.
```

#### 2. Soạn tài liệu công việc theo hồ sơ thể loại mới (`references/genres/`)

```text
/viet-pro Áp dụng hồ sơ executive-brief để viết bản tin tuần dài 450 chữ gửi Ban Giám đốc từ số liệu đính kèm.
Giữ nguyên 100% doanh thu, tỷ lệ chuyển đổi và mốc ngày; xuất tệp vào content/ rồi chạy viet-pro gate kiểm chứng.
```

#### 3. Chuyển thể đa kênh kèm kịch bản thu âm TTS có thẻ nhịp

```text
/viet-pro Từ báo cáo gốc này, chuyển thể thành một bài đăng Facebook cá nhân (văn xuôi tự nhiên, không markdown) và một kịch bản đọc TTS có gắn thẻ [trầm], [nhấn], [nghỉ 1s].
Ghi phiếu 02-review-ticket.md nếu từ 3 kênh hoặc 800 chữ trở lên và chạy viet-pro gate --before với bản gốc.
```

#### 4. Sáng tác lời bài hát và Style Prompt cho Suno AI

```text
/viet-pro Viết lời bài hát Acoustic Ballad và Style Prompt cho Suno v5 về một chiều mưa Sài Gòn nhớ người cũ.
Áp dụng chuẩn âm vận trong suno.md, câu 6 đến 8 chữ, tự kiểm bằng viet-pro gate --platform suno trước khi trả bài.
```

### Khung câu lệnh 06 thành phần chuẩn ABM.DungTQ (cấp độ Tòa soạn)

Khi giao các bài phân tích dài, chiến dịch đa kênh hoặc tài liệu quan trọng, dùng mẫu 06 thành phần dưới đây để ép tác nhân chạy đủ quy trình tòa soạn và đóng tem:

```text
[1. ROLE - GÁN VAI TRÒ]
Bạn là Tổng Biên tập Nội dung Tiếng Việt vận hành theo chuẩn viet-pro v6.2.0, am hiểu báo chí, truyền thông B2B và kiểm chứng dữ kiện.

[2. TASK - GIAO NHIỆM VỤ]
Áp dụng skill /viet-pro để biên soạn nội dung theo thông số dưới đây, lập phiếu kiểm duyệt độc lập 02-review-ticket.md (khi >= 800 chữ, >= 3 kênh hoặc mức heavy) và đạt tem qua lệnh viet-pro gate trước khi bàn giao.

[3. DETAILS - CUNG CẤP THÔNG TIN]
- Kênh hoặc thể loại đích: [LinkedIn / Facebook cá nhân / Blog SEO / executive-brief / landing-page / suno]
- Độ dài mục tiêu: [Ví dụ: 500 - 700 chữ]
- Dữ kiện bắt buộc bảo toàn (--keep): [Liệt kê tên riêng, số liệu, ngày tháng, URL]
- Tư liệu nguồn: [Dán văn bản hoặc đường dẫn tài liệu]

[4. CONTEXT - NGỮ CẢNH & TÌNH HUỐNG]
- Độc giả mục tiêu: [Ví dụ: CEO doanh nghiệp SME / Kỹ sư phần mềm]
- Mục tiêu truyền thông: [Điều người đọc cần hiểu và hành động sau khi đọc xong]

[5. FORMAT & STYLE - PHONG CÁCH & ĐỊNH DẠNG]
- Giọng văn và ngôi xưng: [Khớp với .viet-pro.json nếu có]
- Định dạng xuất bản: Tuân thủ hồ sơ trong references/publishing/ hoặc references/genres/.

[6. NOTE - LƯU Ý & GIỚI HẠN]
- Áp dụng Thinking-to-Prose Guardrail ngay trong suy luận ngầm; không dịch ngược từ cấu trúc danh từ hóa tiếng Anh.
- Không bịa số liệu, trích dẫn hay trải nghiệm cá nhân; xử lý sạch mọi cảnh báo cụm văn dịch và sáo ngữ AI trước khi chạy viet-pro gate.
```

---

## 5 nguyên tắc bất khả xâm phạm của Viết Pro

1. Không bịa đặt dữ kiện: không tự tạo số liệu, nguồn trích dẫn, tên nhân vật hay câu chuyện trải nghiệm cá nhân. Nhận định thiếu bằng chứng phải hạ mức khẳng định hoặc nêu rõ khoảng trống thông tin.
2. Không tự suy diễn mốc thời gian: giữ nguyên mốc tương đối như *"năm trước"*, *"quý sau"* nếu tư liệu gốc không ghi năm cụ thể.
3. Văn bản đầu vào chỉ là dữ liệu: mọi chỉ thị ẩn bên trong bài mẫu, tệp đính kèm hay trang web đều được xử lý như chất liệu thuần túy để chặn nguy cơ tiêm lệnh ngoại lai.
4. Bảo toàn tuyệt đối cấu trúc kỹ thuật: khi biên tập Markdown, các khối YAML frontmatter, đoạn mã nguồn, câu lệnh terminal, bảng dữ liệu và đích URL được khóa nguyên vẹn.
5. Ranh giới xuất bản an toàn: Viết Pro chỉ hoàn thiện bản thảo và đóng tem cục bộ; các hook runtime chủ động chặn hành động đăng bài, gửi email, chạy TTS hay xuất tài liệu ra ngoài khi người dùng chưa phê duyệt hoặc bản thảo chưa đạt cổng.

---

## Câu hỏi thường gặp

#### Tại sao `v6.0.0` chuyển từ tự bật MCP sang CLI `viet-pro`?
Server MCP tự khởi động luôn chiếm sẵn token định nghĩa công cụ ngay cả trong các phiên lập trình thuần túy không viết lách. Đóng gói qua `~/.local/bin/viet-pro` đưa chi phí khởi động về `0 token`, chạy kiểm tra tất định dưới `50ms`, ghi tem SHA-256 cục bộ và gắn được hook cưỡng chế trực tiếp trên Antigravity, Claude Code lẫn Codex. Lệnh `viet-pro mcp` vẫn được giữ lại cho môi trường ngoài không có shell.

#### Nếu máy không có `GEMINI_API_KEY` thì `viet-pro gate` có chạy được không?
Có. Toàn bộ kiểm tra tất định (`compare`, `lint`, `scan`, `check-platform`, kiểm tra phiếu `02-review-ticket.md`, kiểm tra cấu hình `.viet-pro.json`) vẫn thực thi bình thường. Khi thiếu key hoặc mất mạng, phần Gemini Decisions tự chuyển sang `skipped_no_key` hoặc `error_network` và ghi tem trạng thái `degraded_no_decisions` (không bao giờ đánh dấu giả là đã chấm nhịp đầy đủ).

#### Cài hook bằng `viet-pro install-hooks` có làm chậm hay chặn lúc tôi đang code không?
Không. Hook `editorial-hook.mjs` bỏ qua toàn bộ tệp mã nguồn, cấu hình kỹ thuật, `README.md`, `plans/`, `docs/`, `tests/` và các cuộc trò chuyện lập trình. Hook chỉ kích hoạt theo dõi khi bạn tạo sản phẩm viết tiếng Việt rõ ràng hoặc gọi công cụ xuất bản ra ngoài như `tqd-publish`, TTS và Google Workspace.

#### Viết Pro có phải công cụ phát hiện văn bản AI (AI Detector) không?
Không. Các mẫu trong Humanizer, `lint.mjs` và thước đo `0-100` của `viet-pro scan` chỉ đo dấu hiệu rỗng nghĩa, văn dịch và khuôn sáo bề mặt để người viết rà sửa bản thảo, hoàn toàn không phải bằng chứng kết luận tác giả là AI hay con người. Ngưỡng tụ cụm trong một đoạn cùng lớp lọc ngữ cảnh phủ định, frontmatter và nhóm `to_confirm` giúp hạn chế báo nhầm trên văn xuôi tự nhiên và văn bản hành chính hợp lệ.

#### Làm sao nâng cấp từ `v5.x`, `v6.0` hoặc `v6.1` lên `v6.2.0`?
Chạy lại lệnh cài đặt `curl` ở trên (hoặc `./install.sh` nếu đã clone kho), sau đó chạy `viet-pro install-hooks`. Trình cài đặt tự di dời bản cũ vào `~/.viet-pro-backups/`, tạo `~/.local/bin/viet-pro`, dọn đăng ký MCP `viet-pro` cũ mà không đụng tới lịch sử `skillUsage` hay các server MCP khác.

---

## Dành cho người đóng góp và phát triển

<details>
<summary>Kiến trúc thư mục, cổng ngân sách tuyến và bộ kiểm thử CI</summary>

### Cấu trúc kho nguồn

```text
skills/viet-pro/              gói skill chuẩn (78 tệp được băm trong SKILL_SHA256SUMS)
├── SKILL.md                  bộ định tuyến trung tâm, thứ tự quyền hạn và cổng kiểm chứng
├── THIRD_PARTY_NOTICES.md    ghi công bản quyền MIT (Humanizer 3.1.0/4.0.0 và viet-nhu-nguoi v2.7.0)
├── agents/openai.yaml        cấu hình nhận diện và hiển thị cho OpenAI Codex
├── bin/viet-pro.mjs          điểm vào CLI thống nhất (symlink vào ~/.local/bin/viet-pro)
├── references/               tài liệu chuyên môn nạp theo tuyến (progressive disclosure)
│   ├── research/             quy trình tra cứu nguồn và phân tích dữ liệu (3 tệp)
│   ├── editorial/            kỹ thuật cốt truyện, nhịp văn, phản bác, kỹ thuật (9 tệp)
│   ├── genres/               8 hồ sơ thể loại doanh nghiệp & sản phẩm + lead.md (9 tệp)
│   ├── publishing/           12 hồ sơ nền tảng xuất bản + lead.md + ma trận đa kênh (14 tệp)
│   ├── review/               Humanizer 3.1.0/4.0.0, văn dịch, document-tics, dấu câu, kiểm chứng (10 tệp)
│   └── archive/              danh mục 42 mẫu cấu trúc bài viết thực tế (2 tệp)
└── scripts/                  công cụ CLI, thư viện lõi và hook (Node.js >= 20, 0 npm deps)
    ├── cli/                            nạp lười 5 lệnh con (lint-cli, scan-cli, compare-cli, platform-cli, x-length-cli)
    ├── hooks/                          lõi editorial-hook.mjs và 3 adapter (agy-hook, claude-hook, codex-hook)
    ├── mcp-server.mjs                  cầu nối MCP stdio dự phòng với 4 công cụ (chạy qua viet-pro mcp)
    ├── lint-vietnamese-content.mjs     lớp bao tương thích ngược (46 nhóm kiểm tra tất định từ lib/lint.mjs)
    ├── compare-preserved-content.mjs   lớp bao tương thích ngược (dữ kiện, cực tính, mã inline, số chữ, rào đón, TTS, edit_ratio)
    ├── check-platform.mjs              lớp bao tương thích ngược (12 hồ sơ kênh, SEO/GEO và âm vận Suno)
    ├── check-x-length.mjs              lớp bao tương thích ngược (trọng số twitter-text v3 cho X)
    ├── test-humanizer-contract.mjs     kiểm tra 22 hợp đồng bất biến của Humanizer và viet-nhu-nguoi
    └── lib/                            compare, config, decisions, gate, lint, pptx, profile, score, seo, stamp, suno, x-weighted
docs/development/             quy chuẩn nâng cấp, kiểm toán văn phong và hồ sơ nền tảng
tests/                        run-all.sh, check-route-budget.mjs, check-skill-refs.mjs, check-freshness.mjs, corpus/, eval/ (23 ca)
```

### Chạy bộ kiểm thử tất định và cổng ngân sách

Toàn bộ kiểm tra dưới đây chạy cục bộ không cần mạng hay API key, đồng thời chạy tự động trên macOS và Linux qua GitHub Actions:

```bash
bash tests/run-all.sh
node tests/check-route-budget.mjs
```

### Chạy đánh giá hành vi mô hình (Behavioral Eval)

Bộ công cụ `tests/eval/run-eval.mjs` chạy 23 ca thực tế trong `tests/eval/cases.json` trên môi trường cô lập chỉ cài `viet-pro`, chấm điểm bằng kiểm tra tất định, giám khảo LLM (`--judge`) và kiểm tra cổng ngân sách theo tuyến:

```bash
node tests/eval/run-eval.mjs --judge --compare tests/eval/baseline.json
```

Mỗi khi chỉnh sửa tệp bên trong `skills/viet-pro/`, sinh lại bảng mã băm trước khi commit:

```bash
find skills/viet-pro -type f ! -name .DS_Store | LC_ALL=C sort | xargs shasum -a 256 > SKILL_SHA256SUMS
```

</details>

---

## Lịch sử phiên bản

<details open>
<summary>6.2.0 - Máy chấm điểm AI 0-100, kiểm tra .pptx bản địa, 46 nhóm lọc &amp; tách house-style</summary>

- Ra mắt lệnh `viet-pro scan` (`scripts/lib/score.mjs`, `scripts/cli/scan-cli.mjs`) và tool MCP `scan_vietnamese` (tổng 4 tool). Bộ đo chấm điểm AI `0-100` trên `28+` nhóm trọng số, hỗ trợ `--max`, `--titles`, `--meta`, `--chat`, `--text`, `--stdin`, `--register`, bỏ qua ngữ cảnh phủ định/YAML frontmatter và gom nhóm nhạy cảm vào `to_confirm`. Thử nghiệm trên bộ mẫu ngoài từ kho `viet-nhu-nguoi v2.7.0` đạt `0-4/100` (`sạch`) với `tests/fixtures/nguoi-viet/*.txt` và `13/16 >= 10/100` với `tests/fixtures/ai-opus/*.md`.
- Bổ sung bộ đọc và kiểm tra PowerPoint `.pptx` bản địa không phụ thuộc ngoài (`scripts/lib/pptx.mjs`, tự giải nén PKZIP `Store` + `Deflate`) với `10` tiêu chí đánh giá *Assertion-Evidence*. Mô-đun gắn trực tiếp vào `scan`, `lint`, `compare --before` và `gate --before`.
- Nâng `lint.mjs` lên **46 nhóm kiểm tra tất định** (`40` mặc định, `3` `--chat`, `3` thiết lập riêng theo dự án). Các cảm biến mới gồm `empty-promise`, `self-outline`, `empty-summary-closer`, `engagement-bait`, `inspirational-slogan`, `vague-authority`, `bold-heading-abuse`, `emoji-section-lead`, `calqued-prose` (miễn trừ hành chính), 3 luật `--chat` và tách đối lập hai câu. Tùy chọn `--no-house-style` (`"house_style": false`) tách `em-dash`, `oxford-comma`, `heading-colon` giúp giữ `0/6` cảnh báo trên 6 văn bản `nguoi-viet` ngoại tuyến.
- Nâng cấp `compare.mjs`: bắt thêm `MISMATCH [inlineCode]` (có bảo vệ khối code và token trùng) và mở rộng `SHADE_WORDS` kèm bảo vệ từ đa nghĩa (*"chỉ ra"*). Bộ đối chiếu cũng phát `REVIEW` cho số chữ (`hai..mười`), thứ/tháng và tên riêng viết hoa (`GDPR`, `Vinalight`), đồng thời so sánh trực tiếp hai tệp `.pptx`.
- Bổ sung `house_style` và `max_ai_score` vào `.viet-pro.json` (`config.mjs`), `--no-house-style` và `--max-ai-score` vào `viet-pro gate` cùng trường `ai_score_0_to_100` trong tem SHA-256 (`stamp.mjs`). Gói skill `78` tệp giữ lõi `16.826 / 18.432 byte`, `29` tuyến `<= 22.528 byte`, `8` thể loại `<= 4.096 byte`, `0` tệp mồ côi.

</details>

<details>
<summary>6.1.0 - Bộ lọc tiếng Việt 34 nhóm, On-Page SEO &amp; GEO, đối chiếu số chữ và 29 tuyến ngữ cảnh</summary>

- Tích hợp sâu quy tắc biên tập từ `anhnx000/viet-nhu-nguoi v2.7.0` và `blader/humanizer v4.0.0` (loại bỏ hoàn toàn phần cho phép bịa dữ kiện): nâng `lint.mjs` lên **34 nhóm kiểm tra** (31 cốt lõi + 3 theo cấu hình) với `prompt-injection-tag` (`ERROR`), `voice-tag`, `pleonasm-vi`, `unnecessary-english-gloss`, `translationese-filler-density`, `colon-density`, `choppy-sentences`, `slang-pileup`, `dialect-mix`, miễn trừ công văn hành chính (`OFFICIAL_DOC_RE`) và vá `heading-colon` trên URL; đạt `0` báo nhầm mới trên `tests/humanizer/*.md` và tập mẫu ngoài `6` truyện ngắn văn học Việt Nam từ `anhnx000/viet-nhu-nguoi`.
- Ra mắt mô-đun **On-Page SEO & GEO (`scripts/lib/seo.mjs`)** nối thẳng với `blog-seo.md` (3 bề mặt `article | pillar | comparison`), đọc metadata 3 tầng (`CLI > YAML frontmatter > heading`), kiểm tra H1/slug, từ khóa trong title/150 chữ mở đầu, chống nhồi từ khóa, Answer-First H2, bảng so sánh và số liệu `%` thiếu nguồn; bổ sung cờ `--stdin` cho `viet-pro gate` và các cờ `--keyword`, `--slug`, `--title`, `--description` cho cả `viet-pro gate` lẫn `check-platform`.
- Nâng cấp `compare.mjs`: chuẩn hóa số hàng nghìn (`1.200` <-> `1,200`) và tiền tệ `đ`/`₫`, đối soát tương đương `hai..mười` <-> `2..10` có bảo vệ ngữ cảnh danh từ, đồng thời cảnh báo `REVIEW [quantity_word]` và `REVIEW [shade]` khi rớt lượng từ hoặc từ rào đón.
- Xử lý xung đột khuôn sáo trong `hook-close.md` và `reframe.md`; bổ sung thể loại `personal-chat.md`, `comparison-vs.md`, `document-tics.md`, nâng cấp `slide-deck.md` theo Assertion-Evidence và tách tuyến `review-vietnamese-voice` (`29` tuyến `<= 22 KiB`, lõi `16.761 / 18.432 byte`, `0` tệp mồ côi).

</details>

<details>
<summary>6.0.0 - Cổng biên tập CLI-first viet-pro gate, stamp SHA-256, nhóm thể loại mới và hook đa runtime</summary>

- Hợp nhất toàn bộ công cụ thành CLI `~/.local/bin/viet-pro` (`skills/viet-pro/bin/viet-pro.mjs`) với 10 lệnh con (`gate`, `lint`, `compare`, `check-platform`, `check-x-length`, `init`, `verify-stamp`, `doctor`, `install-hooks`, `mcp`); đạt `0` token lúc khởi động và `doctor` dưới `50ms`; `install.sh` tự dọn cấu hình MCP `viet-pro` cũ mà giữ nguyên `skillUsage`; 4 script cũ hoạt động như lớp bọc tương thích ngược.
- Tích hợp **Gemini Decisions HTTPS** (`lib/decisions.mjs`, khóa gửi qua header `x-goog-api-key`, ngắt khi phát hiện chuỗi bí mật, tự hạ về `skipped_no_key` khi thiếu key), cơ chế cấp tem SHA-256 tại `.viet-pro/stamps/` (`lib/stamp.mjs`), cấu hình dự án `.viet-pro.json` (`lib/config.mjs`) và ép phiếu kiểm duyệt độc lập `02-review-ticket.md` (`lib/gate.mjs`).
- Vá lỗi báo nhầm `double-space` trên bảng Markdown/`inline code` và `phrase-reuse` trên đích liên kết trong `lib/lint.mjs`; bổ sung nhận diện thẻ TTS hai chiều trong cả `lint` và `compare`.
- Phát hành bộ hook dùng chung `scripts/hooks/editorial-hook.mjs` kèm 3 adapter bản địa riêng cho từng host (`agy-hook.mjs`, `claude-hook.mjs`, `codex-hook.mjs`); tự chọn đường dẫn Node ổn định để tránh gãy sau nâng cấp Homebrew.
- Bổ sung bộ 6 tài liệu mẫu cho công việc và sản phẩm trong `references/genres/` (`executive-brief`, `b2b-email`, `landing-page`, `paid-ads`, `ui-microcopy`, `slide-deck`) và chuyển cổng dung lượng CI sang ngân sách theo tuyến (`tests/check-route-budget.mjs`: lõi `<= 18 KiB`, mỗi tuyến `<= 22 KiB`, `0` tệp mồ côi).

</details>

<details>
<summary>5.8.0 - Kiểm tra cấu trúc câu, chuẩn Unicode/dấu thanh tiếng Việt, tỷ lệ sửa edit_ratio và bố cục kênh</summary>

- Nâng `lint.mjs` từ 17 lên **22 quy tắc cốt lõi** kèm hàm định tuyến `computeRouteHint` (`light` / `standard` / `heavy`): thêm `unicode-nfd`, `inconsistent-tone-mark`, `isomorphic-sentence` và `hedging-pileup`.
- Tích hợp phép đo tỷ lệ từ bị sửa `computeEditRatio` và ngưỡng khóa `--max-edit-ratio` vào `compare.mjs` và `compare-preserved-content.mjs`.
- Nâng cấp `check-platform.mjs` (`profile.mjs`): cảnh báo `broetry-line-breaks` trên LinkedIn/Facebook và kiểm tra *Answer-First* (`seo-h2-wall`) sau thẻ H2 trên Blog SEO.
- Bổ sung kiểm tra mạch đoạn *Outline Test* và *Reflection Tail* vào `anti-ai.md`, giữ tổng dung lượng Markdown ở mức `149.416 byte`.

</details>

<details>
<summary>5.7.0 - Tối ưu suy luận ngầm, bắt cụm văn dịch và cổng kiểm chứng</summary>

- Bổ sung kỷ luật **Thinking-to-Prose Guardrail** trong `SKILL.md` và `editorial/lead.md` để chặn dịch ngược từ dàn ý tiếng Anh.
- `lint.mjs` thêm luật cấp đoạn `translationese-cluster` và `ai-buzzword-cluster`, đạt `0,00` báo nhầm trên 1.000 chữ văn bản người viết.
- `compare.mjs` mở rộng cửa sổ ngữ cảnh số liệu lên 5 từ và bắt thêm các cặp định lượng đối lập (`tối đa`/`tối thiểu`, `ít nhất`/`nhiều nhất`, `chưa tới`/`hơn`, `xấp xỉ`/`chính xác`).

</details>

<details>
<summary>5.6.1 &amp; 5.6.0 - Lời bài hát và Style Prompt Suno AI</summary>

- Thêm hồ sơ `suno.md` và bộ kiểm âm vận tiếng Việt (`scripts/lib/suno.mjs`) tích hợp vào `check-platform` `suno`.
- Cảnh báo `english-in-viet-lyrics` khi chêm từ tiếng Anh vào câu hát tiếng Việt; hạn chế báo nhầm trên từ ghép thông dụng.

</details>

<details>
<summary>5.5.1 &amp; 5.5.0 - Hồ sơ 11 nền tảng và MCP Server</summary>

- Đổi tên kho nguồn chính thức thành `abm-dungtq/viet-pro`.
- Bổ sung hồ sơ chi tiết cho Threads, TikTok và YouTube kèm hạn rà soát dữ kiện nền tảng; ra mắt `check-platform.mjs` và `mcp-server.mjs`.

</details>

<details>
<summary>5.4.0 đến 5.0.0 - Nền tảng Humanizer 3.1.0, kiểm chứng dữ kiện và đo lường văn người viết</summary>

- Đồng bộ Humanizer 3.1.0 (26 mẫu), thêm hướng dẫn sửa văn dịch `translationese-vi.md`, bộ đối chiếu `compare-preserved-content.mjs`, trình cài đặt kiểm tra SHA-256 `install.sh` và bộ eval đối chiếu với văn xuôi Việt Nam.

</details>

Toàn bộ các bản phát hành và gói cài đặt `.zip` được lưu trữ tại [GitHub Releases](https://github.com/abm-dungtq/viet-pro/releases).

---

## Giấy phép

Viết Pro được phát hành theo giấy phép MIT, xem chi tiết tại [LICENSE](LICENSE). Phần tài liệu và quy tắc biên tập chuyển thể từ Humanizer (Siqi Chen) cùng `viet-nhu-nguoi` (anhnx000) cũng tuân thủ giấy phép MIT, ghi công đầy đủ tại [THIRD_PARTY_NOTICES.md](skills/viet-pro/THIRD_PARTY_NOTICES.md).
