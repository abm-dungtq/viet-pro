// Shared cross-runtime lifecycle hook evaluator for viet-pro editorial gate.
// Host adapters (agy-hook, claude-hook, codex-hook) normalize payloads into this core.
// Importing this file has no side effects.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readValidStamp,
  resolveCacheBaseDir,
  resolveStampRoot,
  sha256Of,
  writeStamp,
} from '../lib/stamp.mjs';

export const WRITING_SKILLS_RE =
  /(?:viet-pro|ak-write|ak-copywriting|ak-seo|ak-email|ak-content-marketing|edit-video)\/SKILL\.md$/iu;

export const PUBLISH_CMD_RE =
  /\b(?:tqd-publish|tqd_publish|vieneu|elevenlabs|eleven\.mjs|gws\s+(?:docs|slides|gmail)\b|publish-to-[a-z0-9_-]*)/iu;

const NON_DELIVERABLE_EXT_RE =
  /\.(?:js|mjs|cjs|mts|cts|ts|tsx|jsx|py|go|rs|json|jsonl|yaml|yml|toml|sh|zsh|css|html|sql|lock)$/iu;

const NON_DELIVERABLE_NAME_RE =
  /(?:^|\/)(?:(?:README|CHANGELOG|CONTRIBUTING|LICENSE|INSTALL|CLAUDE|AGENTS|GEMINI|SKILL|00-brief|02-review-ticket|handoff-log)\.md|(?:SKILL_SHA256SUMS|SHA256SUMS)(?:\.md)?)$/iu;

const NON_DELIVERABLE_SEGMENT_RE =
  /(?:^|\/)(?:plans|docs|tests|references|examples|\.agents|\.claude|\.codex|\.gemini|\.viet-pro|\.git|node_modules)\//iu;

const CONTENT_DIR_RE =
  /(?:^|\/)(?:content|articles|drafts|published|posts|newsletters|scripts\/voice)\//iu;

const DELIVERABLE_EXT_RE = /\.(?:md|txt)$/iu;
const VIET_DIACRITICS_RE =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/iu;
const EDITORIAL_FM_KEYS_RE = /^(?:platform|surface|channel|dialect|voice_source):/imu;

const WRITE_TOOL_NAMES = new Set([
  'write_file',
  'edit_file',
  'write_to_file',
  'replace_file_content',
  'multi_replace_file_content',
  'Write',
  'Edit',
  'MultiEdit',
]);

const READ_TOOL_NAMES = new Set(['read_file', 'view_file', 'Read', 'cat']);

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeSlashes(p) {
  return String(p || '').replace(/\\/gu, '/');
}

function countWords(text) {
  if (typeof text !== 'string' || !text) return 0;
  return (text.match(/[\p{L}\p{N}]+/gu) || []).length;
}

function hasVietnameseChars(text) {
  return typeof text === 'string' && VIET_DIACRITICS_RE.test(text);
}

function hasEditorialFrontmatter(preview) {
  if (typeof preview !== 'string' || !preview) return false;
  const norm = preview.replace(/\r\n/gu, '\n');
  if (!norm.startsWith('---\n')) return false;
  const end = norm.indexOf('\n---', 4);
  const block = end > 0 ? norm.slice(4, end) : norm.slice(4, 1024);
  return EDITORIAL_FM_KEYS_RE.test(block);
}

/** Return true for code, config, tests, plans, docs, tickets, and system markdown files. */
export function isNonDeliverablePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return true;
  const norm = normalizeSlashes(filePath.trim());
  if (NON_DELIVERABLE_EXT_RE.test(norm)) return true;
  if (NON_DELIVERABLE_NAME_RE.test(norm)) return true;
  if (NON_DELIVERABLE_SEGMENT_RE.test(norm)) return true;
  return false;
}

/**
 * Return true if `filePath` is an editorial Vietnamese deliverable (`.md` / `.txt`),
 * never matching technical/plan/system paths.
 */
