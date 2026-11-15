#!/usr/bin/env node
// OpenAI Codex runtime hook adapter for viet-pro editorial gate.
// Wire contract: snake_case stdin (hook_event_name, session_id, cwd, tool_name, tool_input, stop_hook_active).
// Output: PreToolUse deny -> exit 0 + EMPTY stderr + ASCII-escaped JSON hookSpecificOutput on stdout
//         Stop -> strict {"continue":true} or {"continue":true,"systemMessage":"..."} with exit 0

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateHookEvent } from './editorial-hook.mjs';
import { resolveStampRoot, sha256Of, writeStamp } from '../lib/stamp.mjs';

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function wellFormed(reason) {
  return String(reason).replace(LONE_SURROGATE, '\uFFFD');
}

export function asciiJson(value) {
  return JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

export function normalizeCodexPayload(payload = {}) {
  const input = payload.tool_input && typeof payload.tool_input === 'object' ? payload.tool_input : {};
  const commandLine = typeof input.command === 'string' ? input.command : '';
  const filePath = input.file_path || input.path || '';

  return {
    host: 'codex',
    event: typeof payload.hook_event_name === 'string' ? payload.hook_event_name : '',
    sessionId: typeof payload.session_id === 'string' && payload.session_id ? payload.session_id : 'default',
    cwd: typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd(),
    loopGuardActive: Boolean(payload.stop_hook_active),
    toolName: typeof payload.tool_name === 'string' ? payload.tool_name : '',
    args: input,
    commandLine,
    filePath: typeof filePath === 'string' ? filePath : '',
  };
}

export function handleCodexPayload(payload = {}, opts = {}) {
  const normalized = normalizeCodexPayload(payload);
  const res = evaluateHookEvent(normalized, opts);

  if (normalized.event === 'PreToolUse') {
    if (res.action === 'deny') {
      const out = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: wellFormed(res.reason),
        },
      };
      return { exitCode: 0, stdout: `${asciiJson(out)}\n`, stderr: '' };
    }
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  if (normalized.event === 'PostToolUse') {
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  if (normalized.event === 'Stop') {
    const out = res.action === 'remind'
      ? { continue: true, systemMessage: wellFormed(res.reason) }
      : { continue: true };
    return { exitCode: 0, stdout: `${asciiJson(out)}\n`, stderr: '' };
  }

  return { exitCode: 0, stdout: '', stderr: '' };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function selfTest() {
  const selfPath = fileURLToPath(import.meta.url);
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-codex-hook-'));
  const cacheDir = join(tmp, 'cache');

  try {
    const repo = join(tmp, 'repo');
    mkdirSync(join(repo, 'published'), { recursive: true });
    const draft = join(repo, 'published', 'tin-tuc.md');
    writeFileSync(draft, 'Bài viết tiếng Việt kiểm thử Codex hook.\n', 'utf8');

    const runCli = (payload) =>
      spawnSync(process.execPath, [selfPath], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
        env: { ...process.env, VIET_PRO_CACHE_DIR: cacheDir },
      });

    // PostToolUse Edit
    const post = runCli({
      hook_event_name: 'PostToolUse',
      session_id: 'codex-sess-1',
      cwd: repo,
      tool_name: 'Edit',
      tool_input: { file_path: draft },
    });
    assert(post.status === 0 && post.stderr === '', 'PostToolUse must exit 0 with empty stderr');

    // PreToolUse unstamped -> exit 0 + EMPTY stderr + ASCII-escaped JSON hookSpecificOutput
    const preDeny = runCli({
      hook_event_name: 'PreToolUse',
      session_id: 'codex-sess-1',
      cwd: repo,
      tool_name: 'Bash',
      tool_input: { command: 'tqd-publish published/tin-tuc.md' },
    });
    assert(preDeny.status === 0, `Codex PreToolUse deny must exit 0, got ${preDeny.status}`);
    assert(preDeny.stderr === '', `Codex PreToolUse stderr must be empty, got: ${preDeny.stderr}`);
    assert(/^[\x20-\x7e\r\n]+$/u.test(preDeny.stdout), 'Codex stdout must be printable ASCII');
    const preDenyJson = JSON.parse(preDeny.stdout);
    assert(
      preDenyJson?.hookSpecificOutput?.hookEventName === 'PreToolUse' &&
      preDenyJson?.hookSpecificOutput?.permissionDecision === 'deny' &&
      String(preDenyJson?.hookSpecificOutput?.permissionDecisionReason || '').includes('VIET-PRO GATE BLOCK'),
      `unexpected Codex PreToolUse JSON: ${preDeny.stdout}`,
    );

    // Stop without stop_hook_active -> strict {continue:true, systemMessage}
    const stopRemind = runCli({
      hook_event_name: 'Stop',
      session_id: 'codex-sess-1',
      cwd: repo,
      stop_hook_active: false,
    });
    assert(stopRemind.status === 0 && stopRemind.stderr === '', 'Stop must exit 0 with empty stderr');
    assert(/^[\x20-\x7e\r\n]+$/u.test(stopRemind.stdout), 'Codex Stop stdout must be printable ASCII');
    const stopRemindJson = JSON.parse(stopRemind.stdout);
    const remindKeys = Object.keys(stopRemindJson).sort();
    assert(
      remindKeys.length === 2 && remindKeys[0] === 'continue' && remindKeys[1] === 'systemMessage' && stopRemindJson.continue === true,
      `unexpected Codex Stop keys: ${stopRemind.stdout}`,
    );

    // Stop with stop_hook_active: true -> strict {continue:true}
    const stopLoop = runCli({
      hook_event_name: 'Stop',
      session_id: 'codex-sess-1',
      cwd: repo,
      stop_hook_active: true,
    });
    const stopLoopJson = JSON.parse(stopLoop.stdout);
    const loopKeys = Object.keys(stopLoopJson);
    assert(
      stopLoop.status === 0 && stopLoop.stderr === '' && loopKeys.length === 1 && loopKeys[0] === 'continue' && stopLoopJson.continue === true,
      `stop_hook_active:true must emit strict {continue:true}, got ${stopLoop.stdout}`,
    );

    // Lone surrogate hygiene and emoji surrogate-pair ASCII escaping
    const sanitized = wellFormed('bad\uD800path');
    assert(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(sanitized) && sanitized === 'bad\uFFFDpath', 'wellFormed must replace lone surrogates');
    const emojiJson = asciiJson({ msg: 'Tiếng Việt 😀' });
    assert(/^[\x20-\x7e]+$/.test(emojiJson) && JSON.parse(emojiJson).msg === 'Tiếng Việt 😀', 'asciiJson must escape emoji surrogate pairs cleanly');

    // Stamp -> PreToolUse allow
    const stampRoot = resolveStampRoot(draft, { cacheDir });
    writeStamp(stampRoot, { content_sha256: sha256Of(readFileSync(draft)), status: 'delivered_after_max_rounds' });
    const preAllow = runCli({
      hook_event_name: 'PreToolUse',
      session_id: 'codex-sess-1',
      cwd: repo,
      tool_name: 'Bash',
      tool_input: { command: 'tqd-publish published/tin-tuc.md' },
    });
    assert(preAllow.status === 0 && preAllow.stderr === '' && preAllow.stdout === '', 'stamped PreToolUse must allow silently');

    console.log('SELF-TEST PASS — codex-hook.mjs');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  if (process.argv.includes('--self-test')) {
    try {
      selfTest();
      process.exit(0);
    } catch (err) {
      console.error(`SELF-TEST FAIL — ${err?.stack || err}`);
      process.exit(1);
    }
  }

  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    process.exit(0);
  }

  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }

  try {
    const res = handleCodexPayload(payload);
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    process.exit(res.exitCode);
  } catch {
    if (payload?.hook_event_name === 'Stop') process.stdout.write('{"continue":true}\n');
    process.exit(0);
  }
}

const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) main();
