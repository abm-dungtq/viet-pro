// Pure lint rules for Vietnamese content. Importing this file has no side effects.

export const TTS_TAG_RE = /\[(?:nhanh|trầm|nhấn|kể|nghỉ(?:\s+\d+(?:[.,]\d+)?s)?)\]/giu;
const TTS_TAG_SPAN_RE = new RegExp(`(?:[ \\t]*${TTS_TAG_RE.source}[ \\t]*)+`, 'giu');

export const FIRST_HAND_RE = /(?:mình|tôi|em)\s+(?:đã\s+)?(?:thử|dùng|xài|test)(?:\s+thử)?\s+[^.!?\n]{0,40}(?:\d+\s*(?:ngày|tuần|tháng|năm)|rồi)|sau\s+\d+\s*(?:ngày|tuần|tháng)\s+(?:dùng|sử dụng|xài)/giu;

function stripInlineCode(line, replacement = ' ') {
  return line.replace(/``[^\n]*?``|`[^`\n]*`/gu, replacement);
}

function stripNonQuoteLine(line) {
  if (/^\s*>/u.test(line)) return '';
  return stripInlineCode(line, ' __Q__ ').replace(/["“][^"”\n]{1,300}["”]|«[^»\n]{1,300}»/gu, ' __Q__ ');
}

const OFFICIAL_DOC_RE = /^\s*(?:số:\s*\d+\s*\/|v\/v(?![\p{L}\p{M}\p{N}])|kính gửi:|cộng hòa xã hội chủ nghĩa|căn cứ\s+(?:luật|nghị định|thông tư|quyết định|bộ luật)|điều\s+\d+[.:]\s+\p{Lu})/imu;

const PROMPT_INJECTION_RE = /<\/?(?:skill|system|instructions?)>|(?:bỏ qua|quên)\s+(?:mọi|tất cả|toàn bộ|các)\s+(?:hướng dẫn|chỉ dẫn|chỉ thị)\s+(?:trước đó|ở trên)|\bignore\s+(?:all\s+|any\s+)?(?:the\s+)?(?:previous|prior|above)\s+instructions\b/giu;
const VOICE_TAG_RE = /(?:^|[.!?]\s+)(?:Nói\s+(?:cho\s+thật|thật\s+nhé|gọn|trắng\s+ra|thẳng(?:\s+ra)?)\s*:|(?:Thành\s+thật|Thật\s+lòng|Công\s+bằng|Thẳng\s+thắn|Thú\s+thật)\s+mà\s+nói\s*,|(?:Hiểu|Nói)\s+(?:một\s+cách\s+)?(?:đơn\s+giản|nôm\s+na)\s+(?:là|thì)(?![\p{L}\p{M}\p{N}])|Điều\s+(?:mình|tôi)\s+(?:chỉ\s+)?muốn\s+nói\s+là\s*:)/giu;
const PLEONASM_VI_RE = /(?<![\p{L}\p{M}\p{N}])(?:hiện nay đang|đang trong quá trình|hoàn toàn đầy đủ|vẫn còn đang|các những|mọi tất cả|tái\s+\p{L}+\s+lại)(?![\p{L}\p{M}\p{N}])/giu;
const EN_GLOSS_RE = /\p{L}*[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]\p{L}*[ \t]\(((?!(?:le|la|les|du|des|un|une)\s)[a-z][a-z -]{2,28})\)/gu;

export function stripTtsTags(lineOrText) {
  if (!lineOrText) return lineOrText;
  let matched = false;
  const stripped = lineOrText.replace(TTS_TAG_SPAN_RE, (m, offset, str) => {
    matched = true;
    const prev = offset > 0 ? str[offset - 1] : '';
    const next = offset + m.length < str.length ? str[offset + m.length] : '';
    if (!prev || prev === '\n' || !next || next === '\n') return '';
    if (/[.,!?;:)\]}”"']/u.test(next)) return '';
    if (/[(\[{“"']/u.test(prev)) return '';
    return ' ';
  });
  return matched ? stripped : lineOrText;
}

// Each rule: id, level, description, and a check(line) → array of matched excerpts
export const LINE_RULES = [
  {
    id: 'em-dash', level: 'WARN', desc: 'House style viet-pro ưu tiên gạch ngang - có cách hai bên thay cho em-dash/en-dash/horizontal-bar',
    // U+2014 em-dash, U+2013 en-dash, U+2015 horizontal bar — AI hay sinh cả ba
    check: (l) => [...l.matchAll(/[—–―]/gu)].map((m) => m[0]),
  },
  {
    id: 'oxford-comma', level: 'WARN', desc: 'House style viet-pro không dùng Oxford comma ", và"',
    check: (l) => [...l.matchAll(/,\s+và\s/gu)].map((m) => m[0]),
  },
  {
    id: 'space-before-punct', level: 'ERROR', desc: 'Dấu câu phải sát từ phía trước (punctuation.md)',
    // space before . , ! ? ; — but not "..." leaders, not markdown table pipes, not numbered "1 ." false cases
    check: (l) => [...l.matchAll(/\S\s+[.,!?;](?=\s|$)/gu)].map((m) => m[0]).filter((s) => !s.includes('|')),
  },
  {
    id: 'ai-label', level: 'WARN', desc: 'Nhãn sáo kiểu AI; cần xem lại trong ngữ cảnh (anti-ai.md)',
    check: (l) => [...l.matchAll(/\b(Key insights?:|Key takeaways?:|Note:|Summary:)|Trong bài viết này/gu)].map((m) => m[0]),
  },
  {
    id: 'chatbot-residue', level: 'WARN', desc: 'Lời thoại trợ lý có thể đã lọt vào nội dung công khai (humanizer pattern 22)',
    check: (l) => [...l.matchAll(/(?:^|\s)(Dưới đây là|Hy vọng (?:nội dung|bài viết) này hữu ích|Bạn có muốn tôi|Tôi có thể giúp bạn)/giu)].map((m) => m[0].trim()),
  },
  {
    id: 'heading-colon', level: 'WARN', desc: 'House style viet-pro hạn chế dấu hai chấm trong tiêu đề',
    check: (l) => {
      if (!/^#{1,6}\s/u.test(l)) return [];
      const cleaned = stripInlineCode(l.replace(/\[([^\]]*)\]\([^)\n]+\)/gu, '$1'), ' ')
        .replace(/(?:https?|file):\/\/\S+/giu, ' ');
      return /^#{1,6}\s.*:\s*\S/u.test(cleaned) || /^#{1,6}\s.*:\s*$/u.test(cleaned)
        ? [l.trim().slice(0, 60)]
        : [];
    },
  },
  {
    id: 'double-space', level: 'WARN', desc: 'Hai khoảng trắng liên tiếp giữa từ',
    check: (l) => {
      const cleaned = stripInlineCode(l, '_')
        .replace(/\s*\|\s*/gu, ' | ')
        .replace(/\| {2,}(?=\|)/gu, '| ')
        .trim();
      return /\S {2,}\S/.test(cleaned) ? [cleaned.slice(0, 40)] : [];
    },
  },
  {
    id: 'title-case', level: 'WARN', desc: 'Nghi Title Case kiểu Anh — tiếng Việt chỉ viết hoa chữ đầu (capitalization.md)',
    // 3+ consecutive Capitalized words; heuristic, proper nouns cause noise → WARN only; ignore [Metatag] blocks
    check: (l) => [...l.replace(/\[[^\]]*\]/gu, '').matchAll(/(?:\p{Lu}\p{Ll}+ ){3,}\p{Lu}\p{Ll}+/gu)].map((m) => m[0].slice(0, 50)),
  },
  {
    id: 'chatbot-citation', level: 'ERROR', desc: 'Markup trích dẫn của chatbot còn sót (oaicite, turn0search, 【…†…】, [cite], utm_source=chatgpt.com)',
    check: (l) => [...l.matchAll(/:contentReference\[oaicite:\d+\](?:\{index=\d+\})?|\bturn\d+(?:search|news|view|fetch|file)\d+\b|\[cite(?::\s*[\d,\s]+)?\]|【\d+†[^】]*】|utm_source=(?:chatgpt\.com|openai|perplexity|copilot\.com|gemini)/giu)].map((m) => m[0]),
  },
  {
    id: 'placeholder', level: 'WARN', desc: 'Nghi chỗ trống chưa điền ([Tên công ty], [chèn link], XX%, Lorem ipsum)',
    check: (l) => [...l.matchAll(/\[(?:Tên (?:công ty|doanh nghiệp|thương hiệu|sản phẩm|khách hàng|bạn)|chèn link|điền|placeholder)[^\]\n]*\]|\bLorem ipsum\b|\bXX(?=%|\s?(?:triệu|tỷ|nghìn|đồng|USD)(?![\p{L}\p{N}]))/giu)].map((m) => m[0]),
  },
  {
    id: 'unicode-nfd', level: 'WARN', desc: 'Ký tự dấu thanh/dấu mũ tổ hợp rời hệ Unicode NFD; cần chuẩn hóa về NFC',
    check: (l) => [...l.matchAll(/[\p{L}\p{M}]*[\u0300-\u0303\u0306\u0309\u031B\u0323][\p{L}\p{M}]*/gu)].map((m) => m[0]),
  },
  {
    id: 'hedging-pileup', level: 'WARN', desc: 'Chồng chất nhiều lớp từ rào đón dịch thuật làm câu văn mơ hồ (im-not-ai pattern G)',
    check: (l) => [...l.replace(/["“][^"”\n]{1,200}["”]|`[^`\n]{1,200}`/gu, ' ').matchAll(/\b(?:có thể sẽ\s+(?:góp phần|mang lại|tạo ra|dẫn đến|mở ra)|dường như\s+(?:có xu hướng|đang dần|có thể|được xem là)|được kỳ vọng\s+(?:sẽ\s+)?(?:mang lại khả năng|góp phần|tạo điều kiện)|có khả năng\s+(?:sẽ\s+)?(?:góp phần|tạo điều kiện|mang lại tiềm năng)|có xu hướng\s+(?:được xem là|được đánh giá là|góp phần vào việc))\b/giu)].map((m) => m[0].trim()),
  },
  {
    id: 'prompt-injection-tag', level: 'ERROR', desc: 'Phát hiện thẻ giả hệ thống hoặc câu lệnh chèn chỉ thị (humanizer 4.0.0 / viet-nhu-nguoi)',
    check: (l) => {
      const clean = stripNonQuoteLine(l);
      return clean ? [...clean.matchAll(PROMPT_INJECTION_RE)].map((m) => m[0].trim()) : [];
    },
  },
  {
    id: 'voice-tag', level: 'WARN', desc: 'Nhãn rào giọng đầu câu/đoạn thay vì nói thẳng ý chính (document-tics.md)',
    check: (l, opts = {}) => {
      const clean = stripKeep(stripNonQuoteLine(l), opts.keep);
      return clean ? [...clean.matchAll(VOICE_TAG_RE)].map((m) => m[0].replace(/^[.!?]\s+/u, '').trim()) : [];
    },
  },
  {
    id: 'pleonasm-vi', level: 'WARN', desc: 'Cụm từ thừa nghĩa lặp lại (translationese-vi.md)',
    check: (l, opts = {}) => {
      const clean = stripKeep(stripNonQuoteLine(l), opts.keep);
      return clean ? [...clean.matchAll(PLEONASM_VI_RE)].map((m) => m[0].trim()) : [];
    },
  },
  {
    id: 'unnecessary-english-gloss', level: 'WARN', desc: 'Chêm chú thích tiếng Anh viết thường sau từ tiếng Việt đã rõ nghĩa',
    check: (l, opts = {}) => {
      const clean = stripKeep(stripNonQuoteLine(l), opts.keep);
      return clean ? [...clean.matchAll(EN_GLOSS_RE)].map((m) => m[0].trim()) : [];
    },
  },
];

