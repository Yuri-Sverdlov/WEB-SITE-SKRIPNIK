# Отчёт (кодер → архитектор)

**Задание:** TASK-009 — D3: гостевая книга `/guestbook`  
**Дата:** 2026-10-03  
**Статус:** код готов, build/lint OK. Проверка «гость» — **выполнена вживую**. Проверки «вошедший» (запись, 4-я за минуту) — **не выполнены кодером** (нет доступа к паролю; TASK это допускает). Push не делал.

---

## Что сделано

| Файл | Что |
|---|---|
| `src/api/guestbook.ts` | **новый** — `fetchGuestbookEntries()` (select `id, author_name, body, created_at`, порядок `created_at ASC`), `insertGuestbookEntry({ userId, authorName, body })` — без `story_id`, ошибки через `mapReaderMessageError` |
| `src/pages/GuestBook.tsx` | заглушка `<h1>` заменена на страницу: заголовок «Гостевая книга», `ReaderMessageList` + `ReaderMessageForm` для вошедшего, приглашение войти для гостя, обновление ленты после успешной отправки |
| `src/api/comments.ts` | одна правка ради переиспользования: экспортируемая валидация переименована `validateCommentInput` → **`validateReaderMessageInput`** (поведение то же, сообщения те же; имя теперь не «комментарийное», потому что функцию использует и гостевая). Внутренний вызов обновлён |

**Соответствия TASK:**
- компоненты TASK-008 переиспользованы без изменений (`ReaderMessageList`, `ReaderMessageForm`), общая функция ошибок — `mapReaderMessageError`;
- границы 2–40 / 1–2000 не дублируются: константы и валидатор берутся из `comments.ts` (TASK разрешал «вынести общие константы с comments.ts»);
- `user_id` = session user id; `story_id` не передаётся; email в UI не показывается — только `author_name`;
- гость: «Войдите, чтобы оставить запись в гостевой книге.» со ссылкой `/login` и `state={{ from: location.pathname }}`;
- `submitLabel` = «Отправить запись»;
- не тронуто: SQL/RLS/0003, логика комментариев на `StoryDetail`, `App.tsx` (logout → `/login` оставлен как есть после hotfix 008).

---

## Проверки (полный вывод)

### A. `npm run build`

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
dist/assets/index-DjktVIN_.js   499.34 kB │ gzip: 143.97 kB

✓ built in 1.06s
```

Exit code **0** (было 87 модулей в 008 → 88, +`guestbook.ts`).

### B. `npm run lint`

```
> web-site-skripnik@0.0.0 lint
> oxlint

src/pages/StoryDetail.tsx:32:7: warning react(set-state-in-effect): ...
src/components/StoryListPage.tsx:25:22: warning react-hooks(exhaustive-deps): ...
```

Exit code **0** — **0 errors**, 2 warning'а, оба унаследованы (`StoryDetail` — TASK-003, `StoryListPage` — TASK-002/003). Новых нет: эффект загрузки в `GuestBook.tsx` написан в стиле файла (nested `async function load()`), поэтому warning `set-state-in-effect` не появился.

### C. Живые проверки — ГОСТЬ (выполнено)

Dev-сервер `npm run dev` (localhost:5173), реальный браузер, анонимный посетитель:

```
=== URL: /guestbook
=== h1: Гостевая книга
=== текст страницы (main) ===
Гостевая книга

Записей пока нет — оставьте первую.

