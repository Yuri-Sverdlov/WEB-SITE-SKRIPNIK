# Задание (архитектор → кодер)

**ID:** TASK-004  
**Дата:** 2026-09-20  
**Статус:** принято (2026-10-02)  
**Этап C:** регистрация и вход читателей (Supabase Auth)  
**Архив:** `tasks/done/004-readers-auth/`

---

## Цель

Дать посетителям **регистрацию и вход** (email + пароль). Приложение должно **знать**, авторизован ли пользователь — это понадобится в этапе D (комментарии, гостевая книга).

**Не входит:** формы комментариев и гостевой книги (этап D).

---

## Контекст

- Supabase-клиент: `src/api/supabaseClient.ts`
- Auth API уже в `@supabase/supabase-js` (отдельный пакет не нужен)
- **RLS / SQL / Dashboard не трогать** — только фронтенд + Supabase Auth API
- Регистрация: **email + пароль** (OAuth не нужен)
- Восстановление пароля — **опционально**: если успеешь без лишней сложности, добавь ссылку «Забыли пароль?» через `resetPasswordForEmail` (бесплатно в Supabase). Если нет — пропусти, опиши в REPORT

---

## Решения архитектора (следуй)

| Решение | Как |
|---|---|
| Сессия | React Context `AuthProvider` + хук `useAuth()` |
| Роуты | `/login`, `/register` — отдельные страницы |
| Шапка | В **глобальном** nav `App.tsx`: email + «Выйти» или ссылки «Войти» / «Регистрация» |
| После входа/регистрации | Redirect на `/` (или `location.state.from` если передашь) |
| Rate limit | Встроенный лимит Supabase Auth + **disable кнопки** на время запроса (anti-double-submit) |
| Ошибки | Маппинг типичных сообщений Supabase → **русский** текст для пользователя |

---

## Что сделать

### 1. `src/contexts/AuthProvider.tsx`

- Обёртка над `supabase.auth.onAuthStateChange` + начальная `getSession()`
- Экспорт:
  ```typescript
  useAuth(): {
    user: User | null
    session: Session | null
    loading: boolean
    signOut: () => Promise<void>
  }
  ```
- `loading === true` пока не получена первая сессия

Подключить в `src/main.tsx`: `<AuthProvider>` внутри `<BrowserRouter>`, снаружи `<App>`.

### 2. `src/api/auth.ts`

Функции-обёртки:

- `signUp(email, password)` → `supabase.auth.signUp`
- `signIn(email, password)` → `supabase.auth.signInWithPassword`
- `signOut()` → `supabase.auth.signOut`
- `resetPassword(email)` → `supabase.auth.resetPasswordForEmail` (если делаешь восстановление)
- `mapAuthError(message: string): string` — перевод/нормализация ошибок на русский

Минимальный набор русских сообщений:

| Ситуация | Текст (пример) |
|---|---|
| Неверный email/пароль | «Неверный email или пароль» |
| Email занят | «Пользователь с таким email уже зарегистрирован» |
| Слабый пароль | «Пароль должен быть не короче 6 символов» |
| Email не подтверждён | «Подтвердите email — проверьте почту» (если проект Supabase требует confirmation) |
| Rate limit | «Слишком много попыток. Попробуйте позже» |
| Прочее | «Ошибка: …» или исходное сообщение |

### 3. `src/pages/Register.tsx`

- Поля: email, пароль, повтор пароля
- Валидация на клиенте: email не пустой, пароли совпадают, длина ≥ 6
- Submit → `signUp` → успех: сообщение «Проверьте почту» **или** автоматический вход (если confirmation отключён в Supabase — опиши в REPORT что наблюдал)
- Ссылка «Уже есть аккаунт? Войти» → `/login`
- Tailwind, аккуратная форма

### 4. `src/pages/Login.tsx`

- Поля: email, пароль
- Submit → `signIn` → redirect на `/`
- Ссылка «Нет аккаунта? Зарегистрироваться» → `/register`
- Опционально: «Забыли пароль?»

### 5. `src/App.tsx`

- Импорт `useAuth`
- В nav (справа или в конце):  
  - если `loading` — ничего или «…»  
  - если `user` — `{user.email}` + кнопка **«Выйти»**  
  - иначе — ссылки **«Войти»** / **«Регистрация»**
- Роуты: `/login`, `/register`

### 6. Scope — не трогать

- `stories.ts`, страницы рассказов (кроме App nav)
- SQL, RLS, Supabase Dashboard
- GuestBook, комментарии
- `AGENTS.md`, `CONTEXT.md`, `PROJECT_LOG.md`

---

## Проверки (полный вывод в REPORT)

### A. `npm run build` — exit 0

### B. Регистрация

1. Зарегистрировать **новый** email (уникальный, напр. `test+<timestamp>@example.com` — если Supabase принимает; иначе свой тестовый ящик)
2. Зафиксировать поведение: нужно ли подтверждение email
3. Ошибка «email занят» — попробовать тот же email второй раз, показать русское сообщение

### C. Вход / выход

1. Войти с созданным аккаунтом
2. В шапке виден **email**
3. «Выйти» → email исчезает, снова «Войти» / «Регистрация»
4. Неверный пароль → русское сообщение

### D. Защищённое состояние

В REPORT явно: `useAuth().user !== null` после входа, `null` после выхода (можно `console.log` в dev или описать по UI).

### E. Консоль браузера — без красных ошибок

---

## Git

**Не делать** commit/push — приёмку и push делает архитектор.

---

## Критерии приёмки

- [ ] AuthProvider + useAuth, сессия переживает refresh страницы
- [ ] Register + Login + logout в шапке
- [ ] Ошибки на русском
- [ ] Anti-double-submit на формах
- [ ] REPORT с полным выводом проверок
- [ ] RLS/SQL не менялись

---

## Отчёт

Заполни **`tasks/REPORT.md`**.

---

## Приёмка (архитектор, 2026-10-02)

- `npm run build` — **OK** (exit 0, vite 8.3.0, 83 модуля).
- `npm run lint` — **0 ошибок** (2 warning'а унаследованы из TASK-003, файлы вне scope).
- Код-ревью: `AuthProvider` + `useAuth`, страницы `/login` и `/register`, logout + email в шапке, русские сообщения об ошибках, anti-double-submit.
- **Не проверено вживую:** вход/выход с подтверждённым email — в Supabase включён confirm email, доступа к ящику нет. Подробнее — `tasks/done/004-readers-auth/ACCEPTED.md`.

Итог: **Этап C принят**. Активного задания нет — следующий этап ждёт брифа консультанта.
