// CLI runner for calibrated 0-100 AI score + native .pptx deck checks.
// Usage: viet-pro scan [file...] [--json] [--max <N>] [--titles] [--meta] [--chat] [--text] [--stdin] [--self-test]

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildTestPptxBuffer, formatPptxText, readPptx } from '../lib/pptx.mjs';
import { scanFile, scanText, selfTest as scoreSelfTest } from '../lib/score.mjs';

function extractTitles(rawText, isPptx, slidesData) {
  if (isPptx && Array.isArray(slidesData)) {
    return slidesData
      .filter((s) => !s.hidden)
      .map((s) => `Slide ${s.no}: ${s.title || '(không tiêu đề)'}`);
  }
  const titles = [];
  let inFm = false;
  let inFence = false;
  const lines = String(rawText || '').replace(/\r\n/gu, '\n').split('\n');
  lines.forEach((line, i) => {
    if (i === 0 && line.trim() === '---') { inFm = true; return; }
    if (inFm) { if (line.trim() === '---') inFm = false; return; }
    if (/^\s*(?:```|~~~)/u.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const h = line.match(/^\s*(#{1,6})\s+(.+?)\s*$/u);
    if (h) { titles.push(`${h[1]} ${h[2]}`); return; }
    const b = line.match(/^\s*\*\*([^*\n]{4,95})\*\*[.:!]?\s*$/u);
    if (b) titles.push(b[1]);
  });
  return titles;
}

function formatScanHuman(res) {
  const lines = [];
  const label = res.file || '<stdin>';
  const cvPart = res.sentence_length_cv !== null && res.sentence_length_cv !== undefined
    ? `, CV=${res.sentence_length_cv}`
    : '';
  const slidePart = res.slides !== null && res.slides !== undefined ? `, ${res.slides} slides` : '';
  lines.push(`${label}: ${res.score}/100 (${res.band}) — ${res.words} từ${slidePart}${cvPart}, ${res.total_hits} dấu hiệu`);

  if (res.groups.length) {
    for (const g of res.groups) {
      const sample = res.findings.filter((f) => f.id === g.id).slice(0, 3);
      const locs = sample.map((s) => `${s.location}: ${JSON.stringify(s.excerpt)}`).join(' | ');
      lines.push(`  - [${g.id}] (${g.label} x${g.count}): ${locs}`);
    }
  }
  if (res.to_confirm?.length) {
    const items = res.to_confirm.slice(0, 6).map((c) => `d${c.line}: "${c.detail}"`).join(', ');
    lines.push(`  ! cần xác nhận số liệu tự xưng: ${items}`);
  }
  return lines.join('\n');
}

export function selfTest() {
  const fail = (msg) => { throw new Error(`SELF-TEST FAIL — ${msg}`); };
  scoreSelfTest();

  const dirty = [
    'Trong bối cảnh chuyển đổi số hiện nay, bài viết này sẽ phân tích vấn đề cốt lõi.',
    'Không phải chi phí mà là tốc độ một cách đáng kể.',
    'Còn bạn thì sao? Hãy để lại bình luận nhé!',
  ].join('\n\n');
  const clean = 'Cửa hàng ở đường Lê Lợi bán 120 ly cà phê sáng nay. Giá giữ nguyên 25.000đ như tuần trước.';

  const dir = mkdtempSync(join(tmpdir(), 'viet-pro-scan-test-'));
  try {
    const dirtyMd = join(dir, 'dirty.md');
    const cleanMd = join(dir, 'clean.md');
    const deckPptx = join(dir, 'deck.pptx');
    writeFileSync(dirtyMd, dirty, 'utf8');
    writeFileSync(cleanMd, clean, 'utf8');
    writeFileSync(deckPptx, buildTestPptxBuffer([
      { title: 'Kế hoạch Q4', body: ['Ban điều hành'] },
      { title: 'Tổng quan', body: ['Một hai ba bốn năm sáu'] },
      { title: 'Chi phí quý II giảm 12%', body: ['Số liệu đối chiếu so với quý I.'] },
    ]));

    if (runScanCli([cleanMd, '--max', '10']) !== 0) fail('văn sạch phải pass --max 10');
    if (runScanCli([dirtyMd, '--max', '10']) !== 1) fail('văn AI không bị chặn bởi --max 10');
    if (runScanCli([dirtyMd, '--json']) !== 0) fail('--json trên markdown lỗi exit code');
    if (runScanCli([deckPptx, '--text']) !== 0) fail('--text trên .pptx lỗi exit code');
    if (runScanCli([deckPptx, '--titles', '--json']) !== 0) fail('--titles --json trên .pptx lỗi');
    if (runScanCli([deckPptx, '--max', '5']) !== 1) fail('.pptx có tiêu đề "Tổng quan" phải vượt --max 5');

    const pRes = scanFile(deckPptx);
    if (!pRes.is_pptx || pRes.slides !== 3 || !pRes.groups.some((g) => g.id === 'slide-label-title')) {
      fail('scanFile .pptx không trả metadata/phát hiện slide');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  console.log('SELF-TEST PASS — scan-cli.mjs (.md, .pptx, --max, --titles, --text, --json)');
  return 0;
}

export function runScanCli(argv = process.argv.slice(2)) {
  if (argv.includes('--self-test')) {
    try {
      return selfTest();
    } catch (err) {
      console.error(err.message);
      return 1;
    }
  }

  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      options: {
        json: { type: 'boolean', default: false },
        max: { type: 'string' },
        titles: { type: 'boolean', default: false },
        meta: { type: 'boolean', default: false },
        chat: { type: 'boolean', default: false },
        text: { type: 'boolean', default: false },
        stdin: { type: 'boolean', default: false },
        register: { type: 'string' },
        'no-tts-tags': { type: 'boolean', default: false },
        'self-test': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    }));
  } catch (err) {
    console.error(`Lỗi tham số scan: ${err.message}`);
    return 2;
  }

  if (values.help) {
    console.log('Usage: viet-pro scan [file.md|deck.pptx...] [--json] [--max <0..100>] [--titles] [--meta] [--chat] [--text] [--stdin] [--register <name>] [--self-test]');
    return 0;
  }

  let maxScore = null;
  if (values.max !== undefined) {
    maxScore = Number(values.max);
    if (!Number.isFinite(maxScore) || maxScore < 0 || maxScore > 100) {
      console.error('--max cần một số trong khoảng 0..100');
      return 2;
    }
  }

  const useStdin = values.stdin || (positionals.length === 1 && positionals[0] === '-') || (positionals.length === 0 && !process.stdin.isTTY);
  if (!useStdin && positionals.length === 0) {
    console.error('Usage: viet-pro scan <file.md|deck.pptx...> [options] | --stdin');
    return 2;
  }

  const opts = {
    meta: values.meta,
    titles: values.titles,
    chat: values.chat,
    register: values.register,
    ttsTags: values['no-tts-tags'] ? false : undefined,
  };

  if (values.text) {
    if (useStdin) {
      console.log(readFileSync(0, 'utf8'));
      return 0;
    }
    for (const file of positionals) {
      const abs = resolve(file);
      if (!existsSync(abs)) {
        console.error(`Không tìm thấy file: ${abs}`);
        return 2;
      }
      if (abs.toLowerCase().endsWith('.pptx')) {
        console.log(formatPptxText(readPptx(abs)));
      } else {
        console.log(readFileSync(abs, 'utf8'));
      }
    }
    return 0;
  }

  const results = [];
  if (useStdin) {
    const raw = readFileSync(0, 'utf8');
    const r = { file: '<stdin>', is_pptx: false, ...scanText(raw, opts) };
    if (values.titles) r.titles_list = extractTitles(raw, false, null);
    results.push(r);
  } else {
    for (const file of positionals) {
      const abs = resolve(file);
      if (!existsSync(abs)) {
        console.error(`Không tìm thấy file: ${abs}`);
        return 2;
      }
      const r = scanFile(abs, opts);
      if (values.titles) {
        const raw = r.is_pptx ? '' : readFileSync(abs, 'utf8');
        r.titles_list = extractTitles(raw, r.is_pptx, r.slides_data);
      }
      const { slides_data: _ignoredSlides, ...publicResult } = r;
      results.push(publicResult);
    }
  }

  if (values.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else if (values.titles) {
    for (const r of results) {
      if (results.length > 1) console.log(`=== ${r.file} ===`);
      const list = r.titles_list || [];
      if (!list.length) console.log('(không tìm thấy tiêu đề)');
      else list.forEach((t, idx) => console.log(`${idx + 1}. ${t}`));
      console.log(formatScanHuman(r));
    }
  } else {
    console.log(results.map(formatScanHuman).join('\n\n'));
  }

  if (maxScore !== null && results.some((r) => r.score > maxScore)) {
    return 1;
  }
  return 0;
}

const isEntry = process.argv[1]
  && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry) {
  process.exit(runScanCli(process.argv.slice(2)));
}
