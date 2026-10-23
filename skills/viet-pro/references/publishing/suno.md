---
schema: viet-pro/platform-profile@1
id: suno
name: "Suno AI (Lyrics & Style Prompt)"
tier: 2
counting: graphemes
last_verified: 2026-10-17
review_by: 2027-01-17
limits:
  - { surface: custom, field: max_title_chars, value: 100, confidence: E, source: suno-v4-5 }
  - { surface: custom, field: max_description_chars, value: 1000, confidence: O, source: suno-v4-5 }
  - { surface: custom, field: max_chars, value: 5000, confidence: O, source: suno-v4-5 }
  - { surface: custom, field: fold_chars, value: 3000, confidence: E, source: suno-v6 }
  - { surface: v4, field: max_title_chars, value: 80, confidence: E, source: suno-rn }
  - { surface: v4, field: max_description_chars, value: 200, confidence: O, source: suno-rn }
  - { surface: v4, field: max_chars, value: 3000, confidence: O, source: suno-rn }
sources:
  - { id: suno-v6, url: "https://suno.com/blog/introducing-v6", accessed: 2026-10-17 }
  - { id: suno-v4-5, url: "https://suno.com/blog/introducing-v4-5", accessed: 2026-10-17 }
  - { id: suno-rn, url: "https://suno.com/release-notes", accessed: 2026-10-17 }
---
# Suno AI — Lyrics & Style Prompt Tiếng Việt Không Cưỡng Âm

**Nhân viên:** suno.md — Ban Xuất bản (publishing/)
**Loại:** TRANSFORMATION (`review/consistency.md`) — chuyển ý tưởng/bài viết thành cấu trúc ca khúc + Style Prompt. Được điệp `[Chorus]` và ngắt câu theo phách.

---

## 1. Cấu trúc bản thảo 4 khối (`check-platform.mjs suno <file>`)

- `## title` (≤100 ký tự): Tên bài hát ngắn gọn, giàu hình ảnh.
- `## description` (Style of Music ≤1.000 ký tự, **tiếng Anh**): Ghép 5 trụ cột `Genre/Era + Tempo/Groove + Instrumentation + Vocal Profile + Mix`. Nên kèm cụm định hướng phát âm: `clear Vietnamese pronunciation, crisp articulation, forward vocals`. *Kinh nghiệm cộng đồng, chưa đo được hiệu quả; `check-platform` chỉ nhắc ở mức WARN.*
  - **Sliders (Suno v5.5 / v6), điểm khởi đầu theo kinh nghiệm, chưa đo:** `Weirdness: 35–45%`, `Style Influence: 70–85%`. Nghe thử rồi chỉnh; không có tài liệu chính thức về mức nào giữ dấu tốt nhất.
- `## caption` (Exclude Styles ≤1.000 ký tự, tùy chọn): Liệt kê trực diện danh từ cần loại bỏ (`muffled vocals, autotune, screaming, heavy distortion`). **Cấm** từ phủ định `no, not, without, đừng, không`.
- `## body` (Custom Lyrics ≤5.000 ký tự; **sweet spot ≤3.000 ký tự**): Lời tiếng Việt NFC kèm metatag cấu trúc.

---

## 2. Năm mẫu Style Prompt tiếng Anh cho nhạc Việt

| Dòng nhạc | Mẫu `## description` (Style of Music) | Mẫu `## caption` (Exclude) |
| :--- | :--- | :--- |
| **V-Pop Ballad** | `Emotional V-Pop piano ballad, 72 BPM, warm grand piano and solo cello building to strings in chorus, expressive breathy female vocals, clear Vietnamese pronunciation, crisp articulation, forward vocal mix` | `autotune, EDM drop, trap hi-hats, muffled vocals, screaming` |
| **Indie Acoustic** | `Warm Vietnamese indie folk-pop, 82 BPM, fingerpicked nylon guitar, soft cajon and upright bass, intimate male baritone vocals, clear Vietnamese pronunciation, crisp articulation, analog warmth` | `heavy distortion, synth lead, robotic vocals, rushed tempo` |
| **Bolero / Trữ tình** | `Classic Vietnamese sentimental bolero, slow 64 BPM 4/4 bolero rhythm, acoustic guitar tremolo, nostalgic flute and strings, sweet vibrato female soprano vocals, clear Vietnamese pronunciation, forward vocals` | `modern EDM, rap, heavy bass drop, autotune, harsh treble` |
| **R&B / Lo-fi Chill** | `Late-night Vietnamese R&B lo-fi soul, 86 BPM laid-back groove, warm Rhodes piano, mellow jazz guitar chords, silky smooth male vocals with subtle falsetto, clear Vietnamese pronunciation, crisp articulation` | `aggressive drums, metal guitar, shouting, muddy low-end` |
| **Rap / VinaHouse** | `High-energy Vietnamese melodic rap and pop-trap, 128 BPM, punchy 808 bass, crisp percussion, plucky synth hook, confident male rap flow with melodic sung chorus, clear Vietnamese pronunciation, crisp diction` | `mumbled vocals, off-beat phrasing, acoustic ballad, muddy mix` |

