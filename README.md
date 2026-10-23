# Viết Pro

Viết Pro là skill giúp trợ lý AI viết và biên tập tiếng Việt cho tự nhiên, giữ đúng dữ kiện và hợp với từng kênh đăng bài. Từ bản 5.6.0, skill viết được cả lời bài hát và Style Prompt cho Suno, có kiểm tra để lời tiếng Việt khi hát ít bị cưỡng âm.

Skill chạy trong **Claude Code**, **OpenAI Codex** và **Google Antigravity**. Phiên bản hiện tại: **5.6.0**.

---

## Viết Pro làm được gì?

- Viết bài mới cho blog, SEO, LinkedIn, Facebook, Instagram, Zalo, Threads, TikTok, YouTube, newsletter, thread X và kịch bản video.
- Viết lời bài hát tiếng Việt kèm Style Prompt cho Suno, rồi kiểm lời theo thanh điệu và âm cuối để giảm cưỡng âm.
- Biên tập bản nháp cho mượt, bớt lủng củng và bớt "giọng dịch".
- Bớt giọng AI (humanize): bỏ những mẫu câu sáo mà AI hay dùng, như "Trong bối cảnh...", "Không phải X, mà là Y" hay "Và đó mới là điều đáng suy ngẫm".
- Chuyển một bài gốc sang nhiều kênh mà vẫn giữ cùng thông điệp và số liệu.

Trong lúc làm, skill giữ nguyên tên, số liệu, ngày, link và trích dẫn. Nó không tự thêm số liệu hay nguồn; claim nào chưa có nguồn sẽ được đánh dấu rõ. Mỗi kênh có một hồ sơ ghi giới hạn ký tự, hashtag và link, kèm nguồn và độ tin cậy; `check-platform.mjs` dựa vào hồ sơ đó để kiểm bản thảo. Cách viết hồ sơ nằm trong [platform-profile-schema.md](docs/development/platform-profile-schema.md).

---

## Cài đặt trong 1 phút

Mở **Terminal** và dán lệnh sau:

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/v5.6.0/install.sh | bash
```

Lệnh này tìm xem máy bạn có Claude Code, Codex hay Antigravity, rồi cài Viết Pro cho từng công cụ tìm thấy. Nếu máy đã có bản cũ, bản cũ được chuyển sang `~/.viet-pro-backups/` chứ không bị xoá. Cài xong, mở một phiên làm việc mới trong công cụ của bạn là dùng được.

> Cần có `git` và `bash`, đã có sẵn trên macOS và Linux. Installer chưa được kiểm thử trên Windows; trên Windows hãy cài thủ công theo [INSTALL.md](INSTALL.md).

[INSTALL.md](INSTALL.md) hướng dẫn thêm cách cài cho riêng một công cụ, cài cho một dự án và tự kiểm tra checksum. Nếu muốn gọi lint, đối chiếu dữ kiện và kiểm kênh như tool MCP trong Claude Code, Codex hay client khác, xem [INSTALL.md mục 6](INSTALL.md#6-công-cụ-kiểm-tra-qua-mcp).

### Cài dạng plugin Claude Code

Người dùng Claude Code có thể cài Viết Pro như một plugin, không cần lệnh curl:

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
| Claude Code | Gõ `/viet-pro` rồi viết yêu cầu |
| OpenAI Codex | Gõ `$viet-pro` rồi viết yêu cầu |
| Google Antigravity | Gõ `/viet-pro` rồi viết yêu cầu |

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

**Bớt giọng AI**

```text
/viet-pro Humanize bài Facebook này, bớt dấu hiệu AI nhưng giữ giọng thân thiện.
[dán bài vào đây]
```

Nếu muốn biết skill đã sửa những gì, thêm cụm *"audit dấu hiệu AI"* vào yêu cầu. Khi đó skill liệt kê từng lỗi, chỉ ra đoạn có lỗi và lý do sửa, rồi mới đưa bản cuối.

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

### Lời bài hát Suno

Bản thảo cho Suno gồm bốn khối, mỗi khối dán vào một ô của Suno:

| Khối | Ô trong Suno | Ghi chú |
| :--- | :--- | :--- |
| `## title` | Tên bài | Tối đa 100 ký tự |
| `## description` | Style of Music | Viết bằng tiếng Anh: thể loại, tempo, nhạc cụ, giọng hát |
| `## caption` | Exclude Styles | Không bắt buộc; chỉ liệt kê thứ cần loại, không dùng "no" hay "không" |
| `## body` | Lyrics | Lời tiếng Việt, thẻ cấu trúc tiếng Anh như `[Verse 1]`, `[Chorus]` |

