// Pure-Node zero-dependency .pptx (OOXML) reader and Assertion-Evidence slide checker.
// Uses only node:fs, node:path, node:url, and node:zlib. Importing has no side effects.

import { readFileSync, realpathSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;
const MAX_ENTRY_BYTES = 32 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_ENTRIES = 4096;

const TITLE_PH_TYPES = new Set(['title', 'ctrTitle']);
const IGNORE_PH_TYPES = new Set(['sldNum', 'dt', 'ftr', 'hdr']);

const LABEL_TITLE_RE = /^(?:tổng quan|giới thiệu|bối cảnh|vấn đề|thực trạng|hiện trạng|thách thức|giải pháp|lợi ích|kết luận|tóm tắt|tóm lại|tổng kết|phân tích|đánh giá|tổng hợp|định hướng|tầm nhìn|mục tiêu|lộ trình|kế hoạch|ngân sách|chi phí|đội ngũ|nhân sự|agenda|mục lục|nội dung chính|bước tiếp theo|next steps|overview|introduction|background|challenges?|solutions?|benefits|conclusions?|summary|key takeaways|analysis)[?:.!]*$/iu;
const PREFIX_TITLE_RE = /^(?:(?:slide|trang|phần|mục|chương|bước)\s*\d+\s*[:.\-–—]\s*\S|[^:]{2,30}:\s+\S)/iu;
const COUNT_TITLE_RE = /(?:^|\s)(?:\d+|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s+(?:trụ cột|yếu tố|bước|giai đoạn|nguyên tắc|lý do|lợi ích|thách thức|giải pháp|chiến lược|điểm chính|điểm|mục tiêu|vấn đề|xu hướng|mũi nhọn|nhóm|cách|bài học)\b|\b(?:\d+|three|four|five)\s+(?:pillars|steps|reasons|keys|ways|lessons|principles)\b/iu;
const FRAMEWORK_RE = /\b(?:pyramid principle|minto|scqa|scr|mece|assertion[- ]evidence|action title|situation|complication|resolution)\b|(?:→|->).*(?:→|->)/iu;
const CLOSING_TITLE_RE = /^(?:cảm ơn|xin cảm ơn|thank you|thanks|q\s*&\s*a|hỏi\s*đáp)\b/iu;

function countWords(text) {
  return (String(text || '').trim().match(/[\p{L}\p{N}]+/gu) || []).length;
}

function isSafeZipName(name) {
  if (!name || name.startsWith('/') || name.includes('\\') || name.includes('\0')) return false;
  return !name.split('/').some((seg) => seg === '..');
}

function findEocdOffset(buf) {
  const minOffset = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      const commentLen = buf.readUInt16LE(i + 20);
      if (i + 22 + commentLen <= buf.length) return i;
    }
  }
  return -1;
}

