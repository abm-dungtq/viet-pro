// Gemini Decisions HTTP client (gemini-decision-1) for Vietnamese editorial QA.
// Uses Node.js >= 20 built-in fetch and node:http (for loopback self-test).
// Importing this file has no side effects.

import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DECISIONS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/decisions';
export const DEFAULT_MODEL = 'gemini-decision-1';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/u,
  /(?<![A-Za-z0-9_])sk-[A-Za-z0-9_-]{16,}/u,
  /(?<![A-Za-z0-9_])(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/u,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\b(?:PASSWORD|SECRET|TOKEN|API_KEY)\s*[:=]\s*["']?\S{8,}["']?/iu,
];

function parseEnvFile(filePath) {
  const values = Object.create(null);
  if (!existsSync(filePath)) return values;
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/u)) {
      let line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('export ')) line = line.slice(7).trim();
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if (v.length >= 2 && v[0] === v.at(-1) && (v[0] === "'" || v[0] === '"')) {
        v = v.slice(1, -1);
      }
      if (k && v) values[k] = v;
    }
  } catch {
    // Ignore unreadable .env files and keep degrading gracefully.
  }
  return values;
}

function isUsableKey(val) {
  return typeof val === 'string' && val.length > 0 && !val.startsWith('${');
}

/**
 * Resolve Gemini API key from environment variables or (~/.env, ~/.gemini/.env).
 * Internal callers use `.key`; public diagnostics must use `getGeminiKeyStatus` (hasKey + source only).
 */
