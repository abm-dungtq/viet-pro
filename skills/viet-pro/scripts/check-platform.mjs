#!/usr/bin/env node
// Check a channel draft against the limits in its platform profile (references/publishing/<kênh>.md).
// Usage: node check-platform.mjs <kênh> <draft.md> [--surface <bề-mặt>]
//        node check-platform.mjs --validate
//        node check-platform.mjs --self-test
// Draft fields come from `## title`, `## description`, `## caption`, `## body` headings; without them the
// whole file is `body`. ERROR lines (exit 1) break a documented limit; WARN lines (exit 0) come from
// word-of-mouth limits (confidence F) or the "see more" fold.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDraft, countText, listPlatformIds, loadProfile, parseProfile, splitDraft, validateProfile } from './lib/profile.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../references/publishing');

function selfTest() {
  const fail = (msg) => { console.error(`SELF-TEST FAIL — ${msg}`); process.exit(1); };
  const counts = [
    ['Tiếng Việt'.normalize('NFD'), 'graphemes', 10],
    ['Tiếng Việt', 'utf8_bytes_emoji', 10],
    ['👍🏽', 'utf8_bytes_emoji', 8],
    ['👨‍👩‍👧', 'utf8_bytes_emoji', 18],
    ['1', 'utf8_bytes_emoji', 1],
    ['ế', 'x_weighted', 2],
    ['Một hai, ba.', 'words', 3],
  ];
  for (const [text, method, want] of counts) {
    const got = countText(text, method);
    if (got !== want) fail(`${method}(${JSON.stringify(text)}) = ${got}, cần ${want}`);
  }
  if (countText('Tiếng Việt', 'utf8_bytes') <= countText('Tiếng Việt', 'graphemes')) fail('utf8_bytes phải lớn hơn số grapheme với chữ có dấu');

  const profileText = `---
schema: viet-pro/platform-profile@1
id: demo
name: Demo
tier: 2
counting: graphemes
segments: "---"
last_verified: 2026-10-16
review_by: 2027-01-16
limits:
  - { surface: post, field: max_chars, value: 20, confidence: O, source: doc }
  - { surface: post, field: max_hashtags, value: 1, confidence: F, source: doc }
  - { surface: post, field: max_links, value: 1, confidence: S, source: doc }
  - { surface: video, field: max_title_chars, value: 10, confidence: O, source: doc }
sources:
  - { id: doc, url: "https://example.com/help, page 2", accessed: 2026-10-16 }
---
# Demo
`;
  const p = parseProfile(profileText);
  const errs = validateProfile(p, 'demo');
  if (errs.length) fail(`hồ sơ mẫu không hợp lệ: ${errs.join('; ')}`);
  if (p.sources[0].url !== 'https://example.com/help, page 2') fail('flow map tách sai dấu phẩy trong ngoặc kép');
  if (!validateProfile(p, 'other').some((e) => e.includes('không khớp'))) fail('không bắt id lệch tên file');
  try { parseProfile('---\nlimits:\n    nested: 1\n---\n'); fail('parser nhận dòng lồng sâu'); } catch (e) { if (e.message.startsWith('SELF-TEST')) throw e; }

  const thread = splitDraft('Đoạn một ngắn.\n---\nĐoạn hai dài hơn hai mươi ký tự.\n---\nBa #a #b');
  const r = checkDraft(p, thread);
  const errors = r.findings.filter((f) => f.level === 'ERROR');
  if (errors.length !== 1 || errors[0].field !== 'max_chars đoạn 2') fail(`segments: cần đúng 1 ERROR ở đoạn 2, nhận ${JSON.stringify(r.findings)}`);
  if (!r.findings.some((f) => f.level === 'WARN' && f.field === 'max_hashtags')) fail('giới hạn F bị vượt phải là WARN');
  const video = checkDraft(p, splitDraft('## title\nTiêu đề quá dài\n\n## description\nMô tả'), { surface: 'video' });
  if (!video.findings.some((f) => f.field === 'max_title_chars')) fail('không đọc được trường ## title');
  if (checkDraft(p, splitDraft('Xem #1 nhé')).findings.length) fail('"#1" bị đếm là hashtag');
  console.log('SELF-TEST PASS — cách đếm, parser hồ sơ, tách trường, tách đoạn, mức ERROR/WARN theo độ tin cậy');
}

function validateAll() {
  let bad = 0;
  const ids = listPlatformIds(DIR);
  for (const id of ids) {
    let errors;
    try { errors = validateProfile(parseProfile(readFileSync(join(DIR, `${id}.md`), 'utf8')), id); } catch (e) { errors = [e.message]; }
    for (const e of errors) console.log(`INVALID ${id}.md: ${e}`);
    if (errors.length) bad++;
  }
  if (bad) process.exit(1);
  console.log(`PROFILES PASS — ${ids.length} hồ sơ kênh hợp lệ`);
}

const args = process.argv.slice(2);
if (args[0] === '--self-test') { selfTest(); process.exit(0); }
if (args[0] === '--validate') { validateAll(); process.exit(0); }
const si = args.indexOf('--surface');
const surface = si >= 0 ? args[si + 1] : undefined;
const [id, file] = args.filter((_, i) => si < 0 || (i !== si && i !== si + 1));
if (!id || !file) {
  console.error('Usage: node check-platform.mjs <kênh> <draft.md> [--surface <bề-mặt>] | --validate | --self-test');
  process.exit(2);
}
let result;
try {
  result = checkDraft(loadProfile(DIR, id), splitDraft(readFileSync(file, 'utf8')), { surface });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
for (const f of result.findings) console.log(`${f.level} [${id}/${result.surface}] ${f.field}: ${f.detail}`);
if (result.findings.some((f) => f.level === 'ERROR')) process.exit(1);
console.log(`PASS — ${id}/${result.surface}: ${result.measured.map((m) => `${m.field} ${m.value}/${m.limit}`).join(', ') || 'không có giới hạn đo được'}`);