// A leading `---` ... `---` block is YAML frontmatter; an unclosed `---` is ordinary text.
const frontmatterEnd = (lines) => (lines[0]?.trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1);
const hasFrontmatter = (lines) => frontmatterEnd(lines) > 0;

export function stripFrontmatter(text) {
  const lines = text.replace(/\r\n/gu, '\n').split('\n');
  const end = frontmatterEnd(lines);
  return end > 0 ? lines.slice(end + 1).join('\n') : text;
}

function stripProtectedBlocks(text) {
  const lines = text.split('\n');
  let inFence = false;
  let inFrontmatter = hasFrontmatter(lines);
  return lines.map((line, i) => {
    if (i === 0 && inFrontmatter) return '';
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      return '';
    }
    if (/^\s*```/.test(line)) { inFence = !inFence; return ''; }
    return inFence ? '' : line;
  }).join('\n');
}

const FUNCTION_WORDS = new Set('và của là có được cho các những một trong với không này đó thì mà để khi đã sẽ đang cũng như từ ra vào lên theo về tại bằng hay hoặc nhưng nên vì do nếu rằng thể việc sự người cái những rất hơn nhất'.split(' '));

const TRANSLATIONESE_PATTERNS = [
  /\b(?:việc|sự)\s+(?:triển khai|áp dụng|thực hiện|sử dụng|tối ưu|phát triển|xây dựng|đầu tư|thay đổi|kết hợp|chuyển đổi|phối hợp|kiểm tra|điều chỉnh|mở rộng|nâng cao|cải thiện|tăng cường|đảm bảo|duy trì)\b/giu,
  /\bmột cách\s+(?:nhanh chóng|chính xác|hiệu quả|toàn diện|liền mạch|rõ ràng|cụ thể|tự nhiên|chủ động|linh hoạt|triệt để|đồng bộ|bền vững|tối ưu|hợp lý|dễ dàng|hệ thống)\b/giu,
  /\bthông qua việc\b/giu,
  /\bđược\s+(?:\p{L}+\s+){1,5}bởi\b/giu,
  /\b(?:tiến hành|thực hiện việc|đưa ra sự)\s+\p{L}+/giu,
  /\bđóng vai trò\s+(?:quan trọng|then chốt|thiết yếu|quyết định|chủ chốt|trọng tâm)\b/giu,
  /(?:^|[.!?]\s+)(?:Đối với\s+[^,\n.!?;]{2,40}\s+thì|Điều này có nghĩa là)\b/giu,
  /,\s*(?:qua đó|từ đó)\s+(?:giúp|góp phần|thúc đẩy|tạo điều kiện|mang lại|nâng cao|tăng cường|mở ra)\b/giu,
  /\bcủa\s+(?:\p{L}+\s+){1,4}của\s+(?:\p{L}+\s+){1,4}của\b/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:bảng|biểu đồ|số liệu|dữ liệu|báo cáo|công cụ|tính năng|giải pháp|nền tảng|hệ thống)\s+này\s+(?:cho phép bạn|giúp bạn|đảm bảo rằng|chỉ ra rằng|chứng minh rằng)(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:nơi|người|điều|lý do|thời điểm)\s+mà(?!\s+(?:không|chưa|vẫn|chẳng|ai|ta|mình|tôi|bạn|họ))(?![\p{L}\p{M}\p{N}])/giu,
  /(?<![\p{L}\p{M}\p{N}])(?:ở cuối ngày|tin tốt là|cuối cùng nhưng không kém phần quan trọng|hy vọng email này tìm thấy|vui lòng tìm thấy tệp đính kèm|với bạn trong tâm trí)(?![\p{L}\p{M}\p{N}])/giu,
];

const AI_BUZZWORD_RE = /\b(?:tối ưu hóa toàn diện|giải pháp toàn diện|hệ sinh thái liền mạch|trải nghiệm liền mạch|bức tranh toàn cảnh|chìa khóa then chốt|nền tảng vững chắc|khai mở tiềm năng|mở khóa tiềm năng|nâng tầm trải nghiệm|hành trình chuyển đổi(?:\s+số)?|bước ngoặt lịch sử|thay đổi cuộc chơi|định hình tương lai|giải pháp đột phá|công nghệ đột phá|tiêu chuẩn vàng|kim chỉ nam)\b/giu;

const FILLER_PATTERNS = [
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

const SLANG_PILEUP_RE = /(?<![\p{L}\p{M}\p{N}])(?:ổn áp|keo l[ìỳ]|mãi đỉnh|đỉnh nóc|kịch trần|bay phấp phới|chốt đơn|xịn xò|cực phẩm|hết nước chấm|nhức nách|ảo ma|ét ô ét|ra dẻ|over hợp|tới công chuyện|u là trời|gét gô|xu cà na|slay)(?![\p{L}\p{M}\p{N}])/giu;
const DIALECT_MARKERS = [
  ['Bắc', /(?<![\p{L}\p{M}\p{N}])(?:nhỉ|đấy nhé|thế nhỉ|chứ lị|vậy nhỉ|nhể|giời ơi)(?![\p{L}\p{M}\p{N}])/giu],
  ['Trung', /(?<![\p{L}\p{M}\p{N}])(?:mô tê|răng rứa|rứa đó|rứa|chừ|chi mô|hỉ)(?![\p{L}\p{M}\p{N}])/giu],
  ['Nam', /(?<![\p{L}\p{M}\p{N}])(?:nghen|dzậy|hen|hông|hổng|bển|trển|ngoải|dìa|ổng)(?![\p{L}\p{M}\p{N}])/giu],
];

function stripKeep(text, keep = []) {
  let out = text;
  for (const k of keep) {
    if (!k) continue;
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    out = out.replace(new RegExp(escaped, 'giu'), ' ');
  }
  return out;
}

function stripQuotedAndKept(text, keep = []) {
  return stripKeep(text.replace(/["“][^"”\n]{1,200}["”]|«[^»\n]{1,300}»|`[^`\n]{1,200}`/gu, ' '), keep);
}

function extractPureProseParagraphs(text) {
  const paragraphs = [];
  let current = '';
  for (const raw of text.split('\n')) {
    const t = raw.trim();
    const skip = !t || t.startsWith('#') || t.startsWith('|') || t.startsWith('>')
      || /^[-*_]{3,}$/u.test(t) || /^(?:[-*•+]|\d+[.)])\s/u.test(t)
      || /^\*\*[^*\n:]{1,40}:\*\*/u.test(t) || /^\[[^\]]+\]$/u.test(t);
    if (skip) {
      if (current) { paragraphs.push(current); current = ''; }
      continue;
    }
    current = current ? `${current} ${t}` : t;
  }
  if (current) paragraphs.push(current);
  return paragraphs;
}

