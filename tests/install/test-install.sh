#!/usr/bin/env bash
# Kiểm thử install.sh trong HOME tạm; không chạm vào HOME thật.
# shellcheck disable=SC2016,SC2034  # các biểu thức được check() eval sau
set -uo pipefail
REPO="$(cd "${1:?usage: test-install.sh <repo-root>}" && pwd)"
PASS=0; FAIL=0
ok() { PASS=$((PASS+1)); echo "PASS $1"; }
ko() { FAIL=$((FAIL+1)); echo "FAIL $1"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }

new_home() { H="$(mktemp -d)"; }
run() { HOME="$H" CODEX_HOME="" bash "$REPO/install.sh" "$@" >"$H/out.log" 2>&1; }

# 1. Cài mới theo từng host chỉ định
new_home; run --claude --codex --agy
check "cài mới thoát 0" 'grep -q "Cài đặt hoàn tất" "$H/out.log"'
check "claude có SKILL.md" '[ -f "$H/.claude/skills/viet-pro/SKILL.md" ]'
check "codex (~/.agents) có SKILL.md" '[ -f "$H/.agents/skills/viet-pro/SKILL.md" ]'
check "antigravity có SKILL.md" '[ -f "$H/.gemini/config/skills/viet-pro/SKILL.md" ]'
check "không cài antigravity-cli khi không chọn" '[ ! -e "$H/.gemini/antigravity-cli/skills/viet-pro" ]'
check "không còn thư mục staging" '[ -z "$(find "$H" -name ".viet-pro.staging-*")" ]'
check "CLI ~/.local/bin/viet-pro được tạo" '[ -L "$H/.local/bin/viet-pro" ] && [ -x "$H/.local/bin/viet-pro" ]'
check "CLI doctor --json báo ok:true" 'HOME="$H" "$H/.local/bin/viet-pro" doctor --json | node -e "const d=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")); process.exit(d.ok===true?0:1)"'

# 2. Cài lại: bản cũ được sao lưu ngoài thư mục skills
echo "ban-cu" > "$H/.claude/skills/viet-pro/MARKER"
run --claude
check "cài lại thoát 0" 'grep -q "Cài đặt hoàn tất" "$H/out.log"'
check "bản mới không còn MARKER" '[ ! -e "$H/.claude/skills/viet-pro/MARKER" ]'
check "MARKER nằm trong backup" '[ -n "$(find "$H/.viet-pro-backups" -name MARKER)" ]'
check "không có bản sao lưu trong thư mục skills" '[ "$(ls "$H/.claude/skills")" = "viet-pro" ]'

# 3. Di chuyển bản Codex cũ
new_home; mkdir -p "$H/.codex/skills/viet-pro"; echo cu > "$H/.codex/skills/viet-pro/SKILL.md"
run --codex
check "bản ~/.codex cũ đã rời chỗ" '[ ! -e "$H/.codex/skills/viet-pro" ]'
check "bản ~/.codex cũ nằm trong backup" '[ -d "$(find "$H/.viet-pro-backups" -maxdepth 2 -name codex-legacy | head -1)" ]'
check "codex mới đã cài" '[ -f "$H/.agents/skills/viet-pro/SKILL.md" ]'

# 4. Chế độ mặc định chỉ cài cho host phát hiện được
new_home; mkdir -p "$H/.claude"
run
check "mặc định cài cho claude" '[ -f "$H/.claude/skills/viet-pro/SKILL.md" ]'
check "mặc định không tạo ~/.gemini" '[ ! -e "$H/.gemini" ]'
new_home; run
check "không phát hiện host thì thoát lỗi" '! run'

# 5. Workspace cài cả .agents và .claude
new_home; W="$(mktemp -d)"; (cd "$W" && HOME="$H" bash "$REPO/install.sh" --workspace >"$H/out.log" 2>&1)
check "workspace .agents" '[ -f "$W/.agents/skills/viet-pro/SKILL.md" ]'
check "workspace .claude" '[ -f "$W/.claude/skills/viet-pro/SKILL.md" ]'
check "workspace không tạo ~/.local/bin/viet-pro" '[ ! -e "$H/.local/bin/viet-pro" ]'

