#!/usr/bin/env node
const startedAt = performance.now();

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const BIN_FILE = realpathSync(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(dirname(BIN_FILE), '..');
const HOOKS_DIR = join(SKILL_DIR, 'scripts', 'hooks');
const HOOK_CMD_MARKER = '/viet-pro/scripts/hooks/';

function readSkillVersion() {
  try {
    const raw = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');
    const match = raw.match(/^ {2}version:\s*"([^"]+)"$/mu);
    return match ? match[1] : '5.8.0';
  } catch {
    return '5.8.0';
  }
}

function printHelp() {
  console.log(`viet-pro ${readSkillVersion()} — Cổng kiểm duyệt tiếng Việt & đa kênh

Cách dùng:
  viet-pro gate <file.md> [options]        Chạy đủ cổng (compare -> lint -> platform -> ticket -> Decisions -> stamp)
  viet-pro lint <file.md>... [options]     Kiểm tra lỗi tiếng Việt tất định (hỗ trợ .pptx, --no-house-style, --chat)
  viet-pro scan <file.md|deck.pptx> [opts] Chấm điểm dấu hiệu AI 0-100, kiểm tra slide .pptx (--max <N>, --titles)
  viet-pro compare <before> <after> [...]  Kiểm tra bảo toàn số liệu, quote, URL, thẻ TTS, mã inline (.md/.pptx)
  viet-pro check-platform <id> <file.md>   Kiểm tra giới hạn kênh phát hành (--validate / --self-test)
  viet-pro check-x-length <thread.md>      Kiểm tra độ dài có trọng số cho X/Twitter
  viet-pro init [dir] [options]            Tạo file cấu hình .viet-pro.json theo mẫu chuẩn
  viet-pro verify-stamp <file.md> [opts]   Xác minh tem gate hiện có khớp SHA-256 bản thảo
  viet-pro doctor [--json]                 Kiểm tra nhanh môi trường, file lõi, hook và key
  viet-pro mcp [--self-test]               Khởi chạy MCP server trên stdio
  viet-pro install-hooks [options]         Cài hook an toàn vào Antigravity, Claude Code và Codex`);
}

