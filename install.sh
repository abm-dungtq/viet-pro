#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Viết Pro — trình cài đặt cho Claude Code, OpenAI Codex và Google Antigravity
# Repository: https://github.com/abm-dungtq/viet-pro-codex
# ==============================================================================

REPO_URL="https://github.com/abm-dungtq/viet-pro-codex.git"
SKILL_NAME="viet-pro"
DEFAULT_REF="v5.4.0"
REF="${VIET_PRO_REF:-$DEFAULT_REF}"
REF_EXPLICIT=false
INSTALL_MODE="copy" # copy | symlink
WORKSPACE_MODE=false
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
  curl -fsSL https://raw.githubusercontent.com/abm-dungtq/viet-pro-codex/$DEFAULT_REF/install.sh | bash

Tuỳ chọn:
  --claude              Cài cho Claude Code ($CLAUDE_DIR)
  --codex               Cài cho OpenAI Codex ($CODEX_DIR)
  --agy, --antigravity  Cài cho Google Antigravity app/IDE ($AGY_DIR)
  --agy-cli             Cài thêm cho Antigravity CLI ($AGY_CLI_DIR)
  --all                 Cài cho mọi host phát hiện được trên máy (mặc định)
  --workspace, -w       Cài vào workspace hiện tại (.agents/skills và .claude/skills)
  --link, -l            Tạo symlink thay vì copy (chỉ khi chạy từ repo local)
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
    --ref)
      [[ $# -ge 2 ]] || die "--ref cần một tag, ví dụ --ref v5.2.1"
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
  git clone --quiet --depth 1 --branch "$REF" "$REPO_URL" "$TEMP_DIR/viet-pro-codex" \
    || die "Không tải được phiên bản $REF. Kiểm tra lại tag hoặc kết nối mạng."
  SOURCE_ROOT="$TEMP_DIR/viet-pro-codex"
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

if [ "$INSTALLED_ANY" = true ]; then
  echo ""
  echo "✓ Cài đặt hoàn tất."
  [ -d "$BACKUP_ROOT" ] && echo "  Bản cũ nằm ở $BACKUP_ROOT; có thể xoá thư mục này khi không cần nữa."
  echo "  Claude Code: gọi /viet-pro hoặc mô tả yêu cầu viết tiếng Việt"
  echo "  Codex: \$viet-pro <yêu cầu>"
  echo "  Antigravity: gọi /viet-pro hoặc mô tả yêu cầu tự nhiên"
fi
