-- =============================================================================
-- inspect_comments_guestbook.sql — аудит колонок и ограничений таблиц
-- comments и guestbook_entries (аналог блока (3) для stories)
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Задание: TASK-007 (блок D1), шаг 0
-- Дата: 2026-10-03
--
-- Зачем: в TASK-006 запрос колонок был только для stories, поэтому состав
-- колонок comments/guestbook_entries в baseline помечен как TODO. Этот файл
-- закрывает пробел: типы, NOT NULL, default, PK/FK/CHECK и индексы.
--
-- Как выполнять: Supabase Dashboard -> SQL Editor -> запросы (A)-(D) ПО ОДНОМУ,
-- результат скопировать в tasks/REPORT.md (секция «Вывод inspect_comments_guestbook»).
-- Ничего не меняет: только SELECT по системным каталогам.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (A) Колонки обеих таблиц: тип, NOT NULL, default
-- -----------------------------------------------------------------------------
select
  table_name,
  ordinal_position                        as pos,
  column_name,
  data_type,
  case
    when data_type in ('character varying', 'character')
      then coalesce(character_maximum_length::text, '')
    when data_type = 'numeric'
      then '(' || coalesce(numeric_precision::text, '') || ',' ||
                coalesce(numeric_scale::text, '') || ')'
    when data_type = 'ARRAY'
      then coalesce(udt_name, '')
    else ''
  end                                     as details,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('comments', 'guestbook_entries')
order by table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- (B) Ограничения: PK, FK, UNIQUE, CHECK — с текстом определения
-- -----------------------------------------------------------------------------
select
  c.relname                               as table_name,
  con.conname                             as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'f' then 'FOREIGN KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUDE'
    else con.contype::text
  end                                     as kind,
  pg_get_constraintdef(con.oid)            as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('comments', 'guestbook_entries')
order by table_name, kind, constraint_name;


-- -----------------------------------------------------------------------------
-- (C) Индексы (включая созданные под PK/FK) — на случай, если story_id
--     не проиндексирован для выборки комментариев по рассказу
-- -----------------------------------------------------------------------------
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('comments', 'guestbook_entries')
order by tablename, indexname;


-- -----------------------------------------------------------------------------
-- (D) Политики RLS — ПОЛНЫЕ имена (в выводе TASK-006 часть имён обрезалась),
--     плюс триггеры, если они уже есть на этих таблицах
-- -----------------------------------------------------------------------------
select
  tablename,
  policyname,
  char_length(policyname)                 as name_length,
  array_to_string(roles, ', ')            as roles,
  cmd,
  permissive,
  qual                                   as using_expression,
  with_check                             as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('comments', 'guestbook_entries')
order by tablename, cmd, policyname;

-- Триггеры на таблицах (ожидается пусто до применения 0003)
select
  c.relname                               as table_name,
  t.tgname                                as trigger_name,
  pg_get_triggerdef(t.oid)                 as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('comments', 'guestbook_entries')
  and not t.tgisinternal
order by table_name, trigger_name;