function findNearestConfigLight(startDir) {
  const home = resolve(homedir());
  let dir = resolve(startDir);
  while (true) {
    const candidate = join(dir, '.viet-pro.json');
    if (existsSync(candidate)) return candidate;
    if (existsSync(join(dir, '.git')) || dir === home) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function readEnvFileKey(envPath) {
  if (!existsSync(envPath)) return false;
  try {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/u);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^(?:export\s+)?GEMINI_API_KEY\s*=\s*(.+)$/u);
      if (m && m[1].replace(/^['"]|['"]$/gu, '').trim().length > 0) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function detectGeminiKeyLight(cwd) {
  if (typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim()) {
    return { configured: true, source: 'env:GEMINI_API_KEY' };
  }
  if (process.env.VIET_PRO_NO_ENV_FILE === '1') {
    return { configured: false, source: 'none (env file skipped)' };
  }
  const candidates = [
    [join(cwd, '.env'), 'file:.env'],
    [join(homedir(), '.gemini', '.env'), 'file:~/.gemini/.env'],
    [join(homedir(), '.env'), 'file:~/.env'],
  ];
  for (const [p, label] of candidates) {
    if (readEnvFileKey(p)) return { configured: true, source: label };
  }
  return { configured: false, source: 'none' };
}

function detectHooksLight(hooksHome) {
  const targets = {
    agy: join(hooksHome, '.gemini', 'config', 'hooks.json'),
    claude: join(hooksHome, '.claude', 'settings.json'),
    codex: join(hooksHome, '.codex', 'hooks.json'),
  };
  const status = {};
  for (const [host, filePath] of Object.entries(targets)) {
    let installed = false;
    if (existsSync(filePath)) {
      try {
        installed = readFileSync(filePath, 'utf8').includes(HOOK_CMD_MARKER);
      } catch {
        installed = false;
      }
    }
    status[host] = { path: filePath, installed };
  }
  return status;
}

function runDoctor(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: { json: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false } },
      allowPositionals: false,
    }));
  } catch (err) {
    console.error(`Lỗi tham số doctor: ${err.message}`);
    return 2;
  }
  if (values.help) {
    console.log('Usage: viet-pro doctor [--json]');
    return 0;
  }

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const corePaths = [
    'SKILL.md',
    'scripts/lib/lint.mjs',
    'scripts/lib/compare.mjs',
    'scripts/lib/profile.mjs',
    'scripts/lib/seo.mjs',
    'scripts/lib/config.mjs',
    'scripts/lib/stamp.mjs',
    'scripts/lib/decisions.mjs',
    'scripts/lib/gate.mjs',
    'scripts/lib/pptx.mjs',
    'scripts/lib/score.mjs',
    'scripts/hooks/editorial-hook.mjs',
    'scripts/hooks/agy-hook.mjs',
    'scripts/hooks/claude-hook.mjs',
    'scripts/hooks/codex-hook.mjs',
    'references/publishing',
  ];
  const missing = corePaths.filter((rel) => !existsSync(join(SKILL_DIR, rel)));
  const hooksHome = process.env.VIET_PRO_HOOKS_HOME ? resolve(process.env.VIET_PRO_HOOKS_HOME) : homedir();
  const cwd = process.cwd();
  const configPath = findNearestConfigLight(cwd);
  const geminiKey = detectGeminiKeyLight(cwd);
  const hooks = detectHooksLight(hooksHome);
  const ok = nodeMajor >= 20 && missing.length === 0;
  const elapsed_ms = Number((performance.now() - startedAt).toFixed(2));
  const payload = {
    ok,
    version: readSkillVersion(),
    node: process.versions.node,
    skill_dir: SKILL_DIR,
    config_path: configPath,
    gemini_key: geminiKey,
    hooks,
    missing_core: missing,
    elapsed_ms,
  };

  if (values.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`viet-pro ${payload.version} — ${ok ? 'OK' : 'ERROR'} (${elapsed_ms}ms)`);
    console.log(`  node: ${payload.node} | config: ${configPath || '(mặc định)'} | gemini_key: ${geminiKey.configured ? geminiKey.source : 'chưa cấu hình'}`);
    console.log(`  hooks: agy=${hooks.agy.installed} claude=${hooks.claude.installed} codex=${hooks.codex.installed}`);
    if (missing.length) console.error(`  thiếu file lõi: ${missing.join(', ')}`);
  }
  return ok ? 0 : 1;
}

