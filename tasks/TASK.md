# Задание (архитектор → кодер)

**ID:** TASK-009  
**Дата:** 2026-10-03  
**Статус:** к выполнению  
**Блок:** D3 — гостевая книга (`/guestbook`)  
**Предшественник:** TASK-008 принят; **`0003` применён**; компоненты `ReaderMessageList` / `ReaderMessageForm` и `messageErrors.ts` готовы.

**Сессия:** новая сессия или другой ПК — **`git pull`** первым делом. **`git push` не делать** — после приёмки архитектор.

---

## Цель

Страница **`/guestbook`** вместо заглушки: **лента записей** (всем) и **форма** для вошедших. Переиспользовать компоненты из TASK-008.

**БД:** таблица `public.guestbook_entries` — после 0003: `author_name`, `body`, CHECK, rate limit (3/мин на пользователя), RLS (SELECT всем, INSERT только свой `user_id`).

---

## Контекст

- Роут и ссылка в навигации уже есть (`App.tsx`, `GuestBook.tsx` — сейчас заглушка `<h1>`).
- Auth: `useAuth()` — как на `StoryDetail` (гость vs `user`).
- Insert: `user_id` = session user id, `author_name`, `body` (без `story_id`).
- **Email в UI не показывать** — только `author_name`.
- Ошибки — **`mapReaderMessageError`** из `src/api/messageErrors.ts` (rate limit из триггера — дословно по-русски).
- Login: `/login` с `state.from` = `/guestbook` (как комментарии на рассказе).

---

## Что сделать

### 1. API `src/api/guestbook.ts` (или аналог)

- `fetchGuestbookEntries()` — select `id, author_name, body, created_at`, сортировка **`created_at ASC`**.
- `insertGuestbookEntry({ userId, authorName, body })` — insert; клиентская валидация 2–40 / 1–2000 (можно вынести общие константы с `comments.ts` или дублировать минимально — без рефакторинга ради рефакторинга).
- Ошибки через `mapReaderMessageError`.

### 2. `GuestBook.tsx`

- Заголовок «Гостевая книга» (или согласованный с навигацией русский текст — по ТЗ/стилю сайта).
- `ReaderMessageList` + для гостя приглашение войти; для `user` — `ReaderMessageForm` (`submitLabel` в духе «Отправить запись»).
- После успешной отправки — обновить ленту (как в `StoryDetail`).

### 3. Scope — не трогать

- SQL, RLS, 0003.
- Логику комментариев на `StoryDetail` (только общие компоненты/API-ошибки).
- `App.tsx` logout → `/login` (уже сделано при приёмке 008).

---

## Проверки (полный вывод в REPORT)

- `npm run build`, `npm run lint`
- Вживую: гость видит ленту, формы нет; вошедший — запись в гостевой; 4-я за минуту — русская ошибка rate limit; F5 — запись на месте; консоль без красных ошибок.

**Блокер пароля:** если нет доступа к паролю тестового аккаунта — гость проверяет кодер; сценарий «вошедший» может подтвердить пользователь (как TASK-008).

---

## Git

**Не push** — после приёмки архитектор.

---

## Отчёт

**`tasks/REPORT.md`**
