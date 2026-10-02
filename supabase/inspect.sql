-- =============================================================================
-- inspect.sql — аудит текущего состояния схемы Supabase (проект WEB-SITE-SKRIPNIK)
-- =============================================================================
-- Назначение: снять факты о базе ДО написания миграций (baseline).
-- Как выполнять: Supabase Dashboard -> SQL Editor -> вставить запрос -> Run.
--   Запросы (1)-(4) выполняются ПООТДЕЛЬНОСТИ (по одному): так проще скопировать
--   результат каждого в tasks/REPORT.md, секция «Вывод inspect.sql».
--
-- Ничего не меняет: только SELECT по системным каталогам. Безопасно для прод-базы.
-- Дата создания: 2026-10-02 (TASK-006, блок D0)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (1) Таблицы схемы public и признак «включён ли RLS»
--     Смотрим: имя таблицы, владелец, включён ли RLS, примерное число строк.
--     Ожидаемо: stories, возможно другие; relrowsecurity = true/false важно для п.3.
-- -----------------------------------------------------------------------------
select
  c.relname                              as table_name,
  pg_get_userbyid(c.relowner)            as owner,
  c.relrowsecurity                       as rls_enabled,
  c.relforcerowsecurity                  as rls_forced,
  c.reltuples::bigint                    as approx_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')            -- обычные и секционированные таблицы
order by c.relname;


-- -----------------------------------------------------------------------------
-- (2) Все политики RLS схемы public
--     Смотрим: таблица, имя политики, для кого (roles), какая команда (cmd),
--     разрешена ли (permissive/restrictive) и само условие USING / WITH CHECK.
--     Важно: наличие политики с cmd = INSERT/UPDATE/DELETE для роли {anon}
--     означает, что анонимный читатель может писать в таблицу.
-- -----------------------------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  array_to_string(roles, ', ')           as roles,
  cmd,
  permissive,
  qual                                   as using_expression,
  with_check                             as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- -----------------------------------------------------------------------------
-- (3) Колонки таблицы stories (типы, not null, default)
--     Нужно для точного baseline: порядок и типы колонок должны совпасть.
-- -----------------------------------------------------------------------------
select
  ordinal_position                        as pos,
  column_name,
  data_type,
  case
    when data_type in ('character varying', 'character')
      then coalesce(character_maximum_length::text, '')
    when data_type = 'numeric'
      then '(' || coalesce(numeric_precision::text, '') || ',' ||
                coalesce(numeric_scale::text, '') || ')'
    when data_type = 'array'
      then coalesce(udt_name, '')
    else ''
  end                                     as details,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'stories'
order by ordinal_position;


-- -----------------------------------------------------------------------------
-- (4) Функция increment_story_views: тело, SECURITY DEFINER/INVOKER, search_path
--     Волнует: prosecdef = true (SECURITY DEFINER) или false (SECURITY INVOKER)
--     и есть ли безопасный search_path. Если функция INVOKER и на stories
--     включат RLS — счётчик перестанет работать у anon.
--     pg_get_functiondef() отдаёт полный CREATE OR REPLACE FUNCTION — его удобно
--     почти дословно положить в 0001_baseline.sql.
-- -----------------------------------------------------------------------------
select
  p.oid,
  n.nspname                               as schema_name,
  p.proname                               as function_name,
  pg_get_function_arguments(p.oid)         as arguments,
  pg_get_function_result(p.oid)            as returns,
  p.prosecdef                             as security_definer,  -- true = DEFINER
  p.provolatile                           as volatility,        -- v = volatile
  p.proconfig                             as function_config,   -- search_path и т.п.
  pg_get_userbyid(p.proowner)              as owner,
  pg_get_functiondef(p.oid)                as full_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'increment_story_views';


-- -----------------------------------------------------------------------------
-- (4b) Дополнительно: явные права (ACL) на функцию — кто может её вызывать.
--      EXECUTE для anon/authenticated должен быть (иначе счётчик не работает).
--      Если строка пустая (null) — права по умолчанию (PUBLIC = EXECUTE).
-- -----------------------------------------------------------------------------
select
  p.proname                               as function_name,
  coalesce(array_to_string(p.proacl, E'\n'), '(default: PUBLIC EXECUTE)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'increment_story_views';


-- -----------------------------------------------------------------------------
-- (5) Дополнительно: RLS-флаги одной строкой (краткая сводка) — удобно для отчёта.
-- -----------------------------------------------------------------------------
select
  c.relname                               as table_name,
  c.relrowsecurity                        as rls_enabled,
  case when c.relrowsecurity then 'RLS ON' else 'RLS OFF' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;
