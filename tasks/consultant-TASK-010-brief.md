# Консультанту — TASK-010 (кратко)

**Дата:** 2026-10-04 · **Статус:** принят

## Сделано

- Миграция **`0004_harden_reader_inserts.sql`**: в `enforce_write_rate_limit` до подсчёта — `NEW.created_at := now()`; для `comments` — `NEW.is_author_reply := false`; у `increment_story_views` — `SET search_path = public, pg_temp`.
- **Применение:** SQL Editor, **Success. No rows returned** (2026-10-04).
- **Проверки a–d** на проде (консоль + REST): подделка даты/флага нейтрализована; чужой `user_id` — RLS; 4-й insert — rate limit; счётчик просмотров растёт.

## Git

Коммиты на `main` (локально, до push): `4d1fa76` (0004), REPORT `27f0728` и др.; архив `tasks/done/010-harden-reader-inserts/`.

## Отложено

- Удаление тестовых строк в `comments` / `guestbook_entries` — **блок E**, `/admin`, приёмочный тест модерации (решение пользователя, 2026-10-04). SQL DELETE по TASK-010 **не выполнялся**.

## Не сделано

- RLS не меняли (как в TASK).
