# Задание (архитектор → кодер)

**ID:** TASK-011  
**Дата:** 2026-10-04  
**Статус:** к выполнению  
**Блок:** E0 — права автора, защита и бан в БД  
**Бриф:** `tasks/consultant-block-E-brief.md` · наследие D: `tasks/block-E.md`

**Старт сессии:** **`git pull`**, затем `AGENTS.md`, `CONTEXT.md`, этот файл.

**Решения пользователя (2026-10-04):** см. раздел «Зафиксированные решения» ниже.

---

## Цель

Миграция **`0005_author_role.sql`**: роль автора в БД, RLS, ответы (схема), расширение триггера из 0004, бан, RPC модерации. **Фронт `/admin` — не в этом TASK** (TASK-012+).

---

## Зафиксированные решения (не менять без архитектора)

| Тема | Решение |
|---|---|
| Автор | `site_admins`; `is_admin()` SECURITY DEFINER + `search_path` |
| Email автора | `sverdlovy@yandex.ru` — **не** в миграции insert; пользователь выполняет **свои** команды после 0005 (шаг 2 в REPORT — напомнить) |
| Тест-читатель | `test.hermes.skripnik@gmail.com` остаётся **без** `site_admins` |
| Запрещённые имена | **Не** проверять для `is_admin()` |
| Rate limit 3/мин | **Не** применять к `is_admin()` (все таблицы с триггером) |
| Подпись ответа автора | `author_name` задаёт **триггер**; константа в **одном месте** в SQL: **`Александр Скрипник`** (для сайтов №2–3 менять одну строку). UI: текст + бейдж «Ответ автора» — в TASK-016 |
| Уборка мусора D | через `/admin` после E5 — не в этом TASK |

---

## Что сделать

### 1. Файл `supabase/migrations/0005_author_role.sql`

Идемпотентно где возможно. Комментарий: применяет **только пользователь** в SQL Editor.

**1.1. Роль автора**

- Таблица `site_admins` (`user_id` → `auth.users`, PK).
- Функция `is_admin()` → boolean; SECURITY DEFINER; `SET search_path = public, pg_temp`.
- RLS: читатели **не** SELECT/INSERT/UPDATE/DELETE на `site_admins`.

**1.2. `stories`**

- INSERT / UPDATE / DELETE — только `is_admin()`.
- SELECT — **как сейчас** (всем).

**1.3. `comments`, `guestbook_entries`**

- DELETE — только `is_admin()`.
- INSERT/SELECT для читателей — без ослабления существующего.

**1.4. Ответы автора (схема, UI позже)**

- `comments.parent_id` uuid NULL → `comments(id)` ON DELETE CASCADE.
- Один уровень вложенности (ответ на комментарий читателя, не на ответ).

**1.5. Расширить `enforce_write_rate_limit()`** (заменить тело из 0004, сохранив hardening `created_at` / `is_author_reply` для **не-автора**)

Для **не** `is_admin()`:

- как 0004: `NEW.created_at := now()`; на `comments`: `is_author_reply := false`, `parent_id := null` (если клиент прислал — обнулить);
- rate limit 3/мин;
- проверка **`reserved_author_names`** (таблица, seed из брифа §2);
- нормализация имени перед сравнением: lower, ё→е, латинские двойники → кириллица (`a c e o p x y k m t b h` → `а с е о р х у к м т в н`), trim; сравнение **по вхождению**; ошибка **на русском**;
- если `auth.uid()` в **`banned_users`** → «Вы не можете оставлять сообщения на этом сайте».

Для **`is_admin()`**:

- **без** rate limit;
- **без** проверки запрещённых имён;
- `is_author_reply` / `parent_id` — **как прислал** (для будущих ответов автора);
- при insert ответа автора (когда в TASK-016 будет `parent_id` / reply): **`NEW.author_name := 'Александр Скрипник'`** (одна константа в SQL) — вынести строку в **одну** константу/переменную в начале функции или отдельную функцию `author_display_name()` в этой же миграции (одно место правки).

**1.6. Бан**

- `banned_users` (`user_id`, `banned_at`, `reason`); RLS: read/write только `is_admin()`.

**1.7. RPC модерации (SECURITY DEFINER, `is_admin()`, search_path)**

Две функции (имена на усмотрение, зафиксировать в REPORT):

1. **Счёт** сообщений читателя: по `user_id` → число строк в `comments` и `guestbook_entries` (для диалога E4); **без** DELETE.
2. **Удаление всех** сообщений читателя: DELETE всех его `comments` и `guestbook_entries` **одним** вызовом; вернуть `{comments_deleted, guestbook_deleted}` или аналог. Учесть CASCADE по `parent_id` (ответы автора на комментарии этого читателя).

**1.8. Seed `reserved_author_names`**

Список из брифа: скрипnik, skripnik, александр борисович, автор, author, администратор, админ, administrator, admin. Отдельно «александр» **не** запрещать.

---

### 2. SPA на Vercel (только при необходимости)

**Не** добавлять `vercel.json` «на всякий случай».

В **`tasks/REPORT.md`** — блок **«Шаг пользователя: Vercel F5»**:

1. Открыть **https://web-site-skripnik.vercel.app/stories/&lt;реальный-id&gt;** в новой вкладке.
2. Нажать **F5**.
3. Если **404** — добавить в репозиторий `vercel.json` (rewrite всех путей → `/index.html`), описать в REPORT; если OK — «vercel.json не нужен».

---

## Scope — не трогать

- Страницы `/admin`, StoryDetail «Ответить», Storage UI — TASK-012…016.
- Не ослаблять 0004 для читателей.
- **`tasks/Мой аккаунт..txt`** и прочие личные файлы — не коммитить.

---

## Проверки (полный вывод в REPORT)

- `npm run build`, `npm run lint` (ожидается OK, фронт не менялся — или только `vercel.json`).
- Локальная проверка SQL по возможности (как в 010).
- **Пользователь:** применить 0005 → вывод SQL Editor; **шаг 2** — выдать себе права (`site_admins`, email `sverdlovy@yandex.ru`) — **напомнить**, команды у пользователя; проверить seed `reserved_author_names`.
- **Пользователь:** шаг Vercel F5 (см. выше).

Проверки **a–h** конца блока — **не** в этом TASK (после E5/E16 и 0005 на проде).

---

## Git

- Локальный **commit** (миграция + REPORT; опц. `vercel.json`).
- **`git push` — не делать** (архитектор после приёмки и разрешения пользователя).
- **`git add` — только поимённо**, не `git add -A`.

---

## Отчёт

**`tasks/REPORT.md`**
