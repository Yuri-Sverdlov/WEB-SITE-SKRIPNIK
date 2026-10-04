# Отчёт (кодер → архитектор)

**Задание:** TASK-010 — hardening INSERT читателя, миграция `0004_harden_reader_inserts.sql`  
**Дата:** 2026-10-03 (код) · 2026-10-04 (применение и проверки B/C)  
**Статус:** миграция написана и проверена на настоящем PostgreSQL 16.2 локально; build/lint OK; фронт не менялся.  
**`0004` применена пользователем в Supabase — `Success. No rows returned`.** Проверки **a, b, c, d — выполнены и пройдены** (вывод пользователя + независимая проверка значений по REST).  
**Тестовые строки:** уборка отложена до блока E (решение пользователя, 2026-10-04) — через `/admin`, приёмочный тест модерации; SQL DELETE из раздела «Уборка» **не выполнять**. Push не делал.

---

## Что сделано

**Новый файл:** `supabase/migrations/0004_harden_reader_inserts.sql` (5779 символов, 134 строки).

Идемпотентно: только `create or replace function`, объекты заново не создаются, триггеры не пересоздаются (они из 0003 уже указывают на эту функцию).

| Пункт TASK | Как реализовано |
|---|---|
| 1.1 `enforce_write_rate_limit()` — `NEW.created_at := now()` | в начале тела, **до** `count(*)`; действует для `comments` и `guestbook_entries` |
| 1.1 `is_author_reply := false` только для comments | `if tg_table_name = 'comments' then new.is_author_reply := false; end if;` — на `guestbook_entries` колонки нет, ветка не выполняется |
| 1.1 остальная логика без изменения смысла | вход обязателен («Нужно войти в аккаунт, чтобы оставить сообщение»), лимит `>= 3` за минуту, текст «Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту», `SECURITY DEFINER`, `set search_path = public, pg_temp` — дословно как в 0003 |
| 1.2 `increment_story_views(uuid)` | тело UPDATE как в 0001 + `set search_path = public, pg_temp` |
| комментарий «применяет только пользователь» | шапка файла: применяет пользователь в SQL Editor, кодер в прод не деплоит |

В файле также: блок проверочных запросов после применения (pg_proc + pg_trigger) и блок «Откат» со ссылками на определения 0001/0003.

**Не тронуто:** RLS-политики, UI комментариев/гостевой, `App.tsx`, `src/**` (фронт не менялся вообще), `.env.local`, база Supabase (SQL в прод не отправлял).

---

## Проверки (полный вывод)

### A1. Синтаксис SQL настоящим парсером PostgreSQL (`pglast`)

```
Файл: G:\_MY-PROGRAMMING_3\WEB-SITE-SKRIPNIK\supabase\migrations\0004_harden_reader_inserts.sql  (5779 символов, 134 строки)
РЕЗУЛЬТАТ: OK — разобрано операторов: 2
   2 x CreateFunctionStmt
```

### A2. Поведение триггеров на настоящем PostgreSQL (локальный одноразовый кластер)

Парсер видит тело plpgsql как литерал, поэтому я поднял **реальный PostgreSQL 16.2** локально
(`uv run --with pgserver` — wheel с бинарями Postgres, кластер в scratch; **не прод Supabase**),
создал схему под Supabase (`auth.uid()`, `stories`, `comments`, `guestbook_entries`), применил
миграцию дважды и прогнал сценарии a, c, d и оба «отказных» случая:

