# PROJECT_LOG — журнал сессий (append-only)

---

## 2026-09-20 — Инициализация процесса разработки

**Участники:** пользователь, архитектор (Cursor).

**Сделано:**
- Прочитано `F:\DEV-NOTES.md`, согласована роль архитектора в двухагентной (+ консультант) схеме.
- По ТЗ `ТЗ — сайт для писателя.md` создан канонический комплект:
  - `AGENTS.md`, `CONTEXT.md`, `CLAUDE.md`, `DEV-NOTES.md` (редирект)
  - `tasks/TASK.md`, `tasks/REPORT.md`, `tasks/done/`
  - `PROJECT_LOG.md`

**Роли:** пользователь · консультант (Claude Desktop) · архитектор (Cursor) · кодер (терминал).

**Текущий этап по ТЗ:** 0 — Инициализация.

**Следующий шаг:** ждём конкретное задание по этапу 0 от **консультанта** (через пользователя). Код не писали, scaffold не создавали.

---

## 2026-09-20 — Этап 0 (часть 1): scaffold

**Участники:** пользователь, консультант (задание), архитектор (Cursor).

**Сделано:**
- Vite + React + TypeScript + Tailwind CSS 3 + react-router-dom.
- Страницы-заглушки в `src/pages/`, пустые `src/components/`, `src/api/`.
- Роутинг и навигация для проверки.
- `npm run build` и `npm run dev` — без ошибок (localhost:5173).

**Не сделано:** деплой Vercel (остаток этапа 0 по ТЗ).

**Следующий шаг:** деплой на Vercel или этап 1 — по решению консультанта/пользователя.

---

## 2026-09-20 — TASK-001: StoriesAll

**Участники:** кодер (реализация), архитектор (приёмка, hotfix).

**Сделано:**
- `StoriesAll.tsx`: Supabase `.range()` пагинация, карточки, сортировка `published_at DESC`.
- При приёмке найден баг: колонка БД `views_count`, в коде было `views` → исправлено архитектором.
- Commit в `main`.

**Следующий шаг:** задание от консультанта (следующий этап).

---

## 2026-09-20 — TASK-002 + TASK-003: этап B завершён

**Участники:** кодер (реализация), архитектор (приёмка, commit/push).

**TASK-002:** общие компоненты, 3 вкладки, пагинация 15/стр.
**TASK-003:** StoryDetail, RPC `increment_story_views`, поиск `.ilike()` в URL `?q=`.

**Приёмка архитектора:** build OK; «Разговор с отцом» не в «Новые»; popular/all/search/views increment проверены в браузере.

**Git:** commit + push в `main`.

**Следующий шаг:** бриф следующего этапа от консультанта.

---

## 2026-10-02 — TASK-004 (этап C, Auth) принят; репозиторий синхронизирован

**Участники:** кодер (реализация), архитектор (приёмка, commit/push).

**TASK-004:** `src/api/auth.ts` (signUp/signIn/signOut/resetPassword + русский маппинг ошибок), `src/contexts/AuthProvider.tsx` (`useAuth`), страницы `/login` и `/register`, logout + email в шапке, anti-double-submit.

