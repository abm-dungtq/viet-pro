# Viết Pro

**Viết Pro** là một skill giúp trợ lý AI viết và biên tập tiếng Việt tự nhiên, đúng dữ kiện, đúng từng kênh đăng bài.

Skill chạy được trong **Claude Code**, **OpenAI Codex** và **Google Antigravity**. Phiên bản hiện tại: **5.3.0**.

---

## Viết Pro giúp bạn làm gì?

- **Viết bài mới:** blog, bài SEO, LinkedIn, Facebook, Zalo, newsletter, thread X, kịch bản video.
- **Biên tập bản nháp:** câu chữ mượt hơn, bớt lủng củng, bớt "giọng dịch".
- **Bớt giọng AI (humanize):** bỏ những kiểu câu sáo rỗng mà AI hay viết, như "Trong bối cảnh...", "Không phải X, mà là Y", "Và đó mới là điều đáng suy ngẫm".
- **Giữ nguyên dữ kiện:** tên, số liệu, ngày, link và trích dẫn không bị đổi khi sửa bài.
- **Chuyển thể nhiều kênh:** từ một bài gốc, viết lại cho LinkedIn, Facebook, Zalo... mà vẫn giữ cùng thông điệp và số liệu.
- **Không bịa:** không tự thêm số liệu, nguồn hay câu trích dẫn. Claim chưa có nguồn sẽ được đánh dấu rõ.

---

## Cài đặt trong 1 phút

Mở **Terminal** và dán lệnh sau:

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro-codex/v5.3.0/install.sh | bash
```

Lệnh này tự làm ba việc:

1. Tìm xem máy bạn có Claude Code, Codex hay Antigravity.
2. Cài Viết Pro cho từng công cụ tìm thấy.
3. Nếu máy đã có bản cũ, chuyển bản cũ sang thư mục `~/.viet-pro-backups/` chứ không xoá.

Sau khi cài, **mở một phiên làm việc mới** trong công cụ của bạn là dùng được.

> Cần có `git` và `bash` (đã có sẵn trên macOS và Linux). Trên Windows, installer chưa được kiểm thử; hãy làm theo cách cài thủ công trong [INSTALL.md](INSTALL.md).

Muốn chỉ cài cho một công cụ, cài riêng cho một dự án, hoặc tự kiểm tra checksum? Xem [INSTALL.md](INSTALL.md).

---

## Cách dùng

### Gọi skill

| Công cụ | Cách gọi |
| :--- | :--- |
| Claude Code | Gõ `/viet-pro` rồi viết yêu cầu |
| OpenAI Codex | Gõ `$viet-pro` rồi viết yêu cầu |
| Google Antigravity | Gõ `/viet-pro` rồi viết yêu cầu |

Bạn cũng có thể **không cần gõ tên skill**. Nếu yêu cầu của bạn rõ ràng là viết hoặc sửa nội dung tiếng Việt, trợ lý sẽ tự dùng Viết Pro.

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

Muốn xem skill đã sửa những gì, hãy nói thêm *"audit dấu hiệu AI"*. Skill sẽ liệt kê từng lỗi, chỉ ra đoạn có lỗi, giải thích lý do sửa, rồi mới đưa bản cuối.

**Một bài, nhiều kênh**

```text
/viet-pro Từ bài gốc này, viết một bài LinkedIn và một tin Zalo dưới 80 chữ.
Hai bản phải dùng cùng số liệu.
[dán bài gốc vào đây]
```

### Mẹo để có bài tốt hơn

Yêu cầu càng rõ, bài càng sát ý bạn. Một yêu cầu tốt thường có:

1. **Viết cho ai** (độc giả là ai).
2. **Đăng ở đâu** (LinkedIn, Facebook, blog...).
3. **Dài khoảng bao nhiêu.**
4. **Giọng văn** (trang trọng, thân thiện, hài hước...).
5. **Dữ kiện phải giữ nguyên** (số liệu, tên, link).

Thiếu chi tiết nhỏ cũng không sao: skill sẽ tự giả định hợp lý và nói rõ đã giả định gì. Skill chỉ hỏi lại khi thiếu thông tin quan trọng.

---

## Viết Pro xử lý yêu cầu thế nào?

```text
Đọc yêu cầu  →  Xác định dữ kiện phải giữ  →  Viết hoặc sửa
      →  Rà lại tiếng Việt và dữ kiện  →  Bớt giọng AI  →  Trả bản cuối
