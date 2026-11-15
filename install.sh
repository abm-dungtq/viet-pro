#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Viết Pro — trình cài đặt cho Claude Code, OpenAI Codex và Google Antigravity
# Repository: https://github.com/abm-dungtq/viet-pro
# ==============================================================================

REPO_URL="https://github.com/abm-dungtq/viet-pro.git"
SKILL_NAME="viet-pro"
DEFAULT_REF="v6.1.0"
REF="${VIET_PRO_REF:-$DEFAULT_REF}"
REF_EXPLICIT=false
INSTALL_MODE="copy" # copy | symlink
WORKSPACE_MODE=false
SKIP_MCP_CLEANUP=false
NO_CLI_LINK=false
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${VIET_PRO_BACKUP_DIR:-$HOME/.viet-pro-backups}/$TIMESTAMP-$$"

WANT_CLAUDE=false
WANT_CODEX=false
WANT_AGY=false
WANT_AGY_CLI=false
EXPLICIT_TARGET=false

CLAUDE_DIR="$HOME/.claude/skills"
CODEX_DIR="$HOME/.agents/skills"
LEGACY_CODEX_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
AGY_DIR="$HOME/.gemini/config/skills"
AGY_CLI_DIR="$HOME/.gemini/antigravity-cli/skills"

print_help() {
  cat << HELP
Viết Pro — trình cài đặt cho Claude Code, OpenAI Codex và Google Antigravity

Cách dùng:
  ./install.sh [tuỳ chọn]
  curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/$DEFAULT_REF/install.sh | bash

Tuỳ chọn:
  --claude              Cài cho Claude Code ($CLAUDE_DIR)
  --codex               Cài cho OpenAI Codex ($CODEX_DIR)
  --agy, --antigravity  Cài cho Google Antigravity app/IDE ($AGY_DIR)
  --agy-cli             Cài thêm cho Antigravity CLI ($AGY_CLI_DIR)
  --all                 Cài cho mọi host phát hiện được trên máy (mặc định)
  --workspace, -w       Cài vào workspace hiện tại (.agents/skills và .claude/skills)
  --link, -l            Tạo symlink thay vì copy (chỉ khi chạy từ repo local)
  --skip-mcp-cleanup    Giữ nguyên cấu hình MCP viet-pro cũ nếu có
  --no-cli-link         Không tạo symlink CLI $HOME/.local/bin/viet-pro
  --ref <tag>           Phiên bản cần tải khi cài từ GitHub (mặc định: $DEFAULT_REF)
  --help, -h            Hiển thị trợ giúp này

Bản cũ không bị xoá: installer chuyển nó vào $HOME/.viet-pro-backups/<thời-gian>/.
HELP
}

die() { echo "Lỗi: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --claude) WANT_CLAUDE=true; EXPLICIT_TARGET=true; shift ;;
    --codex) WANT_CODEX=true; EXPLICIT_TARGET=true; shift ;;
    --agy|--antigravity) WANT_AGY=true; EXPLICIT_TARGET=true; shift ;;
    --agy-cli) WANT_AGY_CLI=true; EXPLICIT_TARGET=true; shift ;;
    --all) EXPLICIT_TARGET=false; shift ;;
    --workspace|-w) WORKSPACE_MODE=true; shift ;;
    --link|-l) INSTALL_MODE="symlink"; shift ;;
    --skip-mcp-cleanup) SKIP_MCP_CLEANUP=true; shift ;;
    --no-cli-link) NO_CLI_LINK=true; shift ;;
    --ref)
      [[ $# -ge 2 ]] || die "--ref cần một tag, ví dụ --ref v6.1.0"
      REF="$2"; REF_EXPLICIT=true; shift 2 ;;
    --help|-h) print_help; exit 0 ;;
    *) echo "Lỗi: Tuỳ chọn không hợp lệ '$1'" >&2; print_help; exit 1 ;;
  esac
done

SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

TEMP_DIR=""
STAGING=""
cleanup() {
  if [ -n "$STAGING" ] && { [ -e "$STAGING" ] || [ -L "$STAGING" ]; }; then rm -rf "$STAGING"; fi
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then rm -rf "$TEMP_DIR"; fi
}
trap cleanup EXIT

sha256_check() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "$1" >/dev/null
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "$1" >/dev/null
  else
    die "Không tìm thấy sha256sum hoặc shasum để kiểm tra checksum"
  fi
}

# Xác định nguồn: repo local (khi chạy ./install.sh) hoặc tag trên GitHub
SOURCE_ROOT=""
REMOTE=false
if [ -n "$SCRIPT_DIR" ] && [ -d "$SCRIPT_DIR/skills/$SKILL_NAME" ]; then
  SOURCE_ROOT="$SCRIPT_DIR"
  if [ "$REF_EXPLICIT" = true ]; then
    echo "Cảnh báo: đang cài từ repo local nên bỏ qua --ref $REF" >&2
  fi
else
  command -v git >/dev/null 2>&1 || die "Cần cài git để tải Viết Pro"
  echo "==> Đang tải Viết Pro $REF từ GitHub..."
  TEMP_DIR="$(mktemp -d)"
  git clone --quiet --depth 1 --branch "$REF" "$REPO_URL" "$TEMP_DIR/viet-pro" \
    || die "Không tải được phiên bản $REF. Kiểm tra lại tag hoặc kết nối mạng."
  SOURCE_ROOT="$TEMP_DIR/viet-pro"
  REMOTE=true
  INSTALL_MODE="copy" # bản tải về là thư mục tạm, không thể symlink
fi

SOURCE_SKILL_DIR="$SOURCE_ROOT/skills/$SKILL_NAME"
[ -f "$SOURCE_SKILL_DIR/SKILL.md" ] || die "Không tìm thấy $SOURCE_SKILL_DIR/SKILL.md"

if [ -f "$SOURCE_ROOT/SKILL_SHA256SUMS" ]; then
  (cd "$SOURCE_ROOT" && sha256_check SKILL_SHA256SUMS) \
    || die "Checksum của skill không khớp SKILL_SHA256SUMS. Đã dừng, chưa thay đổi gì trên máy."
  echo "==> Checksum skill khớp SKILL_SHA256SUMS"
elif [ "$REMOTE" = true ]; then
  die "Phiên bản $REF không có SKILL_SHA256SUMS. Hãy dùng --ref v5.2.1 trở lên."
else
  echo "Cảnh báo: repo local không có SKILL_SHA256SUMS, bỏ qua bước kiểm tra checksum" >&2
fi

# Chuyển một thư mục/symlink cũ vào thư mục sao lưu, không xoá
backup_path() {
  local path="$1" label="$2"
  mkdir -p "$BACKUP_ROOT"
  local dest="$BACKUP_ROOT/$label"
  mv "$path" "$dest"
  echo "    ↺ Bản cũ đã được chuyển vào: $dest"
}

