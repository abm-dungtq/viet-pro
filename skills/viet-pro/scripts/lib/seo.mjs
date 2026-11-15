// Deterministic On-Page SEO & GEO checks for viet-pro `blog-seo` profile.
// Pure functions, zero external dependencies. Supports `node seo.mjs --self-test`.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GRAPHEME_SEG = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const defaultCountWords = (s) => (String(s || '').normalize('NFC').match(/[\p{L}\p{N}]+/gu) || []).length;
const graphemeLen = (s) => [...GRAPHEME_SEG.segment(String(s || '').normalize('NFC'))].length;

const RESERVED_SECTIONS = new Set(['title', 'description', 'caption', 'body']);
const MIN_WORDS_BY_SURFACE = Object.freeze({ article: 600, pillar: 1500, comparison: 800 });

const STAGED_H2_OPENER = /^(?:Trong (?:bối cảnh|thời đại|kỷ nguyên)|Hiện nay,?\s+việc|Như chúng ta đã biết)(?![\p{L}\p{M}\p{N}])/iu;
const QUESTION_H2_START = /^(?:Tại sao|Vì sao|Làm sao|Làm thế nào|Khi nào|Bao nhiêu|Có nên)(?![\p{L}\p{M}\p{N}])/iu;
const HEDGED_QUESTION_OPEN = /^(?:Trước khi trả lời|Để hiểu rõ|Đây là một câu hỏi)(?![\p{L}\p{M}\p{N}])/iu;
const STAT_CLAIM_RE = /(?:\d+(?:[.,]\d+)?\s?%|gấp\s+(?:\d+|hai|ba|bốn|năm|mười)\s+lần)/iu;
const SOURCE_CUE_RE = /\]\(https?:\/\/|https?:\/\/|\[\d+\]|(?<![\p{L}\p{M}\p{N}])(?:theo\s+\p{Lu}|nguồn:|báo cáo (?:của|từ)|khảo sát (?:của|từ)|thống kê (?:của|từ)|dữ liệu (?:từ|của))(?![\p{L}\p{M}\p{N}])/iu;
const ILLUSTRATIVE_RE = /(?<![\p{L}\p{M}\p{N}])(?:ví dụ|giả sử|quán mẫu|mô phỏng|chẳng hạn|minh họa|nội bộ|của chúng tôi|của quán|của cửa hàng|khách hàng của)(?![\p{L}\p{M}\p{N}])/iu;
const BRACKET_SEO_RE = /\[(?:liên kết|ảnh):[^\]\n]+\]/giu;
const MD_TABLE_RE = /^\s*\|.+\|\s*\n\s*\|(?:\s*:?-+:?\s*\|)+/mu;

const firstNonEmpty = (...vals) => vals.find((v) => typeof v === 'string' && v.trim())?.trim() || '';

