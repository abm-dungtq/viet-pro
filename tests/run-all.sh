#!/usr/bin/env bash
# Deterministic checks for viet-pro. Run locally or in CI: bash tests/run-all.sh
# No network or LLM needed. Exits non-zero on the first failing group.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SCRIPTS="skills/viet-pro/scripts"

step() { echo ""; echo "==> $*"; }

sha256_check() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum -c "$1" >/dev/null; else shasum -a 256 -c "$1" >/dev/null; fi
}

step "Self-test của skill"
node "$SCRIPTS/lint-vietnamese-content.mjs" --self-test
node "$SCRIPTS/compare-preserved-content.mjs" --self-test
node "$SCRIPTS/test-humanizer-contract.mjs"

step "Lint fixture: bản sau khi humanize và tài liệu kỹ thuật không có vi phạm"
for f in tests/humanizer/facebook-after.md tests/humanizer/technical.md; do
  out="$(node "$SCRIPTS/lint-vietnamese-content.mjs" "$f")"
  echo "$out"
  case "$out" in OK*) ;; *) echo "FAIL: $f phải sạch lint" >&2; exit 1 ;; esac
done

step "Lint fixture: bản trước khi humanize phải bị cảnh báo"
before="$(node "$SCRIPTS/lint-vietnamese-content.mjs" tests/humanizer/facebook-before.md)"
for id in chatbot-residue staged-opener contrast-formula-repeat decorative-bold-labels dramatic-closer-repeat; do
  case "$before" in *"[$id]"*) ;; *) echo "FAIL: facebook-before.md thiếu cảnh báo $id" >&2; exit 1 ;; esac
done
echo "OK: đủ 5 nhóm cảnh báo"

step "Đối chiếu dữ kiện fixture trước/sau humanize"
node "$SCRIPTS/compare-preserved-content.mjs" tests/humanizer/facebook-before.md tests/humanizer/facebook-after.md

step "Tham chiếu trong skill"
node tests/check-skill-refs.mjs

step "Hạn rà soát dữ kiện nền tảng"
node tests/check-freshness.mjs
if node tests/check-freshness.mjs --today 2099-01-01 >/dev/null 2>&1; then echo "FAIL: check-freshness không báo hết hạn" >&2; exit 1; fi
node "$SCRIPTS/check-x-length.mjs" --self-test

step "Manifest checksum của skill"
sha256_check SKILL_SHA256SUMS
listed="$(awk '{print $2}' SKILL_SHA256SUMS | LC_ALL=C sort)"
actual="$(find skills/viet-pro -type f ! -name .DS_Store | LC_ALL=C sort)"
if [ "$listed" != "$actual" ]; then echo "FAIL: SKILL_SHA256SUMS không khớp danh sách file; sinh lại theo INSTALL.md mục 5" >&2; exit 1; fi
echo "OK: SKILL_SHA256SUMS khớp $(echo "$actual" | wc -l | tr -d ' ') file"

step "Phiên bản đồng bộ giữa SKILL.md và install.sh"
skill_version="$(sed -n 's/^  version: "\(.*\)"$/\1/p' skills/viet-pro/SKILL.md)"
installer_ref="$(sed -n 's/^DEFAULT_REF="\(.*\)"$/\1/p' install.sh)"
if [ "v$skill_version" != "$installer_ref" ]; then echo "FAIL: SKILL.md $skill_version khác DEFAULT_REF $installer_ref" >&2; exit 1; fi
echo "OK: v$skill_version"

step "Phiên bản plugin đồng bộ với SKILL.md"
# shellcheck disable=SC2016
if ! node -e 'const [p, m, v] = process.argv.slice(1); process.exit(require(p).version === v && require(m).plugins[0].version === v ? 0 : 1)' "$ROOT/.claude-plugin/plugin.json" "$ROOT/.claude-plugin/marketplace.json" "$skill_version"; then
  echo "FAIL: .claude-plugin/plugin.json hoặc marketplace.json không ghi version $skill_version" >&2; exit 1
fi
if command -v claude >/dev/null 2>&1; then
  if ! claude plugin validate --strict .claude-plugin/plugin.json >/dev/null || ! claude plugin validate --strict . >/dev/null; then echo "FAIL: manifest plugin không hợp lệ" >&2; exit 1; fi
  echo "OK: manifest plugin hợp lệ"
else
  echo "SKIP: không có claude CLI để validate manifest"
fi

step "Kiểm thử installer"
bash tests/install/test-install.sh .

step "Grader của eval trên kết quả đã lưu"
if [ -f tests/eval/baseline.json ]; then
  node tests/eval/run-eval.mjs --regrade tests/eval/baseline.json --out "$(mktemp -d)/regrade.json" > /dev/null
  echo "OK: regrade baseline chạy được"
fi

echo ""
echo "ALL CHECKS PASS"
