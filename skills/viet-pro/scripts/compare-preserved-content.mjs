#!/usr/bin/env node
// Compare protected facts before/after a prose edit.
// Usage: node compare-preserved-content.mjs <before> <after> [--keep "Tên riêng"]... [--strict-quotes]
//        node compare-preserved-content.mjs --self-test
// MISMATCH lines (exit 1): a protected token changed, or a number kept its value but the word
// before it flipped to an opposite (tăng -> giảm). REVIEW lines (exit 0): the word right before a
// number changed in another way; read that sentence in context. Polarity detection is a signal,
// not proof the meaning is unchanged.

import { readFileSync } from 'node:fs';
import { compare } from './lib/compare.mjs';

function selfTest() {
  const fail = (msg) => { console.error(`SELF-TEST FAIL — ${msg}`); process.exit(1); };
  const before = 'Ngày 10/09/2026, OpenAI đứng #1 với 42,5%. Xem [nguồn](https://example.com/r?a=1). Báo cáo ghi "mẫu 120 người" [1].';
  const safeAfter = 'OpenAI đứng #1 với 42,5% vào ngày 10/09/2026. Báo cáo ghi "mẫu 120 người" [1]; nguồn: [xem tại đây](https://example.com/r?a=1).';
  if (compare(before, safeAfter, ['OpenAI']).differences.length) fail('false positive trên bản sửa an toàn');
  if (!compare(before, safeAfter.replace('42,5%', '45%'), ['OpenAI']).differences.some((d) => d.kind === 'numberOrDate')) fail('không bắt được số liệu thay đổi');

  const growth = 'Doanh thu tăng 12% trong quý II.';
  if (!compare(growth, 'Doanh thu giảm 12% trong quý II.').differences.some((d) => d.kind === 'polarity')) fail('không bắt được tăng -> giảm quanh 12%');
  if (compare(growth, 'Quý II, doanh thu tăng 12%.').differences.length) fail('false positive khi chỉ đảo trật tự câu');
  if (compare(growth, 'Doanh thu tăng thêm 12% trong quý II.').reviews.length !== 1) fail('không đánh dấu REVIEW khi từ trước số thay đổi');

  const straight = 'Anh Minh nói "giữ nguyên".';
  const curly = 'Anh Minh nói “giữ nguyên”.';
  if (compare(straight, curly).differences.length) fail('đổi kiểu dấu ngoặc bị coi là đổi trích dẫn');
  if (!compare(straight, curly, [], { strictQuotes: true }).differences.some((d) => d.kind === 'quote')) fail('--strict-quotes không bắt được đổi kiểu dấu ngoặc');

  if (compare('Xem https://x.com/a.', 'Xem https://x.com/a').differences.length) fail('dấu chấm cuối câu làm URL bị coi là khác');

  const keepDiff = (a, b, keep) => compare(a, b, keep).differences.some((d) => d.kind === 'keep');
  if (!keepDiff('Anh An đến.', 'Anh Bình đến.', ['An'])) fail('--keep không bắt được tên riêng bị đổi');
  if (keepDiff('Anh An đến.', 'An đến.', ['An'])) fail('--keep khớp "An" bên trong "Anh"');
  if (keepDiff('Giá 45.000đ.', 'Giá 45.000đ một suất.', ['45.000'])) fail('--keep không khớp "45.000" trong "45.000đ"');
  if (!keepDiff('Giá 45.000đ.', 'Giá 45.0001.', ['45.000'])) fail('--keep khớp "45.000" bên trong "45.0001"');
  if (!keepDiff('Giá 45.000đ.', 'Giá 145.000đ.', ['45.000'])) fail('--keep khớp "45.000" bên trong "145.000"');
  for (const k of ['https://example.com/api?v=2', '18%', '```yaml', 'title: "Giá mới"']) {
    if (keepDiff(`Xem ${k} nhé.`, `Nhé, xem ${k}.`, [k])) fail(`--keep không khớp chuỗi có ký tự đặc biệt: ${k}`);
    if (!keepDiff(`Xem ${k} nhé.`, 'Xem nhé.', [k])) fail(`--keep không bắt được khi mất chuỗi: ${k}`);
  }

  console.log('SELF-TEST PASS — bảo toàn URL, số/ngày, quote, citation, ranking, chuỗi --keep và chiều tăng/giảm quanh số liệu');
}

const args = process.argv.slice(2);
if (args[0] === '--self-test') {
  selfTest();
  process.exit(0);
}
const files = [];
const keep = [];
let strictQuotes = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--keep' && args[i + 1]) keep.push(args[++i]);
  else if (args[i] === '--strict-quotes') strictQuotes = true;
  else files.push(args[i]);
}
if (files.length !== 2) {
  console.error('Usage: node compare-preserved-content.mjs <before> <after> [--keep "Tên riêng"]... [--strict-quotes]');
  process.exit(2);
}
const { differences, reviews } = compare(readFileSync(files[0], 'utf8'), readFileSync(files[1], 'utf8'), keep, { strictQuotes });
for (const r of reviews) console.log(`REVIEW [context] ${JSON.stringify(r.token)}: "${r.before.join(' | ')}" -> "${r.after.join(' | ')}"`);
if (!differences.length) {
  console.log('PASS — các dữ kiện được bảo toàn');
  process.exit(0);
}
for (const d of differences) {
  if (d.kind === 'polarity') console.error(`MISMATCH [polarity] ${JSON.stringify(d.token)}: "${d.before}" -> "${d.after}"`);
  else console.error(`MISMATCH [${d.kind}] ${JSON.stringify(d.token)}: ${d.before} -> ${d.after}`);
}
process.exit(1);
