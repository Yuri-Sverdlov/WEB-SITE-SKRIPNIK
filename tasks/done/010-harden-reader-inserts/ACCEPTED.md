Accepted: 2026-10-04. **D4 / hardening** — TASK-010.

## Приёмка

- `0004_harden_reader_inserts.sql` — соответствует брифу; build/lint OK (фронт без изменений).
- **0004 применена** пользователем: Success. No rows returned (2026-10-04).
- **a–d на Supabase:** пройдены (консоль + REST в REPORT); **(b) RLS** — 403, policy violation.
- **Тестовые строки:** уборка отложена до блока E (`/admin`, модерация) — решение пользователя 2026-10-04; SQL DELETE не выполнялся.

## Git (кодер)

- `4d1fa76` — миграция
- `27f0728`, `39f0f0f`, `911f707` — REPORT
- `f443c3f` — выдача TASK (архитектор)

## Артефакты вне git (не коммитить)

- `supabase/migrations/report-0004_harden_reader_inserts.txt` — локальный вывод пользователя
- `supabase/migrations/Удаление мусорных строк..txt` — obsolete после отложенной уборки
- `supabase/блоки (A)–(D)-SQL.txt` — inspect пользователя

## Следующий

Бриф **блока E** от консультанта.
