// Pure fact-preservation comparison. Importing this file has no side effects.

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
const NUMBER = /(?<![\p{L}\p{N}])(?:\d{1,4}[/.:-]){1,2}\d{1,4}(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?:\s?[%₫$€£]|\s?(?:USD|VND|GB|MB|KB))?(?![\p{L}\p{N}])/giu;

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

function countWhole(text, item) {
  const norm = item.normalize('NFC');
  if (!norm) return 0;
  const escaped = norm.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const chars = [...norm];
  const re = new RegExp(`${edgeGuard(chars[0], 'before')}${escaped}${edgeGuard(chars.at(-1), 'after')}`, 'gu');
  return [...text.normalize('NFC').matchAll(re)].length;
}

function collect(text, keep = [], { strictQuotes = false } = {}) {
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
    found[kind] = [...text.matchAll(regex)].map((m) => {
      if (kind === 'linkTarget') return m[1];
      if (kind === 'url') return m[0].replace(/[.,;:!?]+$/u, '');
      if (kind === 'quote' && !strictQuotes) return normalizeQuotes(m[0]);
      return m[0];
    });
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
    if (!contexts.has(m[0])) contexts.set(m[0], []);
    contexts.get(m[0]).push(words);
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
      reviews.push({ token: num, before: beforeWindows.map((w) => w.slice(-3).join(' ')), after: afterWindows.map((w) => w.slice(-3).join(' ')) });
    }
  }
  return { differences, reviews };
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
  const left = collect(before, keep, options);
  const right = collect(after, keep, options);
  const differences = [];
  for (const kind of Object.keys(left)) {
    const a = multiset(left[kind]);
    const b = multiset(right[kind]);
    for (const token of new Set([...a.keys(), ...b.keys()])) {
      if ((a.get(token) || 0) !== (b.get(token) || 0)) {
        differences.push({ kind, token, before: a.get(token) || 0, after: b.get(token) || 0 });
      }
    }
  }
  const context = compareContexts(before, after);
  const edit_ratio = computeEditRatio(before, after);
  const allDiffs = [...differences, ...context.differences];
  if (options.maxEditRatio !== undefined && options.maxEditRatio !== null && edit_ratio > options.maxEditRatio) {
    allDiffs.push({
      kind: 'edit_ratio',
      token: 'edit_ratio',
      before: `<= ${(options.maxEditRatio * 100).toFixed(1)}%`,
      after: `${(edit_ratio * 100).toFixed(1)}%`,
    });
  }
  return { differences: allDiffs, reviews: context.reviews, edit_ratio };
}
