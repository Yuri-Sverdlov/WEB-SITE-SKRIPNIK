# Отчёт (кодер → архитектор)

**Задание:** TASK-012  
**Дата:** 2026-10-05  
**Статус:** выполнено (ожидает приёмки)

## Сделано

- **`src/api/admin.ts`** — `fetchIsAdmin()` через `supabase.rpc('is_admin')`.
- **`src/hooks/useIsAdmin.ts`** — проверка автора при наличии сессии.
- **`src/pages/admin/AdminLayout.tsx`** — guard (гость → `/login` с `state.from: '/admin'`, не-автор → «Нет доступа», автор → shell + меню).
- **`src/pages/admin/AdminSectionPlaceholder.tsx`** — заглушки разделов.
- **`src/App.tsx`** — вложенные маршруты `/admin/...` (index → `/admin/stories`), ссылка «Кабинет» только для автора.

Маршруты разделов: `/admin/stories`, `/admin/comments`, `/admin/guestbook`, `/admin/banned`.

## Проверки

### `npm run build`

```
> web-site-skripnik@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 92 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-Bn3RyyGf.css   10.50 kB │ gzip:   2.94 kB
dist/assets/index-BUdk9FMa.js   502.83 kB │ gzip: 144.89 kB

[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 458ms
```

### `npm run lint`

```
> web-site-skripnik@0.0.0 lint
> oxlint

src/hooks/useIsAdmin.ts:14:7: warning react(set-state-in-effect): ...
src/hooks/useIsAdmin.ts:13:10: warning react-hooks(exhaustive-deps): ...
src/components/StoryListPage.tsx:25:22: warning react-hooks(exhaustive-deps): ...
src/pages/StoryDetail.tsx:32:7: warning react(set-state-in-effect): ...
```

Exit code: **0** (новые предупреждения только в `useIsAdmin.ts`, остальные — прежние).

### Вживую (dev, `.env.local`)

| Сценарий | Кто проверил | Результат |
|---|---|---|
| Гость → `/admin` → редирект на `/login` | кодер (browser, localhost:5173) | OK, URL `/login`, в шапке «Войти» |
| Автор → меню 4 пункта, «Кабинет» | — | **не проверялось** (нет пароля в сессии кодера) |
| Читатель test.hermes → «Нет доступа», без «Кабинет» | — | **не проверялось** |
| Login → return `/admin` для автора | — | **не проверялось** |

Рекомендуется приёмка архитектором/пользователем по чек-листу TASK.

## Git

- Локальный **commit** — по TASK (см. ниже).
- **Push не выполнялся** (по TASK).

## Проблемы

- Нет.
