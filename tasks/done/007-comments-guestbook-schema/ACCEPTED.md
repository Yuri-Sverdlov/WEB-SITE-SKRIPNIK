Accepted: 2026-10-03. **Блок D1** — TASK-007.

## Приёмка

- `0003_comments_guestbook.sql` — дельта, идемпотентная; rate limit 3/мин; RLS не менялся (комментарий).
- REST-аудит колонок — обоснован; `inspect_comments_guestbook.sql` для пользователя.
- build/lint OK (2 warnings TASK-003).
- **Решение архитектора:** вариант B — `guestbook_entries.name` → **`author_name`** (правка в `0003` блок 2.0, commit приёмки).

## Git

- `acc17b2` TASK-007 кодер
- `ef89967` REPORT hash
- push + правка rename — см. commit приёмки

## Пользователь

Применить **`supabase/migrations/0003_comments_guestbook.sql`** в SQL Editor после `git pull`. Опционально: `inspect_comments_guestbook.sql` (A)–(D).

## Следующий

TASK-008 — UI комментариев (`author_name` в обеих сущностях).
