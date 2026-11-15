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
node "$SCRIPTS/check-platform.mjs" --self-test
node "$SCRIPTS/lib/seo.mjs" --self-test
node "$SCRIPTS/mcp-server.mjs" --self-test
node "$SCRIPTS/lib/config.mjs" --self-test
node "$SCRIPTS/lib/pptx.mjs" --self-test
node "$SCRIPTS/lib/score.mjs" --self-test
GEMINI_API_KEY="" VIET_PRO_NO_ENV_FILE=1 node "$SCRIPTS/lib/decisions.mjs" --self-test
GEMINI_API_KEY="" VIET_PRO_NO_ENV_FILE=1 node "$SCRIPTS/lib/stamp.mjs" --self-test
GEMINI_API_KEY="" VIET_PRO_NO_ENV_FILE=1 node "$SCRIPTS/lib/gate.mjs" --self-test
node "$SCRIPTS/hooks/editorial-hook.mjs" --self-test
node "$SCRIPTS/hooks/agy-hook.mjs" --self-test
node "$SCRIPTS/hooks/claude-hook.mjs" --self-test
node "$SCRIPTS/hooks/codex-hook.mjs" --self-test
node skills/viet-pro/bin/viet-pro.mjs scan --self-test
node skills/viet-pro/bin/viet-pro.mjs mcp --self-test
node skills/viet-pro/bin/viet-pro.mjs doctor --json | node -e '
const d = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
if (d.ok !== true || d.version !== "6.2.0" || typeof d.elapsed_ms !== "number" || !(d.elapsed_ms < 50)) {
  console.error("FAIL: viet-pro doctor --json", d);
  process.exit(1);
}
console.log("OK: viet-pro doctor --json (" + d.elapsed_ms + "ms)");
'

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

step "Ngân sách ngữ cảnh theo tuyến"
node tests/check-route-budget.mjs

step "Hạn rà soát dữ kiện nền tảng"
node tests/check-freshness.mjs
if node tests/check-freshness.mjs --today 2099-01-01 >/dev/null 2>&1; then echo "FAIL: check-freshness không báo hết hạn" >&2; exit 1; fi
node "$SCRIPTS/check-x-length.mjs" --self-test
node "$SCRIPTS/check-platform.mjs" --validate

step "Kiểm bản thảo theo hồ sơ nền tảng"
expect_exit() { # <exit-code> <kênh> <file> [dòng-phải-có]
  set +e; out="$(node "$SCRIPTS/check-platform.mjs" "$2" "$3")"; code=$?; set -e
  echo "$out"
  if [ "$code" != "$1" ]; then echo "FAIL: check-platform $2 $3 thoát $code, cần $1" >&2; exit 1; fi
  if [ -n "${4:-}" ]; then case "$out" in *"$4"*) ;; *) echo "FAIL: $3 phải có \"$4\"" >&2; exit 1 ;; esac; fi
}
expect_exit 1 threads tests/platform/threads-over.md "ERROR [threads/post] max_chars đoạn 2"
expect_exit 1 threads tests/platform/threads-6-links.md "ERROR [threads/post] max_links đoạn 1"
expect_exit 1 x-thread tests/platform/x-thread-weighted-over.md "ERROR [x-thread/post] max_chars đoạn 1"
expect_exit 0 youtube tests/platform/youtube-ok.md "PASS"
expect_exit 1 instagram tests/platform/instagram-6-hashtags.md "ERROR [instagram/post] max_hashtags"
expect_exit 0 suno tests/platform/suno-ok.md "PASS"
expect_exit 1 suno tests/platform/suno-bad.md "ERROR [suno/custom] vietnamese-in-brackets"
expect_exit 0 linkedin tests/platform/linkedin-long-fold.md "WARN [linkedin/post] fold_chars"
expect_exit 0 blog-seo tests/platform/blog-seo-ok.md "PASS"
expect_exit 1 blog-seo tests/platform/blog-seo-bad.md "ERROR [blog-seo/article]"

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
  TMP_EVAL="$(mktemp -d)"
  trap 'rm -rf "$TMP_EVAL"' EXIT
  node tests/eval/run-eval.mjs --regrade tests/eval/baseline.json --out "$TMP_EVAL/regraded-base.json" > /dev/null
  node -e '
    const fs = require("node:fs");
    const base = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const cur = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const curMap = new Map((cur.cases || []).map((r) => [r.id, r]));
    const drops = (base.cases || []).filter((b) => b.pass && !curMap.get(b.id)?.pass).map((b) => b.id);
    if ((cur.summary?.pass ?? 0) < 20 || JSON.stringify(drops) !== JSON.stringify(["no-change-suno"])) {
      console.error("FAIL: regrade Pass 1 unexpected", { pass: cur.summary?.pass, drops });
      process.exit(1);
    }
    console.log("OK: regrade Pass 1 (pass=" + cur.summary.pass + ", expected baseline drift=" + drops.join(",") + ")");
  ' tests/eval/baseline.json "$TMP_EVAL/regraded-base.json"
  cmp_out="$(node tests/eval/run-eval.mjs --regrade tests/eval/baseline.json --compare "$TMP_EVAL/regraded-base.json" --out "$TMP_EVAL/regraded-cmp.json")"
  echo "$cmp_out"
  case "$cmp_out" in *"Ngân sách theo tuyến: PASS"*) ;; *) echo "FAIL: regrade Pass 2 thiếu Ngân sách theo tuyến: PASS" >&2; exit 1 ;; esac
  if node tests/eval/run-eval.mjs --regrade tests/eval/baseline.json --compare "$TMP_EVAL/regraded-base.json" --max-bytes-growth 0.02 --out "$TMP_EVAL/regraded-cap.json" >/dev/null 2>&1; then
    echo "FAIL: --max-bytes-growth 0.02 phải chặn khi vượt trần 2%" >&2
    exit 1
  fi
  echo "OK: regrade Pass 3 (--max-bytes-growth 0.02 vẫn chặn đúng khi truyền tường minh)"
  rm -rf "$TMP_EVAL"
fi

echo ""
echo "ALL CHECKS PASS"
