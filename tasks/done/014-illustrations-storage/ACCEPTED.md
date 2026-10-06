Accepted: 2026-10-06. **E3** — TASK-014.

## Приёмка

- Build/lint OK; bucket `illustrations` + SQL `0006` применены пользователем.
- **Живая проверка пользователя:** upload иллюстраций, отображение на `/stories/:id` — **OK**; CRUD рассказов — OK (см. REPORT).
- Hotfix архитектора: запись URL в `stories.illustrations` после upload (`b72b952`).

## Git

- `2fc2681`, `d9bfb12`, `b72b952` на `origin/main`.

## Следующий

TASK-015 — модерация и бан в `/admin`.
