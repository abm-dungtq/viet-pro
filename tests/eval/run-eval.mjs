#!/usr/bin/env node
// Behavioral eval for viet-pro: run each brief through Claude Code headless with only this
// skill installed, then grade the output with deterministic checks and an optional LLM judge.
//
// Usage:
//   node tests/eval/run-eval.mjs [--cases id1,id2] [--concurrency 3] [--model <id>] [--judge]
//                                [--runner claude|codex]
//                                [--out tests/eval/results/<file>.json] [--compare <results.json>]
//                                [--max-bytes-growth 0.02] [--events-dir <dir>]
//   node tests/eval/run-eval.mjs --regrade <results.json> [--out <file>] [--compare <results.json>]
//
// Requires the `claude` CLI on PATH, authenticated by subscription login or ANTHROPIC_API_KEY.
// --runner codex requires the codex CLI, logged in; HOME is isolated so only viet-pro is installed.
// --events-dir keeps codex's raw --json event stream per case, for checking what the model read.
// The judge always runs on claude.
// Deterministic checks gate pass/fail; judge scores are advisory and tracked over time.
// --compare fails on any case that passed in the baseline and fails now, or when the skill's
// Markdown grows by more than --max-bytes-growth (default 2%).

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDraft, loadProfile, splitDraft } from '../../skills/viet-pro/scripts/lib/profile.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKILL_DIR = join(ROOT, 'skills/viet-pro');
const LINT = join(SKILL_DIR, 'scripts/lint-vietnamese-content.mjs');
const COMPARE = join(SKILL_DIR, 'scripts/compare-preserved-content.mjs');
const PUBLISHING = join(SKILL_DIR, 'references/publishing');
const START = '<<<BAI>>>';
const END = '<<<HET>>>';
const FORMAT_NOTE = `\n\nYêu cầu định dạng của bộ kiểm thử: đặt toàn bộ sản phẩm cuối giao cho người đọc giữa một dòng ${START} và một dòng ${END}. Ghi chú, giả định hoặc cảnh báo (nếu có) đặt ngoài cặp dấu này. Không tra cứu web.`;

function parseArgs(argv) {
  const opts = { concurrency: 3, judge: false, cases: null, model: null, out: null, compare: null, regrade: null, runner: 'claude', maxBytesGrowth: 0.02, eventsDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Error(`${a} cần giá trị`); return argv[++i]; };
    if (a === '--judge') opts.judge = true;
    else if (a === '--cases') opts.cases = next().split(',');
    else if (a === '--concurrency') opts.concurrency = Number(next());
    else if (a === '--model') opts.model = next();
    else if (a === '--out') opts.out = next();
    else if (a === '--compare') opts.compare = next();
    else if (a === '--regrade') opts.regrade = next();
    else if (a === '--runner') opts.runner = next();
    else if (a === '--max-bytes-growth') opts.maxBytesGrowth = Number(next());
    else if (a === '--events-dir') opts.eventsDir = next();
    else throw new Error(`Tuỳ chọn không hợp lệ: ${a}`);
  }
  if (!['claude', 'codex'].includes(opts.runner)) throw new Error('--runner chỉ nhận claude hoặc codex');
  if (!(opts.maxBytesGrowth >= 0)) throw new Error('--max-bytes-growth cần một tỷ lệ không âm, ví dụ 0.1');
  return opts;
}

function run(cmd, args, { cwd, input, env = process.env, timeoutMs = 600000 } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, { cwd, env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => { clearTimeout(timer); resolvePromise({ code, stdout, stderr }); });
    if (input) child.stdin.end(input); else child.stdin.end();
  });
}

function skillBytes() {
  let total = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.md') && !p.endsWith('THIRD_PARTY_NOTICES.md')) total += statSync(p).size;
    }
  };
  walk(SKILL_DIR);
  return total;
}

function skillVersion() {
  const m = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8').match(/version:\s*"([^"]+)"/);
  return m ? m[1] : 'unknown';
}