function paragraphClusters(text, keep = [], isOfficial = false) {
  const findings = [];
  const lines = text.split('\n');
  const paragraphs = [];
  let current = null;
  lines.forEach((raw, idx) => {
    const t = raw.trim();
    const isProse = t && !t.startsWith('#') && !t.startsWith('|') && !t.startsWith('>') && !/^\[[^\]]+\]$/u.test(t);
    if (!isProse) {
      if (current) { paragraphs.push(current); current = null; }
      return;
    }
    if (!current) current = { startLine: idx + 1, text: t };
    else current.text += ` ${t}`;
  });
  if (current) paragraphs.push(current);

  for (const p of paragraphs) {
    const cleaned = stripQuotedAndKept(p.text, keep);
    if (!isOfficial) {
      const transHits = [];
      for (const re of TRANSLATIONESE_PATTERNS) {
        for (const m of cleaned.matchAll(re)) transHits.push(m[0].replace(/^[.,!?\s]+/u, '').trim());
      }
      if (transHits.length >= 3) {
        findings.push({
          level: 'WARN',
          id: 'translationese-cluster',
          line: p.startLine,
          excerpt: `Cụm văn dịch (${transHits.length} dấu hiệu): ${transHits.slice(0, 4).map((x) => `"${x}"`).join(', ')}`,
          desc: 'Nhiều cấu trúc dịch sát tiếng Anh tụ trong cùng đoạn (translationese-vi.md)',
        });
      }
    }
    const buzzHits = [...cleaned.matchAll(AI_BUZZWORD_RE)].map((m) => m[0].trim());
    if (buzzHits.length >= 3) {
      findings.push({
        level: 'WARN',
        id: 'ai-buzzword-cluster',
        line: p.startLine,
        excerpt: `Cụm sáo ngữ AI (${buzzHits.length} cụm): ${buzzHits.slice(0, 4).map((x) => `"${x}"`).join(', ')}`,
        desc: 'Tụ nhiều cụm từ AI/marketing sáo rỗng trong cùng đoạn (humanizer pattern 12, 16)',
      });
    }
    const sents = cleaned.split(/(?<=[.!?])\s+/u).map((s) => s.trim()).filter((s) => s.length > 15);
    const openSig = (s) => {
      const clause = s.match(/^([\p{L}]+)\s+(?:[\p{L}\p{N}]+\s+){1,10}[\p{L}\p{N}]+,/u);
      if (clause) return `${clause[1].toLowerCase()}...,`;
      const pair = s.match(/^([\p{L}]+\s+[\p{L}]+)\b/u);
      return pair ? pair[1].toLowerCase() : null;
    };
    for (let i = 0; i + 2 < sents.length; i++) {
      const s0 = openSig(sents[i]);
      if (s0 && s0 === openSig(sents[i + 1]) && s0 === openSig(sents[i + 2])) {
        findings.push({
          level: 'WARN',
          id: 'isomorphic-sentence',
          line: p.startLine,
          excerpt: `3 câu liên tiếp mở đầu cùng khuôn "${s0}"`,
          desc: 'Ba câu liên tiếp trong đoạn lặp cùng cấu trúc mở đầu (lieflat check-structure)',
        });
        break;
      }
    }
  }
  return findings;
}

