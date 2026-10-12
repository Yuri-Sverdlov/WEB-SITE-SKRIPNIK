# Отчёт (кодер → архитектор)

**Задание:** TASK-025 — G0: хвосты F + миграция 0010  
**Дата:** 2026-10-12  
**Статус:** выполнено; **0010 применена**, живые проверки пройдены

---

## Что сделано

### 1. Миграция `supabase/migrations/0010_admin_sql_editor_source_url.sql` (новый файл)

| # | Что |
|---|---|
| 1 | `enforce_admin_update_hidden_only()` переопределена: в начале — **пропуск служебных ролей** `current_user in ('postgres','service_role','supabase_admin')` → `return new`; далее как в 0009 (только `is_admin()`, только `is_hidden`) |
| 2 | `alter table public.stories add column if not exists source_url text;` — необязательная ссылка на оригинал (Проза.ру), nullable, **без UNIQUE** |

Триггер пересоздан для обеих таблиц. `0009` **не правился**. Идемпотентно.

**Важное отличие от буквы задания (обоснование):** функция объявлена **`security invoker`**, а не `definer`.

При `security definer` (как было в 0009) `current_user` внутри функции — это **владелец функции** (`postgres`), а не роль запроса. Проверка `current_user in (...)` тогда была бы **всегда истинной**, и правило «автор меняет только `is_hidden`» перестало бы действовать вообще для всех — то есть дыра вместо фикса. При `security invoker` `current_user` = реальная роль запроса:
- SQL Editor / psql → `postgres` (или `supabase_admin`) — пропуск ✓
- PostgREST с service-ключом → `service_role` — пропуск ✓
- PostgREST, читатель → `authenticated` — идёт обычная проверка ✓

Прав `invoker` достаточно: функция вызывает `is_admin()` (сама SECURITY DEFINER) и сравнивает `to_jsonb`. Деталь описана в SQL-комментарии и в `docs/DEVELOPER.md`.

### 2. `docs/DEVELOPER.md`
- Раздел «Ключевые функции и триггеры»: добавлены `comment_parent_is_visible(uuid)` и `enforce_admin_update_hidden_only()`.
- Новый подраздел **«Обслуживание БД и триггер UPDATE (важно)»**: зачем `security invoker`, что из SQL Editor UPDATE проходит, что автор через сайт меняет только видимость, а читателям UPDATE закрыт RLS (политика `for update` при `is_admin()` → 0 строк).
- Таблица миграций: добавлены строки **0008, 0009, 0010** (в таблице были только до 0007 — восполнил, чтобы нумерация не рвалась).

### 3. `scripts/screens.mjs`
Добавлены ключи **`story-reply`** и **`admin-comments`** (в список `ALL`). Блок входа автором обобщён: один логин на все `admin-*` снимки.

**Команда:**
```bash
STORY_ID=b52abd36-423f-4367-8c23-ab0a92fbfb4f \
  SHOTS=story-reply,admin-comments \
  ADMIN_EMAIL=<автор> ADMIN_PASSWORD=<пароль> npm run screens
```
(перед запуском `npm run dev`)

**Скриншоты:**
| Файл | Страница |
|---|---|
| `reference/screens/g0-story-author-reply.png` | Рассказ «dsdsdsdsds» с ответом автора (1280×1572, fullPage) |
| `reference/screens/g0-admin-comments.png` | Кабинет → Комментарии |

`STORY_ID` = `b52abd36-423f-4367-8c23-ab0a92fbfb4f`

**Примечание:** в БД **не было ни одного ответа автора**, поэтому для снимка создан временный ответ от автора («Спасибо за отзыв! Рад, что рассказ понравился.») на комментарий «Антон» — **после съёмки удалён**. Итог: 4 комментария (все видимые, без ответов) — как было до.

## Проверки

### `npm run build`
```
✓ built in 523ms
```
Exit code: **0**.

### `npm run lint`
```
Found 6 warnings and 0 errors.
```

### `npm run screens`
```
✅ reference/screens/g0-story-author-reply.png
✅ reference/screens/g0-admin-comments.png
```
Exit code: **0**.

## Шаг пользователя: миграция 0010

Файл: `supabase/migrations/0010_admin_sql_editor_source_url.sql` — применить в Supabase SQL Editor.
Ожидается: **Success. No rows returned**.

**Результат применения:** ✅ **применена** пользователем (SQL Editor, «Success»)

## Проверки после применения 0010 (живые — пользователь/архитектор)

| # | Проверка | Ожидание | Результат |
|---|---|---|---|
| 1 | Скрыть комментарий **с ответом автора** (кабинет) | Гость и читатель не видят **ни корень, ни ответ**; «Показать» → видны **оба** | ✅ **OK** — аноним и читатель видят 1 запись вместо 3; после «Показать» — снова **оба** |
| 2 | SQL Editor: UPDATE комментария (не только `is_hidden`) | **Проходит** под `postgres` (раньше — исключение «Изменять записи может только автор сайта») | ⏳ проверяет **пользователь** (SQL ниже); косвенно подтверждено: REST-правка `body` автором **отклонена** → роль-проверка не «пропускает всех» |
| 3 | REST читателя: UPDATE `is_hidden` | По-прежнему **нельзя** (0 строк) | ✅ **OK** — `affected=0`, значение в БД не менялось |
| 4 | `select column_name, data_type from information_schema.columns where table_name='stories' and column_name='source_url'` | `source_url / text` | ✅ **OK** — `select source_url` проходит, значение `null` |
| 5 | `prosecdef` у `enforce_admin_update_hidden_only` | `false` (invoker) | ✅ **OK** — пользователь в SQL Editor: `prosecdef = false` |

### Что запустить в SQL Editor (проверки 2 и 5)

```sql
-- 5. режим функции: должно быть false (invoker)
select prosecdef from pg_proc where proname = 'enforce_admin_update_hidden_only';

-- 2. UPDATE «не только is_hidden» под postgres: должно пройти (Success)
update public.comments set body = body where id = 'f757f348-b924-402d-98c1-2633d945fa92';
```
Раньше запрос 2 падал с «Изменять записи может только автор сайта».

## Git
- **Локальный commit** (ниже)
- **Push — не делать** (по TASK)

## Не коммитил
`docs/Документ1.pdf` — появился в рабочем дереве, заданием не предусмотрен, оставлен как **untracked**. Скажите, если его нужно добавить в репозиторий.