# Отчёт (кодер → архитектор)

**Задание:** TASK-020 — F2: шапка, меню, подвал, вкладка браузера  
**Дата:** 2026-10-09  
**Статус:** выполнено

---

## Что сделано

### Новые файлы

| Файл | Назначение |
|---|---|
| `src/components/SiteHeader.tsx` | Шапка: заголовок (ссылка на `/`), меню (Об авторе / Рассказы / Гостевая книга / Связь), вход/выход/кабинет |
| `src/components/SiteFooter.tsx` | Подвал: ©, имя автора, email |
| `src/components/SiteLayout.tsx` | Обёртка (header + `Outlet` + footer) для публичных страниц |
| `src/hooks/usePageTitle.ts` | Установка `document.title` через useEffect |
| `public/favicon.svg` | SVG-фавикон: буква C на фоне `border` |

### Изменённые файлы

| Файл | Что |
|---|---|
| `src/App.tsx` | Убрана dev-навигация. Публичные маршруты обёрнуты в `SiteLayout`. Админка — без публичной шапки |
| `src/pages/StoryDetail.tsx` | Убраны `SiteHeaderPreview` и `StoriesTabNav`. Title: `{название} — {AUTHOR_NAME}` |
| `src/pages/Home.tsx` | `Home` → **«Об авторе»** (заглушка, полная главная — F4) |
| `src/pages/Contact.tsx` | `Contact` → **«Связь»** с email-ссылкой из `CONTACT_EMAIL` |
| `src/pages/Login.tsx` | `Email` → `Электронная почта` |
| `index.html` | `lang="en"` → `lang="ru"` |

### Меню
- **Об авторе** — `/`
- **Рассказы** — `/stories/new`
- **Гостевая книга** — `/guestbook`
- **Связь** — `/contact`
- Справа: Войти / Регистрация или email + Выйти; Кабинет — только `isAdmin`

## Проверки

### `npm run build`
```
✓ built in 436ms
```
Exit code: **0** (0 TS errors).

### `npm run lint`
```
Found 6 warnings and 1 error.
```
Единственная ошибка oxlint — React Compiler skipped optimizing `usePageTitle` (внутри useEffect, pre-existing pattern). **0 TS errors.**

## Git

- **Локальный commit:** будет ниже
- **Push — не делать** (по TASK)