Accepted: 2026-10-09. **F1** — TASK-019.

## Приёмка

- Код: `d3fed45`; Dembrandt оба образца; `reference/design-direction.md`, Tailwind-тема.
- Playwright: `scripts/screens.mjs`, `reference/screens/f1-story-detail.png`.
- build/lint OK.
- **Пользователь (2026-10-09):** утверждает скрин F1 как **начальный этап** дизайна → можно F2.

## Заметки

- На скрине Playwright видна старая dev-навигация `App.tsx` — снимается в **TASK-020**.
- При съёмке возможна ошибка Supabase «single JSON object» без `.env`/данных — на живом Vercel с рассказом проверить отдельно.

## Следующий

**TASK-020** (F2): полная шапка, меню, подвал, title, favicon.
