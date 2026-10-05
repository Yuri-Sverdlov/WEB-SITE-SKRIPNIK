# Задание (архитектор → кодер)

**ID:** TASK-014  
**Дата:** 2026-10-05  
**Статус:** к выполнению  
**Блок:** E3 — иллюстрации рассказов  
**Бриф:** `tasks/consultant-block-E-brief.md` (раздел E3) · **0005 применена**

**Старт сессии:** **`git pull`**, `AGENTS.md`, `CONTEXT.md`, этот файл.

**Предшественник:** TASK-013 принят — `tasks/done/013-admin-stories-crud/`.

---

## Цель

В форме рассказа (`AdminStoryForm`): **загрузка**, **превью** и **удаление** иллюстраций. Файлы — Supabase Storage bucket **`illustrations`**. На публичной странице рассказа картинки уже показываются из `stories.illustrations` (URL).

---

## Контекст

- Колонка `stories.illustrations` — `text[]` публичных URL (как сейчас на `StoryDetail`).
- Путь объекта в Storage: **`stories/<story_id>/<uuid>.<ext>`** (ext по типу файла).
- Лимиты: **только изображения**, **≤ 5 МБ** на файл; проверка на клиенте до upload.
- **Bucket и политики Storage** создаёт **пользователь** в Supabase Dashboard по инструкции архитектора (кодер пишет файл миграции/SQL **или** документ с политиками — см. ниже). Кодер **не** применяет SQL в прод.
- RLS на `storage.objects`: **SELECT** — всем (anon + authenticated); **INSERT / UPDATE / DELETE** — только **`is_admin()`** (согласовано с брифом E3).
- При **удалении** картинки из формы — удалить объект из Storage **и** убрать URL из массива `illustrations`.
- При **удалении рассказа** (`deleteStory`) — удалить **все** файлы префикса `stories/<id>/` в bucket и строку в БД (расширить `deleteStory` или helper).

**Создание рассказа:** иллюстрации можно добавлять только **после** появления `story_id` (режим edit) **или** после create — сохранить рассказ, затем upload (если проще UX: «Сначала сохраните рассказ, затем добавьте иллюстрации» — опиши в REPORT).

---

## Что сделать

### 1. Storage (файл для пользователя)

Создать **`supabase/migrations/0006_illustrations_storage.sql`** (или `docs/storage-illustrations.sql`, если политики Storage не в migrations — выбери один канонический файл):

- Bucket `illustrations`, **public** read (или signed URL — предпочтительно **public** для простоты MVP, как сейчас `<img src={url}>`).
- Политики на `storage.objects` для bucket `illustrations`:
  - чтение объектов — публичное;
  - запись/удаление — `is_admin()`.

В **`tasks/REPORT.md`** — блок **«Шаги для пользователя»**: создать bucket (если миграция не создаёт bucket автоматически), применить SQL, проверить upload в Dashboard.

### 2. API (например `src/api/illustrations.ts`)

- `uploadStoryIllustration(storyId, file)` → public URL, upload по пути `stories/<storyId>/<uuid>.<ext>`.
- `removeStoryIllustration(storyId, publicUrl)` — delete в Storage + `updateStory` / patch массива `illustrations`.
- `deleteAllStoryIllustrations(storyId)` — list/remove prefix `stories/<storyId>/` (или перебор URL из БД перед delete story).
- Ошибки — русские сообщения (как `mapAdminError`).

Обновить **`updateStory` / `createStory`** при необходимости, чтобы **не затирать** `illustrations` при сохранении текста (TASK-013 уже не трогает массив на update — сохранить это поведение).

### 3. UI — `AdminStoryForm`

- Блок «Иллюстрации»: file input (multiple OK), превью thumbnails, кнопка «Удалить» у каждой.
- Disabled / подсказка на **new**, если upload до первого save невозможен.
- После upload — URL в `illustrations`, видно на `/stories/:id`.

### 4. Scope — не трогать

- Модерация, бан, ответы автора — TASK-015 / 016.
- WYSIWYG, вставка картинок **внутрь** текста — вне MVP.

---

## Проверки (полный вывод в REPORT)

- `npm run build`, `npm run lint`
- **Пользователь** применил SQL / создал bucket (вывод или «Success» в REPORT).
- Вживую (**автор**, localhost или Vercel после деплоя):
  1. Редактировать рассказ → загрузить 1–2 JPG/PNG (< 5 МБ) → превью в форме и на `/stories/:id`.
  2. Удалить одну иллюстрацию → исчезла на сайте и в Storage.
  3. Удалить рассказ с иллюстрациями → файлы в Storage не остались (проверка в Dashboard или list API).
- **Читатель:** upload в bucket из консоли — отклонено (RLS Storage).

---

## Git

Локальный **commit**; **`git push` — не делать** (архитектор после приёмки и разрешения пользователя).

---

## Отчёт

**`tasks/REPORT.md`**