Войдите, чтобы оставить запись в гостевой книге.
=== форма (textarea#reader-body) есть?: False
=== ссылка «Войдите»: href=/login
=== ссылка GuestBook в навигации ведёт на: /guestbook
=== errors: []
=== logs: ["info: %cDownload the React DevTools ..."]
```

Что это доказывает:
- страница реально читает `guestbook_entries` из живой БД (пустая таблица → текст «Записей пока нет…», а не ошибка) — SELECT под anon-ключом и RLS работают;
- гость **формы не видит** — только приглашение со ссылкой на `/login`;
- роут `/guestbook` и ссылка в навигации на месте;
- консоль — **0 ошибок** (перехват `console.*`, `window.onerror`, `unhandledrejection`).

### D. Живые проверки — ВОШЕДШИЙ (НЕ выполнено, ожидает пользователя)

Проверить нужно: запись в гостевой вошедшим; 4-я за минуту → русская ошибка rate limit; F5 — запись на месте; консоль без ошибок.

Кодером не выполнено: пароля тестового аккаунта у меня нет, хранилище паролей Hermes для `localhost:5173` пусто, а запросы на сохранение логина были отклонены (в TASK-008 — дважды). TASK-009 прямо допускает этот сплит («сценарий "вошедший" может подтвердить пользователь»).

**Чек-лист для ручного прогона** (нужен `npm run dev`, адрес `http://localhost:5173/guestbook`):
1. Открыть `/guestbook` гостем → лента, формы нет → нажать «Войдите» → после входа должно **вернуть на `/guestbook`** (проверка `state.from`).
2. Вошедшим отправить запись (имя 2–40, текст 1–2000) → запись появляется в ленте внизу (старые сверху).
3. Отправить 4-ю за минуту → русская ошибка **«Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту»**.
4. F5 → запись на месте, сессия сохраняется.
5. Проверить консоль браузера — красных ошибок нет.
6. Граница валидации: имя из 1 символа / текст > 2000 → клиентское русское сообщение, запрос в БД не уходит.

Альтернатива: сохранить пароль в хранилище Hermes (Settings → Passwords & Logins для `localhost:5173`) — тогда я закрою п. D сам в этой сессии; пароль в чат присылать не нужно.

---

## Что не сделано / передаётся

1. Живые проверки «вошедший» (п. D) — ждут ручного прогона или пароля в хранилище.
2. `supabase/блоки (A)–(D)-SQL.txt` (вывод пользователя из TASK-007) — по-прежнему **незакоммичен**; я его не трогал (вне scope). Сказать, коммитить ли.
3. Проверено на всякий случай: `README.md` существует и отслеживается git (`git ls-files` → `README.md`, 3317 байт) — упоминание в `CONTEXT.md` корректно, проблемы нет.

---

## Git

По TASK push не делается. Локальный commit — только мои файлы (`src/api/guestbook.ts`, `src/api/comments.ts`, `src/pages/GuestBook.tsx`, `tasks/REPORT.md`):

```
$ git add src/api/guestbook.ts src/api/comments.ts src/pages/GuestBook.tsx tasks/REPORT.md
$ git commit -m "TASK-009: гостевая книга /guestbook (лента + форма, переиспользование компонентов)"
[main 488817a] TASK-009: гостевая книга /guestbook (лента + форма, переиспользование компонентов)
 4 files changed, 295 insertions(+), 6 deletions(-)
 create mode 100644 src/api/guestbook.ts

$ git log -1 --oneline
488817a TASK-009: гостевая книга /guestbook (лента + форма, переиспользование компонентов)

$ git status --short --branch
## main...origin/main [ahead 2]
?? "supabase/блоки (A)–(D)-SQL.txt"   <- вывод пользователя из TASK-007, не коммитил
```

Итог: локальные коммиты `488817a` + `REPORT: git hash для TASK-009`, ветка **впереди `origin/main`** — push не делал (по TASK его выполняет архитектор после приёмки).

Не коммитил: `.env.local`, `supabase/блоки (A)–(D)-SQL.txt`, `dist/`.

---

## Приёмка (дополнение)

**Пользователь (2026-10-03):** п. 1–5 чек-листа — OK. П. 6: имя 1 символ — OK; текст >2000 — не блокировался (причина: `maxLength={2000}` на textarea).

**Архитектор:** hotfix `ReaderMessageForm` — без `maxLength` на теле сообщения; повторная проверка п. 6 — пользователю.
