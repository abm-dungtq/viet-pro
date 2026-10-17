// Pure lint rules for Vietnamese content. Importing this file has no side effects.

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
    check: (l) => /^#{1,6}\s.*:\s*\S/.test(l) || /^#{1,6}\s.*:\s*$/.test(l) ? [l.trim().slice(0, 60)] : [],
  },
  {
    id: 'double-space', level: 'WARN', desc: 'Hai khoảng trắng liên tiếp giữa từ',
    check: (l) => /\S {2,}\S/.test(l.replace(/\|/g, '')) ? [l.trim().slice(0, 40)] : [],
  },
  {
    id: 'title-case', level: 'WARN', desc: 'Nghi Title Case kiểu Anh — tiếng Việt chỉ viết hoa chữ đầu (capitalization.md)',
    // 3+ consecutive Capitalized words; heuristic, proper nouns cause noise → WARN only
    check: (l) => [...l.matchAll(/(?:\p{Lu}\p{Ll}+ ){3,}\p{Lu}\p{Ll}+/gu)].map((m) => m[0].slice(0, 50)),
  },
  {
    id: 'chatbot-citation', level: 'ERROR', desc: 'Markup trích dẫn của chatbot còn sót (oaicite, turn0search, 【…†…】, [cite], utm_source=chatgpt.com)',
    check: (l) => [...l.matchAll(/:contentReference\[oaicite:\d+\](?:\{index=\d+\})?|\bturn\d+(?:search|news|view|fetch|file)\d+\b|\[cite(?::\s*[\d,\s]+)?\]|【\d+†[^】]*】|utm_source=(?:chatgpt\.com|openai|perplexity|copilot\.com|gemini)/giu)].map((m) => m[0]),
  },
  {
    id: 'placeholder', level: 'WARN', desc: 'Nghi chỗ trống chưa điền ([Tên công ty], [chèn link], XX%, Lorem ipsum)',
    check: (l) => [...l.matchAll(/\[(?:Tên (?:công ty|doanh nghiệp|thương hiệu|sản phẩm|khách hàng|bạn)|chèn link|điền|placeholder)[^\]\n]*\]|\bLorem ipsum\b|\bXX(?=%|\s?(?:triệu|tỷ|nghìn|đồng|USD)(?![\p{L}\p{N}]))/giu)].map((m) => m[0]),
  },
];

function stripProtectedBlocks(text) {
  const lines = text.split('\n');
  let inFence = false;
  let inFrontmatter = lines[0]?.trim() === '---';
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

// Repeated 5-8 syllable phrases (3+ times), longest first; phrases made only of function words or
// contained in a --keep string are ignored.
function phraseReuse(text, keep = []) {
  const keepLower = keep.map((k) => k.toLowerCase());
  const segments = text.toLowerCase().split(/[.!?;:\n]+/u).map((s) => s.match(/[\p{L}\p{N}]+/gu) || []);
  const found = [];
  for (let n = 8; n >= 5; n--) {
    const counts = new Map();
    for (const toks of segments) for (let i = 0; i + n <= toks.length; i++) {
      const g = toks.slice(i, i + n);
      if (g.every((t) => FUNCTION_WORDS.has(t))) continue;
      const key = g.join(' ');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const [phrase, c] of counts) {
      if (c < 3) continue;
      if (found.some((f) => f.phrase.includes(phrase))) continue;
      if (keepLower.some((k) => ` ${k} `.includes(` ${phrase} `) || ` ${phrase} `.includes(` ${k} `))) continue;
      found.push({ phrase, c });
    }
  }
  return found.map(({ phrase, c }) => ({ level: 'WARN', id: 'phrase-reuse', line: 0, excerpt: `"${phrase}" lặp ${c} lần` }));
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
  findings.push(...phraseReuse(text, opts.keep));
  return findings;
}

export function lintText(text, opts = {}) {
  const findings = [];
  const lines = text.split('\n');
  let inFence = false;
  let inFrontmatter = lines[0]?.trim() === '---';
  lines.forEach((line, i) => {
    if (i === 0 && inFrontmatter) return;
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      return;
    }
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    for (const rule of LINE_RULES) {
      for (const excerpt of rule.check(line)) {
        findings.push({ level: rule.level, id: rule.id, line: i + 1, excerpt, desc: rule.desc });
      }
    }
  });
  findings.push(...textRules(stripProtectedBlocks(text), opts));
  return findings;
}