```
NOTICE:  schema "auth" already exists, skipping
ERROR:  Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту
CONTEXT:  PL/pgSQL function enforce_write_rate_limit() line 29 at RAISE
ERROR:  Нужно войти в аккаунт, чтобы оставить сообщение
CONTEXT:  PL/pgSQL function enforce_write_rate_limit() line 7 at RAISE
PostgreSQL-кластер: C:\Users\Yuri\AppData\Local\hermes\cache\scratch\pgdata-task010

--- версия сервера ---
version
------------------------------------------------------------------------------------------------------------------------------
 PostgreSQL 16.2 on x86_64-pc-mingw64, compiled by gcc.exe (x86_64-posix-seh-rev2, Built by MinGW-W64 project) 12.2.0, 64-bit
(1 row)

--- схема-заготовка (auth.uid, stories, comments, guestbook_entries, триггеры) ---
CREATE SCHEMA
CREATE FUNCTION
DROP TABLE
DROP TABLE
DROP TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
INSERT 0 1

--- ПРИМЕНЕНИЕ 0004 ---
CREATE FUNCTION
CREATE FUNCTION

--- повторное ПРИМЕНЕНИЕ 0004 (идемпотентность) ---
CREATE FUNCTION
CREATE FUNCTION

--- триггеры comments/guestbook на enforce_write_rate_limit (как в 0003) ---
CREATE TRIGGER
CREATE TRIGGER

--- функции: SECURITY DEFINER и search_path ---
proname          | security_definer |            proconfig
--------------------------+------------------+---------------------------------
 enforce_write_rate_limit | t                | {"search_path=public, pg_temp"}
 increment_story_views    | t                | {"search_path=public, pg_temp"}
(2 rows)

--- (a) comments: created_at='2000-01-01', is_author_reply=true -> ожидаем now() и false ---
SET
          created_at           | is_author_reply | created_at_seichas
-------------------------------+-----------------+--------------------
 2026-10-03 17:11:40.541141+00 | f               | t
(1 row)

--- (c) insert #2 (тоже с поддельным created_at) ---
SET
          created_at           | is_author_reply
-------------------------------+-----------------
 2026-10-03 17:11:40.594858+00 | f
(1 row)

--- (c) insert #3 (тоже с поддельным created_at) ---
SET
          created_at           | is_author_reply
-------------------------------+-----------------
 2026-10-03 17:11:40.637768+00 | f
(1 row)

--- (c) insert #4 -> ожидаем русскую ошибку rate limit ---
SET

--- guestbook: created_at='1999-12-31' -> ожидаем now() ---
SET
          created_at           | created_at_seichas
-------------------------------+--------------------
 2026-10-03 17:11:40.731094+00 | t
(1 row)

--- guestbook без входа -> ожидаем 'Нужно войти в аккаунт' ---
SET

--- (d) views_count до ---
views_count
-------------
          10
(1 row)

--- (d) вызов increment_story_views ---
increment_story_views
-----------------------
(1 row)

--- (d) views_count после ---
views_count
-------------
          11
(1 row)

--- итог: строк в comments ---
comments_rows
---------------
             3
(1 row)

--- итог: строк в guestbook ---
guestbook_rows
----------------
              1
(1 row)

--- триггеры по-прежнему на месте ---
tbl        |            tgname
-------------------+------------------------------
 comments          | comments_rate_limit
 guestbook_entries | guestbook_entries_rate_limit
(2 rows)

=== ГОТОВО ===
```

Пояснение к выводу: две строки `ERROR:` стоят в самом начале, потому что `psql` пишет их в **stderr**,
а `pgserver` отдаёт stderr отдельно от stdout таблиц. Это ровно те два ожидаемых отказа:
`insert #4` (лимит) и `insert без входа`. Обе ошибки — **из триггера**
(`PL/pgSQL function enforce_write_rate_limit() line 29 / line 7`), а не из CHECK/NOT NULL.

**Вывод по сценариям:**

| # | Ожидание TASK | Факт локального прогона |
|---|---|---|
| a | insert успешен, `created_at` ≈ сейчас, `is_author_reply = false` | да: `2026-10-03 17:11:40.541141+00`, `f`, флаг `created_at_seichas = t` |
| c | 4-я запись отклонена русским текстом | да: 3 прошли (все с поддельным `2000-01-01`, и все получили `now()`), 4-я — ERROR «Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту» |
| d | счётчик растёт | да: `views_count` 10 → 11; обе функции `SECURITY DEFINER` с `search_path=public, pg_temp` |
| b | чужой `user_id` — отклонён RLS | локально **не проверялось**: RLS-политики живут в Supabase (в 0004 их нет); это проверка в консоли на проде — см. B/C ниже |
| доп. | `guestbook_entries`: подделка `created_at` | да: `1999-12-31` → `now()`, `is_author_reply` не трогается (колонки нет) |
| доп. | без входа | да: «Нужно войти в аккаунт, чтобы оставить сообщение» |
| доп. | идемпотентность | да: второй прогон файла — снова CREATE FUNCTION ×2, без ошибок |

Скрипт проверки лежит вне репозитория: `C:\Users\Yuri\AppData\Local\hermes\cache\scratch\task010_pg_check.py` (в git не коммитил — одноразовая проверка, не часть проекта).

### A3. `npm run build`

```
> web-site-skripnik@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 88 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-Dmef0ZPX.css   10.02 kB │ gzip:   2.82 kB
dist/assets/index-B-l5ZsJg.js   499.32 kB │ gzip: 143.96 kB

✓ built in 1.16s
```

Exit code **0** (88 модулей — как в 009, фронт не менялся).

### A4. `npm run lint`

