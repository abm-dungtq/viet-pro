// Pure fact-preservation comparison. Importing this file has no side effects.

// Word pairs whose swap next to an unchanged number reverses the claim.
const OPPOSITES = [
  ['tăng', 'giảm'], ['cao', 'thấp'], ['hơn', 'kém'], ['trên', 'dưới'], ['trước', 'sau'],
  ['lãi', 'lỗ'], ['nhiều', 'ít'], ['thêm', 'bớt'], ['lên', 'xuống'], ['vượt', 'hụt'],
];
const OPPOSITE = new Map(OPPOSITES.flatMap(([a, b]) => [[a, b], [b, a]]));
const NUMBER = /(?<![\p{L}\p{N}])(?:\d{1,4}[/.:-]){1,2}\d{1,4}(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?:\s?[%₫$€£]|\s?(?:USD|VND|GB|MB|KB))?(?![\p{L}\p{N}])/giu;

function multiset(items) {
  const result = new Map();
  for (const item of items) result.set(item, (result.get(item) || 0) + 1);
  return result;
}

const normalizeQuotes = (s) => s.replace(/[“”„]/gu, '"').replace(/[‘’]/gu, "'");

// Occurrences of a --keep string not glued to a letter or digit, so "An" does not match inside "Anh".
// A bare number such as "3" still matches inside "3.000", because "." is neither.
function countWhole(text, item) {
  if (!item) return 0;
  const escaped = item.normalize('NFC').replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return [...text.normalize('NFC').matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu'))].length;
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

// For each number, the last three words before it in the same sentence.
function numberContexts(text) {
  const contexts = new Map();
  for (const m of text.matchAll(NUMBER)) {
    const before = text.slice(Math.max(0, m.index - 60), m.index).split(/[.!?\n]/u).pop();
    const words = (before.toLowerCase().match(/\p{L}+/gu) || []).slice(-3);
    if (!contexts.has(m[0])) contexts.set(m[0], []);
    contexts.get(m[0]).push(words);
  }
  return contexts;
}

function compareContexts(before, after) {
  const differences = [];
  const reviews = [];
  const left = numberContexts(before);
  const right = numberContexts(after);
  for (const [num, beforeWindows] of left) {
    const afterWindows = right.get(num);
    if (!afterWindows) continue; // a missing number is already reported as numberOrDate
    const beforeWords = new Set(beforeWindows.flat());
    const afterWords = new Set(afterWindows.flat());
    for (const word of beforeWords) {
      const opposite = OPPOSITE.get(word);
      if (opposite && !afterWords.has(word) && afterWords.has(opposite) && !beforeWords.has(opposite)) {
        differences.push({ kind: 'polarity', token: num, before: word, after: opposite });
      }
    }
    const lastBefore = multiset(beforeWindows.map((w) => w.at(-1) || ''));
    const lastAfter = multiset(afterWindows.map((w) => w.at(-1) || ''));
    const changed = [...new Set([...lastBefore.keys(), ...lastAfter.keys()])].some((k) => (lastBefore.get(k) || 0) !== (lastAfter.get(k) || 0));
    if (changed && !differences.some((d) => d.token === num)) {
      reviews.push({ token: num, before: beforeWindows.map((w) => w.join(' ')), after: afterWindows.map((w) => w.join(' ')) });
    }
  }
  return { differences, reviews };
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
  return { differences: [...differences, ...context.differences], reviews: context.reviews };
}