// Repeated 5-8 syllable phrases (3+ times), longest first; phrases made only of function words or
// contained in a --keep string are ignored.
function phraseReuse(text, keep = []) {
  const keepLower = keep.map((k) => k.toLowerCase());
  const sanitized = stripInlineCode(text.replace(/\[([^\]]*)\]\([^)\n]+\)/gu, '$1'))
    .replace(/(?:https?|file):\/\/[^\s)>\]]+/giu, ' ');
  const segments = sanitized.toLowerCase().split(/[.!?;:\n]+/u).map((s) => s.match(/[\p{L}\p{N}]+/gu) || []);
  // found: { at: [[segment, start], ...], len, c }; at holds every occurrence of the span.
  const found = [];
  const words = (f) => segments[f.at[0][0]].slice(f.at[0][1], f.at[0][1] + f.len).join(' ');
  const shifted = (at, by) => at.map(([s, i]) => `${s}:${i + by}`).join(',');
  for (let n = 8; n >= 5; n--) {
    const occ = new Map();
    segments.forEach((toks, s) => {
      for (let i = 0; i + n <= toks.length; i++) {
        const g = toks.slice(i, i + n);
        if (g.every((t) => FUNCTION_WORDS.has(t))) continue;
        const key = g.join(' ');
        if (!occ.has(key)) occ.set(key, []);
        occ.get(key).push([s, i]);
      }
    });
    for (const [phrase, at] of occ) {
      const c = at.length;
      if (c < 3) continue;
      if (found.some((f) => ` ${words(f)} `.includes(` ${phrase} `))) continue;
      if (keepLower.some((k) => ` ${k} `.includes(` ${phrase} `) || ` ${phrase} `.includes(` ${k} `))) continue;
      // A longer repeated span yields n-grams shifted by one word. Extend the earlier finding only when
      // every occurrence sits right after (or right before) one of its occurrences.
      const here = shifted(at, 0);
      const after = found.find((f) => f.c === c && shifted(f.at, f.len - n + 1) === here);
      if (after) { after.len++; continue; }
      const before = found.find((f) => f.c === c && shifted(f.at, -1) === here);
      if (before) { before.at = at; before.len++; continue; }
      found.push({ at, len: n, c });
    }
  }
  return found.map((f) => {
    const phrase = words(f);
    const shown = phrase.length > 120 ? `${phrase.slice(0, 117)}...` : phrase;
    return { level: 'WARN', id: 'phrase-reuse', line: 0, excerpt: `"${shown}" lặp ${f.c} lần` };
  });
}

