# Viết Pro

Nhờ AI viết một bài tiếng Việt thì chỉ mất vài giây. Mất công là ở khâu sau: bài đọc lên vẫn ra giọng AI, con số "tăng 20%" thành "giảm 20%" sau một lượt sửa, bài Threads lố 40 ký tự mà không ai báo, còn lời bài hát đưa vào Suno thì bị hát méo dấu.

Viết Pro là skill cho trợ lý AI để xử lý đúng những chỗ đó. Skill hướng dẫn trợ lý viết và biên tập tiếng Việt tự nhiên, rồi kèm theo bộ công cụ kiểm tra chạy được trên máy bạn, nên lỗi lộ ra trước khi bài được đăng.

Skill chạy trong **Claude Code**, **OpenAI Codex** và **Google Antigravity**. Phiên bản hiện tại: **5.6.0**.

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/v5.6.0/install.sh | bash
```

---

## Xem Viết Pro làm việc

Mọi kết quả trong phần này là đầu ra thật của công cụ đi kèm skill, chạy trên file mẫu trong thư mục `tests/`.

### 1. Bắt giọng AI trước khi bạn đọc tới

Bản nháp kiểu chatbot hay gặp:

```text
Dưới đây là bài viết bạn yêu cầu.

Trong bối cảnh thị trường thay đổi chưa từng có, Minh Châu không chỉ đạt tỷ lệ quay lại 18%
mà còn tạo nên một bước ngoặt lịch sử vào ngày 10/09/2026.

**Điểm nhấn:** Đây không phải là câu chuyện về công cụ mà là câu chuyện về tư duy.
...
Và đó mới là điều đáng suy ngẫm.
```

Linter của Viết Pro chỉ ra năm nhóm dấu hiệu:

```text
WARN [chatbot-residue] "Dưới đây là"
WARN [staged-opener] "Trong bối cảnh thị trường thay đổi chưa từng có, ..."
WARN [contrast-formula-repeat] "Công thức đối lập xuất hiện 3 lần"
WARN [decorative-bold-labels] "3 đoạn mở bằng nhãn bold"
WARN [dramatic-closer-repeat] "2 câu kết/fragment kịch tính"
```

Sau khi skill viết lại, bài giữ nguyên tên, tỷ lệ, ngày và link, chỉ bỏ phần trang trí:

```text
Ngày 10/09/2026, Minh Châu ghi nhận tỷ lệ khách quay lại 18%.
Chi tiết được công bố tại https://example.com/minh-chau.
```

### 2. Không để con số bị đảo nghĩa

Một lượt sửa câu có thể vô tình đổi nghĩa của số liệu. Bộ so dữ kiện đọc cả từ đứng trước con số:

```text
Trước: Doanh thu quý 3 tăng 20% so với cùng kỳ.
Sau:   Doanh thu quý 3 giảm 20% so với cùng kỳ.

MISMATCH [polarity] "20%": "tăng" -> "giảm"
```

Ngoài số và chiều tăng giảm, công cụ còn so tên riêng, ngày, link, trích dẫn và các cụm bạn yêu cầu giữ nguyên.

### 3. Đúng giới hạn của từng kênh

Mỗi kênh có một hồ sơ ghi giới hạn ký tự, hashtag và link, kèm nguồn chính thức và độ tin cậy. Mỗi kênh cũng đếm theo cách riêng: Threads tính emoji theo byte, X tính chữ có dấu theo trọng số.

```text
ERROR [threads/post] max_chars đoạn 2: 540/500 (O, nguồn threads-api-posts)
ERROR [x-thread/post] max_chars đoạn 1: 298/280 (O, nguồn twitter-text-v3)
```

### 4. Lời bài hát Suno không bị cưỡng âm

Viết Pro tách từng âm tiết của lời bài hát ra thanh điệu và âm cuối, rồi cảnh báo những chỗ Suno dễ hát méo:

```text
WARN broken-tone-cluster: dòng 2: cụm "Chẳng thể giữ" có nhiều thanh gãy/trầm (hỏi/ngã/nặng)
     liên tiếp không ngắt nhịp, dễ làm Suno hát đớt hoặc trượt dấu
WARN chorus-closed-stop-ending: dòng 7: câu kết [Chorus - Soaring] đóng bằng "xúc"
     (thanh sắc, âm tắc -c) làm nốt ngân cuối đoạn bị cụt hơi
