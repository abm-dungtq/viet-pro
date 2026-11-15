#!/usr/bin/env node
// Claude Code runtime hook adapter for viet-pro editorial gate.
// Wire contract: snake_case stdin (hook_event_name, session_id, cwd, tool_name, tool_input, stop_hook_active).
// Output: PreToolUse deny -> stderr + exit 2; allow -> exit 0
//         Stop -> strict {"continue":true} or {"continue":true,"systemMessage":"..."} with exit 0

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateHookEvent } from './editorial-hook.mjs';
import { resolveStampRoot, sha256Of, writeStamp } from '../lib/stamp.mjs';

export function normalizeClaudePayload(payload = {}) {
  const input = payload.tool_input && typeof payload.tool_input === 'object' ? payload.tool_input : {};
  const commandLine = typeof input.command === 'string' ? input.command : '';
  const filePath = input.file_path || input.path || '';

  return {
    host: 'claude',
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

export function handleClaudePayload(payload = {}, opts = {}) {
  const normalized = normalizeClaudePayload(payload);
  const res = evaluateHookEvent(normalized, opts);

  if (normalized.event === 'PreToolUse') {
    if (res.action === 'deny') {
      return { exitCode: 2, stdout: '', stderr: `${res.reason}\n` };
    }
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  if (normalized.event === 'PostToolUse') {
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  if (normalized.event === 'Stop') {
    const out = res.action === 'remind'
      ? { continue: true, systemMessage: res.reason }
      : { continue: true };
    return { exitCode: 0, stdout: `${JSON.stringify(out)}\n`, stderr: '' };
  }

  return { exitCode: 0, stdout: '', stderr: '' };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function selfTest() {
  const selfPath = fileURLToPath(import.meta.url);
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-claude-hook-'));
  const cacheDir = join(tmp, 'cache');

  try {
    const repo = join(tmp, 'repo');
    mkdirSync(join(repo, 'articles'), { recursive: true });
    const draft = join(repo, 'articles', 'bai-viet.md');
    writeFileSync(draft, 'Bài viết tiếng Việt kiểm thử Claude Code hook.\n', 'utf8');

    const runCli = (payload) =>
      spawnSync(process.execPath, [selfPath], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
        env: { ...process.env, VIET_PRO_CACHE_DIR: cacheDir },
      });

    // PostToolUse Write
    const post = runCli({
      hook_event_name: 'PostToolUse',
      session_id: 'claude-sess-1',
      cwd: repo,
      tool_name: 'Write',
      tool_input: { file_path: draft },
    });
    assert(post.status === 0 && post.stderr === '', 'PostToolUse must exit 0');

    // PreToolUse unstamped -> stderr + exit 2
    const preDeny = runCli({
      hook_event_name: 'PreToolUse',
      session_id: 'claude-sess-1',
      cwd: repo,
      tool_name: 'Bash',
      tool_input: { command: 'tqd-publish articles/bai-viet.md' },
    });
    assert(preDeny.status === 2, `Claude PreToolUse deny must exit 2, got ${preDeny.status}`);
    assert(preDeny.stderr.includes('VIET-PRO GATE BLOCK') && preDeny.stdout === '', 'deny must write reason to stderr only');

    // Stop without stop_hook_active -> strict {continue:true, systemMessage}
    const stopRemind = runCli({
      hook_event_name: 'Stop',
      session_id: 'claude-sess-1',
      cwd: repo,
      stop_hook_active: false,
    });
    const stopRemindJson = JSON.parse(stopRemind.stdout);
    const remindKeys = Object.keys(stopRemindJson).sort();
    assert(stopRemind.status === 0, 'Stop must exit 0');
    assert(
      remindKeys.length === 2 && remindKeys[0] === 'continue' && remindKeys[1] === 'systemMessage' && stopRemindJson.continue === true,
      `unexpected Stop keys: ${JSON.stringify(stopRemindJson)}`,
    );

    // Stop with stop_hook_active: true -> strict {continue:true}
    const stopLoop = runCli({
      hook_event_name: 'Stop',
      session_id: 'claude-sess-1',
      cwd: repo,
      stop_hook_active: true,
    });
    const stopLoopJson = JSON.parse(stopLoop.stdout);
    const loopKeys = Object.keys(stopLoopJson);
    assert(
      stopLoop.status === 0 && loopKeys.length === 1 && loopKeys[0] === 'continue' && stopLoopJson.continue === true,
      `stop_hook_active:true must emit strict {continue:true}, got ${stopLoop.stdout}`,
    );

    // Stamp -> PreToolUse exit 0
    const stampRoot = resolveStampRoot(draft, { cacheDir });
    writeStamp(stampRoot, { content_sha256: sha256Of(readFileSync(draft)), status: 'degraded_no_decisions' });
    const preAllow = runCli({
      hook_event_name: 'PreToolUse',
      session_id: 'claude-sess-1',
      cwd: repo,
      tool_name: 'Bash',
      tool_input: { command: 'tqd-publish articles/bai-viet.md' },
    });
    assert(preAllow.status === 0 && preAllow.stderr === '', 'stamped PreToolUse must exit 0');

    console.log('SELF-TEST PASS — claude-hook.mjs');
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
    const res = handleClaudePayload(payload);
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