// Workspace with only viet-pro installed, via the repository's own installer.
function makeWorkspace() {
  const home = mkdtempSync(join(tmpdir(), 'viet-pro-eval-home-'));
  const ws = mkdtempSync(join(tmpdir(), 'viet-pro-eval-ws-'));
  const res = spawnSync('bash', [join(ROOT, 'install.sh'), '--workspace'], { cwd: ws, env: { ...process.env, HOME: home }, encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`install.sh --workspace thất bại: ${res.stderr || res.stdout}`);
  spawnSync('git', ['init', '-q'], { cwd: ws });
  return { ws, home };
}

function claudeArgs(prompt, model, tools) {
  const args = ['-p', prompt, '--setting-sources', 'project', '--no-session-persistence', '--output-format', 'json', '--allowedTools', tools];
  if (model) args.push('--model', model);
  return args;
}

async function generateCodex(c, opts, ws, home) {
  const lastFile = join(mkdtempSync(join(tmpdir(), 'viet-pro-eval-codex-')), 'last.md');
  const args = ['exec', '--json', '--skip-git-repo-check', '--ephemeral', '--ignore-user-config', '-s', 'workspace-write', '-C', ws, '-o', lastFile];
  if (opts.model) args.push('-m', opts.model);
  args.push('-');
  // Isolated CODEX_HOME: only auth.json is copied, so skills under the real ~/.codex/skills are not loaded.
  // The copy holds login tokens, so it is deleted after the run. If codex refreshes the token inside the
  // copy, the real login may need `codex login` again; setting CODEX_API_KEY avoids copying auth at all.
  // The workspace-write sandbox limits writes, not reads, so keep secrets out of the temp directory.
  const codexHome = mkdtempSync(join(tmpdir(), 'viet-pro-eval-codexhome-'));
  const realAuth = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'auth.json');
  if (!process.env.CODEX_API_KEY && existsSync(realAuth)) copyFileSync(realAuth, join(codexHome, 'auth.json'));
  const env = { ...process.env, HOME: home, CODEX_HOME: codexHome };
  const started = Date.now();
  let res;
  try {
    res = await run('codex', args, { cwd: ws, env, input: `$viet-pro ${c.prompt}${FORMAT_NOTE}` });
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
  const duration_ms = Date.now() - started;
  if (opts.eventsDir) { mkdirSync(opts.eventsDir, { recursive: true }); writeFileSync(join(opts.eventsDir, `${c.id}-${started}.jsonl`), res.stdout); }
  const raw = existsSync(lastFile) ? readFileSync(lastFile, 'utf8') : '';
  if (!raw.trim()) return { error: `codex không ghi last message (exit ${res.code}): ${(res.stderr || '').slice(0, 300)}`, duration_ms };
  // --json streams events to stdout. `$viet-pro` already puts SKILL.md in context, so Codex sometimes
  // skips re-reading it and opens references/ directly; skill_used counts either as the skill being used.
  const skill_read = /viet-pro\/SKILL\.md/u.test(res.stdout);
  const skill_used = skill_read || /viet-pro\/references\//u.test(res.stdout);
  return { raw, cost_usd: null, num_turns: null, model: opts.model || 'codex-default', duration_ms, is_error: false, skill_read, skill_used };
}

async function generate(c, opts) {
  const { ws, home } = makeWorkspace();
  if (c.source_file) copyFileSync(join(ROOT, c.source_file), join(ws, 'input.md'));
  if (opts.runner === 'codex') return generateCodex(c, opts, ws, home);
  const prompt = `Dùng skill viet-pro. ${c.prompt}${FORMAT_NOTE}`;
  const started = Date.now();
  const res = await run('claude', claudeArgs(prompt, opts.model, 'Read,Glob,Grep,Bash(node:*)'), { cwd: ws });
  const duration_ms = Date.now() - started;
  let parsed = null;
  try { parsed = JSON.parse(res.stdout); } catch { /* reported below */ }
  if (!parsed) return { error: `claude không trả JSON (exit ${res.code}): ${(res.stderr || res.stdout).slice(0, 400)}`, duration_ms };
  const model = parsed.modelUsage ? Object.keys(parsed.modelUsage).join(',') : (opts.model || 'default');
  return { raw: parsed.result || '', cost_usd: parsed.total_cost_usd ?? null, num_turns: parsed.num_turns ?? null, model, duration_ms, is_error: !!parsed.is_error };
}

function extract(raw) {
  const s = raw.indexOf(START);
  const e = raw.indexOf(END, s + START.length);
  if (s === -1 || e === -1) return null;
  return raw.slice(s + START.length, e).trim() + '\n';
}

const wordCount = (text) => text.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const countOf = (text, needle) => text.split(needle).length - 1;

// Share of syllable tokens changed (Levenshtein distance / longer length). 0 = identical.
function editRatio(a, b) {
  const ta = a.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const tb = b.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  let prev = Array.from({ length: tb.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ta.length; i++) {
    const cur = [i];
    for (let j = 1; j <= tb.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ta[i - 1] === tb[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[tb.length] / Math.max(ta.length, tb.length, 1);
}

// Deterministic checks. Each returns { ok, detail }.
function grade(c, raw) {
  const checks = {};
  // Audit-style deliverables put findings outside the markers, so grade the whole reply.
  const output = c.grade_full_response ? raw.replace(START, '').replace(END, '').trim() + '\n' : extract(raw);
  checks.extracted = { ok: output !== null, detail: output === null ? `thiếu cặp ${START}/${END}` : '' };
  if (output === null) return { pass: false, checks, words: 0, output: null };

  const dir = mkdtempSync(join(tmpdir(), 'viet-pro-eval-grade-'));
  const outFile = join(dir, 'output.md');
  writeFileSync(outFile, output);

  const lint = spawnSync('node', [LINT, outFile], { encoding: 'utf8' });
  const lintLines = (lint.stdout || '').split('\n');
  const errors = lintLines.filter((l) => l.startsWith('ERROR'));
  const warns = lintLines.filter((l) => l.startsWith('WARN')).length;
  checks.lint_errors = { ok: errors.length === 0, detail: errors.slice(0, 5).join(' | '), warns };

  const missing = (c.keep || []).filter((k) => !output.includes(k));
  const tooFew = Object.entries(c.keep_min_count || {}).filter(([k, n]) => countOf(output, k) < n).map(([k, n]) => `${k} < ${n} lần`);
  checks.keep = { ok: missing.length === 0 && tooFew.length === 0, detail: [...missing.map((m) => `thiếu "${m}"`), ...tooFew].join(', ') };

  if (c.compare_source) {
    const keepArgs = (c.keep || []).flatMap((k) => ['--keep', k]);
    const cmp = spawnSync('node', [COMPARE, join(ROOT, c.source_file), outFile, ...keepArgs], { encoding: 'utf8' });
    checks.preserved = { ok: cmp.status === 0, detail: (cmp.stderr || '').trim().split('\n').slice(0, 6).join(' | ') };
  }

  if (c.polarity) {
    const bad = c.polarity.filter(([word, num]) => {
      const idx = output.indexOf(num);
      if (idx === -1) return true;
      const before = output.slice(Math.max(0, idx - 60), idx).toLowerCase();
      return !before.includes(word);
    });
    checks.polarity = { ok: bad.length === 0, detail: bad.map(([w, n]) => `"${w}" không đứng trước ${n}`).join(', ') };
  }

  if (c.source_file && !c.grade_full_response) {
    const ratio = editRatio(readFileSync(join(ROOT, c.source_file), 'utf8'), output);
    checks.edit_ratio = { ok: c.max_edit_ratio == null || ratio <= c.max_edit_ratio, detail: `${(ratio * 100).toFixed(1)}% token bị sửa${c.max_edit_ratio != null ? ` (cho phép ${(c.max_edit_ratio * 100).toFixed(0)}%)` : ''}` };
  }

  if (c.platform) {
    const res = checkDraft(loadProfile(PUBLISHING, c.platform), splitDraft(output), { surface: c.surface });
    const errs = res.findings.filter((f) => f.level === 'ERROR');
    checks.platform = { ok: errs.length === 0, detail: errs.map((f) => `${f.field}: ${f.detail}`).join(' | ') };
  }

  if (c.chapters) {
    // YouTube chapters: first stamp 00:00, at least three stamps, in increasing order. A stamp may sit
    // after a list marker, a number, a quote marker, a table cell or markdown emphasis or link:
    // "1. **00:00** Mở đầu", "| 00:00 | Mở đầu |", "[00:00](https://...) Mở đầu", "00:00: Mở đầu".
    const stamps = [...output.matchAll(/^\s*(?:\|\s*)?(?:\d+[.)]\s*|[-*•>]\s*)?[[*`]*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]\([^)\s]*\))?[\]*`]*:?\s*(?:\|\s*)?\s\S/gmu)].map((m) => Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]));
    const ok = stamps.length >= 3 && stamps[0] === 0 && stamps.every((t, i) => i === 0 || t - stamps[i - 1] >= 10);
    checks.chapters = { ok, detail: ok ? '' : `mốc chapter: ${stamps.length ? stamps.join(', ') : 'không có'} giây` };
  }

  // Required phrases ignore case; forbidden phrases stay case-sensitive (e.g. a ban on ALL CAPS).
  const included = (c.must_include || []).filter((s) => !output.toLowerCase().includes(s.toLowerCase()));
  const forbidden = (c.must_not_include || []).filter((s) => output.includes(s));
  checks.phrases = { ok: included.length === 0 && forbidden.length === 0, detail: [...included.map((s) => `thiếu "${s}"`), ...forbidden.map((s) => `có "${s}"`)].join(', ') };

  // Scripts limit spoken words only: drop [visual notes] and **timing headers** before counting.
  const words = wordCount(c.count_spoken_only ? output.replace(/\[[^\]]*\]/gu, ' ').replace(/\*\*[^*]*\*\*/gu, ' ') : output);
  checks.length = { ok: words >= (c.min_words ?? 0) && words <= (c.max_words ?? Infinity), detail: `${words} chữ (cho phép ${c.min_words}-${c.max_words})` };

  const pass = Object.values(checks).every((x) => x.ok);
  return { pass, checks, words, output };
}

const JUDGE_KEYS = ['brief_fit', 'natural_vietnamese', 'factual_integrity', 'channel_fit'];

async function judge(c, output, opts) {
  const source = c.source_file ? readFileSync(join(ROOT, c.source_file), 'utf8') : '';
  const prompt = [
    'Bạn là biên tập viên tiếng Việt chấm bài theo thang 1-5. Chỉ trả về một đối tượng JSON, không thêm chữ nào khác:',
    `{"brief_fit":n,"natural_vietnamese":n,"factual_integrity":n,"channel_fit":n,"invented_facts":["..."],"notes":"một câu"}`,
    'factual_integrity = 5 khi bài không thêm số liệu, tên, trích dẫn, nguồn hay trải nghiệm mà brief/nguồn không có, và không khẳng định claim chưa xác minh. Liệt kê mọi dữ kiện bịa vào invented_facts.',
    c.judge_focus ? `Lưu ý riêng: ${c.judge_focus}` : '',
    `BRIEF:\n${c.prompt}`,
    source ? `NGUỒN (input.md):\n${source}` : '',
    `BÀI CẦN CHẤM:\n${output}`,
  ].filter(Boolean).join('\n\n');
  const dir = mkdtempSync(join(tmpdir(), 'viet-pro-eval-judge-'));
  const res = await run('claude', claudeArgs(prompt, opts.model, 'Read'), { cwd: dir });
  try {
    const text = JSON.parse(res.stdout).result || '';
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const scores = Object.fromEntries(JUDGE_KEYS.map((k) => [k, Number(json[k])]));
    return { ...scores, invented_facts: json.invented_facts || [], notes: json.notes || '' };
  } catch {
    return { error: `judge không trả JSON hợp lệ (exit ${res.code})` };
  }
}

async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));
  return results;
}