async function runGateCli(argv) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      options: {
        before: { type: 'string' },
        keep: { type: 'string', multiple: true, default: [] },
        platform: { type: 'string' },
        surface: { type: 'string' },
        keyword: { type: 'string' },
        slug: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        stdin: { type: 'boolean', default: false },
        channels: { type: 'string' },
        'review-ticket': { type: 'string' },
        'force-ticket': { type: 'boolean', default: false },
        'strict-first-hand': { type: 'boolean', default: false },
        'strict-quotes': { type: 'boolean', default: false },
        'max-edit-ratio': { type: 'string' },
        round: { type: 'string' },
        'no-decisions': { type: 'boolean', default: false },
        'no-tts-tags': { type: 'boolean', default: false },
        'no-house-style': { type: 'boolean', default: false },
        'max-ai-score': { type: 'string' },
        config: { type: 'string' },
        'stamp-dir': { type: 'string' },
        'no-git-root': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    console.error(`Lỗi tham số gate: ${err.message}`);
    return 2;
  }
  if (values.help) {
    console.log('Usage: viet-pro gate (<file.md|deck.pptx> | --stdin | -) [--before <before.md|.pptx>] [--keep "Tên riêng"]... [--platform <id>] [--surface <id>] [--keyword <từ-khóa>] [--slug <slug>] [--title <meta-title>] [--description <meta-desc>] [--channels <n>] [--review-ticket <path>] [--force-ticket] [--strict-first-hand] [--strict-quotes] [--max-edit-ratio <0..1>] [--max-ai-score <0..100>] [--no-house-style] [--round <0|1|2>] [--no-decisions] [--no-tts-tags] [--config <path>] [--stamp-dir <path>] [--json]');
    return 0;
  }
  if ((values.stdin && positionals.length > 0 && positionals[0] !== '-') || (!values.stdin && positionals.length !== 1)) {
    console.error('Usage: viet-pro gate (<file.md> | --stdin | -) [options]');
    return 2;
  }

  const targetArg = values.stdin ? '-' : positionals[0];
  let input;
  if (targetArg === '-') {
    input = { text: readFileSync(0, 'utf8') };
  } else {
    const resolvedFile = resolve(targetArg);
    if (!existsSync(resolvedFile)) {
      console.error(`Không tìm thấy file bản thảo: ${resolvedFile}`);
      return 2;
    }
    input = { filePath: resolvedFile };
  }

  let beforeText;
  if (values.before) {
    const beforePath = resolve(values.before);
    if (!existsSync(beforePath)) {
      console.error(`Không tìm thấy file --before: ${beforePath}`);
      return 2;
    }
    if (beforePath.toLowerCase().endsWith('.pptx')) {
      const { pptxToText, readPptx } = await import('../scripts/lib/pptx.mjs');
      beforeText = pptxToText(readPptx(beforePath)).text;
    } else {
      beforeText = readFileSync(beforePath, 'utf8');
    }
  }

  let maxAiScore;
  if (values['max-ai-score'] !== undefined) {
    maxAiScore = Number(values['max-ai-score']);
    if (!Number.isFinite(maxAiScore) || maxAiScore < 0 || maxAiScore > 100) {
      console.error('--max-ai-score cần một số trong khoảng 0..100');
      return 2;
    }
  }

  let maxEditRatio;
  if (values['max-edit-ratio'] !== undefined) {
    maxEditRatio = Number(values['max-edit-ratio']);
    if (!(maxEditRatio >= 0 && maxEditRatio <= 1)) {
      console.error('--max-edit-ratio cần một số trong khoảng 0..1');
      return 2;
    }
  }

  let channels;
  if (values.channels !== undefined) {
    channels = Number(values.channels);
    if (!Number.isFinite(channels) || channels < 1) {
      console.error('--channels cần một số nguyên >= 1');
      return 2;
    }
  }

  let round;
  if (values.round !== undefined) {
    round = Number(values.round);
    if (!Number.isInteger(round) || round < 0) {
      console.error('--round cần một số nguyên >= 0');
      return 2;
    }
  }

  const { runGate, formatGateReport } = await import('../scripts/lib/gate.mjs');
  const res = await runGate(input, {
    beforeText,
    keep: values.keep,
    platform: values.platform,
    surface: values.surface,
    keyword: values.keyword,
    slug: values.slug,
    seoTitle: values.title,
    seoDescription: values.description,
    channels,
    reviewTicket: values['review-ticket'] ? resolve(values['review-ticket']) : undefined,
    forceTicket: values['force-ticket'],
    strictFirstHand: values['strict-first-hand'],
    strictQuotes: values['strict-quotes'],
    maxEditRatio,
    round,
    noDecisions: values['no-decisions'],
    ttsTags: values['no-tts-tags'] ? false : undefined,
    houseStyle: values['no-house-style'] ? false : undefined,
    maxAiScore,
    configPath: values.config ? resolve(values.config) : undefined,
    stampDir: values['stamp-dir'] ? resolve(values['stamp-dir']) : undefined,
    noGitRoot: values['no-git-root'],
  });

  if (values.json) console.log(JSON.stringify(res, null, 2));
  else console.log(formatGateReport(res));
  return res.exitCode;
}

