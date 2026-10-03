-- =============================================================================
-- 0003_comments_guestbook.sql — ДЕЛЬТА: comments + guestbook_entries
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Задание: TASK-007 (блок D1) · Дата: 2026-10-03
--
-- Что делает: приводит уже существующие таблицы comments и guestbook_entries
-- к требованиям брифа блока D (колонки, CHECK 2-40 / 1-2000, лимит
-- 3 записи / пользователь / таблица / минута).
--
-- Применяет ТОЛЬКО пользователь в Supabase SQL Editor, после приёмки файла
-- архитектором. Кодер SQL в базу не отправлял.
--
-- ФАКТЫ, на которых построен файл (живая проверка REST-API PostgREST
-- анонимным (publishable) ключом + выводы TASK-006):
--   comments          : id uuid, story_id uuid, user_id uuid,
--                       created_at timestamptz, body text        (5 колонок)
--   guestbook_entries : id uuid, user_id uuid, created_at timestamptz,
--                       body text, name text                    (5 колонок)
--   обе таблицы ПУСТЫЕ (Content-Range: */0) -> NOT NULL/CHECK безопасны
--   RLS включён на обеих; политики: SELECT всем; INSERT с auth.uid() = user_id
--   PK/FK/CHECK/индексы и NOT NULL существующих колонок REST-ом не видны —
--   см. supabase/inspect_comments_guestbook.sql и TODO в конце файла.
--
-- ИДЕМПОТЕНТНОСТЬ: ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS,
-- CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS. Повторный прогон
-- не ломается.
-- =============================================================================


-- =============================================================================
-- 1. comments
-- =============================================================================

-- 1.1. Колонка автора (в брифе — author_name, 2..40 символов).
--      В таблице её нет -> добавляем. Имя берётся из брифа как есть.
alter table public.comments
  add column if not exists author_name text;

-- 1.2. CHECK-и. Имена фиксированные: чтобы повторный прогон не плодил дубликаты,
--      сначала DROP IF EXISTS, затем ADD.
alter table public.comments
  drop constraint if exists comments_author_name_len_check;
alter table public.comments
  add constraint comments_author_name_len_check
  check (char_length(btrim(author_name)) between 2 and 40);

alter table public.comments
  drop constraint if exists comments_body_len_check;
alter table public.comments
  add constraint comments_body_len_check
  check (char_length(btrim(body)) between 1 and 2000);

-- 1.3. Обязательность. Таблица пустая (проверено), поэтому SET NOT NULL
--      не может упасть на существующих данных.
alter table public.comments
  alter column author_name set not null;
alter table public.comments
  alter column body set not null;

-- 1.4. created_at: колонка есть, но её default по REST не виден.
--      Установка default идемпотентна (повторная установка того же значения
--      ничего не портит). Требуется брифами: «created_at default now()».
alter table public.comments
  alter column created_at set default now();

-- 1.5. Внешние ключи. Существующие FK (если есть) не удаляем и не угадываем
--      их имена — добавляем свой только когда FK такого вида ещё нет.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid  = 'public.comments'::regclass
      and c.contype   = 'f'
      and c.confrelid = 'public.stories'::regclass
  ) then
    alter table public.comments
      add constraint comments_story_id_fkey
      foreign key (story_id) references public.stories(id) on delete cascade;
    raise notice 'comments: FK story_id -> stories(id) ON DELETE CASCADE добавлен';
  else
    raise notice 'comments: FK на stories уже существует — не трогаю';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid  = 'public.comments'::regclass
      and c.contype   = 'f'
      and c.confrelid = 'auth.users'::regclass
  ) then
    alter table public.comments
      add constraint comments_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
    raise notice 'comments: FK user_id -> auth.users(id) ON DELETE CASCADE добавлен';
  else
    raise notice 'comments: FK на auth.users уже существует — не трогаю';
  end if;
end $$;


-- =============================================================================
-- 2. guestbook_entries
-- =============================================================================
-- ВНИМАНИЕ, расхождение с брифом (описано в REPORT, решение за архитектором):
--   бриф требует колонку author_name (2..40). В таблице уже есть колонка
--   name text с тем же смыслом («кто оставил запись»).
--   По правилу TASK-007 «если колонки уже есть с другими именами — опиши в
--   REPORT, НЕ угадывай rename» — переименование НЕ делается: CHECK навешивается
--   на существующую name.
--   Если архитектор решит унифицировать имена, это ровно одна строка
--   (см. закомментированный блок 2.4 ниже).
-- =============================================================================

-- 2.1. CHECK-и на существующие колонки
alter table public.guestbook_entries
  drop constraint if exists guestbook_entries_name_len_check;
alter table public.guestbook_entries
  add constraint guestbook_entries_name_len_check
  check (char_length(btrim(name)) between 2 and 40);

alter table public.guestbook_entries
  drop constraint if exists guestbook_entries_body_len_check;
alter table public.guestbook_entries
  add constraint guestbook_entries_body_len_check
  check (char_length(btrim(body)) between 1 and 2000);

-- 2.2. Обязательность (таблица пустая — проверено)
alter table public.guestbook_entries
  alter column name set not null;
alter table public.guestbook_entries
  alter column body set not null;

-- 2.3. created_at default (идемпотентно)
alter table public.guestbook_entries
  alter column created_at set default now();

