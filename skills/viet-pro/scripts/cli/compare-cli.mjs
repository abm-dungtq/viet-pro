// Compare protected facts before/after a prose edit.
// Usage: node compare-preserved-content.mjs <before> <after> [--keep "Tên riêng"]... [--strict-quotes]
//        node compare-preserved-content.mjs --self-test
// MISMATCH lines (exit 1): a protected token changed, or a number kept its value but the word
// before it flipped to an opposite (tăng -> giảm). REVIEW lines (exit 0): the word right before a
// number changed in another way; read that sentence in context. Polarity detection is a signal,
// not proof the meaning is unchanged.

import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare, computeEditRatio } from '../lib/compare.mjs';
import { buildTestPptxBuffer, pptxToText, readPptx } from '../lib/pptx.mjs';

function readComparableText(filePath) {
  if (filePath.toLowerCase().endsWith('.pptx')) {
    return pptxToText(readPptx(filePath)).text;
  }
  return readFileSync(filePath, 'utf8');
}

function selfTest() {
  const fail = (msg) => { throw new Error(`SELF-TEST FAIL — ${msg}`); };
  const before = 'Ngày 10/09/2026, OpenAI đứng #1 với 42,5%. Xem [nguồn](https://example.com/r?a=1). Báo cáo ghi "mẫu 120 người" [1].';
  const safeAfter = 'OpenAI đứng #1 với 42,5% vào ngày 10/09/2026. Báo cáo ghi "mẫu 120 người" [1]; nguồn: [xem tại đây](https://example.com/r?a=1).';
  if (compare(before, safeAfter, ['OpenAI']).differences.length) fail('false positive trên bản sửa an toàn');
  if (!compare(before, safeAfter.replace('42,5%', '45%'), ['OpenAI']).differences.some((d) => d.kind === 'numberOrDate')) fail('không bắt được số liệu thay đổi');

  const growth = 'Doanh thu tăng 12% trong quý II.';
  if (!compare(growth, 'Doanh thu giảm 12% trong quý II.').differences.some((d) => d.kind === 'polarity')) fail('không bắt được tăng -> giảm quanh 12%');
  if (compare(growth, 'Quý II, doanh thu tăng 12%.').differences.length) fail('false positive khi chỉ đảo trật tự câu');
  if (compare(growth, 'Doanh thu tăng thêm 12% trong quý II.').reviews.length !== 1) fail('không đánh dấu REVIEW khi từ trước số thay đổi');
  if (!compare('Chi phí giảm tối đa 15% năm nay.', 'Chi phí giảm tối thiểu 15% năm nay.').differences.some((d) => d.kind === 'polarity' && d.before === 'tối đa' && d.after === 'tối thiểu')) fail('không bắt được tối đa -> tối thiểu quanh 15%');
  if (!compare('Thời gian xử lý chưa tới 10 phút.', 'Thời gian xử lý hơn 10 phút.').differences.some((d) => d.kind === 'polarity' && d.before === 'chưa tới' && d.after === 'hơn')) fail('không bắt được chưa tới -> hơn quanh 10');

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
  if (computeEditRatio('Mot hai ba bon', 'Mot hai ba bon') !== 0) fail('edit_ratio của hai câu giống hệt phải bằng 0');
  const ratioRes = compare('Một hai ba bốn năm sáu bảy tám chín mười.', 'Một hai ba bốn năm sáu bảy tám chín mười một.', [], { maxEditRatio: 0.2 });
  if (ratioRes.differences.length || !(ratioRes.edit_ratio > 0 && ratioRes.edit_ratio <= 0.2)) fail('maxEditRatio báo sai khi tỷ lệ sửa nằm trong ngưỡng');
  const overRatio = compare('Một hai ba bốn.', 'Sáu bảy tám chín mười.', [], { maxEditRatio: 0.15 });
  if (!overRatio.differences.some((d) => d.kind === 'edit_ratio')) fail('--max-edit-ratio không chặn khi tỷ lệ sửa vượt ngưỡng');

  if (compare('Hôm nay doanh thu đạt 12 tỷ.', '[nhanh] Hôm nay doanh thu đạt 12 tỷ. [nghỉ 1s]').differences.length) {
    fail('thẻ TTS [nhanh]/[nghỉ 1s] gây báo sai MISMATCH');
  }
  if (compare('Hôm nay doanh thu đạt 12 tỷ.', '[trầm] [nhấn] Hôm nay doanh thu đạt 12 tỷ. [kể] [nghỉ 1.5s]').differences.length) {
    fail('thẻ TTS [trầm]/[nhấn]/[kể]/[nghỉ 1.5s] gây báo sai MISMATCH');
  }
  if (!compare('Hôm nay doanh thu đạt 12 tỷ [1].', '[nhanh] Hôm nay doanh thu đạt 12 tỷ. [nghỉ 1s]').differences.some((d) => d.kind === 'citation' && d.token === '[1]')) {
    fail('mất citation [1] không bị bắt khi cho phép thẻ TTS');
  }
  if (compare('Hôm nay doanh thu đạt 12 tỷ [nguồn].', '[nhanh] Hôm nay doanh thu đạt 12 tỷ [nguồn]. [nghỉ]').differences.length) {
    fail('citation [nguồn] bị lọc nhầm khi bật thẻ TTS');
  }
  if (!compare('Hôm nay doanh thu đạt 12 tỷ.', '[nhanh] Hôm nay doanh thu đạt 12 tỷ. [nghỉ 1s]', [], { ttsTags: false }).differences.some((d) => d.kind === 'citation')) {
    fail('ttsTags: false không giữ kiểm tra citation trên thẻ TTS');
  }
  if (!(computeEditRatio('Hôm nay doanh thu đạt 12 tỷ.', '[nhanh] Hôm nay doanh thu đạt 12 tỷ. [nghỉ 1s]') > 0)) {
    fail('computeEditRatio phải giữ nguyên cách tính trên văn bản gốc');
  }
  if (compare('Chi phí là 1.200 USD và 45.000đ.', 'Chi phí là 1,200 USD và 45000đ.').differences.length) {
    fail('canonicalize số hàng nghìn (1.200 <-> 1,200 / 45.000đ <-> 45000đ) phải khớp');
  }
  if (!compare('Tỷ lệ 42,5%.', 'Tỷ lệ 425%.').differences.some((d) => d.kind === 'numberOrDate')) {
    fail('canonicalize số thập phân không được làm gộp 42,5% thành 425%');
  }
  if (compare('Quy trình gồm 3 bước chính.', 'Quy trình gồm ba bước chính.').differences.length) {
    fail('"3 bước" <-> "ba bước" phải được đối soát tương đương');
  }
  if (compare('Suốt năm tháng qua doanh số ổn định.', 'Thời gian qua doanh số ổn định.').differences.length) {
    fail('bỏ từ chữ số đơn lẻ không gắn số đối ứng ("năm tháng") không được sinh MISMATCH ảo');
  }
  if (!compare('Anh ấy làm ở đó 5 năm.', 'Anh ấy làm ở đó nhiều tháng.').differences.some((d) => d.token === '5')) {
    fail('"5 năm" bị mất số 5 phải báo MISMATCH');
  }
  const quantAlert = compare('Hầu hết cửa hàng đã mở lại.', 'Các cửa hàng đã mở lại.');
  if (quantAlert.differences.length || !quantAlert.reviews.some((r) => r.kind === 'quantity_word' && r.token === 'hầu hết')) {
    fail('rơi từ lượng từ "hầu hết" phải phát REVIEW [quantity_word]');
  }
  const shadeAlert = compare('Doanh thu có thể tăng thêm 10%.', 'Doanh thu tăng thêm 10%.');
  if (shadeAlert.differences.length || !shadeAlert.reviews.some((r) => r.kind === 'shade' && r.token === 'có thể')) {
    fail('rơi từ rào đón "có thể" phải phát REVIEW [shade]');
  }

  // v6.2.0: partial drop (b > a) on chưa/chỉ/vẫn + chỉ ra non-trigger
  const partialChi = compare('Bản này chỉ dùng cho nhóm A và chỉ chạy buổi sáng.', 'Bản này chỉ dùng cho nhóm A và chạy buổi sáng.');
  if (!partialChi.reviews.some((r) => r.kind === 'shade' && r.token === 'chỉ')) {
    fail('giảm số lần xuất hiện từ "chỉ" (2 -> 1) phải phát REVIEW [shade]');
  }
  if (compare('Báo cáo chỉ ra xu hướng tăng 10%.', 'Báo cáo nêu xu hướng tăng 10%.').reviews.some((r) => r.token === 'chỉ')) {
    fail('"chỉ ra" là động từ ghép, không được phát REVIEW [shade] "chỉ"');
  }
  if (!compare('Hệ thống chưa chạy ổn.', 'Hệ thống chạy ổn.').reviews.some((r) => r.kind === 'shade' && r.token === 'chưa')) {
    fail('mất "chưa" phải phát REVIEW [shade]');
  }

  // inlineCode checks
  if (!compare('Chạy `npm test` trước khi gửi.', 'Chạy kiểm thử trước khi gửi.').differences.some((d) => d.kind === 'inlineCode' && d.token === 'npm test')) {
    fail('mất inlineCode `npm test` phải báo MISMATCH [inlineCode]');
  }
  if (!compare('Chạy kiểm thử trước khi gửi.', 'Chạy `vitest` trước khi gửi.').differences.some((d) => d.kind === 'inlineCode' && d.token === 'vitest')) {
    fail('bịa thêm inlineCode `vitest` mới phải báo MISMATCH [inlineCode]');
  }
  if (compare('Chạy `npm test` ngay.', 'Chạy lệnh sau:\n```bash\nnpm test\n```').differences.length) {
    fail('chuyển inlineCode sang fenced code block không được báo MISMATCH');
  }
  if (compare('Chạy viet-pro scan trước.', 'Chạy `viet-pro scan` trước.').differences.length) {
    fail('bọc backtick quanh cụm đã có sẵn trong bản gốc không được báo MISMATCH');
  }

  // number_word, weekday_month, proper_name reviews + .pptx comparison
  const numWordRes = compare('Ba khách hàng đã ký hợp đồng.', 'Năm khách hàng đã ký hợp đồng.');
  if (numWordRes.differences.length || !numWordRes.reviews.some((r) => r.kind === 'number_word')) {
    fail('"Ba khách" -> "Năm khách" phải phát REVIEW [number_word]');
  }
  const wmRes = compare('Cuộc họp dời sang thứ tư tuần tới.', 'Cuộc họp dời sang thứ năm tuần tới.');
  if (!wmRes.reviews.some((r) => r.kind === 'weekday_month' && r.token === 'thứ tư')) {
    fail('đổi thứ tư -> thứ năm phải phát REVIEW [weekday_month]');
  }
  const pnRes = compare('Nhóm Vinalight tuân thủ chuẩn GDPR năm nay.', 'Nhóm đó tuân thủ quy định năm nay.');
  if (!pnRes.reviews.some((r) => r.kind === 'proper_name' && r.token === 'Vinalight') || !pnRes.reviews.some((r) => r.kind === 'proper_name' && r.token === 'GDPR')) {
    fail('rơi tên riêng Vinalight / viết tắt GDPR phải phát REVIEW [proper_name]');
  }
  if (compare('# BÁO CÁO TÀI CHÍNH\nNội dung giữ nguyên.', '# Báo cáo tài chính\nNội dung giữ nguyên.').reviews.some((r) => r.kind === 'proper_name')) {
    fail('đổi tiêu đề ALL-CAPS sang viết thường không được phát REVIEW [proper_name]');
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'viet-pro-cmp-pptx-'));
  try {
    const pBefore = join(tmpDir, 'before.pptx');
    const pAfterOk = join(tmpDir, 'after-ok.pptx');
    const pAfterBad = join(tmpDir, 'after-bad.pptx');
    writeFileSync(pBefore, buildTestPptxBuffer([{ title: 'Doanh thu đạt 12%', body: ['Tăng nhẹ quý II'] }]));
    writeFileSync(pAfterOk, buildTestPptxBuffer([{ title: 'Doanh thu quý II đạt 12%', body: ['Số liệu đối chiếu kế toán'] }]));
    writeFileSync(pAfterBad, buildTestPptxBuffer([{ title: 'Doanh thu đạt 18%', body: ['Tăng nhẹ quý II'] }]));
    if (runCompareCli([pBefore, pAfterOk]) !== 0) fail('.pptx giữ nguyên 12% phải PASS compare');
    if (runCompareCli([pBefore, pAfterBad]) !== 1) fail('.pptx đổi 12% -> 18% phải MISMATCH');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('SELF-TEST PASS — bảo toàn URL, số/ngày, quote, citation, ranking, inlineCode, chuỗi --keep, chiều tăng/giảm, thẻ TTS, canonical số, số chữ, lượng/rào đón, thứ/tháng, tên riêng và .pptx');
}

