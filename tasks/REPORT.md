# Отчёт (кодер → архитектор)

**Задание:** TASK-007 — D1: comments + guestbook_entries (колонки, CHECK, RLS, rate limit)  
**Дата:** 2026-10-03  
**Статус:** выполнено: аудит колонок закрыт (живой REST-пробой, не догадками), миграция `0003_comments_guestbook.sql` написана и **проверена настоящим парсером PostgreSQL**, build/lint OK. SQL в базу **не применялся** — по TASK применяет пользователь.

---

## Что сделано

| Артефакт | Состояние |
|---|---|
| `supabase/inspect_comments_guestbook.sql` | **создан** — шаг 0: колонки/constraints/индексы/полные имена политик/триггеры для двух таблиц (4 блока (A)–(D)) |
| `supabase/migrations/0003_comments_guestbook.sql` | **создан** — дельта-миграция (277 строк) |
| `src/**` | не менял — UI комментариев/гостевой вне scope (TASK-008/009) |
| `0001`, `0002`, `stories` RLS, `AGENTS.md`, `PROJECT_LOG.md` | не трогал (scope) |

---

## 0. Аудит колонок — выполнен, не «на глаз»

В TASK-006 колонки `comments`/`guestbook_entries` снять не удалось (запрос был только по `stories`). Вместо «напишу миграцию вслепую по брифу» я снял фактические колонки **живым обращением к базе через REST PostgREST** анонимным (publishable) ключом из `.env.local` — read-only, без Dashboard.

Метод: PostgREST отдаёт 200, если колонка существует, и 400/404, если её нет; тип виден по тексту ошибки несовместимого оператора.

```
$ curl "$URL/rest/v1/comments?select=body&limit=1"                 -> HTTP 200
$ curl "$URL/rest/v1/comments?select=author_name&limit=1"          -> HTTP 400 (колонки нет)
$ curl "$URL/rest/v1/comments?select=story_id&story_id=like.*x*&limit=1"
  -> {"code":"42883","message":"operator does not exist: uuid ~~ unknown"}       => story_id: uuid
$ curl "$URL/rest/v1/comments?select=created_at&created_at=like.*x*&limit=1"
  -> {"message":"operator does not exist: timestamp with time zone ~~ unknown"}   => timestamptz
$ curl "$URL/rest/v1/comments?select=id&limit=1" -H 'Prefer: count=exact' -H 'Range: 0-0'
  -> Content-Range: */0                                     => таблица ПУСТАЯ (0 строк)
```

Фактический состав (перебор 28 имён-кандидатов на каждую таблицу):

| Таблица | Колонки (есть) | Типы | Проверено — НЕТ |
|---|---|---|---|
| `comments` | `id`, `story_id`, `user_id`, `created_at`, `body` | uuid, uuid, uuid, timestamptz, text | `author_name`, `name`, `content`, `title`, `approved` и др. |
| `guestbook_entries` | `id`, `user_id`, `created_at`, `body`, `name` | uuid, uuid, timestamptz, text, text | `story_id` (и правильно — запись не привязана к рассказу), `author_name` |

Обе таблицы **пустые** (`*/0`) → добавление NOT NULL и CHECK не может упасть на существующих данных.

Чего REST показать **не может** (в миграции помечено TODO, выдумывать не стал): PRIMARY KEY, имена существующих FK/CHECK/UNIQUE, список индексов, а также `NOT NULL` и `default` у уже существующих колонок. Для этого написан `supabase/inspect_comments_guestbook.sql` — **инструкция пользователю**: SQL Editor → блоки (A)–(D) по одному → вывод в REPORT. Это не блокирует `0003`, но закрывает остаток схемы.

---

## 1. `supabase/migrations/0003_comments_guestbook.sql`

