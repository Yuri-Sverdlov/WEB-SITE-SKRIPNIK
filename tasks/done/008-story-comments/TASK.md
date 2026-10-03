# Задание (архитектор → кодер)

**ID:** TASK-008  
**Дата:** 2026-10-03  
**Статус:** к выполнению  
**Блок:** D2 — комментарии на странице рассказа  
**Предшественник:** TASK-007 принят; **`0003` применён пользователем** (2026-10-03, Success).

**Сессия:** продолжение той же сессии Hermes — **`git pull` не делать**; читай этот файл и `CONTEXT.md` с диска. **`git push` не делать** до конца TASK (приёмка → push архитектор).

---

## Цель

Под текстом рассказа — **лента комментариев** (видна всем) и **форма** для вошедших. Переиспользуемые компоненты для TASK-009 (гостевая).

**БД:** таблица `public.comments` — после 0003: `author_name`, `body`, CHECK, rate limit, RLS. Есть колонка **`is_author_reply`** (boolean) — **не используем в UI** в этом TASK (ответы автора — этап 8–9); не ломать, не показывать отдельно.

---

## Контекст

- `StoryDetail.tsx` — подключить блок комментариев внизу.
- Auth: `useAuth()` — гость vs `user`.
- Insert только через Supabase client от **вошедшего** (`user_id` задаёт RLS; в insert передавать `user_id` = session user id, `story_id`, `author_name`, `body`).
- **Email читателя в UI не показывать** — только `author_name`.
- Ошибки Supabase/триггера — **русский** текст (в т.ч. rate limit из exception 0003).
- Login redirect: `/login` с `state.from` = текущий путь рассказа (как в Login.tsx).

---

## Что сделать

### 1. API `src/api/comments.ts` (или аналог)

- `fetchComments(storyId)` — select по `story_id`, сортировка **`created_at ASC`** (старые сверху).
- `insertComment({ storyId, userId, authorName, body })` — insert; маппинг ошибок на русский (лимит 3/мин, RLS, CHECK длины).

### 2. Компоненты (переиспользуемые для TASK-009)

Предложение имён (можно уточнить, но один стиль):

- **`ReaderMessageList`** — props: items `{ id, authorName, body, createdAt }`, loading/error.
- **`ReaderMessageForm`** — props: `onSubmit`, `submitting`, `error`; поля **имя (2–40)** + **текст (1–2000)**; client validation; anti-double-submit.

Комментарии на StoryDetail собирают list + form.

### 3. `StoryDetail.tsx`

- Под контентом рассказа: заголовок «Комментарии», list, затем:
  - **Не вошедший:** текст «Войдите, чтобы оставить комментарий» + ссылка на `/login` с return на этот `/stories/:id`.
  - **Вошедший:** форма.

### 4. Scope — не трогать

- `/guestbook` страницу (TASK-009).
- SQL, RLS, 0003.
- `is_author_reply` — не редактировать в форме.

---

## Проверки (полный вывод в REPORT)

- `npm run build`, `npm run lint`
- Вживую (dev + `.env.local`): гость видит ленту, формы нет; вошедший — отправляет комментарий; 4-й за минуту — русская ошибка; консоль без красных ошибок.

---

## Git

**Не push** — после приёмки архитектор.

---

## Отчёт

**`tasks/REPORT.md`**