async function runInitCli(argv) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      options: {
        dialect: { type: 'string' },
        register: { type: 'string' },
        self: { type: 'string' },
        reader: { type: 'string' },
        platform: { type: 'string' },
        force: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    console.error(`Lỗi tham số init: ${err.message}`);
    return 2;
  }
  if (values.help) {
    console.log('Usage: viet-pro init [dir] [--dialect northern|southern] [--register ... ] [--self ...] [--reader ...] [--platform <id>] [--force] [--json]');
    return 0;
  }
  if (positionals.length > 1) {
    console.error('Usage: viet-pro init [dir] [options]');
    return 2;
  }

  const targetDir = resolve(positionals[0] || '.');
  const cfgPath = join(targetDir, '.viet-pro.json');
  if (existsSync(cfgPath) && !values.force) {
    console.error(`Đã tồn tại ${cfgPath} (dùng --force để ghi đè)`);
    return 1;
  }

  const { defaultConfigTemplate, validateConfig } = await import('../scripts/lib/config.mjs');
  const overrides = {};
  if (values.dialect) overrides.dialect = values.dialect;
  if (values.register) overrides.register = values.register;
  if (values.platform !== undefined) overrides.default_platform = values.platform;
  if (values.self || values.reader) {
    overrides.pronouns = {};
    if (values.self) overrides.pronouns.self = values.self;
    if (values.reader) overrides.pronouns.reader = values.reader;
  }
  const cfg = defaultConfigTemplate(overrides);
  const errs = validateConfig(cfg);
  if (errs.length) {
    console.error(`Cấu hình không hợp lệ: ${errs.join('; ')}`);
    return 2;
  }

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
  if (values.json) console.log(JSON.stringify({ ok: true, path: cfgPath, config: cfg }, null, 2));
  else console.log(`PASS — đã tạo ${cfgPath}`);
  return 0;
}

async function runVerifyStampCli(argv) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      options: {
        'stamp-dir': { type: 'string' },
        cwd: { type: 'string' },
        'max-age-ms': { type: 'string' },
        'no-git-root': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    console.error(`Lỗi tham số verify-stamp: ${err.message}`);
    return 2;
  }
  if (values.help) {
    console.log('Usage: viet-pro verify-stamp <file.md> [--stamp-dir <path>] [--cwd <dir>] [--max-age-ms <ms>] [--json]');
    return 0;
  }
  if (positionals.length !== 1) {
    console.error('Usage: viet-pro verify-stamp <file.md> [options]');
    return 2;
  }

  const targetPath = resolve(positionals[0]);
  if (!existsSync(targetPath)) {
    console.error(`Không tìm thấy file: ${targetPath}`);
    return 2;
  }

  let maxAgeMs;
  if (values['max-age-ms'] !== undefined) {
    maxAgeMs = Number(values['max-age-ms']);
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
      console.error('--max-age-ms cần số dương');
      return 2;
    }
  }

  const { readValidStamp } = await import('../scripts/lib/stamp.mjs');
  const res = readValidStamp(targetPath, {
    stampDir: values['stamp-dir'] ? resolve(values['stamp-dir']) : undefined,
    cwd: values.cwd ? resolve(values.cwd) : undefined,
    maxAgeMs,
    noGitRoot: values['no-git-root'],
  });
  if (values.json) {
    console.log(JSON.stringify(res, null, 2));
  } else if (res.valid) {
    console.log(`PASS — tem hợp lệ (${res.stamp?.status}, sha256=${(res.sha256 || 'none').slice(0, 12)}, path=${res.stampPath})`);
  } else {
    console.error(`FAIL — tem không hợp lệ (${res.reason}, sha256=${(res.sha256 || 'none').slice(0, 12)})`);
  }
  return res.valid ? 0 : 1;
}

function isVietProCommand(leaf) {
  return Boolean(leaf && typeof leaf.command === 'string' && leaf.command.includes(HOOK_CMD_MARKER));
}

function stripVietProGroups(arr) {
  if (!Array.isArray(arr)) return [];
  const next = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      next.push(item);
      continue;
    }
    if (isVietProCommand(item)) continue;
    if (Array.isArray(item.hooks)) {
      const hadVietPro = item.hooks.some(isVietProCommand);
      const filteredHooks = item.hooks.filter((h) => !isVietProCommand(h));
      if (hadVietPro && filteredHooks.length === 0) continue;
      next.push({ ...item, hooks: filteredHooks });
    } else {
      next.push(item);
    }
  }
  return next;
}

