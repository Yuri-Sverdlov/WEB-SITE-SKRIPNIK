# Блок E — кабинет автора `/admin`

> **Канонический бриф:** [`tasks/consultant-block-E-brief.md`](consultant-block-E-brief.md) (консультант, 2026-10-04).  
> **Очередь TASK:** E0…E5 → TASK-011…016. Активное задание — только [`tasks/TASK.md`](TASK.md).

## Наследие из TASK-010 / D

**Уборка тестовых данных — через `/admin`** (не SQL Editor), **после проверок E5** — приёмочный тест модерации (решение пользователя, 2026-10-04):

| Таблица | Что убрать |
|---|---|
| `comments` | всё тестовое из D: «Тест A», `проверка c*`, строки «yuri» с ручных проверок и т.п. |
| `guestbook_entries` | всё тестовое: «yuri», «РКККК» и прочий мусор из проверок блока D |

**Аккаунты:** `sverdlov.y@yandex.ru` — автор (`site_admins`; в SQL — точное совпадение или `in ('sverdlov.y@…','sverdlovy@…')`); `test.hermes.skripnik@gmail.com` — **читатель** (проверки a–h).

Отчёт консультанту в конце блока: **`tasks/consultant-block-E-report.md`**.
