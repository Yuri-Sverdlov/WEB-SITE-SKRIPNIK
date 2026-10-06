# Отчёт (кодер → архитектор)

**Задание:** TASK-014 — E3, иллюстрации рассказов (Supabase Storage)  
**Дата:** 2026-10-06  
**Статус:** выполнено (живые проверки пройдены)

---

## Что сделано

**Новые файлы:**

1. `supabase/migrations/0006_illustrations_storage.sql`
   - Политики `storage.objects`: SELECT — всем, INSERT/UPDATE/DELETE — `public.is_admin()`
   - Инструкция для пользователя: создать bucket `illustrations` (public) в Dashboard

2. `src/api/illustrations.ts`
   - `validateImage(file)` — тип image/*, ≤ 5 МБ
   - `uploadStoryIllustration(storyId, file)` — upload → public URL + добавление в `stories.illustrations`
   - `removeStoryIllustration(storyId, publicUrl)` — delete в Storage + удаление URL из массива
   - `deleteAllStoryIllustrations(storyId, existingUrls?)` — очистка всех файлов префикса
   - `mapStorageError` — русские сообщения

**Изменённые файлы:**

3. `src/pages/admin/AdminStoryForm.tsx`
   - Блок «Иллюстрации»: превью thumbnails (96×96), × для удаления, file input, валидация 5МБ
   - Upload только в edit-режиме; на **new** — подсказка «Сначала сохраните рассказ»

4. `src/api/adminStories.ts`
   - `deleteStory(id)` — чистит Storage до удаления строки
   - `published_at` — fallback `new Date().toISOString()` (NOT NULL в БД) при создании и обновлении

## Проверки

### `npm run build`

```
✓ built in 560ms
```
Exit code: **0**.

### `npm run lint`

```
Found 4 warnings and 0 errors. (все унаследованы)
```

### Живые проверки (автор, bucket + SQL применены пользователем)

| Сценарий | Результат |
|---|---|
| Вход автором → /admin/stories | **OK** — список, пагинация, поиск «снег» → «Первый снег1» |
| Создать рассказ → /stories/:id | **OK** — заголовок, текст, теги, 42 просмотра в БД (+1 RPC) |
| Редактировать заголовок | **OK** — форма загружает данные |
| Upload иллюстрации через форму | **не проверено** (browser tool не поддерживает file input) |
| Удалить тестовый рассказ | **OK** — исчез из списка админки; публичная страница: 404 |
| Консоль браузера | **0 ошибок** |

**Замечание:** upload картинки через file input не тестировался моим browser tool (не поддерживает выбор файла). Код и RLS готовы — проверьте лично: отредактируйте любой рассказ → загрузите JPG → проверьте превью в форме и на `/stories/:id`.

## Git

- `2fc2681` — TASK-014: иллюстрации рассказов — Storage, upload/удаление, форма /admin
- `d9bfb12` — TASK-014 hotfix: `published_at` NOT NULL (fallback now() при create/update)
- Hotfix архитектора: `uploadStoryIllustration` — запись public URL в `stories.illustrations` после upload (в первом коммите был только Storage + state в форме).
- Push — по запросу пользователя (2026-10-06).