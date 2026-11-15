// Unified deterministic + Gemini Decisions editorial gate and SHA-256 stamper.
// Importing this file has no side effects.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare } from './compare.mjs';
import { loadProjectConfig } from './config.mjs';
import { runDecisionsGate } from './decisions.mjs';
import { computeRouteHint, lintText, stripFrontmatter } from './lint.mjs';
import { checkSlideDeck, pptxLineLabels, pptxToText, readPptx } from './pptx.mjs';
import { checkDraft, loadProfile, splitDraft, validateProfile } from './profile.mjs';
import { scanText } from './score.mjs';
import {
  getRecentDistinctAttempts,
  recordGateAttempt,
  resolveStampRoot,
  sha256Of,
  writeStamp,
} from './stamp.mjs';

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLISHING_DIR = join(SKILL_ROOT, 'references', 'publishing');
const INVALID_REVIEWERS = new Set(['self', 'auto', 'none', 'n/a', 'na', 'todo', 'tbd', '-']);
const TICKET_FIELD_RE = /^\s*(?:[-*]\s+)?`?(verdict|reviewer|reviewed_sha256)`?\s*:\s*(.+?)\s*$/iu;

export function countWords(text) {
  if (typeof text !== 'string' || !text) return 0;
  return (text.normalize('NFC').match(/[\p{L}\p{N}]+/gu) || []).length;
}

export function requiresEditorialTicket({
  words = 0,
  channelsCount = 1,
  routeHint = 'light',
  forceTicket = false,
} = {}) {
  return Boolean(forceTicket) || words >= 800 || channelsCount >= 3 || routeHint === 'heavy';
}

function isFile(p) {
  try {
    return Boolean(p) && existsSync(p) && statSync(p).isFile();
  } catch {
    return false;
  }
}

export function findReviewTicket({ filePath, ticketPath, stampRoot } = {}) {
  if (typeof ticketPath === 'string' && ticketPath.trim()) {
    const absTicket = resolve(ticketPath.trim());
    return isFile(absTicket) ? absTicket : null;
  }

  const candidates = [];
  if (filePath) {
    const absFile = resolve(String(filePath));
    const dir1 = dirname(absFile);
    const dir2 = dirname(dir1);
    candidates.push(join(dir1, '02-review-ticket.md'));
    candidates.push(join(dir2, '02-review-ticket.md'));
    if (stampRoot) {
      const baseFull = basename(absFile);
      const baseStem = basename(absFile, extname(absFile));
      candidates.push(join(resolve(stampRoot), 'reviews', `${baseFull}.ticket.md`));
      if (baseStem && baseStem !== baseFull) {
        candidates.push(join(resolve(stampRoot), 'reviews', `${baseStem}.ticket.md`));
      }
    }
  }

  for (const candidate of candidates) {
    if (isFile(candidate)) return candidate;
  }
  return null;
}

function findSiblingDraftSha(filePath) {
  if (!filePath) return null;
  const absFile = resolve(String(filePath));
  for (const candidate of [
    join(dirname(absFile), '01-draft.md'),
    join(dirname(dirname(absFile)), '01-draft.md'),
  ]) {
    if (isFile(candidate)) {
      return sha256Of(readFileSync(candidate));
    }
  }
  return null;
}

