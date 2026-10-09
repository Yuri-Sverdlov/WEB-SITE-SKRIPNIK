# Задание (архитектор → кодер)

**ID:** TASK-019  
**Дата:** 2026-10-09  
**Статус:** к выполнению  
**Блок:** F1 — направление дизайна + превью страницы рассказа  
**Бриф:** `tasks/consultant-block-F-brief.md` § F1 · решения: `tasks/consultant-block-F-decisions.md`

**Старт сессии:** **`git pull`**, затем `AGENTS.md`, `CONTEXT.md`, этот файл.

---

## Цель

Снять ориентиры с образцов, зафиксировать **`reference/design-direction.md`**, перенести палитру и шрифты в **`tailwind.config.js`**, показать **страницу рассказа** (`/stories/:id`) с **минимальной шапкой** в новом стиле. Поставить **Playwright** для скриншотов. **Полное меню F2, typography plugin (F3), остальные страницы — не в этом TASK.**

**Остановка:** после TASK архитектор показывает пользователю скрин **`reference/screens/f1-story-detail.png`** — дальше F2 только после «ок» пользователя (не ваше решение).

---

## Зафиксированные решения

| Тема | Решение |
|---|---|
| Образцы | evgeny-yakubovich.art (структура), akunin.ru (настроение) — **не копировать дословно** |
| Dembrandt | 1–2 попытки; **не блокер** — plan B ниже |
| Превью | **StoryDetail** на обычном маршруте + **минимальная шапка** (название сайта из `site.ts`, без полного меню F2) |
| Шрифт текста рассказа | с засечками, кириллица; основной текст **≥ 18px**; колонка ~60–70 знаков |
| Playwright | devDependency; **`scripts/screens.mjs`**; ширина **1280**; вывод **`reference/screens/`** |
| URL | не менять |
| Push | **не делать** |

---

## Что сделать

### 1. Dembrandt (ПК2, при наличии сети)

```bash
npx dembrandt https://evgeny-yakubovich.art/ --design-md --screenshot
npx dembrandt https://www.akunin.ru/main.html --design-md --screenshot
```

При необходимости один раз: `npx dembrandt install-browser`.

Сложить артефакты в:

- `reference/yakubovich/`
- `reference/akunin/`

**Plan B** (если Dembrandt не сработал): в REPORT описать причину; палитру/шрифты взять по **скринам**, которые пользователь положит в те же папки (или по публичному виду сайтов). В **`design-direction.md`** явно указать источник («Dembrandt» / «ручной разбор скринов»).

### 2. `reference/design-direction.md`

Одна страница:

- палитра: фон, текст, акcent, ссылки, служебный серый (4–6 цветов, hex);
- шрифты (Google Fonts или локально): **serif** для тела рассказа, **sans или serif** для шапки/заголовков;
- max-width колонки, `line-height`, базовый `font-size`;
- что берём у Yakubovich / Akunin и что **не** берём.

### 3. `tailwind.config.js`

Расширить `theme`: цвета и `fontFamily` из design-direction (имена токенов понятные: `paper`, `ink`, `accent`, …).

Подключить шрифты (например `@import` в `src/index.css` или link в `index.html`).

### 4. Минимальная шапка + StoryDetail (превью F1)

- Новый компонент, например **`src/components/SiteHeaderPreview.tsx`**: только заголовок сайта (`SITE_TITLE` из `src/config/site.ts`), спокойная типографика, фон/граница по теме. **Без** полного меню F2.
- **`StoryDetail`:** обернуть контент рассказа (заголовок, мета, текст, иллюстрации) в стили темы — serif для текста, отступы, цвета. Комментарии можно **слегка** привести к палитре, но **глубокая** проработка комментариев — TASK-021.
- **`App.tsx`:** показывать `SiteHeaderPreview` **на маршруте StoryDetail** (и при желании только там), старую dev-навигацию **не трогать** на остальных страницах (F2 уберёт).

**Не ставить** `@tailwindcss/typography` — это F3 (TASK-021).

### 5. Playwright

- `npm install -D playwright` (или `@playwright/test` — на усмотрение, главное рабочий скрипт).
- **`scripts/screens.mjs`**: CLI, опционально `BASE_URL` (default `http://localhost:5173`).
- Для F1 минимум: сохранить **`reference/screens/f1-story-detail.png`** — страница **реального** рассказа (id передать аргументом или env `STORY_ID`; в REPORT указать, какой id использовали).
- В **`package.json`**: скрипт `"screens": "node scripts/screens.mjs"`.

Документировать в REPORT: перед снимком нужен `npm run dev` (или BASE_URL на Vercel).

### 6. `.gitignore`

Проверить: тяжёлые артефакты Dembrandt не нужны в git, если дублируют скрины — но **`reference/`** (design-direction, screens, md от dembrandt) **коммитить**.

---

## Проверки

```text
npm run build
npm run lint
npm run screens   # с dev-сервером и STORY_ID
```

**`tasks/REPORT.md`:** полный вывод build/lint; путь к **`reference/screens/f1-story-detail.png`**; Dembrandt или plan B; hash commit; **не push**.

---

## Git

**Commit:** `TASK-019: F1 design-direction, tailwind theme, StoryDetail preview, Playwright screens`  
**Push — не делать.**