```
> web-site-skripnik@0.0.0 lint
> oxlint

src/pages/StoryDetail.tsx:32:7: warning react(set-state-in-effect): ...
src/components/StoryListPage.tsx:25:22: warning react-hooks(exhaustive-deps): ...
```

Exit code **0** — **0 errors**, те же 2 унаследованных warning'а, новых нет.

---

## B. Применение `0004` в Supabase SQL Editor — **выполнено пользователем**

**Результат (пользователь, 2026-10-04): `Success. No rows returned`** — то есть оба
`create or replace function` прошли без ошибок (это и есть ожидаемый вывод: файл не возвращает строк).

Пользователь сохранил вывод консольных проверок в
`supabase/migrations/report-0004_harden_reader_inserts.txt` (не в git — вне репозитория).

Откат при необходимости — по блоку «Откат» в конце `0004` (определения функции из `0001`/`0003`).

---

## C. Проверки в консоли браузера (за пользователем)

Нужен вход **тестовым** аккаунтом (`test.hermes.skripnik@gmail.com`) на dev-сайте (`npm run dev`,
http://localhost:5173). DevTools → Console **на любой странице сайта**. Вставить одним блоком:

```js
// --- подготовка: клиент с текущей сессией + реальные id ---
const mod = await import('/src/api/supabaseClient.ts')
const supabase = mod.supabase
const { data: { user } } = await supabase.auth.getUser()
const { data: stories } = await supabase.from('stories').select('id').limit(1)
const storyId = stories[0].id
console.log('user.id =', user?.id, '| story_id =', storyId)
```

(на Vite dev-сервере модули отдаются по исходным путям, поэтому `/src/api/supabaseClient.ts` резолвится;
если у вас не сработает — скажите, дам вариант через бандл)

```js
// (a) подделка служебных полей: старый created_at + is_author_reply=true
const a = await supabase.from('comments').insert({
  story_id: storyId, user_id: user.id, author_name: 'Тест A',
  body: 'проверка a: поддельные created_at и is_author_reply',
  created_at: '2000-01-01T00:00:00Z', is_author_reply: true,
}).select('created_at, is_author_reply')
console.log('(a) ожидаю: created_at ≈ сейчас, is_author_reply=false ->', a)

// (b) чужой user_id
const b = await supabase.from('comments').insert({
  story_id: storyId, user_id: '00000000-0000-0000-0000-000000000000',
  author_name: 'Тест B', body: 'проверка b: чужой user_id',
}).select('id')
console.log('(b) ожидаю ошибку RLS ->', b.error?.message ?? b)

// (c) 4 записи подряд (все с поддельным created_at)
for (let i = 1; i <= 4; i++) {
  const c = await supabase.from('comments').insert({
    story_id: storyId, user_id: user.id, author_name: 'Тест C',
    body: `проверка c${i}`, created_at: '2000-01-01T00:00:00Z',
  }).select('id')
  console.log(`(c) #${i}`, c.error ? 'ОШИБКА: ' + c.error.message : 'OK')
}

// (d) счётчик просмотров
const before = await supabase.from('stories').select('views_count').eq('id', storyId).single()
await supabase.rpc('increment_story_views', { story_id_input: storyId })
const after = await supabase.from('stories').select('views_count').eq('id', storyId).single()
console.log('(d) views_count', before.data?.views_count, '->', after.data?.views_count)
```

**Фактические результаты (пользователь, 2026-10-04; сохранённый вывод — `supabase/migrations/report-0004_harden_reader_inserts.txt`)**

Сырые строки из консоли пользователя:

```
VM3708:7 user.id = 176142a0-be7d-4bdb-bf5f-60421841dffc | story_id = 55c8e74c-822b-4c8d-9899-c1d8e001f3e4
VM4328:7 (a) ожидаю: created_at ≈ сейчас, is_author_reply=false -> {success: true, error: null, data: Array(1), count: null, status: 201, …}
index.mjs:263  POST https://…/rest/v1/comments?select=id 403 (Forbidden)
VM4680:6 (b) ожидаю ошибку RLS -> new row violates row-level security policy for table "comments"
VM5212:7 (c) #1 OK
VM5212:7 (c) #2 OK
VM5212:7 (c) #3 OK
index.mjs:263  POST https://…/rest/v1/comments?select=id 400 (Bad Request)
VM5212:7 (c) #4 ОШИБКА: Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту
VM5857:5 (d) views_count 320 -> 321
```

Результат (a) в консоли был показан **свёрнутым** (`data: Array(1), …`), поэтому значения полей
я добрал независимо, **только чтением** по REST (anon-ключ, `select`):

```
=== comments (все строки, старые сверху) ===
 1. 2026-10-03T15:56:18.168835+00:00  flags=False  'yuri': Мне нравится.
 2. 2026-10-03T16:07:56.685194+00:00  flags=False  'yuri': Не понравился рассказ.
 3. 2026-10-03T16:08:15.49768+00:00   flags=False  'yuri': Очень хороший рассказ.
 4. 2026-10-03T16:08:24.379115+00:00  flags=False  'yuri': Рассказ мне понравился очень.
 5. 2026-10-04T08:03:30.484101+00:00  flags=False  'Тест A': проверка a: поддельные created_at и is_author_reply
 6. 2026-10-04T08:05:03.141832+00:00  flags=False  'Тест C': проверка c1
 7. 2026-10-04T08:05:03.372896+00:00  flags=False  'Тест C': проверка c2
 8. 2026-10-04T08:05:03.591446+00:00  flags=False  'Тест C': проверка c3