-- 2.4. ОПЦИЯ (не активна): унификация имени колонки под бриф.
--      Включить только по решению архитектора — таблица пустая, поэтому
--      переименование сейчас бесплатно; после появления данных будет дороже.
-- alter table public.guestbook_entries rename column name to author_name;
-- alter table public.guestbook_entries
--   drop constraint if exists guestbook_entries_author_name_len_check;
-- alter table public.guestbook_entries
--   add constraint guestbook_entries_author_name_len_check
--   check (char_length(btrim(author_name)) between 2 and 40);

-- 2.5. FK user_id -> auth.users (тот же приём, что в 1.5)
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid  = 'public.guestbook_entries'::regclass
      and c.contype   = 'f'
      and c.confrelid = 'auth.users'::regclass
  ) then
    alter table public.guestbook_entries
      add constraint guestbook_entries_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
    raise notice 'guestbook_entries: FK user_id -> auth.users(id) ON DELETE CASCADE добавлен';
  else
    raise notice 'guestbook_entries: FK на auth.users уже существует — не трогаю';
  end if;
end $$;

-- 2.6. story_id в гостевой книге отсутствует — и не нужен: запись не привязана
--      к рассказу (проверено REST-ом: колонки story_id в таблице нет).


-- =============================================================================
-- 3. RLS — БЕЗ ИЗМЕНЕНИЙ (уже соответствует брифу)
-- =============================================================================
-- Факты из TASK-006 (блок (2) вывода inspect):
--   comments          : SELECT (USING true) всем; INSERT (WITH CHECK auth.uid() = user_id)
--   guestbook_entries : SELECT (USING true) всем; INSERT (WITH CHECK auth.uid() = user_id)
--   UPDATE/DELETE политик нет ни на одной — значит запись/удаление через API
--   недоступны никому (это и требует бриф).
--
-- Замечание по строгости: политики INSERT выданы роли public (а не
-- только authenticated). Функционально это то же самое: у анонимного
-- пользователя auth.uid() = null, и WITH CHECK (auth.uid() = user_id)
-- не выполняется -> INSERT отклоняется. Оставляю как есть, чтобы не менять
-- уже работающую схему; при желании можно позже сузить до `to authenticated`.
--
-- Полные имена политик (в выводе TASK-006 были обрезаны) — запросить
-- запросом (D) из supabase/inspect_comments_guestbook.sql.


-- =============================================================================
-- 4. Rate limit: не более 3 записей / пользователь / таблица / минута
-- =============================================================================
-- Триггер BEFORE INSERT. Одна общая функция на обе таблицы: имя таблицы берётся
-- из TG_TABLE_NAME, поэтому лимит считается ПО КАЖДОЙ таблице отдельно и
-- автоматически применится, если такую же защиту позже навесить на другую таблицу.
--
-- SECURITY DEFINER — чтобы count() по таблице не упирался в RLS вызывающего;
-- search_path зафиксирован явно (стандартная практика Supabase для DEFINER).
-- auth.uid() внутри definer-функции по-прежнему возвращает id вызывающего
-- (читается из JWT-клеймов запроса, а не из прав выполнения).
-- =============================================================================

create or replace function public.enforce_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  recent_count integer;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Нужно войти в аккаунт, чтобы оставить сообщение'
      using errcode = '42501';
  end if;

  execute format(
    'select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 minute''',
    tg_table_name
  )
  into recent_count
  using current_user_id;

  if recent_count >= 3 then
    raise exception 'Слишком часто: не более 3 сообщений в минуту. Попробуйте через минуту'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

-- 4.1. comments
drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row
  execute function public.enforce_write_rate_limit();

-- 4.2. guestbook_entries
drop trigger if exists guestbook_entries_rate_limit on public.guestbook_entries;
create trigger guestbook_entries_rate_limit
  before insert on public.guestbook_entries
  for each row
  execute function public.enforce_write_rate_limit();


-- =============================================================================
-- TODO (не выдумано — ждёт вывода supabase/inspect_comments_guestbook.sql)
-- =============================================================================
-- 1. PRIMARY KEY, существующие FK, UNIQUE/CHECK и индексы обеих таблиц:
--    REST-ом не видны. Если по выводу окажется, что PK нет — добавить отдельно
--    (на пустых таблицах безопасно): alter table ... add primary key (id).
-- 2. NOT NULL у id/story_id/user_id: не подтверждён. Для comments логично
--    сделать story_id и user_id NOT NULL — но это НЕ требование брифа,
--    поэтому не делаю без решения архитектора.
-- 3. Нужен ли индекс по comments(story_id) для выборки комментариев к рассказу
--    (TASK-008): если индекса нет — добавить create index if not exists.
-- 4. Проверить фактический default у created_at (идемпотентная установка now()
--    безопасна, но сверка не помешает).
-- =============================================================================


-- =============================================================================
-- Откат (если понадобится; выполнять осознанно, вручную)
-- =============================================================================
-- drop trigger if exists comments_rate_limit on public.comments;
-- drop trigger if exists guestbook_entries_rate_limit on public.guestbook_entries;
-- drop function if exists public.enforce_write_rate_limit();
-- alter table public.comments drop constraint if exists comments_author_name_len_check;
-- alter table public.comments drop constraint if exists comments_body_len_check;
-- alter table public.comments drop column if exists author_name;
-- alter table public.guestbook_entries drop constraint if exists guestbook_entries_name_len_check;
-- alter table public.guestbook_entries drop constraint if exists guestbook_entries_body_len_check;
-- =============================================================================
