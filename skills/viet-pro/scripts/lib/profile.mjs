// Platform profiles: frontmatter parser, validator, text counting and draft checks.
// Importing this file has no side effects. Schema: docs/development/platform-profile-schema.md
//
// The frontmatter is a strict YAML subset: top-level `key: value` lines, and lists whose items are
// one-line flow maps (`  - { field: max_chars, value: 280, confidence: O, source: x-help }`).
// Anything else (nesting, block scalars, anchors, comments after values) is rejected.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { xWeightedLength } from './x-weighted.mjs';

export const SCHEMA = 'viet-pro/platform-profile@1';
export const METHODS = ['graphemes', 'utf16', 'utf8_bytes', 'utf8_bytes_emoji', 'x_weighted', 'words'];
export const FIELDS = ['max_chars', 'max_title_chars', 'max_description_chars', 'max_caption_chars',
  'max_hashtags', 'max_topic_tags', 'max_links', 'fold_chars', 'max_duration_s'];
export const CONFIDENCE = ['O', 'E', 'S', 'F'];
export const DRAFT_FIELDS = ['title', 'description', 'caption', 'body'];
const LIMIT_KEYS = ['surface', 'field', 'value', 'confidence', 'source', 'count', 'scope', 'note'];
const TOP_KEYS = ['schema', 'id', 'name', 'tier', 'counting', 'segments', 'last_verified', 'review_by', 'limits', 'sources'];
const NOT_PROFILES = new Set(['lead.md', 'repurpose-matrix.md']);
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