ВСЕГО: 8
Content-Range: 0-7/*

=== счётчик рассказа 55c8e74c… (Дорога домой) ===
{ "title": "Дорога домой", "views_count": 321 }
```

Что это доказывает по каждому пункту:

| # | Ожидание | Факт (пользователь + чтение по REST) |
|---|---|---|
| (a) | insert успешен, `created_at` ≈ сейчас, `is_author_reply = false` | `status: 201`, `error: null`; строка №5 записана с **`2026-10-04T08:03:30`** (а не `2000-01-01`) и **`is_author_reply = false`** (а payload просил `true`) — **пройдено** |
| (b) | отказ **RLS**, не триггера | `403 Forbidden`, `new row violates row-level security policy for table "comments"` — **пройдено** |
| (c) | 3 проходят, 4-я — русским текстом | `#1..#3 OK`; `#4` → `400 Bad Request` + «Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту»; в таблице ровно **3** строки «Тест C» (№6–8), четвёртой нет — **пройдено** |
| (d) | счётчик растёт | `views_count 320 → 321`; независимо подтверждено чтением: **321** — **пройдено** |

Отдельно отмечу: все три успешные записи (a и c1–c3) шли с `created_at: '2000-01-01'`, но получили
`2026-10-04T08:03…08:05` — то есть подделка даты сервером перезаписана, а лимит считает уже по
настоящему времени. Это и была цель TASK-010.

Таблица ожиданий из инструкции (для сверки):

| # | Ожидание |
|---|---|
| (a) | `error: null`, в `data[0]`: `created_at` ≈ текущее время, `is_author_reply: false` |
| (b) | `error.message` вида `new row violates row-level security policy for table "comments"` — отказ **RLS**, не триггера |
| (c) | `#1..#3` → `OK`, `#4` → `ОШИБКА: Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту` |
| (d) | число справа на 1 больше |

## Уборка тестовых строк — что именно и как (пункт 3)

> **Решение пользователя (2026-10-04):** уборка **отложена** до блока E. SQL ниже **не выполнять** (справочно / для блока E).

**Почему это за пользователем:** удалять строки в вашем Supabase может только владелец проекта
в SQL Editor (RLS запрещает удаление с anon/authenticated-ключом: политик DELETE нет вовсе, и
это правильно). Кодер в прод не пишет и не удаляет — у меня нет ни прав, ни service-ключа.

**Что подлежит удалению — ровно 4 строки**, созданные проверками (a) и (c) 2026-10-04:

| id строки (по порядку в ленте) | author_name | body |
|---|---|---|
| №5 | `Тест A` | `проверка a: поддельные created_at и is_author_reply` |
| №6 | `Тест C` | `проверка c1` |
| №7 | `Тест C` | `проверка c2` |
| №8 | `Тест C` | `проверка c3` |

**Строки №1–4 (`yuri`: «Мне нравится.» и др.) — НЕ мои тестовые:** это ваши проверки приёмки
TASK-008. Удалять их или оставить — решаете вы: они видны посетителям рассказа «Дорога домой».
Под фильтр `body like 'проверка %'` они не попадают.

**Шаг 1 — посмотреть, что будет удалено** (Supabase → SQL Editor → New query → вставить → Run):

```sql
select id, author_name, body, created_at, is_author_reply
  from public.comments
 where body like 'проверка %'
 order by created_at;
```

Ожидаемый вывод: 4 строки — «Тест A: проверка a…» и три «проверка c1/c2/c3».
Если строк больше или меньше — **остановитесь и покажите мне вывод**, разберём.

**Шаг 2 — удалить их**:

```sql
delete from public.comments
 where body like 'проверка %';
```

Ожидаемый вывод редактора: `DELETE 4` (или «Success. 4 rows affected» — зависит от версии
редактора). Если увидите число, отличное от 4, напишите мне — значит под фильтр попало что-то ещё.

**Шаг 3 — убедиться, что осталось только «настоящее»**:

```sql
select count(*) as всего_комментариев from public.comments;
```

Ожидаемо: **4** (строки `yuri`). После этого в REPORT ставится отметка
**«удалено пользователем: DELETE 4 (2026-10-04)»** — я впишу её сам, как только вы пришлёте вывод
шага 2/3. До этого в отчёте стоит «не удалялось».

**Отдельно, справочно:** в `guestbook_entries` лежат 5 строк от ваших ручных проверок
(«yuri» ×3 и «РКККК» ×2, одна с вставленным текстом про Equalizer APO). К моим сниппетам они
отношения не имеют и в TASK-010 не входят — удалять их или нет, ваш выбор; могу оформить
отдельной строкой в отчёте, если скажете.

**Чего делать не нужно:** ничего не восстанавливайте вручную; функция и триггеры после удаления
строк работают как прежде (DELETE их не касается), счётчик просмотров `321` не откатывается.

---

## Ограничения и честные оговорки

1. **A2 — модель, а не прод:** всё в разделе A2 сделано на локальном одноразовом PostgreSQL 16.2,
   а не в вашем Supabase. Схема-заготовка повторяет типы и функцию `auth.uid()`. После того как
   пользователь применил `0004` (`Success. No rows returned`) и прогнал сценарии, поведение
   подтверждено **уже на проде** — см. разделы B и C (там же: `auth.uid()` настоящая, JWT-claim).
2. **`auth.uid()` в локальном тесте подменена** на чтение GUC `app.test_uid` (в Supabase это JWT-claim).
   Поэтому «без входа» и «вошёл» воспроизведены верно, но сама **RLS-политика** локально отсутствует —
   проверка (b) пройдена уже **на проде** (раздел C, `403` + `new row violates row-level security policy`),
   а локально честно помечена как непроверенная.
3. **`search_path` у `enforce_write_rate_limit`** был в 0003, в 0004 сохранён. Новое в 0004 —
   `search_path` у `increment_story_views` (подтверждено в `proconfig`).
4. В выводе (c) три записи получили три разных `created_at` — это разные транзакции psql, поэтому
   лимит считает по ним корректно; поддельный `2000-01-01` в payload на подсчёт больше не влияет.

---

## Git

Локальный commit только своих файлов (`supabase/migrations/0004_harden_reader_inserts.sql`, `tasks/REPORT.md`):

```
$ git add supabase/migrations/0004_harden_reader_inserts.sql tasks/REPORT.md
$ git commit -m "TASK-010: миграция 0004 — hardening INSERT (created_at/is_author_reply) + search_path"
[main 4d1fa76] TASK-010: миграция 0004 — hardening INSERT (created_at/is_author_reply) + search_path
 2 files changed, 461 insertions(+), 3 deletions(-)
 create mode 100644 supabase/migrations/0004_harden_reader_inserts.sql

$ git log --oneline -3
4d1fa76 TASK-010: миграция 0004 — hardening INSERT (created_at/is_author_reply) + search_path
f443c3f TASK-010 выдан: hardening reader INSERT (0004), бриф консультанта
32cddde Процесс: явный вопрос перед push и отчёт push был/не был

$ git status --short --branch
## main...origin/main [ahead 3]
?? "supabase/блоки (A)–(D)-SQL.txt"   <- вывод пользователя, не коммитил
```

Push **не делал** (TASK: push — архитектор после приёмки и разрешения пользователя).

Обновление отчёта после выполнения проверок пользователем (2026-10-04):

```
$ git commit -m "REPORT TASK-010: 0004 применена (Success), проверки a-d пройдены, инструкция уборки тестовых строк"
[main 27f0728] REPORT TASK-010: ...
 1 file changed, 116 insertions(+), 21 deletions(-)

$ git log --oneline -4
27f0728 REPORT TASK-010: 0004 применена (Success), проверки a-d пройдены, инструкция уборки тестовых строк
39f0f0f REPORT: git hash для TASK-010
4d1fa76 TASK-010: миграция 0004 — hardening INSERT (created_at/is_author_reply) + search_path
f443c3f TASK-010 выдан: hardening reader INSERT (0004), бриф консультанта

$ git status --short --branch
## main...origin/main [ahead 4]
?? supabase/migrations/report-0004_harden_reader_inserts.txt   <- вывод пользователя, не коммитил
```

Не коммитил: `.env.local`, `supabase/блоки (A)–(D)-SQL.txt`, `dist/`, скрипт проверки из scratch (вне репозитория).
