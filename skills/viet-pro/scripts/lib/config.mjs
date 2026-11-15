// Pure project configuration loader and validator (.viet-pro.json).
// Importing this file has no side effects.

import { existsSync, mkdtempSync, realpathSync, rmSync, statSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONFIG_SCHEMA = 'viet-pro/config@1';

const VALID_DIALECTS = ['northern', 'southern', 'neutral'];
const VALID_REGISTERS = ['editorial', 'executive', 'casual', 'technical'];

export const DEFAULT_CONFIG = Object.freeze({
  schema: CONFIG_SCHEMA,
  dialect: 'northern',
  pronouns: Object.freeze({ self: 'tôi', reader: 'bạn', forbid_self_name: '' }),
  register: 'editorial',
  keep_terms: Object.freeze([]),
  banned_phrases: Object.freeze([]),
  mandatory_cta: '',
  allow_first_hand: true,
  tts_tags: true,
  house_style: true,
  max_ai_score: null,
  default_platform: '',
  default_genre: '',
});

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStringArray = (v) => Array.isArray(v) && v.every((item) => typeof item === 'string');

function resolveSearchDir(startPath) {
  const abs = resolve(startPath || process.cwd());
  if (existsSync(abs)) {
    try {
      return statSync(abs).isFile() ? dirname(abs) : abs;
    } catch {
      return abs;
    }
  }
  return extname(abs) ? dirname(abs) : abs;
}

/**
 * Return a fresh config object merged with DEFAULT_CONFIG.
 */
export function defaultConfigTemplate(overrides = {}) {
  const src = isPlainObject(overrides) ? overrides : {};
  return {
    ...DEFAULT_CONFIG,
    ...src,
    schema: CONFIG_SCHEMA,
    pronouns: {
      ...DEFAULT_CONFIG.pronouns,
      ...(isPlainObject(src.pronouns) ? src.pronouns : {}),
    },
    keep_terms: [...(Array.isArray(src.keep_terms) ? src.keep_terms : DEFAULT_CONFIG.keep_terms)],
    banned_phrases: [...(Array.isArray(src.banned_phrases) ? src.banned_phrases : DEFAULT_CONFIG.banned_phrases)],
  };
}

/**
 * Walk upward from startPath for .viet-pro.json, stopping at .git, os.homedir(), or filesystem root.
 */
export function findProjectConfig(startPath = process.cwd()) {
  let dir = resolveSearchDir(startPath);
  const { root } = parse(dir);
  const home = resolve(homedir());
  while (dir && dir !== root) {
    const candidate = join(dir, '.viet-pro.json');
    if (existsSync(candidate)) return candidate;
    if (existsSync(join(dir, '.git')) || dir === home) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Validate a raw parsed config object and return an array of error messages.
 */
export function validateConfig(raw) {
  const errors = [];
  if (!isPlainObject(raw)) {
    return ['Cấu hình phải là một JSON object'];
  }
  if (raw.schema !== undefined && raw.schema !== CONFIG_SCHEMA) {
    errors.push(`trường "schema" phải là "${CONFIG_SCHEMA}"`);
  }
  if (raw.dialect !== undefined && !VALID_DIALECTS.includes(raw.dialect)) {
    errors.push(`trường "dialect" phải thuộc [${VALID_DIALECTS.join(', ')}]`);
  }
  if (raw.register !== undefined && !VALID_REGISTERS.includes(raw.register)) {
    errors.push(`trường "register" phải thuộc [${VALID_REGISTERS.join(', ')}]`);
  }
  if (raw.pronouns !== undefined) {
    if (!isPlainObject(raw.pronouns)) {
      errors.push('trường "pronouns" phải là object');
    } else {
      for (const k of ['self', 'reader', 'forbid_self_name']) {
        if (raw.pronouns[k] !== undefined && typeof raw.pronouns[k] !== 'string') {
          errors.push(`trường "pronouns.${k}" phải là chuỗi`);
        }
      }
    }
  }
  for (const k of ['keep_terms', 'banned_phrases']) {
    if (raw[k] !== undefined && !isStringArray(raw[k])) {
      errors.push(`trường "${k}" phải là mảng chuỗi`);
    }
  }
  for (const k of ['mandatory_cta', 'default_platform', 'default_genre']) {
    if (raw[k] !== undefined && typeof raw[k] !== 'string') {
      errors.push(`trường "${k}" phải là chuỗi`);
    }
  }
  for (const k of ['allow_first_hand', 'tts_tags', 'house_style']) {
    if (raw[k] !== undefined && typeof raw[k] !== 'boolean') {
      errors.push(`trường "${k}" phải là boolean`);
    }
  }
  if (raw.max_ai_score !== undefined && raw.max_ai_score !== null) {
    if (typeof raw.max_ai_score !== 'number' || !Number.isFinite(raw.max_ai_score) || raw.max_ai_score < 0 || raw.max_ai_score > 100) {
      errors.push('trường "max_ai_score" phải là null hoặc số trong khoảng 0..100');
    }
  }
  return errors;
}

/**
 * Load and validate the nearest .viet-pro.json or fall back to DEFAULT_CONFIG.
 */
export function loadProjectConfig(startPath = process.cwd()) {
  const fallbackRoot = resolveSearchDir(startPath);
  const foundPath = findProjectConfig(startPath);
  if (!foundPath) {
    return { path: null, rootDir: fallbackRoot, config: defaultConfigTemplate(), errors: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(foundPath, 'utf8'));
  } catch (err) {
    throw new Error(`Lỗi cú pháp JSON trong ${foundPath}: ${err.message}`);
  }
  const errors = validateConfig(parsed);
  if (errors.length) {
    throw new Error(`Cấu hình ${foundPath} sai schema: ${errors.join('; ')}`);
  }
  const config = defaultConfigTemplate(parsed);
  return { path: foundPath, rootDir: dirname(foundPath), config, errors: [] };
}

export function selfTest() {
  const fail = (msg) => { console.error(`SELF-TEST FAIL — ${msg}`); process.exit(1); };
  const tmp = mkdtempSync(join(tmpdir(), 'viet-pro-cfg-'));
  try {
    const tmpl = defaultConfigTemplate({ dialect: 'southern', pronouns: { self: 'mình' } });
    if (tmpl.schema !== CONFIG_SCHEMA || tmpl.pronouns.reader !== 'bạn' || DEFAULT_CONFIG.dialect !== 'northern') {
      fail('defaultConfigTemplate không gộp đúng mặc định');
    }
    if (validateConfig(tmpl).length) fail('defaultConfigTemplate không hợp lệ theo validateConfig');

    const repo = join(tmp, 'outer', 'repo');
    const nestedDir = join(repo, 'sub', 'nested');
    mkdirSync(join(repo, '.git'), { recursive: true });
    mkdirSync(nestedDir, { recursive: true });
    const draftPath = join(nestedDir, 'draft.md');
    writeFileSync(draftPath, '# Nháp\n');
    const cfgPath = join(repo, '.viet-pro.json');
    writeFileSync(cfgPath, JSON.stringify({
      schema: CONFIG_SCHEMA,
      dialect: 'southern',
      pronouns: { self: 'em', forbid_self_name: 'Nam' },
      banned_phrases: ['cam kết 100%'],
      allow_first_hand: false,
    }, null, 2));

    const found = findProjectConfig(draftPath);
    if (found !== cfgPath) fail(`findProjectConfig tìm sai: ${found} !== ${cfgPath}`);
    const loaded = loadProjectConfig(draftPath);
    if (loaded.path !== cfgPath || loaded.rootDir !== repo || loaded.config.dialect !== 'southern'
      || loaded.config.pronouns.self !== 'em' || loaded.config.pronouns.reader !== 'bạn'
      || loaded.config.allow_first_hand !== false || loaded.errors.length !== 0) {
      fail(`loadProjectConfig trả sai cấu trúc: ${JSON.stringify(loaded)}`);
    }

    // Stop at .git boundary and never climb to parent stray .viet-pro.json
    writeFileSync(join(tmp, 'outer', '.viet-pro.json'), JSON.stringify({ dialect: 'southern' }));
    const inner = join(tmp, 'outer', 'inner');
    mkdirSync(join(inner, '.git'), { recursive: true });
    mkdirSync(join(inner, 'sub'), { recursive: true });
    const innerDraft = join(inner, 'sub', 'draft.md');
    if (findProjectConfig(innerDraft) !== null) fail('findProjectConfig vượt qua ranh giới .git');
    const fallback = loadProjectConfig(innerDraft);
    if (fallback.path !== null || fallback.config.dialect !== 'northern') fail('fallback config khi không có .viet-pro.json bị sai');

    // Validation failures
    if (!validateConfig({ dialect: 'central' }).some((e) => e.includes('dialect'))) fail('không bắt dialect sai');
    if (!validateConfig({ register: 'poetic' }).some((e) => e.includes('register'))) fail('không bắt register sai');
    if (!validateConfig({ pronouns: 'tôi' }).some((e) => e.includes('pronouns'))) fail('không bắt pronouns không phải object');
    if (!validateConfig({ keep_terms: [123] }).some((e) => e.includes('keep_terms'))) fail('không bắt keep_terms sai kiểu');
    if (!validateConfig({ allow_first_hand: 'no' }).some((e) => e.includes('allow_first_hand'))) fail('không bắt allow_first_hand sai kiểu');
    if (!validateConfig({ house_style: 'yes' }).some((e) => e.includes('house_style'))) fail('không bắt house_style sai kiểu');
    if (!validateConfig({ max_ai_score: 120 }).some((e) => e.includes('max_ai_score'))) fail('không bắt max_ai_score vượt 100');
    if (validateConfig({ house_style: false, max_ai_score: 15 }).length) fail('house_style=false & max_ai_score=15 phải hợp lệ');

    const badRepo = join(tmp, 'bad');
    mkdirSync(badRepo, { recursive: true });
    writeFileSync(join(badRepo, '.viet-pro.json'), '{ "dialect": "wrong" }');
    let threwSchema = false;
    try { loadProjectConfig(badRepo); } catch (e) { threwSchema = e.message.includes('dialect'); }
    if (!threwSchema) fail('loadProjectConfig không ném lỗi khi schema sai');

    writeFileSync(join(badRepo, '.viet-pro.json'), '{ invalid json');
    let threwSyntax = false;
    try { loadProjectConfig(badRepo); } catch (e) { threwSyntax = e.message.includes('Lỗi cú pháp JSON'); }
    if (!threwSyntax) fail('loadProjectConfig không ném lỗi khi JSON hỏng');

    console.log('SELF-TEST PASS — config schema, findProjectConfig (.git/home/root), validateConfig và loadProjectConfig');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const isEntrypoint = process.argv[1]
  && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));

if (isEntrypoint) {
  if (process.argv[2] === '--self-test') {
    selfTest();
    process.exit(0);
  }
  console.error('Usage: node config.mjs --self-test');
  process.exit(2);
}
