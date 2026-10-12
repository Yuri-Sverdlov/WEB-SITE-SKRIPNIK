-- =============================================================================
-- 0010_admin_sql_editor_source_url.sql — пропуск служебных ролей + source_url
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Дата: 2026-10-12 · Блок G0 (TASK-025)
-- Предшественники (применены): 0001, 0003, 0004, 0005, 0007, 0008, 0009.
--   `0009_comments_guestbook_hidden.sql` НЕ правим — эта миграция его уточняет.
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor.
--
-- ЗАЧЕМ:
--   1. Триггер `enforce_admin_update_hidden_only` из 0009 блокировал ЛЮБОЙ UPDATE
--      вне `is_hidden`. В SQL Editor `auth.uid()` пуст → `is_admin()` = false →
--      нельзя было обслуживать БД (исправить текст, поправить дату и т.п.).
--      Добавляем пропуск для служебных ролей: `postgres`, `service_role`,
--      `supabase_admin`.
--   2. Колонка `stories.source_url` — необязательная ссылка на оригинал
--      (готовится под TASK-026: перенос рассказов с Проза.ру).
--
-- ВАЖНО ПРО РОЛЬ В ТРИГГЕРЕ:
--   Функция объявлена `security invoker` (а не definer, как в 0009). Только так
--   `current_user` внутри функции = РЕАЛЬНАЯ роль запроса:
--     • SQL Editor / psql      → `postgres` (или `supabase_admin`)
--     • PostgREST, service key → `service_role`
--     • PostgREST, читатель    → `authenticated`
--   При `security definer` `current_user` был бы всегда владельцем (`postgres`),
--   и проверка пропускала бы вообще всех — правило «только is_hidden» перестало
--   бы работать. Функции нужен лишь `is_admin()` (сама SECURITY DEFINER) и
--   сравнение строк, поэтому invoker-прав достаточно.
--
-- ИДЕМПОТЕНТНОСТЬ: create or replace function, add column if not exists,
-- drop trigger if exists + create trigger.
-- =============================================================================


-- =============================================================================
-- 1. ТРИГГЕР UPDATE: пропуск служебных ролей
-- =============================================================================

create or replace function public.enforce_admin_update_hidden_only()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  -- Служебные роли обслуживают базу напрямую (SQL Editor, service_role,
  -- supabase_admin) — им разрешён любой UPDATE.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  -- Дальше — обычный путь через JWT.
  if not public.is_admin() then
    raise exception 'Изменять записи может только автор сайта'
      using errcode = '42501';
  end if;

  -- Автор через сайт может менять только видимость записи.
  if (to_jsonb(old) - 'is_hidden') is distinct from (to_jsonb(new) - 'is_hidden') then
    raise exception 'Можно изменить только видимость записи'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_admin_update_hidden_only() is
  'BEFORE UPDATE на comments/guestbook_entries: служебные роли (postgres/service_role/supabase_admin) — пропуск; автор через сайт — только колонка is_hidden; остальным отказ.';

drop trigger if exists comments_hidden_only_update on public.comments;
create trigger comments_hidden_only_update
  before update on public.comments
  for each row
  execute function public.enforce_admin_update_hidden_only();

drop trigger if exists guestbook_entries_hidden_only_update on public.guestbook_entries;
create trigger guestbook_entries_hidden_only_update
  before update on public.guestbook_entries
  for each row
  execute function public.enforce_admin_update_hidden_only();


-- =============================================================================
-- 2. stories.source_url — ссылка на оригинал (Проза.ру)
-- =============================================================================

alter table public.stories
  add column if not exists source_url text;

comment on column public.stories.source_url is
  'Необязательная ссылка на оригинал рассказа (например, на Проза.ру). NULL — ссылки нет. UNIQUE нет: один рассказ может ссылаться куда угодно, дубли допустимы.';


-- =============================================================================
-- 3. ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ (SQL Editor, по желанию)
-- =============================================================================
-- Колонка есть:
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema='public' and table_name='stories' and column_name='source_url';
--   → text / YES
--
-- Триггер обновлён (security invoker):
-- select p.proname, p.prosecdef
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname='public' and p.proname='enforce_admin_update_hidden_only';
--   → prosecdef = false
--
-- Под `postgres` UPDATE проходит (проверьте на тестовой записи):
-- update public.comments set body = body where id = '<uuid>';
--   → Success (раньше было исключение «Изменять записи может только автор сайта»)


-- =============================================================================
-- 4. ОТКАТ
-- =============================================================================
-- -- вернуть версию 0009 (security definer, без пропуска ролей):
-- -- см. supabase/migrations/0009_comments_guestbook_hidden.sql, раздел 4
-- alter table public.stories drop column if exists source_url;
-- =============================================================================
