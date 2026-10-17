#!/usr/bin/env node
// MCP server over stdio: exposes lint, fact-preservation compare and platform checks as read-only tools.
// Usage: node mcp-server.mjs            (serve newline-delimited JSON-RPC 2.0 on stdin/stdout)
//        node mcp-server.mjs --self-test
// Speaks both MCP eras: modern (2026-07-28: no handshake, `server/discover`, version in request `_meta`)
// and legacy clients that open with `initialize`. stdout carries only JSON-RPC messages; logs go to stderr.
// The tools take text only: no file paths from the client, no file writes, no network.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { compare } from './lib/compare.mjs';
import { lintText } from './lib/lint.mjs';
import { checkDraft, listPlatformIds, loadProfile, splitDraft, validateProfile } from './lib/profile.mjs';

const SELF = fileURLToPath(import.meta.url);
const SKILL_DIR = join(dirname(SELF), '..');
const PROFILE_DIR = join(SKILL_DIR, 'references/publishing');
const MODERN_VERSIONS = ['2026-07-28'];
const LEGACY_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];
const SUPPORTED_VERSIONS = [...MODERN_VERSIONS, ...LEGACY_VERSIONS].sort().reverse();
const LEGACY_DEFAULT = '2025-11-25';
const VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const MAX_TEXT_BYTES = 1024 * 1024;
// Modern clients require caching hints on server/discover and tools/list; the tool list is fixed per release.
const CACHE_HINTS = { ttlMs: 3600000, cacheScope: 'public' };
const PLATFORM_ID = /^[a-z0-9-]+$/u;
const INSTRUCTIONS = 'Công cụ kiểm tra văn bản tiếng Việt của viet-pro: lint_vietnamese tìm dấu hiệu văn AI, '
  + 'compare_preserved đối chiếu dữ kiện giữa bản trước và bản sau khi sửa, check_platform đo bản thảo theo giới hạn của từng kênh. '
  + 'Chỉ nhận văn bản, không đọc file.';

function readVersion() {
  try {
    const m = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8').match(/^ {2}version: "([^"]+)"$/mu);
    if (m) return m[1];
    console.error('viet-pro mcp: không thấy metadata.version trong SKILL.md');
  } catch (e) {
    console.error(`viet-pro mcp: không đọc được SKILL.md: ${e.message}`);
  }
  return 'unknown';
}
const SERVER_INFO = { name: 'viet-pro', version: readVersion() };

