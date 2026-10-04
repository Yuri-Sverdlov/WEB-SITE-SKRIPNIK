# Отчёт (кодер → архитектор)

**Задание:** TASK-011 (E0) — миграция `0005_author_role.sql`: роль автора, защита и бан в БД  
**Дата:** 2026-10-04  
**Статус:** миграция написана и **проверена на настоящем PostgreSQL 16.2 локально** (58 шагов, 0 провалов); build/lint OK; `vercel.json` добавлен (нужен — 404 подтверждён на проде).  
**За пользователем:** `0005` **применена** (`Success. No rows returned`), права автора **выданы** (подтверждено строкой в `site_admins`: `sverdlov.y@yandex.ru`, 2026-10-04 15:51:30+00), `reserved_author_names` = **9**; остаётся шаг Vercel F5 после push (+ переменные окружения Vercel уже добавлены, см. раздел D).  
**Push не делал.**

---

## 1. Что сделано

**Новый файл:** `supabase/migrations/0005_author_role.sql` (22 321 байт, ~460 строк).
**Новый файл:** `vercel.json` (96 байт, SPA-rewrite — см. раздел D).
**Фронт `src/**` не менялся вообще.**

| Пункт TASK | Как реализовано |
|---|---|
| 1.1 Роль автора | `public.site_admins (user_id PK → auth.users ON DELETE CASCADE, created_at)`, RLS ON; `public.is_admin()` — SQL, `STABLE`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, читает `site_admins` в обход RLS (владелец таблицы), поэтому рекурсии политик нет |
| 1.2 `stories` | добавлены политики `stories_admin_insert` / `_update` / `_delete` (`is_admin()`); существующая `Публичное чтение рассказов` не тронута; других политик записи на `stories` в БД не было (сверено с `supabase/Вывод inspect-sql.txt`) |
| 1.3 `comments`, `guestbook_entries` | добавлены `comments_admin_delete`, `guestbook_entries_admin_delete` (`is_admin()`); политики чтения и INSERT читателя (`auth.uid() = user_id`) — как были, не ослаблены |
| 1.4 Ответы автора (схема) | `comments.parent_id uuid` + FK `comments_parent_id_fkey → comments(id) ON DELETE CASCADE` (добавляется DO-блоком, если такого FK ещё нет) + индекс `comments_parent_id_idx` |
| 1.5 Триггер | `enforce_write_rate_limit()` заменён: бан → hardening (`created_at := now()`, `is_author_reply := false`, `parent_id := null`) → запрещённые имена → лимит 3/мин — **только для не-автора**; для `is_admin()` — без лимита, без проверки имён, `is_author_reply`/`parent_id` как прислал, подпись ответа из `author_display_name()` |
| 1.6 Бан | `public.banned_users (user_id PK → auth.users, banned_at default now(), reason text)`, RLS ON, политика `banned_users_admin_all` (`for all`, `using`/`with check` = `is_admin()`) |
| 1.7 RPC модерации | **`admin_count_user_messages(target_user_id uuid)`** → `(comments_count, guestbook_count, author_replies_count)`; **`admin_delete_user_messages(target_user_id uuid)`** → `(comments_deleted, guestbook_deleted, author_replies_deleted)`. Обе `SECURITY DEFINER`, `search_path`, проверка `is_admin()` внутри; `revoke ... from public, anon` + `grant execute ... to authenticated` |
| 1.8 Seed | `reserved_author_names` — 9 строк из брифа, `on conflict do nothing` |
| Константа подписи | `author_display_name()` → `'Александр Скрипник'` — **единственное место правки** для сайтов №2–3 |

### Принятые решения (на ревью архитектору)

