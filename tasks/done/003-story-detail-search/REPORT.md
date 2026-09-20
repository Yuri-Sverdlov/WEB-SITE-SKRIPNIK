# Отчёт (кодер → архитектор)

**Задание:** TASK-003 — StoryDetail + RPC-счётчик + поиск  
**Дата:** 2026-09-20  
**Статус:** выполнено

---

## Что сделано

**Новые / изменённые файлы:**

### 1. `src/api/stories.ts`
- Добавлен тип `StoryDetail` (extends `StoryListItem` + `content`, `illustrations`)
- Добавлена функция `searchStories(page, query)` — `.or(title.ilike.%q%,content.ilike.%q%)` с экранированием `%` и `_`, пагинация `.range()`, сортировка `published_at DESC`
- Добавлена функция `fetchStoryById(id)` — `select('*').eq('id', id).single()`
- Добавлена функция `incrementViews(id)` — вызов RPC `increment_story_views({ story_id_input: id })`

### 2. `src/pages/StoryDetail.tsx`
- Полноценная страница рассказа:
  - Загрузка по `useParams().id` через `fetchStoryById`
  - Отображение: title, content (`whitespace-pre-wrap`), tags, published_at (ru-RU), views_count
  - `illustrations`: если массив непустой — `<img>` для каждого URL
  - RPC `increment_story_views` вызывается при каждой загрузке, отображаемый счётчик = исходный + 1
  - Состояния: загрузка, ошибка, «рассказ не найден»
  - Ссылка «← к списку» на `/stories/all`

### 3. `src/components/StoriesTabNav.tsx`
- Добавлен controlled input поиска с `useSearchParams()`
- При непустом `?q=` заголовок меняется на «Результаты поиска»
- Табы остаются видимыми; клик по табу очищает поиск

### 4. `src/components/StoryListPage.tsx`
- Читает `?q=` из URL через `useSearchParams`
- Когда `query` непустой — вызывает `searchStories(page, query)` вместо `fetchPage`
- Пагинация работает и в режиме поиска

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
dist/assets/index-D2QF6nU9.css    8.57 kB │ gzip:   2.58 kB
dist/assets/index-IYLzzF2s.js   483.20 kB │ gzip: 139.68 kB

✓ built in 895ms
```

Exit code: **0**.

### B. StoryDetail

1. **Открыт «Первый снег»** (клик по ссылке из списка)
2. **Видно:** заголовок «Первый снег», дата 18.09.2026, теги ностальгия/зима, контент «Текст рассказа про первый снег...», счётчик просмотров
3. **Счётчик (проверка RPC):**
   - Изначально в списке: **150** просмотров
   - После первого захода на страницу: **151** (150 + 1 от RPC)
   - После возврата со списка (где уже 151) и повторного захода: **152** (151 + 1)
   - Итого: **+2** за два refresh — RPC работает корректно
4. **Консоль браузера:** ошибок нет

### C. Поиск

| Запрос | Результат |
|---|---|
| `?q=снег` | Найден **«Первый снег»** (совпадение в title) |
| `?q=отцом` | Найден **«Разговор с отцом»** (совпадение в title) |
| `?q=тестовый` | Найдены **все 15 тестовых** рассказов (совпадение в title) |
| `?q=` (пустой) | Возврат к обычному списку текущей вкладки |

**Примечание:** Поиск по «отец» не находит «Разговор с отцом», т.к. ILIKE ищет точную подстроку, а в заголовке стоит форма «отцом» (творительный падеж). Для охвата словоформ нужна морфология (не в рамках этого TASK).

## Проблемы / блокеры

Нет. Все компоненты работают как ожидалось.

## Git

Commit/push **не делался** — не запрашивалось в TASK.