const KEEP_SCHEMA = {
  type: 'array',
  items: { type: 'string' },
  description: 'Tên riêng, thương hiệu, thuật ngữ phải giữ nguyên (khớp nguyên từ).',
};
const TOOLS = [
  {
    name: 'lint_vietnamese',
    title: 'Lint văn bản tiếng Việt',
    description: 'Tìm dấu hiệu văn AI và lỗi trình bày trong văn bản tiếng Việt (Markdown). Trả về danh sách phát hiện theo dòng.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Văn bản cần kiểm tra, tối đa 1 MB.' },
        keep: KEEP_SCHEMA,
      },
      required: ['text'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'compare_preserved',
    title: 'Đối chiếu dữ kiện trước/sau',
    description: 'So bản trước và bản sau khi biên tập: URL, số liệu, ngày, trích dẫn, xếp hạng, chuỗi cần giữ và chiều tăng/giảm quanh số liệu. Trả về các khác biệt và các chỗ cần xem lại.',
    inputSchema: {
      type: 'object',
      properties: {
        before: { type: 'string', description: 'Bản gốc, tối đa 1 MB.' },
        after: { type: 'string', description: 'Bản đã sửa, tối đa 1 MB.' },
        keep: KEEP_SCHEMA,
        strict_quotes: { type: 'boolean', description: 'Coi đổi kiểu dấu ngoặc kép (thẳng/cong) là khác biệt.' },
      },
      required: ['before', 'after'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'check_platform',
    title: 'Kiểm tra bản thảo theo kênh',
    description: 'Đo bản thảo theo giới hạn trong hồ sơ kênh (cách đếm riêng của từng nền tảng). Bản thảo nhiều trường dùng các tiêu đề "## title", "## description", "## caption", "## body"; không có tiêu đề thì cả văn bản là body. Mức ERROR là vượt giới hạn có tài liệu, WARN là giới hạn truyền miệng hoặc điểm gập "Xem thêm".',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', pattern: '^[a-z0-9-]+$', description: 'Mã kênh, ví dụ facebook, x-thread, threads.' },
        text: { type: 'string', description: 'Bản thảo, tối đa 1 MB.' },
        surface: { type: 'string', description: 'Bề mặt trong hồ sơ kênh (ví dụ post, video). Mặc định là bề mặt đầu tiên.' },
      },
      required: ['platform', 'text'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
];

class InputError extends Error {}

function text(args, key, { optional = false } = {}) {
  const v = args[key];
  if (v === undefined && optional) return undefined;
  if (typeof v !== 'string') throw new InputError(`"${key}" phải là chuỗi`);
  if (Buffer.byteLength(v, 'utf8') > MAX_TEXT_BYTES) throw new InputError(`"${key}" vượt 1 MB`);
  return v;
}

function keepList(args) {
  if (args.keep === undefined) return [];
  if (!Array.isArray(args.keep) || !args.keep.every((k) => typeof k === 'string')) throw new InputError('"keep" phải là mảng chuỗi');
  if (Buffer.byteLength(args.keep.join(''), 'utf8') > MAX_TEXT_BYTES) throw new InputError('"keep" vượt 1 MB');
  return args.keep;
}

function rejectUnknown(args, allowed) {
  const extra = Object.keys(args).filter((k) => !allowed.includes(k));
  if (extra.length) throw new InputError(`tham số lạ: ${extra.join(', ')}`);
}

const HANDLERS = {
  lint_vietnamese(args) {
    rejectUnknown(args, ['text', 'keep']);
    const findings = lintText(text(args, 'text'), { keep: keepList(args) });
    return { clean: findings.length === 0, findings };
  },
  compare_preserved(args) {
    rejectUnknown(args, ['before', 'after', 'keep', 'strict_quotes']);
    if (args.strict_quotes !== undefined && typeof args.strict_quotes !== 'boolean') throw new InputError('"strict_quotes" phải là boolean');
    const { differences, reviews } = compare(text(args, 'before'), text(args, 'after'), keepList(args), { strictQuotes: args.strict_quotes === true });
    return { preserved: differences.length === 0, differences, reviews };
  },
  check_platform(args) {
    rejectUnknown(args, ['platform', 'text', 'surface']);
    const platform = text(args, 'platform');
    const ids = listPlatformIds(PROFILE_DIR);
    if (!PLATFORM_ID.test(platform) || !ids.includes(platform)) throw new InputError(`không có hồ sơ kênh "${platform}"; chọn: ${ids.join(', ')}`);
    const draft = text(args, 'text');
    const surface = text(args, 'surface', { optional: true });
    let profile;
    try {
      profile = loadProfile(PROFILE_DIR, platform);
    } catch (e) {
      throw new InputError(`hồ sơ kênh "${platform}" không đọc được: ${e.message}`);
    }
    const problems = validateProfile(profile, platform);
    if (problems.length) throw new InputError(`hồ sơ kênh "${platform}" chưa đúng schema: ${problems.join('; ')}`);
    let result;
    try {
      result = checkDraft(profile, splitDraft(draft), { surface });
    } catch (e) {
      throw new InputError(e.message);
    }
    return { platform, pass: !result.findings.some((f) => f.level === 'ERROR'), ...result };
  },
};

function callTool(params) {
  const handler = Object.hasOwn(HANDLERS, params?.name) ? HANDLERS[params.name] : null;
  if (!handler) return { error: { code: -32602, message: `Unknown tool: ${params?.name}` } };
  const args = params.arguments ?? {};
  const textResult = (value, isError) => ({ result: { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }], isError } });
  if (typeof args !== 'object' || Array.isArray(args) || args === null) return textResult('"arguments" phải là object', true);
  try {
    return textResult(handler(args), false);
  } catch (e) {
    if (e instanceof InputError) return textResult(e.message, true);
    throw e;
  }
}