function checkDocumentSignals(text, reuseTarget, opts = {}) {
  const findings = [];
  const isSong = SONG_TAG_RE.test(text);
  const isOfficial = opts.isOfficial ?? OFFICIAL_DOC_RE.test(text);
  const pureParas = extractPureProseParagraphs(reuseTarget);
  const cleanProseText = stripQuotedAndKept(
    pureParas.join('\n').replace(/\[([^\]]*)\]\([^)\n]+\)/gu, '$1').replace(/(?:https?|file):\/\/\S+/giu, ' '),
    opts.keep,
  );
  const proseWords = cleanProseText.match(/[\p{L}\p{N}]+/gu) || [];

  if (!isSong && !isOfficial && proseWords.length >= 80) {
    let fillerHits = 0;
    for (const re of FILLER_PATTERNS) {
      fillerHits += [...cleanProseText.matchAll(re)].length;
    }
    const perThousand = Math.round((fillerHits / proseWords.length) * 1000);
    if (perThousand >= 115) {
      findings.push({
        level: 'WARN',
        id: 'translationese-filler-density',
        line: 0,
        excerpt: `Mật độ hư từ dịch thuật ${perThousand}/1.000 chữ (${fillerHits}/${proseWords.length})`,
        desc: 'Mật độ hư từ dịch thuật ("một", "các", "những", "được", "sẽ", "đã", "của bạn", "việc/sự"...) quá cao',
      });
    }
  }

  const colonText = cleanProseText.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/gu, ' ');
  const colonCount = (colonText.match(/:/gu) || []).length;
  const colonPerThousand = proseWords.length ? (colonCount / proseWords.length) * 1000 : 0;
  if (colonCount >= 4 && proseWords.length >= 60 && colonPerThousand >= 22) {
    findings.push({
      level: 'WARN',
      id: 'colon-density',
      line: 0,
      excerpt: `${colonCount} dấu hai chấm trong văn xuôi (${Math.round(colonPerThousand)}/1.000 chữ)`,
      desc: 'Lạm dụng dấu hai chấm giải thích giữa đoạn văn xuôi (document-tics.md)',
    });
  }

  if (!isSong && !isOfficial) {
    const choppyRun = pureParas.reduce((best, para) => {
      const cleanPara = stripQuotedAndKept(
        para.replace(/\[([^\]]*)\]\([^)\n]+\)/gu, '$1').replace(/(?:https?|file):\/\/\S+/giu, ' '),
        opts.keep,
      );
      const parts = cleanPara.split(/(\.{2,}|[.!?]+)(?=\s|$)/u);
      let cur = 0;
      let localBest = 0;
      for (let i = 0; i + 1 < parts.length; i += 2) {
        const s = parts[i].trim();
        const punct = parts[i + 1];
        const wc = s ? (s.match(/[\p{L}\p{N}]+/gu) || []).length : 0;
        if (punct === '.' && wc >= 1 && wc <= 6) {
          cur++;
          if (cur > localBest) localBest = cur;
        } else {
          cur = 0;
        }
      }
      return Math.max(best, localBest);
    }, 0);
    const shortParaLines = pureParas.filter((p) => {
      const wc = (stripQuotedAndKept(p, opts.keep).match(/[\p{L}\p{N}]+/gu) || []).length;
      const ends = (p.match(/[.!?]+(?:\s|$)/gu) || []).length;
      return wc >= 1 && wc <= 7 && ends <= 1;
    }).length;
    if (choppyRun >= 4 || (pureParas.length >= 5 && shortParaLines >= 5 && shortParaLines / pureParas.length >= 0.7)) {
      findings.push({
        level: 'WARN',
        id: 'choppy-sentences',
        line: 0,
        excerpt: choppyRun >= 4 ? `${choppyRun} câu ngắn <=6 chữ liên tiếp` : `${shortParaLines}/${pureParas.length} đoạn ngắn cụt nhịp`,
        desc: 'Chuỗi câu ngắn rời rạc tạo nhịp giật cục kiểu AI (humanizer-patterns.md)',
      });
    }
  }

  const allClean = stripQuotedAndKept(
    reuseTarget.replace(/\[([^\]]*)\]\([^)\n]+\)/gu, '$1').replace(/(?:https?|file):\/\/\S+/giu, ' '),
    opts.keep,
  );
  const allWords = (allClean.match(/[\p{L}\p{N}]+/gu) || []).length || 1;
  const slangHits = [...allClean.matchAll(SLANG_PILEUP_RE)].map((m) => m[0].toLowerCase().trim());
  const distinctSlang = new Set(slangHits).size;
  if (distinctSlang >= 3 && slangHits.length * 25 >= allWords) {
    findings.push({
      level: 'WARN',
      id: 'slang-pileup',
      line: 0,
      excerpt: `${distinctSlang} từ lóng mạng dày đặc (${[...new Set(slangHits)].slice(0, 4).join(', ')})`,
      desc: 'Nhồi từ lóng mạng xã hội dày đặc gây gượng gạo (document-tics.md)',
    });
  }

  const regionCounts = [];
  let totalDialectHits = 0;
  for (const [region, re] of DIALECT_MARKERS) {
    const matches = [...allClean.matchAll(re)].map((m) => m[0].toLowerCase().trim());
    if (matches.length > 0) {
      regionCounts.push(`${region}: ${matches[0]}`);
      totalDialectHits += matches.length;
    }
  }
  if (regionCounts.length >= 2 && totalDialectHits >= 3) {
    findings.push({
      level: 'WARN',
      id: 'dialect-mix',
      line: 0,
      excerpt: `Trộn khẩu ngữ vùng miền (${regionCounts.join('; ')})`,
      desc: 'Pha tạp hư từ khẩu ngữ Bắc/Trung/Nam trong cùng văn bản (consistency.md)',
    });
  }
  return findings;
}

