# Задание (архитектор → кодер)

**ID:** TASK-007  
**Дата:** 2026-10-03  
**Статус:** к выполнению  
**Блок:** D1 — схема comments + guestbook, RLS, rate limit  
**Предшественник:** TASK-006 принят (`tasks/done/006-db-baseline/`, commit `ce0bbb0`).

---

## Цель

Привести таблицы **`comments`** и **`guestbook_entries`** (в БД уже есть — см. baseline) к требованиям брифа блока D: колонки, CHECK, RLS, лимит **3 записи / пользователь / таблица / минута**. Миграция — **дельта**, не «с нуля вслепую».

**SQL в Supabase применяет только пользователь.** Ты пишешь `supabase/migrations/0003_comments_guestbook.sql` и инструкции в REPORT.

---

## Контекст (факты TASK-006)

- Baseline: `supabase/migrations/0001_baseline.sql`, вывод: `supabase/Вывод inspect-sql.txt`.
- Уже есть RLS: SELECT всем; INSERT с `auth.uid() = user_id`. Политик UPDATE/DELETE нет.
- Имена политик в Dashboard могут быть **обрезаны** в выводе inspect — сверить реальные имена через SQL или Dashboard.
- Бриф консультанта говорил `guestbook` — в проекте таблица **`guestbook_entries`**. **Не переименовывать** без решения пользователя; фронт (TASK-009) подстраивается под имя таблицы.

---

## 0. Аудит колонок (обязательно)

Добавить в `supabase/inspect.sql` **или** отдельный файл `supabase/inspect_comments_guestbook.sql` запросы колонок/constraints для `comments` и `guestbook_entries` (аналог блока (3) для stories).

Пользователь выполняет в SQL Editor → вывод в REPORT (или ссылка на файл в репо, если пользователь положит txt).

**Без вывода** — миграцию писать только на **известные** изменения из брифа (CHECK, trigger), с TODO на неизвестные колонки.

---

## 1. Требования брифа (целевое состояние)

### comments

- `story_id` → `stories(id)` ON DELETE CASCADE  
- `user_id` → `auth.users`  
- `author_name` TEXT, **2–40** символов (CHECK)  
- `body` TEXT, **1–2000** символов (CHECK)  
- `created_at` timestamptz (default now(), если нет)

### guestbook_entries (не `guestbook`)

- `user_id`, `author_name` (2–40), `body` (1–2000), `created_at` — те же идеи CHECK  

### RLS (если уже совпадает — в миграции только комментарий «без изменений»)

- Читать — всем  
- INSERT — только authenticated, `user_id = auth.uid()`  
- UPDATE/DELETE — никому  

### Rate limit

- Триггер **BEFORE INSERT**: если у `auth.uid()` уже **≥ 3** строк в **этой таблице** за последнюю **минуту** — `RAISE EXCEPTION` с **понятным текстом** (на русском или код + маппинг на фронте в TASK-008 — предпочтительно русский текст в exception message).

---

## 2. `0003_comments_guestbook.sql`

- Идempotent где возможно (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`, и т.д.).
- Не ломать существующие данные: если колонки уже есть с другими именами — **опиши в REPORT**, не угадывай rename.
- **Не применять** самому — пользователь выполнит в SQL Editor после приёмки файла архитектором.

---

## Scope — не трогать

- UI комментариев/гостевой (TASK-008/009).
- `0001`, `0002`.
- `stories` RLS (уже OK).
- `AGENTS.md`, `PROJECT_LOG.md`.

---

## Проверки (полный вывод в REPORT)

- `npm run build` — exit 0 (ожидается без изменений фронта; всё равно прогнать).
- `npm run lint` — без новых errors.

---

## Git

**Не push** — после приёмки архитектор (если в TASK не сказано иное). Commit локально можно, если удобно.

---

## Отчёт

**`tasks/REPORT.md`**