WARN ai-cliche-rhyme: phát hiện bộ vần sáo mòn kiểu AI (mưa rơi - chơi vơi; đêm thâu - u sầu)
```

---

## Viết Pro làm được gì?

| Việc | Viết Pro làm gì |
| :--- | :--- |
| Viết bài mới | Blog, SEO, LinkedIn, Facebook, Instagram, Zalo, Threads, TikTok, YouTube, newsletter, thread X, kịch bản video |
| Viết lời bài hát | Lời tiếng Việt kèm Style Prompt cho Suno, kiểm theo thanh điệu và âm cuối |
| Biên tập | Câu chữ mượt hơn, bớt lủng củng, bớt "giọng dịch" |
| Bớt giọng AI | Rà theo 26 dấu hiệu chuyển thể từ Humanizer 3.1.0; muốn xem chi tiết thì yêu cầu "audit dấu hiệu AI" |
| Chuyển thể nhiều kênh | Một bài gốc thành nhiều bản theo kênh, cùng thông điệp và số liệu |
| Kiểm chứng | Tra nguồn khi cần, không bịa số liệu hay trích dẫn, đánh dấu claim chưa có nguồn |

Hiện có 12 hồ sơ kênh: Blog SEO, Facebook, Instagram, LinkedIn, Newsletter, Threads, TikTok, X, YouTube, Zalo OA, kịch bản video và Suno. Cách viết hồ sơ mới nằm trong [platform-profile-schema.md](docs/development/platform-profile-schema.md).

---

## Cài đặt trong 1 phút

Mở **Terminal** và dán lệnh sau:

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/v5.6.0/install.sh | bash
```

Installer tìm xem máy bạn có Claude Code, Codex hay Antigravity, rồi cài Viết Pro cho từng công cụ tìm thấy. Trước khi cài, nó kiểm checksum từng file. Nếu máy đã có bản cũ, bản cũ được chuyển sang `~/.viet-pro-backups/` chứ không bị xoá. Cài xong, mở một phiên làm việc mới là dùng được.

> Cần có `git` và `bash`, đã có sẵn trên macOS và Linux. Installer chưa được kiểm thử trên Windows; trên Windows hãy cài thủ công theo [INSTALL.md](INSTALL.md).

[INSTALL.md](INSTALL.md) hướng dẫn thêm cách cài cho riêng một công cụ, cài cho một dự án và tự kiểm tra checksum.

### Cài dạng plugin Claude Code

