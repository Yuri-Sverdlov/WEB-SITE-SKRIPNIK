# Задание (архитектор → кодер)

**ID:** TASK-006  
**Дата:** 2026-10-02  
**Статус:** к выполнению — **закрытие сессии** (commit + push)  
**Блок:** D0 — фундамент базы + хвосты  

---

## Сейчас (приоритет): подсобрать сессию и обновить GitHub

**Первое действие:** `git pull`

Уже сделано в рабочей копии (не потерять):

- `supabase/inspect.sql`
- `supabase/Вывод inspect-sql.txt` — вывод SQL Editor от пользователя (все блоки (1)–(5))
- `src/pages/Home.tsx` — без отладочного `select('*')`
- черновик `tasks/REPORT.md`

**Архитектор проверил вывод inspect:** `0002_stories_rls.sql` **не создавать** (RLS на `stories` уже ON, только SELECT; `increment_story_views` уже `SECURITY DEFINER`). Пользователь: аккаунт `test.hermes.skripnik@gmail.com` **подтверждён**; мусорный jpg удалён.

### 1. `supabase/migrations/0001_baseline.sql`

Написать **по** `supabase/Вывод inspect-sql.txt` (не выдумывать):

- Комментарий в шапке: snapshot baseline, дата, «не применять вслепую на уже настроенную БД».
- DDL таблицы **`stories`** — колонки из вывода (3).
- **`increment_story_views`** — из `full_definition` (4); нормализовать переносы строк (в txt бывают `<br>`).
- **Политики RLS** из (2): `stories`, `comments`, `guestbook_entries` (имена политик и выражения как в базе).
- Таблицы `comments` / `guestbook_entries`: в inspect нет DDL колонок — в baseline добавить **комментарий**, что таблицы уже существуют в проекте; зафиксировать **политики**; полный CREATE TABLE — в TASK-007 после сверки.

**Не создавать** `0002_stories_rls.sql`. В REPORT явно: «0002 не требуется» + краткое обоснование (3–5 строк по фактам из inspect).

**Не применять** миграции в SQL Editor — только файлы в git. Пользователь применяет позже, когда архитектор попросит.

### 2. `tasks/REPORT.md`

Переписать/дополнить под **фактическое** состояние:

- Ссылка на `supabase/Вывод inspect-sql.txt` (можно не дублировать весь текст, если файл в репо).
- Таблица миграций: `0001` — создан; `0002` — не нужен.
- П.4 Auth: если **нет** пароля в хранилище Hermes — секция «Auth (живые проверки)»: **не выполнено кодером**; note: пользователь подтвердил email в Dashboard; шаги 1–4 (вход на `/login`, шапка, выход, F5, неверный пароль) — **ожидают ручной проверки пользователя** (пароль в git/чат не писать). Если хранилище появилось — выполнить и описать.
- Полный вывод `npm run build` и `npm run lint`.
- Git: hash и push после commit.

### 3. `CONTEXT.md` (разрешено этим TASK)

- Auth: тестовый аккаунт подтверждён (Dashboard, 2026-10-02); живой вход на сайте — при приёмке TASK-006.
- Одна строка в «Решения» или фокус: в БД уже есть `comments` + `guestbook_entries` (RLS как в inspect) — TASK-007 сверит с `0003`.

### 4. Проверки

- `npm run build` — exit 0  
- `npm run lint` — без **новых** errors  

### 5. Git — **обязательно в этом TASK**

```text
git add supabase/ src/pages/Home.tsx tasks/REPORT.md tasks/TASK.md CONTEXT.md
git status
git commit -m "TASK-006: inspect, baseline SQL, Home без дампа, вывод audit"
git push origin main
```

В REPORT: `git log -1 --oneline` и подтверждение push.

**Не коммитить:** `.env.local`, секреты, посторонние файлы в корне.

---

## Scope — не трогать

- UI комментариев/гостевой (TASK-008/009).
- `0003`, `0002`.
- `PROJECT_LOG.md` (допишет архитектор после приёмки).
- `AGENTS.md`.

---

## Критерии приёмки (архитектор)

- [ ] `0001_baseline.sql` согласован с `Вывод inspect-sql.txt`
- [ ] `0002` отсутствует, обосновано в REPORT
- [ ] Home без дампа stories
- [ ] build + lint OK
- [ ] push в `main` выполнен

---

## Отчёт

**`tasks/REPORT.md`** — финальная версия после push.
