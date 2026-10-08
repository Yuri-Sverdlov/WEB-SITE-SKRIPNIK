# Отчёт (кодер → архитектор)

**Задание:** TASK-018 — F0: хвосты E, фамилия «Скрыпник», docs, deleteStory порядок  
**Дата:** 2026-10-08  
**Статус:** выполнено

---

## Что сделано

### Новые файлы
- `src/config/site.ts` — константы: `AUTHOR_NAME`, `SITE_TITLE`, `CONTACT_EMAIL`, `BIOGRAPHY`
- `supabase/migrations/0008_author_name_fix.sql` — миграция

### Изменённые файлы
- `src/api/adminStories.ts` — порядок `deleteStory`: сначала DELETE в БД, потом Storage
- `src/pages/StoryDetail.tsx` — удалена константа `AUTHOR_DISPLAY_NAME`, бейдж «Ответ автора» теперь по `is_author_reply`
- `docs/DEVELOPER.md` — «Скрипник» → «Скрыпник» (3 вхождения)

### Документы в репозитории (уже на месте)
- `docs/DEVELOPER.md`
- `docs/Instruktsiya_dlya_avtora.docx`
- `tasks/final-acceptance-E.md`

## Миграция `0008_author_name_fix.sql`

| Пункт | Что |
|---|---|
| 1 | `author_display_name()` → `'Александр Скрыпник'` |
| 2 | `reserved_author_names` + `скрыпник`, `skrypnik`, `skripnik` |
| 3 | UPDATE `comments` где `is_author_reply = true` и `author_name <> 'Александр Скрыпник'` |
| 4 | SELECT-проверка: `count(*) from comments where is_author_reply = false and normalize_author_name(author_name) like '%скрипник%'` |

## Проверки

### `npm run build`
```
✓ built in 1.20s
```
Exit code: **0**.

### `npm run lint`
```
Found 6 warnings and 0 errors.
```

### Полнота
- [x] `docs/DEVELOPER.md` — +абзац про два места для имени автора (site.ts + author_display_name)
- [x] Тексты «Скрипник» → «Скрыпник» в `docs/DEVELOPER.md`, `CONTEXT.md`, `ТЗ.md`
- [x] Технические имена (WEB-SITE-SKRIPNIK, Vercel) не тронуты
- [x] SQL-комментарии человекочитаемые — исправлены
- [x] reserved_author_names: `skripnik` оставлен (старый seed)

## Шаги для пользователя

### 0008 — применить в Supabase SQL Editor
Файл: `supabase/migrations/0008_author_name_fix.sql`
Ожидается: «Success. No rows returned» (UPDATE может показать число строк)

### Скрипт защиты (final-acceptance-E.md, часть 1)
1. Войти тестовым читателем (с никнеймом)
2. Открыть консоль браузера (F12)
3. Выполнить команды из `tasks/final-acceptance-E.md`
4. Результат — в `tasks/consultant-block-E-report.md` (заготовка таблицы)

## Git

- **Локальный commit** (будет ниже)
- **Push не делать** (по TASK)