Người dùng Claude Code có thể cài Viết Pro như một plugin, không cần lệnh curl. Cách này khai báo sẵn cả MCP server ở mục [Công cụ kiểm tra](#công-cụ-kiểm-tra).

```bash
claude plugin marketplace add abm-dungtq/viet-pro
```

```bash
claude plugin install viet-pro@viet-pro
```

Khi cài dạng plugin, lệnh đầy đủ là `/viet-pro:viet-pro`, vì Claude Code thêm tiền tố tên plugin. Gõ tắt `/viet-pro` vẫn được nếu chưa có lệnh nào khác trùng tên, hoặc bạn chỉ cần nhắc tên Viết Pro trong yêu cầu.

Với Claude Code, chỉ chọn một trong hai cách cài. Nếu cài cả hai, hai bản không ghi đè nhau mà cùng được nạp, nên dễ lệch phiên bản và tốn ngữ cảnh gấp đôi.

---

## Cách dùng

### Gọi skill

| Công cụ | Cách gọi |
| :--- | :--- |
| Claude Code | `/viet-pro` + yêu cầu |
| OpenAI Codex | `$viet-pro` + yêu cầu |
| Google Antigravity | `/viet-pro` + yêu cầu |

Bạn cũng không nhất thiết phải gõ tên skill. Khi yêu cầu rõ ràng là viết hoặc sửa nội dung tiếng Việt, trợ lý sẽ tự dùng Viết Pro.

### Ví dụ yêu cầu

**Viết bài mới**

```text
/viet-pro Viết bài LinkedIn khoảng 300 chữ về việc công ty tôi dùng AI để đào tạo nhân viên mới.
Độc giả là founder công nghệ. Giọng chuyên nghiệp, không phô trương.
Số liệu: khóa học 6 tuần, 62% nhân viên hoàn thành. Không dùng hashtag.
```

**Sửa bản nháp cho tự nhiên**

```text
/viet-pro Biên tập bản nháp dưới đây cho tự nhiên và dễ đọc hơn.
Giữ nguyên tên, số liệu, ngày và link.
[dán bản nháp vào đây]
```

**Bớt giọng AI và xem đã sửa gì**

```text
/viet-pro Humanize và audit dấu hiệu AI cho bài Facebook này, giữ giọng thân thiện.
[dán bài vào đây]
```

Khi có cụm "audit dấu hiệu AI", skill liệt kê từng lỗi, chỉ ra đoạn có lỗi và lý do sửa, rồi mới đưa bản cuối.

**Một bài, nhiều kênh**

```text
/viet-pro Từ bài gốc này, viết một bài LinkedIn và một tin Zalo dưới 80 chữ.
Hai bản phải dùng cùng số liệu.
[dán bài gốc vào đây]
```

**Lời bài hát cho Suno**

```text
/viet-pro Viết lời bài hát và Style Prompt cho Suno, thể loại indie acoustic ballad, giọng nữ,
về một người con đi làm xa nhớ bữa cơm chiều ở quê. Gồm Verse 1, Verse 2, Chorus và Outro.
```

### Mẹo để có bài tốt hơn

Một yêu cầu tốt thường nói rõ năm điều: viết cho ai, đăng ở đâu, dài khoảng bao nhiêu, giọng văn ra sao, dữ kiện nào phải giữ nguyên. Thiếu vài chi tiết nhỏ cũng không sao. Skill sẽ tự giả định hợp lý và nói rõ đã giả định gì; nó chỉ hỏi lại khi thiếu thông tin quan trọng.

---

## Lời bài hát Suno

Bản thảo cho Suno gồm bốn khối, mỗi khối dán vào một ô của Suno:

| Khối | Ô trong Suno | Ghi chú |
| :--- | :--- | :--- |
| `## title` | Tên bài | Tối đa 100 ký tự |
| `## description` | Style of Music | Tiếng Anh: thể loại, tempo, nhạc cụ, giọng hát |
| `## caption` | Exclude Styles | Không bắt buộc; chỉ liệt kê thứ cần loại, không dùng "no" hay "không" |
| `## body` | Lyrics | Lời tiếng Việt, thẻ cấu trúc tiếng Anh như `[Verse 1]`, `[Chorus]` |

Thẻ trong ngoặc vuông phải viết bằng tiếng Anh. Ngoặc đơn chỉ dành cho lời bè thật sự được hát, như `(ngàn khơi)`; nếu đặt chỉ dẫn như `(hát nhẹ)` vào ngoặc đơn, Suno sẽ hát luôn chỉ dẫn đó. Ở cuối điệp khúc và những nốt ngân dài, skill ưu tiên chữ có âm mở hoặc âm mũi, tránh chữ tận cùng bằng -p, -t, -c, -ch hay mang thanh nặng. Hướng dẫn còn có năm mẫu Style Prompt cho các dòng nhạc Việt: V-Pop ballad, indie acoustic, bolero, R&B lo-fi và rap.

Bộ kiểm báo lỗi cú pháp, như thẻ tiếng Việt trong ngoặc vuông hay chỉ dẫn nằm trong ngoặc đơn, ở mức ERROR. Các vấn đề về nhịp chỉ được báo ở mức WARN: cụm thanh gãy, câu kết điệp khúc cụt hơi, khổ bốn câu đều kết bằng thanh trắc, các verse lệch số âm tiết, vần sáo kiểu AI.

Bộ kiểm chỉ đọc bản thảo. Chữ có bị hát méo dấu hay không thì chỉ nghe bản render mới biết. Thông số slider và cụm `clear Vietnamese pronunciation` trong hướng dẫn là kinh nghiệm cộng đồng, chưa được đo.

---

## Công cụ kiểm tra

Các công cụ đi kèm skill chỉ cần Node.js, không có phụ thuộc npm và không gọi mạng. Bạn có thể tự chạy chúng, hoặc để trợ lý gọi trong lúc viết.

| Lệnh | Tác dụng |
| :--- | :--- |
| `lint-vietnamese-content.mjs <file>` | Tìm dấu hiệu văn AI, mã trích dẫn chatbot còn sót, chỗ trống chưa điền, cụm từ lặp |
| `compare-preserved-content.mjs <trước> <sau>` | So tên, số, chiều tăng giảm, ngày, link, trích dẫn trước và sau khi sửa |
| `check-platform.mjs <kênh> <file>` | Đo bản thảo theo hồ sơ kênh, kể cả bộ kiểm lời bài hát Suno |
| `check-x-length.mjs <file>` | Đếm ký tự thread X có trọng số |

Ví dụ, với bản cài cho Claude Code:

```bash
node ~/.claude/skills/viet-pro/scripts/check-platform.mjs suno bai-hat.md
```

Ba công cụ đầu cũng có dạng tool MCP (`lint_vietnamese`, `compare_preserved`, `check_platform`) qua `mcp-server.mjs`. Server chạy qua stdio, chỉ nhận văn bản, không đọc hay ghi file. Bản cài dạng plugin Claude Code đã khai báo sẵn server này; với `install.sh`, Codex và các client khác, xem [INSTALL.md mục 6](INSTALL.md#6-công-cụ-kiểm-tra-qua-mcp).

---

## Chất lượng được đo, không chỉ được hứa

Mỗi bản phát hành đều chạy eval: 23 yêu cầu mẫu được giao cho Claude Code dùng Viết Pro, rồi chấm kết quả. Đạt hay không do kiểm tra tự động quyết định: giữ đúng dữ kiện, không lỗi lint, đúng độ dài, đúng giới hạn kênh. Sáu ca trong số đó đưa vào văn người thật viết, như Nam Cao, Thạch Lam, Hồ Biểu Chánh và văn bản hành chính, để bắt lỗi sửa thừa những đoạn vốn đã tốt.

Ở bản 5.6.0, 21/23 ca đạt, kể cả hai ca Suno mới. Hai ca `linkedin-write` và `facebook-humanize` trượt ở lượt này nhưng đạt trong cả hai lần chạy lại riêng. Điểm trung bình do LLM chấm, thang 5, chỉ để tham khảo:

| Tiêu chí | 5.5.0 | 5.6.0 |
| :--- | :--- | :--- |
| Đúng brief | 4,86 | 4,91 |
| Tiếng Việt tự nhiên | 4,76 | 4,86 |
| Giữ đúng dữ kiện | 4,67 | 4,77 |
| Hợp kênh | 4,71 | 4,95 |

Mỗi bản chỉ chạy eval một lần, nên đây là tín hiệu để theo dõi, chưa phải bằng chứng thống kê.

---

## Viết Pro cam kết

- Không bịa số liệu, nguồn, trích dẫn, nhân vật hay trải nghiệm.
- Không đổi dữ kiện khi sửa bài. Tên, số, ngày, link và trích dẫn được giữ nguyên; "năm trước" cũng không bị đổi thành một năm cụ thể nếu nguồn không ghi.
- Không sửa code hay phần cấu hình trong file, chỉ sửa văn xuôi.
- Không tự đăng bài, gửi email hay nhắn tin. "Sẵn sàng đăng" chỉ có nghĩa là nội dung đã xong.
- Bám theo giọng của bạn khi bạn đưa bài mẫu, thay vì ép về một khuôn chung.

---

## Câu hỏi thường gặp

**Viết Pro có phát hiện được văn do AI viết không?**
Không. Viết Pro chỉ giúp bài viết tự nhiên hơn. Những dấu hiệu nó tìm là thói quen viết hay gặp, không phải bằng chứng bài do AI viết.

**Lời bài hát qua kiểm tra rồi thì Suno có hát đúng dấu không?**
Không chắc. Kiểm tra giúp tránh những lỗi hay gặp trong bản thảo, nhưng giai điệu do Suno tự sinh, nên vẫn cần nghe lại và sửa những câu bị méo dấu.

**Skill có tự tra cứu web không?**
Có, khi bài cần số liệu mới, thông tin chuyên ngành hoặc khi bạn yêu cầu dẫn nguồn. Nếu không muốn, hãy ghi "không tra cứu web" trong yêu cầu.

**Làm sao cập nhật lên bản mới?**
Chạy lại lệnh cài đặt ở trên với số phiên bản mới. Bản cũ sẽ được chuyển vào `~/.viet-pro-backups/<thời-gian-cài>/`, bạn có thể xoá thư mục này khi không cần nữa.

**Làm sao gỡ cài đặt?**
Xoá thư mục `viet-pro` trong thư mục skill của công cụ bạn dùng:

```bash
rm -rf ~/.claude/skills/viet-pro ~/.agents/skills/viet-pro ~/.gemini/config/skills/viet-pro
```

**Tôi chỉ muốn dùng cho một dự án, không cài cho cả máy?**
Mở Terminal tại thư mục dự án, rồi chạy:

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/v5.6.0/install.sh | bash -s -- --workspace
```

---

## Dành cho người đóng góp

<details>
<summary>Cấu trúc repository, kiểm thử và eval</summary>

### Cấu trúc

```text
skills/viet-pro/              skill (phần được cài lên máy người dùng)
├── SKILL.md                  hướng dẫn chính, trợ lý đọc file này đầu tiên
├── agents/openai.yaml        cấu hình hiển thị cho Codex
├── references/               hướng dẫn chi tiết, chỉ đọc khi cần
│   ├── research/             nghiên cứu, phân tích
│   ├── editorial/            kỹ thuật viết
│   ├── publishing/           hồ sơ và cách viết cho từng kênh, kể cả suno.md
│   ├── review/               rà tiếng Việt, dữ kiện, humanize
│   └── archive/              mẫu cấu trúc bài
└── scripts/
    ├── lint-vietnamese-content.mjs     kiểm lỗi trình bày tiếng Việt
    ├── compare-preserved-content.mjs   so dữ kiện trước và sau khi sửa
    ├── check-platform.mjs              kiểm bản thảo theo hồ sơ kênh
    ├── check-x-length.mjs              đếm ký tự thread X có trọng số
    ├── mcp-server.mjs                  đưa ba công cụ trên thành tool MCP
    ├── test-humanizer-contract.mjs     kiểm hướng dẫn Humanizer
    └── lib/                            phần dùng chung, gồm suno.mjs kiểm lời bài hát
install.sh                    trình cài đặt
tests/                        kiểm thử và eval
docs/development/             tài liệu bảo trì, changelog, ngưỡng dung lượng
```

### Chạy kiểm thử

Các kiểm tra này không cần mạng hay LLM. Chúng tự chạy ở mỗi PR trên GitHub Actions với macOS và Linux:

```bash
bash tests/run-all.sh
```

### Chạy eval

```bash
node tests/eval/run-eval.mjs --judge --compare tests/eval/baseline.json
```

| Bản | Kết quả |
| :--- | :--- |
| 5.2.1 | 11/12 ca đạt (baseline đầu tiên) |
| 5.3.0 | 12/12 ca đạt, không ca nào tụt hạng |
| 5.4.0 | 17/18 trên Claude (`ai-audit` vượt độ dài, chạy lại thì đạt), 18/18 trên Codex |
| 5.5.0 | 21/21 trên cả Claude và Codex, thêm 3 ca kiểm giới hạn Threads, TikTok, YouTube |
| 5.6.0 | 21/23 trên Claude, gồm 2 ca Suno mới đều đạt |

Mỗi ca tốn khoảng 0,3-0,5 USD khi bật judge. Workflow `eval` trên GitHub chỉ chạy khi repository có secret `ANTHROPIC_API_KEY`.

Eval còn chặn việc skill phình to: tổng Markdown không được tăng quá 2% so với baseline. Khi một bản buộc phải vượt ngưỡng, như 5.6.0 tăng 7% vì thêm kênh Suno, lý do được ghi trong [upgrade.md](docs/development/upgrade.md) chứ không sửa tay baseline.

Khi sửa nội dung skill, hãy sinh lại `SKILL_SHA256SUMS` theo [INSTALL.md](INSTALL.md) mục 5.

</details>

---

## Lịch sử phiên bản

<details>
<summary>5.6.0: Lời bài hát và Style Prompt cho Suno</summary>

- Thêm kênh `suno`: bản thảo bốn khối (tên bài, Style of Music, Exclude Styles, lời), mẫu Style Prompt cho năm dòng nhạc Việt và luật chống cưỡng âm.
- `check-platform.mjs suno` kiểm thẻ cấu trúc, ngoặc đơn, Style Prompt, cụm thanh gãy, câu kết điệp khúc, khổ toàn thanh trắc, độ lệch âm tiết giữa các verse và vần sáo kiểu AI. Công cụ này cũng chạy qua MCP.
- Linter không còn báo nhầm Title Case trong thẻ bài hát, cũng không coi điệp khúc lặp lại là lặp cụm từ.
- Eval có 23 ca, thêm `suno-song` và `no-change-suno`.

</details>

<details>
<summary>5.5.1: Đổi tên repo</summary>

- Repo đổi tên từ `viet-pro-codex` thành `viet-pro`. Link và lệnh cài cũ vẫn chạy nhờ chuyển hướng của GitHub.

</details>

<details>
<summary>5.5.0: Hồ sơ nền tảng</summary>

- Mỗi kênh có hồ sơ ghi giới hạn ký tự, hashtag và link, kèm nguồn, độ tin cậy và hạn rà soát. Thêm Threads, TikTok và YouTube.
- `check-platform.mjs` kiểm bản thảo theo hồ sơ: đếm byte emoji như Threads, đếm có trọng số như X, tách từng bài trong thread.
- Gọi lint, đối chiếu dữ kiện và kiểm kênh như tool MCP trong Claude Code, Codex hoặc client khác.
- `--keep` khớp nguyên từ ("An" không khớp trong "Anh"); cảnh báo cụm lặp gộp các cụm chồng lên nhau thành một.
- Eval có 21 ca, chấm giới hạn kênh và chapter YouTube.

</details>

<details>
<summary>5.4.0: Sửa đúng và đo được</summary>

- Cài được như plugin Claude Code; repo có giấy phép MIT.
- Đếm ký tự X đúng với chữ có dấu, Instagram tối đa 5 hashtag, Facebook không dùng markdown, có nhắc công bố quảng cáo theo Luật Quảng cáo sửa đổi.
- Linter bắt mã trích dẫn chatbot còn sót, chỗ trống chưa điền và cụm từ lặp; bỏ luật độ dài đoạn đều nhau.
- Đồng bộ Humanizer 3.1.0 và thêm hướng dẫn sửa lối văn dịch.
- Eval có 6 ca văn người viết để đo việc sửa thừa, và chạy được trên Codex.

</details>

<details>
<summary>5.3.0: Đo được chất lượng bài viết</summary>

- Thêm eval 12 ca và kiểm thử tự động trên GitHub Actions.
- Bộ so dữ kiện bắt được lỗi đảo nghĩa như "tăng 12%" thành "giảm 12%".
- Không còn báo nhầm khi chỉ đổi kiểu dấu ngoặc kép, trừ khi bạn yêu cầu giữ nguyên kiểu dấu (`--strict-quotes`).
- Không còn báo nhầm khi link có dấu chấm cuối câu.
- Cấm đổi mốc thời gian tương đối ("năm trước") thành năm cụ thể khi nguồn không ghi.
- Sửa các tham chiếu bị gãy và các quy tắc mâu thuẫn trong tài liệu nội bộ.

</details>

<details>
<summary>5.2.1: Trình cài đặt an toàn hơn</summary>

- Cài cho Claude Code, Codex và Antigravity, đúng thư mục mà từng công cụ đọc.
- Không xoá bản cũ, mà chuyển vào `~/.viet-pro-backups/`.
- Tải đúng phiên bản đã ghim và kiểm tra checksum trước khi cài.

</details>

<details>
<summary>5.2.0: Tích hợp Humanizer</summary>

- Việt hoá 25 dấu hiệu văn AI từ Humanizer 3.0.0.
- Mọi bài công khai đều được rà nhẹ; rà đầy đủ khi bạn yêu cầu "humanize" hoặc "audit dấu hiệu AI".
- Thêm công cụ kiểm tra lỗi trình bày và công cụ so dữ kiện trước/sau.

</details>

Các bản phát hành và file zip: [GitHub Releases](https://github.com/abm-dungtq/viet-pro/releases).

---

## Giấy phép

Viết Pro phát hành theo giấy phép MIT, xem [LICENSE](LICENSE).
Phần tham khảo chuyển thể từ Humanizer cũng theo giấy phép MIT, chi tiết trong [THIRD_PARTY_NOTICES.md](skills/viet-pro/THIRD_PARTY_NOTICES.md).