/** Read OOXML ZIP entries into Map<entryPath, Buffer> using node:zlib only. */
export function readZipEntries(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buf.length < 22) {
    throw new Error('Tệp .pptx không hợp lệ (quá ngắn để là tệp ZIP)');
  }
  const eocdOff = findEocdOffset(buf);
  if (eocdOff < 0) {
    throw new Error('Không tìm thấy chữ ký ZIP EOCD trong tệp .pptx');
  }
  const entryCount = buf.readUInt16LE(eocdOff + 10);
  const cdSize = buf.readUInt32LE(eocdOff + 12);
  const cdOffset = buf.readUInt32LE(eocdOff + 16);
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new Error('Không hỗ trợ tệp .pptx định dạng ZIP64');
  }
  if (entryCount > MAX_ENTRIES || cdOffset + cdSize > buf.length) {
    throw new Error('Cấu trúc thư mục trung tâm ZIP của tệp .pptx không hợp lệ');
  }

  const entries = new Map();
  let cursor = cdOffset;
  let totalBytes = 0;

  for (let idx = 0; idx < entryCount; idx++) {
    if (cursor + 46 > buf.length || buf.readUInt32LE(cursor) !== CD_SIG) {
      throw new Error(`Header thư mục trung tâm ZIP hỏng tại mục ${idx}`);
    }
    const method = buf.readUInt16LE(cursor + 10);
    const compSize = buf.readUInt32LE(cursor + 20);
    const uncompSize = buf.readUInt32LE(cursor + 24);
    const nameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const lfhOffset = buf.readUInt32LE(cursor + 42);

    const nameEnd = cursor + 46 + nameLen;
    if (nameEnd > buf.length) throw new Error('Tên mục ZIP vượt quá kích thước tệp');
    const name = buf.toString('utf8', cursor + 46, nameEnd);
    cursor = nameEnd + extraLen + commentLen;

    if (name.endsWith('/')) continue;
    if (!isSafeZipName(name)) {
      throw new Error(`Tên tệp không an toàn trong .pptx: ${name}`);
    }
    if (uncompSize > MAX_ENTRY_BYTES || totalBytes + uncompSize > MAX_TOTAL_BYTES) {
      throw new Error(`Mục "${name}" vượt quá giới hạn giải nén an toàn (${MAX_TOTAL_BYTES} bytes)`);
    }
    if (lfhOffset + 30 > buf.length || buf.readUInt32LE(lfhOffset) !== LFH_SIG) {
      throw new Error(`Local File Header không hợp lệ cho "${name}"`);
    }
    const lfhNameLen = buf.readUInt16LE(lfhOffset + 26);
    const lfhExtraLen = buf.readUInt16LE(lfhOffset + 28);
    const dataStart = lfhOffset + 30 + lfhNameLen + lfhExtraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) {
      throw new Error(`Dữ liệu nén bị cắt cụt cho "${name}"`);
    }

    const slice = buf.subarray(dataStart, dataEnd);
    let data;
    if (method === 0) {
      data = Buffer.from(slice);
    } else if (method === 8) {
      data = inflateRawSync(slice, { maxOutputLength: MAX_ENTRY_BYTES });
    } else {
      throw new Error(`Phương thức nén ZIP (${method}) không được hỗ trợ cho "${name}"`);
    }
    totalBytes += data.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('Tổng kích thước giải nén của tệp .pptx vượt quá giới hạn an toàn');
    }
    entries.set(name, data);
  }
  return entries;
}

function decodeXmlEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/giu, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&amp;/gu, '&');
}

function parseAttrs(tagText) {
  const attrs = {};
  for (const m of tagText.matchAll(/([A-Za-z0-9_:-]+)\s*=\s*"([^"]*)"/gu)) {
    attrs[m[1]] = decodeXmlEntities(m[2]);
  }
  return attrs;
}

function normalizeZipRelTarget(partPath, target) {
  if (!target) return '';
  const cleaned = target.replace(/\\/gu, '/');
  if (cleaned.startsWith('/')) return posix.normalize(cleaned).replace(/^\/+/u, '');
  const baseDir = posix.dirname(partPath);
  const resolved = baseDir === '.' ? posix.normalize(cleaned) : posix.normalize(posix.join(baseDir, cleaned));
  return resolved.startsWith('..') ? '' : resolved;
}

function readRels(entries, partPath) {
  const dir = posix.dirname(partPath);
  const base = posix.basename(partPath);
  const relsPath = dir === '.' ? `_rels/${base}.rels` : `${dir}/_rels/${base}.rels`;
  const buf = entries.get(relsPath);
  if (!buf) return new Map();
  const xml = buf.toString('utf8');
  const out = new Map();
  for (const m of xml.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?>/gu)) {
    const attrs = parseAttrs(m[1]);
    if (attrs.TargetMode === 'External' || !attrs.Id || !attrs.Target) continue;
    const norm = normalizeZipRelTarget(partPath, attrs.Target);
    if (norm && isSafeZipName(norm)) {
      out.set(attrs.Id, { target: norm, type: attrs.Type || '' });
    }
  }
  return out;
}