export function resolveGeminiApiKey(env = process.env) {
  for (const envName of ['GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
    const val = typeof env?.[envName] === 'string' ? env[envName].trim() : '';
    if (isUsableKey(val)) {
      return { key: val, hasKey: true, source: `env:${envName}` };
    }
  }

  if (env?.VIET_PRO_NO_ENV_FILE === '1') {
    return { key: null, hasKey: false, source: 'missing' };
  }

  const home = (typeof env?.HOME === 'string' && env.HOME.trim()) ? env.HOME.trim() : homedir();
  const candidates = [join(home, '.env'), join(home, '.gemini', '.env')];
  for (const envPath of candidates) {
    const parsed = parseEnvFile(envPath);
    for (const envName of ['GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
      const val = typeof parsed[envName] === 'string' ? parsed[envName].trim() : '';
      if (isUsableKey(val)) {
        return { key: val, hasKey: true, source: `${envPath}:${envName}` };
      }
    }
  }

  return { key: null, hasKey: false, source: 'missing' };
}

/** Public-safe API key status without ever returning the raw secret. */
export function getGeminiKeyStatus(env = process.env) {
  const { hasKey, source } = resolveGeminiApiKey(env);
  return { hasKey, source };
}

/** Return true if text appears to contain a credential, token, or private key. */
export function looksLikeSecret(text) {
  if (typeof text !== 'string' || !text) return false;
  return SECRET_PATTERNS.some((re) => re.test(text));
}

function dialectInstruction(dialect) {
  if (dialect === 'southern') {
    return (
      'Văn bản có sử dụng từ ngữ hoặc đại từ địa phương miền Bắc không phù hợp ngữ cảnh ' +
      'trong bài viết vốn đang dùng văn phong miền Nam không?'
    );
  }
  if (dialect === 'neutral') {
    return (
      'Văn bản có trộn lẫn phương ngữ vùng miền Bắc và Nam thiếu nhất quán ' +
      'trong cùng một bài viết không?'
    );
  }
  return (
    "Văn bản có sử dụng đại từ hoặc từ ngữ phương ngữ miền Nam như 'ảnh', 'ổng', 'bả', 'hổm rày' " +
    "thay vì văn phong miền Bắc ('anh ấy', 'ông ấy', 'anh bạn') không?"
  );
}

function selfNamingInstruction(config) {
  const forbidName = typeof config?.pronouns?.forbid_self_name === 'string'
    ? config.pronouns.forbid_self_name.trim()
    : '';
  const selfPronoun = (typeof config?.pronouns?.self === 'string' && config.pronouns.self.trim())
    ? config.pronouns.self.trim()
    : 'tôi';

  if (forbidName) {
    return (
      `Người viết có tự xưng tên riêng '${forbidName}' lặp lại khiên cưỡng trong câu tự sự ` +
      `(ví dụ: '${forbidName} thấy...', '${forbidName} làm...') thay vì xưng '${selfPronoun}' không?`
    );
  }
  return (
    'Người viết có tự xưng tên riêng lặp lại một cách khiên cưỡng trong câu tự sự ' +
    `thay vì dùng đại từ ngôi thứ nhất nhất quán ('${selfPronoun}') không?`
  );
}

/** Build the 6 calibrated editorial questions parameterized by .viet-pro.json config. */
export function buildEditorialQuestions(config = {}) {
  const dialect = typeof config?.dialect === 'string' ? config.dialect : 'northern';
  return {
    staccato_broetry: {
      type: 'noul',
      instructions:
        'Văn bản có mắc lỗi viết câu cụt ngủn, xuống dòng liên tục từng câu 2-5 chữ ' +
        "kiểu LinkedIn broetry (ví dụ: 'Anh im.', 'Không hơn.', 'Quy trình trước.') không?",
    },
    dialect_leak: {
      type: 'noul',
      instructions: dialectInstruction(dialect),
    },
    forced_self_naming: {
      type: 'noul',
      instructions: selfNamingInstruction(config),
    },
    artificial_dialogue: {
      type: 'noul',
      instructions:
        'Các câu hội thoại trực tiếp trong bài (nếu có) có bị khô khan, sách vở như giáo trình ' +
        'thay vì khẩu ngữ đời thực tự nhiên không?',
    },
    ai_slop_cliches: {
      type: 'noul',
      instructions:
        "Bài viết có chứa các cụm từ sáo rỗng đặc trưng của AI dịch máy như 'không chỉ... mà còn', " +
        "'trong kỷ nguyên số', 'bức tranh toàn cảnh', 'chìa khóa vàng', 'hành trình kiến tạo' không?",
    },
    natural_rhythm: {
      type: 'score',
      instructions: 'Đánh giá nhịp điệu câu văn và độ tự nhiên tiếng Việt của bản thảo.',
      criteria: [
        '0 - Rất máy móc: Câu cụt staccato, đầy khuôn mẫu AI hoặc dịch cứng từ tiếng Anh.',
        '1 - Trung bình yếu: Còn nhiều chỗ ngắt câu vụng, liên từ thiếu tự nhiên.',
        '2 - Khá tốt: Câu ghép mạch lạc, đọc trôi chảy nhưng đôi chỗ còn hơi sách vở.',
        '3 - Tự nhiên xuất sắc: Nhịp điệu câu ghép mượt mà, giàu hơi thở đời sống, chuẩn văn phong người Việt.',
      ],
    },
  };
}

const DEFECT_KEYS = [
  'staccato_broetry',
  'dialect_leak',
  'forced_self_naming',
  'artificial_dialogue',
  'ai_slop_cliches',
];

/** Parse raw Decisions API JSON into gate_passed, rhythm_score_0_to_3, and flagged_defects. */
export function parseDecisionResponse(raw, opts = {}) {
  if (!raw || typeof raw !== 'object' || !raw.answers || typeof raw.answers !== 'object') {
    throw new Error('Invalid Gemini Decisions response: missing answers object');
  }

  const threshold = opts.noulThreshold ?? 0.35;
  const minRhythm = opts.minRhythmScore ?? 2.0;
  const ans = raw.answers;

  const defects = {};
  const flaggedDefects = [];
  for (const k of DEFECT_KEYS) {
    const item = ans[k] ?? (k === 'dialect_leak' ? ans.southern_dialect_leak : undefined) ?? {};
    const rawProb = item?.noul ?? item?.probability ?? 0;
    const prob = Number.isFinite(Number(rawProb)) ? Number(rawProb) : 0;
    const flagged = prob >= threshold;
    if (flagged) flaggedDefects.push(k);
    defects[k] = {
      flagged,
      probability: prob,
      confidence: item?.confidence ?? null,
    };
  }

  const rhythm = ans.natural_rhythm ?? {};
  const rawScore = rhythm?.score ?? 0;
  const rhythmScore = Number.isFinite(Number(rawScore)) ? Number(rawScore) : 0;
  const gatePassed = flaggedDefects.length === 0 && rhythmScore >= minRhythm;

  return {
    gate_passed: gatePassed,
    rhythm_score_0_to_3: rhythmScore,
    rhythm_confidence: rhythm?.confidence ?? null,
    rhythm_probabilities: rhythm?.probabilities && typeof rhythm.probabilities === 'object' ? rhythm.probabilities : {},
    flagged_defects: flaggedDefects,
    defects,
    usage: raw.usage && typeof raw.usage === 'object' ? raw.usage : {},
  };
}

function scrubSecret(message, apiKey) {
  let out = String(message ?? '');
  if (apiKey) out = out.split(apiKey).join('[REDACTED]');
  out = out.replace(/AIza[0-9A-Za-z_-]{20,}/gu, '[REDACTED]');
  return out;
}

function validateEndpoint(endpoint) {
  if (endpoint === DECISIONS_ENDPOINT) return null;
  try {
    const u = new URL(endpoint);
    if ((u.protocol === 'http:' || u.protocol === 'https:') && LOOPBACK_HOSTS.has(u.hostname)) {
      return null;
    }
    return 'Custom decisions endpoint must target a loopback host (127.0.0.1 / localhost)';
  } catch {
    return 'Invalid decisions endpoint URL';
  }
}

/**
 * Run the Gemini Decisions editorial gate over `text`.
 * Never leaks API keys in URLs, errors, or return payloads.
 */
export async function runDecisionsGate(text, opts = {}) {
  const started = performance.now();
  const elapsed = () => Math.round((performance.now() - started) * 100) / 100;

  if (opts.noNetwork) {
    return {
      status: 'skipped_disabled',
      gate_passed: null,
      rhythm_score_0_to_3: null,
      flagged_defects: [],
      defects: {},
      reason: 'decisions check disabled (--no-decisions)',
      latency_ms: elapsed(),
    };
  }

  if (typeof text !== 'string' || !text.trim()) {
    return {
      status: 'skipped_empty',
      gate_passed: null,
      rhythm_score_0_to_3: null,
      flagged_defects: [],
      defects: {},
      reason: 'Empty input text',
      latency_ms: elapsed(),
    };
  }

  if (looksLikeSecret(text)) {
    return {
      status: 'skipped_secret_guard',
      gate_passed: null,
      rhythm_score_0_to_3: null,
      flagged_defects: [],
      defects: {},
      reason: 'Input matches credential/secret pattern; skipped Decisions API call',
      latency_ms: elapsed(),
    };
  }

  const env = opts.env ?? process.env;
  const resolved = typeof opts.apiKey === 'string' && opts.apiKey.trim()
    ? { key: opts.apiKey.trim(), hasKey: true, source: 'opts:apiKey' }
    : resolveGeminiApiKey(env);

  if (!resolved.key) {
    return {
      status: 'skipped_no_key',
      gate_passed: null,
      rhythm_score_0_to_3: null,
      flagged_defects: [],
      defects: {},
      key_source: resolved.source,
      reason: 'Missing GEMINI_API_KEY',
      latency_ms: elapsed(),
    };
  }

  const apiKey = resolved.key;
  const endpoint = opts.endpoint || env?.VIET_PRO_DECISIONS_URL || DECISIONS_ENDPOINT;
  const endpointErr = validateEndpoint(endpoint);
  if (endpointErr) {
    return {
      status: 'error_network',
      gate_passed: null,
      rhythm_score_0_to_3: null,
      flagged_defects: [],
      defects: {},
      key_source: resolved.source,
      error: endpointErr,
      latency_ms: elapsed(),
    };
  }

  const model = opts.model || DEFAULT_MODEL;
  const questions = buildEditorialQuestions(opts.config || {});
  const timeoutMs = opts.timeoutMs ?? 15000;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: text, questions }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      let rawErr = '';
      try {
        rawErr = (await resp.text()).slice(0, 600);
        try {
          const parsedErr = JSON.parse(rawErr);
          rawErr = parsedErr?.error?.message || rawErr;
        } catch {
          // keep rawErr snippet
        }
      } catch {
        rawErr = resp.statusText || 'HTTP error';
      }
      return {
        status: 'error_network',
        http_status: resp.status,
        gate_passed: null,
        rhythm_score_0_to_3: null,
        flagged_defects: [],
        defects: {},
        key_source: resolved.source,
        error: scrubSecret(`Gemini Decisions API HTTP ${resp.status}: ${rawErr}`, apiKey),
        latency_ms: elapsed(),
      };
    }

    const payload = await resp.json();
    const parsed = parseDecisionResponse(payload, opts);
    return {
      status: parsed.gate_passed ? 'passed' : 'failed',
      ...parsed,
      key_source: resolved.source,
      latency_ms: elapsed(),
    };
  } catch (err) {
    return {
      status: 'error_network',
      gate_passed: null,
      rhythm_score_0_to_3: null,
      flagged_defects: [],
      defects: {},
      key_source: resolved.source,
      error: scrubSecret(err?.message || String(err), apiKey),
      latency_ms: elapsed(),
    };
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Loopback node:http self-test verifying offline fallback, secret guard, headers, config params, and key scrubbing. */
export async function selfTest() {
  const { createServer } = await import('node:http');
  const noKeyRes = await runDecisionsGate('Đây là đoạn văn tiếng Việt tự nhiên để kiểm tra.', {
    env: { GEMINI_API_KEY: '', GOOGLE_API_KEY: '', VIET_PRO_NO_ENV_FILE: '1' },
  });
  assert(noKeyRes.status === 'skipped_no_key', `expected skipped_no_key, got ${noKeyRes.status}`);
  assert(noKeyRes.gate_passed === null, 'missing key should return gate_passed: null');
  assert(noKeyRes.latency_ms < 10, `expected <10ms without key, got ${noKeyRes.latency_ms}ms`);

  const tmpHome = mkdtempSync(join(tmpdir(), 'viet-pro-decisions-env-'));
  let server;
  try {
    mkdirSync(join(tmpHome, '.gemini'), { recursive: true });
    writeFileSync(join(tmpHome, '.env'), '# comment\nGEMINI_API_KEY=${PLACEHOLDER}\n', 'utf8');
    writeFileSync(join(tmpHome, '.gemini', '.env'), 'export GOOGLE_API_KEY="env-file-test-key"\n', 'utf8');
    const resolvedEnv = resolveGeminiApiKey({ HOME: tmpHome, GEMINI_API_KEY: '', GOOGLE_API_KEY: '' });
    assert(resolvedEnv.key === 'env-file-test-key', `expected ~/.gemini/.env key, got ${resolvedEnv.key}`);
    const publicStatus = getGeminiKeyStatus({ HOME: tmpHome, GEMINI_API_KEY: '', GOOGLE_API_KEY: '' });
    assert(publicStatus.hasKey === true && !('key' in publicStatus), 'getGeminiKeyStatus must not expose key');

    let requestCount = 0;
    let mode = 'pass';
    const testKey = 'TEST_FAKE_KEY_998877665544332211';
    const observed = [];

    server = createServer(async (req, res) => {
      requestCount++;
      let body = '';
      for await (const chunk of req) body += chunk;
      observed.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });

      if (mode === 'error500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Server failed with key ${testKey}` } }));
        return;
      }

      if (mode === 'fail') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          answers: {
            staccato_broetry: { noul: 0.72, confidence: 0.9 },
            dialect_leak: { noul: 0.1, confidence: 0.9 },
            forced_self_naming: { noul: 0.05, confidence: 0.95 },
            artificial_dialogue: { noul: 0.1, confidence: 0.9 },
            ai_slop_cliches: { noul: 0.4, confidence: 0.85 },
            natural_rhythm: { score: 1.5, confidence: 0.8 },
          },
        }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        answers: {
          staccato_broetry: { noul: 0.05, confidence: 0.95 },
          dialect_leak: { noul: 0.04, confidence: 0.96 },
          forced_self_naming: { noul: 0.02, confidence: 0.98 },
          artificial_dialogue: { noul: 0.08, confidence: 0.92 },
          ai_slop_cliches: { noul: 0.1, confidence: 0.91 },
          natural_rhythm: { score: 2.8, confidence: 0.9, probabilities: { 2: 0.2, 3: 0.8 } },
        },
        usage: { input_tokens: 42 },
      }));
    });

    await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
    const addr = server.address();
    const endpoint = `http://127.0.0.1:${addr.port}/v1beta/decisions`;

    // Secret guard must short-circuit with 0 HTTP requests
    const secretRes = await runDecisionsGate('Đừng gửi mã AIzaSyFakeTestToken1234567890abcdef lên mạng.', {
      endpoint,
      env: { GEMINI_API_KEY: testKey, VIET_PRO_NO_ENV_FILE: '1' },
    });
    assert(secretRes.status === 'skipped_secret_guard', `expected skipped_secret_guard, got ${secretRes.status}`);
    assert(requestCount === 0, `expected 0 HTTP requests on secret guard, got ${requestCount}`);

    // Pass case + verify header-only key + config adaptation
    mode = 'pass';
    const passRes = await runDecisionsGate('Tôi viết bài chia sẻ kinh nghiệm thực tế.', {
      endpoint,
      env: { GEMINI_API_KEY: testKey, VIET_PRO_NO_ENV_FILE: '1' },
      config: { dialect: 'southern', pronouns: { self: 'mình', forbid_self_name: 'Dũng' } },
    });
    assert(passRes.status === 'passed' && passRes.gate_passed === true, 'expected passRes gate_passed === true');
    assert(passRes.rhythm_score_0_to_3 === 2.8, 'expected rhythm_score_0_to_3 === 2.8');
    assert(observed.length === 1, 'expected 1 HTTP request');
    assert(!observed[0].url.includes('key=') && !observed[0].url.includes(testKey), 'URL must not contain API key');
    assert(observed[0].headers['x-goog-api-key'] === testKey, 'missing x-goog-api-key header');
    assert(observed[0].body.questions.dialect_leak.instructions.includes('miền Bắc'), 'southern config must guard northern leak');
    assert(observed[0].body.questions.forced_self_naming.instructions.includes('Dũng'), 'forbid_self_name must appear in question');

    // Fail case
    mode = 'fail';
    const failRes = await runDecisionsGate('Bài viết còn câu cụt.', {
      endpoint,
      env: { GEMINI_API_KEY: testKey, VIET_PRO_NO_ENV_FILE: '1' },
    });
    assert(failRes.status === 'failed' && failRes.gate_passed === false, 'expected failRes gate_passed === false');
    assert(failRes.flagged_defects.includes('staccato_broetry'), 'expected staccato_broetry flagged');
    assert(failRes.flagged_defects.includes('ai_slop_cliches'), 'expected ai_slop_cliches flagged');

    // HTTP 500 scrubbing check
    mode = 'error500';
    const errRes = await runDecisionsGate('Kiểm tra tẩy khóa khi lỗi 500.', {
      endpoint,
      env: { GEMINI_API_KEY: testKey, VIET_PRO_NO_ENV_FILE: '1' },
    });
    assert(errRes.status === 'error_network' && errRes.gate_passed === null, 'expected error_network on HTTP 500');
    assert(!JSON.stringify(errRes).includes(testKey), 'API key leaked in error response!');
  } finally {
    if (server) await new Promise((resolveClose) => server.close(resolveClose));
    rmSync(tmpHome, { recursive: true, force: true });
  }

  console.log('SELF-TEST PASS — decisions.mjs (offline fallback, secret guard, header auth, config questions, error scrubbing)');
}

const isMain = process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.argv.includes('--self-test')) {
    selfTest().then(() => process.exit(0)).catch((err) => {
      console.error(`SELF-TEST FAIL — ${err?.stack || err}`);
      process.exit(1);
    });
  } else {
    console.error('Usage: node decisions.mjs --self-test');
    process.exit(2);
  }
}