1. **Имена RPC** — `admin_count_user_messages` / `admin_delete_user_messages` (в TASK просили зафиксировать в REPORT).
2. **Порядок проверок** в триггере: вход → бан → hardening полей → запрещённые имена → лимит. Бан проверяется первым: забаненный не должен получать попутно «полезные» ошибки.
3. **Один уровень вложенности защищён в БД**: в ветке автора `parent_id` проверяется — родитель должен существовать и сам не быть ответом («Ответ на ответ не поддерживается»). Это чуть шире буквы п.1.5, но прямо следует из «один уровень вложенности» и принципа «защита в базе» (бриф §3). Скажите, если это лишнее — уберу.
4. **Подпись ответа** ставится, если `is_author_reply = true` **или** задан `parent_id`; при этом `is_author_reply` принудительно `true`. Так TASK-016 не сможет случайно создать ответ без бейджа.
5. **`created_at` для автора не подменяется** (hardening — «для не-автора», как в TASK). При обычной вставке сработает `default now()`.
6. **`reserved_author_names` — без политик**: список читателям недоступен (проверено: 0 строк), триггер читает его как SECURITY DEFINER. Если TASK-012+ захочет клиентскую подсказку «такое имя нельзя» — добавим политику SELECT.
7. **`site_admins` — политика `for all` для `is_admin()`**: читателю закрыто (проверено), автору доступно (пригодится в E1/E4 для «вы автор?» и списка).
8. **`revoke execute from anon`** на RPC модерации — потому что в Supabase функции по умолчанию исполняемы для `anon`/`authenticated` (видно в ACL `increment_story_views` в `Вывод inspect-sql.txt`). Внутренняя проверка `is_admin()` остаётся вторым барьером.
9. Email автора в миграции **не прописан** — шаг 2 выполняет пользователь (раздел B ниже).

---

## 2. Проверки (полный вывод)

### A1. Синтаксис SQL настоящим парсером PostgreSQL (`pglast`)

```
Файл: G:\_MY-PROGRAMMING_3\WEB-SITE-SKRIPNIK\supabase\migrations\0005_author_role.sql
РЕЗУЛЬТАТ: OK
   3 x CreateStmt
   1 x DoStmt
   7 x DropStmt
   6 x GrantStmt
   1 x IndexStmt
   1 x InsertStmt
```

### A2. Поведение на настоящем PostgreSQL 16.2 (локальный одноразовый кластер)

`uv run --with pgserver`, кластер в scratch (не прод). Собрана схема, похожая на прод: `auth.users` +
`auth.uid()` (через GUC), роли `anon`/`authenticated`, таблицы `stories`/`comments`/`guestbook_entries`
с **настоящими прод-политиками** (сверено с `supabase/Вывод inspect-sql.txt`), триггеры, затем
применены `0004` (чтобы заменить честно) и `0005` дважды.

**Итог по шагам (58 шагов):**

```
================ ИТОГ ================
версия сервера                                                         | OK
схема-заготовка (прод-политики чтения/INSERT, роли)                    | OK
ПРИМЕНЕНИЕ 0004 (для честного replace)                                 | OK
триггеры на enforce_write_rate_limit                                   | OK
ПРИМЕНЕНИЕ 0005                                                        | OK
повторное ПРИМЕНЕНИЕ 0005 (идемпотентность)                            | OK
права ролей anon/authenticated (как в Supabase)                        | OK
шаг 2: выдача прав автора                                              | OK
новые функции: SECURITY DEFINER и search_path                          | OK
seed reserved_author_names (ожидаем 9 строк)                           | OK
нормализация имён                                                      | OK
все политики после 0005                                                | OK
R1: обычный комментарий (нужен id для parent_id)                       | OK
R1: created_at=2000-01-01, is_author_reply=true, parent_id=чужой       | OK
R2: имя «Cкрипник (латинская C)»                                       | отказ (ожидаемо)
R2: имя «АДМИН (капсом)»                                               | отказ (ожидаемо)
R2: имя «skripnik (латиница)»                                          | отказ (ожидаемо)
R2: имя «Автор»                                                        | отказ (ожидаемо)
R2: имя «александр борисович»                                          | отказ (ожидаемо)
R2: имя «Александр» (НЕ запрещено)                                     | OK
R3: до блокировки                                                      | OK
автор блокирует R3                                                     | OK
R3: после блокировки                                                   | отказ (ожидаемо)
R3: гостевая после блокировки                                          | отказ (ожидаемо)
автор разблокирует R3                                                  | OK
R3: после разблокировки                                                | OK
R4: сообщение 1                                                        | OK
R4: сообщение 2                                                        | OK
R4: сообщение 3                                                        | OK
R4: сообщение 4                                                        | отказ (ожидаемо)
автор: сообщение 1 подряд                                              | OK
автор: сообщение 2 подряд                                              | OK
автор: сообщение 3 подряд                                              | OK
автор: сообщение 4 подряд                                              | OK
автор отвечает на комментарий R4                                       | OK
автор: ответ на ответ                                                  | отказ (ожидаемо)
автор: parent_id несуществующего комментария                           | отказ (ожидаемо)
RLS (a): читатель insert в stories                                     | отказ (ожидаемо)
RLS (a): читатель update stories                                       | OK
RLS (a): читатель delete stories                                       | OK
RLS (b): читатель удаляет свой комментарий                             | OK
RLS: читатель всё ещё может писать свой комментарий                    | OK
RLS: читатель выдаёт себе права автора                                 | отказ (ожидаемо)
RLS (h): читатель пишет в banned_users                                 | отказ (ожидаемо)
RLS: читатель читает reserved_author_names                             | OK
RLS (h): читатель вызывает функцию удаления всех сообщений             | отказ (ожидаемо)
RLS: автор insert в stories                                            | OK
RLS: автор удаляет чужой комментарий                                   | OK
RPC: счёт сообщений R4 (без удаления)                                  | OK
RPC: удаление всех сообщений R4                                        | OK
после удаления: комментарии R4                                         | OK
после удаления: ответы автора (каскад)                                 | OK
итоговое состояние comments                                            | OK
итоговое состояние guestbook_entries                                   | OK
=== ГОТОВО ===
```