function extractParagraphs(xmlBlock) {
  const paras = [];
  for (const pMatch of xmlBlock.matchAll(/<(?:\w+:)?p(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?p>/gu)) {
    const inner = pMatch[1].replace(/<(?:\w+:)?br\b[^>]*\/>/gu, ' ');
    const chunks = [];
    for (const tMatch of inner.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/gu)) {
      chunks.push(decodeXmlEntities(tMatch[1]));
    }
    const text = chunks.join('').replace(/\s+/gu, ' ').trim();
    if (text) paras.push(text);
  }
  return paras;
}

function getPlaceholderType(shapeXml) {
  const phMatch = shapeXml.match(/<(?:\w+:)?ph\b([^>]*)\/?>/u);
  if (!phMatch) return null;
  const attrs = parseAttrs(phMatch[1]);
  return attrs.type || 'body';
}

function extractTagBlocks(xml, localName) {
  const blocks = [];
  const openRe = new RegExp(`<(?:\\w+:)?${localName}(?:\\s[^>]*)?>`, 'gu');
  const closeRe = new RegExp(`<\\/(?:\\w+:)?${localName}>`, 'gu');
  let searchFrom = 0;
  while (searchFrom < xml.length) {
    openRe.lastIndex = searchFrom;
    const open = openRe.exec(xml);
    if (!open) break;
    if (open[0].endsWith('/>')) {
      searchFrom = open.index + open[0].length;
      continue;
    }
    closeRe.lastIndex = open.index + open[0].length;
    const close = closeRe.exec(xml);
    if (!close) break;
    blocks.push(xml.slice(open.index, close.index + close[0].length));
    searchFrom = close.index + close[0].length;
  }
  return blocks;
}

function extractTables(graphicFrameXml) {
  const rows = [];
  for (const rowXml of extractTagBlocks(graphicFrameXml, 'tr')) {
    const cells = [];
    for (const cellXml of extractTagBlocks(rowXml, 'tc')) {
      const cellText = extractParagraphs(cellXml).join(' ').trim();
      if (cellText) cells.push(cellText);
    }
    if (cells.length) rows.push(cells.join(' | '));
  }
  return rows;
}

function resolveSlideOrder(entries) {
  const presPath = 'ppt/presentation.xml';
  const presBuf = entries.get(presPath);
  if (presBuf) {
    const rels = readRels(entries, presPath);
    const presXml = presBuf.toString('utf8');
    const ordered = [];
    for (const m of presXml.matchAll(/<(?:\w+:)?sldId\b([^>]*)\/?>/gu)) {
      const attrs = parseAttrs(m[1]);
      const rid = attrs['r:id'] || attrs.id;
      const rel = rid ? rels.get(rid) : null;
      if (rel && entries.has(rel.target)) ordered.push(rel.target);
    }
    if (ordered.length) return ordered;
  }
  return [...entries.keys()]
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/u.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/u)[1]) - Number(b.match(/(\d+)\.xml$/u)[1]));
}

