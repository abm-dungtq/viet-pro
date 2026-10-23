#!/usr/bin/env node
// lint-vietnamese-content.mjs — deterministic checks for Vietnamese content (viet-pro reviewer step 0)
// Usage:  node lint-vietnamese-content.mjs <file.md> ... [--keep "Tên riêng"]...
//         node lint-vietnamese-content.mjs --self-test
// Output: ERROR/WARN lines. Exit 1 if any ERROR (or self-test failure), else 0.
// Rules map to references/review/punctuation.md, capitalization.md, anti-ai.md.

import { readFileSync } from 'node:fs';
import { lintText } from './lib/lint.mjs';

function report(file, findings) {
  if (!findings.length) { console.log(`OK    ${file} — 0 vi phạm`); return; }
  for (const f of findings) console.log(`${f.level} ${file}:${f.line} [${f.id}] ${JSON.stringify(f.excerpt)}`);
}

// ---------------- self-test ----------------
function selfTest() {
  const dirty = [
    'Trong bối cảnh thị trường thay đổi nhanh, doanh nghiệp cần thích nghi.',
    'Đây là câu có em-dash — sai quy tắc.',
    'Câu này có en-dash – cũng sai.',
    'Nhanh hơn, sạch hơn, và đúng hơn.',
    'Câu này sai dấu , vì có cách trước.',
    'Key insights: đây là nhãn AI.',
    '# Vibe coding: lỗi không phải ở AI',
    'Hướng Dẫn Sử Dụng Phần Mềm Kế Toán ngay hôm nay.',
    'Dưới đây là bài viết bạn yêu cầu.',
    'Đây không chỉ là chuyện chi phí mà còn là chuyện tốc độ.',
    'Đó không phải là lỗi công cụ mà là lỗi quy trình.',
    '**Bối cảnh:** Doanh thu giảm.',
    '**Vấn đề:** Tỷ lệ hoàn đơn tăng.',
    '**Kết luận:** Nhóm cần kiểm tra dữ liệu.',
    'Và đó mới là điều đáng sợ.',
    'Không ai còn có thể làm ngơ.',
    'Doanh thu tăng mạnh :contentReference[oaicite:0]{index=0} trong quý.',
    'Xem thêm tại https://example.com/bai?utm_source=chatgpt.com nhé.',
    'Liên hệ [Tên công ty] để biết thêm.',
  ].join('\n\n');
  const clean = [
    'Đây là câu sạch, đúng chuẩn tiếng Việt.',
    '# Tiêu đề không có dấu hai chấm',
    'Quán cà phê có 10 đầu việc, 3 đầu việc đang dùng AI (phơi nhiễm 30%).',
    'Giờ hẹn là 14:30 ngày mai.',
    'Gói này không chỉ có 10 GB lưu trữ mà còn có sao lưu hằng ngày.',
    'Đăng ký trước ngày 30/09 nếu bạn muốn tham dự buổi hướng dẫn.',
    'Kịch bản: [Cảnh 1: chèn logo LexiGo góc phải màn hình].',
  ].join('\n\n');

  const dirtyFindings = lintText(dirty);
  const cleanFindings = lintText(clean).filter((f) => f.level === 'ERROR');
  const expect = ['em-dash', 'oxford-comma', 'space-before-punct', 'ai-label', 'heading-colon', 'title-case', 'chatbot-residue', 'staged-opener', 'contrast-formula-repeat', 'decorative-bold-labels', 'dramatic-closer-repeat', 'chatbot-citation', 'placeholder'];
  const got = new Set(dirtyFindings.map((f) => f.id));
  const missed = expect.filter((r) => !got.has(r));
  let transitionText = 'Mở bài. Tuy nhiên, một. Tuy nhiên, hai. Tuy nhiên, ba. Tuy nhiên, bốn.';
  const transitionHit = lintText(transitionText).some((f) => f.id === 'transition-overuse');

  if (missed.length) { console.error(`SELF-TEST FAIL — không bắt được: ${missed.join(', ')}`); process.exit(1); }
  if (!transitionHit) { console.error('SELF-TEST FAIL — không bắt transition-overuse'); process.exit(1); }
  const reuseText = ['Chúng tôi luôn đặt khách hàng làm trung tâm.', 'Mọi quyết định đều đặt khách hàng làm trung tâm.', 'Đội ngũ tiếp tục đặt khách hàng làm trung tâm.'].join('\n\n');
  if (!lintText(reuseText).some((f) => f.id === 'phrase-reuse')) { console.error('SELF-TEST FAIL — không bắt phrase-reuse'); process.exit(1); }
  const nine = 'Cửa hàng mở bán thêm món bánh mì nướng muối ớt';
  const spanFindings = lintText(`${nine}. Hôm nay ${nine}. Cuối tuần ${nine}.`).filter((f) => f.id === 'phrase-reuse');
  if (spanFindings.length !== 1) { console.error(`SELF-TEST FAIL — cụm lặp 9 âm tiết sinh ${spanFindings.length} cảnh báo, cần 1`); process.exit(1); }
  const twoSpans = ['Khách hàng nhận quà tặng sáng nay.', 'Cửa hàng nhận quà tặng đặc biệt.'].join(' ').repeat(3);
  const twoFound = lintText(twoSpans).filter((f) => f.id === 'phrase-reuse').map((f) => f.excerpt);
  if (twoFound.length !== 2 || !twoFound.some((e) => e.includes('"khách hàng nhận quà tặng sáng nay"'))) { console.error(`SELF-TEST FAIL — gộp nhầm hai cụm lặp không liền nhau: ${JSON.stringify(twoFound)}`); process.exit(1); }
  if (lintText(reuseText, { keep: ['đặt khách hàng làm trung tâm'] }).some((f) => f.id === 'phrase-reuse')) { console.error('SELF-TEST FAIL — --keep không chặn phrase-reuse'); process.exit(1); }
  const uniform = Array.from({ length: 6 }, (_, i) => `Đoạn ${i + 1} có một câu. Đoạn này có câu thứ hai.`).join('\n\n');
  if (lintText(uniform).some((f) => f.id === 'paragraph-uniformity')) { console.error('SELF-TEST FAIL — paragraph-uniformity vẫn còn'); process.exit(1); }
  const protectedText = '---\ntitle: "Dưới đây là cấu hình"\n---\n\n```yaml\nsummary: "Dưới đây là dữ liệu"\n```\n\nGói này không chỉ có 10 GB lưu trữ mà còn có sao lưu hằng ngày.';
  const protectedFindings = lintText(protectedText).filter((f) => ['chatbot-residue', 'contrast-formula-repeat', 'staged-opener'].includes(f.id));

  if (cleanFindings.length) { console.error(`SELF-TEST FAIL — false positive ERROR trên văn sạch: ${JSON.stringify(cleanFindings)}`); process.exit(1); }
  if (protectedFindings.length) { console.error(`SELF-TEST FAIL — false positive trên frontmatter/code/câu đối lập hợp lệ: ${JSON.stringify(protectedFindings)}`); process.exit(1); }
  const songLyrics = [
    '## title',
    'Phố Chiều Còn Nắng Ấm',
    '## description',
    'Warm Indie Acoustic Ballad, Fingerpicked Nylon Guitar, Clear Vietnamese Pronunciation',
    '## caption',
    'Muffled Vocals, Heavy Distortion, Rushed Phrasing',
    '## body',
    '[Verse 1 - Acoustic Guitar Fingerpicking]',
    'Nắng chiều buông nhẹ trên vai áo, gió đưa hương mùa cũ quay về',
    '[Chorus - Emotional Climax]',
    'Gọi tên nhau giữa chiều gió lộng, để lời ca bay mãi ngàn khơi',
    '[Verse 2 - Soft Piano And Strings]',
    'Ánh đèn lên chậm nơi cuối ngõ, tiếng rao đêm chạm khẽ hiên nhà',
    '[Chorus - Emotional Climax]',
    'Gọi tên nhau giữa chiều gió lộng, để lời ca bay mãi ngàn khơi',
    '[Final Chorus - Full Band Outro]',
    'Gọi tên nhau giữa chiều gió lộng, để lời ca bay mãi ngàn khơi',
  ].join('\n');
  const songFindings = lintText(songLyrics).filter((f) => ['title-case', 'phrase-reuse'].includes(f.id));
  if (songFindings.length) { console.error(`SELF-TEST FAIL — false positive trên metatag/Chorus bài hát: ${JSON.stringify(songFindings)}`); process.exit(1); }
  console.log(`SELF-TEST PASS — bắt đủ ${expect.length + 2} nhóm vi phạm, không báo sai frontmatter/code/câu đối lập đơn lẻ/lời bài hát`);
  process.exit(0);
}

// ---------------- main ----------------
const args = process.argv.slice(2);
const usage = 'Usage: node lint-vietnamese-content.mjs <file.md> ... [--keep "Tên riêng"]... | --self-test';
if (!args.length) { console.error(usage); process.exit(2); }
if (args[0] === '--self-test') selfTest();

const keep = [];
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--keep') {
    if (i + 1 >= args.length) { console.error(usage); process.exit(2); }
    keep.push(args[++i]);
  } else files.push(args[i]);
}
if (!files.length) { console.error(usage); process.exit(2); }

let hasError = false;
for (const file of files) {
  const findings = lintText(readFileSync(file, 'utf8'), { keep });
  report(file, findings);
  if (findings.some((f) => f.level === 'ERROR')) hasError = true;
}
process.exit(hasError ? 1 : 0);