function unquote(val) {
  const trimmed = String(val || '').trim();
  if (trimmed.length >= 2 && ((trimmed[0] === '"' && trimmed.at(-1) === '"') || (trimmed[0] === "'" && trimmed.at(-1) === "'") || (trimmed[0] === '`' && trimmed.at(-1) === '`'))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function validateReviewTicket(ticketRaw, { targetSha256, siblingDraftSha256 } = {}) {
  const errors = [];
  if (typeof ticketRaw !== 'string' || !ticketRaw.trim()) {
    return { valid: false, errors: ['Phiếu 02-review-ticket.md rỗng'], fields: {}, bodyWords: 0 };
  }

  const normalized = ticketRaw.replace(/\r\n/gu, '\n');
  const lines = normalized.split('\n');
  const fields = {};
  let bodyText = normalized;

  if (lines[0]?.trim() === '---') {
    const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (endIdx > 0) {
      for (const line of lines.slice(1, endIdx)) {
        const m = line.match(/^\s*([a-z0-9_]+)\s*:\s*(.*?)\s*$/iu);
        if (m) fields[m[1].toLowerCase()] = unquote(m[2]);
      }
      bodyText = lines.slice(endIdx + 1).join('\n');
    }
  }

  const bodyLines = [];
  let inFence = false;
  for (const line of bodyText.split('\n')) {
    if (/^\s*```/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      const m = line.match(TICKET_FIELD_RE);
      if (m) {
        const key = m[1].toLowerCase();
        if (!fields[key]) fields[key] = unquote(m[2]);
        continue;
      }
    }
    bodyLines.push(line);
  }

  const verdict = String(fields.verdict || '').normalize('NFC').trim().toUpperCase();
  if (verdict !== 'DUYỆT NỘI DUNG') {
    errors.push(`Thiếu hoặc sai verdict ("${fields.verdict || ''}", cần "DUYỆT NỘI DUNG")`);
  }

  const reviewer = String(fields.reviewer || '').normalize('NFC').trim();
  if (!reviewer || INVALID_REVIEWERS.has(reviewer.toLowerCase())) {
    errors.push(`Trường "reviewer" không hợp lệ ("${reviewer || ''}", không chấp nhận rỗng/self/auto)`);
  }

  const reviewedSha = String(fields.reviewed_sha256 || '').trim().toLowerCase();
  const expectedTarget = String(targetSha256 || '').trim().toLowerCase();
  const expectedSibling = String(siblingDraftSha256 || '').trim().toLowerCase();
  const shaMatches = Boolean(reviewedSha) && (
    (expectedTarget && reviewedSha === expectedTarget)
    || (expectedSibling && reviewedSha === expectedSibling)
  );
  if (!shaMatches) {
    errors.push(`"reviewed_sha256" (${reviewedSha || 'thiếu'}) không khớp SHA-256 của bản thảo (${expectedTarget || 'none'})`);
  }

  const bodyWords = countWords(bodyLines.join('\n'));
  if (bodyWords < 60) {
    errors.push(`Phần ghi chép kiểm tra quá ngắn (${bodyWords}/60 từ)`);
  }

  return { valid: errors.length === 0, errors, fields, bodyWords };
}

function buildInput(input, opts = {}) {
  if (typeof input === 'string') {
    const filePath = opts.filePath ? resolve(String(opts.filePath)) : null;
    const rawBytes = Buffer.from(input, 'utf8');
    return { text: input, rawBytes, filePath, pptxSlides: null, pptxIndex: null };
  }
  const obj = input && typeof input === 'object' ? input : {};
  const filePath = obj.filePath ? resolve(String(obj.filePath)) : (opts.filePath ? resolve(String(opts.filePath)) : null);
  if (typeof obj.text === 'string') {
    return { text: obj.text, rawBytes: Buffer.from(obj.text, 'utf8'), filePath, pptxSlides: null, pptxIndex: null };
  }
  if (filePath) {
    const rawBytes = readFileSync(filePath);
    if (filePath.toLowerCase().endsWith('.pptx')) {
      const pptxSlides = readPptx(rawBytes);
      const { text, index: pptxIndex } = pptxToText(pptxSlides);
      return { text, rawBytes, filePath, pptxSlides, pptxIndex };
    }
    return { text: rawBytes.toString('utf8'), rawBytes, filePath, pptxSlides: null, pptxIndex: null };
  }
  throw new Error('runGate cần text hoặc filePath');
}

export async function runGate(input, opts = {}) {
  const { text, rawBytes, filePath, pptxSlides, pptxIndex } = buildInput(input, opts);
  const contentSha256 = sha256Of(rawBytes);

  let projectCfg;
  try {
    projectCfg = loadProjectConfig(opts.configPath || filePath || opts.cwd || process.cwd());
  } catch (err) {
    return {
      ok: false,
      exitCode: 1,
      stage: 'config',
      file_path: filePath,
      content_sha256: contentSha256,
      errors: [err.message],
      lint_findings: [],
      platform_findings: [],
      compare_result: null,
      decisions: null,
      stamp_path: null,
      stamp_status: null,
    };
  }

  const cfg = projectCfg.config;
  const keep = [...(cfg.keep_terms || []), ...(Array.isArray(opts.keep) ? opts.keep : [])];
  const ttsTags = opts.ttsTags !== undefined ? opts.ttsTags : (cfg.tts_tags !== false);
  const houseStyle = opts.houseStyle !== undefined ? opts.houseStyle : cfg.house_style;
  const maxAiScore = opts.maxAiScore !== undefined ? opts.maxAiScore : cfg.max_ai_score;
  const bannedPhrases = opts.bannedPhrases ?? cfg.banned_phrases;
  const mandatoryCta = opts.mandatoryCta ?? cfg.mandatory_cta;
  const allowFirstHand = opts.allowFirstHand !== undefined ? opts.allowFirstHand : cfg.allow_first_hand;
  const strictFirstHand = opts.strictFirstHand === true;
  const platformId = (typeof opts.platform === 'string' && opts.platform.trim())
    ? opts.platform.trim()
    : (cfg.default_platform || '');

  // Step 2: Optional --before preservation check
  let compareResult = null;
  if (opts.beforeText !== undefined) {
    compareResult = compare(opts.beforeText, text, keep, {
      strictQuotes: opts.strictQuotes === true,
      maxEditRatio: opts.maxEditRatio,
      ttsTags,
    });
    if (compareResult.differences.length > 0) {
      return {
        ok: false,
        exitCode: 1,
        stage: 'compare',
        file_path: filePath,
        config_path: projectCfg.path,
        content_sha256: contentSha256,
        words: countWords(stripFrontmatter(text)),
        route_hint: null,
        compare_result: compareResult,
        lint_findings: [],
        platform_findings: [],
        ticket: { required: false },
        decisions: null,
        stamp_path: null,
        stamp_status: null,
        errors: compareResult.differences.map((d) => (
          d.kind === 'polarity'
            ? `MISMATCH [polarity] ${JSON.stringify(d.token)}: "${d.before}" -> "${d.after}"`
            : `MISMATCH [${d.kind}] ${JSON.stringify(d.token)}: ${d.before} -> ${d.after}`
        )),
      };
    }
  }

  // Step 3: Deterministic Vietnamese lint + AI score scan
  const proseLintFindings = lintText(text, {
    keep,
    bannedPhrases,
    mandatoryCta,
    allowFirstHand,
    strictFirstHand,
    ttsTags,
    houseStyle,
    register: cfg.register,
  });
  const slideFindings = pptxSlides ? checkSlideDeck(pptxSlides, pptxIndex) : [];
  const lintFindings = slideFindings.length ? [...proseLintFindings, ...slideFindings] : proseLintFindings;
  const aiScoreRes = pptxSlides
    ? scanText(text, {
      burst: false,
      lineLabels: pptxLineLabels(pptxIndex),
      slideFindings,
      slidesCount: pptxSlides.length,
      register: cfg.register,
      ttsTags,
    })
    : scanText(text, { register: cfg.register, ttsTags });
  const aiScoreSummary = {
    score: aiScoreRes.score,
    band: aiScoreRes.band,
    total_hits: aiScoreRes.total_hits,
  };

  // Step 4: Optional platform limits check
  let platformRes = null;
  const platformErrors = [];
  if (platformId) {
    try {
      const profile = loadProfile(PUBLISHING_DIR, platformId);
      const schemaErrors = validateProfile(profile, platformId);
      if (schemaErrors.length) {
        platformErrors.push(`Hồ sơ kênh "${platformId}" sai schema: ${schemaErrors.join('; ')}`);
      } else {
        platformRes = checkDraft(profile, splitDraft(text), {
          surface: opts.surface,
          meta: { keyword: opts.keyword, slug: opts.slug, title: opts.seoTitle, description: opts.seoDescription },
        });
      }
    } catch (err) {
      platformErrors.push(err.message);
    }
  }

  const routeHint = computeRouteHint(text, lintFindings);
  const words = countWords(stripFrontmatter(text));
  const channelsCount = Number.isFinite(Number(opts.channels)) ? Number(opts.channels) : 1;

  const lintErrors = lintFindings.filter((f) => f.level === 'ERROR');
  if (maxAiScore !== null && maxAiScore !== undefined && Number.isFinite(Number(maxAiScore)) && aiScoreRes.score > Number(maxAiScore)) {
    lintErrors.push({
      level: 'ERROR',
      id: 'ai-score-exceeded',
      line: 0,
      excerpt: `ai_score=${aiScoreRes.score}/100 > max=${Number(maxAiScore)}`,
      desc: 'Điểm dấu hiệu AI vượt ngưỡng max_ai_score cho phép',
    });
  }
  const platErrFindings = (platformRes?.findings || []).filter((f) => f.level === 'ERROR');
  if (lintErrors.length || platErrFindings.length || platformErrors.length) {
    const errors = [
      ...lintErrors.map((f) => `ERROR ${filePath || '<stdin>'}:${f.line} [${f.id}] ${JSON.stringify(f.excerpt)}`),
      ...platformErrors,
      ...platErrFindings.map((f) => `ERROR [${platformId}/${platformRes.surface}] ${f.field}: ${f.detail}`),
    ];
    return {
      ok: false,
      exitCode: 1,
      stage: lintErrors.length ? 'lint' : 'platform',
      file_path: filePath,
      config_path: projectCfg.path,
      content_sha256: contentSha256,
      words,
      route_hint: routeHint,
      ai_score: aiScoreSummary,
      compare_result: compareResult,
      lint_findings: lintFindings,
      platform: platformId || null,
      surface: platformRes?.surface || null,
      platform_findings: platformRes?.findings || [],
      ticket: { required: false },
      decisions: null,
      stamp_path: null,
      stamp_status: null,
      errors,
    };
  }

  // Step 5: Independent editorial review ticket check
  const stampRoot = resolveStampRoot(filePath, opts);
  const ticketRequired = requiresEditorialTicket({
    words,
    channelsCount,
    routeHint,
    forceTicket: opts.forceTicket === true,
  });
  let ticketInfo = { required: ticketRequired, path: null, valid: !ticketRequired, errors: [] };
  let ticketSha256 = null;

  if (ticketRequired) {
    const ticketPath = findReviewTicket({
      filePath,
      ticketPath: opts.reviewTicket,
      stampRoot,
    });
    if (!ticketPath) {
      const reasons = [];
      if (words >= 800) reasons.push(`${words} từ >= 800`);
      if (channelsCount >= 3) reasons.push(`${channelsCount} kênh >= 3`);
      if (routeHint === 'heavy') reasons.push('route_hint=heavy');
      if (opts.forceTicket) reasons.push('--review-ticket');
      const errMsg = `Thiếu phiếu 02-review-ticket.md (bắt buộc vì: ${reasons.join(', ')})`;
      return {
        ok: false,
        exitCode: 1,
        stage: 'ticket',
        file_path: filePath,
        config_path: projectCfg.path,
        content_sha256: contentSha256,
        words,
        route_hint: routeHint,
        ai_score: aiScoreSummary,
        compare_result: compareResult,
        lint_findings: lintFindings,
        platform: platformId || null,
        surface: platformRes?.surface || null,
        platform_findings: platformRes?.findings || [],
        ticket: { ...ticketInfo, errors: [errMsg] },
        decisions: null,
        stamp_path: null,
        stamp_status: null,
        errors: [errMsg],
      };
    }

    const ticketRaw = readFileSync(ticketPath, 'utf8');
    ticketSha256 = sha256Of(ticketRaw);
    const siblingDraftSha256 = findSiblingDraftSha(filePath);
    const ticketValidation = validateReviewTicket(ticketRaw, {
      targetSha256: contentSha256,
      siblingDraftSha256,
    });
    ticketInfo = { required: true, path: ticketPath, sha256: ticketSha256, ...ticketValidation };

    if (!ticketValidation.valid) {
      return {
        ok: false,
        exitCode: 1,
        stage: 'ticket',
        file_path: filePath,
        config_path: projectCfg.path,
        content_sha256: contentSha256,
        words,
        route_hint: routeHint,
        ai_score: aiScoreSummary,
        compare_result: compareResult,
        lint_findings: lintFindings,
        platform: platformId || null,
        surface: platformRes?.surface || null,
        platform_findings: platformRes?.findings || [],
        ticket: ticketInfo,
        decisions: null,
        stamp_path: null,
        stamp_status: null,
        errors: ticketValidation.errors,
      };
    }
  }

  // Step 6: Gemini Decisions HTTP gate (or graceful offline fallback)
  const decisions = await runDecisionsGate(text, {
    config: cfg,
    noNetwork: opts.noDecisions === true,
    endpoint: opts.endpoint,
    env: opts.env,
    apiKey: opts.apiKey,
    timeoutMs: opts.timeoutMs,
  });

  let stampStatus = null;
  let roundsObserved = null;
  let ok = false;
  let exitCode = 1;
  let note = '';

  if (decisions.status === 'passed') {
    stampStatus = 'passed';
    ok = true;
    exitCode = 0;
  } else if (
    decisions.status === 'skipped_no_key'
    || decisions.status === 'skipped_secret_guard'
    || decisions.status === 'error_network'
    || decisions.status === 'skipped_disabled'
  ) {
    stampStatus = 'degraded_no_decisions';
    ok = true;
    exitCode = 0;
    note = `chưa chấm gate (${decisions.reason || decisions.error || decisions.status})`;
  } else {
    const hashes = recordGateAttempt(stampRoot, filePath, contentSha256, opts);
    roundsObserved = hashes.length;
    const explicitRound = opts.round !== undefined ? Number(opts.round) : undefined;
    if (hashes.length >= 3 && (explicitRound === undefined || explicitRound >= 2)) {
      stampStatus = 'delivered_after_max_rounds';
      ok = true;
      exitCode = 0;
      note = `đã qua >= 3 phiên bản sạch lỗi tất định (${hashes.length} hash); giao kèm cảnh báo tồn đọng`;
    }
  }

  if (!ok) {
    const failedList = decisions.flagged_defects?.length ? decisions.flagged_defects.join(', ') : 'none';
    const errMsg = `Gemini Decisions chưa đạt (rhythm=${decisions.rhythm_score_0_to_3}, flagged=[${failedList}]; vòng sạch đã ghi: ${roundsObserved}/3)`;
    return {
      ok: false,
      exitCode: 1,
      stage: 'decisions',
      file_path: filePath,
      config_path: projectCfg.path,
      content_sha256: contentSha256,
      words,
      route_hint: routeHint,
      compare_result: compareResult,
      lint_findings: lintFindings,
      platform: platformId || null,
      surface: platformRes?.surface || null,
      platform_findings: platformRes?.findings || [],
      ticket: ticketInfo,
      decisions,
      rounds_observed: roundsObserved,
      stamp_path: null,
      stamp_status: null,
      errors: [errMsg],
    };
  }

  const stampPath = writeStamp(stampRoot, {
    content_sha256: contentSha256,
    status: stampStatus,
    file_path: filePath || null,
    words,
    platform: platformId || null,
    surface: platformRes?.surface || null,
    route_hint: routeHint,
    decisions_status: decisions.status,
    rhythm_score_0_to_3: decisions.rhythm_score_0_to_3,
    flagged_defects: decisions.flagged_defects || [],
    ai_score_0_to_100: aiScoreRes.score,
    review_ticket_sha256: ticketSha256,
    rounds_observed: roundsObserved ?? getRecentDistinctAttempts(stampRoot, filePath).length,
  }, opts);

  return {
    ok: true,
    exitCode,
    stage: 'stamped',
    file_path: filePath,
    config_path: projectCfg.path,
    content_sha256: contentSha256,
    words,
    route_hint: routeHint,
    ai_score: aiScoreSummary,
    compare_result: compareResult,
    lint_findings: lintFindings,
    platform: platformId || null,
    surface: platformRes?.surface || null,
    platform_findings: platformRes?.findings || [],
    ticket: ticketInfo,
    decisions,
    note,
    rounds_observed: roundsObserved,
    stamp_root: stampRoot,
    stamp_path: stampPath,
    stamp_status: stampStatus,
    errors: [],
  };
}

export function formatGateReport(res) {
  const lines = [];
  const label = res.file_path || '<stdin>';
  for (const r of res.compare_result?.reviews || []) {
    lines.push(`REVIEW [${r.kind || 'context'}] ${JSON.stringify(r.token)}: "${r.before.join(' | ')}" -> "${r.after.join(' | ')}"`);
  }
  for (const f of res.lint_findings || []) {
    lines.push(`${f.level} ${label}:${f.line} [${f.id}] ${JSON.stringify(f.excerpt)}`);
  }
  for (const f of res.platform_findings || []) {
    lines.push(`${f.level} [${res.platform}/${res.surface}] ${f.field}: ${f.detail}`);
  }
  if (!res.ok) {
    for (const err of res.errors || []) {
      if (!lines.includes(err)) lines.push(`FAIL  ${err}`);
    }
    lines.push(`GATE FAIL [${res.stage}] — ${label} (sha256: ${String(res.content_sha256 || '').slice(0, 12)})`);
    return lines.join('\n');
  }

  const statusTag = res.stamp_status === 'passed'
    ? 'PASS'
    : res.stamp_status === 'delivered_after_max_rounds'
      ? 'WARN-PASS'
      : 'DEGRADED-PASS';
  const details = [
    `status=${res.stamp_status}`,
    `words=${res.words}`,
    `route=${res.route_hint}`,
  ];
  if (res.ai_score) {
    details.push(`ai_score=${res.ai_score.score}/100`);
  }
  if (res.decisions?.rhythm_score_0_to_3 !== null && res.decisions?.rhythm_score_0_to_3 !== undefined) {
    details.push(`rhythm=${res.decisions.rhythm_score_0_to_3}`);
  }
  if (res.decisions?.flagged_defects?.length) {
    details.push(`flagged=[${res.decisions.flagged_defects.join(',')}]`);
  }
  if (res.note) details.push(res.note);
  lines.push(`${statusTag}  ${label} — ${details.join(' · ')}`);
  if (res.stamp_path) lines.push(`STAMP ${res.stamp_path}`);
  return lines.join('\n');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export async function selfTest() {
  const { spawnSync } = await import('node:child_process');
  const { createServer } = await import('node:http');
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-gate-test-'));
  const cacheDir = join(tmp, 'cache');
  let server;

  try {
    // 1. Clean Git repo without root .gitignore stays git-clean on degraded_no_decisions
    const repo = join(tmp, 'repo');
    mkdirSync(join(repo, 'articles'), { recursive: true });
    const gitInit = spawnSync('git', ['init', '-q'], { cwd: repo, encoding: 'utf8' });
    assert(gitInit.status === 0, `git init failed: ${gitInit.stderr}`);

    const cleanFile = join(repo, 'articles', 'clean.md');
    writeFileSync(cleanFile, 'Bài viết này chia sẻ kinh nghiệm thực tế khi vận hành nhóm bán hàng.\n', 'utf8');
    spawnSync('git', ['add', 'articles/clean.md'], { cwd: repo });
    spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', 'init'], { cwd: repo });

    const offlineRes = await runGate({ filePath: cleanFile }, {
      cacheDir,
      env: { GEMINI_API_KEY: '', GOOGLE_API_KEY: '', VIET_PRO_NO_ENV_FILE: '1' },
    });
    assert(offlineRes.ok === true && offlineRes.exitCode === 0, `expected offline gate pass: ${JSON.stringify(offlineRes)}`);
    assert(offlineRes.stamp_status === 'degraded_no_decisions', `expected degraded_no_decisions, got ${offlineRes.stamp_status}`);
    assert(offlineRes.note.includes('chưa chấm gate'), 'offline degraded note must include "chưa chấm gate"');
    assert(existsSync(offlineRes.stamp_path), 'stamp file must exist');
    assert(!existsSync(join(repo, '.gitignore')), 'must NOT create root .gitignore when absent');
    const gitStatus = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
    assert(gitStatus.stdout.trim() === '', `expected clean git status, got: ${gitStatus.stdout}`);

    // Loopback mock server for short-circuit + pass + 3-round tests
    let httpHits = 0;
    let mode = 'pass';
    server = createServer(async (req, res) => {
      httpHits++;
      for await (const _ of req) { /* drain */ }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (mode === 'fail') {
        res.end(JSON.stringify({
          answers: {
            staccato_broetry: { noul: 0.7 },
            dialect_leak: { noul: 0.05 },
            forced_self_naming: { noul: 0.05 },
            artificial_dialogue: { noul: 0.05 },
            ai_slop_cliches: { noul: 0.05 },
            natural_rhythm: { score: 1.5 },
          },
        }));
        return;
      }
      res.end(JSON.stringify({
        answers: {
          staccato_broetry: { noul: 0.05 },
          dialect_leak: { noul: 0.05 },
          forced_self_naming: { noul: 0.05 },
          artificial_dialogue: { noul: 0.05 },
          ai_slop_cliches: { noul: 0.05 },
          natural_rhythm: { score: 2.7 },
        },
      }));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const endpoint = `http://127.0.0.1:${server.address().port}/v1beta/decisions`;
    const testEnv = { GEMINI_API_KEY: 'TEST_GATE_KEY_123456', VIET_PRO_NO_ENV_FILE: '1' };

    // 2. Deterministic lint ERROR short-circuits BEFORE Decisions HTTP
    const badLintFile = join(repo, 'articles', 'bad-lint.md');
    writeFileSync(badLintFile, 'Câu này sai dấu , vì có khoảng trắng.\n', 'utf8');
    const badLintRes = await runGate({ filePath: badLintFile }, { cacheDir, endpoint, env: testEnv });
    assert(badLintRes.ok === false && badLintRes.exitCode === 1 && badLintRes.stage === 'lint', 'lint ERROR must fail gate');
    assert(httpHits === 0 && !badLintRes.stamp_path, 'lint ERROR must short-circuit with 0 HTTP calls');

    // 3. Compare MISMATCH short-circuits BEFORE Decisions HTTP
    const cmpRes = await runGate({ filePath: cleanFile }, {
      cacheDir,
      endpoint,
      env: testEnv,
      beforeText: 'Doanh thu đạt 12% quý này.',
    });
    assert(cmpRes.ok === false && cmpRes.stage === 'compare' && httpHits === 0, 'compare mismatch must short-circuit');

    // 4. >= 800 words requires valid 02-review-ticket.md
    const longDir = join(repo, 'long-pkg');
    mkdirSync(longDir, { recursive: true });
    const longFile = join(longDir, 'final.md');
    const longBody = `${Array.from({ length: 850 }, (_, i) => `chữ${i}`).join(' ')}.\n`;
    writeFileSync(longFile, longBody, 'utf8');
    const longSha = sha256Of(readFileSync(longFile));

    const noTicketRes = await runGate({ filePath: longFile }, { cacheDir, endpoint, env: testEnv });
    assert(noTicketRes.ok === false && noTicketRes.stage === 'ticket' && httpHits === 0, '850-word draft without ticket must fail at ticket stage');

    // Invalid ticket (reviewer: self)
    const ticketFile = join(longDir, '02-review-ticket.md');
    const notes65 = Array.from({ length: 65 }, (_, i) => `ghi${i}`).join(' ');
    writeFileSync(ticketFile, `---\nverdict: DUYỆT NỘI DUNG\nreviewer: self\nreviewed_sha256: ${longSha}\n---\n\n${notes65}\n`, 'utf8');
    const selfReviewerRes = await runGate({ filePath: longFile }, { cacheDir, endpoint, env: testEnv });
    assert(selfReviewerRes.ok === false && selfReviewerRes.stage === 'ticket' && httpHits === 0, 'reviewer: self must be rejected');

    // Invalid ticket (wrong SHA)
    writeFileSync(ticketFile, `---\nverdict: DUYỆT NỘI DUNG\nreviewer: editor-doc-lap\nreviewed_sha256: deadbeef\n---\n\n${notes65}\n`, 'utf8');
    const badShaRes = await runGate({ filePath: longFile }, { cacheDir, endpoint, env: testEnv });
    assert(badShaRes.ok === false && badShaRes.stage === 'ticket' && httpHits === 0, 'wrong reviewed_sha256 must be rejected');

    // Valid ticket -> calls Decisions HTTP -> passed stamp
    writeFileSync(ticketFile, `---\nverdict: DUYỆT NỘI DUNG\nreviewer: editor-doc-lap\nreviewed_sha256: ${longSha}\n---\n\n${notes65}\n`, 'utf8');
    const passTicketRes = await runGate({ filePath: longFile }, { cacheDir, endpoint, env: testEnv });
    assert(passTicketRes.ok === true && passTicketRes.stamp_status === 'passed' && httpHits === 1, 'valid ticket must pass and write passed stamp');

    // 5. Anti-deadlock after 3 distinct clean hashes (>= original + 2 revision rounds)
    mode = 'fail';
    const loopFile = join(repo, 'articles', 'loop.md');
    writeFileSync(loopFile, 'Bản nháp vòng gốc chưa mượt lắm.\n', 'utf8');
    const r1 = await runGate({ filePath: loopFile }, { cacheDir, endpoint, env: testEnv });
    assert(r1.ok === false && r1.rounds_observed === 1, 'round 1 fail must not stamp');

    writeFileSync(loopFile, 'Bản nháp đã chỉnh sửa vòng một.\n', 'utf8');
    const r2 = await runGate({ filePath: loopFile }, { cacheDir, endpoint, env: testEnv });
    assert(r2.ok === false && r2.rounds_observed === 2, 'round 2 fail must not stamp');

    writeFileSync(loopFile, 'Bản nháp đã chỉnh sửa vòng hai.\n', 'utf8');
    const r3 = await runGate({ filePath: loopFile }, { cacheDir, endpoint, env: testEnv });
    assert(r3.ok === true && r3.stamp_status === 'delivered_after_max_rounds' && r3.rounds_observed === 3, 'round 3 (>= 3 distinct hashes) must issue delivered_after_max_rounds stamp');

    // 6. v6.2.0: --max-ai-score short-circuit, --no-house-style, and native .pptx gate
    const httpBeforeMax = httpHits;
    const aiSlopFile = join(repo, 'articles', 'slop.md');
    writeFileSync(aiSlopFile, 'Trong bối cảnh chuyển đổi số hiện nay, bài viết này sẽ phân tích bức tranh toàn cảnh.\n\nCòn bạn thì sao? Hãy để lại bình luận nhé!\n', 'utf8');
    const maxAiFail = await runGate({ filePath: aiSlopFile }, { cacheDir, endpoint, env: testEnv, maxAiScore: 15 });
    assert(maxAiFail.ok === false && maxAiFail.stage === 'lint' && httpHits === httpBeforeMax, 'maxAiScore exceeded must short-circuit at lint with 0 extra HTTP calls');

    const emDashFile = join(repo, 'articles', 'literary.md');
    writeFileSync(emDashFile, 'Câu văn tác phẩm — giữ dấu gạch ngang dài, và cấu trúc tự nhiên.\n', 'utf8');
    const noHsRes = await runGate({ filePath: emDashFile }, { cacheDir, noDecisions: true, houseStyle: false });
    assert(noHsRes.ok === true && noHsRes.lint_findings.length === 0, 'houseStyle: false must silence em-dash/oxford-comma in gate');

    const { buildTestPptxBuffer } = await import('./pptx.mjs');
    const deckFile = join(repo, 'articles', 'deck.pptx');
    writeFileSync(deckFile, buildTestPptxBuffer([
      { title: 'Kế hoạch quý IV năm 2026', body: ['Nhóm sản phẩm trình bày sáng thứ Hai'] },
      { title: 'Chi phí vận hành giảm 12% nhờ tối ưu lịch chạy máy', body: ['Thời gian chờ giảm từ 14 phút xuống 6 phút'] },
    ]));
    const pptxRes = await runGate({ filePath: deckFile }, { cacheDir, noDecisions: true });
    assert(pptxRes.ok === true && pptxRes.ai_score?.score === 0 && pptxRes.content_sha256 === sha256Of(readFileSync(deckFile)), 'clean .pptx must pass gate and stamp binary sha256');

    console.log('SELF-TEST PASS — gate.mjs (short-circuit lint/compare/maxAiScore, 02-review-ticket.md, houseStyle, .pptx, Decisions HTTP, 3-round cap, git-clean)');
  } finally {
    if (server) await new Promise((r) => server.close(r));
    rmSync(tmp, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--self-test')) {
    selfTest().then(() => process.exit(0)).catch((err) => {
      console.error(`SELF-TEST FAIL — ${err?.stack || err}`);
      process.exit(1);
    });
  } else {
    console.error('Usage: node gate.mjs --self-test');
    process.exit(2);
  }
}