Пояснение к меткам: каждый шаг выполняется в транзакции с sentinel-строкой; «отказ (ожидаемо)» —
шаг провалился, и это ровно то, что требовалось (проверка отсекла действие). Строки «RLS (a): читатель
update/delete stories | OK» означают, что запрос прошёл **без ошибки, но изменил 0 строк** — RLS не даёт
читателю писать в `stories` (в выводе `UPDATE 0` / `DELETE 0`). Провалов и «неожиданных проходов» — нет.

**Выдержки из фактического вывода:**

```
--- новые функции: SECURITY DEFINER и search_path ---
          proname           | secdef |            proconfig            | provolatile
----------------------------+--------+---------------------------------+-------------
 admin_count_user_messages  | t      | {"search_path=public, pg_temp"} | s
 admin_delete_user_messages | t      | {"search_path=public, pg_temp"} | v
 author_display_name        | f      |                                 | i
 enforce_write_rate_limit   | t      | {"search_path=public, pg_temp"} | v
 is_admin                   | t      | {"search_path=public, pg_temp"} | s
 normalize_author_name      | f      |                                 | i

--- seed reserved_author_names (ожидаем 9 строк) ---
 admin / administrator / author / skripnik / автор / админ / администратор /
 александр борисович / скрипник      (9 rows)

--- нормализация имён ---
 latin_c  | upper_latin | upper_cyr |   plain
----------+-------------+-----------+-----------
 скрипник | sкriрniк    | админ     | александр
   (' Cкрипник ' → 'скрипник'; 'SKRIPNIK' → 'sкriрniк'; 'АДМИН' → 'админ')

--- все политики после 0005 (12 строк) ---
 banned_users      | banned_users_admin_all              | ALL
 comments          | comments_admin_delete               | DELETE
 comments          | Авторизованные добавляют коммент    | INSERT
 comments          | Публичное чтение комментариев       | SELECT
 guestbook_entries | guestbook_entries_admin_delete      | DELETE
 guestbook_entries | Авторизованные добавляют записи     | INSERT
 guestbook_entries | Публичное чтение гостевой книги     | SELECT
 site_admins       | site_admins_admin_all               | ALL
 stories           | stories_admin_delete                | DELETE
 stories           | stories_admin_insert                | INSERT
 stories           | Публичное чтение рассказов          | SELECT
 stories           | stories_admin_update                | UPDATE

--- R1: created_at='2000-01-01', is_author_reply=true, parent_id=чужой ---
          created_at           | is_author_reply | parent_id | created_at_seichas
-------------------------------+-----------------+-----------+--------------------
 2026-10-04 10:07:42.560662+00 | f               |           | t
   (parent_id пуст, флаг false, дата = сейчас)

--- R2: имена ---
ERROR:  Такое имя использовать нельзя: оно зарезервировано за автором сайта
        (для «Cкрипник», «АДМИН», «skripnik», «Автор», «александр борисович»)
        «Александр» — insert успешен

--- R3: бан ---
ERROR:  Вы не можете оставлять сообщения на этом сайте
        (и в comments, и в guestbook_entries; после разблокировки — insert успешен)

--- R4: лимит ---
сообщения 1-3 — успешно; сообщение 4 —
ERROR:  Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту

--- автор: 4 сообщения подряд ---
все 4 — успешно (лимита нет)

--- автор отвечает на комментарий R4 ---
    author_name     | is_author_reply |              parent_id
 Александр Скрипник | t               | b5994823-e64a-40c3-a3b3-7271c152bce0
        (имя подставлено триггером, хотя в payload было «какое-то имя»)

--- автор: ответ на ответ / несуществующий родитель ---
ERROR:  Ответ на ответ не поддерживается
ERROR:  Комментарий, на который вы отвечаете, не найден

--- RLS как роль authenticated (читатель R1) ---
ERROR:  new row violates row-level security policy for table "stories"   (insert)
UPDATE 0                                                                 (update)
DELETE 0                                                                 (delete)
DELETE 0                                                                 (удаление своего комментария)
ERROR:  new row violates row-level security policy for table "site_admins"
ERROR:  new row violates row-level security policy for table "banned_users"
 видит_запрещённые_имена = 0
ERROR:  Доступно только автору сайта   (вызов admin_delete_user_messages)
INSERT 0 1                             (обычный комментарий читателя — по-прежнему можно)

--- RLS как автор ---
insert в stories — успешно; delete чужого комментария — DELETE 1

--- RPC модерации ---
 comments_count | guestbook_count | author_replies_count
              3 |               0 |                    1        (счёт, без удаления)
 comments_deleted | guestbook_deleted | author_replies_deleted
                3 |                 0 |                      1    (удаление всех)
после удаления: комментарии R4 = 0, ответы автора (каскад) = 0

--- итоговое состояние comments (10 строк) ---
 11111111… | Читатель Один   | f | f | обычный комментарий читателя
 11111111… | Читатель Один   | f | f | подделка полей
 22222222… | Александр       | f | f | обычное имя
 33333333… | Читатель Три    | f | f | после разблокировки
 aaaa1111… | Имя Как Прислал | f | f | автор сообщение 1..4   (4 строки)
 11111111… | Читатель Один   | f | f | после RLS-проверок
```

