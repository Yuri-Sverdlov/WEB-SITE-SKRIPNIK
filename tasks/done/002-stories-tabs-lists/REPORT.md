# Отчёт (кодер → архитектор)

**Задание:** TASK-002 — общая инфраструктура «Рассказы» + три вкладки  
**Дата:** 2026-09-20  
**Статус:** выполнено

---

## Что сделано

**Новые файлы:**
- `src/api/stories.ts` — общие типы (`StoryListItem`, `StoriesPageResult`) + 3 функции `fetchStoriesNew/Popular/All`. Каждая использует `.range()` пагинацию PAGE_SIZE=15. `fetchStoriesNew` фильтрует `published_at >= now() - 365 дней`.
- `src/components/StoryCard.tsx` — карточка: заголовок (Link на `/stories/:id`), дата (ru-RU), `views_count`, теги-чипы.
- `src/components/StoriesTabNav.tsx` — три таба (Новые/Популярные/Все) с `useLocation().pathname` для подсветки активного.
- `src/components/StoryListPage.tsx` — общая обёртка: рендерит `StoriesTabNav`, состояние (page/loading/error/stories/hasMore), принимает `fetchPage` prop, рендерит `StoryCard` + пагинацию.

**Изменённые файлы:**
- `src/pages/StoriesAll.tsx` — теперь тонкая обёртка `<StoryListPage fetchPage={fetchStoriesAll} />`.
- `src/pages/StoriesNew.tsx` — была заглушка, теперь `<StoryListPage fetchPage={fetchStoriesNew} />`.
- `src/pages/StoriesPopular.tsx` — была заглушка, теперь `<StoryListPage fetchPage={fetchStoriesPopular} />`.

## Проверки (полный вывод команд)

### A. npm run build

```
> web-site-skripnik@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 79 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-Cu8JU4A2.css    7.66 kB │ gzip:   2.38 kB
dist/assets/index-4jsSUaHD.js   479.00 kB │ gzip: 138.53 kB

✓ built in 427ms
```

Exit code: **0**. `✓ built` присутствует.

### B. Браузер — «Новые» (`/stories/new`)

- Список отсортирован от новых к старым. 13 рассказов (все за последние 365 дней).
- **«Разговор с отцом» отсутствует** (август 2025, >365 дней).
- **«Первый снег»** и **«Дорога домой» присутствуют**.
- Пагинация: кнопка «Назад» disabled (стр.1), «Вперёд» неактивен — рассказов менее PAGE_SIZE=15.
- Консоль браузера: ошибок нет.

### C. Браузер — «Популярные» (`/stories/popular`)

- Сортировка по `views_count` DESC. **Топ-3 по просмотрам:**
  1. «Тестовый рассказ 2» — 496 просмотров
  2. «Тестовый рассказ 9» — 481 просмотров
  3. «Тестовый рассказ 7» — 459 просмотров
- Пагинация: кнопка «Вперёд» активна (>15 рассказов), «Назад» disabled.
- Таб «Популярные» визуально активен.

### D. Браузер — «Все» (`/stories/all`)

- Полный список ~20 рассказов, сортировка от новых к старым.
- **Стр.1:** 15 рассказов (Тестовый рассказ 1 — Тестовый рассказ 13 + Первый снег + Дорога домой).
- **Стр.2:** 5 рассказов — Тестовый рассказ 14, 15, 16, 17, **«Разговор с отцом»**.
- Пагинация: на стр.1 «Вперёд» активен, «Назад» disabled. На стр.2 «Вперёд» disabled (конец), «Назад» активен.

### E. Общее

- Табы видны на всех трёх страницах, активный таб корректен (подсвечен синим).
- Клик по карточке → `/stories/:id` → заглушка StoryDetail (проверено: «Первый снег»).
- Консоль браузера на всех страницах: **ошибок нет** — только `[vite] connecting...`, `[vite] connected.`, React DevTools info.

## Проблемы / блокеры

Нет.

## Git

Commit/push **не делался** — не запрашивалось в TASK.