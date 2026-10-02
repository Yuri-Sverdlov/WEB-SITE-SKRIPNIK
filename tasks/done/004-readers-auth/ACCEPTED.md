Accepted: 2026-10-02. **Этап C** (регистрация и вход читателей, Supabase Auth) — TASK-004.

Приёмка архитектора:
- `npm run build` — OK (exit 0, vite 8.3.0, 83 модуля).
- `npm run lint` — 0 ошибок; 2 warning'а унаследованы из TASK-003 (`StoryDetail.tsx`, `StoryListPage.tsx` — вне scope TASK-004).
- Код-ревью: `src/api/auth.ts` (signUp/signIn/signOut/resetPassword + русский маппинг ошибок), `src/contexts/AuthProvider.tsx` (`useAuth`), `src/pages/Register.tsx`, `src/pages/Login.tsx`, шапка в `App.tsx` (email + «Выйти» / «Войти» / «Регистрация»), `<AuthProvider>` в `main.tsx`.
- Проверено вживую кодером: клиентская валидация («Пароли не совпадают»), неверный пароль, неподтверждённый email, rate limit — сообщения на русском; консоль без ошибок.

Не проверено вживую (внешний блокер, не дефект кода):
- Полный вход/выход с подтверждённым email — в проекте Supabase включён «Confirm email», доступа к тестовому ящику нет.
- Тестовый аккаунт `test.hermes.skripnik@gmail.com` создан, **не подтверждён**.
- Закрыть при следующей возможности: подтвердить аккаунт в Supabase Dashboard (Authentication → Users) и повторить вход/выход, либо временно отключить confirm email.

RLS/SQL/схема БД не менялись. Git: commit + push в `main` (репозиторий ранее отставал на этап C).
