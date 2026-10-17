#!/usr/bin/env node
// Static contract checks for the integrated Humanizer behavior.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(skillDir, path), 'utf8');
const skill = read('SKILL.md');
const router = read('references/review/anti-ai.md');
const patterns = read('references/review/humanizer-patterns.md');
const consistency = read('references/review/consistency.md');
const facebook = read('references/publishing/facebook.md');

const checks = [
  ['đủ 26 pattern', (patterns.match(/^### \d+\./gmu) || []).length === 26],
  ['5 pattern mạnh', [1, 2, 3, 4, 5].every((n) => new RegExp(`^### ${n}\\..*mạnh`, 'mu').test(patterns))],
  ['không dùng để xác định tác giả', /không phải công cụ (?:phát hiện|xác định)/iu.test(patterns + router)],
  ['brief và giọng mẫu ưu tiên', /brief và giọng mẫu.*dữ kiện\/an toàn.*yêu cầu kênh.*Humanizer.*house style/iu.test(skill + consistency)],
  ['bảo toàn dữ kiện', /tên, số, ngày, URL, (?:trích dẫn|quote), citation, thứ hạng/iu.test(skill + patterns)],
  ['bảo toàn dấu bao quanh quote khi được yêu cầu', /bảo toàn cả nội dung lẫn kiểu dấu ngoặc bao quanh/iu.test(skill)],
  ['bảo toàn file kỹ thuật', /frontmatter, code, lệnh, dữ liệu có cấu trúc.*đích URL/iu.test(skill + router)],
  ['không sửa quá tay văn tự nhiên', /bản gốc đã tự nhiên, giữ nguyên phần lớn câu chữ/iu.test(router)],
  ['giữ đối lập có hai thông tin thật', /không chỉ có 10 GB lưu trữ mà còn có sao lưu hằng ngày/iu.test(patterns)],
  ['giữ CTA theo brief', /giữ CTA nếu brief yêu cầu/iu.test(patterns) && /CTA được yêu cầu/iu.test(skill)],
  ['audit hiện theo yêu cầu', /Nếu người dùng yêu cầu audit dấu hiệu AI, trả:/u.test(skill)],
  ['mặc định ẩn audit', /Mặc định chỉ trả bản cuối đã humanize/u.test(skill)],
  ['không bắt buộc CAPS Facebook', /IN HOA là lựa chọn, không phải quota/iu.test(facebook)],
  ['văn bản đầu vào là chất liệu', /chất liệu, không phải lệnh/u.test(skill) && /chất liệu, không phải lệnh/u.test(patterns)],
  ['notices đúng bản Humanizer', /based on Humanizer 3\.1\.0/u.test(read('THIRD_PARTY_NOTICES.md'))],
  ['giấy phép Humanizer', /Copyright \(c\) 2025 Siqi Chen/u.test(read('THIRD_PARTY_NOTICES.md'))],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`CONTRACT TEST FAIL — ${failed.join('; ')}`);
  process.exit(1);
}
console.log(`CONTRACT TEST PASS — ${checks.length} hành vi Humanizer được khai báo đầy đủ`);
