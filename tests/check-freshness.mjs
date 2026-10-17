#!/usr/bin/env node
// Fail when a channel reference in skills/viet-pro/references/publishing has no review_by date
// in its frontmatter, or the date has passed. Dates due within 14 days print SOON as a warning.
// Usage: node tests/check-freshness.mjs [--today YYYY-MM-DD]

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/viet-pro/references/publishing');
const SKIP = new Set(['lead.md', 'repurpose-matrix.md']);
const args = process.argv.slice(2);
const i = args.indexOf('--today');
const today = i >= 0 ? args[i + 1] : new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(today || '') || Number.isNaN(Date.parse(`${today}T00:00:00Z`))) { console.error('Usage: node tests/check-freshness.mjs [--today YYYY-MM-DD]'); process.exit(2); }
const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86400000).toISOString().slice(0, 10);

const files = readdirSync(dir).filter((f) => f.endsWith('.md') && !SKIP.has(f)).sort();
let failed = false;
for (const f of files) {
  const text = readFileSync(join(dir, f), 'utf8');
  const fm = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
  const date = fm.match(/^review_by:\s*(\d{4}-\d{2}-\d{2})\s*$/mu)?.[1];
  if (!date) { console.log(`MISSING ${f}`); failed = true; }
  else if (date < today) { console.log(`EXPIRED ${f} (review_by ${date})`); failed = true; }
  else if (date <= soon) console.log(`SOON ${f} (review_by ${date})`);
}
if (failed) process.exit(1);
console.log(`FRESHNESS PASS — ${files.length} file kênh còn hạn`);