// Whole-text rules
function textRules(text, opts = {}) {
  const findings = [];
  // transition overuse (anti-ai.md): same connector > 3 times
  for (const w of ['Tuy nhiên,', 'Bên cạnh đó,', 'Ngoài ra,']) {
    const n = text.split(w).length - 1;
    if (n > 3) findings.push({ level: 'WARN', id: 'transition-overuse', line: 0, excerpt: `"${w}" xuất hiện ${n} lần (>3)` });
  }
  const proseLines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('|'));
  const opener = proseLines.slice(0, 3).find((l) => /^(Hãy tưởng tượng|Trong (?:bối cảnh|thế giới|kỷ nguyên)\b)/iu.test(l));
  if (opener) findings.push({ level: 'WARN', id: 'staged-opener', line: 0, excerpt: opener.slice(0, 90) });

  const contrasts = [...text.matchAll(/không\s+(?:chỉ|phải)\s+[^.!?\n]{0,120}(?:mà\s+còn|mà\s+là)/giu)];
  if (contrasts.length > 1) findings.push({ level: 'WARN', id: 'contrast-formula-repeat', line: 0, excerpt: `Công thức đối lập xuất hiện ${contrasts.length} lần` });

  const boldLabels = [...text.matchAll(/^\s*\*\*[^*\n:]{1,40}:\*\*/gmu)];
  if (boldLabels.length >= 3) findings.push({ level: 'WARN', id: 'decorative-bold-labels', line: 0, excerpt: `${boldLabels.length} đoạn mở bằng nhãn bold` });

  const dramaticClosers = proseLines.filter((l) => l.length <= 100 && /^(Và đó mới là|Đó mới là điều|Không ai (?:còn )?có thể làm ngơ|Hãy để điều đó)/iu.test(l));
  if (dramaticClosers.length > 1) findings.push({ level: 'WARN', id: 'dramatic-closer-repeat', line: 0, excerpt: `${dramaticClosers.length} câu kết/fragment kịch tính` });
  const isSong = SONG_TAG_RE.test(text);
  const isOfficial = opts.isOfficial ?? OFFICIAL_DOC_RE.test(text);
  const reuseTarget = isSong ? dedupeSongLyrics(text) : text;
  const toneTarget = stripQuotedAndKept(reuseTarget, opts.keep);
  const oldTones = [...toneTarget.matchAll(/\p{L}*(?<![qgQG])(?:o[àáảãạ]|o[èéẻẽẹ]|u[ỳýỷỹỵ])(?![\p{L}\p{M}])/giu)].map((m) => m[0]);
  const newTones = [...toneTarget.matchAll(/\p{L}*(?<![qgQG])(?:[òóỏõọ][ae]|[ùúủũụ]y)(?![\p{L}\p{M}])/giu)].map((m) => m[0]);
  if (oldTones.length > 0 && newTones.length > 0) {
    findings.push({
      level: 'WARN',
      id: 'inconsistent-tone-mark',
      line: 0,
      excerpt: `Trộn kiểu bỏ dấu cũ ("${oldTones[0]}") và mới ("${newTones[0]}")`,
      desc: 'Trộn hai quy tắc đặt dấu thanh oa/oe/uy trong cùng văn bản (consistency.md)',
    });
  }
  findings.push(...phraseReuse(reuseTarget, opts.keep));
  findings.push(...paragraphClusters(reuseTarget, opts.keep, isOfficial));
  findings.push(...checkDocumentSignals(text, reuseTarget, { ...opts, isOfficial }));
  return findings;
}