function scalar(raw, lineNo) {
  const v = raw.trim();
  if (v.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/u.test(v)) throw new Error(`dòng ${lineNo}: chuỗi trong ngoặc kép không đóng`);
    return v.slice(1, -1).replace(/\\(.)/gu, '$1');
  }
  if (/^-?\d+$/u.test(v)) return Number(v);
  if (/^[[{|>&*!#']/u.test(v) || /\s#|:\s/u.test(v)) throw new Error(`dòng ${lineNo}: giá trị ngoài tập con YAML được hỗ trợ: ${v}`);
  return v;
}

function flowMap(raw, lineNo) {
  const inner = raw.trim();
  if (!inner.startsWith('{') || !inner.endsWith('}')) throw new Error(`dòng ${lineNo}: phần tử danh sách phải là { ... } trên một dòng`);
  const parts = [];
  let cur = '';
  let quoted = false;
  for (let i = 1; i < inner.length - 1; i++) {
    const ch = inner[i];
    if (ch === '\\' && quoted) { cur += ch + inner[++i]; continue; }
    if (ch === '"') quoted = !quoted;
    if (ch === ',' && !quoted) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (quoted) throw new Error(`dòng ${lineNo}: chuỗi trong ngoặc kép không đóng`);
  if (cur.trim()) parts.push(cur);
  const map = {};
  for (const part of parts) {
    const m = part.match(/^\s*([a-z_]+):\s*(.+?)\s*$/u);
    if (!m) throw new Error(`dòng ${lineNo}: cặp khóa-giá trị không hợp lệ: ${part.trim()}`);
    if (Object.hasOwn(map, m[1])) throw new Error(`dòng ${lineNo}: khóa lặp: ${m[1]}`);
    map[m[1]] = scalar(m[2], lineNo);
  }
  return map;
}

// Returns { meta, limits, sources, body }. meta holds the top-level scalars.
export function parseProfile(text) {
  const src = text.replace(/\r\n/gu, '\n');
  if (!src.startsWith('---\n')) throw new Error('thiếu frontmatter');
  const end = src.indexOf('\n---\n', 3);
  if (end < 0) throw new Error('frontmatter không đóng');
  const lines = src.slice(4, end).split('\n');
  const meta = {};
  const lists = { limits: [], sources: [] };
  let list = null;
  const seenLists = new Set();
  lines.forEach((line, idx) => {
    const lineNo = idx + 2;
    if (!line.trim()) return;
    const item = line.match(/^ {2}- (.*)$/u);
    if (item) {
      if (!list) throw new Error(`dòng ${lineNo}: phần tử danh sách không thuộc khóa nào`);
      lists[list].push(flowMap(item[1], lineNo));
      return;
    }
    const kv = line.match(/^([a-z_]+):(?:\s+(.*))?$/u);
    if (!kv) throw new Error(`dòng ${lineNo}: dòng ngoài tập con YAML được hỗ trợ: ${line}`);
    const [, key, value = ''] = kv;
    if (Object.hasOwn(meta, key) || seenLists.has(key)) throw new Error(`dòng ${lineNo}: khóa lặp: ${key}`);
    if (Object.hasOwn(lists, key)) {
      if (value && value.trim() !== '[]') throw new Error(`dòng ${lineNo}: ${key} phải là danh sách`);
      seenLists.add(key);
      list = key;
      return;
    }
    if (!value) throw new Error(`dòng ${lineNo}: ${key} thiếu giá trị`);
    list = null;
    meta[key] = scalar(value, lineNo);
  });
  return { meta, limits: lists.limits, sources: lists.sources, body: src.slice(end + 5) };
}

export function validateProfile(p, fileId) {
  const errors = [];
  const { meta, limits, sources } = p;
  for (const key of Object.keys(meta)) if (!TOP_KEYS.includes(key)) errors.push(`khóa lạ: ${key}`);
  if (meta.schema !== SCHEMA) errors.push(`schema phải là ${SCHEMA}`);
  if (meta.id !== fileId) errors.push(`id "${meta.id}" không khớp tên file "${fileId}"`);
  if (!meta.name) errors.push('thiếu name');
  if (![1, 2, 3].includes(meta.tier)) errors.push('tier phải là 1, 2 hoặc 3');
  if (!METHODS.includes(meta.counting)) errors.push(`counting phải thuộc: ${METHODS.join(', ')}`);
  if (meta.segments !== undefined && meta.segments !== '---') errors.push('segments chỉ nhận "---"');
  for (const k of ['last_verified', 'review_by']) if (!DATE.test(String(meta[k] || ''))) errors.push(`${k} phải có dạng YYYY-MM-DD`);
  const ids = new Set();
  for (const s of sources) {
    if (!s.id) errors.push('source thiếu id');
    else if (ids.has(s.id)) errors.push(`source trùng id: ${s.id}`);
    ids.add(s.id);
    if (!/^https?:\/\//u.test(String(s.url || ''))) errors.push(`source ${s.id}: url không hợp lệ`);
    if (!DATE.test(String(s.accessed || ''))) errors.push(`source ${s.id}: accessed phải có dạng YYYY-MM-DD`);
  }
  limits.forEach((l, i) => {
    const at = `limits[${i}]`;
    if (!l.surface) errors.push(`${at}: thiếu surface`);
    if (!FIELDS.includes(l.field)) errors.push(`${at}: field "${l.field}" không được hỗ trợ`);
    if (!Number.isInteger(l.value) || l.value <= 0) errors.push(`${at}: value phải là số nguyên dương`);
    if (!CONFIDENCE.includes(l.confidence)) errors.push(`${at}: confidence phải thuộc O/E/S/F`);
    if (!ids.has(l.source)) errors.push(`${at}: source "${l.source}" chưa khai báo trong sources`);
    if (l.count !== undefined && !METHODS.includes(l.count)) errors.push(`${at}: count "${l.count}" không hợp lệ`);
    if (l.scope !== undefined && l.scope !== 'whole') errors.push(`${at}: scope chỉ nhận "whole"`);
    for (const k of Object.keys(l)) if (!LIMIT_KEYS.includes(k)) errors.push(`${at}: khóa lạ: ${k}`);
  });
  return errors;
}

const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const graphemes = (s) => [...segmenter.segment(s)].map((g) => g.segment);
const isEmoji = (g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g) || g.includes('\u20E3');

export function countText(text, method) {
  const s = text.normalize('NFC');
  switch (method) {
    case 'graphemes': return graphemes(s).length;
    case 'utf16': return s.length;
    case 'utf8_bytes': return Buffer.byteLength(s, 'utf8');
    case 'utf8_bytes_emoji': return graphemes(s).reduce((n, g) => n + (isEmoji(g) ? Buffer.byteLength(g, 'utf8') : 1), 0);
    case 'x_weighted': return xWeightedLength(s);
    case 'words': return (s.match(/[\p{L}\p{N}]+/gu) || []).length;
    default: throw new Error(`cách đếm không hỗ trợ: ${method}`);
  }
}

const HASHTAG = /(?<![\p{L}\p{N}_&/])#(?=[\p{N}_]*\p{L})[\p{L}\p{N}_]+/gu;
const LINK = /https?:\/\/[^\s)>\]]+/gu;

// Draft fields come from `## title`, `## description`, `## caption`, `## body` headings;
// a draft without those headings is a single `body` field.
// A leading `---` block is dropped only when every line in it is a common frontmatter key: a thread
// may itself start with a `---` separator, and its first post may look like `Lưu ý: ...`.
// Headings inside ``` fences are ignored.
const FRONTMATTER_KEYS = new Set(['title', 'description', 'platform', 'surface', 'channel', 'slug', 'date',
  'tags', 'author', 'lang', 'language', 'keywords', 'canonical', 'summary', 'draft', 'layout', 'category', 'categories', 'image']);
export function splitDraft(text) {
  let src = text.replace(/\r\n/gu, '\n').normalize('NFC');
  const lines = src.split('\n');
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    const isKey = (l) => FRONTMATTER_KEYS.has(l.match(/^([a-z_]+):(?:\s|$)/u)?.[1]);
    if (end > 1 && lines.slice(1, end).every((l) => !l.trim() || isKey(l))) src = lines.slice(end + 1).join('\n');
  }
  const fences = [...src.matchAll(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gmu)].map((m) => [m.index, m.index + m[0].length]);
  const heading = new RegExp(`^##[ \\t]+(${DRAFT_FIELDS.join('|')})[ \\t]*$`, 'gimu');
  const marks = [...src.matchAll(heading)].filter((m) => !fences.some(([a, b]) => m.index > a && m.index < b));
  if (!marks.length) return { body: src.trim() };
  const fields = {};
  marks.forEach((m, i) => {
    const key = m[1].toLowerCase();
    const chunk = src.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : src.length).trim();
    fields[key] = fields[key] ? `${fields[key]}\n\n${chunk}` : chunk;
  });
  return fields;
}

export function surfacesOf(profile) {
  return [...new Set(profile.limits.map((l) => l.surface))];
}

// Returns { surface, findings: [{ level, field, detail }], measured: [{ field, value, limit }] }.
// Limits with confidence F only ever produce WARN, and so do fold_chars and max_topic_tags (Threads
// keeps the first topic tag rather than rejecting the post). max_duration_s is skipped.
// A limit with `scope: whole` measures the whole text even when the profile splits posts by `---`.
export function checkDraft(profile, fields, { surface } = {}) {
  const surfaces = surfacesOf(profile);
  const chosen = surface || surfaces[0];
  if (surface && !surfaces.includes(surface)) throw new Error(`surface "${surface}" không có; chọn: ${surfaces.join(', ') || '(không có)'}`);
  const findings = [];
  const measured = [];
  const missing = new Set();
  const all = Object.values(fields).join('\n');
  const mainText = fields.body ?? fields.caption ?? '';
  const segments = profile.meta.segments === '---'
    ? mainText.split(/^[ \t]*---[ \t]*$/mu).map((seg) => seg.trim()).filter(Boolean)
    : null;
  const target = {
    max_chars: mainText,
    max_caption_chars: fields.caption ?? fields.body,
    max_title_chars: fields.title,
    max_description_chars: fields.description,
    fold_chars: mainText,
  };
  for (const l of profile.limits.filter((x) => x.surface === chosen)) {
    const level = l.confidence === 'F' || l.field === 'fold_chars' || l.field === 'max_topic_tags' ? 'WARN' : 'ERROR';
    const segs = l.scope === 'whole' ? null : segments;
    const method = l.count || profile.meta.counting;
    const report = (value, label = l.field) => {
      measured.push({ field: label, value, limit: l.value });
      if (value > l.value) {
        const detail = l.field === 'fold_chars'
          ? `${value} ký tự; chỉ ${l.value} ký tự đầu hiện trước "Xem thêm", đặt ý chính trong đoạn đó`
          : `${value}/${l.value} (${l.confidence}, nguồn ${l.source})`;
        findings.push({ level, field: label, detail });
      }
    };
    if (l.field === 'max_duration_s') continue;
    const counter = { max_hashtags: HASHTAG, max_topic_tags: HASHTAG, max_links: LINK }[l.field];
    if (counter) {
      // In a series of posts, tag and link limits apply to each post.
      if (segs) segs.forEach((seg, i) => report((seg.match(counter) || []).length, `${l.field} đoạn ${i + 1}`));
      else report((all.match(counter) || []).length);
      continue;
    }
    const text = target[l.field];
    if (text === undefined || (text === '' && l.field === 'max_chars')) {
      const want = { max_title_chars: 'title', max_description_chars: 'description' }[l.field] || 'body';
      if (!missing.has(want)) findings.push({ level: 'WARN', field: l.field, detail: `bản thảo thiếu khối "## ${want}", chưa đo được` });
      missing.add(want);
      continue;
    }
    // A title is one line; several lines under `## title` are alternatives (e.g. 3 subject lines).
    const titles = l.field === 'max_title_chars' ? text.split('\n').map((t) => t.trim()).filter(Boolean) : [];
    if (titles.length > 1) {
      titles.forEach((t, i) => report(countText(t, method), `max_title_chars phương án ${i + 1}`));
      continue;
    }
    if (l.field === 'max_chars' && segs) {
      segs.forEach((seg, i) => report(countText(seg, method), `max_chars đoạn ${i + 1}`));
      continue;
    }
    report(countText(text, method));
  }
  const titleLines = (fields.title || '').split('\n').filter((t) => t.trim());
  if (fields.body === undefined && fields.description === undefined && (titleLines.length > 3 || titleLines.some((t) => t.length > 150))) {
    findings.push({ level: 'WARN', field: 'title', detail: 'khối "## title" có đoạn dài; có thể thiếu "## body" hoặc "## description" ở sau tiêu đề' });
  }
  return { surface: chosen, findings, measured };
}

export function listPlatformIds(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.md') && !NOT_PROFILES.has(f)).map((f) => f.slice(0, -3)).sort();
}

export function loadProfile(dir, id) {
  if (!/^[a-z0-9-]+$/u.test(id) || !listPlatformIds(dir).includes(id)) throw new Error(`không có hồ sơ kênh "${id}"; chọn: ${listPlatformIds(dir).join(', ')}`);
  return parseProfile(readFileSync(join(dir, `${id}.md`), 'utf8'));
}
