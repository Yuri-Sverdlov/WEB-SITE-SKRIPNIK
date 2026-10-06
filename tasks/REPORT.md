# Отчёт (кодер → архитектор)

**Задание:** TASK-017 — E6, никнейм читателя  
**Дата:** 2026-10-06  
**Статус:** выполнено (ожидает: SQL от пользователя + живые проверки)

---

## Что сделано

### SQL — `supabase/migrations/0007_reader_profiles.sql`

1. **Таблица `reader_profiles`**: `user_id` PK, `display_name`, `created_at`. Уникальный индекс по `normalize_author_name(display_name)`.
2. **RLS**: читатель — SELECT/INSERT своей строки; автор — SELECT всех; UPDATE/DELETE — только автор.
3. **Расширен `enforce_write_rate_limit`**: не-автор без профиля → отказ «Сначала выберите имя…»; не-автор с профилем → `author_name` из профиля (игнор клиента); автор — без изменений.
4. **RPC `admin_reader_profiles(uuid[])`**: SECURITY DEFINER, только `is_admin()`, возвращает `user_id, email, display_name`.

### Фронтенд

5. **`src/api/readerProfile.ts`**
   - `fetchMyProfile()` — своя строка или null (`.maybeSingle()`)
   - `createProfile(displayName)` — INSERT, ошибки: занято, запрещено, RLS — русские тексты

6. **`src/components/ReaderMessageForm.tsx`** — три режима:
   - **Автор** (`isAdmin=true`) — поле имени + текст (как было)
   - **Читатель с профилем** — «Вы пишете как: **имя**», поля имени нет
   - **Читатель без профиля** — экран выбора имени с пояснением «Изменить потом нельзя»

7. **`src/pages/StoryDetail.tsx`** — загружает профиль, передаёт в ReaderMessageForm
8. **`src/pages/GuestBook.tsx`** — загружает профиль, передаёт в ReaderMessageForm

### Админка — email читателей

9. **`src/api/adminModeration.ts`** — `fetchReaderEmails(userIds)` через RPC
10. **`AdminComments`**, **`AdminGuestbook`** — email рядом с `user_id`
11. **`AdminBanned`** — колонка Email в таблице

## Проверки

### `npm run build`

```
✓ built in 4.55s (100 modules)
```
Exit code: **0**.

### `npm run lint`

```
Found 6 warnings and 0 errors.
```

## Git

- **Локальный commit запланирован.**
- **Push не делать** (по TASK).

## Шаги для пользователя

1. Supabase SQL Editor → применить `supabase/migrations/0007_reader_profiles.sql`
   - Ожидается «Success. No rows returned»
2. Сообщить кодеру — я запущу живые проверки i–n (профиль, запрещённые имена, уникальность, email в админке)