// Returns { result } or { error } for a request, or null for a notification.
function handle(msg) {
  const { method, params } = msg;
  const requested = params?._meta?.[VERSION_KEY];
  if (requested !== undefined && !SUPPORTED_VERSIONS.includes(requested)) {
    return { error: { code: -32022, message: 'Unsupported protocol version', data: { supported: SUPPORTED_VERSIONS, requested } } };
  }
  const modern = requested !== undefined;
  const complete = (result) => ({ result: modern ? { resultType: 'complete', ...result } : result });
  switch (method) {
    case 'server/discover':
      return {
        result: {
          resultType: 'complete',
          supportedVersions: SUPPORTED_VERSIONS,
          capabilities: { tools: {} },
          _meta: { 'io.modelcontextprotocol/serverInfo': SERVER_INFO },
          instructions: INSTRUCTIONS,
          ...CACHE_HINTS,
        },
      };
    case 'initialize': {
      const asked = params?.protocolVersion;
      return {
        result: {
          protocolVersion: LEGACY_VERSIONS.includes(asked) ? asked : LEGACY_DEFAULT,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        },
      };
    }
    case 'ping': return complete({});
    case 'tools/list': return complete(modern ? { tools: TOOLS, ...CACHE_HINTS } : { tools: TOOLS });
    case 'tools/call': {
      if (typeof params?.name !== 'string') return { error: { code: -32602, message: 'tools/call cần params.name' } };
      const out = callTool(params);
      return out.error ? out : complete(out.result);
    }
    default: return { error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

function send(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function onLine(line) {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  const isObject = msg !== null && typeof msg === 'object' && !Array.isArray(msg);
  const hasId = isObject && Object.hasOwn(msg, 'id');
  const validId = hasId && (typeof msg.id === 'string' || typeof msg.id === 'number');
  if (!isObject || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || (hasId && !validId)) {
    // Responses from the client (result/error without method) carry nothing this server asked for.
    if (isObject && msg.jsonrpc === '2.0' && msg.method === undefined && ('result' in msg || 'error' in msg)) return;
    send({ jsonrpc: '2.0', id: validId ? msg.id : null, error: { code: -32600, message: 'Invalid Request' } });
    return;
  }
  if (!hasId) return; // notifications (notifications/initialized, notifications/cancelled, ...) need no reply
  let out;
  try {
    out = handle(msg);
  } catch (e) {
    console.error(`viet-pro mcp: ${msg.method} lỗi: ${e.stack || e.message}`);
    out = { error: { code: -32603, message: `Internal error: ${e.message}` } };
  }
  send({ jsonrpc: '2.0', id: msg.id, ...out });
}

function serve() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', onLine);
  // On stdin EOF, let pending stdout writes drain; the process then exits on its own.
  process.stdout.on('error', (e) => {
    if (e.code !== 'EPIPE') console.error(`viet-pro mcp: stdout lỗi: ${e.message}`);
    process.exit(0);
  });
  console.error(`viet-pro mcp ${SERVER_INFO.version} sẵn sàng trên stdio`);
}

async function selfTest() {
  const fail = (msg) => { console.error(`SELF-TEST FAIL — ${msg}`); process.exit(1); };
  const meta = { _meta: { [VERSION_KEY]: '2026-07-28' } };
  const lines = [
    { jsonrpc: '2.0', id: 'list-first', method: 'tools/list' },
    { jsonrpc: '2.0', id: 'discover', method: 'server/discover', params: meta },
    { jsonrpc: '2.0', id: 'list-modern', method: 'tools/list', params: meta },
    { jsonrpc: '2.0', id: 'bad-version', method: 'tools/list', params: { _meta: { [VERSION_KEY]: '1900-01-01' } } },
    { jsonrpc: '2.0', id: 'init', method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'self-test', version: '0' } } },
    { jsonrpc: '2.0', id: 'init-new', method: 'initialize', params: { protocolVersion: '2030-01-01', capabilities: {}, clientInfo: { name: 'self-test', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 'ping', method: 'ping', params: meta },
    { jsonrpc: '2.0', id: 'lint', method: 'tools/call', params: { name: 'lint_vietnamese', arguments: { text: 'Chắc chắn rồi! Dưới đây là bài viết.\n' } } },
    { jsonrpc: '2.0', id: 'compare', method: 'tools/call', params: { ...meta, name: 'compare_preserved', arguments: { before: 'Doanh thu tăng 20% năm 2025.', after: 'Doanh thu giảm 20% năm 2025.' } } },
    { jsonrpc: '2.0', id: 'platform', method: 'tools/call', params: { name: 'check_platform', arguments: { platform: 'facebook', text: 'Bài đăng ngắn.' } } },
    { jsonrpc: '2.0', id: 'traversal', method: 'tools/call', params: { name: 'check_platform', arguments: { platform: '../SKILL', text: 'x' } } },
    { jsonrpc: '2.0', id: 'too-big', method: 'tools/call', params: { name: 'lint_vietnamese', arguments: { text: 'a'.repeat(MAX_TEXT_BYTES + 1) } } },
    { jsonrpc: '2.0', id: 'no-tool', method: 'tools/call', params: { name: 'read_file', arguments: {} } },
    { jsonrpc: '2.0', id: 'unknown', method: 'resources/list' },
  ];
  const child = spawn(process.execPath, [SELF], { stdio: ['pipe', 'pipe', 'pipe'] });
  const timer = setTimeout(() => { child.kill(); fail('server không trả lời trong 15 giây'); }, 15000);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  child.stdin.write(`${lines.map((l) => JSON.stringify(l)).join('\n')}\n{not json\n`);
  child.stdin.end();
  const code = await new Promise((resolve) => child.on('close', resolve));
  clearTimeout(timer);
  if (code !== 0) fail(`server thoát với mã ${code}: ${stderr}`);

  const replies = stdout.split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return fail(`stdout có dòng không phải JSON: ${l.slice(0, 80)}`); }
  });
  const byId = new Map(replies.map((r) => [r.id, r]));
  const expected = lines.filter((l) => 'id' in l).length + 1;
  if (replies.length !== expected) fail(`cần ${expected} phản hồi (notification không được trả lời), nhận ${replies.length}`);
  const get = (id) => byId.get(id) || fail(`thiếu phản hồi cho ${id}`);
  const toolText = (id) => {
    const r = get(id).result;
    if (!r || r.content?.[0]?.type !== 'text') fail(`${id}: thiếu content text`);
    return r;
  };

  const list = get('list-first').result;
  if (list?.tools?.map((t) => t.name).join() !== 'lint_vietnamese,compare_preserved,check_platform') fail('tools/list khi chưa initialize không trả đủ 3 tool');
  if (!list.tools.every((t) => t.inputSchema?.type === 'object' && t.annotations?.readOnlyHint === true)) fail('tool thiếu inputSchema hoặc readOnlyHint');
  const listModern = get('list-modern').result;
  if (listModern?.resultType !== 'complete' || listModern.tools?.length !== 3 || listModern.ttlMs !== CACHE_HINTS.ttlMs || listModern.cacheScope !== 'public') fail('tools/list kiểu mới thiếu resultType hoặc ttlMs/cacheScope');
  const discover = get('discover').result;
  if (discover?.resultType !== 'complete' || discover.ttlMs !== CACHE_HINTS.ttlMs || discover.cacheScope !== 'public' || !discover.supportedVersions?.includes('2026-07-28') || !discover.capabilities?.tools
    || discover._meta?.['io.modelcontextprotocol/serverInfo']?.version !== SERVER_INFO.version) fail('server/discover sai shape');
  const bad = get('bad-version').error;
  if (bad?.code !== -32022 || bad.data?.requested !== '1900-01-01' || !bad.data?.supported?.includes('2026-07-28')) fail('phiên bản lạ không trả -32022');
  const init = get('init').result;
  if (init?.protocolVersion !== '2025-06-18' || init.serverInfo?.name !== 'viet-pro' || !init.capabilities?.tools) fail('initialize không trả lại phiên bản client hoặc thiếu serverInfo');
  if (get('init-new').result?.protocolVersion !== LEGACY_DEFAULT) fail(`initialize với phiên bản lạ phải trả ${LEGACY_DEFAULT}`);
  if (JSON.stringify(get('ping').result) !== '{"resultType":"complete"}') fail('ping sai');

  const lint = toolText('lint');
  if (lint.isError !== false || !JSON.parse(lint.content[0].text).findings.some((f) => f.id === 'chatbot-residue')) fail('lint_vietnamese không bắt được chatbot-residue');
  const cmp = toolText('compare');
  if (cmp.isError !== false || cmp.resultType !== 'complete' || JSON.parse(cmp.content[0].text).preserved !== false) fail('compare_preserved không bắt được tăng→giảm');
  // facebook.md may or may not be converted to the profile schema yet; accept both, but never a protocol error.
  const plat = toolText('platform');
  if (plat.isError === false) {
    const body = JSON.parse(plat.content[0].text);
    if (body.platform !== 'facebook' || !Array.isArray(body.findings) || !Array.isArray(body.measured)) fail('check_platform sai shape');
  } else if (!/hồ sơ kênh "facebook"/u.test(plat.content[0].text)) fail(`check_platform lỗi không rõ: ${plat.content[0].text}`);
  const trav = toolText('traversal');
  if (trav.isError !== true || !trav.content[0].text.includes('không có hồ sơ kênh')) fail('platform "../SKILL" không bị từ chối');
  if (toolText('too-big').isError !== true) fail('văn bản trên 1 MB không bị từ chối');
  if (get('no-tool').error?.code !== -32602) fail('tool lạ phải trả -32602');
  if (get('unknown').error?.code !== -32601) fail('method lạ phải trả -32601');
  if (get(null)?.error?.code !== -32700) fail('JSON hỏng phải trả -32700');
  const platState = plat.isError ? 'hồ sơ facebook chưa đúng schema, bị từ chối rõ ràng' : 'check_platform facebook đo được';
  console.log(`SELF-TEST PASS — server/discover, initialize, tools/list trước initialize, 3 tool, chặn "../SKILL", -32022/-32601/-32602/-32700 (${platState})`);
}

if (process.argv[2] === '--self-test') selfTest();
else if (process.argv.length > 2) {
  console.error('Usage: node mcp-server.mjs | --self-test');
  process.exit(2);
} else serve();
