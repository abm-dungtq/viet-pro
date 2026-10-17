// X (Twitter) weighted length per twitter-text config v3: code points in the ranges below weigh 1,
// everything else weighs 2, and every URL counts as 23. Text is NFC-normalized first.
// Emoji sequences joined by ZWJ may be over-counted slightly. Source:
// https://github.com/twitter/twitter-text/blob/master/config/v3.json
const WEIGHT_ONE = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
export const X_MAX = 280;
export function xWeightedLength(text) {
  let total = 0;
  const rest = text.normalize('NFC').replace(/https?:\/\/\S+/gu, () => { total += 23; return ''; });
  for (const ch of rest) {
    const cp = ch.codePointAt(0);
    total += WEIGHT_ONE.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
  }
  return total;
}
