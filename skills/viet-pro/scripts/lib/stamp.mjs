// SHA-256 stamp store & gate round tracker for viet-pro.
// Importing this file has no side effects.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VALID_STAMP_STATUSES = new Set([
  'passed',
  'degraded_no_decisions',
  'delivered_after_max_rounds',
]);

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_DISTINCT_ATTEMPTS = 10;

export function sha256Of(bufferOrString) {
  const buf = Buffer.isBuffer(bufferOrString)
    ? bufferOrString
    : Buffer.from(String(bufferOrString), 'utf8');
  return createHash('sha256').update(buf).digest('hex');
}

function isDirWritable(dir) {
  try {
    accessSync(dir, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveCacheBaseDir(opts = {}) {
  const env = opts.env ?? process.env;
  if (typeof opts.cacheDir === 'string' && opts.cacheDir.trim()) {
    return resolve(opts.cacheDir.trim());
  }
  if (typeof env?.VIET_PRO_CACHE_DIR === 'string' && env.VIET_PRO_CACHE_DIR.trim()) {
    return resolve(env.VIET_PRO_CACHE_DIR.trim());
  }
  const home = (typeof env?.HOME === 'string' && env.HOME.trim()) ? env.HOME.trim() : homedir();
  const preferred = join(home, '.cache', 'viet-pro');
  if (existsSync(preferred) ? isDirWritable(preferred) : isDirWritable(home)) {
    return preferred;
  }
  return join(tmpdir(), 'viet-pro-cache');
}

function isInsideSkillTree(absPath) {
  const norm = absPath.replace(/\\/gu, '/');
  if (/(?:^|\/)skills\/viet-pro(?:\/|$)/u.test(norm)) return true;
  const normSkill = SKILL_ROOT.replace(/\\/gu, '/');
  return norm === normSkill || norm.startsWith(`${normSkill}/`);
}

function findProjectRoot(startDir) {
  const home = resolve(homedir());
  const root = parse(startDir).root;
  let cur = resolve(startDir);

  while (true) {
    if (existsSync(join(cur, '.viet-pro.json')) || existsSync(join(cur, '.git'))) {
      return cur;
    }
    if (cur === home || cur === root) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

/**
 * Resolve where `.viet-pro` stamps live for `filePath` (or `--stdin` when falsy).
 * Never places `.viet-pro/` inside `skills/viet-pro/`.
 */
export function resolveStampRoot(filePath, opts = {}) {
  if (typeof opts.stampDir === 'string' && opts.stampDir.trim()) {
    return resolve(opts.stampDir.trim());
  }

  const fallback = join(resolveCacheBaseDir(opts), 'stamps');
  if (!filePath) return fallback;

  const absPath = resolve(String(filePath));
  if (isInsideSkillTree(absPath)) return fallback;

  const startDir = dirname(absPath);
  const projectRoot = findProjectRoot(startDir);
  const targetParent = projectRoot || startDir;
  if (!existsSync(targetParent) || !isDirWritable(targetParent)) {
    return fallback;
  }
  return join(targetParent, '.viet-pro');
}

/**
 * Always create `<stampRoot>/.gitignore` with `*\n`.
 * Only appends `.viet-pro/` to `<projectRoot>/.gitignore` if that root `.gitignore` ALREADY exists.
 */
export function ensureLocalIgnore(stampRoot, opts = {}) {
  const absStampRoot = resolve(stampRoot);
  ensureDir(absStampRoot);

  const localIgnorePath = join(absStampRoot, '.gitignore');
  const existingLocal = existsSync(localIgnorePath) ? readFileSync(localIgnorePath, 'utf8') : null;
  if (existingLocal !== '*\n') {
    writeFileSync(localIgnorePath, '*\n', 'utf8');
  }

  if (opts.touchProjectGitignore !== false && basename(absStampRoot) === '.viet-pro') {
    const projectRoot = dirname(absStampRoot);
    const rootIgnorePath = join(projectRoot, '.gitignore');
    if (existsSync(rootIgnorePath)) {
      const raw = readFileSync(rootIgnorePath, 'utf8');
      const lines = raw.split(/\r?\n/u).map((l) => l.trim());
      const hasEntry = lines.some((l) => l === '.viet-pro' || l === '.viet-pro/' || l === '/.viet-pro' || l === '/.viet-pro/');
      if (!hasEntry) {
        const prefix = raw === '' || raw.endsWith('\n') ? '' : '\n';
        writeFileSync(rootIgnorePath, `${raw}${prefix}.viet-pro/\n`, 'utf8');
      }
    }
  }
}

function writeJsonAtomic(targetPath, obj) {
  ensureDir(dirname(targetPath));
  const tmpPath = `${targetPath}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, targetPath);
}

/**
 * Write a content-addressed SHA-256 stamp to `<stampRoot>/stamps/<sha256>.json`.
 * Skips when `content_sha256` is missing; never stores API keys.
 */
export function writeStamp(stampRoot, data, opts = {}) {
  if (!data || typeof data.content_sha256 !== 'string' || !data.content_sha256.trim()) {
    return null;
  }
  if (!VALID_STAMP_STATUSES.has(data.status)) {
    throw new Error(`Invalid stamp status: ${String(data.status)}`);
  }

  ensureLocalIgnore(stampRoot, opts);
  const sha = data.content_sha256.trim();
  const stampPath = join(resolve(stampRoot), 'stamps', `${sha}.json`);
  const record = {
    schema: 'viet-pro/stamp@1',
    content_sha256: sha,
    status: data.status,
    file_path: data.file_path ?? null,
    words: Number.isFinite(data.words) ? data.words : null,
    platform: data.platform ?? null,
    surface: data.surface ?? null,
    route_hint: data.route_hint ?? null,
    decisions_status: data.decisions_status ?? null,
    rhythm_score_0_to_3: Number.isFinite(data.rhythm_score_0_to_3) ? data.rhythm_score_0_to_3 : null,
    flagged_defects: Array.isArray(data.flagged_defects) ? data.flagged_defects : [],
    ai_score_0_to_100: Number.isFinite(data.ai_score_0_to_100) ? data.ai_score_0_to_100 : null,
    review_ticket_sha256: data.review_ticket_sha256 ?? null,
    rounds_observed: Number.isFinite(data.rounds_observed) ? data.rounds_observed : null,
    created_at: data.created_at || new Date().toISOString(),
  };

  writeJsonAtomic(stampPath, record);
  return stampPath;
}

/** Verify whether `filePath` currently has a valid SHA-256 stamp matching its bytes on disk. */
export function readValidStamp(filePath, opts = {}) {
  if (!filePath) {
    return { valid: false, reason: 'missing_file_path', sha256: null };
  }
  const absPath = resolve(String(filePath));
  if (!existsSync(absPath)) {
    return { valid: false, reason: 'file_not_found', sha256: null };
  }

  let actualSha;
  try {
    actualSha = sha256Of(readFileSync(absPath));
  } catch (err) {
    return { valid: false, reason: `file_unreadable: ${err?.message || err}`, sha256: null };
  }

  const stampRoot = resolveStampRoot(absPath, opts);
  const stampPath = join(stampRoot, 'stamps', `${actualSha}.json`);
  if (!existsSync(stampPath)) {
    return { valid: false, reason: 'stamp_not_found', sha256: actualSha, stampPath };
  }

  let stamp;
  try {
    stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
  } catch {
    return { valid: false, reason: 'stamp_corrupt', sha256: actualSha, stampPath };
  }

  if (!stamp || stamp.content_sha256 !== actualSha) {
    return { valid: false, reason: 'sha256_mismatch', sha256: actualSha, stampPath, stamp };
  }
  if (!VALID_STAMP_STATUSES.has(stamp.status)) {
    return { valid: false, reason: `invalid_status:${String(stamp.status)}`, sha256: actualSha, stampPath, stamp };
  }

  return { valid: true, sha256: actualSha, stampPath, stamp };
}

function runHistoryPath(stampRoot, filePath) {
  const key = filePath ? resolve(String(filePath)) : '__stdin__';
  return {
    key,
    path: join(resolve(stampRoot), 'runs', `${sha256Of(key)}.json`),
  };
}

/** Read up to 10 most recent distinct deterministic-clean content SHA-256 hashes for `filePath`. */
export function getRecentDistinctAttempts(stampRoot, filePath) {
  const { path: runPath } = runHistoryPath(stampRoot, filePath);
  if (!existsSync(runPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(runPath, 'utf8'));
    if (!Array.isArray(parsed?.hashes)) return [];
    return parsed.hashes.filter((h) => typeof h === 'string' && h.length > 0);
  } catch {
    return [];
  }
}

/** Record a deterministic-clean `contentSha256` attempt for `filePath` and return the distinct recent hash list. */
export function recordGateAttempt(stampRoot, filePath, contentSha256, opts = {}) {
  if (typeof contentSha256 !== 'string' || !contentSha256.trim()) {
    return getRecentDistinctAttempts(stampRoot, filePath);
  }
  ensureLocalIgnore(stampRoot, opts);
  const sha = contentSha256.trim();
  const { key, path: runPath } = runHistoryPath(stampRoot, filePath);
  const prev = getRecentDistinctAttempts(stampRoot, filePath).filter((h) => h !== sha);
  prev.push(sha);
  const hashes = prev.slice(-MAX_DISTINCT_ATTEMPTS);

  writeJsonAtomic(runPath, {
    target: key,
    hashes,
    updated_at: new Date().toISOString(),
  });
  return hashes;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Self-test using isolated os.tmpdir() and VIET_PRO_CACHE_DIR, cleaned up in finally. */
export function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-stamp-test-'));
  const prevCache = process.env.VIET_PRO_CACHE_DIR;
  process.env.VIET_PRO_CACHE_DIR = join(tmp, 'cache');

  try {
    // 1. --stdin and files inside skills/viet-pro/ must fall back to cache dir
    const stdinRoot = resolveStampRoot(null);
    assert(stdinRoot === join(tmp, 'cache', 'stamps'), `stdin stampRoot mismatch: ${stdinRoot}`);
    const skillDraft = join(tmp, 'repo-x', 'skills', 'viet-pro', 'draft.md');
    const skillStampRoot = resolveStampRoot(skillDraft);
    assert(skillStampRoot === join(tmp, 'cache', 'stamps'), `skill tree path leaked .viet-pro: ${skillStampRoot}`);

    // 2. Repo with .git and NO root .gitignore stays git-clean without creating root .gitignore
    const repoNoIgnore = join(tmp, 'repo-no-ignore');
    mkdirSync(join(repoNoIgnore, 'sub'), { recursive: true });
    const gitInit = spawnSync('git', ['init', '-q'], { cwd: repoNoIgnore, encoding: 'utf8' });
    assert(gitInit.status === 0, `git init failed: ${gitInit.stderr}`);
    const article = join(repoNoIgnore, 'sub', 'article.md');
    writeFileSync(article, 'Nội dung bài viết sạch sẽ đầu tiên.\n', 'utf8');

    const root1 = resolveStampRoot(article);
    assert(root1 === join(repoNoIgnore, '.viet-pro'), `expected repo .viet-pro, got ${root1}`);

    const sha1 = sha256Of(readFileSync(article));
    const sp = writeStamp(root1, {
      content_sha256: sha1,
      status: 'passed',
      file_path: article,
      apiKey: 'SHOULD_NOT_BE_STORED',
    });
    assert(sp && existsSync(sp), 'stamp file was not written');
    assert(readFileSync(join(root1, '.gitignore'), 'utf8') === '*\n', 'local .gitignore must be *\\n');
    assert(!existsSync(join(repoNoIgnore, '.gitignore')), 'must NOT create root .gitignore when absent');
    assert(!readFileSync(sp, 'utf8').includes('SHOULD_NOT_BE_STORED'), 'stamp must never store secrets');

    // Stage article and check git status --porcelain ignores .viet-pro/ completely
    spawnSync('git', ['add', 'sub/article.md'], { cwd: repoNoIgnore });
    const gitCommit = spawnSync(
      'git',
      ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', 'init'],
      { cwd: repoNoIgnore, encoding: 'utf8' },
    );
    assert(gitCommit.status === 0, `git commit failed: ${gitCommit.stderr}`);
    const gitStatus = spawnSync('git', ['status', '--porcelain'], { cwd: repoNoIgnore, encoding: 'utf8' });
    assert(gitStatus.stdout.trim() === '', `expected clean git status, got: ${gitStatus.stdout}`);

    // 3. readValidStamp validates exact bytes and invalidates on 1-byte mutation
    assert(readValidStamp(article).valid === true, 'stamp should validate unchanged file');
    writeFileSync(article, 'Nội dung bài viết sạch sẽ đầu tiên!\n', 'utf8');
    assert(readValidStamp(article).valid === false, '1-byte edit must invalidate stamp');

    // 4. All 3 valid statuses pass; invalid status is rejected
    for (const status of VALID_STAMP_STATUSES) {
      const content = `Mẫu kiểm status ${status}\n`;
      const f = join(repoNoIgnore, `status-${status}.md`);
      writeFileSync(f, content, 'utf8');
      writeStamp(root1, { content_sha256: sha256Of(content), status });
      assert(readValidStamp(f).valid === true, `expected valid=true for status ${status}`);
    }
    let threw = false;
    try {
      writeStamp(root1, { content_sha256: sha1, status: 'bogus_status' });
    } catch {
      threw = true;
    }
    assert(threw, 'writeStamp must reject invalid status');

    // 5. Repo WITH existing .gitignore appends .viet-pro/ idempotently
    const repoWithIgnore = join(tmp, 'repo-with-ignore');
    mkdirSync(repoWithIgnore, { recursive: true });
    writeFileSync(join(repoWithIgnore, '.gitignore'), 'node_modules/\n', 'utf8');
    const root2 = join(repoWithIgnore, '.viet-pro');
    ensureLocalIgnore(root2);
    ensureLocalIgnore(root2);
    const ignoreLines = readFileSync(join(repoWithIgnore, '.gitignore'), 'utf8').trim().split('\n');
    assert(ignoreLines.filter((l) => l === '.viet-pro/').length === 1, 'expected exactly one .viet-pro/ line');

    // 6. Distinct attempt round tracking
    assert(recordGateAttempt(root1, article, 'h1').length === 1, 'round 1');
    assert(recordGateAttempt(root1, article, 'h1').length === 1, 'duplicate hash must not increase distinct count');
    assert(recordGateAttempt(root1, article, 'h2').length === 2, 'round 2');
    const r3 = recordGateAttempt(root1, article, 'h3');
    assert(r3.length === 3 && r3[2] === 'h3', 'round 3 should yield 3 distinct hashes');
    assert(getRecentDistinctAttempts(root1, article).length === 3, 'persisted distinct count should be 3');

    console.log('SELF-TEST PASS — stamp.mjs (fallback cache, git-clean .viet-pro, 3 statuses, 1-byte invalidation, round tracker)');
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
    console.error('Usage: node stamp.mjs --self-test');
    process.exit(2);
  }
}
