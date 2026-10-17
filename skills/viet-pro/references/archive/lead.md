# Ban Tư Liệu — Trưởng Ban

**Vai trò:** Lưu trữ và quản lý kho bài mẫu đã duyệt. Cung cấp reference để đối chiếu chất lượng output.

---

## Nhân sự

Bài mẫu đã duyệt được lưu trong thư mục `samples/` cạnh file này. Bản phát hành chưa kèm bài mẫu nào; thư mục chỉ được tạo khi người dùng cho phép lưu bài mẫu đầu tiên. Khi chưa có, dùng `pattern-catalog.md`.

**Quy ước lưu bài mẫu (`samples/`):**
- Tên file: `{yymmdd}-{kênh}-{slug}.md` (vd `260707-facebook-debunk-anthropic.md`)
- Frontmatter metadata bắt buộc:
  ```yaml
  ---
  loai-de-bai: debunk | blog | technical | ...
  kenh: facebook | linkedin | ...
  ky-thuat: [story-core, debunk, emphasis]
  ngay-duyet: 2026-07-07
  ---
  ```

| Bài mẫu | File | Kỹ thuật đã dùng | Ngày |
|---------|------|-------------------|------|
| Phản bác Anthropic | (chưa lưu — chờ user cung cấp bản gốc) | story-core + debunk + emphasis + fact-check | 2026-03-08 |

## Giao việc

```
Khi được gọi:
1. Ban Biên tập cần reference → tìm bài mẫu cùng loại đề bài
2. Ban Kiểm duyệt cần đối chiếu → so sánh output với bài mẫu
3. Ban Phát triển cần rút pattern → phân tích bài mẫu bằng style-audit
```

## Khi nào tra cứu

- Khi chốt brief (mục "Chốt brief vừa đủ" trong SKILL.md): đề bài có tương tự bài mẫu nào không?
- Editorial nhận nhiệm vụ viết bài cùng loại → tra pattern-catalog tìm kỹ thuật phù hợp
- Review cần đối chiếu → output đạt chất lượng bài mẫu chưa?

## Khi nào cập nhật

- Chỉ lưu bài mẫu khi người dùng yêu cầu hoặc chấp thuận rõ ràng việc đưa nội dung đó vào skill. Một bài qua review không tự động cấp quyền lưu.
- docs/development/ (repo nguồn) phân tích bài viết bên ngoài → lưu pattern mới vào pattern-catalog.md

## Cam kết hoàn thành

- [ ] Bài mẫu có metadata đầy đủ (modules, ngày, loại đề bài)
- [ ] Bài mẫu đã được review/ thông qua và có quyền lưu vào skill

## Hợp đồng ban giao

- Nhận input từ: Ban Phát triển (bài mẫu mới cần lưu)
- Giao output cho: Bất kỳ ban nào cần reference
