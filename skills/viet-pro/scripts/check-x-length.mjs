#!/usr/bin/env node
// Weighted length check for an X (Twitter) thread.
// Usage: node check-x-length.mjs <thread.md> | --self-test
// Tweets are separated by lines that are exactly `---`; without such lines, by blank lines.
// Exit 1 if any tweet is over the limit.

import { readFileSync } from 'node:fs';
import { xWeightedLength, X_MAX } from './lib/x-weighted.mjs';

function splitTweets(text) {
  let lines = text.split('\n');
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    lines = end === -1 ? [] : lines.slice(end + 1);
  }
  const body = lines.join('\n');
  const blocks = /^[ \t]*---[ \t]*$/mu.test(body) ? body.split(/^[ \t]*---[ \t]*$/mu) : body.split(/\n\s*\n/u);
  return blocks.map((b) => b.trim()).filter(Boolean);
}

function selfTest() {
  const cases = [
    ['Mỗi ngày học mười phút với LexiGo.', 38],
    ['Tiếng Việt có dấu kép như ế, ộ, ạ bị đếm là hai.', 56],
    ['abc https://example.com/very/long/path xyz', 31],
    ['ế'.repeat(141), 282],
  ];
  for (const [text, want] of cases) {
    const got = xWeightedLength(text);
    if (got !== want) { console.error(`SELF-TEST FAIL — ${JSON.stringify(text.slice(0, 40))}: ${got} thay vì ${want}`); process.exit(1); }
  }
  console.log('SELF-TEST PASS — đếm có trọng số theo twitter-text v3');
  process.exit(0);
}

const args = process.argv.slice(2);
if (args[0] === '--self-test') selfTest();
if (args.length !== 1) { console.error('Usage: node check-x-length.mjs <thread.md> | --self-test'); process.exit(2); }

const tweets = splitTweets(readFileSync(args[0], 'utf8'));
if (!tweets.length) { console.error('KHÔNG CÓ TWEET — file rỗng hoặc frontmatter chưa đóng'); process.exit(1); }
let over = false;
tweets.forEach((tweet, i) => {
  const n = xWeightedLength(tweet);
  const ok = n <= X_MAX;
  if (!ok) over = true;
  console.log(`TWEET ${i + 1}: ${n}/${X_MAX} ${ok ? 'OK' : 'VƯỢT'}`);
});
process.exit(over ? 1 : 0);
