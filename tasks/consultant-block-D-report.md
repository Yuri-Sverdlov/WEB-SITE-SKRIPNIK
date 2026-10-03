# Отчёт консультанту — блок D

**Статус:** готов к отправке консультанту (2026-10-03)

## TASK-006 … TASK-009

| TASK | Сделано | Commit |
|---|---|---|
| 006 | inspect, baseline, Home; 0002 не нужен | ce0bbb0 |
| 007 | 0003 delta, inspect columns, rate limit | acc17b2 (+ приёмка rename) |
| 008 | StoryDetail: лента + форма; ReaderMessage*; messageErrors | 839134f (+ приёмка) |
| 009 | `/guestbook`, `guestbook.ts`, переиспользование ReaderMessage* | 488817a (+ приёмка) |

## Миграции (применение пользователем)

| Файл | Применена | Вывод SQL Editor / заметки |
|---|---|---|
| `0001_baseline.sql` | нет (документ) | — |
| `0002_stories_rls.sql` | не создавался | — |
| `0003_comments_guestbook.sql` | **да**, 2026-10-03 | Success. No rows returned |

## Проверки конца блока

- **build/lint:** exit 0 на приёмке 008 и 009; 88 модулей; 2 warning (унаследованы TASK-003).
- **Браузер (пользователь):** комментарии и гостевая — гость/вошедший, return после login, rate limit 3/мин (русский текст триггера), F5; logout → `/login` (hotfix 008).
- **RLS insert чужим user_id:** в блок D не прогоняли отдельным чек-листом — политики из 0003 без изменений; при необходимости — ручная проверка в консоли браузера.

## Не сделано / отложено

- `is_author_reply` в UI — этап 8–9 ТЗ.
- Индекс `comments(story_id)` — при росте нагрузки отдельная миграция.
- `0001_baseline.sql` — документ, в SQL Editor не применяли (baseline уже в облаке с TASK-006).
- `supabase/блоки (A)–(D)-SQL.txt` — локальный inspect пользователя, не в git.
