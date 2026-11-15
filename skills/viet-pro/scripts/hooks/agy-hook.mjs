#!/usr/bin/env node
// Antigravity runtime hook adapter for viet-pro editorial gate.
// Wire contract: camelCase stdin (hookEventName, conversationId, cwd, toolCall, continuationActive).
// Output: PreToolUse -> {"decision":"allow"} | {"decision":"deny","reason":"..."}
//         PostToolUse -> {}
//         Stop -> {"decision":"allow"} | {"decision":"continue","reason":"..."}

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateHookEvent } from './editorial-hook.mjs';
import { resolveStampRoot, sha256Of, writeStamp } from '../lib/stamp.mjs';

export function normalizeAgyPayload(payload = {}) {
  const toolCall = payload.toolCall && typeof payload.toolCall === 'object' ? payload.toolCall : {};
  const args = toolCall.args && typeof toolCall.args === 'object' ? toolCall.args : {};
  const commandLine =
    typeof args.CommandLine === 'string'
      ? args.CommandLine
      : typeof args.command === 'string'
        ? args.command
        : '';
  const filePath = args.AbsolutePath || args.TargetFile || args.file_path || args.path || args.Path || '';

  return {
    host: 'agy',
    event: typeof payload.hookEventName === 'string' ? payload.hookEventName : '',
    sessionId: typeof payload.conversationId === 'string' && payload.conversationId ? payload.conversationId : 'default',
    cwd: typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd(),
    loopGuardActive: Boolean(payload.continuationActive),
    toolName: typeof toolCall.name === 'string' ? toolCall.name : '',
    args,
    commandLine,
    filePath: typeof filePath === 'string' ? filePath : '',
    error: typeof payload.error === 'string' ? payload.error : '',
  };
}

export function handleAgyPayload(payload = {}, opts = {}) {
  const normalized = normalizeAgyPayload(payload);
  const res = evaluateHookEvent(normalized, opts);

  if (normalized.event === 'PreToolUse') {
    if (res.action === 'deny') {
      return { exitCode: 0, stdout: `${JSON.stringify({ decision: 'deny', reason: res.reason })}\n`, stderr: '' };
    }
    return { exitCode: 0, stdout: `${JSON.stringify({ decision: 'allow' })}\n`, stderr: '' };
  }

  if (normalized.event === 'PostToolUse') {
    return { exitCode: 0, stdout: '{}\n', stderr: '' };
  }

  if (normalized.event === 'Stop') {
    if (res.action === 'remind') {
      return { exitCode: 0, stdout: `${JSON.stringify({ decision: 'continue', reason: res.reason })}\n`, stderr: '' };
    }
    return { exitCode: 0, stdout: `${JSON.stringify({ decision: 'allow' })}\n`, stderr: '' };
  }

  return { exitCode: 0, stdout: '{}\n', stderr: '' };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function selfTest() {
  const selfPath = fileURLToPath(import.meta.url);
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-agy-hook-'));
  const cacheDir = join(tmp, 'cache');

  try {
    const repo = join(tmp, 'repo');
    mkdirSync(join(repo, 'drafts'), { recursive: true });
    const draft = join(repo, 'drafts', 'post.md');
    writeFileSync(draft, '---\nplatform: facebook\n---\n\nBài viết tiếng Việt kiểm thử Antigravity.\n', 'utf8');

    const runCli = (payload) =>
      spawnSync(process.execPath, [selfPath], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
        env: { ...process.env, VIET_PRO_CACHE_DIR: cacheDir },
      });

    // PostToolUse write_to_file
    const post = runCli({
      hookEventName: 'PostToolUse',
      conversationId: 'agy-conv-1',
      cwd: repo,
      toolCall: { name: 'write_to_file', args: { TargetFile: draft } },
    });
    assert(post.status === 0 && post.stdout.trim() === '{}', `unexpected PostToolUse: ${post.stdout}`);

    // PreToolUse unstamped -> deny
    const preDeny = runCli({
      hookEventName: 'PreToolUse',
      conversationId: 'agy-conv-1',
      cwd: repo,
      toolCall: { name: 'run_command', args: { CommandLine: 'tqd-publish drafts/post.md' } },
    });
    assert(preDeny.status === 0, 'PreToolUse deny should exit 0 on agy');
    const preDenyJson = JSON.parse(preDeny.stdout);
    assert(preDenyJson.decision === 'deny' && preDenyJson.reason.includes('VIET-PRO GATE BLOCK'), 'expected decision=deny');

    // Stop without continuationActive -> continue
    const stopRemind = runCli({
      hookEventName: 'Stop',
      conversationId: 'agy-conv-1',
      cwd: repo,
      continuationActive: false,
    });
    const stopRemindJson = JSON.parse(stopRemind.stdout);
    assert(stopRemind.status === 0 && stopRemindJson.decision === 'continue' && stopRemindJson.reason, 'expected decision=continue');

    // Stop with continuationActive: true -> allow
    const stopLoop = runCli({
      hookEventName: 'Stop',
      conversationId: 'agy-conv-1',
      cwd: repo,
      continuationActive: true,
    });
    const stopLoopJson = JSON.parse(stopLoop.stdout);
    assert(stopLoop.status === 0 && stopLoopJson.decision === 'allow', 'continuationActive:true must force allow');

    // Stamp -> PreToolUse allow
    const stampRoot = resolveStampRoot(draft, { cacheDir });
    writeStamp(stampRoot, { content_sha256: sha256Of(readFileSync(draft)), status: 'passed' });
    const preAllow = runCli({
      hookEventName: 'PreToolUse',
      conversationId: 'agy-conv-1',
      cwd: repo,
      toolCall: { name: 'run_command', args: { CommandLine: 'tqd-publish drafts/post.md' } },
    });
    assert(preAllow.status === 0 && JSON.parse(preAllow.stdout).decision === 'allow', 'stamped PreToolUse must allow');

    console.log('SELF-TEST PASS — agy-hook.mjs');
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
    process.stdout.write('{}\n');
    process.exit(0);
  }

  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write('{}\n');
    process.exit(0);
  }

  try {
    const res = handleAgyPayload(payload);
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    process.exit(res.exitCode);
  } catch {
    const ev = payload?.hookEventName;
    if (ev === 'PreToolUse' || ev === 'Stop') process.stdout.write('{"decision":"allow"}\n');
    else process.stdout.write('{}\n');
    process.exit(0);
  }
}

const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) main();