export function runCompareCli(args = process.argv.slice(2)) {
  if (args[0] === '--self-test') {
    try {
      selfTest();
      return 0;
    } catch (e) {
      console.error(e.message);
      return 1;
    }
  }
  const files = [];
  const keep = [];
  let strictQuotes = false;
  let maxEditRatio;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keep' && args[i + 1]) keep.push(args[++i]);
    else if (args[i] === '--strict-quotes') strictQuotes = true;
    else if (args[i] === '--max-edit-ratio' && args[i + 1]) {
      maxEditRatio = Number(args[++i]);
      if (!(maxEditRatio >= 0 && maxEditRatio <= 1)) {
        console.error('--max-edit-ratio cần một số trong khoảng 0..1');
        return 2;
      }
    } else files.push(args[i]);
  }
  if (files.length !== 2) {
    console.error('Usage: viet-pro compare <before.md|.pptx> <after.md|.pptx> [--keep "Tên riêng"]... [--strict-quotes] [--max-edit-ratio <0..1>]');
    return 2;
  }
  const { differences, reviews, edit_ratio } = compare(readComparableText(files[0]), readComparableText(files[1]), keep, { strictQuotes, maxEditRatio });
  for (const r of reviews) console.log(`REVIEW [${r.kind || 'context'}] ${JSON.stringify(r.token)}: "${r.before.join(' | ')}" -> "${r.after.join(' | ')}"`);
  if (!differences.length) {
    console.log(`PASS — các dữ kiện được bảo toàn (edit_ratio: ${(edit_ratio * 100).toFixed(1)}%)`);
    return 0;
  }
  for (const d of differences) {
    if (d.kind === 'polarity') console.error(`MISMATCH [polarity] ${JSON.stringify(d.token)}: "${d.before}" -> "${d.after}"`);
    else console.error(`MISMATCH [${d.kind}] ${JSON.stringify(d.token)}: ${d.before} -> ${d.after}`);
  }
  return 1;
}

const isEntry = process.argv[1]
  && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry) {
  process.exit(runCompareCli(process.argv.slice(2)));
}