Полный лог (844 строки): `C:\Users\Yuri\AppData\Local\hermes\cache\scratch\task011_pg_clean.txt`,
скрипт: `task011_pg_check.py` (в git не коммитил — одноразовая проверка, не часть проекта).

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

✓ built in 1.26s
```

Exit code **0** (88 модулей — фронт не менялся).

### A4. `npm run lint`

```
> web-site-skripnik@0.0.0 lint
> oxlint

src/pages/StoryDetail.tsx:32:7: warning react(set-state-in-effect): ...
src/components/StoryListPage.tsx:25:22: warning react-hooks(exhaustive-deps): ...
```

Exit code **0** — 0 errors, те же 2 унаследованных warning'а, новых нет.

---

## 3. B. Применение `0005` и выдача прав автора — **выполнено пользователем**

**Факт (пользователь, 2026-10-04):**

| # | Что делал | Вывод SQL Editor |
|---|---|---|
| 1 | Вставил весь файл `supabase/migrations/0005_author_role.sql` → Run | **`Success. No rows returned`** — миграция применена |
| 2 | `insert into public.site_admins (user_id) select id from auth.users where email = 'sverdlovy@yandex.ru' on conflict (user_id) do nothing;` | **`Success. No rows returned`** — команда прошла (для INSERT это нормальный вывод) |
| 3 | `select count(*) from public.reserved_author_names;` | **`count = 9`** — seed на месте |
| 4 | Подтверждающий `select` по `site_admins` (join с `auth.users`) — **после** исправления email | **1 строка: `22b58103-4872-421e-b400-9f8ec9b6bb98` / `sverdlov.y@yandex.ru` / `2026-10-04 15:51:30.829967+00`** — права выданы |
| 5 | Первый вариант команды с email из TASK (`sverdlovy@yandex.ru`) | **0 строк** — в `auth.users` такого написания нет |
| 6 | Диагностика `select id, email from auth.users order by created_at desc` | **реальный email автора: `sverdlov.y@yandex.ru`** (в TASK/брифе указан как `sverdlovy@yandex.ru` — расхождение) |

Важно: `Success. No rows returned` у INSERT **не подтверждает**, что строка появилась — SQL Editor так
отвечает на любой запрос, который не возвращает строк. Именно так и вышло на шаге 5: команда прошла
«успешно», а строка не добавилась.

**Реальный email автора (подтверждён запросом к `auth.users`): `sverdlov.y@yandex.ru`.**
Аккаунт: `22b58103-4872-421e-b400-9f8ec9b6bb98`. Рабочая команда, которая и сработала:

```sql
insert into public.site_admins (user_id)
select id from auth.users
 where email in ('sverdlov.y@yandex.ru', 'sverdlovy@yandex.ru')