```

- **Việc đơn giản** (sửa một đoạn ngắn): làm và tự rà ngay trong một lượt.
- **Việc vừa** (một bài mới): viết, kiểm tra dữ kiện, chỉnh giọng, rồi trả bài.
- **Việc lớn** (nhiều kênh, cần tra cứu): chia nhỏ từng phần và kiểm tra kỹ trước khi giao.

Bạn không cần chọn mức nào cả, skill tự quyết theo yêu cầu.

---

## Viết Pro cam kết

- **Không bịa** số liệu, nguồn, trích dẫn, nhân vật hay trải nghiệm.
- **Không đổi dữ kiện** khi sửa bài: tên, số, ngày, link, trích dẫn được giữ nguyên. Skill cũng không đổi "năm trước" thành một năm cụ thể nếu nguồn không ghi.
- **Không sửa code** hay phần cấu hình trong file; chỉ sửa phần văn xuôi.
- **Không tự đăng bài**, gửi email hay nhắn tin. "Sẵn sàng đăng" chỉ có nghĩa là nội dung đã xong.
- **Tôn trọng giọng của bạn:** nếu bạn đưa bài mẫu, skill bám theo giọng đó thay vì ép về một khuôn chung.

---

## Câu hỏi thường gặp

**Viết Pro có phát hiện được văn do AI viết không?**
Không. Viết Pro chỉ giúp bài viết tự nhiên hơn. Các dấu hiệu nó tìm là thói quen viết hay gặp, không phải bằng chứng bài do AI viết.

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
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro-codex/v5.3.0/install.sh | bash -s -- --workspace
```

**Skill có tự tra cứu web không?**
Có, khi bài cần số liệu mới, thông tin chuyên ngành hoặc bạn yêu cầu dẫn nguồn. Nếu không muốn, hãy ghi "không tra cứu web" trong yêu cầu.

---

## Dành cho người đóng góp

<details>
<summary>Cấu trúc repository, kiểm thử và eval</summary>

### Cấu trúc

```text
skills/viet-pro/              skill (đây là phần được cài lên máy người dùng)
├── SKILL.md                  hướng dẫn chính, trợ lý đọc file này đầu tiên
├── agents/openai.yaml        cấu hình hiển thị cho Codex
├── references/               hướng dẫn chi tiết, chỉ đọc khi cần
│   ├── research/             nghiên cứu, phân tích
│   ├── editorial/            kỹ thuật viết
│   ├── publishing/           định dạng từng kênh
│   ├── review/               rà tiếng Việt, dữ kiện, humanize
│   └── archive/              mẫu cấu trúc bài
└── scripts/
    ├── lint-vietnamese-content.mjs     kiểm tra lỗi trình bày tiếng Việt
    ├── compare-preserved-content.mjs   so dữ kiện trước/sau khi sửa
    └── test-humanizer-contract.mjs     kiểm tra hướng dẫn Humanizer
install.sh                    trình cài đặt
tests/                        kiểm thử và eval
```

### Chạy kiểm thử

Các kiểm tra không cần mạng hay LLM. Lệnh này cũng tự chạy ở mỗi PR trên GitHub Actions, với macOS và Linux:

```bash
bash tests/run-all.sh
```

### Eval chất lượng bài viết

Eval đưa 12 yêu cầu mẫu trong `tests/eval/cases.json` cho Claude Code chạy với Viết Pro, rồi chấm kết quả. Các kiểm tra tự động quyết định đạt hay không (giữ dữ kiện, không lỗi lint, đúng độ dài...); điểm do LLM chấm chỉ để tham khảo.

```bash
node tests/eval/run-eval.mjs --judge --compare tests/eval/baseline.json
```

- Bản 5.2.1 (baseline): 11/12 ca đạt.
- Bản 5.3.0: 12/12 ca đạt, không ca nào tụt hạng.

Mỗi bản chỉ chạy một lần, nên con số này là tín hiệu để theo dõi, chưa phải bằng chứng thống kê. Mỗi lần chạy eval tốn khoảng 0,3-0,5 USD cho mỗi ca khi bật judge. Workflow `eval` trên GitHub chỉ chạy khi repository có secret `ANTHROPIC_API_KEY`.

Khi sửa nội dung skill, hãy sinh lại `SKILL_SHA256SUMS` theo [INSTALL.md](INSTALL.md) mục 5.

</details>

---

## Lịch sử phiên bản

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

Các bản phát hành và file zip: [GitHub Releases](https://github.com/abm-dungtq/viet-pro-codex/releases).

---

## Giấy phép

Viết Pro phát hành theo giấy phép MIT, xem [LICENSE](LICENSE).
Phần tham khảo chuyển thể từ Humanizer cũng theo giấy phép MIT, chi tiết trong [THIRD_PARTY_NOTICES.md](skills/viet-pro/THIRD_PARTY_NOTICES.md).
