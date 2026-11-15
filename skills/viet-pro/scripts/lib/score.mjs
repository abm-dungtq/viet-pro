// Calibrated 0-100 Vietnamese/English AI surface & structural scoring engine.
// Pure ESM, zero external dependencies. Importing has no side effects.

import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTtsTags } from './lint.mjs';
import { checkSlideDeck, pptxLineLabels, pptxToText, readPptx } from './pptx.mjs';

const WB_L = '(?<![\\p{L}\\p{M}\\p{N}])';
const WB_R = '(?![\\p{L}\\p{M}\\p{N}])';
const OFFICIAL_DOC_RE = /^\s*(?:số:\s*\d+\s*\/|v\/v(?![\p{L}\p{M}\p{N}])|kính gửi:|cộng hòa xã hội chủ nghĩa|căn cứ\s+(?:luật|nghị định|thông tư|quyết định|bộ luật)|điều\s+\d+[.:]\s+\p{Lu})/imu;
const NEGATION_FRAME_RE = /(?:chưa\s+(?:đủ|thể|phải|hẳn|thấy)|không\s+(?:phải|hẳn|thể\s+gọi|đủ|nên\s+gọi)|khó\s+(?:gọi|coi|xem)|đừng\s+(?:gọi|vội\s+gọi)|chẳng\s+phải)/iu;
const AD_LOC_GUARD_RE = /giữa\s+lòng\s+(?:đường|phố|thành\s+phố|thủ\s+đô|đất|dân|người|bàn\s+tay|biển|sông|hồ|rừng|núi)\b/iu;

export const SCORE_BANDS = [
  { max: 10, name: 'sạch' },
  { max: 30, name: 'vài dấu hiệu' },
  { max: 60, name: 'nhiều dấu hiệu' },
  { max: 101, name: 'dày đặc' },
];

export function scoreBand(score) {
  return SCORE_BANDS.find((b) => score < b.max)?.name || 'dày đặc';
}

function wcount(s) {
  return (String(s || '').match(/[\p{L}\p{N}]+/gu) || []).length;
}

