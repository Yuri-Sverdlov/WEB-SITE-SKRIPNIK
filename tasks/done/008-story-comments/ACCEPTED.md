Accepted: 2026-10-03. **Блок D2** — TASK-008.

## Приёмка

- build/lint OK (87 модулей; 2 warning унаследованы TASK-003).
- Код: `comments.ts`, `messageErrors.ts`, `ReaderMessageList`, `ReaderMessageForm`, блок в `StoryDetail.tsx`; `is_author_reply` не в UI.
- **Гость:** кодер — вживую (лента, ссылка `/login`, без формы).
- **Вошедший:** пользователь — путь 2 (2026-10-03): return после входа на тот же рассказ; комментарий в ленте; 4-й за минуту — «Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту»; F5 — OK.
- **Hotfix при приёмке:** «Выйти» → редирект на `/login` (`App.tsx`, `replace`), по запросу пользователя.

## Git

- `839134f` — код TASK-008 (кодер)
- `6de7a9a` — REPORT hash (кодер)
- commit приёмки архитектора — см. `origin/main` после push

## Следующий

TASK-009 — страница `/guestbook`.
