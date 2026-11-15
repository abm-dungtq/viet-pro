// Pure fact-preservation comparison. Importing this file has no side effects.

import { TTS_TAG_RE, stripTtsTags } from './lint.mjs';

const TTS_TAG_EXACT_RE = new RegExp(`^${TTS_TAG_RE.source}$`, 'iu');

// Word pairs whose swap next to an unchanged number reverses the claim.
const OPPOSITES = [
  ['tăng', 'giảm'], ['cao', 'thấp'], ['hơn', 'kém'], ['trên', 'dưới'], ['trước', 'sau'],
  ['lãi', 'lỗ'], ['nhiều', 'ít'], ['thêm', 'bớt'], ['lên', 'xuống'], ['vượt', 'hụt'],
];
const OPPOSITE = new Map(OPPOSITES.flatMap(([a, b]) => [[a, b], [b, a]]));
const PHRASE_OPPOSITES = [
  ['tối đa', 'tối thiểu'], ['ít nhất', 'nhiều nhất'],
  ['chưa tới', 'hơn'], ['chưa đến', 'hơn'], ['xấp xỉ', 'chính xác'],
];
const NUMBER = /(?<![\p{L}\p{N}])(?:(?:\d{1,4}[/:-]){1,2}\d{1,4}|\d{1,2}\.\d{1,2}\.\d{2,4})(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?![.,]\d)(?:\s?[%₫đ$€£]|\s?(?:USD|VND|GB|MB|KB))?(?![\p{L}\p{N}])/giu;

const WORD_TO_DIGIT = Object.freeze({
  hai: '2', ba: '3', bốn: '4', năm: '5', sáu: '6',
  bảy: '7', bẩy: '7', tám: '8', chín: '9', mười: '10',
});
const PREV_NUM_CTX_EXCLUDE = new Set([
  'mười', 'mươi', 'trăm', 'nghìn', 'ngàn', 'triệu', 'tỷ', 'thứ', 'số', 'tháng', 'quý',
]);
const NEXT_NUM_WORD_STOP = new Set([
  'một', 'mốt', 'hai', 'ba', 'bốn', 'tư', 'năm', 'lăm', 'sáu',
  'bảy', 'bẩy', 'tám', 'chín', 'mười', 'mươi', 'trăm', 'nghìn', 'ngàn', 'triệu', 'tỷ', 'linh', 'lẻ',
]);
const QUANTITY_WORDS = [
  'hầu hết', 'đa số', 'phần lớn', 'một số', 'một vài',
  'tất cả', 'toàn bộ', 'duy nhất', 'hiếm khi', 'thường xuyên',
];
const SHADE_WORDS = [
  'có thể', 'dường như', 'ước tính', 'khoảng', 'xấp xỉ', 'tạm thời', 'dự kiến', 'có nguy cơ',
];

function canonNumberToken(raw) {
  let s = raw.trim().replace(/\s+([%₫đ$€£])/gu, '$1').replace(/(\d)\s*(USD|VND|GB|MB|KB)$/iu, (_, d, u) => `${d} ${u}`);
  const thousand = s.match(/^(\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+)(?![\d.,])(.*)$/u);
  if (thousand) s = thousand[1].replace(/[.,]/gu, '') + thousand[2];
  return s;
}

function multiset(items) {
  const result = new Map();
  for (const item of items) result.set(item, (result.get(item) || 0) + 1);
  return result;
}

const normalizeQuotes = (s) => s.replace(/[“”„]/gu, '"').replace(/[‘’]/gu, "'");

// An item may not continue a word or number of the same kind: "An" does not match inside "Anh",
// "45.000" does not match inside "45.0001" or "145.000", but does match "45.000đ".
function edgeGuard(ch, side) {
  if (/\p{N}/u.test(ch)) return side === 'before' ? '(?<!\\p{N}[.,]?)' : '(?![.,]?\\p{N})';
  if (/\p{L}/u.test(ch)) return side === 'before' ? '(?<![\\p{L}\\p{M}\\p{N}])' : '(?![\\p{L}\\p{M}\\p{N}])';
  return '';
}

function countWhole(text, item, { caseInsensitive = false } = {}) {
  const norm = item.normalize('NFC');
  if (!norm) return 0;
  const escaped = norm.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const chars = [...norm];
  const flags = caseInsensitive ? 'giu' : 'gu';
  const re = new RegExp(`${edgeGuard(chars[0], 'before')}${escaped}${edgeGuard(chars.at(-1), 'after')}`, flags);
  return [...text.normalize('NFC').matchAll(re)].length;
}

