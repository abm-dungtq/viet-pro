#!/usr/bin/env node
// Per-rule lint hit rate on human-written text versus AI text, per 1,000 words, to set rule
// levels from evidence. A rule whose AI/human ratio is below 2 is marked as not discriminating.
// Usage: node tests/corpus/measure-lint.mjs <human-dir-or-file> <ai-dir-or-file>

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lintText } from '../../skills/viet-pro/scripts/lib/lint.mjs';

// Source lists and notes kept next to the texts are not part of the corpus.
const META = new Set(['SOURCES.md', 'README.md']);

function filesOf(path) {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => {
    const p = join(path, name);
    if (statSync(p).isDirectory()) return filesOf(p);
    return /\.(md|txt)$/u.test(name) && !META.has(name) ? [p] : [];
  });
}

function measure(path) {
  const files = filesOf(path);
  const hits = {};
  let words = 0;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    words += (text.match(/[\p{L}\p{N}]+/gu) || []).length;
    for (const { id } of lintText(text)) hits[id] = (hits[id] || 0) + 1;
  }
  return { files: files.length, words, hits };
}

const [humanPath, aiPath] = process.argv.slice(2);
if (!humanPath || !aiPath) { console.error('Usage: node tests/corpus/measure-lint.mjs <human-dir-or-file> <ai-dir-or-file>'); process.exit(2); }
const human = measure(humanPath);
const ai = measure(aiPath);
const per1k = (n, w) => (w ? (n * 1000) / w : 0);

console.log('| luật | người /1000 chữ | AI /1000 chữ | tỷ lệ AI/người |');
console.log('|---|---|---|---|');
for (const id of [...new Set([...Object.keys(human.hits), ...Object.keys(ai.hits)])].sort()) {
  const h = per1k(human.hits[id] || 0, human.words);
  const a = per1k(ai.hits[id] || 0, ai.words);
  const ratio = h ? a / h : Infinity;
  const ratioText = Number.isFinite(ratio) ? ratio.toFixed(2) : '∞ (người = 0)';
  console.log(`| ${id} | ${h.toFixed(2)} | ${a.toFixed(2)} | ${ratioText}${ratio < 2 ? ' — không phân biệt' : ''} |`);
}
console.log(`\nNgười: ${human.files} file, ${human.words} chữ. AI: ${ai.files} file, ${ai.words} chữ.`);