**Приёмка архитектора:** `npm run build` — OK (exit 0, vite 8.3.0, 83 модуля); `npm run lint` — 0 ошибок (2 warning'а унаследованы из TASK-003).

**Не проверено вживую:** вход/выход с подтверждённым email — в Supabase включён confirm email, доступа к ящику нет.

**Git:** commit + push в `main`. Причина: репозиторий отставал на один этап — работа этапа C существовала только локально.

**Окружение (для работы на другом компьютере):** добавлен `.env.example` (шаблон), инструкции — в `README.md` и `AGENTS.md`. `.env.local` остаётся вне git.

**Следующий шаг:** бриф этапа D (комментарии, гостевая книга) от консультанта.

---

## 2026-10-02 — TASK-005: пути двух ПК, решения SPA/Supabase

**Участники:** консультант (бриф), пользователь (утверждение), архитектор (выполнение на ПК1, commit/push).

**Сделано:**
- `CONTEXT.md`, `AGENTS.md`, `DEV-NOTES.md` (редирект), `ТЗ — сайт для писателя.md`: пути [ПК1: RTX 3050] / [ПК2: RTX 4060]; DEV-NOTES — путь от пользователя.
- `AGENTS.md`: `git pull` в начале сессии кодера; commit+push в конце — по TASK.
- Зафиксированы решения: SPA (React + Vite), без Astro; Supabase; регистрация email+пароль.
- Проверки: поиск `F:\`/`G:\` (вне архива и журнала), `npm run build`.

**Git:** commit + push в `main` (проверка цепочки на ПК1).

**Следующий шаг:** этап D — комментарии и гостевая книга (бриф консультанта).

---

## 2026-10-03 — TASK-006 (D0) принят

**Участники:** кодер (Hermes), архитектор (приёмка).

**Сделано:** `supabase/inspect.sql`, `Вывод inspect-sql.txt`, `migrations/0001_baseline.sql`; `0002` не требуется; `Home.tsx` без дампа; CONTEXT обновлён; REPORT 176+ строк.

**Git:** `ce0bbb0` (+ `b2102fd` REPORT) на `origin/main`.

**Открыто:** Auth вживую на сайте; TODO колонок comments/guestbook в baseline.

**Следующий шаг:** TASK-007 (0003, сверка схемы, rate limit).

---

## 2026-10-03 — TASK-007 (D1) принят

**Участники:** кодер (Hermes), архитектор (приёмка, rename author_name, push).

**Сделано:** `inspect_comments_guestbook.sql`, `0003_comments_guestbook.sql` (CHECK, FK DO-блоки, rate limit); REST-аудит колонок. Решение: `guestbook_entries.name` → `author_name`.

**Git:** `acc17b2`, `ef89967`, push + правка 0003 при приёмке.

**Пользователь:** применить `0003` в SQL Editor.

**Следующий шаг:** TASK-008 (комментарии UI).

---

## 2026-10-03 — Пользователь применил миграцию 0003

**Участники:** пользователь (SQL Editor), архитектор (фиксация в CONTEXT / отчёте консультанта).

**Факт:** `supabase/migrations/0003_comments_guestbook.sql` выполнен целиком в Supabase (Production). Результат: **Success. No rows returned** (подтверждение «Выполнить запрос» на предупреждении DDL — штатно).

**Следующий шаг:** TASK-008 (кодер); опционально inspect триггеров; закоммитить вывод inspect в репо.

---

## 2026-10-03 — TASK-008 (D2) принят

**Участники:** кодер (Hermes), пользователь (живые проверки), архитектор (приёмка, hotfix logout, push).

**Сделано:** комментарии на `StoryDetail` — `comments.ts`, `ReaderMessageList` / `ReaderMessageForm`, `messageErrors.ts`. Гость — проверка кодера; вошедший + rate limit — пользователь (путь 2). **Hotfix:** «Выйти» → `/login`.

**Git:** `839134f`, `6de7a9a` (кодер); архив `tasks/done/008-story-comments/`.

**Следующий шаг:** TASK-009 — `/guestbook`.

---

## 2026-10-03 — TASK-009 (D3) принят; блок D закрыт

**Участники:** кодер (Hermes), пользователь (живые проверки 1–5), архитектор (hotfix валидации >2000, приёмка, push).

**Сделано:** `/guestbook` — `guestbook.ts`, `GuestBook.tsx`; `validateReaderMessageInput`. Пользователь подтвердил сценарии вошедшего. **Hotfix:** убран `maxLength` на textarea в `ReaderMessageForm` (п. 6 чек-листа).

**Git:** `488817a`, `31d6f3c`; архив `tasks/done/009-guestbook/`. Отчёт консультанту — `tasks/consultant-block-D-report.md`.

**Следующий шаг:** бриф следующего этапа (консультант / пользователь).

---

## 2026-10-04 — TASK-010 (D4 hardening) принят

**Участники:** кодер (Hermes), пользователь (0004 + a–d), архитектор (приёмка, архив).

**Сделано:** `0004_harden_reader_inserts.sql`; применение Success; проверки a–d на Supabase. **Уборка тестовых comments** — отложена до блока E (admin/модерация).

**Git:** `4d1fa76` и REPORT-коммиты; архив `tasks/done/010-harden-reader-inserts/`. Кратко консультанту: `tasks/consultant-TASK-010-brief.md`.

**Следующий шаг:** бриф блока E.

---

## 2026-10-04 — TASK-011 (E0) принят

**Участники:** кодер (Hermes), пользователь (0005, site_admins, Vercel F5), архитектор (приёмка, push).

**Сделано:** `0005_author_role.sql`, `vercel.json`; права автора; F5 OK на prod.

**Git:** `4042a5c`, `6f70d4e`, push `435127c`; архив `tasks/done/011-author-role-db/`.

**Следующий шаг:** TASK-012 — `/admin` каркас.

---

## 2026-10-05 — TASK-012 (E1) принят

**Участники:** кодер, пользователь (живая a–в), консультант (ревью), архитектор (архив, push).

**Сделано:** каркас `/admin`, `is_admin`, меню 4 раздела, «Кабинет» в шапке; живые проверки пользователя OK.

**Git:** `fd28a1a`, `fdb516e`; архив `tasks/done/012-admin-shell/`; push приёмки на `origin/main`.

**Следующий шаг:** TASK-013 — CRUD рассказов в админке.

---

## 2026-10-05 — TASK-013 (E2) принят

**Участники:** кодер, пользователь (localhost CRUD), архитектор (архив).

**Сделано:** `/admin/stories` — список, поиск, create/edit/delete; push `465b2f4`.

**Git:** `465b2f4`; архив `tasks/done/013-admin-stories-crud/`.

**Следующий шаг:** TASK-014 — иллюстрации.

---

## 2026-10-06 — TASK-014 (E3) принят

**Участники:** кодер, пользователь (иллюстрации OK), архитектор (hotfix upload→БД, архив).

**Сделано:** Storage `illustrations`, форма upload/delete, `0006` SQL; push `b72b952`.

**Git:** архив `tasks/done/014-illustrations-storage/`.

**Следующий шаг:** TASK-015 — модерация и бан.

---

## 2026-10-06 — TASK-015 (E4) на main, активен TASK-016

**Сделано:** модерация `/admin`, push `0bc8fd1`; дополнение E6 → `consultant-block-E-addendum-E6.md`.

**Следующий шаг:** TASK-016 — ответы автора; затем TASK-017 (никнейм).

---

## 2026-10-06 — TASK-016 (E5) принят

**Сделано:** ответы автора на StoryDetail; E2E пользователя OK; commit `0e8b1d5`.

**Следующий шаг:** TASK-017 — reader_profiles, затем финал блока E.