# 6. Nguồn hỏng: bản cũ giữ nguyên, thoát lỗi
new_home; mkdir -p "$H/.claude/skills/viet-pro"; echo giu > "$H/.claude/skills/viet-pro/SKILL.md"
BROKEN="$(mktemp -d)"; cp -R "$REPO/." "$BROKEN/"; echo "bi sua" >> "$BROKEN/skills/viet-pro/SKILL.md"
if HOME="$H" bash "$BROKEN/install.sh" --claude >"$H/out.log" 2>&1; then ko "checksum sai phải thoát lỗi"; else ok "checksum sai phải thoát lỗi"; fi
check "bản cũ giữ nguyên khi checksum sai" '[ "$(cat "$H/.claude/skills/viet-pro/SKILL.md")" = "giu" ]'

# 7. Manifest khớp đúng danh sách file của skill
LIST_A="$(cd "$REPO" && find skills/viet-pro -type f ! -name .DS_Store | LC_ALL=C sort)"
LIST_B="$(awk '{print $2}' "$REPO/SKILL_SHA256SUMS" | LC_ALL=C sort)"
check "SKILL_SHA256SUMS liệt kê đủ file" '[ "$LIST_A" = "$LIST_B" ]'

# 8. Dọn sạch đăng ký MCP cũ mà giữ nguyên skillUsage và server khác
new_home
mkdir -p "$H/.codex" "$H/.gemini/antigravity"
cat > "$H/.claude.json" <<'JSON'
{
  "mcpServers": {
    "viet-pro": { "command": "node" },
    "other": { "command": "true" }
  },
  "projects": {
    "/tmp/p": {
      "mcpServers": {
        "viet-pro": { "command": "node" },
        "keep": { "command": "true" }
      }
    }
  },
  "skillUsage": {
    "viet-pro": { "usageCount": 7 }
  }
}
JSON
cat > "$H/.codex/config.toml" <<'TOML'
[mcp_servers.context7]
command = "npx"

[mcp_servers.viet-pro]
command = "node"
args = ["x"]

[projects."/tmp"]
trust_level = "trusted"
TOML
cat > "$H/.gemini/antigravity/mcp_config.json" <<'JSON'
{
  "mcpServers": {
    "viet-pro": { "command": "node" },
    "gemini-decisions": { "command": "uv" }
  }
}
JSON
run --claude --codex --agy
check "claude gỡ mcpServers.viet-pro nhưng giữ skillUsage" 'node -e "const j=JSON.parse(require(\"fs\").readFileSync(\"$H/.claude.json\",\"utf8\")); process.exit((!j.mcpServers?.[\"viet-pro\"] && j.mcpServers?.other && !j.projects?.[\"/tmp/p\"]?.mcpServers?.[\"viet-pro\"] && j.projects?.[\"/tmp/p\"]?.mcpServers?.keep && j.skillUsage?.[\"viet-pro\"]?.usageCount===7)?0:1)"'
check "codex gỡ [mcp_servers.viet-pro] và giữ phần còn lại" '! grep -q "viet-pro" "$H/.codex/config.toml" && grep -q "mcp_servers.context7" "$H/.codex/config.toml" && grep -q "trust_level" "$H/.codex/config.toml"'
check "agy gỡ mcpServers.viet-pro và giữ gemini-decisions" 'node -e "const j=JSON.parse(require(\"fs\").readFileSync(\"$H/.gemini/antigravity/mcp_config.json\",\"utf8\")); process.exit((!j.mcpServers?.[\"viet-pro\"] && j.mcpServers?.[\"gemini-decisions\"])?0:1)"'

echo "TOTAL: $PASS pass, $FAIL fail"
[ "$FAIL" -eq 0 ]