function resolveStableNodePath() {
  let execReal = process.execPath;
  try {
    execReal = realpathSync(process.execPath);
  } catch {
    return process.execPath;
  }

  const candidates = [];
  const cellarMatch = process.execPath.match(/^(.*)\/Cellar\/([^/]+)\/[^/]+\/bin\/node$/u);
  if (cellarMatch) {
    const [, prefix, formula] = cellarMatch;
    candidates.push(`${prefix}/bin/node`, `${prefix}/opt/${formula}/bin/node`);
  }
  candidates.push('/opt/homebrew/bin/node', '/usr/local/bin/node');
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir || dir.includes('/Cellar/') || dir.includes('/nvm/versions/')) continue;
    candidates.push(join(dir, 'node'));
  }

  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      if (existsSync(candidate) && realpathSync(candidate) === execReal) {
        return candidate;
      }
    } catch {
      // Ignore unreadable or dangling candidate symlink.
    }
  }
  return process.execPath;
}

function buildHookCommand(host) {
  return `"${resolveStableNodePath()}" "${join(HOOKS_DIR, `${host}-hook.mjs`)}"`;
}

function applyAgyHooks(existingObj) {
  const cmd = buildHookCommand('agy');
  const base = existingObj && typeof existingObj === 'object' && !Array.isArray(existingObj) ? { ...existingObj } : {};
  base['viet-pro-gate'] = {
    PreToolUse: [
      {
        matcher: 'run_command|mcp_vieneu_.*|call_mcp_tool',
        hooks: [{ type: 'command', command: cmd, timeout: 10 }],
      },
    ],
    PostToolUse: [
      {
        matcher: 'read_file|view_file|write_file|edit_file|write_to_file|replace_file_content|multi_replace_file_content',
        hooks: [{ type: 'command', command: cmd, timeout: 10 }],
      },
    ],
    Stop: [
      { type: 'command', command: cmd, timeout: 10 },
    ],
  };
  return base;
}

function applyClaudeOrCodexHooks(existingObj, host, matchers) {
  const cmd = buildHookCommand(host);
  const base = existingObj && typeof existingObj === 'object' && !Array.isArray(existingObj) ? { ...existingObj } : {};
  const existingHooks = base.hooks && typeof base.hooks === 'object' && !Array.isArray(base.hooks) ? { ...base.hooks } : {};

  for (const [eventName, matcher] of Object.entries(matchers)) {
    const cleaned = stripVietProGroups(existingHooks[eventName]);
    cleaned.push({
      matcher,
      hooks: [{ type: 'command', command: cmd, timeout: 10 }],
    });
    existingHooks[eventName] = cleaned;
  }

  base.hooks = existingHooks;
  return base;
}