install_to_dir() {
  local skills_dir="$1" label="$2"
  local target="$skills_dir/$SKILL_NAME"

  echo "==> Đang cài $SKILL_NAME cho $label..."
  mkdir -p "$skills_dir"

  # Dựng bản mới ở thư mục ẩn cạnh đích rồi mới hoán đổi, để lỗi giữa chừng không làm mất bản cũ
  STAGING="$skills_dir/.$SKILL_NAME.staging-$$"
  rm -rf "$STAGING"
  if [ "$INSTALL_MODE" = "symlink" ]; then
    ln -s "$SOURCE_SKILL_DIR" "$STAGING"
  else
    cp -R "$SOURCE_SKILL_DIR" "$STAGING"
  fi
  [ -f "$STAGING/SKILL.md" ] || die "Bản dựng tạm cho $label thiếu SKILL.md; bản cũ vẫn giữ nguyên"

  local backup=""
  if [ -e "$target" ] || [ -L "$target" ]; then
    mkdir -p "$BACKUP_ROOT"
    backup="$BACKUP_ROOT/$(echo "$label" | tr ' /' '--')"
    mv "$target" "$backup"
  fi
  if ! mv "$STAGING" "$target"; then
    [ -n "$backup" ] && mv "$backup" "$target"
    die "Không đưa được bản mới vào $target; đã khôi phục bản cũ"
  fi
  STAGING=""
  [ -n "$backup" ] && echo "    ↺ Bản cũ đã được chuyển vào: $backup"
  if [ "$INSTALL_MODE" = "symlink" ]; then
    echo "    ✓ Đã tạo symlink: $target -> $SOURCE_SKILL_DIR"
  else
    echo "    ✓ Đã sao chép vào: $target"
  fi
}

echo "=================================================="
echo "    Cài đặt Viết Pro"
echo "=================================================="

INSTALLED_ANY=false

if [ "$WORKSPACE_MODE" = true ]; then
  install_to_dir "$(pwd)/.agents/skills" "workspace-agents"
  install_to_dir "$(pwd)/.claude/skills" "workspace-claude"
  INSTALLED_ANY=true
else
  if [ "$EXPLICIT_TARGET" = false ]; then
    [ -d "$HOME/.claude" ] && WANT_CLAUDE=true
    { [ -d "$HOME/.agents" ] || [ -d "${CODEX_HOME:-$HOME/.codex}" ]; } && WANT_CODEX=true
    [ -d "$HOME/.gemini" ] && WANT_AGY=true
    [ -d "$HOME/.gemini/antigravity-cli" ] && WANT_AGY_CLI=true
    if [ "$WANT_CLAUDE$WANT_CODEX$WANT_AGY" = "falsefalsefalse" ]; then
      die "Không phát hiện Claude Code, Codex hay Antigravity. Hãy chỉ định --claude, --codex hoặc --agy."
    fi
  fi
  if [ "$WANT_CLAUDE" = true ]; then install_to_dir "$CLAUDE_DIR" "claude"; INSTALLED_ANY=true; fi
  if [ "$WANT_CODEX" = true ]; then
    install_to_dir "$CODEX_DIR" "codex"; INSTALLED_ANY=true
    if [ "$LEGACY_CODEX_DIR" != "$CODEX_DIR" ] && { [ -e "$LEGACY_CODEX_DIR/$SKILL_NAME" ] || [ -L "$LEGACY_CODEX_DIR/$SKILL_NAME" ]; }; then
      echo "==> Phát hiện bản cài cũ tại $LEGACY_CODEX_DIR/$SKILL_NAME (đường dẫn Codex cũ)"
      backup_path "$LEGACY_CODEX_DIR/$SKILL_NAME" "codex-legacy"
    fi
  fi
  if [ "$WANT_AGY" = true ]; then install_to_dir "$AGY_DIR" "antigravity"; INSTALLED_ANY=true; fi
  if [ "$WANT_AGY_CLI" = true ]; then install_to_dir "$AGY_CLI_DIR" "antigravity-cli"; INSTALLED_ANY=true; fi
fi