function collect(text, keep = [], { strictQuotes = false, ttsTags = true } = {}) {
  const factText = ttsTags ? stripTtsTags(text) : text;
  const patterns = {
    url: /https?:\/\/[^\s)>\]]+/gu,
    linkTarget: /\]\((https?:\/\/[^)]+)\)/gu,
    numberOrDate: NUMBER,
    quote: /["“][^"”\n]+["”]/gu,
    citation: /\[[^\]\n]+\](?!\()/gu,
    ranking: /(?:#\s?\d+|\b(?:top|thứ)\s+\d+)\b/giu,
  };
  const found = {};
  for (const [kind, regex] of Object.entries(patterns)) {
    const src = kind === 'numberOrDate' ? factText : text;
    found[kind] = [...src.matchAll(regex)].map((m) => {
      if (kind === 'linkTarget') return m[1];
      if (kind === 'url') return m[0].replace(/[.,;:!?]+$/u, '');
      if (kind === 'numberOrDate') return canonNumberToken(m[0]);
      if (kind === 'quote' && !strictQuotes) return normalizeQuotes(m[0]);
      return m[0];
    });
    if (kind === 'citation' && ttsTags) {
      found.citation = found.citation.filter((c) => !TTS_TAG_EXACT_RE.test(c));
    }
  }
  found.keep = keep.flatMap((item) => Array(countWhole(text, item)).fill(item));
  return found;
}

// For each number, up to five words before it in the same sentence.
function numberContexts(text) {
  const contexts = new Map();
  for (const m of text.matchAll(NUMBER)) {
    const before = text.slice(Math.max(0, m.index - 80), m.index).split(/[.!?\n]/u).pop();
    const words = (before.toLowerCase().match(/\p{L}+/gu) || []).slice(-5);
    const key = canonNumberToken(m[0]);
    if (!contexts.has(key)) contexts.set(key, []);
    contexts.get(key).push(words);
  }
  return contexts;
}