Thẻ trong ngoặc vuông phải viết bằng tiếng Anh. Ngoặc đơn chỉ dành cho lời bè thật sự được hát, như `(ngàn khơi)`; nếu đặt chỉ dẫn như `(hát nhẹ)` vào ngoặc đơn, Suno sẽ hát luôn chỉ dẫn đó. Ở cuối điệp khúc và những nốt ngân dài, skill ưu tiên chữ có âm mở hoặc âm mũi, tránh chữ tận cùng bằng -p, -t, -c, -ch hay mang thanh nặng.

Sau khi viết, bạn có thể tự kiểm bản thảo:

```bash
node ~/.claude/skills/viet-pro/scripts/check-platform.mjs suno bai-hat.md
```

Lệnh trên báo lỗi cú pháp (thẻ tiếng Việt trong ngoặc vuông, chỉ dẫn nằm trong ngoặc đơn) ở mức ERROR. Các vấn đề về nhịp, chẳng hạn cụm nhiều thanh hỏi, ngã, nặng liền nhau, câu kết điệp khúc bị cụt hơi, khổ bốn câu đều kết bằng thanh trắc hay vần sáo kiểu AI, chỉ được báo ở mức WARN. Script chỉ đọc bản thảo, còn chữ có bị hát méo dấu hay không thì chỉ nghe bản render mới biết. Các thông số slider và cụm `clear Vietnamese pronunciation` trong hướng dẫn là kinh nghiệm cộng đồng, chưa được đo.

### Mẹo để có bài tốt hơn

Yêu cầu càng rõ, bài càng sát ý bạn. Một yêu cầu tốt thường nói được năm điều:

1. Viết cho ai.
2. Đăng ở đâu (LinkedIn, Facebook, blog, Suno...).
3. Dài khoảng bao nhiêu.
4. Giọng văn (trang trọng, thân thiện, hài hước...).
5. Dữ kiện nào phải giữ nguyên (số liệu, tên, link).

Thiếu vài chi tiết nhỏ cũng không sao. Skill sẽ tự giả định hợp lý và nói rõ đã giả định gì. Nó chỉ hỏi lại khi thiếu thông tin quan trọng.

---

## Viết Pro xử lý yêu cầu thế nào?

```text
Đọc yêu cầu  →  Xác định dữ kiện phải giữ  →  Viết hoặc sửa
      →  Rà lại tiếng Việt và dữ kiện  →  Bớt giọng AI  →  Trả bản cuối
```

Với việc đơn giản như sửa một đoạn ngắn, skill làm và tự rà ngay trong một lượt. Với một bài mới, nó viết, kiểm dữ kiện, chỉnh giọng rồi mới trả bài. Việc lớn hơn, như nhiều kênh hoặc cần tra cứu, được chia nhỏ và kiểm kỹ từng phần trước khi giao. Bạn không cần chọn mức nào, skill tự quyết theo yêu cầu.

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

**Làm sao cập nhật lên bản mới?**
Chạy lại lệnh cài đặt ở trên với số phiên bản mới. Bản cũ sẽ được chuyển vào `~/.viet-pro-backups/`.

**Bản cũ của tôi nằm ở đâu?**
Trong `~/.viet-pro-backups/<thời-gian-cài>/`. Bạn có thể xoá thư mục này khi không cần nữa.

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

**Skill có tự tra cứu web không?**
Có, khi bài cần số liệu mới, thông tin chuyên ngành hoặc khi bạn yêu cầu dẫn nguồn. Nếu không muốn, hãy ghi "không tra cứu web" trong yêu cầu.

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

### Eval chất lượng bài viết

Eval đưa 23 yêu cầu mẫu trong `tests/eval/cases.json` cho Claude Code chạy với Viết Pro, rồi chấm kết quả. Đạt hay không do các kiểm tra tự động quyết định: giữ dữ kiện, không lỗi lint, đúng độ dài, đúng giới hạn kênh. Điểm do LLM chấm chỉ để tham khảo.

```bash
node tests/eval/run-eval.mjs --judge --compare tests/eval/baseline.json
```

| Bản | Kết quả |
| :--- | :--- |
| 5.2.1 | 11/12 ca đạt (baseline đầu tiên) |
| 5.3.0 | 12/12 ca đạt, không ca nào tụt hạng |
| 5.4.0 | 17/18 trên Claude (`ai-audit` vượt độ dài, chạy lại thì đạt), 18/18 trên Codex |
| 5.5.0 | 21/21 trên cả Claude và Codex, thêm 3 ca kiểm giới hạn Threads, TikTok, YouTube |
| 5.6.0 | 21/23 trên Claude, gồm 2 ca Suno mới đều đạt; `linkedin-write` và `facebook-humanize` trượt nhưng đạt cả hai lần chạy lại riêng |

Mỗi bản chỉ chạy một lần, nên các con số này là tín hiệu để theo dõi, chưa phải bằng chứng thống kê. Mỗi ca tốn khoảng 0,3-0,5 USD khi bật judge. Workflow `eval` trên GitHub chỉ chạy khi repository có secret `ANTHROPIC_API_KEY`.

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
