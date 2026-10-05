# Отчёт (кодер → архитектор)

**Задание:** TASK-014 — E3, иллюстрации рассказов (Supabase Storage)  
**Дата:** 2026-10-05  
**Статус:** выполнено (ожидает: bucket + SQL от пользователя; затем E2E автора)

---

## Что сделано

**Новые файлы:**

1. `supabase/migrations/0006_illustrations_storage.sql`
   - Инструкции: создать bucket `illustrations` (public) в Dashboard
   - Политики `storage.objects`:
     - SELECT — всем (публичный просмотр)
     - INSERT/UPDATE/DELETE — `public.is_admin()`
   - Шаги для пользователя в комментариях миграции и ниже в отчёте

2. `src/api/illustrations.ts`
   - `validateImage(file)` — тип image/* (проверка MIME), размер ≤ 5 МБ
   - `uploadStoryIllustration(storyId, file)` — upload по пути `stories/<id>/<uuid>.<ext>`, возвращает public URL
   - `removeStoryIllustration(storyId, publicUrl)` — удаляет из Storage и убирает URL из `stories.illustrations`
   - `deleteAllStoryIllustrations(storyId, existingUrls?)` — удаляет все файлы по префиксу `stories/<id>/` или из переданного массива URL
   - `mapStorageError` — русские сообщения для ошибок Storage

**Изменённые файлы:**

3. `src/pages/admin/AdminStoryForm.tsx`
   - Блок «Иллюстрации»: превью thumbnails (96×96), кнопка × для удаления, file input с `accept="image/*"`
   - Upload только в edit-режиме (есть story_id); на **new** — подсказка «Сначала сохраните рассказ»
   - Валидация: тип image/*, ≤ 5 МБ (до upload)
   - Удаление: × → `removeStoryIllustration` → обновление массива на клиенте
   - Anti-double-submit на upload

4. `src/api/adminStories.ts`
   - `deleteStory(id)` — перед удалением строки читает `illustrations` из БД и очищает Storage через `deleteAllStoryIllustrations`
   - Импорт `deleteAllStoryIllustrations`

## Проверки

### `npm run build`

```
> web-site-skripnik@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 94 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-ayVa79HW.css   11.70 kB │ gzip:   3.23 kB
dist/assets/index-COGAhqjy.js   516.97 kB │ gzip: 147.78 kB

✓ built in 560ms
```

Exit code: **0**.

### `npm run lint`

```
Found 4 warnings and 0 errors.
Finished in 13ms on 34 files with 116 rules using 32 threads.
```

Все 4 warning'а — унаследованы. **Новых нет.**

### Вживую

| Сценарий | Кто | Результат |
|---|---|---|
| Гость → /admin/stories → /login | кодер | **OK** (прежнее поведение) |
| Создать bucket / применить SQL | — | **ожидает пользователя** (см. ниже) |
| Автор: upload JPG/PNG < 5 МБ, превью, сайт | — | **не проверено** (нет bucket + пароля) |
| Читатель: upload в bucket через консоль | — | должно быть отклонено RLS (подтвердить после применения) |

## Шаги для пользователя (выполнить перед живыми проверками)

1. **Supabase Dashboard → Storage → «Create bucket»:**
   - Name: `illustrations`
   - Public bucket: **ON**

2. **SQL Editor — применить `supabase/migrations/0006_illustrations_storage.sql`**
   - Ожидается: «Success. No rows returned» (DDL политик)
   - После: `select * from storage.buckets where id = 'illustrations';` → 1 строка

3. **Сообщить кодеру** — я повторю живые проверки (upload, удаление, удаление рассказа)

## Git

- **commit запланирован**.
- **Push не делать** (по TASK).

## Проблемы / блокеры

- **Для живых проверок нужен bucket + политики** (шаги выше).
- **Пароль автора** по-прежнему неизвестен кодеру — для E2E нужна приёмка архитектором/пользователем.