function hasWholePhrase(haystack, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escaped}(?![\\p{L}\\p{M}\\p{N}])`, 'iu').test(haystack);
}

function compareContexts(before, after) {
  const differences = [];
  const reviews = [];
  const left = numberContexts(before);
  const right = numberContexts(after);
  for (const [num, beforeWindows] of left) {
    const afterWindows = right.get(num);
    if (!afterWindows) continue; // a missing number is already reported as numberOrDate
    const beforeWords = new Set(beforeWindows.map((w) => w.slice(-3)).flat());
    const afterWords = new Set(afterWindows.map((w) => w.slice(-3)).flat());
    for (const word of beforeWords) {
      const opposite = OPPOSITE.get(word);
      if (opposite && !afterWords.has(word) && afterWords.has(opposite) && !beforeWords.has(opposite)) {
        differences.push({ kind: 'polarity', token: num, before: word, after: opposite });
      }
    }
    const beforeJoined = beforeWindows.map((w) => w.join(' ')).join(' | ');
    const afterJoined = afterWindows.map((w) => w.join(' ')).join(' | ');
    for (const [pA, pB] of PHRASE_OPPOSITES) {
      if (hasWholePhrase(beforeJoined, pA) && !hasWholePhrase(afterJoined, pA) && hasWholePhrase(afterJoined, pB) && !hasWholePhrase(beforeJoined, pB)) {
        differences.push({ kind: 'polarity', token: num, before: pA, after: pB });
      } else if (hasWholePhrase(beforeJoined, pB) && !hasWholePhrase(afterJoined, pB) && hasWholePhrase(afterJoined, pA) && !hasWholePhrase(beforeJoined, pA)) {
        differences.push({ kind: 'polarity', token: num, before: pB, after: pA });
      }
    }
    const lastBefore = multiset(beforeWindows.map((w) => w.at(-1) || ''));
    const lastAfter = multiset(afterWindows.map((w) => w.at(-1) || ''));
    const changed = [...new Set([...lastBefore.keys(), ...lastAfter.keys()])].some((k) => (lastBefore.get(k) || 0) !== (lastAfter.get(k) || 0));
    if (changed && !differences.some((d) => d.token === num)) {
      reviews.push({ kind: 'context', token: num, before: beforeWindows.map((w) => w.slice(-3).join(' ')), after: afterWindows.map((w) => w.slice(-3).join(' ')) });
    }
  }
  return { differences, reviews };
}

// Count guarded standalone Vietnamese number words ("hai".."mười") functioning as determiners
// before a non-number lowercase noun/classifier, returning Map<digitString, count>.
function countGuardedNumberWords(text) {
  const counts = new Map();
  const tokens = [...text.normalize('NFC').matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({
    text: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
  for (let i = 0; i + 1 < tokens.length; i++) {
    const cur = tokens[i];
    const next = tokens[i + 1];
    if (!/^(?:\p{Lu}?\p{Ll}+)$/u.test(cur.text)) continue;
    const digit = WORD_TO_DIGIT[cur.text.toLowerCase()];
    if (!digit) continue;
    const gapNext = text.slice(cur.end, next.start);
    if (!/^[ \t]+$/u.test(gapNext)) continue;
    if (!/^\p{Ll}[\p{L}\p{M}]*$/u.test(next.text) || NEXT_NUM_WORD_STOP.has(next.text.toLowerCase())) continue;
    if (i > 0) {
      const prev = tokens[i - 1];
      const gapPrev = text.slice(prev.end, cur.start);
      if (/^[ \t]+$/u.test(gapPrev) && (PREV_NUM_CTX_EXCLUDE.has(prev.text.toLowerCase()) || /^\p{N}/u.test(prev.text))) continue;
    }
    counts.set(digit, (counts.get(digit) || 0) + 1);
  }
  return counts;
}

function reconcileDigitAndWordCounts(beforeClean, afterClean, differences) {
  const wb = countGuardedNumberWords(beforeClean);
  const wa = countGuardedNumberWords(afterClean);
  return differences.filter((d) => {
    if (d.kind !== 'numberOrDate' || !/^(?:[2-9]|10)$/u.test(d.token)) return true;
    const wordDelta = (wb.get(d.token) || 0) - (wa.get(d.token) || 0);
    return wordDelta === 0 || (d.before - d.after) !== -wordDelta;
  });
}

function collectQuantAndShadeReviews(beforeClean, afterClean) {
  const alerts = [];
  for (const [kind, list] of [['quantity_word', QUANTITY_WORDS], ['shade', SHADE_WORDS]]) {
    for (const phrase of list) {
      const b = countWhole(beforeClean, phrase, { caseInsensitive: true });
      const a = countWhole(afterClean, phrase, { caseInsensitive: true });
      if (b > 0 && a === 0) alerts.push({ kind, token: phrase, before: [`${b} lần`], after: ['0 lần'] });
    }
  }
  return alerts;
}

// Share of syllable tokens changed (Levenshtein distance / longer length). 0 = identical.
export function computeEditRatio(before, after) {
  const ta = before.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const tb = after.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  if (!ta.length && !tb.length) return 0;
  let prev = Array.from({ length: tb.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ta.length; i++) {
    const cur = [i];
    for (let j = 1; j <= tb.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ta[i - 1] === tb[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Number((prev[tb.length] / Math.max(ta.length, tb.length, 1)).toFixed(4));
}

export function compare(before, after, keep = [], options = {}) {
  const ttsTags = options.ttsTags !== false;
  const beforeClean = ttsTags ? stripTtsTags(before) : before;
  const afterClean = ttsTags ? stripTtsTags(after) : after;
  const left = collect(before, keep, { ...options, ttsTags });
  const right = collect(after, keep, { ...options, ttsTags });
  const rawDifferences = [];
  for (const kind of Object.keys(left)) {
    const a = multiset(left[kind]);
    const b = multiset(right[kind]);
    for (const token of new Set([...a.keys(), ...b.keys()])) {
      if ((a.get(token) || 0) !== (b.get(token) || 0)) {
        rawDifferences.push({ kind, token, before: a.get(token) || 0, after: b.get(token) || 0 });
      }
    }
  }
  const reconciled = reconcileDigitAndWordCounts(beforeClean, afterClean, rawDifferences);
  const context = compareContexts(beforeClean, afterClean);
  const advisory = collectQuantAndShadeReviews(beforeClean, afterClean);
  const edit_ratio = computeEditRatio(before, after);
  const allDiffs = [...reconciled, ...context.differences];
  if (options.maxEditRatio !== undefined && options.maxEditRatio !== null && edit_ratio > options.maxEditRatio) {
    allDiffs.push({
      kind: 'edit_ratio',
      token: 'edit_ratio',
      before: `<= ${(options.maxEditRatio * 100).toFixed(1)}%`,
      after: `${(edit_ratio * 100).toFixed(1)}%`,
    });
  }
  return { differences: allDiffs, reviews: [...context.reviews, ...advisory], edit_ratio };
}
