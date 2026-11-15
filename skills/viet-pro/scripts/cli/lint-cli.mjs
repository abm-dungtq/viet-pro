// lint-vietnamese-content.mjs — deterministic checks for Vietnamese content (viet-pro reviewer step 0)
// Usage:  node lint-vietnamese-content.mjs <file.md> ... [--keep "Tên riêng"]...
//         node lint-vietnamese-content.mjs --self-test
// Output: ERROR/WARN lines. Exit 1 if any ERROR (or self-test failure), else 0.
// Rules map to references/review/punctuation.md, capitalization.md, anti-ai.md.

import { readFileSync } from 'node:fs';
import { computeRouteHint, lintText } from '../lib/lint.mjs';

function report(file, findings, showRoute = false, rawText = '') {
  const suffix = showRoute ? ` (route_hint: ${computeRouteHint(rawText, findings)})` : '';
  if (!findings.length) { console.log(`OK    ${file} — 0 vi phạm${suffix}`); return; }
  for (const f of findings) console.log(`${f.level} ${file}:${f.line} [${f.id}] ${JSON.stringify(f.excerpt)}`);
  if (showRoute) console.log(`INFO  ${file}:0 [route-hint] "${computeRouteHint(rawText, findings)}"`);
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

  if (missed.length) { console.error(`SELF-TEST FAIL — không bắt được: ${missed.join(', ')}`); return 1; }
  if (!transitionHit) { console.error('SELF-TEST FAIL — không bắt transition-overuse'); return 1; }
  const reuseText = ['Chúng tôi luôn đặt khách hàng làm trung tâm.', 'Mọi quyết định đều đặt khách hàng làm trung tâm.', 'Đội ngũ tiếp tục đặt khách hàng làm trung tâm.'].join('\n\n');
  if (!lintText(reuseText).some((f) => f.id === 'phrase-reuse')) { console.error('SELF-TEST FAIL — không bắt phrase-reuse'); return 1; }
  const nine = 'Cửa hàng mở bán thêm món bánh mì nướng muối ớt';
  const spanFindings = lintText(`${nine}. Hôm nay ${nine}. Cuối tuần ${nine}.`).filter((f) => f.id === 'phrase-reuse');
  if (spanFindings.length !== 1) { console.error(`SELF-TEST FAIL — cụm lặp 9 âm tiết sinh ${spanFindings.length} cảnh báo, cần 1`); return 1; }
  const twoSpans = ['Khách hàng nhận quà tặng sáng nay.', 'Cửa hàng nhận quà tặng đặc biệt.'].join(' ').repeat(3);
  const twoFound = lintText(twoSpans).filter((f) => f.id === 'phrase-reuse').map((f) => f.excerpt);
  if (twoFound.length !== 2 || !twoFound.some((e) => e.includes('"khách hàng nhận quà tặng sáng nay"'))) { console.error(`SELF-TEST FAIL — gộp nhầm hai cụm lặp không liền nhau: ${JSON.stringify(twoFound)}`); return 1; }
  if (lintText(reuseText, { keep: ['đặt khách hàng làm trung tâm'] }).some((f) => f.id === 'phrase-reuse')) { console.error('SELF-TEST FAIL — --keep không chặn phrase-reuse'); return 1; }
  const uniform = Array.from({ length: 6 }, (_, i) => `Đoạn ${i + 1} có một câu. Đoạn này có câu thứ hai.`).join('\n\n');
  if (lintText(uniform).some((f) => f.id === 'paragraph-uniformity')) { console.error('SELF-TEST FAIL — paragraph-uniformity vẫn còn'); return 1; }
  const protectedText = '---\ntitle: "Dưới đây là cấu hình"\n---\n\n```yaml\nsummary: "Dưới đây là dữ liệu"\n```\n\nGói này không chỉ có 10 GB lưu trữ mà còn có sao lưu hằng ngày.';
  const protectedFindings = lintText(protectedText).filter((f) => ['chatbot-residue', 'contrast-formula-repeat', 'staged-opener'].includes(f.id));

  if (cleanFindings.length) { console.error(`SELF-TEST FAIL — false positive ERROR trên văn sạch: ${JSON.stringify(cleanFindings)}`); return 1; }
  if (protectedFindings.length) { console.error(`SELF-TEST FAIL — false positive trên frontmatter/code/câu đối lập hợp lệ: ${JSON.stringify(protectedFindings)}`); return 1; }

  const mdTableAndInline = [
    '| Cột A    | Cột B    |',
    '| ---      | ---      |',
    '| | |',
    'Dùng `hai  khoảng  trắng` trong mã.',
  ].join('\n');
  if (lintText(mdTableAndInline).some((f) => f.id === 'double-space')) {
    console.error('SELF-TEST FAIL — false positive double-space trên bảng Markdown hoặc mã inline');
    return 1;
  }
  const repeatedLinks = Array.from({ length: 4 }, (_, i) => `Đoạn ${i + 1} tham chiếu [file.mjs](file:///Volumes/1/viet-pro/scripts/file.mjs).`).join('\n\n');
  if (lintText(repeatedLinks).some((f) => f.id === 'phrase-reuse')) {
    console.error('SELF-TEST FAIL — false positive phrase-reuse trên đích liên kết Markdown');
    return 1;
  }
  if (!lintText('Chữ này  có hai cách.').some((f) => f.id === 'double-space')) {
    console.error('SELF-TEST FAIL — không bắt double-space trên văn xuôi thường');
    return 1;
  }

  const ttsRepeated = Array.from({ length: 4 }, () => '[nhanh] Đọc rõ từng ý. [nghỉ 1s]').join('\n\n')
    + '\n\n[trầm] Giữ nhịp chậm lại [nhấn] ở con số 12. [kể] Nghe rất tự nhiên. [nghỉ] [nghỉ 1.5s]';
  const ttsFindings = lintText(ttsRepeated);
  if (ttsFindings.length) {
    console.error(`SELF-TEST FAIL — false positive trên thẻ TTS: ${JSON.stringify(ttsFindings)}`);
    return 1;
  }
  if (!lintText(ttsRepeated, { ttsTags: false }).some((f) => f.id === 'phrase-reuse')) {
    console.error('SELF-TEST FAIL — ttsTags: false phải giữ hành vi cũ');
    return 1;
  }

  const bannedHit = lintText('Sản phẩm cam kết 100% hiệu quả tức thì.', { bannedPhrases: ['cam kết 100%'] });
  if (!bannedHit.some((f) => f.id === 'banned-phrase' && f.level === 'ERROR')) {
    console.error('SELF-TEST FAIL — không bắt banned-phrase');
    return 1;
  }
  if (lintText('Chúc bạn bè cuối tuần vui vẻ.', { bannedPhrases: ['an'] }).some((f) => f.id === 'banned-phrase')) {
    console.error('SELF-TEST FAIL — banned-phrase vi phạm biên từ tiếng Việt');
    return 1;
  }
  const ctaMissing = lintText('---\ntitle: "Đăng ký ngay"\n---\nNội dung chia sẻ kiến thức.', { mandatoryCta: 'Đăng ký ngay' });
  if (!ctaMissing.some((f) => f.id === 'missing-mandatory-cta' && f.level === 'ERROR' && f.line === 0)) {
    console.error('SELF-TEST FAIL — không bắt missing-mandatory-cta');
    return 1;
  }
  if (lintText('Nội dung chia sẻ. đăng ký ngay tại trang chủ.', { mandatoryCta: 'Đăng ký ngay' }).some((f) => f.id === 'missing-mandatory-cta')) {
    console.error('SELF-TEST FAIL — mandatoryCta không hỗ trợ case-insensitive');
    return 1;
  }
  const fhWarn = lintText('Mình đã dùng gói này 3 tháng rồi, rất ổn.', { allowFirstHand: false });
  if (!fhWarn.some((f) => f.id === 'unverified-first-hand' && f.level === 'WARN')) {
    console.error('SELF-TEST FAIL — allowFirstHand: false không cảnh báo WARN');
    return 1;
  }
  const fhErr = lintText('Mình đã dùng gói này 3 tháng rồi, rất ổn.', { allowFirstHand: false, strictFirstHand: true });
  if (!fhErr.some((f) => f.id === 'unverified-first-hand' && f.level === 'ERROR')) {
    console.error('SELF-TEST FAIL — strictFirstHand: true không nâng mức ERROR');
    return 1;
  }
  const fhQuoted = '"Mình đã dùng gói này 3 tháng rồi"\n`Tôi đã test 5 ngày rồi`\n> Em đã thử 2 tuần rồi';
  if (lintText(fhQuoted, { allowFirstHand: false }).some((f) => f.id === 'unverified-first-hand')) {
    console.error('SELF-TEST FAIL — unverified-first-hand báo nhầm trong quote/code');
    return 1;
  }
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
  if (songFindings.length) { console.error(`SELF-TEST FAIL — false positive trên metatag/Chorus bài hát: ${JSON.stringify(songFindings)}`); return 1; }
  const transDirty = 'Việc triển khai phần mềm mới đóng vai trò quan trọng trong doanh nghiệp. Thông qua việc tiến hành kiểm tra một cách nhanh chóng, hệ thống được vận hành bởi đội ngũ nội bộ, qua đó giúp tiết kiệm chi phí.';
  if (!lintText(transDirty).some((f) => f.id === 'translationese-cluster')) { console.error('SELF-TEST FAIL — không bắt được translationese-cluster'); return 1; }
  const transClean = 'Việc áp dụng quy định mới bắt đầu từ thứ Hai tuần sau. Nhân viên tiến hành kiểm tra lại hồ sơ trước khi nộp.';
  if (lintText(transClean).some((f) => f.id === 'translationese-cluster')) { console.error('SELF-TEST FAIL — false positive translationese-cluster khi chỉ có 2 dấu hiệu'); return 1; }
  const buzzDirty = 'Sản phẩm mang lại giải pháp toàn diện với hệ sinh thái liền mạch, trở thành chìa khóa then chốt giúp mở khóa tiềm năng cho doanh nghiệp.';
  if (!lintText(buzzDirty).some((f) => f.id === 'ai-buzzword-cluster')) { console.error('SELF-TEST FAIL — không bắt được ai-buzzword-cluster'); return 1; }
  const nfdDirty = `Câu này chứa chữ ${'tiếng Việt'.normalize('NFD')} hệ tổ hợp NFD.`;
  if (!lintText(nfdDirty).some((f) => f.id === 'unicode-nfd')) { console.error('SELF-TEST FAIL — không bắt được unicode-nfd'); return 1; }
  if (lintText('Câu này chứa chữ tiếng Việt dựng sẵn NFC chuẩn.').some((f) => f.id === 'unicode-nfd')) { console.error('SELF-TEST FAIL — báo nhầm unicode-nfd trên chữ NFC'); return 1; }
  const hedgeDirty = 'Giải pháp này có thể sẽ góp phần cải thiện năng suất và dường như có xu hướng giảm chi phí.';
  if (!lintText(hedgeDirty).some((f) => f.id === 'hedging-pileup')) { console.error('SELF-TEST FAIL — không bắt được hedging-pileup'); return 1; }
  const toneDirty = 'Không khí hoà bình tạo nên sự hài hòa và tinh thần khoẻ khoắn cho người dân.';
  if (!lintText(toneDirty).some((f) => f.id === 'inconsistent-tone-mark')) { console.error('SELF-TEST FAIL — không bắt được inconsistent-tone-mark'); return 1; }
  const toneClean = 'Hôm qua anh mua món quà rất quý cho bà goá ở đầu ngõ để chúc sức khỏe và sự hài hòa.';
  if (lintText(toneClean).some((f) => f.id === 'inconsistent-tone-mark')) { console.error('SELF-TEST FAIL — báo nhầm inconsistent-tone-mark trên âm đầu qu-/g-'); return 1; }
  const isoDirty = 'Khi dữ liệu đầu vào bị lệch, hệ thống sẽ báo lỗi ngay lập tức. Khi nhân viên nhập sai mã hàng, phần mềm sẽ khóa phiếu xuất kho. Khi quản lý duyệt trễ hạn, đơn hàng sẽ tự động chuyển trạng thái chờ.';
  if (!lintText(isoDirty).some((f) => f.id === 'isomorphic-sentence')) { console.error('SELF-TEST FAIL — không bắt được isomorphic-sentence'); return 1; }
  if (computeRouteHint(clean) !== 'light' || computeRouteHint(dirty) !== 'heavy' || computeRouteHint(hedgeDirty) !== 'standard') {
    console.error('SELF-TEST FAIL — computeRouteHint phân loại sai light/standard/heavy');
    return 1;
  }
  console.log(`SELF-TEST PASS — bắt đủ ${expect.length + 8} nhóm vi phạm, không báo sai frontmatter/code/câu đối lập đơn lẻ/văn hành chính/lời bài hát`);
  return 0;
}

export function runLintCli(args = process.argv.slice(2)) {
  const usage = 'Usage: node lint-vietnamese-content.mjs <file.md> ... [--keep "Tên riêng"]... [--route-hint] | --self-test';
  if (!args.length) { console.error(usage); return 2; }
  if (args[0] === '--self-test') return selfTest();

  const keep = [];
  const files = [];
  let showRoute = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keep') {
      if (i + 1 >= args.length) { console.error(usage); return 2; }
      keep.push(args[++i]);
    } else if (args[i] === '--route-hint') showRoute = true;
    else files.push(args[i]);
  }
  if (!files.length) { console.error(usage); return 2; }

  let hasError = false;
  for (const file of files) {
    const rawText = readFileSync(file, 'utf8');
    const findings = lintText(rawText, { keep });
    report(file, findings, showRoute, rawText);
    if (findings.some((f) => f.level === 'ERROR')) hasError = true;
  }
  return hasError ? 1 : 0;
}