/** Blank YAML frontmatter and fenced code blocks while preserving 1-based line numbers. */
export function preprocessForScan(rawText, opts = {}) {
  let normalized = String(rawText || '').replace(/\r\n/gu, '\n').normalize('NFC');
  if (opts.ttsTags !== false) normalized = stripTtsTags(normalized);
  const lines = normalized.split('\n');
  let inFm = lines[0]?.trim() === '---' && lines.slice(1).some((l) => l.trim() === '---');
  let inFence = false;

  return lines.map((line, i) => {
    if (i === 0 && inFm) return '';
    if (inFm) {
      if (line.trim() === '---') inFm = false;
      return '';
    }
    if (/^\s*(?:```|~~~)/u.test(line)) {
      inFence = !inFence;
      return '';
    }
    if (inFence) return '';
    let out = line
      .replace(/<!--[\s\S]*?-->/gu, '')
      .replace(/``[^\n]*?``|`[^`\n]*`/gu, ' ')
      .replace(/\[([^\]]*)\]\([^)\n]+\)/gu, '$1')
      .replace(/(?:https?|file):\/\/\S+/giu, ' ');
    if (opts.meta) {
      if (/^\s*(?:>|\|)/u.test(out)) return '';
      out = out.replace(/["“][^"”\n]{1,160}["”]/gu, ' "___" ');
    }
    if (opts.titles) {
      const m = out.match(/^\s*#{1,6}\s+(.+)$/u);
      const b = out.match(/^\s*\*\*([^*\n]{4,95})\*\*[.:!]?\s*$/u);
      return m ? m[1] : (b ? b[1] : '');
    }
    return out;
  }).join('\n');
}

const SURFACE_RULES = [
  {
    id: 'chatbot-residue', groupVi: 'lời chatbot', weight: 3, lineMode: true,
    patterns: [
      /(?:^|\s)(?:Dưới đây là|Hy vọng (?:nội dung|bài viết|chia sẻ) này (?:hữu ích|sẽ giúp ích|mang lại)|Bạn có muốn tôi|Tôi có thể giúp bạn|Chắc chắn rồi[!,.])/giu,
    ],
  },
  {
    id: 'knowledge-cutoff', groupVi: 'giới hạn kiến thức', weight: 3, lineMode: true,
    patterns: [
      /(?:tính đến thời điểm cắt dữ liệu|tôi không có quyền truy cập (?:internet|thời gian thực|dữ liệu mới nhất)|theo dữ liệu huấn luyện của tôi|không có thông tin sau năm \d{4})/giu,
    ],
  },
  {
    id: 'prompt-injection-tag', groupVi: 'chỉ dẫn chèn vào', weight: 3, lineMode: true,
    patterns: [
      /<\/?(?:skill|system|instructions?)>|(?:bỏ qua|quên)\s+(?:mọi|tất cả|toàn bộ|các)\s+(?:hướng dẫn|chỉ dẫn|chỉ thị)\s+(?:trước đó|ở trên)|\bignore\s+(?:all\s+|any\s+)?(?:the\s+)?(?:previous|prior|above)\s+instructions\b/giu,
    ],
  },
  {
    id: 'tool-artifact', groupVi: 'dấu vết công cụ', weight: 3, rawLineMode: true,
    patterns: [
      /:contentReference\[oaicite:\d+\](?:\{index=\d+\})?|\bturn\d+(?:search|news|view|fetch|file)\d+\b|\[cite(?::\s*[\d,\s]+)?\]|【\d+†[^】]*】|utm_source=(?:chatgpt\.com|openai|perplexity|copilot\.com|gemini)/giu,
      /\[(?:tên|họ và tên|số điện thoại|email|link|chức danh|khu vực|ngành|chèn link|điền|placeholder)[^\]\n]{0,30}\]/giu,
    ],
  },
  {
    id: 'empty-promise', groupVi: 'hứa suông', weight: 3, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:không lòng vòng nữa|đi thẳng vào vấn đề|ngắn gọn thế này|mình nói (?:thật|thẳng) nhé|đây là những gì bạn cần biết|đọc hết bài này nhé|cùng tìm hiểu ngay|chi tiết sẽ được trao đổi sau)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'staged-lead', groupVi: 'câu dẫn', weight: 3, lineMode: true,
    patterns: [
      /(?:^|[.!?]\s+)(?:Hãy tưởng tượng|Hãy hình dung|Trong bối cảnh\b|Trong thế giới\b|Trong kỷ nguyên\b|Trong thời đại\b[^.!?\n]{0,40}\bhiện nay\b|Trước bối cảnh\b|Giữa làn sóng\b|Chưa bao giờ\b[^.!?\n]{2,35}\blại\b[^.!?\n]{2,25}\bđến thế|Có một sự thật là|Không thể phủ nhận rằng|Đã bao giờ bạn tự hỏi|Đây là câu hỏi mà hầu như)/giu,
    ],
  },
  {
    id: 'voice-tag', groupVi: 'nhãn báo giọng', weight: 3, lineMode: true,
    patterns: [
      /(?:^|[.!?]\s+)(?:(?:Góc nhìn cá nhân|Nói thẳng(?: ra)?|Nói trắng ra|Điều (?:mình|tôi) muốn nói là|Điểm mấu chốt|Sự thật mất lòng|Spoiler|Plot twist|Fun fact|Hot take|Unpopular opinion|TL;DR|Pro tip)\s*:|(?:Thành thật|Thật lòng|Công bằng|Thẳng thắn|Thú thật)\s+mà\s+nói\s*,)/giu,
    ],
  },
  {
    id: 'self-outline', groupVi: 'tự kể dàn ý', weight: 3, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:bài viết này sẽ (?:cùng bạn )?(?:phân tích|làm rõ|đi qua|giúp bạn|cung cấp|tổng hợp|khám phá|giải thích)|trong bài viết này,? chúng ta sẽ (?:cùng )?(?:tìm hiểu|khám phá|phân tích|đi qua)|trong phần tiếp theo,? chúng ta sẽ|như đã đề cập ở trên|cùng điểm qua những)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'empty-summary-closer', groupVi: 'tổng kết rỗng', weight: 3, lineMode: true,
    patterns: [
      /^\s*#{1,4}\s*(?:Kết luận|Tổng kết|Lời kết|Tóm lại|Thay lời kết|Kết)\s*$/giu,
      new RegExp(`${WB_L}(?:tóm lại,? [^.!?\n]{2,60}đóng vai trò|nhìn chung,? việc [^.!?\n]{2,60}là yếu tố|tất cả những điều trên cho thấy|chúc bạn [^.!?\n]{2,30}hẹn gặp lại ở bài viết tiếp theo)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'false-contrast', groupVi: 'đối lập giả', weight: 3, textMode: true,
    patterns: [
      /(?<![\p{L}\p{M}\p{N}])(?:không\s+(?:chỉ\s+)?(?:phải|có nghĩa)(?:\s+là)?\s+[^.!?\n]{3,90}\s+mà(?:\s+là|\s+còn)|không\s+chỉ\s+dừng\s+lại\s+ở\s+[^.!?\n]{3,90}\s+mà\s+còn|vấn\s+đề\s+không\s+nằm\s+ở\s+[^.!?\n]{3,90}\s+mà\s+(?:nằm\s+)?ở|ít\s+liên\s+quan\s+đến\s+[^.!?\n]{3,90}\s+mà\s+nằm\s+ở|không\s+xuất\s+phát\s+từ\s+[^.!?\n]{3,90}\s+mà\s+từ|không\s+có\s+[^.!?\n]{3,60}\s+nào\s+[^.!?\n]{1,30},\s*chỉ\s+có|không\s+phải(?:\s+là)?\s+[^.!?\n]{3,90}[.!?]\s*(?:Mà(?:\s+đó|\s+chính)?|[^\p{L}]{0,4}\p{Lu}\p{L}*(?:\s+\p{L}+){0,3})\s+là\b|không\s+lấy\s+mất\s+[^.!?\n]{3,60}[.!?]\s*(?:Nó|Mà)\s+lấy)(?![\p{L}\p{M}\p{N}])/giu,
    ],
  },
  {
    id: 'engagement-bait', groupVi: 'mời tương tác', weight: 3, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:còn bạn(?:,| thì sao\\??)[^.!?\n]{0,60}\\?|bạn nghĩ sao về (?:vấn đề|chuyện|điều|xu hướng) này\\??|hãy để lại bình luận|chia sẻ (?:góc nhìn(?: của bạn)?|dưới comment)|comment (?:cho mình|bên dưới)|tag ngay người bạn|lưu lại bài viết này|đừng quên nhấn thích và chia sẻ|nếu bạn (?:cũng\\s+)?đang (?:nghĩ|đứng trước)[^.!?\n]{4,70}(?:thì hãy|cứ nhắn))${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'inspirational-slogan', groupVi: 'khẩu hiệu', weight: 3, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:hành trình vạn dặm bắt đầu từ|thành công không phải (?:là )?đích đến|hãy là phiên bản tốt nhất của chính mình|tương lai thuộc về những ai|đừng chỉ làm việc chăm chỉ|đây là câu chuyện của mình|không phải là quá muộn|chỉ là khởi đầu|bài học lớn nhất|siêu năng lực)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'puffery', groupVi: 'thổi phồng', weight: 2, lineMode: true, guardNegation: true,
    patterns: [
      new RegExp(`${WB_L}(?:yếu tố then chốt|đột phá lịch sử|bước ngoặt(?: lớn| quan trọng| lịch sử)?|thay đổi cuộc chơi|kỷ nguyên mới|tầm nhìn chiến lược|tối ưu hóa toàn diện|giải pháp đột phá|tiêu chuẩn vàng|định hình tương lai|mang tính cách mạng)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'office-cliche', groupVi: 'khuôn công văn', weight: 2, lineMode: true, skipOfficial: true,
    patterns: [
      new RegExp(`${WB_L}(?:cần được xem xét|phối hợp đồng bộ|nâng cao hiệu lực,? hiệu quả|triển khai thực hiện đồng bộ|quán triệt sâu sắc|tiếp tục phát huy hơn nữa|tạo bước chuyển biến mạnh mẽ|chủ động nắm bắt tình hình|tiềm ẩn rủi ro)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'restating-clause', groupVi: 'diễn giải lại', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:điều này đồng nghĩa với việc|hay nói (?:một )?cách khác|nói cách khác là|tức là chúng ta cần phải)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'ai-vocab-vi', groupVi: 'từ vựng AI (vi)', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:bức tranh toàn cảnh|hệ sinh thái liền mạch|trải nghiệm liền mạch|kim chỉ nam|chìa khóa vàng|chìa khóa then chốt|mảnh ghép hoàn hảo|hành trình chuyển đổi|hành trình kiến tạo|nâng tầm (?:trải nghiệm|giá trị)|khai (?:phá|mở) tiềm năng|mở khóa tiềm năng|kiến tạo giá trị|lan tỏa giá trị|góc nhìn đa chiều|bệ phóng vững chắc)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'vague-authority', groupVi: 'uy tín mơ hồ', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:các nghiên cứu chỉ ra rằng|nhiều chuyên gia cho rằng|các nhà nghiên cứu (?:lưu ý|nhận định|cho biết) rằng|giới chuyên môn đánh giá|thực tế đã chứng minh rằng|nhiều khảo sát cho thấy)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'copula-avoidance', groupVi: 'né là/có', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:đóng vai trò (?:như một|quan trọng|then chốt|thiết yếu|quyết định)|được xem như (?:là )?một|hoạt động như một|phục vụ như một|nổi lên như một)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'calqued-passive', groupVi: 'bị động dịch', weight: 2, lineMode: true, skipOfficial: true,
    patterns: [
      new RegExp(`${WB_L}(?:được|bị|dẫn dắt)\\s+(?:\\p{L}+\\s+){0,5}bởi${WB_R}`, 'giu'),
      new RegExp(`${WB_L}(?:cần|phải|nên|sẽ)\\s+được\\s+(?:xem xét|đánh giá|thực hiện|triển khai|áp dụng|đảm bảo|xử lý|giải quyết|cân nhắc|tối ưu|kiểm chứng)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'object-as-subject', groupVi: 'đồ vật làm chủ ngữ', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:bài viết|báo cáo|nghiên cứu|tài liệu|bảng|biểu đồ|số liệu|dữ liệu|công cụ|tính năng|nền tảng|hệ thống) này (?:sẽ )?(?:chỉ ra|cho thấy|chứng minh|khám phá|cung cấp|trình bày|nhấn mạnh|làm rõ|phân tích|cho phép bạn|giúp bạn)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'calqued-opener', groupVi: 'cụm mở câu dịch', weight: 2, lineMode: true,
    patterns: [
      /(?:^|[.!?]\s+)(?:Đối với\s+[^,\n]{3,35}\s+thì|Về mặt\s+[^,\n]{3,25},|Xét về\s+(?:mặt|khía cạnh|góc độ)|Từ góc độ\s+[^,\n]{3,30}\s+mà nói|Không có gì ngạc nhiên khi|(?:Tôi|Mình|Chúng tôi) viết email này để|(?:Rất )?vui được chia sẻ rằng)/giu,
    ],
  },
  {
    id: 'empty-verb-vi', groupVi: 'động từ rỗng (vi)', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:tiến hành|thực hiện)\\s+(?:việc\\s+)?(?:kiểm tra|rà soát|đánh giá|phân tích|nghiên cứu|khảo sát|xử lý|triển khai|thảo luận|điều chỉnh)${WB_R}`, 'giu'),
      new RegExp(`${WB_L}đưa ra\\s+(?:quyết định|nhận định|đánh giá|lời khuyên|giải pháp|kết luận|đề xuất)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'nominalization-vi', groupVi: 'danh hóa (vi)', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}một cách\\s+(?!gọi|khác|nữa|làm|để|viết|nói|hiểu|nhìn|tiếp cận|đơn giản${WB_R})\\p{Ll}+${WB_R}`, 'gu'),
      new RegExp(`${WB_L}tính\\s+(?:hiệu quả|khả thi|chính xác|minh bạch|linh hoạt|nhất quán|bền vững|ứng dụng|cấp thiết)\\s+của${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'pleonasm-vi', groupVi: 'thừa nghĩa (vi)', weight: 2, lineMode: true,
    patterns: [
      new RegExp(`${WB_L}(?:hiện nay đang|đang trong quá trình|hoàn toàn (?:miễn phí|đầy đủ)|vẫn còn đang|kế hoạch tương lai|dự kiến trước|cùng nhau hợp tác|kết quả cuối cùng|tiếp tục duy trì|lặp lại lần nữa|mọi tất cả)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'ad-copy', groupVi: 'quảng cáo', weight: 2, lineMode: true, guardAdLoc: true,
    patterns: [
      new RegExp(`${WB_L}(?:trải nghiệm (?:đỉnh cao|vượt trội)|đẳng cấp quốc tế|chuẩn mực mới|tận hưởng trọn vẹn|nơi hội tụ|giữa lòng\\s+\\p{L}+|xứng tầm thượng lưu)${WB_R}`, 'giu'),
    ],
  },
  {
    id: 'cua-chain', groupVi: 'chuỗi "của"', weight: 1, lineMode: true,
    patterns: [/(?<![\p{L}\p{M}\p{N}])của\s+(?:\p{L}+\s+){1,4}của\s+(?:\p{L}+\s+){1,4}của(?![\p{L}\p{M}\p{N}])/giu],
  },
  {
    id: 'this-it-opener', groupVi: '"Điều này"/"Nó" mở câu', weight: 2, lineMode: true,
    patterns: [/(?:^|[.!?]\s+)(?:Điều này|Điều đó|Việc này|Nó)\s+(?:giúp|cho thấy|làm|khiến|đồng nghĩa|mang lại|tạo ra|phản ánh|chứng tỏ|viết được|lấy đi)(?![\p{L}\p{M}\p{N}])/gu],
  },
  {
    id: 'calqued-relative', groupVi: 'mệnh đề quan hệ dịch', weight: 2, lineMode: true,
    patterns: [/(?:,\s*|\s+)(?:điều mà|người mà|nơi mà|thứ mà|cái mà|theo cách mà)(?![\p{L}\p{M}\p{N}])/giu],
  },
  {
    id: 'en-gloss', groupVi: 'chêm tiếng Anh', weight: 1, lineMode: true,
    patterns: [/\p{L}*[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]\p{L}*[ \t]\((?!(?:le|la|les|du|des|un|une)\s)[a-z][a-z -]{2,28}\)/gu],
  },
  {
    id: 'viec-su-dense', groupVi: 'việc/sự dày', weight: 1, lineMode: true, skipOfficial: true,
    patterns: [/(?<![\p{L}\p{M}\p{N}])(?:việc|sự)\s+\p{Ll}+[^.!?\n]{2,55}(?:việc|sự)\s+\p{Ll}+[^.!?\n]{2,55}(?:việc|sự)\s+\p{Ll}+/gu],
  },
  {
    id: 'ai-vocab-en', groupVi: 'từ vựng AI (en)', weight: 2, lineMode: true,
    patterns: [/\b(?:delve into|tapestry|testament to|pivotal|underscore(?:s|d)?|foster(?:s|ing)?|game[- ]changer|seamless(?:ly)?|unleash(?:ing)?|ever-evolving)\b/giu],
  },
];

const DOC_POINTS = {
  'bold-heading': 5,
  'bold-dense': 6,
  'emoji-section-lead': 8,
  'caps-section-headings': 4,
  'decorative-bold-labels': 5,
  'engagement-bait': 4,
  'inspirational-slogan': 4,
  'colon-pileup': 6,
  'filler-density': 12,
  'stacked-slang': 8,
  'mixed-dialect': 6,
  'chat-stiff': 8,
  'chat-formatted': 6,
  'chat-long': 6,
  'uniform-sentence-length': 4,
  'choppy-fragments': 4,
  'uniform-short-paragraphs': 4,
  'pronoun-density': 4,
};

const WEAK_DOC = new Set(['uniform-sentence-length', 'choppy-fragments', 'uniform-short-paragraphs', 'pronoun-density']);
const FILLER_RES = [
  /(?<![\p{L}\p{M}\p{N}])của\s+(?:bạn|tôi|chúng tôi|chúng ta|mình|họ)(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])một(?!\s+(?:mình|chút|vài|số|hai|ba))(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:các|những)(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])được(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])có thể(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])sẽ(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])đã(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])rằng(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:cho phép|giúp)(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:điều này|nó)(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:việc|sự)(?![\p{L}\p{M}\p{N}])/giu,
];

function extractSentences(cleanText) {
  const sents = cleanText
    .replace(/^\s*#{1,6}\s+.*$/gmu, '')
    .split(/(?<=[.!?])\s+|\n{2,}/u)
    .map((s) => s.trim())
    .filter((s) => wcount(s) >= 3);
  return sents;
}

function sentenceCv(sents) {
  if (sents.length < 6) return null;
  const lens = sents.map(wcount);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  if (!mean) return null;
  const variance = lens.reduce((a, b) => a + ((b - mean) ** 2), 0) / lens.length;
  return Number((Math.sqrt(variance) / mean).toFixed(2));
}

function extractToConfirm(cleanText) {
  const lines = cleanText.split('\n');
  const firstPerson = /(?<![\p{L}\p{M}\p{N}])(?:tôi|mình|em|tớ|bọn mình|chúng tôi|tụi mình|team mình)(?![\p{L}\p{M}\p{N}])/giu;
  if ((cleanText.match(firstPerson) || []).length < 3) return [];
  const unit = '(?:năm|tháng|tuần|ngày|giờ|tiếng|phút|km|mét|kg|công ty|người|lần|buổi|triệu|tỷ|nghìn|tuổi|cuộc|dự án|khách|đêm|trang|cuốn)';
  const claimRe = new RegExp(`(?<![\\p{L}\\p{N}])(?:\\d+(?:[.,]\\d+)?\\s?(?:${unit}|%)|\\d{1,2}h\\d{0,2}|(?:hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\\s+${unit})(?![\\p{L}\\p{N}])`, 'giu');
  const out = [];
  const seen = new Set();
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(claimRe)) {
      const k = m[0].trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ line: idx + 1, detail: m[0].trim() });
      }
    }
  });
  return out.length >= 2 ? out : [];
}

/** Score plain Markdown/text or pre-flattened slides. */
export function scanText(rawText, opts = {}) {
  const normalized = String(rawText || '').replace(/\r\n/gu, '\n').normalize('NFC');
  const clean = preprocessForScan(normalized, opts);
  const isOfficial = opts.register === 'administrative' || OFFICIAL_DOC_RE.test(clean);
  const lines = clean.split('\n');
  const rawLines = normalized.split('\n');
  const lineLabels = opts.lineLabels || {};
  const findings = [];

  const pushHit = (rule, lineNo, excerpt) => {
    findings.push({
      id: rule.id,
      groupVi: rule.groupVi || rule.id,
      weight: rule.weight ?? 1,
      level: 'WARN',
      line: lineNo,
      location: lineLabels[lineNo] || `dòng ${lineNo}`,
      excerpt: String(excerpt || '').trim().slice(0, 120),
    });
  };

  for (const rule of SURFACE_RULES) {
    if (rule.skipOfficial && isOfficial) continue;
    if (rule.rawLineMode) {
      rawLines.forEach((line, idx) => {
        for (const rx of rule.patterns) {
          for (const m of line.matchAll(rx)) pushHit(rule, idx + 1, m[0]);
        }
      });
      continue;
    }
    if (rule.lineMode) {
      lines.forEach((line, idx) => {
        for (const rx of rule.patterns) {
          for (const m of line.matchAll(rx)) {
            const matchText = m[0];
            if (rule.guardNegation) {
              const ctxBefore = line.slice(Math.max(0, m.index - 55), m.index).split(/[.!?;\n]/u).pop();
              if (NEGATION_FRAME_RE.test(ctxBefore)) continue;
            }
            if (rule.guardAdLoc && AD_LOC_GUARD_RE.test(matchText)) continue;
            pushHit(rule, idx + 1, matchText);
          }
        }
      });
      continue;
    }
    for (const rx of rule.patterns) {
      for (const m of clean.matchAll(rx)) {
        const lineNo = clean.slice(0, m.index).split('\n').length;
        pushHit(rule, lineNo, m[0]);
      }
    }
  }

  // Document-level structural checks (suppressed in --titles mode unless slide titles)
  if (!opts.titles) {
    const boldHeadingLines = [];
    const boldLabelLines = [];
    const emojiLeadLines = [];
    const capsHeadLines = [];
    lines.forEach((line, idx) => {
      const t = line.trim();
      if (/^\*\*[^*\n]{2,95}\*\*[.:!]?$/u.test(t) || /^\*\*[^*\n]{2,35}[:：]\*\*\s+\S/u.test(t)) {
        boldHeadingLines.push({ line: idx + 1, text: t });
      }
      if (/^(?:[-*+•]|\d+[.)])\s+\*\*[^*\n]{2,65}\*\*(?:\s+\S|[:：.])/u.test(t)) {
        boldLabelLines.push({ line: idx + 1, text: t });
      }
      if (/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}]/u.test(t)) {
        emojiLeadLines.push({ line: idx + 1, text: t });
      }
      if (/^[\p{Lu}\p{N}\s,.'"-]{8,60}$/u.test(t) && wcount(t) >= 3 && wcount(t) <= 8 && !/\p{Ll}/u.test(t)) {
        capsHeadLines.push({ line: idx + 1, text: t });
      }
    });
    if (boldHeadingLines.length) {
      for (const b of boldHeadingLines) {
        pushHit({ id: 'bold-heading', groupVi: 'in đậm làm tiêu đề', weight: 0 }, b.line, b.text);
      }
    }
    if (boldLabelLines.length >= 2) {
      for (const b of boldLabelLines) {
        pushHit({ id: 'decorative-bold-labels', groupVi: 'nhãn in đậm đầu dòng', weight: 0 }, b.line, b.text);
      }
    }
    if (boldHeadingLines.length + boldLabelLines.length >= 3) {
      const firstLine = (boldHeadingLines[0] || boldLabelLines[0]).line;
      pushHit({ id: 'bold-dense', groupVi: 'in đậm dày', weight: 0 }, firstLine, `${boldHeadingLines.length + boldLabelLines.length} tiêu đề/nhãn in đậm`);
    }
    if (emojiLeadLines.length >= 2) {
      pushHit({ id: 'emoji-section-lead', groupVi: 'chia mục bằng emoji', weight: 0 }, emojiLeadLines[0].line, `${emojiLeadLines.length} dòng mở đầu bằng emoji`);
    }
    if (capsHeadLines.length >= 2) {
      pushHit({ id: 'caps-section-headings', groupVi: 'bài đăng chia mục viết hoa', weight: 0 }, capsHeadLines[0].line, `${capsHeadLines.length} dòng tiêu đề viết hoa`);
    }

    // Colons in prose (skip HH:MM, URLs, dialogue ': "', list intros followed by bullets)
    let proseColons = 0;
    let firstColonLine = 1;
    lines.forEach((line, idx) => {
      const t = line.trim();
      if (!t || t.startsWith('#') || t.startsWith('|')) return;
      if (t.endsWith(':') && lines[idx + 1]?.trim().match(/^(?:[-*+]|\d+[.)])\s/u)) return;
      const cleaned = t.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/gu, ' ').replace(/:\s*["“]/gu, ' "');
      const cnt = (cleaned.match(/:/gu) || []).length;
      if (cnt > 0) {
        if (!proseColons) firstColonLine = idx + 1;
        proseColons += cnt;
      }
    });
    const proseWords = wcount(clean);
    if (!isOfficial && proseWords >= 60 && proseColons >= 4 && (proseColons / proseWords) * 1000 >= 22) {
      pushHit({ id: 'colon-pileup', groupVi: 'hai chấm dồn dập', weight: 0 }, firstColonLine, `${proseColons} dấu hai chấm`);
    }

    // Filler density
    if (!isOfficial && proseWords >= 100) {
      let fHits = 0;
      for (const re of FILLER_RES) fHits += [...clean.matchAll(re)].length;
      const perK = Math.round((fHits / proseWords) * 1000);
      if (perK >= 130) {
        pushHit({ id: 'filler-density', groupVi: 'chữ đệm dịch dày', weight: 0 }, 1, `${perK}/1.000 chữ`);
      }
    }

    // Pronoun density ("bạn", "chúng ta")
    if (!isOfficial && proseWords >= 80) {
      const pCount = [...clean.matchAll(/(?<![\p{L}\p{M}\p{N}])(?:bạn|chúng ta)(?![\p{L}\p{M}\p{N}])/giu)].length;
      if ((pCount * 1000) / proseWords >= 45) {
        pushHit({ id: 'pronoun-density', groupVi: 'đại từ dày', weight: 0 }, 1, `${pCount} lần (${Math.round((pCount * 1000) / proseWords)}/1.000 chữ)`);
      }
    }

    // Stacked slang + dialect mixing
    const slangHits = [...clean.matchAll(/(?<![\p{L}\p{M}\p{N}])(?:ủa alo|ét ô ét|cringe|vibe|healing|flex|red flag|chữa lành|overthinking|slay|keo l[ìỳ]|mãi đỉnh|đỉnh nóc|hết nước chấm|xu cà na|xịn xò|ổn áp)(?![\p{L}\p{M}\p{N}])/giu)];
    if (new Set(slangHits.map((m) => m[0].toLowerCase())).size >= 3 && slangHits.length * 25 >= Math.max(proseWords, 1)) {
      pushHit({ id: 'stacked-slang', groupVi: 'chồng tiếng lóng', weight: 0 }, 1, slangHits.slice(0, 4).map((m) => m[0]).join(', '));
    }

    const dialectRegions = [
      ['Bắc', /(?<![\p{L}\p{M}\p{N}])(?:nhỉ|đấy nhé|thế nhỉ|chứ lị|vậy nhỉ|nhể)(?![\p{L}\p{M}\p{N}])/giu],
      ['Trung', /(?<![\p{L}\p{M}\p{N}])(?:mô tê|răng rứa|rứa đó|chi mô|hỉ)(?![\p{L}\p{M}\p{N}])/giu],
      ['Nam', /(?<![\p{L}\p{M}\p{N}])(?:nghen|dzậy|hông|hổng|bển|trển|ngoải|bữa nay)(?![\p{L}\p{M}\p{N}])/giu],
    ];
    const dMatched = [];
    let dHits = 0;
    for (const [rName, rRe] of dialectRegions) {
      const m = [...clean.matchAll(rRe)].map((x) => x[0]);
      if (m.length) { dMatched.push(`${rName}:${m[0]}`); dHits += m.length; }
    }
    if (dMatched.length >= 2 && dHits >= 3) {
      pushHit({ id: 'mixed-dialect', groupVi: 'trộn giọng miền', weight: 0 }, 1, dMatched.join(', '));
    }

    // Overlong sentence & structural rhythm (choppy, uniform paragraphs)
    const sentsAll = extractSentences(clean);
    if (!isOfficial) {
      for (const s of sentsAll) {
        if (wcount(s) >= 65) {
          pushHit({ id: 'overlong-sentence', groupVi: 'câu quá dài', weight: 1 }, 1, s);
          break;
        }
      }
      if (sentsAll.length >= 6 && sentsAll.filter((s) => wcount(s) <= 10).length / sentsAll.length >= 0.45) {
        pushHit({ id: 'choppy-fragments', groupVi: 'câu vụn', weight: 0 }, 1, `${sentsAll.filter((s) => wcount(s) <= 10).length}/${sentsAll.length} câu ngắn`);
      }
      const paraBlocks = clean.split(/\n{2,}/u).map((p) => p.trim()).filter((p) => p && !p.startsWith('#') && !p.startsWith('|'));
      if (paraBlocks.length >= 6 && paraBlocks.filter((p) => wcount(p) <= 12).length / paraBlocks.length >= 0.7) {
        pushHit({ id: 'uniform-short-paragraphs', groupVi: 'đoạn ngắn đều nhau', weight: 0 }, 1, `${paraBlocks.length} đoạn ngắn liên tiếp`);
      }
    }

    // --chat checks
    if (opts.chat) {
      const stiffRe = /(?:^|[.!?\n]\s*)(?:Chào (?:bạn|anh|chị|em|mọi người)\b|Trân trọng|Kính gửi|Xin phép được thông tin|Rất mong nhận được phản hồi|Cảm ơn (?:bạn|anh|chị|em)(?: rất nhiều)? (?:đã|vì))/gimu;
      for (const m of clean.matchAll(stiffRe)) {
        const lineNo = clean.slice(0, m.index).split('\n').length;
        pushHit({ id: 'chat-stiff', groupVi: 'tin nhắn khách sáo', weight: 0 }, lineNo, m[0]);
      }
      if (/^\s*#{1,6}\s/mu.test(clean) || lines.filter((l) => /^\s*[-*+]\s+\S/u.test(l)).length >= 2) {
        pushHit({ id: 'chat-formatted', groupVi: 'tin nhắn định dạng như văn bản', weight: 0 }, 1, 'Dùng heading/danh sách trong tin nhắn');
      }
      if (proseWords > 80) {
        pushHit({ id: 'chat-long', groupVi: 'tin nhắn dài', weight: 0 }, 1, `${proseWords} chữ (>80)`);
      }
    }
  }

  // Merge slide-specific findings if provided
  for (const sf of opts.slideFindings || []) {
    findings.push(sf);
  }

  const words = wcount(clean);
  const sents = extractSentences(clean);
  const cv = opts.burst === false ? null : sentenceCv(sents);
  if (!opts.titles && cv !== null && cv < 0.25) {
    pushHit({ id: 'uniform-sentence-length', groupVi: 'câu dài đều nhau', weight: 0 }, 1, `CV=${cv}`);
  }
  const weightedHits = findings.reduce((acc, f) => acc + (f.weight || 0), 0);
  const density = weightedHits * 100 / Math.max(words, 50);
  const burstPenalty = cv !== null ? Math.max(0, 0.35 - cv) * 40 : 0;

  const firedIds = new Set(findings.map((f) => f.id));
  const hasStrongSignal = findings.some((f) => (f.weight || 0) >= 2 || (DOC_POINTS[f.id] && !WEAK_DOC.has(f.id)));
  let docPoints = 0;
  for (const id of firedIds) {
    if (!DOC_POINTS[id]) continue;
    if (WEAK_DOC.has(id) && !hasStrongSignal) continue;
    docPoints += DOC_POINTS[id];
  }
  const ticCounts = new Map();
  for (const f of findings) {
    if ((f.weight || 0) >= 2 && f.id !== 'puffery' && f.id !== 'tool-artifact') {
      ticCounts.set(f.id, (ticCounts.get(f.id) || 0) + 1);
    }
  }
  for (const [tid, cnt] of ticCounts) {
    if (cnt >= 3) {
      docPoints += Math.min(15, 6 + 2 * (cnt - 3));
      if (!firedIds.has('repeat-tic')) {
        pushHit({ id: 'repeat-tic', groupVi: 'tật lặp cả bài', weight: 0 }, 1, `${tid} x${cnt}`);
        firedIds.add('repeat-tic');
      }
    }
  }

  const score = Math.min(100, Math.round(density * 2 + burstPenalty + docPoints));
  const band = scoreBand(score);
  const groups = new Map();
  for (const f of findings) {
    const cur = groups.get(f.id) || { id: f.id, label: f.groupVi, count: 0 };
    cur.count += 1;
    groups.set(f.id, cur);
  }

  return {
    score,
    band,
    words,
    sentences: sents.length,
    sentence_length_cv: cv,
    weighted_hits: weightedHits,
    document_points: docPoints,
    total_hits: findings.length,
    groups: [...groups.values()],
    findings,
    to_confirm: opts.titles ? [] : extractToConfirm(clean),
    slides: opts.slidesCount ?? null,
  };
}

/** Scan a .md/.txt/.pptx file from disk or raw text buffer. */
export function scanFile(filePath, opts = {}) {
  const abs = resolve(String(filePath));
  if (abs.toLowerCase().endsWith('.pptx')) {
    const slides = readPptx(abs);
    const { text, index } = pptxToText(slides);
    const slideFindings = checkSlideDeck(slides, index);
    if (opts.titles) {
      const visibleTitles = slides.filter((s) => !s.hidden && s.title);
      const titleText = visibleTitles.map((s) => `# ${s.title}`).join('\n');
      const titleLabels = {};
      visibleTitles.forEach((s, idx) => { titleLabels[idx + 1] = `slide ${s.no}, tiêu đề`; });
      const titleFindings = slideFindings.filter((f) => f.part === 'tiêu đề');
      return {
        file: filePath,
        is_pptx: true,
        slides_data: slides,
        ...scanText(titleText, {
          ...opts,
          burst: false,
          lineLabels: titleLabels,
          slideFindings: titleFindings,
          slidesCount: slides.length,
        }),
      };
    }
    return {
      file: filePath,
      is_pptx: true,
      slides_data: slides,
      ...scanText(text, {
        ...opts,
        burst: false,
        lineLabels: pptxLineLabels(index),
        slideFindings,
        slidesCount: slides.length,
      }),
    };
  }
  const text = readFileSync(abs, 'utf8');
  return { file: filePath, is_pptx: false, slides_data: null, ...scanText(text, opts) };
}

export function selfTest() {
  const fail = (msg) => { throw new Error(`SELF-TEST FAIL — ${msg}`); };

  const dirty = [
    'Trong bối cảnh chuyển đổi số hiện nay, bài viết này sẽ phân tích bức tranh toàn cảnh.',
    'Vấn đề không phải là chi phí mà là tốc độ triển khai một cách nhanh chóng.',
    'Các nghiên cứu chỉ ra rằng giải pháp đột phá này đóng vai trò như một kim chỉ nam.',
    'Còn bạn thì sao? Hãy để lại bình luận nhé!',
  ].join('\n\n');
  const dirtyRes = scanText(dirty);
  if (dirtyRes.score < 30 || !['nhiều dấu hiệu', 'dày đặc'].includes(dirtyRes.band)) {
    fail(`văn AI nặng phải >=30, nhận ${dirtyRes.score} (${dirtyRes.band})`);
  }

  const frontmatterAndNegated = [
    '---',
    'title: "Dưới đây là cấu hình"',
    '---',
    '',
    'Với phạm vi dữ liệu 120 mẫu, bài viết chỉ nêu kết quả thực tế, chưa đủ cơ sở để gọi đó là một bước ngoặt của thị trường.',
    '',
    '```yaml',
    'note: "Tất cả những điều trên cho thấy"',
    '```',
  ].join('\n');
  const cleanRes = scanText(frontmatterAndNegated);
  if (cleanRes.score !== 0 || cleanRes.total_hits !== 0) {
    fail(`frontmatter/code/negation phải 0/100 sạch, nhận ${cleanRes.score} (${JSON.stringify(cleanRes.findings)})`);
  }

  const metaGuide = '> "Hãy tưởng tượng một bước ngoặt đột phá"\n\nThay "đóng vai trò quan trọng" bằng động từ cụ thể hơn.';
  if (scanText(metaGuide, { meta: true }).score !== 0) {
    fail('--meta không bỏ qua trích dẫn ví dụ sáo ngữ');
  }

  const chatRes = scanText('Chào bạn, cảm ơn bạn rất nhiều đã đặt câu hỏi!\n\n- Mục một rất dài\n- Mục hai rất dài\n\nTrân trọng!', { chat: true });
  if (!chatRes.groups.some((g) => g.id === 'chat-stiff') || !chatRes.groups.some((g) => g.id === 'chat-formatted')) {
    fail('--chat không bắt câu khách sáo / định dạng như văn bản');
  }

  const confirmText = 'Tôi làm việc tại xưởng 5 năm, qua 3 công ty và từng xử lý 18 ca khó. Mình nghĩ bạn cũng thấy tôi mất 2 tuần để quen máy.';
  const cRes = scanText(confirmText);
  if (cRes.to_confirm.length < 2) {
    fail('to_confirm không liệt kê số liệu tự xưng cần kiểm chứng');
  }

  console.log('SELF-TEST PASS — score.mjs 0-100 calibrated engine (28+ nhóm, --meta, --chat, frontmatter/negation guard, to_confirm)');
  return 0;
}

const isEntry = process.argv[1]
  && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry && process.argv.includes('--self-test')) {
  process.exit(selfTest());
}
