Accepted: 2026-10-03. **Блок D0** — аудит Supabase, baseline, Home.tsx — TASK-006.

## Приёмка архитектора

- `npm run build` — OK (exit 0, vite 8.3.0, 83 модуля).
- `npm run lint` — 0 errors; 2 warnings унаследованы из TASK-003.
- `supabase/inspect.sql`, `supabase/Вывод inspect-sql.txt`, `supabase/migrations/0001_baseline.sql` — согласованы с выводом inspect.
- **`0002_stories_rls.sql` не создан** — обосновано: RLS ON на `stories`, только SELECT; `increment_story_views` уже SECURITY DEFINER.
- `src/pages/Home.tsx` — без отладочного дампа `stories`.
- Git: `ce0bbb0` (+ `b2102fd` REPORT hash) на `origin/main`.

## Не закрыто (документировано, не блокирует D1)

- **Auth вживую** (вход, шапка, выход, F5, неверный пароль) — кодером не проверено; email подтверждён пользователем в Dashboard. Закрыть при ручной проверке на `/login` или перед финалом блока D.
- **TODO в baseline:** PK/constraints/index `stories`; DDL колонок `comments` / `guestbook_entries` — в TASK-007.
- **Hardening:** `search_path` у SECURITY DEFINER — отдельная миграция по желанию.

## Следующий шаг

TASK-007 — сверка/дельта схемы comments + guestbook_entries, лимит 3/мин.