function dedupeSongLyrics(text) {
  const seenLines = new Set();
  let seenChorus = false;
  let skipBlock = false;
  const out = [];
  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim();
    if (/^\[[^\]]+\]$/u.test(trimmed)) {
      if (/^\[(?:Chorus|Final Chorus|Hook|Refrain)\b/iu.test(trimmed)) {
        skipBlock = seenChorus;
        seenChorus = true;
      } else {
        skipBlock = false;
      }
      continue;
    }
    if (skipBlock) continue;
    const cleaned = trimmed.replace(/\[[^\]]*\]/gu, '').trim();
    const norm = cleaned.toLowerCase().replace(/\s+/gu, ' ');
    if (norm && seenLines.has(norm)) continue;
    if (norm) seenLines.add(norm);
    out.push(cleaned);
  }
  return out.join('\n');
}

const SONG_TAG_RE = /^\s*\[(?:Intro|Verse|Pre-Chorus|Chorus|Final Chorus|Bridge|Outro|Hook|Refrain)\b/imu;

function checkBannedPhrases(proseText, bannedPhrases = []) {
  if (!Array.isArray(bannedPhrases) || !bannedPhrases.length) return [];
  const normalized = proseText.normalize('NFC');
  const findings = [];
  for (const rawPhrase of bannedPhrases) {
    if (typeof rawPhrase !== 'string') continue;
    const phrase = rawPhrase.trim().normalize('NFC');
    if (!phrase) continue;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/\s+/gu, '\\s+');
    const chars = [...phrase];
    const guardStart = /[\p{L}\p{N}]/u.test(chars[0]) ? '(?<![\\p{L}\\p{M}\\p{N}])' : '';
    const guardEnd = /[\p{L}\p{N}]/u.test(chars.at(-1)) ? '(?![\\p{L}\\p{M}\\p{N}])' : '';
    const re = new RegExp(`${guardStart}${escaped}${guardEnd}`, 'giu');
    for (const m of normalized.matchAll(re)) {
      const line = normalized.slice(0, m.index).split('\n').length;
      findings.push({
        level: 'ERROR',
        id: 'banned-phrase',
        line,
        excerpt: m[0],
        desc: 'Cụm từ nằm trong danh sách cấm của dự án (.viet-pro.json)',
      });
    }
  }
  return findings;
}