/** Read a .pptx buffer or file path into structured slides. */
export function readPptx(input) {
  const buf = Buffer.isBuffer(input) ? input : readFileSync(String(input));
  const entries = readZipEntries(buf);
  const slideParts = resolveSlideOrder(entries);
  if (!slideParts.length) {
    throw new Error('Không tìm thấy slide nào trong tệp .pptx');
  }

  return slideParts.map((partPath, idx) => {
    const xml = entries.get(partPath).toString('utf8');
    const sldTag = xml.match(/<(?:\w+:)?sld\b([^>]*)>/u);
    const sldAttrs = sldTag ? parseAttrs(sldTag[1]) : {};
    const hidden = sldAttrs.show === '0' || sldAttrs.show === 'false';

    let title = '';
    const body = [];
    for (const shapeXml of extractTagBlocks(xml, 'sp')) {
      const phType = getPlaceholderType(shapeXml);
      if (phType && IGNORE_PH_TYPES.has(phType)) continue;
      const txBody = shapeXml.match(/<(?:\w+:)?txBody(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?txBody>/u);
      if (!txBody) continue;
      const paras = extractParagraphs(txBody[1]);
      if (!paras.length) continue;
      if (phType && TITLE_PH_TYPES.has(phType) && !title) {
        title = paras.join(' ');
      } else {
        body.push(...paras);
      }
    }

    const table = [];
    for (const frameXml of extractTagBlocks(xml, 'graphicFrame')) {
      const rows = extractTables(frameXml);
      if (rows.length) table.push(...rows);
      else table.push(...extractParagraphs(frameXml));
    }

    const notes = [];
    for (const rel of readRels(entries, partPath).values()) {
      if (!rel.type.endsWith('/notesSlide')) continue;
      const notesBuf = entries.get(rel.target);
      if (!notesBuf) continue;
      const notesXml = notesBuf.toString('utf8');
      for (const shapeXml of extractTagBlocks(notesXml, 'sp')) {
        if (getPlaceholderType(shapeXml) !== 'body') continue;
        const txBody = shapeXml.match(/<(?:\w+:)?txBody(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?txBody>/u);
        if (txBody) notes.push(...extractParagraphs(txBody[1]));
      }
    }

    return { no: idx + 1, title, body, table, notes, hidden };
  });
}

/** Flatten visible slides into text and 1-based line metadata index. */
export function pptxToText(slides) {
  const lines = [];
  const index = [];
  const lineMap = new Map();

  for (const slide of slides) {
    if (slide.hidden) continue;
    const parts = [];
    if (slide.title) parts.push(['tiêu đề', slide.title]);
    for (const b of slide.body) parts.push(['thân', b]);
    for (const t of slide.table) parts.push(['bảng', t]);
    for (const n of slide.notes) parts.push(['ghi chú', n]);
    for (const [part, text] of parts) {
      lines.push(text);
      const entry = { line: lines.length, slide: slide.no, part, text };
      index.push(entry);
      lineMap.set(lines.length, entry);
    }
    lines.push('');
  }
  return { text: lines.join('\n'), index, lineMap };
}

/** Map 1-based text line numbers to human-readable slide location labels. */
export function pptxLineLabels(index) {
  const out = {};
  for (const entry of index || []) {
    out[entry.line] = `slide ${entry.slide}, ${entry.part}`;
  }
  return out;
}

/** Format structured slide text for `--text` diagnostic view. */
export function formatPptxText(slides) {
  return slides.map((s) => {
    const out = [`=== Slide ${s.no}${s.hidden ? ' (ẩn)' : ''}`, `Tiêu đề: ${s.title || '(không có)'}`];
    for (const [label, items] of [['Nội dung', s.body], ['Bảng', s.table], ['Ghi chú', s.notes]]) {
      if (!items.length) continue;
      out.push(`${label}:`);
      for (const item of items) out.push(`  - ${item}`);
    }
    return out.join('\n');
  }).join('\n\n');
}

/** Run Assertion-Evidence slide deck checks across visible slides. */
export function checkSlideDeck(slides, index = []) {
  const findings = [];
  const visible = slides.filter((s) => !s.hidden);
  if (!visible.length) return findings;

  const lineBySlidePart = new Map();
  const firstLineBySlide = new Map();
  for (const item of index) {
    const key = `${item.slide}:${item.part}`;
    if (!lineBySlidePart.has(key)) lineBySlidePart.set(key, []);
    lineBySlidePart.get(key).push(item.line);
    if (!firstLineBySlide.has(item.slide)) firstLineBySlide.set(item.slide, item.line);
  }
  const lineFor = (slideNo, part, occ = 0) =>
    lineBySlidePart.get(`${slideNo}:${part}`)?.[occ] ?? firstLineBySlide.get(slideNo) ?? 1;

  const pushFinding = (id, groupVi, weight, slideNo, part, excerpt, detail, occ = 0) => {
    const line = lineFor(slideNo, part, occ);
    findings.push({
      id,
      groupVi,
      level: 'WARN',
      weight,
      line,
      slide: slideNo,
      part,
      location: `slide ${slideNo}, ${part}`,
      excerpt: String(excerpt || '').slice(0, 120),
      detail,
    });
  };

  const contentSlides = visible.filter((s, pos) => (pos > 0 || visible.length === 1) && !CLOSING_TITLE_RE.test(s.title.trim()));

  for (const s of contentSlides) {
    const rawTitle = s.title.trim();
    const lowTitle = rawTitle.toLowerCase();
    const titleWords = countWords(rawTitle);

    if (rawTitle && !/\d/u.test(rawTitle)) {
      if ((titleWords <= 5 && LABEL_TITLE_RE.test(lowTitle))
        || (titleWords <= 6 && /^(?:về|một số)\s+/iu.test(lowTitle) && !/\b(?:giúp|tăng|giảm|đạt|tạo|khiến|làm|cho thấy|chỉ ra)\b/iu.test(lowTitle))) {
        pushFinding('slide-label-title', 'tiêu đề slide kiểu nhãn', 3, s.no, 'tiêu đề', rawTitle, 'Đặt tiêu đề là câu nhận định (Action Title), không dùng nhãn danh từ rỗng');
      }
    }
    if (PREFIX_TITLE_RE.test(rawTitle)) {
      pushFinding('slide-prefix-title', 'tiêu đề slide có nhãn thừa', 3, s.no, 'tiêu đề', rawTitle, 'Bỏ nhãn "Slide/Phần X:" hoặc tiền tố danh mục trước tiêu đề');
    }
    if (COUNT_TITLE_RE.test(rawTitle)) {
      pushFinding('slide-count-title', 'tiêu đề slide đếm số sáo', 3, s.no, 'tiêu đề', rawTitle, 'Thay "N trụ cột/yếu tố/bước" bằng nhận định cụ thể');
    }
    const fwMatch = rawTitle.match(FRAMEWORK_RE) || s.body.join(' ').match(FRAMEWORK_RE);
    if (fwMatch) {
      pushFinding('slide-framework-leak', 'lộ tên khung trên slide', 3, s.no, 'tiêu đề', fwMatch[0], 'Không để lộ tên mô hình lập luận (SCQA/Minto/MECE) lên mặt slide');
    }

    const slideWords = countWords(rawTitle) + s.body.reduce((acc, b) => acc + countWords(b), 0);
    if (slideWords > 55) {
      pushFinding('slide-wordy', 'slide quá nhiều chữ', 2, s.no, 'thân', `${slideWords} chữ (>55)`, 'Mặt slide vượt ngưỡng đọc lướt (55 chữ ở tiêu đề + thân); dồn giải thích xuống ghi chú');
    }

    s.body.forEach((b, bIdx) => {
      const wc = countWords(b);
      const multiSent = /[.!?…]\s+\p{Lu}/u.test(b);
      const boldPrefix = /^\*\*[^*\n]{2,35}[:：]\*\*/u.test(b);
      if (wc > 20 || multiSent || boldPrefix) {
        pushFinding('slide-long-bullet', 'ý trên slide quá dài', 2, s.no, 'thân', b, 'Mỗi ý trên slide nên gói gọn một cụm 6-14 chữ, không chẻ nhiều câu hay gắn nhãn đậm', bIdx);
      }
    });
  }

  for (const s of visible) {
    s.notes.forEach((note, nIdx) => {
      const sents = note.split(/(?<=[.!?])\s+/u).map((x) => x.trim()).filter(Boolean);
      const longSent = sents.find((sent) => countWords(sent) > 32);
      if (longSent) {
        pushFinding('slide-notes-long-sentence', 'ghi chú nói câu quá dài', 2, s.no, 'ghi chú', longSent, 'Câu trong Speaker Notes >32 chữ khó đọc trôi chảy khi thuyết trình', nIdx);
      }
      if (/\([^)\n]{2,}\)/u.test(note)) {
        pushFinding('slide-notes-parens', 'ngoặc đơn trong ghi chú nói', 2, s.no, 'ghi chú', note, 'Chú thích trong ngoặc đơn gây vấp nhịp nói; tách thành câu hoặc bỏ', nIdx);
      }
    });
  }

  const bulletCounts = contentSlides.map((s) => s.body.length).filter((c) => c >= 2);
  let sameCountAlert = false;
  if (bulletCounts.length >= 4) {
    const freq = new Map();
    for (const c of bulletCounts) freq.set(c, (freq.get(c) || 0) + 1);
    const [topCount, hits] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if ((topCount === 3 || topCount === 4) && hits / bulletCounts.length >= 0.75) {
      sameCountAlert = true;
      pushFinding('slide-uniform-bullets', 'độ dài ý đều nhau trên nhiều slide', 2, contentSlides[0].no, 'thân', `${hits}/${bulletCounts.length} slide có đúng ${topCount} ý`, 'Nhịp trình bày rập khuôn số lượng gạch đầu dòng giống AI');
    }
  }
  if (!sameCountAlert) {
    const uniformLenSlides = contentSlides.filter((s) => {
      if (s.body.length < 3) return false;
      const lens = s.body.map(countWords);
      return Math.min(...lens) >= 4 && Math.max(...lens) <= 16 && (Math.max(...lens) - Math.min(...lens)) <= 4;
    });
    if (uniformLenSlides.length >= 3) {
      pushFinding('slide-uniform-bullets', 'độ dài ý đều nhau trên nhiều slide', 2, uniformLenSlides[0].no, 'thân', `${uniformLenSlides.length} slide có mọi ý dài đều 4-16 chữ`, 'Độ dài các ý trên nhiều slide đồng đều máy móc');
    }
  }

  const openingPairs = contentSlides
    .map((s) => ({
      no: s.no,
      tokens: (s.title.toLowerCase().trim().match(/[\p{L}\p{N}]+/gu) || []),
      hasColon: /^[^:\n]{2,35}:\s+\S/u.test(s.title.trim()),
    }))
    .filter((x) => x.tokens.length >= 2);

  let repHit = false;
  for (let i = 0; i + 2 < openingPairs.length; i++) {
    const a = openingPairs[i].tokens.slice(0, 2).join(' ');
    const b = openingPairs[i + 1].tokens.slice(0, 2).join(' ');
    const c = openingPairs[i + 2].tokens.slice(0, 2).join(' ');
    if (a === b && b === c) {
      repHit = true;
      pushFinding('slide-repetitive-titles', 'tiêu đề các slide cùng khuôn', 2, openingPairs[i].no, 'tiêu đề', a, 'Ba slide liên tiếp mở tiêu đề bằng cùng một cặp chữ');
      break;
    }
  }
  if (!repHit) {
    const colonSlides = openingPairs.filter((x) => x.hasColon);
    if (colonSlides.length >= 3) {
      pushFinding('slide-repetitive-titles', 'tiêu đề các slide cùng khuôn', 2, colonSlides[0].no, 'tiêu đề', `${colonSlides.length} slide theo mẫu "Nhãn: ..."`, 'Nhiều tiêu đề slide lặp cùng khuôn dấu hai chấm');
    }
  }

  return findings;
}

// --- Pure-Node minimal PKZIP writer + self-test (no external files required) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files, { compress = true } = {}) {
  const locals = [];
  const cds = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const method = compress ? 8 : 0;
    const payload = compress ? deflateRawSync(raw) : raw;
    const crc = crc32(raw);

    const lfh = Buffer.alloc(30 + nameBuf.length);
    lfh.writeUInt32LE(LFH_SIG, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0, 6);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(payload.length, 18);
    lfh.writeUInt32LE(raw.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(lfh, 30);
    locals.push(lfh, payload);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(CD_SIG, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    nameBuf.copy(cd, 46);
    cds.push(cd);

    offset += lfh.length + payload.length;
  }
  const cdBuf = Buffer.concat(cds);
  const count = Object.keys(files).length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(count, 8);
  eocd.writeUInt16LE(count, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cdBuf, eocd]);
}