cleanup_local_mcp() {
  command -v node >/dev/null 2>&1 || return 0
  VP_HOME="$HOME" \
  VP_CODEX_HOME="${CODEX_HOME:-$HOME/.codex}" \
  VP_BACKUP_ROOT="$BACKUP_ROOT" \
  VP_WANT_CLAUDE="$WANT_CLAUDE" \
  VP_WANT_CODEX="$WANT_CODEX" \
  VP_WANT_AGY="$WANT_AGY" \
  node -e '
const fs = require("node:fs");
const path = require("node:path");

const home = process.env.VP_HOME;
const codexHome = process.env.VP_CODEX_HOME;
const backupRoot = process.env.VP_BACKUP_ROOT;

function backupAndWrite(filePath, backupName, content) {
  fs.mkdirSync(backupRoot, { recursive: true });
  fs.copyFileSync(filePath, path.join(backupRoot, backupName));
  const tmp = path.join(path.dirname(filePath), "." + path.basename(filePath) + ".tmp-" + process.pid);
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

function cleanJsonMcp(filePath, backupName, isClaude) {
  if (!fs.existsSync(filePath)) return;
  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error("Cảnh báo: không đọc được " + filePath + " (" + err.message + "), bỏ qua dọn MCP");
    return;
  }
  if (!obj || typeof obj !== "object") return;
  let changed = false;
  if (obj.mcpServers && typeof obj.mcpServers === "object" && Object.prototype.hasOwnProperty.call(obj.mcpServers, "viet-pro")) {
    delete obj.mcpServers["viet-pro"];
    changed = true;
  }
  if (isClaude && obj.projects && typeof obj.projects === "object") {
    for (const proj of Object.values(obj.projects)) {
      if (proj && typeof proj === "object" && proj.mcpServers && typeof proj.mcpServers === "object" && Object.prototype.hasOwnProperty.call(proj.mcpServers, "viet-pro")) {
        delete proj.mcpServers["viet-pro"];
        changed = true;
      }
    }
  }
  if (changed) {
    backupAndWrite(filePath, backupName, JSON.stringify(obj, null, 2) + "\n");
    console.log("    ✓ Đã gỡ đăng ký MCP viet-pro khỏi " + filePath);
  }
}

function cleanCodexToml(filePath, backupName) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n");
  const out = [];
  let skipping = false;
  let changed = false;
  for (const line of lines) {
    const trimmed = line.replace(/\r$/, "").trim();
    const header = trimmed.match(/^\[([^\]]+)\](?:\s*#.*)?$/);
    if (header) {
      const sec = header[1].trim();
      const isVp = /^mcp_servers\.(?:"viet-pro"|'\''viet-pro'\''|viet-pro)(?:\.|$)/.test(sec);
      if (isVp) {
        skipping = true;
        changed = true;
        continue;
      }
      skipping = false;
    }
    if (skipping) continue;
    out.push(line);
  }
  if (changed) {
    let next = out.join("\n").replace(/\n{3,}/g, "\n\n");
    if (next.length > 0 && !next.endsWith("\n")) next += "\n";
    backupAndWrite(filePath, backupName, next);
    console.log("    ✓ Đã gỡ [mcp_servers.viet-pro] khỏi " + filePath);
  }
}

if (process.env.VP_WANT_AGY === "true") {
  cleanJsonMcp(path.join(home, ".gemini", "antigravity", "mcp_config.json"), "agy-mcp_config.json", false);
  cleanJsonMcp(path.join(home, ".gemini", "config", "mcp_config.json"), "gemini-config-mcp_config.json", false);
}
if (process.env.VP_WANT_CLAUDE === "true") {
  cleanJsonMcp(path.join(home, ".claude.json"), "claude.json", true);
}
if (process.env.VP_WANT_CODEX === "true") {
  cleanCodexToml(path.join(codexHome, "config.toml"), "codex-config.toml");
}
'
}

