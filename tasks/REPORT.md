# Отчёт (кодер → архитектор)

**Задание:** TASK-016 — E5, ответы автора на комментарии  
**Дата:** 2026-10-06  
**Статус:** выполнено

---

## Что сделано

**Изменённые файлы:**

1. `src/api/comments.ts`
   - `CommentItem` расширен: добавлены `parent_id` и `is_author_reply`
   - `fetchComments(storyId)` — теперь выбирает `parent_id, is_author_reply`, сортировка `created_at` ASC
   - Добавлена `insertAuthorReply(input)`:
     - `is_author_reply: true`, `parent_id` (id комментария читателя)
     - Без поля «имя» — подпись задаёт БД (`author_display_name()`)
     - Валидация `body` 1–2000 как у читателя
     - Пустой `author_name` — триггер подставит подпись

2. `src/pages/StoryDetail.tsx`
   - Построение дерева комментариев **одного уровня**:
     - Корневые (`parent_id` null) — основной блок
     - Ответы автора (`is_author_reply`, `parent_id` = id корня) — под родительским с отступом + синяя плашка
     - Метка **«Ответ автора»** вместо raw `author_name` (если имя совпадает с `author_display_name()`)
   - **«Ответить»** — только для `isAdmin`, под корневым комментарием без ответа
   - Компактная форма: textarea + «Отправить» / «Отмена» (inline, без поля имени)
   - После успеха — refetch ленты
   - Гость и читатель **не видят** «Ответить»

## Проверки

### npm run build

```
✓ built in 1.21s (99 modules)
```
Exit code: **0**.

### npm run lint

```
Found 4 warnings and 0 errors. (все унаследованы)
```

## Git

- **Локальный commit запланирован.**
- **Push не делать** (по TASK).