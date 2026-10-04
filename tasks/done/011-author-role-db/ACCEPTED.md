Accepted: 2026-10-04. **E0** — TASK-011.

## Приёмка

- `0005_author_role.sql`, `vercel.json`; build/lint OK (фронт без изменений, кроме vercel).
- **0005 применена:** Success. **site_admins:** `sverdlov.y@yandex.ru` (не `sverdlovy@` — опечатка в TASK исправлена в CONTEXT).
- **Vercel F5:** пользователь — OK на `/stories/all` после push (2026-10-04).
- REST-проверка прода (кодер): parent_id, RPC revoke, таблицы закрыты анониму.

## Git

- `4042a5c` — 0005 + vercel.json
- `6f70d4e` — REPORT финал
- `435127c` — push + email в CONTEXT
- Архив приёмки — см. commit после F5 OK

## Следующий

TASK-012 — каркас `/admin`.