function summarize(results) {
  const pass = results.filter((r) => r.pass).length;
  const judged = results.filter((r) => r.judge && !r.judge.error);
  const judge_avg = judged.length
    ? Object.fromEntries(JUDGE_KEYS.map((k) => [k, Number((judged.reduce((s, r) => s + r.judge[k], 0) / judged.length).toFixed(2))]))
    : null;
  const cost = results.reduce((s, r) => s + (r.cost_usd || 0), 0);
  return { pass, total: results.length, judge_avg, cost_usd: Number(cost.toFixed(4)) };
}

function compareWith(current, baselinePath, maxBytesGrowth = 0.02) {
  const base = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const byId = Object.fromEntries(base.cases.map((r) => [r.id, r]));
  const regressions = current.cases.filter((r) => byId[r.id]?.pass && !r.pass).map((r) => r.id);
  const fixed = current.cases.filter((r) => byId[r.id] && !byId[r.id].pass && r.pass).map((r) => r.id);
  const bytesDelta = base.meta.skill_bytes ? (current.meta.skill_bytes - base.meta.skill_bytes) / base.meta.skill_bytes : 0;
  console.log(`\nSo với ${baselinePath}: pass ${base.summary.pass}/${base.summary.total} -> ${current.summary.pass}/${current.summary.total}`);
  console.log(`  Tụt từ pass xuống fail: ${regressions.length ? regressions.join(', ') : 'không có'}`);
  console.log(`  Từ fail lên pass: ${fixed.length ? fixed.join(', ') : 'không có'}`);
  console.log(`  Dung lượng skill: ${base.meta.skill_bytes} -> ${current.meta.skill_bytes} byte (${(bytesDelta * 100).toFixed(2)}%)`);
  if (bytesDelta > maxBytesGrowth) console.log(`  Skill phình quá ngưỡng ${(maxBytesGrowth * 100).toFixed(1)}% (đặt bằng --max-bytes-growth)`);
  if (base.summary.judge_avg && current.summary.judge_avg) {
    for (const k of JUDGE_KEYS) console.log(`  judge ${k}: ${base.summary.judge_avg[k]} -> ${current.summary.judge_avg[k]}`);
  }
  return regressions.length === 0 && bytesDelta <= maxBytesGrowth;
}