on conflict (user_id) do nothing;

select a.user_id, u.email, a.created_at
  from public.site_admins a
  join auth.users u on u.id = a.user_id;
```

Смысл `where email in (...)`: `auth.users` сравнивает email как строку (точное совпадение), а «точка
в имени ящика» — правило доставки почты Яндекса, в базе его нет. Перечисление обоих написаний
срабатывает по тому, которое реально есть в `auth.users`.

Расхождение email стоит поправить в `CONTEXT.md` / брифе блока E (у архитектора) — в исполняемой части
миграции email намеренно не прописан, поэтому менять SQL не требуется, меняется только шаг пользователя.

---

## 3a. Независимая проверка на проде (кодер, только чтение по REST)

Свои права на `site_admins` я проверить не могу (RLS закрывает таблицу от анонима), поэтому проверил
**факт применения миграции в проде** и **границы доступа** анонимным ключом — только `select`/RPC,
ничего не меняя:

```
1) comments.parent_id существует (колонка появилась только в 0005):
   GET /rest/v1/comments?select=id,parent_id,is_author_reply&limit=1
   HTTP 200  [{"id":"f67f91d5-…","parent_id":null,"is_author_reply":false}]

2) RPC is_admin() от анонима:
   POST /rest/v1/rpc/is_admin  ->  HTTP 200  false        (ожидаемо: сессии нет)

3) RPC admin_count_user_messages от анонима:
   POST /rest/v1/rpc/admin_count_user_messages
   HTTP 401  {"code":"42501","message":"permission denied for function admin_count_user_messages"}

4) RPC admin_delete_user_messages от анонима:
   HTTP 401  {"code":"42501","message":"permission denied for function admin_delete_user_messages"}

5) чтение не сломалось: stories 200, comments 200, guestbook_entries 200

6) таблицы автора/бана/имён анониму не видны:
   site_admins [] 200 | banned_users [] 200 | reserved_author_names [] 200
```

Что это доказывает: `0005` **действительно применена** (колонка `parent_id` есть), `revoke execute
from anon` **сработал** (RPC модерации недоступны анониму), RLS новых таблиц **закрывает их от
читателей**, а чтение рассказов/комментариев/гостевой не пострадало.

---

## 4. D. Шаг пользователя: Vercel F5 (и почему сейчас будет не «OK»)

**Проверку я сделал сам, вживую** (браузер, прод-URL из TASK):

```
https://web-site-skripnik.vercel.app/stories/55c8e74c-822b-4c8d-9899-c1d8e001f3e4
  прямое открытие:  status 404, title «🐴 404: NOT_FOUND», «This page doesn’t exist»
  после F5:         status 404, то же
