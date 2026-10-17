# Tự Nâng Cấp Skill

**Nhân viên:** upgrade.md — Ban Phát triển (development/)
**Mục đích:** Phân tích output đã viết → rút pattern → bổ sung vào skill.

---

## Khi Nào Gọi

Chỉ dùng khi người dùng yêu cầu phân tích, sửa hoặc nâng cấp skill (xem `development/lead.md`). Không tự sửa skill sau mỗi bài.

- Khi user yêu cầu: "phân tích bài viết này để cải tiến skill"
- Khi phát hiện kỹ thuật/pattern lặp lại chưa được document: báo cho user và chỉ bổ sung sau khi user duyệt

---

## Quy Trình

### Bước 1: Phân tích output

Dùng `development/style-audit.md` để phân tích bài viết đã hoàn tất:
- Chạy staged assessment (4 tầng)
- Rút style DNA và kỹ thuật đã dùng
- Chạy AI self-check
- Phát hiện lỗi tiếng Việt đã sửa

### Bước 2: So sánh với registry

Mở `SKILL.md` + lead.md các ban → kiểm tra:
- Kỹ thuật đó đã có trong module nào chưa?
- Lỗi đó đã được ghi trong `review/` chưa?

### Bước 3: Đề xuất bổ sung

Nếu phát hiện điều mới:
- **Kỹ thuật mới** → bổ sung vào module editorial/ phù hợp
- **Quy tắc mới** → bổ sung vào module review/ phù hợp
- **Pattern mới** → báo cáo cho user trước khi thêm

### Bước 4: Thực hiện bổ sung

Sau khi user duyệt, thêm nội dung vào module đích.

---

## Quy Chuẩn Bổ Sung

### Kỹ thuật mới (vào editorial/)

Mỗi kỹ thuật phải có đủ 5 thành phần:

```
## Kỹ thuật N: [Tên] ([Tên tiếng Anh])

**Mô tả:** [1-2 câu]

**Công thức:**
[Cấu trúc step-by-step]

**Ví dụ:**
[Ví dụ cụ thể từ bài viết thực tế]

**Cấm:**
[Anti-pattern, điều tránh]
```

### Quy tắc mới (vào review/)

Mỗi quy tắc phải có:

```
### [Tên quy tắc]

| Sai | Đúng |
|-----|------|
| `[ví dụ sai]` | `[ví dụ đúng]` |
```

### Giới hạn kích thước module

- Không đặt trần số dòng cứng (xem `development/lead.md`). Tách module khi việc tách giúp giảm context phải nạp hoặc giúp tìm đúng hướng dẫn nhanh hơn
- Tên file mới theo quy chuẩn: `[function].md` tiếng Anh
- Cập nhật bảng nhân sự trong lead.md của ban + SKILL.md nếu ảnh hưởng routing

---

## Changelog

> Tên file/thư mục trong các dòng cũ theo kiến trúc v2/v3 (style/, quality/, emotional.md...) — giữ nguyên làm lịch sử.

Mọi thay đổi ghi vào đây:

| Ngày | Module | Thay đổi | Nguồn |
|------|--------|----------|-------|
| 2026-10-08 | `SKILL.md`, `scripts/compare-preserved-content.mjs`, `archive/lead.md`, `development/upgrade.md` | **Nâng cấp v5.3.0**: compare-preserved bắt đảo nghĩa quanh số liệu, chuẩn hoá kiểu dấu ngoặc (trừ `--strict-quotes`) và dấu câu cuối URL; cấm đổi mốc thời gian tương đối thành ngày cụ thể; sửa tham chiếu gãy và đồng bộ quy tắc phát triển với `development/lead.md`; thêm eval hành vi và CI ngoài skill | Eval baseline 5.2.1 |
| 2026-10-08 | `SKILL.md`, `install.sh`, tài liệu phát hành | **Bản vá v5.2.1**: installer cài đúng đường dẫn Claude Code, Codex (`~/.agents/skills`) và Antigravity; sao lưu bản cũ thay vì xoá; ghim theo tag và kiểm tra `SKILL_SHA256SUMS`; hướng dẫn chạy script dùng đường dẫn tương đối tính từ thư mục skill | Phản biện nâng cấp skill |
| 2026-09-10 | `SKILL.md`, `review/`, `editorial/`, `scripts/`, tài liệu phát hành | **Nâng cấp v5.2.0**: tích hợp 25 pattern Humanizer 3.0.0 cho tiếng Việt; thêm rà nhẹ mặc định, audit theo yêu cầu, bảo toàn dữ kiện, giảm các công thức hook/nhịp/kết bài và mở rộng linter | Humanizer 3.0.0 + kế hoạch người dùng duyệt |
| 2026-09-05 | `SKILL.md`, `agents/openai.yaml` | **Bản vá v5.0.1**: chuẩn hóa tên hiển thị thành “Viết Pro”; tài liệu repository chuyển README thành hướng dẫn sử dụng và tách hướng dẫn cài đặt riêng | Phản hồi người dùng |
| 2026-09-04 | **TOÀN BỘ** | **Nâng cấp v5.0.0 cho Codex**: điều phối thích ứng, progressive disclosure, an toàn nguồn/tệp, ranh giới xuất bản, metadata UI, lint phân biệt house style | Yêu cầu nâng cấp và setup Codex |
| 2026-06-21 | **TOÀN BỘ** | Đổi tên skill `viet-chuyen-nghiep` → `viet-pro`; sửa 7 tham chiếu gãy (meta/, quality/ → development/, review/); chuẩn hoá LF | Audit bảo trì |
| 2026-02-26 | `style/advanced.md` | Thêm 6 kỹ thuật nâng cao | Bài viết AI & Gen Z |
| 2026-02-26 | `quality/punctuation.md` | Thêm quy tắc Oxford comma | Bài viết AI & Gen Z |
| 2026-03-08 | `style/advanced.md` | Thêm KT7 Structured Debunking, KT8 Strategic Caps | Bài phản bác Anthropic |
| 2026-03-08 | `style/emotional.md` | Thêm 3.1 Vernacular Translation sau Show/Tell | Bài phản bác Anthropic |
| 2026-03-08 | `SKILL.md` | Thêm workflow debunking vào dispatch | Bài phản bác Anthropic |
| 2026-03-08 | **TOÀN BỘ** | **Refactor v3.0 — Kiến trúc Tòa Soạn** | Blueprint v3.0 |
| | | SKILL.md viết lại ≤ 70 dòng | |
| | | +6 lead files (trưởng ban) | |
| | | emotional.md → storytelling.md + rhythm.md | |
| | | advanced.md → narrative.md + presentation.md | |
| | | punctuation.md → punctuation.md + capitalization.md | |
| | | natural.md → natural.md + anti-ai.md | |
| | | +examples/ (Ban Tư liệu) | |
| 2026-03-09 | `SKILL.md` | Thêm quy tắc GATE (bàn giao tuần tự giữa các ban) | Feedback quy trình |
| 2026-03-09 | `editorial/lead.md` | Thêm hành động bàn giao GATE | Feedback quy trình |
| 2026-03-09 | `review/lead.md` | Thêm hành động bàn giao GATE | Feedback quy trình |
| 2026-03-09 | `editorial/story-core.md` | Thêm §3.2 Self-Proof (tự chứng minh) | 3 bài viết tác giả |
| 2026-03-09 | `editorial/reframe.md` | Thêm §1.1 Concept System (hệ thống khái niệm) | 3 bài viết tác giả |
| 2026-03-09 | `editorial/emphasis.md` | Thêm ngoại lệ CAPS 8-12 cụm cho debunk + cập nhật checklist | 3 bài viết tác giả |
| 2026-03-09 | `editorial/hook-close.md` | Thêm §2.1 Delayed Reveal (treo rồi giải thích) | 3 bài viết tác giả |
| 2026-03-09 | `editorial/debunk.md` | Thêm trích dẫn nguyên văn tiếng Anh trong debunk | 3 bài viết tác giả |
| 2026-03-09 | `review/natural.md` | Thêm ngoại lệ format hỗn hợp cho bio/profile | 3 bài viết tác giả |
| 2026-03-09 | `editorial/rhythm.md` | Thêm §1.1 đoạn siêu dài 8-12 câu (3 lý do hợp lệ + giới hạn) | 3 bài viết tác giả |
| 2026-03-09 | `SKILL.md` | **Redesign v3.1** — 4 mô hình luồng, quy trình GATE evidence, routing tham chiếu, cơ chế archive | Feedback thiết kế TBT |
| 2026-03-09 | `editorial/lead.md` | Nhận ước lượng độ dài (chuyển từ TBT xuống lead) | Redesign v3.1 |
| 2026-03-09 | `archive/lead.md` | Thêm cơ chế tra cứu + cập nhật kho tư liệu | Redesign v3.1 |
| 2026-07-07 | **TOÀN BỘ** | **Nâng cấp v4.0 — Tòa soạn subagent thật** | Plan 260707-0909 |
| | | Kiến trúc cũ dùng 4 agent tách rời trong Claude Code; bản Codex 5.0 không phụ thuộc gói agent riêng | |
| | | GATE file-based + workspace content/{yymmdd}-{slug}/ + handoff-log | |
| | | publishing/ 1 → 9 kênh + repurpose-matrix.md, xuất bản song song | |
| | | Chuyển 6 ban vào references/, sửa hết tham chiếu gãy v2, frontmatter trigger keywords | |
| | | scripts/ cũ gồm lint và bộ đóng gói riêng; bộ đóng gói Claude đã được loại khỏi bản Codex 5.0 | |
| | | consistency.md viết lại hierarchy review→editorial→publishing + ngoại lệ kênh | |