function report(results) {
  for (const r of results) {
    const failed = Object.entries(r.checks || {}).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.detail}`);
    const j = r.judge && !r.judge.error ? ` judge=${JUDGE_KEYS.map((k) => r.judge[k]).join('/')}` : '';
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}${j}${r.error ? ` — ${r.error}` : ''}${failed.length ? ` — ${failed.join('; ')}` : ''}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const allCases = JSON.parse(readFileSync(join(ROOT, 'tests/eval/cases.json'), 'utf8'));
  let results;
  let meta;

  if (opts.regrade) {
    const prev = JSON.parse(readFileSync(opts.regrade, 'utf8'));
    const caseById = Object.fromEntries(allCases.map((c) => [c.id, c]));
    results = prev.cases.map((r) => {
      if (!caseById[r.id] || r.raw === undefined) return r;
      const g = grade(caseById[r.id], r.raw);
      return { ...r, pass: g.pass, checks: g.checks, words: g.words, output: g.output };
    });
    meta = { ...prev.meta, regraded_at: new Date().toISOString(), graders_skill_version: skillVersion() };
  } else {
    const cases = opts.cases ? allCases.filter((c) => opts.cases.includes(c.id)) : allCases;
    if (!cases.length) throw new Error('Không có ca nào khớp --cases');
    results = await pool(cases, opts.concurrency, async (c) => {
      const gen = await generate(c, opts);
      if (gen.error) { console.error(`ERROR ${c.id}: ${gen.error}`); return { id: c.id, pass: false, error: gen.error, duration_ms: gen.duration_ms }; }
      const g = grade(c, gen.raw);
      const row = { id: c.id, pass: g.pass, checks: g.checks, words: g.words, model: gen.model, skill_read: gen.skill_read, skill_used: gen.skill_used, cost_usd: gen.cost_usd, num_turns: gen.num_turns, duration_ms: gen.duration_ms, output: g.output, raw: gen.raw };
      if (opts.judge && g.output) row.judge = await judge(c, g.output, opts);
      console.error(`${g.pass ? 'pass' : 'fail'} ${c.id} (${Math.round(gen.duration_ms / 1000)}s)`);
      return row;
    });
    meta = { date: new Date().toISOString(), runner: opts.runner, model: opts.model || 'default', skill_version: skillVersion(), skill_bytes: skillBytes(), judge: opts.judge };
  }
  meta.skill_bytes_now = skillBytes();

  const out = { meta, summary: summarize(results), cases: results };
  report(results);
  console.log(`\nTỔNG: ${out.summary.pass}/${out.summary.total} ca đạt mọi kiểm tra tất định; chi phí ${out.summary.cost_usd} USD`);
  if (out.summary.judge_avg) console.log(`Điểm judge trung bình: ${JSON.stringify(out.summary.judge_avg)}`);

  const outPath = opts.out || join(ROOT, 'tests/eval/results', `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-${meta.skill_version}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Đã ghi kết quả: ${outPath}`);

  if (opts.compare && !compareWith(out, opts.compare, opts.maxBytesGrowth)) process.exit(1);
}

main().catch((err) => { console.error(err.message); process.exit(2); });