https://web-site-skripnik.vercel.app/stories/all  → status 404
https://web-site-skripnik.vercel.app/             → status 200
```

**Итог: 404 подтверждён → `vercel.json` добавлен** (TASK разрешал добавить при 404):

```json
{ "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ] }
```

Vercel отдаёт существующие статические файлы раньше rewrites, поэтому `assets/*` не пострадают.

**Дополнительно, и это важнее:** на момент проверки прод-сайт **не работал вообще** — страница была пустая,
в консоли `Uncaught Error: supabaseUrl is required` (в проекте Vercel не были заданы `VITE_SUPABASE_URL`
и `VITE_SUPABASE_ANON_KEY`), и лежала старая сборка `index-tj5qTMgn.js`.

**Обновление (пользователь, 2026-10-04): переменные Vercel добавлены** — на скриншоте проекта
`yuri-sverdlov's projects / web-site-skripnik` видны `VITE_S…SE_URL` и `VITE_S…ON_KEY` со значением
«Production and Preview», добавлены в тот же день. После деплоя я перепроверил прод вживую:

```
https://web-site-skripnik.vercel.app/
  bundle: /assets/index-B-l5ZsJg.js     <- совпадает с текущей локальной сборкой (не старая)
  #root детей: 1, nav рендерится: Home / Stories… / GuestBook / Войти / Регистрация
  errors: []
https://web-site-skripnik.vercel.app/stories/all   -> status 404   <- ждёт vercel.json (нужен push)
```

То есть переменные окружения подхватились, приложение на проде живое; **остался только 404 на
прямых ссылках**, который лечится добавленным `vercel.json` после push.

**Порядок для пользователя (после push):**
1. Дождаться автодеплоя Vercel (или Deployments → Redeploy).
2. Открыть `https://web-site-skripnik.vercel.app/stories/<id>` **в новой вкладке** → должна
   открыться страница рассказа (не 404).
3. Нажать **F5** → страница остаётся страницей рассказа.
4. Если после этого 404 всё ещё есть — написать: значит rewrites не подхватились, разберёмся
   (альтернатива — `routes` с `handle: filesystem`).

Пока push не сделан, `vercel.json` на прод не попадёт — это ожидаемо.

---

## 5. Что не сделано (осознанно, вне scope TASK-011)

- Фронт `/admin` (маршрут, меню, ссылка «Кабинет» в шапке) — TASK-012+.
- UI «Ответить» на странице рассказа и бейдж «Ответ автора» — TASK-016 (сейчас ответ можно создать
  только запросом из SQL/консоли).
- Storage `illustrations` и его политики — TASK-014.
- **Уборка тестовых строк блока D** — по решению пользователя отложена до `/admin` (E4/после E5),
  в этой миграции данные не удалялись.
- Проверки a–h конца блока — после E5/E16 и применения `0005` на проде (в TASK-011 их нет).

## 6. Честные оговорки

1. Раздел A2 — **локальный** PostgreSQL 16.2, а не ваш Supabase. Совпадение обеспечено схемой-заготовкой
   (типы, `auth.uid()`, прод-политики), но `auth.uid()` там подменена GUC `app.test_uid`, а роль
   `authenticated` — обычная роль кластера. JWT-механика Supabase не воспроизводилась.
2. Проверка «читатель вызывает RPC» дала русское «Доступно только автору сайта» (внутренняя проверка),
   а не отказ по правам, потому что в тесте роли выдан `execute` на все функции (как `authenticated`
   в Supabase). На проде `anon` права на эти RPC лишены отдельно (`revoke` в миграции).
3. Идемпотентность подтверждена повторным прогоном файла целиком, но не проверялась частичная
   повторная применимость (например, «прогнать только §8»).
4. `author_replies_count` / `author_replies_deleted` — **моё дополнение** к TASK (в брифе для окна
   подтверждения нужны «N комментариев и M записей», а фраза про каскад ответов есть). Если считаете
   лишним — уберу, это одна строка в каждой функции.

---

## 7. Git

Локальный commit только поимённо (`supabase/migrations/0005_author_role.sql`, `vercel.json`, `tasks/REPORT.md`):

```
$ git add supabase/migrations/0005_author_role.sql vercel.json tasks/REPORT.md
$ git commit -m "TASK-011: 0005 — роль автора, RLS записи, ответы (parent_id), бан, RPC модерации; vercel.json"
[main 4042a5c] TASK-011: ...
 3 files changed, 862 insertions(+), 3 deletions(-)
 create mode 100644 supabase/migrations/0005_author_role.sql
 create mode 100644 vercel.json

$ git log --oneline -3
4042a5c TASK-011: 0005 — роль автора, RLS записи, ответы (parent_id), бан, RPC модерации; vercel.json
f26bd40 TASK-011 выдан (E0/0005); бриф E в git; block-E сокращён; gitignore личного файла
e384ce8 Черновик block-E: уборка тестовых comments/guestbook через /admin

$ git status --short --branch
## main...origin/main [ahead 3]
```

Push **не делал** (TASK: push — архитектор после приёмки и разрешения пользователя).

Не коммитил: `.env.local`, `tasks/Мой аккаунт..txt` (личный, в .gitignore), `supabase/migrations/report-0004_harden_reader_inserts.txt`, `supabase/migrations/Удаление мусорных строк..txt`, `dist/`, скрипты проверки из scratch.