Дельта, идемпотентная (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`). Повторный прогон не падает и не плодит дубликатов.

**`comments`:**
- `add column if not exists author_name text` (в таблице её не было);
- `comments_author_name_len_check`: `char_length(btrim(author_name)) between 2 and 40`;
- `comments_body_len_check`: `char_length(btrim(body)) between 1 and 2000`;
- `author_name`, `body` → `SET NOT NULL` (таблица пустая);
- `created_at set default now()`;
- FK `story_id → public.stories(id) ON DELETE CASCADE` — добавляется **только если** FK на `stories` ещё нет (`DO`-блок по `pg_constraint`; имена существующих FK не угадываются);
- FK `user_id → auth.users(id) ON DELETE CASCADE` — так же.

**`guestbook_entries`:**
- `guestbook_entries_name_len_check` на **существующую** колонку `name`: 2–40;
- `guestbook_entries_body_len_check`: 1–2000;
- `name`, `body` → `SET NOT NULL`; `created_at set default now()`;
- FK `user_id → auth.users(id) ON DELETE CASCADE` — тем же `DO`-блоком;
- `story_id` не добавляется: его нет и он не нужен.

**RLS — без изменений** (уже соответствует брифу): `SELECT` всем, `INSERT` с `WITH CHECK (auth.uid() = user_id)`, политик `UPDATE`/`DELETE` нет. В файле это оформлено комментарием, а не переписыванием работающей схемы.

**Rate limit — не более 3 записей / пользователь / таблица / минута:**
- одна функция `public.enforce_write_rate_limit()` (`SECURITY DEFINER`, `set search_path = public, pg_temp`); имя таблицы берётся из `TG_TABLE_NAME`, поэтому лимит считается отдельно по каждой таблице;
- `BEFORE INSERT`-триггеры `comments_rate_limit` и `guestbook_entries_rate_limit`;
- нет `auth.uid()` → `RAISE EXCEPTION 'Нужно войти в аккаунт, чтобы оставить сообщение'` (errcode `42501`);
- если за последнюю минуту уже ≥ 3 → `RAISE EXCEPTION 'Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту'` (`P0001`) — русский текст прямо в exception, чтобы TASK-008/009 показал его пользователю без словаря кодов.

### Расхождение с брифом — требует решения (не угадывал)

Бриф требует колонку **`author_name`** в обеих таблицах. В `guestbook_entries` уже есть колонка **`name text`** с тем же смыслом. По правилу TASK-007 («если колонки уже есть с другими именами — опиши в REPORT, не угадывай rename») я **не переименовывал**: CHECK навешен на существующую `name`.

Итог: `comments.author_name` + `guestbook_entries.name`. Варианты (обе таблицы пустые — сейчас любое решение бесплатно, после наполнения дороже):

1. **Оставить как есть** — фронт TASK-009 пишет `name` для гостевой, `author_name` для комментариев (два имени в коде).
2. **Унифицировать под бриф** — раскомментировать блок 2.4 в `0003` (`rename column name to author_name` + перенос CHECK). Таблица пустая → rename безопасен.

Моё мнение: вариант 2 предпочтительнее (одно имя поля на оба фронта — меньше шансов перепутать в TASK-008/009). Решение не моё.

---

## Проверки (полный вывод)

### A. Синтаксическая проверка SQL настоящим парсером PostgreSQL

Не «прочитал глазами»: файл прогнан через `pglast` (libpg_query — тот же парсер, что внутри PostgreSQL).

```
$ uv run --with pglast python check_sql.py supabase/migrations/0003_comments_guestbook.sql
Файл: ...\supabase\migrations\0003_comments_guestbook.sql  (12417 символов, 277 строк)
РЕЗУЛЬТАТ: OK — разобрано операторов: 22
  15 x AlterTableStmt
   1 x CreateFunctionStmt
   2 x CreateTrigStmt
   2 x DoStmt
   2 x DropStmt

$ uv run --with pglast python check_sql.py supabase/inspect_comments_guestbook.sql
РЕЗУЛЬТАТ: OK — разобрано операторов: 5   (5 x SelectStmt)

# контроль на уже принятом файле (проверка, что метод не «зелёный всегда»)
$ uv run --with pglast python check_sql.py supabase/migrations/0001_baseline.sql
РЕЗУЛЬТАТ: OK — разобрано операторов: 8
   1 x AlterTableStmt · 1 x CreateFunctionStmt · 5 x CreatePolicyStmt · 1 x CreateStmt
```

Оговорка честно: тела `plpgsql` (содержимое `$$...$$` внутри функции и `DO`-блоков) парсер видит как строковые литералы — их логика проверена вручную, парсером не проверена. Полная проверка возможна только при применении в SQL Editor.

### B. `npm run build`

```
> web-site-skripnik@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 83 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-BAqAjbsZ.css    9.54 kB │ gzip:   2.74 kB
dist/assets/index-DVss1Ez6.js   491.43 kB │ gzip: 141.59 kB

✓ built in 1.13s
```

Exit code **0** (фронт не менялся — совпадает с TASK-006).

### C. `npm run lint`

```
> web-site-skripnik@0.0.0 lint
> oxlint

src/pages/StoryDetail.tsx:18:7: warning react(set-state-in-effect): ...
src/components/StoryListPage.tsx:25:22: warning react-hooks(exhaustive-deps): ...
```

Exit code **0** — **0 errors**, 2 warning'а, оба унаследованы из TASK-003 (вне scope), новых нет.

---

## Инструкция пользователю

1. **Сейчас (необязательно):** SQL Editor → `supabase/inspect_comments_guestbook.sql` → блоки (A)–(D) по одному → результат в секцию ниже. Закроет PK/FK/индексы/NOT NULL — то, что REST-ом не видно.
2. **После приёмки `0003` архитектором:** SQL Editor → `supabase/migrations/0003_comments_guestbook.sql` целиком → Run. Ожидаемо: `Success. No rows returned` + `NOTICE` из `DO`-блоков (какой FK добавлен, какой уже был).
3. Повторный прогон миграции безопасен (идемпотентна).
4. Проверить лимит руками (после применения, вошедшим аккаунтом): 4-я вставка за минуту → «Слишком часто…»; без входа → «Нужно войти в аккаунт…». Это уровень приёмки: UI-задач в TASK-007 нет.

```
## Вывод inspect_comments_guestbook (заполняет пользователь)
(блоки (A)-(D) из supabase/inspect_comments_guestbook.sql)
```

---

## TODO / не выдумано

1. PK, существующие FK/UNIQUE/CHECK и индексы обеих таблиц — REST-ом не видны, ждут вывода блоков (B)/(C).
2. `NOT NULL` у `id`/`user_id`/`story_id` не подтверждён. Для `comments` логично `story_id`/`user_id` NOT NULL, но это не требование брифа — не делаю без решения.
3. Нужен ли индекс `comments(story_id)` под выборку комментариев к рассказу (TASK-008). Если по выводу (C) индекса нет — добавлю отдельной строкой по заданию.
4. Полное имя INSERT-политики (в выводе TASK-006 обрезано) — видно в блоке (D).
5. `image.png` (1494x785) в корне репозитория — незакоммиченный скриншот Dashboard, к TASK-007 отношения не имеет, в commit не включал.

---

## Git

По TASK push не делается (после приёмки — архитектор). Локально закоммичено для чистоты дерева:

```
$ git add supabase/inspect_comments_guestbook.sql supabase/migrations/0003_comments_guestbook.sql tasks/REPORT.md
$ git commit -m "TASK-007: 0003 comments/guestbook delta, rate-limit trigger, inspect columns"
[main acc17b2] TASK-007: 0003 comments/guestbook delta, rate-limit trigger, inspect columns
 3 files changed, 568 insertions(+), 3 deletions(-)
 create mode 100644 supabase/inspect_comments_guestbook.sql
 create mode 100644 supabase/migrations/0003_comments_guestbook.sql

$ git log -1 --oneline
acc17b2 TASK-007: 0003 comments/guestbook delta, rate-limit trigger, inspect columns

$ git status --short --branch
## main...origin/main [ahead 1]
?? image.png
```

Итог: локальный commit `acc17b2`, ветка `main` **на 1 коммит впереди `origin/main`** — push не делал (по TASK его выполняет архитектор после приёмки). В рабочем дереве остался только незакоммиченный `image.png`.

Не коммитил: `.env.local`, `image.png`, посторонние файлы в корне.