---

## 3. Quy tắc Metatag (Suno v4.5 / v5 / v5.5 / v6)

- **Ngoặc vuông `[...]` — Cấu trúc, nhạc cụ & vocal (100% tiếng Anh):** `[Intro - Fingerpicked Guitar]`, `[Verse 1 - Soft Intimate Vocal]`, `[Pre-Chorus - Building Tension]`, `[Chorus - Emotional Climax, Full Band]`, `[Bridge - Stripped Back Piano]`, `[Outro - Slow Fade Out]`. Tối đa **2–3 tính từ/thẻ**. **Cấm tiếng Việt** trong `[...]` vì Suno dễ đọc thành lời.
- **Ngoặc đơn `(...)` — Chỉ chứa lời bè / Ad-lib hát thật:** `(ooh-ah)`, `(yeah)`, `(mãi bên em)`, tối đa **≤4 từ**. **Cấm chỉ dẫn đạo diễn** (`(hát nhẹ)`, `(cười)`, `(whisper)`) trong `(...)`.

---

## 4. Luật Chống Cưỡng Âm Tiếng Việt & Phối Vần (Prosody)

1. **Ma trận 6 thanh điệu × 3 tầng giai điệu** (kinh nghiệm phối giai điệu, không phải quy tắc ngữ âm; thanh hỏi theo giọng Bắc là thanh trầm gãy, theo giọng Nam gần như nhập với ngã, nên xếp tầng tùy giọng hát của bài):
   - **Cao / Sáng (Sắc `/`, Ngã `~`):** Nốt vút cao, điểm nhấn cao trào (`sáng, nhớ, mãi, vỡ`).
   - **Trung / Ngang (Ngang, Hỏi `?`):** Nốt giữ phách, kể chuyện tự nhiên (`ta, mơ, chiều, hỏi, kể`).
   - **Trầm / Tối (Huyền `\`, Nặng `.`):** Nốt trầm, nốt lơi xuống cuối câu (`đời, buồn, lặng, bước`).
   - **Cấm cụm thanh gãy:** Tránh **≥4 âm tiết liên tiếp toàn Hỏi/Ngã/Nặng** hoặc **≥3 âm tiết toàn Hỏi/Ngã** trong một cụm liền hơi (ngoài `[Rap]`/`[Spoken Word]`).
2. **Luật Âm Mở ở Nốt Ngân (`[Chorus]` / `[Outro]` / `belted`):**
   - Cuối câu ngân dài phải ưu tiên **nguyên âm mở** (`-a, -o, -ơ, -ê, -i, -u, -ư`), **bán nguyên âm** (`-ai, -ao, -ơi, -êu`) hoặc **âm mũi vang** (`-m, -n, -ng, -nh`) mang thanh **Ngang, Huyền, Sắc**.
   - **Cấm kết câu ngân bằng âm tắc vô thanh (`-p, -t, -c, -ch`) hoặc thanh Nặng (`.`):** Các chữ như *khóc, thắt, nhịp, kịch, nặng, lặng* khóa thanh quản, làm cụt hơi hoặc mất phụ âm cuối.
3. **Đan xen kết câu Bằng – Trắc & Vần lưng / Vần thông:**
   - Trong khổ 4 câu giai điệu, **không để cả 4 câu đều kết bằng thanh Trắc** (giai điệu bị treo). Hãy đan xen **Trắc – Bằng – Trắc – Bằng** để câu 2 và câu 4 hạ cánh êm trên thanh Bằng (`ngang/huyền`).
   - Phối hợp **vần chân** với **vần lưng** (chữ cuối câu trên ăn vần với chữ thứ 2/3/4 câu dưới) và **vần thông** (`-ang/-an`, `-ơi/-ôi`, `-im/-in`).
4. **Nhịp & Hơi:** Dòng chuẩn **6–12 chữ**; >12 chữ phải có `,` lấy hơi. Dòng đối ứng giữa `[Verse 1]`, `[Verse 2]`, `[Verse 3]` nên lệch **≤2 chữ**; `check-platform` cảnh báo khi lệch quá 4 chữ. Dòng giai điệu ngắn khoảng **6–8 chữ** thường dễ hát và chắc nhịp hơn; khi một dòng gộp hai vế dài, cân nhắc tách thành hai dòng (kinh nghiệm, chưa đo).
5. **Hạn chế chêm từ tiếng Anh vào câu hát tiếng Việt** (`wifi, crush, lag, video, chill, deadline...`): Suno có thể đổi sang cách phát âm tiếng Anh giữa câu, làm giật nhịp và méo dấu các chữ kế bên (kinh nghiệm, chưa đo). Nếu cố ý dùng, nghe lại bản render; `check-platform` chỉ cảnh báo ở mức WARN.

---

## 5. Bảng 4 Tình Huống Sửa Câu Thực Chiến (Before → After)

| Lỗi cưỡng âm | Bản nháp lỗi (Bị cưỡng âm / Suno hát hỏng) | Bản sửa Thuận Âm (Tròn vành, vang sáng) |
| :--- | :--- | :--- |
| **1. Kết Chorus bằng âm tắc `-p/-t/-c/-ch` + Nặng** | `Giữa đêm lạnh anh bật khóc trong cô độc`<br>`Nỗi đau này thật khốc liệt và bức xúc` | `Giữa đêm lạnh nghe tiếng mưa rơi thật buồn`<br>`Để nỗi đau theo gió chiều trôi ngàn phương` |
| **2. Cụm ≥4 thanh Hỏi/Ngã/Nặng liên tiếp** | `Chẳng thể giữ nổi kỷ niệm cũ kỹ đã ngã đổ` *(cả 11 âm tiết đều hỏi/ngã/nặng)* | `Chẳng còn giữ được bao ngày xưa êm đềm` *(chen thanh bằng `còn, bao, ngày, xưa, êm, đềm`; không còn cụm trắc nào quá 2 âm tiết)* |
| **3. Dòng dài không ngắt phách & lệch Verse** | `Anh bước qua con phố quen nơi chúng mình từng hẹn ước dưới cơn mưa chiều` *(16 chữ liền hơi)* | `Bước qua góc phố chiều mưa,`<br>`Nơi ta từng hứa đón đưa thuở nào` *(vần lưng `mưa - hứa - đưa`)* |
| **4. Chỉ dẫn tiếng Việt trong `()` / `[]` & vần AI** | `[Điệp khúc - Hát cao trào]`<br>`Mưa rơi chơi vơi giữa đêm thâu u sầu (hát nhẹ thôi)` | `[Chorus - Emotional Climax, Soaring Vocals]`<br>`Khói trà còn ấm góc hiên nhà chiều mưa (chiều mưa)` |

---

## 6. Checklist bàn giao

- [ ] Đủ `## title`, `## description` (EN, có mô tả giọng hát và cue phát âm), `## body`?
- [ ] Mọi `[...]` bằng tiếng Anh; mọi `(...)` là lời bè hát thật (≤4 từ); từ tiếng Anh trong câu hát (nếu có) là cố ý?
- [ ] Cuối `[Chorus]`/`[Outro]` dùng âm mở hoặc âm mũi (`-m, -n, -ng, -nh`), không dùng `-p/-t/-c/-ch` hay thanh Nặng?
- [ ] Khổ 4 câu có điểm hạ cánh thanh Bằng (`ngang/huyền`), không kết 100% bằng thanh Trắc?
- [ ] Chạy `check-platform.mjs suno <file>` và `lint-vietnamese-content.mjs <file>` đạt 0 lỗi? Script chỉ kiểm bản thảo; cưỡng âm thật chỉ lộ ra khi nghe bản render.
