#!/usr/bin/env node
// Per-route byte budget and orphan guard for skills/viet-pro.
// Usage: node tests/check-route-budget.mjs [--json] [--skill-dir <path>]

import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORE_BUDGET_BYTES = 18 * 1024;
export const ROUTE_DELTA_BUDGET_BYTES = 22 * 1024;
export const GENRE_FILE_MAX_BYTES = 4 * 1024;
export const CORE_FILES = ['SKILL.md', 'references/review/anti-ai.md'];

const DEFAULT_SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/viet-pro');
const VIDEO_SCRIPT_PLATFORMS = new Set(['tiktok', 'youtube', 'instagram']);
const PUBLISHING_SKIP = new Set(['lead.md', 'repurpose-matrix.md', 'video-script.md']);

function listMarkdownDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();
}

function walkMarkdown(rootDir, currentDir = rootDir, out = []) {
  if (!existsSync(currentDir)) return out;
  for (const name of readdirSync(currentDir).sort()) {
    if (name === '.git' || name === 'node_modules') continue;
    const abs = join(currentDir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walkMarkdown(rootDir, abs, out);
    } else if (name.endsWith('.md')) {
      out.push(relative(rootDir, abs).replace(/\\/gu, '/'));
    }
  }
  return out;
}

export function buildRoutes(skillDir = DEFAULT_SKILL_DIR) {
  const routes = {
    'research-full': [
      'references/research/lead.md',
      'references/research/research.md',
      'references/research/analysis.md',
    ],
    'editorial-story': [
      'references/editorial/lead.md',
      'references/editorial/story-core.md',
      'references/editorial/hook-close.md',
      'references/editorial/rhythm.md',
    ],
    'editorial-technical': [
      'references/editorial/lead.md',
      'references/editorial/technical.md',
      'references/editorial/hook-close.md',
    ],
    'editorial-debunk': [
      'references/editorial/lead.md',
      'references/editorial/story-core.md',
      'references/editorial/debunk.md',
      'references/editorial/emphasis.md',
    ],
    'editorial-style-extras': [
      'references/editorial/lead.md',
      'references/editorial/metaphor.md',
      'references/editorial/reframe.md',
      'references/editorial/emphasis.md',
    ],
  };

  for (const file of listMarkdownDir(join(skillDir, 'references/genres'))) {
    if (file === 'lead.md') continue;
    const genre = file.slice(0, -3);
    routes[`genre-${genre}`] = [
      'references/genres/lead.md',
      `references/genres/${file}`,
      'references/editorial/hook-close.md',
    ];
  }

  routes['publishing-video-script'] = [
    'references/publishing/lead.md',
    'references/publishing/video-script.md',
  ];

  for (const file of listMarkdownDir(join(skillDir, 'references/publishing'))) {
    if (PUBLISHING_SKIP.has(file)) continue;
    const platform = file.slice(0, -3);
    const files = [
      'references/publishing/lead.md',
      `references/publishing/${file}`,
    ];
    if (VIDEO_SCRIPT_PLATFORMS.has(platform)) {
      files.push('references/publishing/video-script.md');
    }
    routes[`publishing-${platform}`] = files;
  }

  routes['publishing-repurpose'] = [
    'references/publishing/lead.md',
    'references/publishing/repurpose-matrix.md',
    'references/publishing/facebook.md',
    'references/publishing/linkedin.md',
    'references/publishing/youtube.md',
  ];

  routes['review-humanize-deep'] = [
    'references/review/lead.md',
    'references/review/humanizer-patterns.md',
  ];

  routes['review-vietnamese-voice'] = [
    'references/review/lead.md',
    'references/review/translationese-vi.md',
    'references/review/document-tics.md',
  ];

  routes['review-language-fact'] = [
    'references/review/lead.md',
    'references/review/punctuation.md',
    'references/review/capitalization.md',
    'references/review/natural.md',
    'references/review/consistency.md',
    'references/review/fact-check.md',
  ];

  return routes;
}

