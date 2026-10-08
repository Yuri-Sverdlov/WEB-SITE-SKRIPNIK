-- =============================================================================
-- 0008_author_name_fix.sql — фамилия Скрыпник, reserved names, UPDATE ответов
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Дата: 2026-10-08
-- Предшественники: 0005 (is_admin, reserved_author_names, author_display_name)
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor.
--
-- ЧТО ДЕЛАЕТ:
--   1. author_display_name() → 'Александр Скрыпник'
--   2. reserved_author_names: +'скрыпник', +'skrypnik', +'skripnik'
--   3. UPDATE comments SET author_name = author_display_name()
--      WHERE is_author_reply = true
--        AND author_name <> author_display_name()
--
-- ИДЕМПОТЕНТНОСТЬ: create or replace, on conflict do nothing.
-- =============================================================================


-- =============================================================================
-- 1. ИМЯ АВТОРА
-- =============================================================================

create or replace function public.author_display_name()
returns text
language sql
immutable
as $function$
  select 'Александр Скрыпник'::text;
$function$;

comment on function public.author_display_name() is
  'Подпись ответа автора. Единственное место правки для других сайтов (дублируется в src/config/site.ts).';


-- =============================================================================
-- 2. ЗАПРЕЩЁННЫЕ ИМЕНА (добавить, не удаляя старые)
-- =============================================================================

insert into public.reserved_author_names (name) values
  ('скрыпник'),
  ('skrypnik'),
  ('skripnik')
on conflict (name) do nothing;


-- =============================================================================
-- 3. UPDATE ОТВЕТОВ АВТОРА — новая подпись
-- =============================================================================

update public.comments
  set author_name = public.author_display_name()
where is_author_reply = true
  and author_name <> public.author_display_name();


-- =============================================================================
-- 4. ПРОВЕРКА
-- =============================================================================
-- select public.author_display_name();  -- 'Александр Скрыпник'
-- select name from public.reserved_author_names
--  where name in ('скрыпник','skrypnik','skripnik','скрипник');
-- select count(*) as updated_replies
--   from public.comments
--  where is_author_reply = true
--    and author_name = public.author_display_name();


-- =============================================================================
-- 5. ОТКАТ
-- =============================================================================
-- -- Вернуть author_display_name (старое значение):
-- create or replace function public.author_display_name()
-- returns text language sql immutable
-- as $$ select 'Александр Скрипник'::text; $$;
--
-- -- Удалить добавленные строки:
-- delete from public.reserved_author_names
--  where name in ('скрыпник','skrypnik','skripnik');
--
-- При необходимости откатить UPDATE — из бекапа, отдельной командой.
-- =============================================================================