function escapeXml(s) {
  return s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
}

function makeSlideXml({ title = '', body = [], table = [], hidden = false } = {}) {
  const p = (t) => `<a:p><a:r><a:t>${escapeXml(t)}</a:t></a:r></a:p>`;
  const shapes = [];
  if (title) {
    shapes.push(`<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody>${p(title)}</p:txBody></p:sp>`);
  }
  if (body.length) {
    shapes.push(`<p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody>${body.map(p).join('')}</p:txBody></p:sp>`);
  }
  const tbl = table.length
    ? `<p:graphicFrame><a:tbl>${table.map((row) => `<a:tr>${row.map((c) => `<a:tc><a:txBody>${p(c)}</a:txBody></a:tc>`).join('')}</a:tr>`).join('')}</a:tbl></p:graphicFrame>`
    : '';
  return `<p:sld${hidden ? ' show="0"' : ''}><p:cSld><p:spTree>${shapes.join('')}${tbl}</p:spTree></p:cSld></p:sld>`;
}

function makeNotesXml(notes = []) {
  const p = (t) => `<a:p><a:r><a:t>${escapeXml(t)}</a:t></a:r></a:p>`;
  return `<p:notes><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody>${notes.map(p).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:notes>`;
}

/** Build a valid synthetic .pptx Buffer for deterministic self-tests. */
export function buildTestPptxBuffer(slidesSpec, { compress = true } = {}) {
  const files = {};
  const sldIds = [];
  const presRels = [];
  slidesSpec.forEach((spec, i) => {
    const idx = i + 1;
    const rid = `rId${idx}`;
    sldIds.push(`<p:sldId id="${255 + idx}" r:id="${rid}"/>`);
    presRels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx}.xml"/>`);
    files[`ppt/slides/slide${idx}.xml`] = makeSlideXml(spec);
    if (spec.notes?.length) {
      files[`ppt/notesSlides/notesSlide${idx}.xml`] = makeNotesXml(spec.notes);
      files[`ppt/slides/_rels/slide${idx}.xml.rels`] = `<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${idx}.xml"/></Relationships>`;
    }
  });
  files['ppt/presentation.xml'] = `<p:presentation><p:sldIdLst>${sldIds.join('')}</p:sldIdLst></p:presentation>`;
  files['ppt/_rels/presentation.xml.rels'] = `<Relationships>${presRels.join('')}</Relationships>`;
  return buildZip(files, { compress });
}