export function isDeliverableContentFile(filePath, contentPreview = '', opts = {}) {
  if (isNonDeliverablePath(filePath)) return false;
  const norm = normalizeSlashes(filePath.trim());
  if (!DELIVERABLE_EXT_RE.test(norm)) return false;

  if (CONTENT_DIR_RE.test(norm)) return true;
  if (hasEditorialFrontmatter(contentPreview)) return true;
  if (opts?.writingSkillActive === true && countWords(contentPreview) >= 80 && hasVietnameseChars(contentPreview)) {
    return true;
  }
  return false;
}

function splitShellArgs(cmd) {
  if (typeof cmd !== 'string' || !cmd.trim()) return [];
  const tokens = [];
  let cur = '';
  let quote = null;

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < cmd.length) {
        cur += cmd[++i];
      } else if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '\\' && i + 1 < cmd.length) {
      cur += cmd[++i];
      continue;
    }
    if (/\s/u.test(ch) || ch === ';' || ch === '|') {
      if (cur) { tokens.push(cur); cur = ''; }
      continue;
    }
    if ((ch === '&' && cmd[i + 1] === '&') || (ch === '|' && cmd[i + 1] === '|')) {
      if (cur) { tokens.push(cur); cur = ''; }
      i++;
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function collectStringsFromArgs(obj, out = [], depth = 0, seen = new Set()) {
  if (!obj || depth > 3) return out;
  if (typeof obj === 'string') {
    out.push(obj);
    return out;
  }
  if (typeof obj !== 'object' || seen.has(obj)) return out;
  seen.add(obj);
  if (Array.isArray(obj)) {
    for (const item of obj) collectStringsFromArgs(item, out, depth + 1, seen);
  } else {
    for (const val of Object.values(obj)) collectStringsFromArgs(val, out, depth + 1, seen);
  }
  return out;
}

function extractTokenValue(tok) {
  const eq = tok.indexOf('=');
  if (tok.startsWith('--') && eq > 2) return tok.slice(eq + 1);
  return tok;
}

/** Extract `.md` / `.txt` publish target paths from commandLine and tool args. */
export function extractPublishTargets(input = {}) {
  const isStr = typeof input === 'string';
  const commandLine = isStr ? input : String(input.commandLine ?? '');
  const args = !isStr && input.args && typeof input.args === 'object' ? input.args : {};
  const cwd = (!isStr && typeof input.cwd === 'string' && input.cwd) ? input.cwd : process.cwd();

  const candidates = [];
  for (const tok of splitShellArgs(commandLine)) {
    candidates.push(extractTokenValue(tok));
  }
  for (const str of collectStringsFromArgs(args)) {
    const trimmed = str.trim();
    if (!trimmed) continue;
    if (DELIVERABLE_EXT_RE.test(trimmed) && !/\s/u.test(trimmed)) {
      candidates.push(trimmed);
    } else if (trimmed.includes('.md') || trimmed.includes('.txt')) {
      for (const tok of splitShellArgs(trimmed)) {
        candidates.push(extractTokenValue(tok));
      }
    }
  }

  const seen = new Set();
  const targets = [];
  const pushTarget = (raw) => {
    const cleaned = raw.replace(/^['"]|['"]$/gu, '').trim();
    if (!cleaned || !DELIVERABLE_EXT_RE.test(cleaned)) return false;
    const abs = resolve(cwd, cleaned);
    if (/\s/u.test(cleaned) && !existsSync(abs)) return false;
    if (!seen.has(abs)) {
      seen.add(abs);
      targets.push(abs);
    }
    return true;
  };
  for (const raw of candidates) {
    if (!pushTarget(raw) && /\s/u.test(raw)) {
      for (const nested of splitShellArgs(raw)) {
        pushTarget(extractTokenValue(nested));
      }
    }
  }
  return targets;
}

function extractTargetDirs(commandLine, args, cwd) {
  const candidates = [];
  for (const tok of splitShellArgs(commandLine)) {
    const val = extractTokenValue(tok);
    if (val && !val.startsWith('-') && !DELIVERABLE_EXT_RE.test(val)) candidates.push(val);
  }
  for (const str of collectStringsFromArgs(args)) {
    const trimmed = str.trim();
    if (trimmed && !trimmed.includes('\n') && !/\s/u.test(trimmed) && !DELIVERABLE_EXT_RE.test(trimmed)) {
      candidates.push(trimmed);
    }
  }
  const dirs = [];
  const seen = new Set();
  for (const raw of candidates) {
    if (raw === '.' || raw === '..') continue;
    const abs = resolve(cwd, raw);
    if (seen.has(abs)) continue;
    try {
      if (existsSync(abs) && statSync(abs).isDirectory()) {
        seen.add(abs);
        dirs.push(abs);
      }
    } catch {
      // ignore stat errors
    }
  }
  return dirs;
}

function sanitizeSessionId(sessionId) {
  return String(sessionId || 'default').replace(/[^A-Za-z0-9_.-]+/gu, '_').slice(0, 120) || 'default';
}

function sessionFilePath(sessionId, opts = {}) {
  const base = resolveCacheBaseDir(opts);
  return join(base, 'sessions', `${sanitizeSessionId(sessionId)}.json`);
}

function pruneOldSessions(sessionsDir) {
  try {
    const cutoff = Date.now() - SESSION_MAX_AGE_MS;
    for (const entry of readdirSync(sessionsDir)) {
      if (!entry.endsWith('.json')) continue;
      const full = join(sessionsDir, entry);
      try {
        const st = statSync(full);
        if (st.mtimeMs < cutoff) unlinkSync(full);
      } catch {
        // ignore concurrent deletion
      }
    }
  } catch {
    // ignore unreadable dir
  }
}

export function readSessionState(sessionId, opts = {}) {
  const filePath = sessionFilePath(sessionId, opts);
  const empty = {
    sessionId: sanitizeSessionId(sessionId),
    writingSkillActive: false,
    touchedDeliverables: [],
    updatedAt: null,
  };
  if (!existsSync(filePath)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return {
      sessionId: parsed?.sessionId || empty.sessionId,
      writingSkillActive: Boolean(parsed?.writingSkillActive),
      touchedDeliverables: Array.isArray(parsed?.touchedDeliverables)
        ? parsed.touchedDeliverables.filter((p) => typeof p === 'string')
        : [],
      updatedAt: parsed?.updatedAt || null,
    };
  } catch {
    return empty;
  }
}

export function writeSessionState(sessionId, state, opts = {}) {
  const filePath = sessionFilePath(sessionId, opts);
  const sessionsDir = dirname(filePath);
  mkdirSync(sessionsDir, { recursive: true });
  pruneOldSessions(sessionsDir);

  const payload = {
    sessionId: sanitizeSessionId(sessionId),
    writingSkillActive: Boolean(state?.writingSkillActive),
    touchedDeliverables: Array.from(new Set(
      (Array.isArray(state?.touchedDeliverables) ? state.touchedDeliverables : [])
        .filter((p) => typeof p === 'string' && p.trim())
        .map((p) => resolve(p)),
    )),
    updatedAt: new Date().toISOString(),
  };

  const tmpPath = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, filePath);
  return filePath;
}

function readPreview(filePath, args = {}) {
  try {
    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      return readFileSync(filePath, 'utf8').slice(0, 65536);
    }
  } catch {
    // fall back to args preview
  }
  const fallback = args.CodeContent ?? args.Content ?? args.content ?? args.ReplacementContent ?? '';
  return typeof fallback === 'string' ? fallback.slice(0, 65536) : '';
}

function extractPrimaryFilePath(args = {}) {
  for (const k of ['AbsolutePath', 'TargetFile', 'file_path', 'target_file', 'filePath', 'path', 'Path']) {
    if (typeof args[k] === 'string' && args[k].trim()) return args[k].trim();
  }
  return '';
}

function isMcpVieneuTool(toolName, args = {}) {
  if (/^mcp_+vieneu_/iu.test(toolName)) return true;
  if (toolName === 'call_mcp_tool') {
    const srv = String(args.ServerName ?? args.serverName ?? args.server_name ?? '').trim().toLowerCase();
    return srv === 'vieneu';
  }
  return false;
}

/**
 * Evaluate a normalized hook event across Antigravity, Claude Code, and Codex.
 * Returns `{ action: 'allow' | 'deny' | 'remind', reason?: string, ... }`.
 */
export function evaluateHookEvent(normalizedEvent = {}, opts = {}) {
  const event = String(normalizedEvent?.event || '');
  const cwd = (typeof normalizedEvent?.cwd === 'string' && normalizedEvent.cwd) ? normalizedEvent.cwd : process.cwd();
  const sessionId = normalizedEvent?.sessionId || 'default';
  const toolName = String(normalizedEvent?.toolName || '');
  const args = normalizedEvent?.args && typeof normalizedEvent.args === 'object' ? normalizedEvent.args : {};
  const commandLine = String(normalizedEvent?.commandLine ?? args.CommandLine ?? args.command ?? args.cmd ?? '');
  const rawFilePath = normalizedEvent?.filePath || extractPrimaryFilePath(args);

  if (event === 'PostToolUse') {
    if (normalizedEvent?.error) return { action: 'allow' };
    if (rawFilePath) {
      const absPath = resolve(cwd, rawFilePath);
      const norm = normalizeSlashes(absPath);

      if ((READ_TOOL_NAMES.has(toolName) || !WRITE_TOOL_NAMES.has(toolName)) && WRITING_SKILLS_RE.test(norm)) {
        const state = readSessionState(sessionId, opts);
        if (!state.writingSkillActive) {
          state.writingSkillActive = true;
          writeSessionState(sessionId, state, opts);
        }
        return { action: 'allow' };
      }

      if (WRITE_TOOL_NAMES.has(toolName)) {
        if (isNonDeliverablePath(absPath)) return { action: 'allow' };
        const state = readSessionState(sessionId, opts);
        const preview = readPreview(absPath, args);
        if (isDeliverableContentFile(absPath, preview, { writingSkillActive: state.writingSkillActive })) {
          if (!state.touchedDeliverables.includes(absPath)) {
            state.touchedDeliverables.push(absPath);
            writeSessionState(sessionId, state, opts);
          }
        }
      }
    }
    return { action: 'allow' };
  }

  if (event === 'PreToolUse') {
    const isPublish =
      PUBLISH_CMD_RE.test(toolName) ||
      PUBLISH_CMD_RE.test(commandLine) ||
      isMcpVieneuTool(toolName, args);

    if (!isPublish) return { action: 'allow' };

    const state = readSessionState(sessionId, opts);
    const explicitTargets = extractPublishTargets({ toolName, args, commandLine, cwd });
    const candidateFiles = [];

    if (explicitTargets.length > 0) {
      for (const target of explicitTargets) {
        if (isNonDeliverablePath(target) || !existsSync(target)) continue;
        const preview = readPreview(target);
        const isDeliverable =
          isDeliverableContentFile(target, preview, { writingSkillActive: true }) ||
          (hasVietnameseChars(preview) && countWords(preview) >= 15) ||
          state.touchedDeliverables.includes(target);
        if (isDeliverable) candidateFiles.push(target);
      }
    } else if (state.touchedDeliverables.length > 0) {
      const dirs = extractTargetDirs(commandLine, args, cwd);
      for (const touched of state.touchedDeliverables) {
        if (!existsSync(touched) || isNonDeliverablePath(touched)) continue;
        if (dirs.length > 0 && !dirs.some((d) => touched === d || touched.startsWith(`${d}/`))) continue;
        const preview = readPreview(touched);
        if (isDeliverableContentFile(touched, preview, { writingSkillActive: state.writingSkillActive })) {
          candidateFiles.push(touched);
        }
      }
    }

    for (const target of candidateFiles) {
      const stampRes = readValidStamp(target, opts);
      if (!stampRes.valid) {
        return {
          action: 'deny',
          target,
          reason:
            `VIET-PRO GATE BLOCK: '${target}' chưa có tem SHA-256 hợp lệ ` +
            `(hoặc đã sửa sau khi đóng tem). Chạy: viet-pro gate ${target}`,
        };
      }
    }
    return { action: 'allow' };
  }

  if (event === 'Stop') {
    if (normalizedEvent?.loopGuardActive === true) {
      return { action: 'allow' };
    }
    const state = readSessionState(sessionId, opts);
    if (!state.touchedDeliverables.length) return { action: 'allow' };

    const unstamped = [];
    for (const f of state.touchedDeliverables) {
      if (!existsSync(f) || isNonDeliverablePath(f)) continue;
      const preview = readPreview(f);
      if (!isDeliverableContentFile(f, preview, { writingSkillActive: state.writingSkillActive })) continue;
      if (!readValidStamp(f, opts).valid) unstamped.push(f);
    }

    if (!unstamped.length) return { action: 'allow' };

    return {
      action: 'remind',
      files: unstamped,
      reason:
        `Còn sản phẩm nội dung chưa qua viet-pro gate: ${unstamped.join(', ')}. ` +
        "Hãy chạy 'viet-pro gate <file>' trước khi giao bản cuối.",
    };
  }

  return { action: 'allow' };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Self-test covering non-deliverables, writing session tracking, PreToolUse blocking, and Stop loop guard. */
export function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-hook-test-'));
  const prevCache = process.env.VIET_PRO_CACHE_DIR;
  process.env.VIET_PRO_CACHE_DIR = join(tmp, 'cache');

  try {
    const repo = join(tmp, 'workspace');
    mkdirSync(join(repo, 'plans'), { recursive: true });
    mkdirSync(join(repo, 'docs'), { recursive: true });
    mkdirSync(join(repo, 'src'), { recursive: true });
    mkdirSync(join(repo, 'drafts'), { recursive: true });

    // 1. Coding/docs session without writing skill must never trigger Stop reminders or create session files
    const codeSession = 'coding-session-1';
    for (const rel of ['src/app.mjs', 'README.md', 'plans/p1.md', '02-review-ticket.md', 'docs/guide.md', 'handoff-log.md']) {
      const f = join(repo, rel);
      writeFileSync(f, 'Nội dung kỹ thuật bất kỳ.\n', 'utf8');
      const postRes = evaluateHookEvent({
        host: 'codex',
        event: 'PostToolUse',
        sessionId: codeSession,
        cwd: repo,
        toolName: 'write_file',
        filePath: f,
      });
      assert(postRes.action === 'allow', `PostToolUse should allow ${rel}`);
    }
    assert(!existsSync(sessionFilePath(codeSession)), 'coding session must not create session state file');
    assert(
      evaluateHookEvent({ host: 'codex', event: 'Stop', sessionId: codeSession, cwd: repo, loopGuardActive: false }).action === 'allow',
      'coding session Stop must allow',
    );
    assert(
      evaluateHookEvent({ host: 'agy', event: 'PreToolUse', sessionId: codeSession, cwd: repo, toolName: 'run_command', commandLine: 'npm test' }).action === 'allow',
      'non-publish command must allow',
    );
    assert(
      evaluateHookEvent({ host: 'agy', event: 'PreToolUse', sessionId: codeSession, cwd: repo, toolName: 'run_command', commandLine: 'gws drive list' }).action === 'allow',
      'gws drive list must not trigger publish gate',
    );

    // 2. Writing session: read SKILL.md -> write deliverable -> blocked before stamp
    const writeSession = 'writing-session-1';
    evaluateHookEvent({
      host: 'agy',
      event: 'PostToolUse',
      sessionId: writeSession,
      cwd: repo,
      toolName: 'read_file',
      filePath: join(tmp, 'skills', 'viet-pro', 'SKILL.md'),
    });
    assert(readSessionState(writeSession).writingSkillActive === true, 'reading viet-pro SKILL.md must set writingSkillActive');

    const article = join(repo, 'drafts', 'article.md');
    const articleBody = 'Đây là bài viết tiếng Việt phân tích cách doanh nghiệp vận hành quy trình bán hàng thực tế.\n';
    writeFileSync(article, articleBody, 'utf8');
    evaluateHookEvent({
      host: 'agy',
      event: 'PostToolUse',
      sessionId: writeSession,
      cwd: repo,
      toolName: 'write_to_file',
      filePath: article,
    });
    assert(readSessionState(writeSession).touchedDeliverables.includes(article), 'article.md must be tracked');

    // Unstamped PreToolUse must deny on tqd-publish, gws docs, mcp_vieneu_*, call_mcp_tool vieneu
    const pubDeny = evaluateHookEvent({
      host: 'claude',
      event: 'PreToolUse',
      sessionId: writeSession,
      cwd: repo,
      toolName: 'Bash',
      commandLine: 'tqd-publish drafts/article.md',
    });
    assert(pubDeny.action === 'deny', `expected deny for unstamped tqd-publish, got ${pubDeny.action}`);

    const gwsDocsDeny = evaluateHookEvent({
      host: 'agy',
      event: 'PreToolUse',
      sessionId: writeSession,
      cwd: repo,
      toolName: 'run_command',
      commandLine: 'gws docs create --file drafts/article.md',
    });
    assert(gwsDocsDeny.action === 'deny', 'expected deny for unstamped gws docs');

    const mcpVieneuDeny = evaluateHookEvent({
      host: 'agy',
      event: 'PreToolUse',
      sessionId: writeSession,
      cwd: repo,
      toolName: 'mcp_vieneu_synthesize',
      args: { file_path: article },
    });
    assert(mcpVieneuDeny.action === 'deny', 'expected deny for unstamped mcp_vieneu_synthesize');

    const callMcpDeny = evaluateHookEvent({
      host: 'agy',
      event: 'PreToolUse',
      sessionId: writeSession,
      cwd: repo,
      toolName: 'call_mcp_tool',
      args: { ServerName: 'vieneu', ToolName: 'render_story', Arguments: { script_path: article } },
    });
    assert(callMcpDeny.action === 'deny', 'expected deny for unstamped call_mcp_tool ServerName=vieneu');

    // Stop without loopGuardActive reminds once
    const stopRemind = evaluateHookEvent({
      host: 'claude',
      event: 'Stop',
      sessionId: writeSession,
      cwd: repo,
      loopGuardActive: false,
    });
    assert(stopRemind.action === 'remind', `expected remind on unstamped Stop, got ${stopRemind.action}`);

    // Stop with loopGuardActive ALWAYS allows
    const stopGuarded = evaluateHookEvent({
      host: 'claude',
      event: 'Stop',
      sessionId: writeSession,
      cwd: repo,
      loopGuardActive: true,
    });
    assert(stopGuarded.action === 'allow', 'Stop with loopGuardActive=true must always allow');

    // 3. Stamp article -> PreToolUse and Stop both allow
    const stampRoot = resolveStampRoot(article);
    writeStamp(stampRoot, { content_sha256: sha256Of(readFileSync(article)), status: 'passed' });
    assert(
      evaluateHookEvent({
        host: 'claude',
        event: 'PreToolUse',
        sessionId: writeSession,
        cwd: repo,
        toolName: 'Bash',
        commandLine: 'tqd-publish drafts/article.md',
      }).action === 'allow',
      'stamped article must allow PreToolUse',
    );
    assert(
      evaluateHookEvent({
        host: 'claude',
        event: 'Stop',
        sessionId: writeSession,
        cwd: repo,
        loopGuardActive: false,
      }).action === 'allow',
      'stamped article must allow Stop',
    );

    // 4. Mutate 1 byte -> PreToolUse denies again
    writeFileSync(article, `${articleBody} `, 'utf8');
    assert(
      evaluateHookEvent({
        host: 'claude',
        event: 'PreToolUse',
        sessionId: writeSession,
        cwd: repo,
        toolName: 'Bash',
        commandLine: 'tqd-publish drafts/article.md',
      }).action === 'deny',
      'mutated article must invalidate stamp and deny PreToolUse',
    );

    console.log('SELF-TEST PASS — editorial-hook.mjs (exclusions, writing session tracking, PreToolUse stamp enforcement, Stop loop guard)');
  } finally {
    if (prevCache === undefined) delete process.env.VIET_PRO_CACHE_DIR;
    else process.env.VIET_PRO_CACHE_DIR = prevCache;
    rmSync(tmp, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--self-test')) {
    try {
      selfTest();
      process.exit(0);
    } catch (err) {
      console.error(`SELF-TEST FAIL — ${err?.stack || err}`);
      process.exit(1);
    }
  } else {
    console.error('Usage: node editorial-hook.mjs --self-test');
    process.exit(2);
  }
}
