// Vietnamese vocal prosody (chống cưỡng âm) and Suno v4.5-v6 metatag/prompt checks.
// Pure functions, zero external dependencies. Called by profile.mjs when platform === 'suno'.

const VIET_DIACRITIC = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/iu;
// JS `\b` only knows ASCII word characters, so it never matches before "đ" or after a toned vowel.
// Every word list below is wrapped in Unicode-aware boundaries instead.
const wordsRe = (alternation, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${alternation})(?![\\p{L}\\p{M}\\p{N}])`, flags);
const VIET_BRACKET_WORD = wordsRe('doan|diep\\s*khuc|loi\\s*\\d|dao\\s*dau|ket\\s*bai|chuyen\\s*doan|gian\\s*tau|phien\\s*khuc');
// Production cues in English never belong inside (...): Suno sings them as backing vocals.
const PAREN_PRODUCTION_EN = wordsRe('fade(?:\\s+(?:in|out))?|solo|drop|beat|outro|intro|chorus|verse|bridge|whisper(?:ed)?|belt(?:ed)?|sustain(?:ed)?|instrumental|spoken|ad-?lib|reverb|echo|tempo|harmony|harmonies');
// Vietnamese directives are matched as phrases, not single words, so sung backing lines such as
// "(cùng hát lên)" or "(nhịp tim em)" stay clean.
const PAREN_DIRECTIVE_VI = wordsRe([
  'hát\\s+(?:nhẹ|to|nhỏ|chậm|nhanh|cao|trầm|bè|đệm|thì\\s+thầm)',
  'giọng\\s+(?:nam|nữ|ca|trầm|cao|thì\\s+thầm)',
  'nhạc\\s+(?:dạo|nền|nổi|tắt|vào|dừng)',
  'đàn\\s+(?:guitar|piano|bầu|tranh|nguyệt|organ|dây)',
  'tiếng\\s+(?:đàn|trống|sáo)',
  'trống\\s+(?:vào|dồn|dừng)',
  '(?:chậm|nhanh|nhỏ|to)\\s+dần',
  'nhịp\\s+(?:chậm|nhanh)',
  'ngân\\s+dài', 'thì\\s+thầm', 'cao\\s+trào', 'lắng\\s+đọng', 'dồn\\s+dập',
  'nhẹ\\s+nhàng', 'mạnh\\s+mẽ', 'giai\\s+điệu', 'cười', 'thở\\s+dài', 'ngừng\\s+nhạc',
].join('|'));
const STRUCTURE_WORDS = 'intro|verse(?:\\s*\\d+)?|pre-chorus|chorus|post-chorus|final\\s+chorus|bridge|outro|hook|refrain|rap|spoken(?:\\s+word)?|drop|build|instrumental|solo|interlude|break|end';
const STRUCTURE_TAG = new RegExp(`^\\[\\s*(${STRUCTURE_WORDS})(?![\\p{L}\\p{M}])`, 'iu');
const HIGH_SUSTAIN_CUE = wordsRe('belted|belt|sustained|sustain|high\\s+note|soaring|melisma|long\\s+note|power\\s+vocal|climax|anthem|anthemic');
const PERCUSSIVE_GENRE = wordsRe('rap|hip-hop|hip\\s+hop|drill|trap|rock|metal|punk|edm|vinahouse|house|techno|hyperpop|fast\\s+tempo');
const VOCAL_CUE = wordsRe('vocals?|voices?|singer|sung|baritone|tenor|soprano|alto|crooner|rap\\s+flow');
const PRONUNCIATION_CUE = wordsRe('pronunciation|articulation|diction|enunciation|clear\\s+(?:vietnamese\\s+)?lyrics');
const EXCLUDE_NEGATION = wordsRe("no|not|without|don't|dont|never|không|đừng|chớ|tránh");
// Common English loanwords dropped into a Vietnamese line pull Suno's pronunciation toward English stress.
const ENGLISH_IN_LYRICS = wordsRe('wifi|wi-fi|crush|lag|bluetooth|internet|router|modem|password|online|offline|video|game|chill|vibe|deadline|idol|story|status|alo|baby|sorry');

const AI_CLICHE_FAMILIES = [
  ['mưa rơi', 'chơi vơi', 'bên đời', 'xa vời', 'rã rời'],
  ['đêm thâu', 'u sầu', 'đậm sâu', 'niềm đau', 'biết về đâu'],
  ['bóng tối', 'dẫn lối', 'lạc lối', 'bối rối', 'đơn côi'],
  ['giấc chiêm bao', 'ngàn vì sao', 'khát khao', 'thét gào'],
  ['hao gầy', 'đong đầy', 'tháng ngày', 'ngất ngây'],
  ['vỡ tan', 'muộn màng', 'ngỡ ngàng', 'dở dang', 'lỡ làng'],
  ['vượt qua bão giông', 'ánh dương', 'kiên cường', 'phi thường'],
  ['trái tim tan vỡ', 'nỗi đau không tên', 'ký ức nhạt nhòa', 'ánh trăng lẻ loi'],
];

const TONE_NAMES = {
  ngang: 'thanh ngang',
  huyen: 'thanh huyền',
  hoi: 'thanh hỏi',
  nga: 'thanh ngã',
  sac: 'thanh sắc',
  nang: 'thanh nặng',
};

// Decompose a single Vietnamese syllable into { raw, clean, tone, group, ending }.
export function analyzeSyllable(raw) {
  const clean = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  if (!clean) return null;
  const nfd = clean.toLowerCase().normalize('NFD');
  let tone = 'ngang';
  if (nfd.includes('\u0300')) tone = 'huyen';
  else if (nfd.includes('\u0309')) tone = 'hoi';
  else if (nfd.includes('\u0303')) tone = 'nga';
  else if (nfd.includes('\u0301')) tone = 'sac';
  else if (nfd.includes('\u0323')) tone = 'nang';

  const base = nfd.replace(/[\u0300-\u036f]/gu, '').replace(/đ/gu, 'd');
  if (!/[aeiouy]/u.test(base)) return null;
  let ending = 'open';
  if (/[aeiouy](?:ch|p|t|c)$/u.test(base)) ending = 'stop';
  else if (/[aeiouy](?:ng|nh|m|n)$/u.test(base)) ending = 'nasal';

  const group = tone === 'ngang' || tone === 'huyen' ? 'bang' : 'trac';
  return { raw: clean, base, tone, group, ending };
}

function describePhonetic(syl) {
  const endLabel = syl.ending === 'stop' ? `âm tắc -${syl.base.match(/(?:ch|p|t|c)$/u)?.[0]}` : syl.ending === 'nasal' ? 'âm mũi' : 'âm mở';
  return `${TONE_NAMES[syl.tone]}, ${endLabel}`;
}

function extractSyllables(text) {
  return (text.match(/[\p{L}\p{N}]+/gu) || []).map(analyzeSyllable).filter(Boolean);
}

// Strip inline [tags], {sfx}, and (backing vocals) so syllable counts and line endings reflect the lead vocal.
function leadVocalText(line) {
  return line.replace(/\[[^\]]*\]/gu, ' ').replace(/\{[^}]*\}/gu, ' ').replace(/\([^)]*\)/gu, ' ').replace(/\s+/gu, ' ').trim();
}

export function checkSunoDraft(fields, { countText } = {}) {
  const findings = [];
  const measured = [];
  const count = countText ? (s) => countText(s, 'graphemes') : (s) => [...s.normalize('NFC')].length;

  // 1. Optional ## caption (Exclude Styles / Negative Prompt)
  if (fields.caption !== undefined && fields.caption.trim() !== '') {
    const cap = fields.caption.trim();
    const capLen = count(cap);
    measured.push({ field: 'max_caption_chars', value: capLen, limit: 1000 });
    if (capLen > 1000) {
      findings.push({ level: 'ERROR', field: 'max_caption_chars', detail: `${capLen}/1000 (O, nguồn suno-v4-5)` });
    }
    const neg = cap.match(EXCLUDE_NEGATION);
    if (neg) {
      findings.push({
        level: 'WARN',
        field: 'exclude-styles-negation',
        detail: `Exclude Styles (## caption) chứa "${neg[0]}"; chỉ liệt kê danh từ cần loại bỏ (ví dụ: autotune, trap hi-hats) để tránh Suno hiểu ngược`,
      });
    }
  }

  // 2. ## description (Style of Music Prompt)
  const desc = (fields.description || '').trim();
  const isPercussive = PERCUSSIVE_GENRE.test(desc);
  if (desc) {
    if (VIET_DIACRITIC.test(desc)) {
      findings.push({
        level: 'WARN',
        field: 'style-prompt-lang',
        detail: 'Style of Music (## description) có tiếng Việt có dấu; nên viết hoàn toàn bằng tiếng Anh để Suno v4.5-v6 nhận diện chuẩn nhạc cụ và vocal',
      });
    }
    const commaParts = desc.split(',').map((s) => s.trim()).filter(Boolean);
    if (commaParts.length > 16) {
      findings.push({
        level: 'WARN',
        field: 'style-keyword-stuffing',
        detail: `Style of Music có ${commaParts.length} cụm tag (>16); chỉ nên giữ 4-7 trụ cột để tránh đục bản phối (prompt bleeding)`,
      });
    }
  }

  // 3. ## body (Custom Lyrics, Metatags & Vietnamese Vocal Prosody)
  const body = (fields.body || '').trim();
  if (!body) return { findings, measured };

  const rawLines = body.split('\n');
  let hasStructureTag = false;
  let currentSection = 'unknown';
  let currentSectionRaw = '';
  let pendingHighCue = false;
  let lyricLineCount = 0;

  const sections = [];
  let activeSection = { type: 'unknown', raw: '', stanzas: [[]] };
  sections.push(activeSection);

  rawLines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const trimmed = rawLine.trim();

    // Check all [...] tags on this line for Vietnamese text
    for (const m of trimmed.matchAll(/\[([^\]]+)\]/gu)) {
      const tagContent = m[1].trim();
      if (VIET_DIACRITIC.test(tagContent) || VIET_BRACKET_WORD.test(tagContent)) {
        findings.push({
          level: 'ERROR',
          field: 'vietnamese-in-brackets',
          detail: `dòng ${lineNo}: "[${tagContent}]" dùng tiếng Việt trong ngoặc vuông; phải dùng metatag tiếng Anh ([Intro], [Verse], [Chorus], [Bridge], [Outro]) để Suno không hát nhầm thành lời`,
        });
      }
      if (HIGH_SUSTAIN_CUE.test(tagContent)) pendingHighCue = true;
    }

    // Check all (...) on this line for production directives mistakenly placed in parentheses.
    // English production cues, or a Vietnamese directive filling the whole line, are syntax errors;
    // a Vietnamese directive phrase inside a sung line is only suspicious.
    const wholeLineParen = /^\([^)]*\)$/u.test(trimmed);
    for (const m of trimmed.matchAll(/\([^)]*\)/gu)) {
      const english = PAREN_PRODUCTION_EN.test(m[0]);
      if (!english && !PAREN_DIRECTIVE_VI.test(m[0])) continue;
      const error = english || wholeLineParen;
      findings.push({
        level: error ? 'ERROR' : 'WARN',
        field: 'directive-in-parens',
        detail: `dòng ${lineNo}: "${m[0]}" giống chỉ dẫn đạo diễn/thanh nhạc trong ngoặc đơn (); Suno sẽ hát thành lời bè — nếu không phải lời hát, chuyển sang ngoặc vuông tiếng Anh [...]`,
      });
    }

    if (STRUCTURE_TAG.test(trimmed)) hasStructureTag = true;

    // Pure tag line or SFX line
    if (/^\[[^\]]+\]$/u.test(trimmed) || /^\{[^}]+\}$/u.test(trimmed)) {
      if (STRUCTURE_TAG.test(trimmed)) {
        const secMatch = trimmed.match(STRUCTURE_TAG);
        currentSection = secMatch ? secMatch[1].toLowerCase().replace(/\s+/gu, ' ') : 'other';
        currentSectionRaw = trimmed;
        activeSection = { type: currentSection, raw: trimmed, highCue: HIGH_SUSTAIN_CUE.test(trimmed), stanzas: [[]] };
        sections.push(activeSection);
        pendingHighCue = HIGH_SUSTAIN_CUE.test(trimmed);
      }
      return;
    }

    if (!trimmed) {
      if (activeSection.stanzas[activeSection.stanzas.length - 1].length > 0) {
        activeSection.stanzas.push([]);
      }
      pendingHighCue = false;
      return;
    }

    const lead = leadVocalText(trimmed);
    const syls = extractSyllables(lead);
    if (!syls.length) return;

    lyricLineCount++;
    const lineObj = {
      lineNo,
      raw: trimmed,
      lead,
      syls,
      lastSyl: syls[syls.length - 1],
      hasHighCue: pendingHighCue || HIGH_SUSTAIN_CUE.test(trimmed) || /(?:\.{3}|…)\s*$/u.test(lead),
      isRapOrSpoken: /^(?:rap|spoken)/u.test(activeSection.type),
    };
    pendingHighCue = false;
    activeSection.stanzas[activeSection.stanzas.length - 1].push(lineObj);

    const engMatch = lead.match(ENGLISH_IN_LYRICS);
    if (engMatch) {
      findings.push({
        level: 'WARN',
        field: 'english-in-viet-lyrics',
        detail: `dòng ${lineNo}: từ tiếng Anh "${engMatch[0]}" xen giữa câu hát tiếng Việt dễ làm Suno đổi sang cách phát âm tiếng Anh, giật nhịp và méo dấu các chữ kế bên (kinh nghiệm, chưa đo); nếu cố ý dùng thì nghe lại bản render`,
      });
    }

    // 3a. Check breath phrases on this line for broken-tone-cluster & long-unpaused-line
    if (!lineObj.isRapOrSpoken) {
      const phrases = lead.split(/[,.;!?:…/]|--|\.{2,}|\s-\s/u).map((p) => p.trim()).filter(Boolean);
      for (const phrase of phrases) {
        const pSyls = extractSyllables(phrase);
        if (! isPercussive && pSyls.length > 12) {
          findings.push({
            level: 'WARN',
            field: 'long-unpaused-line',
            detail: `dòng ${lineNo}: cụm "${phrase.slice(0, 45)}..." dài ${pSyls.length} âm tiết liền hơi không có dấu phẩy ngắt nhịp, dễ làm Suno hát vội (rushing) và nuốt dấu`,
          });
        }
        // Broken tone cluster: >= 4 consecutive {hoi, nga, nang} or >= 3 consecutive {hoi, nga}
        let heavyRun = [];
        let contourRun = [];
        for (const s of pSyls) {
          if (s.tone === 'hoi' || s.tone === 'nga' || s.tone === 'nang') heavyRun.push(s.raw);
          else heavyRun = [];
          if (s.tone === 'hoi' || s.tone === 'nga') contourRun.push(s.raw);
          else contourRun = [];

          if (heavyRun.length === 4 || contourRun.length === 3) {
            const cluster = (contourRun.length === 3 ? contourRun : heavyRun).join(' ');
            findings.push({
              level: 'WARN',
              field: 'broken-tone-cluster',
              detail: `dòng ${lineNo}: cụm "${cluster}" có nhiều thanh gãy/trầm (hỏi/ngã/nặng) liên tiếp không ngắt nhịp, dễ làm Suno hát đớt hoặc trượt dấu`,
            });
            break;
          }
        }
      }
      if (!isPercussive && phrases.length > 1 && syls.length > 16) {
        findings.push({
          level: 'WARN',
          field: 'long-unpaused-line',
          detail: `dòng ${lineNo}: dòng hát quá dài (${syls.length} âm tiết > 16), nên tách thành 2 dòng ngắn (6-8 chữ mỗi dòng thường dễ hát hơn, kinh nghiệm chưa đo) để Suno chia khuôn nhịp ổn định`,
        });
      }
    }
  });

  if (lyricLineCount > 0 && desc) {
    const commaParts = desc.split(',').map((s) => s.trim()).filter(Boolean);
    const missing = [];
    if (commaParts.length < 3) missing.push(`chỉ có ${commaParts.length} cụm (<3 trụ cột)`);
    if (!VOCAL_CUE.test(desc)) missing.push('chưa mô tả giọng hát (vocals, baritone, soprano...)');
    if (!PRONUNCIATION_CUE.test(desc)) missing.push('thiếu cue phát âm rõ (clear Vietnamese pronunciation, crisp articulation, diction)');
    if (missing.length) {
      findings.push({
        level: 'WARN',
        field: 'style-missing-vocal-clarity',
        detail: `Style of Music (## description): ${missing.join('; ')}`,
      });
    }
  }
  if (lyricLineCount >= 4 && !hasStructureTag) {
    findings.push({
      level: 'WARN',
      field: 'missing-structure-tags',
      detail: 'bản thảo thiếu thẻ cấu trúc [Intro], [Verse], [Chorus], [Outro]; Suno dễ hát dồn toa và mất phân đoạn',
    });
  }

  // 3b. Check Chorus/Outro sustained endings & Stanza symmetry
  for (const sec of sections) {
    const allLines = sec.stanzas.flat();
    if (!allLines.length) continue;
    const isChorusOrOutro = /^(?:chorus|final chorus|hook|refrain|outro)$/u.test(sec.type);

    if (!isPercussive && !/^(?:rap|spoken)/u.test(sec.type)) {
      let warnedLines = new Set();
      // Explicit high/sustain cue on any line
      for (const ln of allLines) {
        if (ln.hasHighCue && (ln.lastSyl.ending === 'stop' || ln.lastSyl.tone === 'nang')) {
          warnedLines.add(ln.lineNo);
          findings.push({
            level: 'WARN',
            field: 'chorus-closed-stop-ending',
            detail: `dòng ${ln.lineNo}: chữ cuối "${ln.lastSyl.raw}" (${describePhonetic(ln.lastSyl)}) đặt ở nốt ngân/cao trào gây cưỡng âm hoặc cụt hơi; nên đổi sang âm mở (-a, -o, -ơ, -ê...) hoặc âm mũi (-m, -n, -ng, -nh) mang thanh ngang/sắc/huyền`,
          });
        }
      }

      if (isChorusOrOutro) {
        const lastLn = allLines[allLines.length - 1];
        const closedLines = allLines.filter((l) => l.lastSyl.ending === 'stop' || l.lastSyl.tone === 'nang');
        const hasConsecutiveClosed = allLines.some((l, i) => i > 0
          && (l.lastSyl.ending === 'stop' || l.lastSyl.tone === 'nang')
          && (allLines[i - 1].lastSyl.ending === 'stop' || allLines[i - 1].lastSyl.tone === 'nang'));

        if (!warnedLines.has(lastLn.lineNo) && (lastLn.lastSyl.ending === 'stop' || lastLn.lastSyl.tone === 'nang')) {
          warnedLines.add(lastLn.lineNo);
          findings.push({
            level: 'WARN',
            field: 'chorus-closed-stop-ending',
            detail: `dòng ${lastLn.lineNo}: câu kết ${sec.raw || '[Chorus]'} đóng bằng "${lastLn.lastSyl.raw}" (${describePhonetic(lastLn.lastSyl)}) làm nốt ngân cuối đoạn bị cụt hơi hoặc mất phụ âm cuối; ưu tiên âm mở hoặc âm mũi (-m, -n, -ng, -nh)`,
          });
        } else if (allLines.length >= 2 && closedLines.length >= Math.ceil(allLines.length * 0.5) && hasConsecutiveClosed) {
          const targetLn = closedLines.find((l) => !warnedLines.has(l.lineNo));
          if (targetLn) {
            findings.push({
              level: 'WARN',
              field: 'chorus-closed-stop-ending',
              detail: `dòng ${targetLn.lineNo}: ${closedLines.length}/${allLines.length} câu trong ${sec.raw || '[Chorus]'} kết bằng âm tắc (-p/-t/-c/-ch) hoặc thanh nặng (${closedLines.map((l) => `"${l.lastSyl.raw}"`).join(', ')}) làm điệp khúc bị bí hơi, khó ngân vang`,
            });
          }
        }
      }
    }

    // Stanza syllable balance & all-Trắc cadence check
    for (const stanza of sec.stanzas) {
      if (stanza.length < 4 || stanza[0].isRapOrSpoken || isPercussive) continue;
      if (stanza.every((l) => l.lastSyl.group === 'trac')) {
        findings.push({
          level: 'WARN',
          field: 'stanza-all-trac-endings',
          detail: `dòng ${stanza[0].lineNo}-${stanza[stanza.length - 1].lineNo}: cả ${stanza.length} câu trong khổ đều kết bằng thanh Trắc (${stanza.map((l) => `"${l.lastSyl.raw}"`).join(', ')}), thiếu điểm hạ cánh Bằng (ngang/huyền) làm giai điệu bị treo và gắt`,
        });
      }
      const counts = stanza.map((l) => l.syls.length);
      let adjMax = 0;
      for (let i = 0; i + 1 < counts.length; i += 2) {
        adjMax = Math.max(adjMax, Math.abs(counts[i] - counts[i + 1]));
      }
      let altMax = 0;
      for (let i = 0; i + 2 < counts.length; i++) {
        altMax = Math.max(altMax, Math.abs(counts[i] - counts[i + 2]));
      }
      if (Math.min(adjMax, altMax) > 5) {
        findings.push({
          level: 'WARN',
          field: 'syllable-asymmetry',
          detail: `dòng ${stanza[0].lineNo}-${stanza[stanza.length - 1].lineNo}: số âm tiết trong khổ lệch mạnh (${counts.join('-')} chữ), dễ làm Suno mất nhịp phách`,
        });
      }
    }
  }

  // 3c. Cross-Verse syllable lock across all [Verse N] sections
  const verses = sections.filter((s) => /^verse(?:\s+\d+)?$/u.test(s.type) && s.stanzas?.[0]?.length >= 4);
  if (verses.length >= 2 && !isPercussive) {
    const baseVerse = verses[0];
    const baseStanza = baseVerse.stanzas[0];
    for (let v = 1; v < verses.length; v++) {
      const curVerse = verses[v];
      const curStanza = curVerse.stanzas[0];
      if (curStanza.length !== baseStanza.length) continue;
      for (let i = 0; i < baseStanza.length; i++) {
        const diff = Math.abs(baseStanza[i].syls.length - curStanza[i].syls.length);
        if (diff > 4) {
          findings.push({
            level: 'WARN',
            field: 'syllable-asymmetry',
            detail: `dòng ${curStanza[i].lineNo}: câu ${i + 1} của ${curVerse.raw || '[Verse]'} (${curStanza[i].syls.length} chữ) lệch quá xa câu ${i + 1} của ${baseVerse.raw || '[Verse 1]'} (${baseStanza[i].syls.length} chữ), dễ khiến Suno hát vội (rushing) hoặc méo dấu`,
          });
          break;
        }
      }
    }
  }

  // 3d. AI Cliché Rhyme detection
  const lowerBody = body.toLowerCase().normalize('NFC');
  const familyHits = [];
  for (const fam of AI_CLICHE_FAMILIES) {
    const matched = fam.filter((w) => new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`, 'iu').test(lowerBody));
    if (matched.length >= 2) familyHits.push(matched);
  }
  if (familyHits.some((h) => h.length >= 3) || familyHits.length >= 2) {
    const summary = familyHits.map((h) => h.join(' - ')).join('; ');
    findings.push({
      level: 'WARN',
      field: 'ai-cliche-rhyme',
      detail: `phát hiện bộ vần sáo mòn kiểu AI (${summary}); hãy thay bằng chi tiết cụ thể và vần lưng/vần thông tự nhiên`,
    });
  }

  return { findings, measured };
}