export function extractFirstH1(unfencedBody) {
  const m = String(unfencedBody || '').match(/^#[ \t]+([^\n]+)$/mu);
  return m ? m[1].trim() : '';
}

function collectH2Sections(unfenced) {
  const sections = [];
  for (const m of unfenced.matchAll(/^##[ \t]+([^\n]+)\n+([^\n#][^\n]*(?:\n(?![ \t]*\n|#)[^\n]*)*)/gmu)) {
    const h2Title = m[1].trim();
    if (RESERVED_SECTIONS.has(h2Title.toLowerCase())) continue;
    sections.push({ title: h2Title, firstPara: m[2].trim() });
  }
  return sections;
}

function checkHeadingsAndSlug(unfenced, { effectiveTitle, effectiveDescription, slug }, findings) {
  const headings = [...unfenced.matchAll(/^(#{1,6})[ \t]+([^\n]+)$/gmu)]
    .map((m) => ({ level: m[1].length, text: m[2].trim() }))
    .filter((h) => !(h.level === 2 && RESERVED_SECTIONS.has(h.text.toLowerCase())));
  const h1s = headings.filter((h) => h.level === 1);

  if (h1s.length > 1) {
    findings.push({
      level: 'ERROR',
      field: 'seo-multiple-h1',
      detail: `tìm thấy ${h1s.length} thẻ H1 (# ...); chỉ được dùng tối đa 1 H1`,
    });
  } else if (h1s.length === 0 && !effectiveTitle) {
    findings.push({
      level: 'WARN',
      field: 'seo-missing-h1',
      detail: 'thiếu tiêu đề H1 (# ...) hoặc khối "## title" để kiểm tra On-Page SEO',
    });
  }

  if (effectiveDescription) {
    const descLen = graphemeLen(effectiveDescription);
    if (descLen > 0 && descLen < 70) {
      findings.push({
        level: 'WARN',
        field: 'seo-meta-description-short',
        detail: `meta description dài ${descLen} ký tự (<70); nên viết 120-155 ký tự rõ giá trị`,
      });
    }
  }

  if (slug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
      findings.push({
        level: 'ERROR',
        field: 'seo-slug-format',
        detail: `slug "${slug}" phải viết thường không dấu, chỉ gồm a-z, 0-9 và dấu gạch ngang (-)`,
      });
    } else if (slug.length > 75) {
      findings.push({
        level: 'WARN',
        field: 'seo-slug-length',
        detail: `slug dài ${slug.length}/75 ký tự; nên rút gọn chỉ giữ từ khóa chính`,
      });
    }
  }

  let prevLevel = h1s.length ? 1 : 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level - prevLevel > 1) {
      findings.push({
        level: 'WARN',
        field: 'seo-heading-skip',
        detail: `nhảy cấp heading từ H${prevLevel} sang H${h.level} tại "${h.text.slice(0, 45)}"`,
      });
      break;
    }
    prevLevel = h.level;
  }

  return headings.filter((h) => h.level === 2).length;
}

function checkKeywordSignals(unfenced, { keyword, effectiveTitle, h1Text, bodyWords }, wordCounter, findings) {
  if (!keyword) return;
  const escaped = keyword.normalize('NFC').replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/\s+/gu, '\\s+');
  const kwRe = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escaped}(?![\\p{L}\\p{M}\\p{N}])`, 'giu');

  const titleSurface = `${effectiveTitle}\n${h1Text}`.trim();
  if (!titleSurface || !new RegExp(kwRe.source, kwRe.flags).test(titleSurface)) {
    findings.push({
      level: 'WARN',
      field: 'seo-keyword-missing-title',
      detail: `từ khóa chính "${keyword}" chưa có trong H1 hoặc meta title`,
    });
  }

  const introWords = (unfenced.replace(/^#[^\n]*$/gmu, '').normalize('NFC').match(/[\p{L}\p{N}]+/gu) || []).slice(0, 150).join(' ');
  if (!new RegExp(kwRe.source, kwRe.flags).test(introWords)) {
    findings.push({
      level: 'WARN',
      field: 'seo-keyword-missing-intro',
      detail: `từ khóa chính "${keyword}" chưa xuất hiện trong 150 chữ đầu bài`,
    });
  }

  const occ = [...unfenced.normalize('NFC').matchAll(kwRe)].length;
  const kwWords = wordCounter(keyword) || 1;
  const density = bodyWords ? (occ * kwWords) / bodyWords : 0;
  if (bodyWords >= 100 && occ >= 5 && density > 0.035) {
    findings.push({
      level: 'WARN',
      field: 'seo-keyword-stuffing',
      detail: `mật độ từ khóa "${keyword}" cao (${(density * 100).toFixed(1)}%, ${occ} lần / ${bodyWords} chữ > 3.5%)`,
    });
  }
}

export function checkSeoGeoDraft(fields = {}, { surface = 'article', countText, meta = {} } = {}) {
  const wordCounter = typeof countText === 'function' ? (s) => countText(s, 'words') : defaultCountWords;
  const rawBody = fields.body ?? fields.caption ?? '';
  const unfenced = rawBody.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gmu, '');
  const h1Text = extractFirstH1(unfenced);
  const effectiveTitle = firstNonEmpty(meta.title, fields.title?.split('\n').map((s) => s.trim()).find(Boolean), h1Text);
  const effectiveDescription = firstNonEmpty(meta.description, fields.description);
  const slug = firstNonEmpty(meta.slug);
  const keyword = firstNonEmpty(meta.keyword);

  const findings = [];
  const measured = [];
  const h2Count = checkHeadingsAndSlug(unfenced, { effectiveTitle, effectiveDescription, slug }, findings);

  const bodyWords = wordCounter(unfenced);
  const minWords = MIN_WORDS_BY_SURFACE[surface] || MIN_WORDS_BY_SURFACE.article;
  measured.push({ field: 'min_words', value: bodyWords, limit: minWords });
  if (bodyWords < minWords) {
    findings.push({
      level: 'WARN',
      field: 'seo-thin-content',
      detail: `${bodyWords}/${minWords} chữ (mức khuyến nghị tối thiểu cho ${surface})`,
    });
  }

  checkKeywordSignals(unfenced, { keyword, effectiveTitle, h1Text, bodyWords }, wordCounter, findings);

  for (const sec of collectH2Sections(unfenced)) {
    const words = wordCounter(sec.firstPara);
    const staged = STAGED_H2_OPENER.test(sec.firstPara);
    if (words > 90 || staged) {
      findings.push({
        level: 'WARN',
        field: 'seo-h2-wall',
        detail: `đoạn mở đầu ngay sau "## ${sec.title.slice(0, 40)}" ${staged ? 'mở bài vòng vo' : `dài ${words} chữ (>90)`}; hãy trả lời trực diện (Answer-First) trong 40-60 chữ đầu`,
      });
    }
    if (/\?$/u.test(sec.title) || QUESTION_H2_START.test(sec.title)) {
      const firstSentence = (sec.firstPara.split(/(?<=[.!?])\s+/u)[0] || sec.firstPara).trim();
      if (wordCounter(firstSentence) > 45 || HEDGED_QUESTION_OPEN.test(firstSentence)) {
        findings.push({
          level: 'WARN',
          field: 'geo-question-h2-no-direct-answer',
          detail: `heading dạng câu hỏi "## ${sec.title.slice(0, 40)}" chưa trả lời thẳng ngay câu đầu`,
        });
      }
    }
  }

  if (surface === 'comparison' && !MD_TABLE_RE.test(unfenced)) {
    findings.push({
      level: 'WARN',
      field: 'geo-comparison-missing-table',
      detail: 'bài comparison nên có bảng so sánh Markdown (| ... |) rõ tiêu chí cho AI trích dẫn',
    });
  }
  if (surface === 'pillar' && h2Count < 4) {
    findings.push({
      level: 'WARN',
      field: 'geo-pillar-low-structure',
      detail: `bài pillar mới có ${h2Count} mục H2 (<4); nên chia cấu trúc rõ để bao phủ trọn chủ đề`,
    });
  }

  const proseSentences = unfenced.split(/(?<=[.!?])\s+|\n+/u).map((s) => s.trim()).filter((s) => s && !s.startsWith('#') && !s.startsWith('|'));
  let uncitedStats = 0;
  for (let i = 0; i < proseSentences.length; i++) {
    const cur = proseSentences[i];
    if (!STAT_CLAIM_RE.test(cur) || ILLUSTRATIVE_RE.test(cur)) continue;
    const windowText = [proseSentences[i - 1] || '', cur, proseSentences[i + 1] || ''].join(' ');
    if (!SOURCE_CUE_RE.test(windowText)) uncitedStats++;
  }
  if (uncitedStats >= 2) {
    findings.push({
      level: 'WARN',
      field: 'geo-uncited-stat-claim',
      detail: `có ${uncitedStats} câu chứa số liệu % hoặc tỷ lệ tăng gấp lần chưa gắn nguồn trích dẫn`,
    });
  }

  const bracketPlaceholders = [...unfenced.matchAll(BRACKET_SEO_RE)].map((m) => m[0]);
  if (bracketPlaceholders.length) {
    findings.push({
      level: 'WARN',
      field: 'seo-bracket-placeholder',
      detail: `còn ${bracketPlaceholders.length} placeholder chưa điền (${bracketPlaceholders[0]})`,
    });
  }

  return { findings, measured };
}

export function selfTest() {
  const fail = (msg) => { throw new Error(`SEO SELF-TEST FAIL — ${msg}`); };

  const multiH1 = checkSeoGeoDraft({ body: '# H1 một\n\nNội dung.\n\n# H1 hai' }, { surface: 'article' });
  if (!multiH1.findings.some((f) => f.field === 'seo-multiple-h1' && f.level === 'ERROR')) fail('không bắt seo-multiple-h1 mức ERROR');

  const badSlug = checkSeoGeoDraft({ body: '# Cách tối ưu\n\nNội dung.' }, { meta: { slug: 'Cách_tối_ưu' } });
  if (!badSlug.findings.some((f) => f.field === 'seo-slug-format' && f.level === 'ERROR')) fail('không bắt seo-slug-format mức ERROR');

  const longSlug = checkSeoGeoDraft({ body: '# Tiêu đề\n\nNội dung.' }, { meta: { slug: 'a-'.repeat(40) + 'end' } });
  if (!longSlug.findings.some((f) => f.field === 'seo-slug-length' && f.level === 'WARN')) fail('không bắt seo-slug-length');

  const shortDesc = checkSeoGeoDraft({ title: 'Tối ưu kho', description: 'Mô tả quá ngắn.', body: '# Tối ưu kho\n\nNội dung.' });
  if (!shortDesc.findings.some((f) => f.field === 'seo-meta-description-short')) fail('không bắt seo-meta-description-short');

  const skipHead = checkSeoGeoDraft({ body: '# H1\n\n### Nhảy cóc H3' });
  if (!skipHead.findings.some((f) => f.field === 'seo-heading-skip')) fail('không bắt seo-heading-skip');

  const wallRes = checkSeoGeoDraft({ body: '# Tối ưu\n\n## Vì sao cần kiểm kho?\nĐể hiểu rõ câu hỏi này chúng ta hãy xét nhiều khía cạnh.' });
  if (!wallRes.findings.some((f) => f.field === 'geo-question-h2-no-direct-answer')) fail('không bắt geo-question-h2-no-direct-answer');

  const compRes = checkSeoGeoDraft({ body: '# So sánh A và B\n\nHai công cụ khác nhau ở giá.' }, { surface: 'comparison' });
  if (!compRes.findings.some((f) => f.field === 'geo-comparison-missing-table')) fail('không bắt geo-comparison-missing-table');

  const pillarRes = checkSeoGeoDraft({ body: '# Pillar\n\n## Phần 1\nÝ.\n\n## Phần 2\nÝ.' }, { surface: 'pillar' });
  if (!pillarRes.findings.some((f) => f.field === 'geo-pillar-low-structure')) fail('không bắt geo-pillar-low-structure');

  const statBad = checkSeoGeoDraft({ body: '# Số liệu\n\nDoanh thu tăng 42% trong quý.\n\nTỷ lệ chuyển đổi tăng gấp 3 lần năm ngoái.' });
  if (!statBad.findings.some((f) => f.field === 'geo-uncited-stat-claim')) fail('không bắt geo-uncited-stat-claim');

  const statIllustrative = checkSeoGeoDraft({ body: '# Minh họa\n\nVí dụ quán mẫu bán được 35% đơn sáng.\n\nChẳng hạn doanh số giờ trưa tăng gấp 2 lần lúc mở thử.' });
  if (statIllustrative.findings.some((f) => f.field === 'geo-uncited-stat-claim')) fail('báo nhầm geo-uncited-stat-claim trên số liệu ví dụ minh họa');

  const kwCheck = checkSeoGeoDraft({
    title: 'Hướng dẫn kế toán',
    description: 'Hướng dẫn quy trình đối soát chứng từ cuối tháng dành cho doanh nghiệp nhỏ và hộ kinh doanh mới.',
    body: `# Hướng dẫn kế toán\n\nMở bài không chứa từ cần tìm.\n\n[liên kết: bài liên quan]`,
  }, { meta: { keyword: 'hóa đơn điện tử', slug: 'huong-dan-ke-toan' } });
  for (const expected of ['seo-keyword-missing-title', 'seo-keyword-missing-intro', 'seo-bracket-placeholder', 'seo-thin-content']) {
    if (!kwCheck.findings.some((f) => f.field === expected)) fail(`thiếu cảnh báo ${expected}`);
  }

  const stuffingBody = `# Kế toán\n\nPhần mềm kế toán.\n\n${Array.from({ length: 30 }, () => 'Phần mềm kế toán giúp xử lý chứng từ nhanh hơn.').join(' ')}`;
  if (!checkSeoGeoDraft({ title: 'Phần mềm kế toán', body: stuffingBody }, { meta: { keyword: 'phần mềm kế toán' } }).findings.some((f) => f.field === 'seo-keyword-stuffing')) {
    fail('không bắt seo-keyword-stuffing');
  }

  const fillerWords = Array.from({ length: 150 }, (_, i) => `Hệ thống đối chiếu chứng từ tự động ở bước ${i + 1} rất gọn nhẹ.`).join(' ');
  const goodArticle = checkSeoGeoDraft({
    title: 'Cách triển khai hóa đơn điện tử chuẩn cho doanh nghiệp',
    description: 'Hướng dẫn từng bước triển khai hóa đơn điện tử từ khởi tạo mẫu, ký số đến đối soát cuối kỳ nhanh gọn và đúng quy định.',
    body: `# Cách triển khai hóa đơn điện tử\n\nHóa đơn điện tử giúp đội ngũ tài chính xuất chứng từ trong 10 giây [1].\n\n## Lợi ích cốt lõi\nQuy trình số giảm sai sót nhập tay đáng kể.\n\n${fillerWords}`,
  }, { surface: 'article', meta: { keyword: 'hóa đơn điện tử', slug: 'trien-khai-hoa-don-dien-tu' } });
  if (goodArticle.findings.length) fail(`false positive trên bài đạt chuẩn: ${JSON.stringify(goodArticle.findings)}`);

  console.log('SEO SELF-TEST PASS — On-Page SEO + GEO checks, slug/H1 ERROR và zero false positive trên số liệu minh họa');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--self-test')) {
  try {
    selfTest();
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