function runInstallHooksCli(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        host: { type: 'string', default: 'all' },
        'dry-run': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
    }));
  } catch (err) {
    console.error(`Lỗi tham số install-hooks: ${err.message}`);
    return 2;
  }
  if (values.help) {
    console.log('Usage: viet-pro install-hooks [--host all|agy|claude|codex] [--dry-run] [--json]');
    return 0;
  }

  const validHosts = new Set(['all', 'agy', 'claude', 'codex']);
  if (!validHosts.has(values.host)) {
    console.error(`--host không hợp lệ (${values.host}); chọn all, agy, claude hoặc codex`);
    return 2;
  }

  const hooksHome = process.env.VIET_PRO_HOOKS_HOME ? resolve(process.env.VIET_PRO_HOOKS_HOME) : homedir();
  const dryRun = values['dry-run'];
  const selected = values.host === 'all' ? ['agy', 'claude', 'codex'] : [values.host];
  const backupStamp = new Date().toISOString().replace(/[:.]/gu, '-');
  const backupRoot = join(hooksHome, '.viet-pro-backups', `hooks-${backupStamp}`);

  const specs = {
    agy: {
      rel: join('.gemini', 'config', 'hooks.json'),
      transform: (obj) => applyAgyHooks(obj),
    },
    claude: {
      rel: join('.claude', 'settings.json'),
      transform: (obj) => applyClaudeOrCodexHooks(obj, 'claude', {
        PreToolUse: 'Bash|Write|Edit|mcp__vieneu__.*',
        PostToolUse: 'Read|Write|Edit|MultiEdit',
        Stop: '*',
      }),
    },
    codex: {
      rel: join('.codex', 'hooks.json'),
      transform: (obj) => applyClaudeOrCodexHooks(obj, 'codex', {
        PreToolUse: 'Bash|Write|Edit',
        PostToolUse: 'Read|Write|Edit',
        Stop: '*',
      }),
    },
  };

  const results = [];
  for (const host of selected) {
    const { rel, transform } = specs[host];
    const targetPath = join(hooksHome, rel);
    const existed = existsSync(targetPath);
    const rawBefore = existed ? readFileSync(targetPath, 'utf8') : null;
    let parsedBefore = {};
    if (existed && rawBefore.trim()) {
      try {
        parsedBefore = JSON.parse(rawBefore);
      } catch (err) {
        console.error(`JSON không hợp lệ tại ${targetPath}: ${err.message}`);
        return 1;
      }
    }
    const nextObj = transform(parsedBefore);
    const rawAfter = `${JSON.stringify(nextObj, null, 2)}\n`;
    const changed = rawBefore !== rawAfter;
    let backupPath = null;

    if (changed && !dryRun) {
      if (existed) {
        backupPath = join(backupRoot, rel);
        mkdirSync(dirname(backupPath), { recursive: true });
        writeFileSync(backupPath, rawBefore, 'utf8');
      }
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, rawAfter, 'utf8');
    }

    const action = !changed ? 'unchanged' : (existed ? 'updated' : 'created');
    results.push({ host, path: targetPath, action, changed, backup_path: backupPath, dry_run: dryRun });
  }

  if (values.json) {
    console.log(JSON.stringify({ ok: true, hooks_home: hooksHome, dry_run: dryRun, results }, null, 2));
  } else {
    for (const r of results) {
      const backupNote = r.backup_path ? ` (backup: ${r.backup_path})` : '';
      const prefix = r.dry_run ? '[dry-run] ' : '';
      console.log(`${prefix}${r.host}: ${r.action} -> ${r.path}${backupNote}`);
    }
  }
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) {
    printHelp();
    return 2;
  }
  const [cmd, ...rest] = argv;
  if (cmd === '--version' || cmd === '-v') {
    console.log(readSkillVersion());
    return 0;
  }
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printHelp();
    return 0;
  }
  switch (cmd) {
    case 'doctor':
      return runDoctor(rest);
    case 'gate':
      return runGateCli(rest);
    case 'lint': {
      const { runLintCli } = await import('../scripts/cli/lint-cli.mjs');
      return runLintCli(rest);
    }
    case 'scan': {
      const { runScanCli } = await import('../scripts/cli/scan-cli.mjs');
      return runScanCli(rest);
    }
    case 'compare': {
      const { runCompareCli } = await import('../scripts/cli/compare-cli.mjs');
      return runCompareCli(rest);
    }
    case 'check-platform': {
      const { runPlatformCli } = await import('../scripts/cli/platform-cli.mjs');
      return runPlatformCli(rest);
    }
    case 'check-x-length': {
      const { runXLengthCli } = await import('../scripts/cli/x-length-cli.mjs');
      return runXLengthCli(rest);
    }
    case 'init':
      return runInitCli(rest);
    case 'verify-stamp':
      return runVerifyStampCli(rest);
    case 'mcp': {
      const { runMcpCli } = await import('../scripts/mcp-server.mjs');
      return runMcpCli(rest);
    }
    case 'install-hooks':
      return runInstallHooksCli(rest);
    default:
      console.error(`Lệnh không hợp lệ: ${cmd}`);
      printHelp();
      return 2;
  }
}

const code = await main();
if (code) process.exitCode = code;