export function selfTest() {
  const fail = (msg) => { throw new Error(`SELF-TEST FAIL — ${msg}`); };
  const dirtyDeck = [
    { title: 'Kế hoạch Q4', body: ['Ban điều hành'] },
    { title: 'Tổng quan', body: ['Ý một rất ngắn gọn', 'Ý hai rất ngắn gọn', 'Ý ba rất ngắn gọn'], notes: ['Đây là một câu ghi chú người nói dài hơn mức cho phép để kiểm thử khả năng cảnh báo câu quá ba mươi hai chữ của mô đun trình bày mới (kèm ngoặc đơn).'] },
    { title: 'Slide 2: Thực trạng', body: ['Ý bốn rất ngắn gọn', 'Ý năm rất ngắn gọn', 'Ý sáu rất ngắn gọn'] },
    { title: '3 trụ cột tăng trưởng', body: ['Ý bảy rất ngắn gọn', 'Ý tám rất ngắn gọn', 'Ý chín rất ngắn gọn'] },
    { title: 'Phân tích mở rộng', body: ['Cách A: chi tiết một câu dài có nhiều chữ hơn hai mươi chữ để kiểm tra giới hạn từng gạch đầu dòng trên trang chiếu. Hai câu ở đây.'] },
    { title: 'Giải pháp SCQA → MECE', body: Array(10).fill('Đây là một dòng chữ dài vừa đủ sáu từ để đẩy tổng chữ trang chiếu vượt năm mươi lăm chữ.'), table: [['KPI', '99%']] },
    { title: 'Slide ẩn không quét', body: ['Tổng quan'], hidden: true },
  ];

  for (const compress of [true, false]) {
    const buf = buildTestPptxBuffer(dirtyDeck, { compress });
    const slides = readPptx(buf);
    if (slides.length !== 7 || !slides[6].hidden || slides[5].table[0] !== 'KPI | 99%') {
      fail(`readPptx sai (compress=${compress}): ${JSON.stringify(slides)}`);
    }
    const { text, index } = pptxToText(slides);
    if (text.includes('Slide ẩn không quét')) fail('pptxToText không bỏ slide ẩn');
    const lbls = pptxLineLabels(index);
    if (!Object.values(lbls).some((v) => v === 'slide 2, ghi chú')) fail('pptxLineLabels thiếu "slide 2, ghi chú"');

    const hits = new Set(checkSlideDeck(slides, index).map((f) => f.id));
    for (const req of ['slide-label-title', 'slide-prefix-title', 'slide-count-title', 'slide-framework-leak', 'slide-wordy', 'slide-long-bullet', 'slide-notes-long-sentence', 'slide-notes-parens', 'slide-uniform-bullets']) {
      if (!hits.has(req)) fail(`thiếu kiểm tra slide ${req} (compress=${compress})`);
    }
  }

  const repBuf = buildTestPptxBuffer([
    { title: 'Giới thiệu', body: ['Bìa'] },
    { title: 'Cách tiếp cận phần một', body: ['Một', 'Hai'] },
    { title: 'Cách tiếp cận phần hai', body: ['Ba', 'Bốn', 'Năm'] },
    { title: 'Cách tiếp cận phần ba', body: ['Sáu'] },
  ]);
  const repSlides = readPptx(repBuf);
  if (!checkSlideDeck(repSlides, pptxToText(repSlides).index).some((f) => f.id === 'slide-repetitive-titles')) {
    fail('không bắt slide-repetitive-titles');
  }

  const cleanBuf = buildTestPptxBuffer([
    { title: 'Chi phí vận hành quý 3 giảm 14%', body: ['Bìa'] },
    { title: 'Đóng gói tự động cắt 4 giờ chờ mỗi ngày', body: ['Giảm thao tác tay còn 15 phút', 'Tỷ lệ lỗi đơn hạ xuống 0,4%'], notes: ['Đội kho thử nghiệm dây chuyền mới trong bốn tuần trước khi nhân rộng.'] },
  ]);
  const cleanSlides = readPptx(cleanBuf);
  const cleanFindings = checkSlideDeck(cleanSlides, pptxToText(cleanSlides).index);
  if (cleanFindings.length) fail(`false positive trên slide sạch: ${JSON.stringify(cleanFindings)}`);

  console.log('SELF-TEST PASS — pptx.mjs PKZIP (Store+Deflate), hidden skip, table, notes, 10 kiểm tra slide Assertion-Evidence');
  return 0;
}

const isEntry = process.argv[1]
  && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry && process.argv.includes('--self-test')) {
  process.exit(selfTest());
}
