-- =============================================================================
-- 0007_reader_profiles.sql — никнейм читателя (E6 / TASK-017)
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Дата: 2026-10-06
-- Предшественники: 0005 (author role, is_admin, reserved_author_names,
--                   normalize_author_name, enforce_write_rate_limit)
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor.
--
-- ЧТО ДЕЛАЕТ:
--   1. Таблица reader_profiles (PK user_id, display_name 2‑40, created_at).
--   2. Уникальный индекс по normalize_author_name(display_name).
--   3. RLS: читатель — только свою строку; автор — все; INSERT своей строки
--      один раз; UPDATE/DELETE — только is_admin().
--   4. Расширение enforce_write_rate_limit: не-автор без профиля → отказ;
--      не-автор с профилем → author_name := display_name (игнор клиента).
--   5. RPC admin_reader_profiles(uuid[]): SECURITY DEFINER, только is_admin(),
--      возвращает user_id, email, display_name.
--
-- ИДЕМПОТЕНТНОСТЬ: create if not exists, create or replace, drop policy if exists.
-- =============================================================================


-- =============================================================================
-- 1. ТАБЛИЦА
-- =============================================================================

create table if not exists public.reader_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

comment on table public.reader_profiles is
  'Никнейм читателя. display_name — то, как читателя видят другие.';
comment on column public.reader_profiles.display_name is
  'Отображаемое имя (2-40 символов после trim). Уникально с нормализацией.';

-- Уникальный индекс по нормализованному имени
-- Использует normalize_author_name из 0005.
drop index if exists idx_reader_profiles_normalized_name;
create unique index idx_reader_profiles_normalized_name
  on public.reader_profiles (public.normalize_author_name(display_name));

alter table public.reader_profiles enable row level security;

-- RLS: читатель SELECT только свою строку
drop policy if exists reader_profiles_select_own on public.reader_profiles;
create policy reader_profiles_select_own on public.reader_profiles
  for select
  using (auth.uid() = user_id);

-- RLS: автор SELECT все строки
drop policy if exists reader_profiles_select_admin on public.reader_profiles;
create policy reader_profiles_select_admin on public.reader_profiles
  for select
  using (public.is_admin());

-- RLS: INSERT своей строки, один раз
drop policy if exists reader_profiles_insert_own on public.reader_profiles;
create policy reader_profiles_insert_own on public.reader_profiles
  for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.reader_profiles rp where rp.user_id = auth.uid())
  );

-- RLS: UPDATE/DELETE — только автор
drop policy if exists reader_profiles_admin_modify on public.reader_profiles;
create policy reader_profiles_admin_modify on public.reader_profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists reader_profiles_admin_delete on public.reader_profiles;
create policy reader_profiles_admin_delete on public.reader_profiles
  for delete
  using (public.is_admin());


-- =============================================================================
-- 2. РАСШИРЕНИЕ ТРИГГЕРА
-- =============================================================================

create or replace function public.enforce_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  current_user_id uuid := auth.uid();
  is_author       boolean;
  recent_count    integer;
  normalized_name text;
  matched_name    text;
  parent_is_reply boolean;
  profile         record;
begin
  if current_user_id is null then
    raise exception 'Нужно войти в аккаунт, чтобы оставить сообщение'
      using errcode = '42501';
  end if;

  is_author := public.is_admin();

  -- ---------------------------------------------------------------- читатель
  if not is_author then

    -- Проверка профиля
    select rp.user_id, rp.display_name into profile
      from public.reader_profiles rp
     where rp.user_id = current_user_id;

    if profile.user_id is null then
      raise exception 'Сначала выберите имя, под которым вас будут видеть'
        using errcode = 'P0001';
    end if;

    -- Подмена author_name из профиля, игнор клиента
    new.author_name := profile.display_name;

    if exists (select 1 from public.banned_users b where b.user_id = current_user_id) then
      raise exception 'Вы не можете оставлять сообщения на этом сайте'
        using errcode = '42501';
    end if;

    -- Служебные поля записи задаёт сервер (hardening из 0004).
    new.created_at := now();
    if tg_table_name = 'comments' then
      new.is_author_reply := false;
      new.parent_id := null;
    end if;

    -- Запрещённые имена (проверка по display_name, для безопасности — всё равно уже подменено)
    normalized_name := public.normalize_author_name(new.author_name);
    select r.name into matched_name
      from public.reserved_author_names r
     where normalized_name like '%' || public.normalize_author_name(r.name) || '%'
     limit 1;

    if matched_name is not null then
      raise exception 'Такое имя использовать нельзя: оно зарезервировано за автором сайта'
        using errcode = 'P0001';
    end if;

    -- Лимит 3 сообщения в минуту
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
  end if;

  -- ------------------------------------------------------------------ автор
  if tg_table_name = 'comments' then

    if new.parent_id is not null then
      select (c.parent_id is not null) into parent_is_reply
        from public.comments c
       where c.id = new.parent_id;

      if parent_is_reply is null then
        raise exception 'Комментарий, на который вы отвечаете, не найден'
          using errcode = 'P0001';
      end if;

      if parent_is_reply then
        raise exception 'Ответ на ответ не поддерживается'
          using errcode = 'P0001';
      end if;
    end if;

    if new.is_author_reply or new.parent_id is not null then
      new.is_author_reply := true;
      new.author_name := public.author_display_name();
    end if;
  end if;

  return new;
end;
$function$;

comment on function public.enforce_write_rate_limit() is
  'BEFORE INSERT на comments/guestbook_entries: проверка профиля, бан, hardening полей, запрещённые имена, лимит 3/мин. Автор — как раньше.';


-- =============================================================================
-- 3. RPC — EMAIL ДЛЯ АВТОРА
-- =============================================================================
-- Имя: admin_reader_profiles (зафиксировано в REPORT TASK-017).

create or replace function public.admin_reader_profiles(target_user_ids uuid[])
returns table (
  user_id      uuid,
  email        text,
  display_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_admin() then
    raise exception 'Доступно только автору сайта'
      using errcode = '42501';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    rp.display_name::text as display_name
  from auth.users u
  left join public.reader_profiles rp on rp.user_id = u.id
  where u.id = any(target_user_ids);
end;
$function$;

comment on function public.admin_reader_profiles(uuid[]) is
  'Email и display_name читателей по списку user_id. Только is_admin().';

revoke all on function public.admin_reader_profiles(uuid[]) from public;
revoke all on function public.admin_reader_profiles(uuid[]) from anon;
grant execute on function public.admin_reader_profiles(uuid[]) to authenticated;


-- =============================================================================
-- 4. ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ
-- =============================================================================
-- select * from public.reader_profiles limit 5;
-- select tablename, policyname, cmd from pg_policies
--  where tablename = 'reader_profiles' order by policyname;
-- select proname, prosecdef, proconfig from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and proname = 'admin_reader_profiles';


-- =============================================================================
-- 5. ШАГИ ДЛЯ ПОЛЬЗОВАТЕЛЯ
-- =============================================================================
-- 1) SQL Editor → применить этот файл
--      Ожидается: «Success. No rows returned»
-- 2) select * from public.reader_profiles;   (пусто — нормально)
-- 3) Сообщить кодеру — после применения продолжу живые проверки


-- =============================================================================
-- 6. ОТКАТ
-- =============================================================================
-- drop function if exists public.admin_reader_profiles;
-- drop table if exists public.reader_profiles;
-- -- триггерная функция возвращается к версии из 0005
-- =============================================================================