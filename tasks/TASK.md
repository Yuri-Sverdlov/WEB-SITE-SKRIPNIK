# Задание (архитектор → кодер)

**ID:** TASK-015  
**Дата:** 2026-10-06  
**Статус:** к выполнению  
**Блок:** E4 — модерация и бан  
**Бриф:** `tasks/consultant-block-E-brief.md` (раздел E4) · **0005**, **0006** применены

**Старт сессии:** **`git pull`**, `AGENTS.md`, `CONTEXT.md`, этот файл.

**Предшественник:** TASK-014 принят — `tasks/done/014-illustrations-storage/`.

---

## Цель

В **`/admin`**: ленты **комментариев** и **гостевой книги**, удаление записей, **бан** и **разбан** читателей, **удаление всех сообщений** читателя одним RPC. Страница **«Заблокированные»**. Всё только для автора (`AdminLayout`).

**Не входит:** ответы автора под комментарием на StoryDetail — **TASK-016**.

---

## Контекст (БД уже есть)

- DELETE комментария / записи гостевой — **`is_admin()`** (0005).
- **`banned_users`** — read/write только автор; триггер при INSERT в comments/guestbook отклоняет забаненных.
- RPC (только authenticated + `is_admin()` внутри):
  - **`admin_count_user_messages(target_user_id)`** → `comments_count`, `guestbook_count`, `author_replies_count`
  - **`admin_delete_user_messages(target_user_id)`** → фактические числа удалённых
- В `comments` / `guestbook_entries` есть **`user_id`**, **`author_name`**, **`body`**, **`created_at`**; у комментария — **`story_id`** (для ссылки на рассказ).
- Термины брифа: кнопки про **«читателя»**, не «пользователя».

---

## Что сделать

### 1. API (например `src/api/adminModeration.ts`)

- **`fetchAdminComments()`** — все комментарии (или постранично): **новые сверху**; поля: id, story_id, author_name, body, created_at, user_id; join title рассказа опционально вторым запросом или embed если удобно.
- **`fetchAdminGuestbook()`** — записи гостевой, **новые сверху**.
- **`deleteComment(id)`**, **`deleteGuestbookEntry(id)`** — DELETE (ошибки по-русски).
- **`banUser(userId, reason?)`** — insert в `banned_users` (reason nullable).
- **`unbanUser(userId)`** — delete из `banned_users`.
- **`fetchBannedUsers()`** — список для страницы «Заблокированные»: user_id, banned_at, reason; **имя для UI** — последний `author_name` из comments/guestbook или «—» / email недоступен (не тянуть `auth.users` с фронта без RPC).
- **`countUserMessages(userId)`** — `rpc('admin_count_user_messages', …)`.
- **`deleteAllUserMessages(userId)`** — `rpc('admin_delete_user_messages', …)`.

### 2. Страницы (заменить placeholders в `App.tsx`)

| Маршрут | UI |
|---|---|
| `/admin/comments` | Лента: дата, имя, текст, ссылка «→ рассказ» (`/stories/:story_id`); три действия на запись (см. ниже) |
| `/admin/guestbook` | То же без ссылки на рассказ |
| `/admin/banned` | Таблица: имя (как выше), дата бана, причина, **Разблокировать** |

**На каждой записи комментария / гостевой — всегда три кнопки:**

1. **Удалить** — confirm с кратким текстом → delete одной строки.
2. **Заблокировать читателя** — prompt/modal: необязательное поле «Причина» → `banUser(user_id, reason)`; **сообщения не удалять**.
3. **Удалить все сообщения читателя** — сначала **`countUserMessages`**, confirm:

   «Будет удалено N комментариев и M записей гостевой книги. Ответы автора на эти комментарии тоже будут удалены. Продолжить?»

   (использовать `comments_count`, `guestbook_count`, `author_replies_count` из RPC для текста; после подтверждения — один вызов **`deleteAllUserMessages`**, не цикл delete из браузера).

Блокировка и удаление всех сообщений — **независимые** действия.

### 3. UX

- Состояния загрузки / ошибка / пустой список.
- После delete/ban — обновить список (refetch).
- Если `user_id` null (не должно быть у нормальных INSERT) — скрыть ban / delete-all или показать «—».

### 4. Scope — не трогать

- SQL, новые миграции (если не обнаружен блокер — тогда описать в REPORT).
- StoryDetail: кнопка «Ответить» — TASK-016.
- Фильтр по тегам на витрине — отдельная задача (не E4).

---

## Проверки (полный вывод в REPORT)

- `npm run build`, `npm run lint`
- **Автор** (localhost или Vercel):
  1. `/admin/comments` — видны комментарии, ссылка на рассказ работает.
  2. Удалить один комментарий — исчез с сайта и из админки.
  3. Заблокировать test.hermes (или тестового читателя) — новый комментарий/гостевая отклоняются; в `/admin/banned` есть строка; **Разблокировать** — снова можно писать.
  4. «Удалить все сообщения читателя» — числа в confirm совпадают с фактом после удаления.
- Гостевая — те же три кнопки на `/admin/guestbook`.

---

## Git

Локальный **commit**; **`git push` — не делать** (архитектор после приёмки и разрешения пользователя).

---

## Отчёт

**`tasks/REPORT.md`**
