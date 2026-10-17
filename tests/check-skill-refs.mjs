#!/usr/bin/env node
// Check that every Markdown file referenced inside skills/viet-pro resolves to a real file.
// Resolves `name.md` relative to the referencing file, the skill root, references/, or any
// file with the same basename. The dated sample-name example in archive/lead.md is skipped
// on purpose.
// Usage: node tests/check-skill-refs.mjs

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/viet-pro');

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  }
})(SKILL);

const basenames = new Set(files.map((f) => basename(f)));
const problems = [];

for (const file of files.filter((f) => f.endsWith('.md'))) {
  let text = readFileSync(file, 'utf8');
  const rel = relative(SKILL, file);
  for (const m of text.matchAll(/`([A-Za-z0-9/_.-]+\.md)`|\]\(([^)#\s]+\.md)\)/g)) {
    const ref = m[1] || m[2];
    if (/^\d{6}-/.test(basename(ref))) continue;
    const candidates = [join(dirname(file), ref), join(SKILL, ref), join(SKILL, 'references', ref)];
    if (!candidates.some((c) => existsSync(c)) && !basenames.has(basename(ref))) problems.push(`${rel}: ${ref}`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`BROKEN ${p}`);
  process.exit(1);
}
console.log(`REFS PASS — ${files.filter((f) => f.endsWith('.md')).length} file Markdown, không có tham chiếu gãy`);
