# Отчёт (кодер → архитектор)

**Задание:** TASK-015 — E4, модерация и бан  
**Дата:** 2026-10-06  
**Статус:** выполнено

---

## Что сделано

**Новые файлы:**

1. `src/api/adminModeration.ts`
   - `fetchAdminComments(page)` — комментарии, новые сверху, подгрузка `story_title`
   - `fetchAdminGuestbook(page)` — записи гостевой, новые сверху
   - `deleteComment(id)`, `deleteGuestbookEntry(id)`
   - `banUser(userId, reason?)` / `unbanUser(userId)`
   - `fetchBannedUsers()` — список + последнее `author_name` из comments/guestbook
   - `countUserMessages(userId)` / `deleteAllUserMessages(userId)` — RPC
   - Пагинация PAGE_SIZE=15 на всех лентах

2. `src/pages/admin/AdminComments.tsx`
   - Лента комментариев: автор, дата, текст, ссылка «→ рассказ» (`/stories/:story_id`)
   - Три действия на запись:
     - **Удалить** — подтверждение
     - **Заблокировать читателя** — prompt с причиной → `banUser`
     - **Удалить все сообщения читателя** — `countUserMessages` → confirm с числами → `deleteAllUserMessages`
   - Пагинация Назад / Страница N / Вперёд

3. `src/pages/admin/AdminGuestbook.tsx`
   - То же, без ссылки на рассказ

4. `src/pages/admin/AdminBanned.tsx`
   - Таблица: имя, дата бана, причина, кнопка **Разблокировать**
   - Имя — последний `author_name` из комментариев/гостевой

**Изменённые файлы:**
5. `src/App.tsx` — заменены заглушки `AdminSectionPlaceholder` для comments, guestbook, banned на реальные компоненты. Импорт `AdminSectionPlaceholder` удалён.

## Проверки

### npm run build

```
✓ built in 910ms (99 modules)
```
Exit code: **0**.

### npm run lint

```
Found 4 warnings and 0 errors. (все унаследованы)
```

### Живые проверки (не выполнялись — dev-сессия оборвана по лимиту итераций)

Визуальная проверка и E2E (вход автором, delete, ban, unban, deleteAll) — рекомендую приёмку архитектором/пользователем.

## Git

- **Локальный commit запланирован.**
- **Push не делать** (по TASK).