CLI_TARGET=""
if [ "$INSTALLED_ANY" = true ] && [ "$WORKSPACE_MODE" = false ]; then
  if [ "$NO_CLI_LINK" = false ]; then
    if [ "$WANT_CODEX" = true ] && [ -f "$CODEX_DIR/$SKILL_NAME/bin/viet-pro.mjs" ]; then
      CLI_TARGET="$CODEX_DIR/$SKILL_NAME/bin/viet-pro.mjs"
    elif [ "$WANT_CLAUDE" = true ] && [ -f "$CLAUDE_DIR/$SKILL_NAME/bin/viet-pro.mjs" ]; then
      CLI_TARGET="$CLAUDE_DIR/$SKILL_NAME/bin/viet-pro.mjs"
    elif [ "$WANT_AGY" = true ] && [ -f "$AGY_DIR/$SKILL_NAME/bin/viet-pro.mjs" ]; then
      CLI_TARGET="$AGY_DIR/$SKILL_NAME/bin/viet-pro.mjs"
    elif [ "$WANT_AGY_CLI" = true ] && [ -f "$AGY_CLI_DIR/$SKILL_NAME/bin/viet-pro.mjs" ]; then
      CLI_TARGET="$AGY_CLI_DIR/$SKILL_NAME/bin/viet-pro.mjs"
    fi

    if [ -n "$CLI_TARGET" ]; then
      chmod +x "$CLI_TARGET"
      LOCAL_BIN_DIR="$HOME/.local/bin"
      mkdir -p "$LOCAL_BIN_DIR"
      CLI_LINK="$LOCAL_BIN_DIR/viet-pro"
      if [ -e "$CLI_LINK" ] && [ ! -L "$CLI_LINK" ]; then
        mkdir -p "$BACKUP_ROOT"
        mv "$CLI_LINK" "$BACKUP_ROOT/local-bin-viet-pro"
        echo "    ↺ CLI cũ đã được chuyển vào: $BACKUP_ROOT/local-bin-viet-pro"
      fi
      ln -sfn "$CLI_TARGET" "$CLI_LINK"
      echo "    ✓ Đã cài CLI: $CLI_LINK -> $CLI_TARGET"
      case ":$PATH:" in
        *":$LOCAL_BIN_DIR:"*) ;;
        *) echo "    ℹ Thêm $LOCAL_BIN_DIR vào PATH để gọi lệnh viet-pro trực tiếp." ;;
      esac
    fi
  fi

  if [ "$SKIP_MCP_CLEANUP" = false ]; then
    cleanup_local_mcp
  fi

  REAL_HOME=""
  if command -v node >/dev/null 2>&1; then
    REAL_HOME="$(node -e 'process.stdout.write(require("os").userInfo().homedir)' 2>/dev/null || true)"
  fi
  if [ "$NO_CLI_LINK" = false ] && [ -n "$CLI_TARGET" ] && [ -n "$REAL_HOME" ] && [ "$HOME" = "$REAL_HOME" ] && [ "${VIET_PRO_NO_GLOBAL_REGISTER:-0}" != "1" ] && [ -x /Users/tqd/.local/bin/agent-cli-manager ]; then
    REGISTER_TARGET="curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro/$DEFAULT_REF/install.sh | bash"
    if [ -n "$SCRIPT_DIR" ]; then
      REGISTER_TARGET="git -C $SCRIPT_DIR pull && $SCRIPT_DIR/install.sh"
    fi
    /Users/tqd/.local/bin/agent-cli-manager register \
      --name "viet-pro" \
      --bin "$HOME/.local/bin/viet-pro" \
      --domain "Cổng biên tập tiếng Việt CLI-first (viet-pro gate, lint, compare, check-platform, init, doctor)" \
      --manager manual \
      --target "$REGISTER_TARGET"
  fi
fi

if [ "$INSTALLED_ANY" = true ]; then
  echo ""
  echo "✓ Cài đặt hoàn tất."
  [ -d "$BACKUP_ROOT" ] && echo "  Bản cũ nằm ở $BACKUP_ROOT; có thể xoá thư mục này khi không cần nữa."
  if [ -n "$CLI_TARGET" ]; then
    echo "  CLI: ${CLI_LINK:-$HOME/.local/bin/viet-pro} doctor"
  fi
  echo "  Claude Code: gọi /viet-pro hoặc mô tả yêu cầu viết tiếng Việt"
  echo "  Codex: \$viet-pro <yêu cầu>"
  echo "  Antigravity: gọi /viet-pro hoặc mô tả yêu cầu tự nhiên"
fi
