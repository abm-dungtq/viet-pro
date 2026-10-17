# Hướng dẫn cài đặt Viết Pro

Viết Pro (`viet-pro`) chạy trên **Claude Code**, **OpenAI Codex** và **Google Antigravity**. AgentKit dùng chung thư mục skill của các host này.

```text
skills/viet-pro/          nguồn skill chuẩn (SKILL.md, references/, scripts/)
SKILL_SHA256SUMS          checksum từng file của skill, installer dùng để kiểm tra
dist/viet-pro-5.4.0.zip   gói phát hành
SHA256SUMS                checksum các gói zip
```

---

## 1. Cài tự động (khuyến nghị)

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro-codex/v5.4.0/install.sh | bash
```

Lệnh trên tải đúng tag `v5.4.0`, kiểm tra checksum của skill, rồi cài cho mọi host phát hiện được trên máy (dựa vào sự tồn tại của `~/.claude`, `~/.agents` hoặc `~/.codex`, và `~/.gemini`).

Chỉ định host hoặc tuỳ chọn khác bằng cách thêm tham số sau `bash -s --`:

```bash
curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro-codex/v5.4.0/install.sh | bash -s -- --claude --codex
```

| Tuỳ chọn | Tác dụng |
| :--- | :--- |
| `--claude` | Cài vào `~/.claude/skills/viet-pro` |
| `--codex` | Cài vào `~/.agents/skills/viet-pro` |
| `--agy`, `--antigravity` | Cài vào `~/.gemini/config/skills/viet-pro` (Antigravity app và IDE) |
| `--agy-cli` | Cài thêm vào `~/.gemini/antigravity-cli/skills/viet-pro` (Antigravity CLI) |
| `--all` | Cài cho mọi host phát hiện được (mặc định) |
| `--workspace`, `-w` | Cài vào dự án hiện tại: `.agents/skills/viet-pro` và `.claude/skills/viet-pro` |
| `--link`, `-l` | Tạo symlink thay vì copy (chỉ khi chạy `./install.sh` từ repo đã clone) |
| `--ref <tag>` | Cài một tag khác, ví dụ `--ref vX.Y.Z` |

Nếu đã clone repo, chạy trực tiếp:

```bash
./install.sh --claude --link
```

### Bản cũ được giữ lại

Installer không xoá bản cài trước. Mỗi lần cài, bản cũ được chuyển vào `~/.viet-pro-backups/<thời-gian>-<pid>/`, nằm ngoài thư mục skill để host không nạp nhầm hai bản. Xoá thư mục này khi không cần nữa.

Bản cài ở đường dẫn Codex cũ `~/.codex/skills/viet-pro` cũng được chuyển vào đó, với nhãn `codex-legacy`, vì Codex hiện đọc skill của người dùng từ `~/.agents/skills`. Nếu bạn dùng Codex bản rất cũ chỉ đọc `~/.codex/skills`, hãy cập nhật Codex, hoặc chuyển thư mục `codex-legacy` về chỗ cũ.

---

## 2. Cài thủ công

Sao chép thư mục `skills/viet-pro` vào đúng chỗ của host. Nếu đã có bản cũ, chuyển bản cũ ra ngoài thư mục skill trước, không trộn file của hai phiên bản.

| Host | Toàn máy | Theo dự án |
| :--- | :--- | :--- |
| Claude Code | `~/.claude/skills/viet-pro` | `.claude/skills/viet-pro` |
| OpenAI Codex | `~/.agents/skills/viet-pro` | `.agents/skills/viet-pro` |
| Antigravity app/IDE | `~/.gemini/config/skills/viet-pro` | `.agents/skills/viet-pro` |
| Antigravity CLI | `~/.gemini/antigravity-cli/skills/viet-pro` | `.agents/skills/viet-pro` |

Ví dụ cho Claude Code:

```bash
mkdir -p ~/.claude/skills
cp -R skills/viet-pro ~/.claude/skills/viet-pro
```

---

## 3. Cách gọi

| Host | Cách gọi |
| :--- | :--- |
| Claude Code | `/viet-pro <yêu cầu>` hoặc mô tả yêu cầu viết tiếng Việt |
| OpenAI Codex | `$viet-pro <yêu cầu>`; `agents/openai.yaml` cho phép kích hoạt tự nhiên |
| Antigravity | `/viet-pro` hoặc mô tả yêu cầu tự nhiên |

Mở phiên mới sau khi cài để host nạp skill.

---

## 4. Kiểm tra cài đặt

```bash
node skills/viet-pro/scripts/lint-vietnamese-content.mjs --self-test
node skills/viet-pro/scripts/compare-preserved-content.mjs --self-test
node skills/viet-pro/scripts/test-humanizer-contract.mjs
```

Kiểm tra checksum khi đã clone repo:

```bash
shasum -a 256 -c SKILL_SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

Trên Linux, thay `shasum -a 256` bằng `sha256sum`.

Humanizer 3.1.0 được tích hợp nội bộ trong `viet-pro`; không có lệnh `$humanizer` riêng. Thông báo MIT đầy đủ nằm tại `skills/viet-pro/THIRD_PARTY_NOTICES.md`.

---

## 5. Dành cho người bảo trì

Mỗi lần phát hành phiên bản mới:

1. Cập nhật `DEFAULT_REF` trong `install.sh` và các URL `vX.Y.Z` trong README.md và INSTALL.md.
2. Sinh lại manifest sau mọi thay đổi trong `skills/viet-pro/`:

   ```bash
   find skills/viet-pro -type f ! -name .DS_Store | LC_ALL=C sort | xargs shasum -a 256 > SKILL_SHA256SUMS
   ```

   Trên Linux, thay `shasum -a 256` bằng `sha256sum`.

3. Chạy `bash tests/run-all.sh`, phải in `ALL CHECKS PASS`. Khi đổi nội dung skill, chạy thêm `node tests/eval/run-eval.mjs --judge --compare tests/eval/baseline.json` và không để ca nào tụt từ pass xuống fail.
4. Gắn tag `vX.Y.Z` lên commit đã merge vào `main`, rồi thử lại lệnh cài tự động.