function measureFiles(skillDir, relFiles) {
  const unique = [...new Set(relFiles)];
  const files = [];
  const missing = [];
  let bytes = 0;
  for (const rel of unique) {
    const abs = join(skillDir, rel);
    if (!existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    const size = statSync(abs).size;
    files.push({ path: rel, bytes: size });
    bytes += size;
  }
  return { files, missing, bytes };
}

function isExcludedFromOrphanGuard(relPath) {
  return relPath === 'THIRD_PARTY_NOTICES.md' || relPath.startsWith('references/archive/');
}

export function checkRouteBudget(skillDir = DEFAULT_SKILL_DIR) {
  const resolvedDir = resolve(skillDir);
  const routesMap = buildRoutes(resolvedDir);
  const coreSet = new Set(CORE_FILES);
  const covered = new Set(CORE_FILES);
  const errors = [];
  const allMissing = new Set();

  const coreMeasured = measureFiles(resolvedDir, CORE_FILES);
  for (const m of coreMeasured.missing) {
    allMissing.add(m);
    errors.push(`core thiếu tệp: ${m}`);
  }
  const coreOk = coreMeasured.missing.length === 0 && coreMeasured.bytes <= CORE_BUDGET_BYTES;
  if (coreMeasured.bytes > CORE_BUDGET_BYTES) {
    errors.push(`core vượt trần: ${coreMeasured.bytes}/${CORE_BUDGET_BYTES} B`);
  }

  const routes = [];
  for (const [name, rawFiles] of Object.entries(routesMap)) {
    const deltaFiles = rawFiles.filter((f) => !coreSet.has(f));
    for (const f of deltaFiles) covered.add(f);
    const measured = measureFiles(resolvedDir, deltaFiles);
    for (const m of measured.missing) {
      allMissing.add(m);
      errors.push(`tuyến ${name} thiếu tệp: ${m}`);
    }
    const routeOk = measured.missing.length === 0 && measured.bytes <= ROUTE_DELTA_BUDGET_BYTES;
    if (measured.bytes > ROUTE_DELTA_BUDGET_BYTES) {
      errors.push(`tuyến ${name} vượt trần: ${measured.bytes}/${ROUTE_DELTA_BUDGET_BYTES} B`);
    }
    routes.push({
      name,
      files: measured.files,
      missing: measured.missing,
      bytes: measured.bytes,
      limit: ROUTE_DELTA_BUDGET_BYTES,
      ok: routeOk,
    });
  }

  const genreChecks = [];
  for (const file of listMarkdownDir(join(resolvedDir, 'references/genres'))) {
    if (file === 'lead.md') continue;
    const rel = `references/genres/${file}`;
    const bytes = statSync(join(resolvedDir, rel)).size;
    const ok = bytes <= GENRE_FILE_MAX_BYTES;
    if (!ok) errors.push(`hồ sơ thể loại ${rel} vượt trần: ${bytes}/${GENRE_FILE_MAX_BYTES} B`);
    genreChecks.push({
      name: file.slice(0, -3),
      path: rel,
      bytes,
      limit: GENRE_FILE_MAX_BYTES,
      ok,
    });
  }

  const orphans = walkMarkdown(resolvedDir)
    .filter((rel) => !isExcludedFromOrphanGuard(rel) && !covered.has(rel));
  for (const rel of orphans) {
    errors.push(`tệp Markdown mồ côi chưa gắn tuyến: ${rel}`);
  }

  const ok = coreOk
    && routes.every((r) => r.ok)
    && genreChecks.every((g) => g.ok)
    && orphans.length === 0
    && allMissing.size === 0;

  return {
    ok,
    skillDir: resolvedDir,
    budgets: {
      coreBytes: CORE_BUDGET_BYTES,
      routeDeltaBytes: ROUTE_DELTA_BUDGET_BYTES,
      genreFileMaxBytes: GENRE_FILE_MAX_BYTES,
    },
    core: {
      files: coreMeasured.files,
      missing: coreMeasured.missing,
      bytes: coreMeasured.bytes,
      limit: CORE_BUDGET_BYTES,
      ok: coreOk,
    },
    routes,
    genreChecks,
    orphans,
    missing: [...allMissing].sort(),
    errors,
  };
}

function formatReport(res) {
  const lines = [
    `CORE  ${res.core.ok ? 'OK  ' : 'FAIL'} ${res.core.bytes}/${res.core.limit} B (${res.core.files.map((f) => `${f.path}:${f.bytes}`).join(', ')})`,
  ];
  for (const r of res.routes) {
    lines.push(`ROUTE ${r.ok ? 'OK  ' : 'FAIL'} ${r.name.padEnd(24)} ${String(r.bytes).padStart(5)}/${r.limit} B`);
  }
  for (const g of res.genreChecks) {
    lines.push(`GENRE ${g.ok ? 'OK  ' : 'FAIL'} ${g.path.padEnd(36)} ${String(g.bytes).padStart(5)}/${g.limit} B`);
  }
  lines.push(`ORPHAN ${res.orphans.length ? 'FAIL' : 'OK  '} ${res.orphans.length} tệp mồ côi${res.orphans.length ? `: ${res.orphans.join(', ')}` : ''}`);
  if (res.ok) {
    const maxRoute = res.routes.reduce((m, r) => Math.max(m, r.bytes), 0);
    lines.push(`ROUTE BUDGET PASS — core ${res.core.bytes}/${res.core.limit} B, ${res.routes.length} tuyến (max ${maxRoute}/${res.budgets.routeDeltaBytes} B), ${res.genreChecks.length} thể loại <= ${res.budgets.genreFileMaxBytes} B, 0 tệp mồ côi`);
  } else {
    lines.push(`ROUTE BUDGET FAIL — ${res.errors.join(' | ')}`);
  }
  return lines.join('\n');
}

function isEntrypoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntrypoint()) {
  const args = process.argv.slice(2);
  let json = false;
  let skillDir = DEFAULT_SKILL_DIR;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') json = true;
    else if (args[i] === '--skill-dir') {
      if (i + 1 >= args.length) { console.error('Usage: node tests/check-route-budget.mjs [--json] [--skill-dir <path>]'); process.exit(2); }
      skillDir = args[++i];
    } else {
      console.error(`Usage: node tests/check-route-budget.mjs [--json] [--skill-dir <path>]`);
      process.exit(2);
    }
  }
  const res = checkRouteBudget(skillDir);
  if (json) console.log(JSON.stringify(res, null, 2));
  else console.log(formatReport(res));
  process.exit(res.ok ? 0 : 1);
}
