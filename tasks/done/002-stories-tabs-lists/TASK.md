# Задание (архитектор → кодер)

**ID:** TASK-002  
**Дата:** 2026-09-20  
**Статус:** активно  
**Этап B (часть 1/2):** общая инфраструктура «Рассказы» + три вкладки-списка + пагинация

> **TASK-003** (часть 2): StoryDetail + RPC-счётчик + поиск — после приёмки TASK-002.

---

## Цель

Построить **единый раздел «Рассказы»** на трёх роутах с общей навигацией-табами и **реальными данными Supabase**. Пагинация **15/страница на всех вкладках**.

Поиск и StoryDetail — **не в этом TASK** (TASK-003).

---

## Контекст (решения консультанта)

- Роуты остаются: `/stories/new`, `/stories/popular`, `/stories/all`
- Визуально — **один раздел** с табами сверху (общий компонент на всех трёх страницах)
- Поле просмотров в БД: **`views_count`** (не `views`)
- В БД ~20 тестовых рассказов (3 исходных + 17 добавленных)
- «Разговор с отцом» (авг 2025) **старше 365 дней** — не должен быть во вкладке «Новые»
- `illustrations` — `text[]` URL; пока пусто — в списках не показывать

---

## Что сделать

### 1. Общие типы и API — `src/api/stories.ts`

Экспортировать:

```typescript
export const PAGE_SIZE = 15

export type StoryListItem = {
  id: string
  title: string
  published_at: string | null
  views_count: number | null
  tags: string[] | null
}

export type StoriesPageResult = {
  data: StoryListItem[]
  count: number | null
  error: string | null
}
```

Функции (каждая принимает `page: number`, 0-based, использует `.range()`):

| Функция | Фильтр / сортировка |
|---|---|
| `fetchStoriesNew(page)` | `published_at >= now() - 365 days`, order `published_at DESC` |
| `fetchStoriesPopular(page)` | без фильтра даты, order `views_count DESC` |
| `fetchStoriesAll(page)` | без фильтра, order `published_at DESC` |

Паттерн запроса:

```typescript
supabase.from('stories').select('*', { count: 'exact' }).order(...).range(from, to)
// + .gte('published_at', cutoffIso) для New
```

`from = page * PAGE_SIZE`, `to = from + PAGE_SIZE - 1`.

### 2. Компонент `src/components/StoryCard.tsx`

Карточка списка:

- заголовок — `Link` на `/stories/:id`
- дата (`ru-RU`), `views_count`, теги-чипы
- Tailwind, стиль согласовать с текущим `StoriesAll.tsx`

### 3. Компонент `src/components/StoriesTabNav.tsx`

- Три таба-ссылки: **Новые** → `/stories/new`, **Популярные** → `/stories/popular`, **Все** → `/stories/all`
- Активный таб — визуально выделен (`useLocation().pathname`)
- Заголовок раздела: «Рассказы»
- **Поле поиска НЕ добавлять** (будет в TASK-003) — только табы

### 4. Компонент `src/components/StoryListPage.tsx` (рекомендуется)

Общая обёртка для трёх страниц:

- рендерит `StoriesTabNav`
- состояние: `page`, `loading`, `error`, `stories`, `hasMore`
- принимает prop `fetchPage: (page: number) => Promise<StoriesPageResult>`
- список `StoryCard` + пагинация «Назад» / «Вперёд» + «Страница N»
- логику пагинации можно взять из текущего `StoriesAll.tsx`

### 5. Три страницы

| Файл | fetchPage |
|---|---|
| `StoriesNew.tsx` | `fetchStoriesNew` |
| `StoriesPopular.tsx` | `fetchStoriesPopular` |
| `StoriesAll.tsx` | `fetchStoriesAll` |

Каждая — тонкая обёртка над `StoryListPage` (или эквивалент без дублирования).

**Рефакторинг:** убрать дублированный код из текущего `StoriesAll.tsx`.

### 6. Scope — не трогать

- `StoryDetail.tsx` (TASK-003)
- `Home.tsx`, `App.tsx` (глобальная nav в App — не трогать; табы только внутри раздела рассказов)
- `AGENTS.md`, `CONTEXT.md`, `PROJECT_LOG.md`
- SQL / Supabase Dashboard

---

## Проверки (полный вывод в REPORT)

### A. `npm run build` — exit 0

### B. Браузер — вкладка «Новые» (`/stories/new`)

1. Список отсортирован от новых к старым
2. **«Разговор с отцом» отсутствует**
3. «Первый снег» и «Дорога домой» **присутствуют**

### C. Браузер — «Популярные» (`/stories/popular`)

1. Сверху рассказ с **наибольшим** `views_count`

### D. Браузер — «Все» (`/stories/all`)

1. Полный список, «Разговор с отцом» **есть**
2. **Пагинация:** при ~20 рассказах — **страница 2** (кнопка «Вперёд» активна на стр. 1, на стр. 2 — 5 карточек)

### E. Общее

- Табы видны на всех трёх страницах, активный таб корректен
- Клик по карточке → `/stories/:id` (заглушка OK)
- Консоль без красных ошибок

### F. Sanity в REPORT

Перечисли топ-3 заголовка на «Популярные» (доказательство сортировки по views).

---

## Git

**Не делать** commit/push.

---

## Критерии приёмки

- [ ] Общие компоненты + `stories.ts`, без дублирования в трёх страницах
- [ ] Фильтр 365 дней на «Новые»
- [ ] Сортировка popular по `views_count DESC`
- [ ] Пагинация 15/стр. на **всех** вкладках
- [ ] Таб-навигация как единый раздел
- [ ] REPORT с полным выводом build и результатами проверок B–F

---

## Отчёт

Заполни **`tasks/REPORT.md`**.