function checkMandatoryCta(text, mandatoryCta) {
  if (typeof mandatoryCta !== 'string') return [];
  const cta = mandatoryCta.trim().normalize('NFC');
  if (!cta) return [];
  const body = stripFrontmatter(text).normalize('NFC').toLowerCase();
  if (body.includes(cta.toLowerCase())) return [];
  return [{
    level: 'ERROR',
    id: 'missing-mandatory-cta',
    line: 0,
    excerpt: cta,
    desc: 'Bản thảo thiếu CTA bắt buộc theo cấu hình .viet-pro.json',
  }];
}

function stripQuotesAndInlineCodeKeepLines(text) {
  return text
    .split('\n')
    .map((line) => (/^\s*>/u.test(line) ? '' : stripInlineCode(line, ' ').replace(/["“][^"”\n]*["”]/gu, ' ')))
    .join('\n');
}

function checkFirstHand(proseText, allowFirstHand, strictFirstHand = false) {
  if (allowFirstHand !== false) return [];
  const scanTarget = stripQuotesAndInlineCodeKeepLines(proseText).normalize('NFC');
  const level = strictFirstHand === true ? 'ERROR' : 'WARN';
  const findings = [];
  const re = new RegExp(FIRST_HAND_RE.source, FIRST_HAND_RE.flags);
  for (const m of scanTarget.matchAll(re)) {
    const line = scanTarget.slice(0, m.index).split('\n').length;
    findings.push({
      level,
      id: 'unverified-first-hand',
      line,
      excerpt: m[0].trim(),
      desc: 'Phát ngôn trải nghiệm tự thân cần được tác giả xác nhận (allow_first_hand: false)',
    });
  }
  return findings;
}

export function lintText(text, opts = {}) {
  const findings = [];
  const lines = text.split('\n');
  const isSong = SONG_TAG_RE.test(text);
  const ttsEnabled = opts.ttsTags !== false;
  let inFence = false;
  let inFrontmatter = hasFrontmatter(lines);
  let draftSection = '';
  lines.forEach((line, i) => {
    if (i === 0 && inFrontmatter) return;
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      return;
    }
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const secMatch = line.match(/^##[ \t]+(title|description|caption|body)[ \t]*$/iu);
    if (secMatch) { draftSection = secMatch[1].toLowerCase(); return; }
    const lineForRules = ttsEnabled ? stripTtsTags(line) : line;
    for (const rule of LINE_RULES) {
      if (isSong && rule.id === 'title-case' && (draftSection === 'title' || draftSection === 'description' || draftSection === 'caption')) continue;
      for (const excerpt of rule.check(lineForRules, opts)) {
        findings.push({ level: rule.level, id: rule.id, line: i + 1, excerpt, desc: rule.desc });
      }
    }
  });
  const protectedStripped = stripProtectedBlocks(text);
  const proseBody = ttsEnabled ? stripTtsTags(protectedStripped) : protectedStripped;
  findings.push(...textRules(proseBody, opts));
  findings.push(...checkBannedPhrases(proseBody, opts.bannedPhrases));
  findings.push(...checkMandatoryCta(text, opts.mandatoryCta));
  findings.push(...checkFirstHand(proseBody, opts.allowFirstHand, opts.strictFirstHand));
  return findings;
}

export function computeRouteHint(text, findings = lintText(text)) {
  if (!findings.length) return 'light';
  const hasHeavySignal = findings.some((f) => f.level === 'ERROR' || ['translationese-cluster', 'translationese-filler-density', 'ai-buzzword-cluster', 'isomorphic-sentence'].includes(f.id));
  if (hasHeavySignal || findings.length >= 5) return 'heavy';
  return 'standard';
}
