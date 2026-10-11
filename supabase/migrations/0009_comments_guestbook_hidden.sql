-- =============================================================================
-- 0009_comments_guestbook_hidden.sql — скрытие отзывов, подпись автора (TASK-024)
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Дата: 2026-10-11
-- Предшественники (применены): 0001, 0003, 0004, 0005, 0007.
--   `0008_author_name_fix.sql` НЕ трогаем (это отдельная миграция).
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor. Кодер в прод не деплоит.
--
-- ЧТО ДЕЛАЕТ:
--   1. is_hidden boolean not null default false → comments, guestbook_entries.
--   2. comment_parent_is_visible(uuid) — SECURITY DEFINER проверка родителя
--      (без рекурсии в RLS).
--   3. RLS SELECT: гости/читатели видят только видимые строки
--      (ответ скрыт, если скрыт родитель); is_admin() видит всё.
--   4. RLS UPDATE: только is_admin(). BEFORE UPDATE триггер разрешает менять
--      ТОЛЬКО is_hidden — остальные поля менять нельзя.
--   5. BEFORE INSERT (enforce_write_rate_limit): любой insert от is_admin()
--      в comments/guestbook_entries → author_name := author_display_name()
--      (клиент игнорируется).
--
-- ИДЕМПОТЕНТНОСТЬ: add column if not exists, create or replace function,
-- drop policy if exists + create policy, drop trigger if exists + create trigger.
--
-- ЧЕГО НЕ ДЕЛАЕТ: не меняет поведение «Удалить / Заблокировать / Удалить все»,
-- не трогает Storage, stories, reader_profiles, 0008.
-- =============================================================================


-- =============================================================================
-- 1. КОЛОНКА is_hidden
-- =============================================================================

alter table public.comments
  add column if not exists is_hidden boolean not null default false;

alter table public.guestbook_entries
  add column if not exists is_hidden boolean not null default false;

comment on column public.comments.is_hidden is
  'Скрыт автором из публичной ленты. Ответ наследует видимость родителя.';
comment on column public.guestbook_entries.is_hidden is
  'Скрыт автором из публичной гостевой книги.';


-- =============================================================================
-- 2. ПРОВЕРКА РОДИТЕЛЯ (SECURITY DEFINER → без рекурсии в RLS)
-- =============================================================================
-- SECURITY DEFINER читает comments в обход RLS, поэтому SELECT-политика
-- на comments не вызывает саму себя.

create or replace function public.comment_parent_is_visible(parent uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(
    (select p.is_hidden = false from public.comments p where p.id = parent),
    false
  );
$function$;

comment on function public.comment_parent_is_visible(uuid) is
  'true, если родительский комментарий существует и не скрыт. SECURITY DEFINER (без рекурсии RLS).';


-- =============================================================================
-- 3. RLS SELECT — видимость для гостей и читателей
-- =============================================================================

drop policy if exists "Публичное чтение комментариев" on public.comments;
create policy "Публичное чтение комментариев" on public.comments
  for select
  using (
    public.is_admin()
    or (
      is_hidden = false
      and (parent_id is null or public.comment_parent_is_visible(parent_id))
    )
  );

drop policy if exists "Публичное чтение гостевой книги" on public.guestbook_entries;
create policy "Публичное чтение гостевой книги" on public.guestbook_entries
  for select
  using (public.is_admin() or is_hidden = false);


-- =============================================================================
-- 4. RLS UPDATE — только автор, и только is_hidden
-- =============================================================================

drop policy if exists comments_admin_update on public.comments;
create policy comments_admin_update on public.comments
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists guestbook_entries_admin_update on public.guestbook_entries;
create policy guestbook_entries_admin_update on public.guestbook_entries
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- BEFORE UPDATE: автор может изменить ТОЛЬКО is_hidden.
-- Сравниваем все поля строки, кроме is_hidden (через to_jsonb — одинаково
-- для обеих таблиц, независимо от их набора колонок).
create or replace function public.enforce_admin_update_hidden_only()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_admin() then
    raise exception 'Изменять записи может только автор сайта'
      using errcode = '42501';
  end if;

  if (to_jsonb(old) - 'is_hidden') is distinct from (to_jsonb(new) - 'is_hidden') then
    raise exception 'Можно изменить только видимость записи'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

comment on function public.enforce_admin_update_hidden_only() is
  'BEFORE UPDATE на comments/guestbook_entries: только is_admin(), только колонка is_hidden.';

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
-- 5. BEFORE INSERT — подпись автора для ЛЮБОГО insert от is_admin()
-- =============================================================================
-- Расширение версии из 0007: у автора author_name := author_display_name()
-- на comments И guestbook_entries (не только на ответе).

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

    -- Запрещённые имена (по display_name)
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

    -- Скрытое читатель не задаёт.
    new.is_hidden := false;

    return new;
  end if;

  -- ------------------------------------------------------------------ автор
  -- Подпись автора — всегда из одного места, клиент игнорируется.
  new.author_name := public.author_display_name();

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

    -- Ответ: помечаем и подписываем (подпись уже задана выше).
    if new.parent_id is not null then
      new.is_author_reply := true;
    end if;
  end if;

  -- Новые записи автора создаются видимыми (скрытие — отдельным UPDATE).
  new.is_hidden := false;

  return new;
end;
$function$;

comment on function public.enforce_write_rate_limit() is
  'BEFORE INSERT на comments/guestbook_entries: профиль читателя, бан, hardening, запрещённые имена, лимит 3/мин; для is_admin() author_name := author_display_name() и is_hidden := false.';


-- =============================================================================
-- 6. ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ (SQL Editor, по желанию)
-- =============================================================================
-- select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--  where table_schema='public' and table_name in ('comments','guestbook_entries')
--    and column_name='is_hidden';
--   → 2 строки, boolean, default false, not null.
--
-- select tablename, policyname, cmd, qual
--   from pg_policies
--  where schemaname='public' and tablename in ('comments','guestbook_entries')
--  order by tablename, cmd;
--   → SELECT-политики с условием видимости; UPDATE — is_admin().
--
-- Скрой и покажи строку (под автором) — публичная лента не должна её показывать:
--   update public.comments set is_hidden = true  where id = '<uuid>';
--   update public.comments set is_hidden = false where id = '<uuid>';


-- =============================================================================
-- 7. ОТКАТ
-- =============================================================================
-- drop trigger if exists comments_hidden_only_update on public.comments;
-- drop trigger if exists guestbook_entries_hidden_only_update on public.guestbook_entries;
-- drop function if exists public.enforce_admin_update_hidden_only();
-- drop function if exists public.comment_parent_is_visible(uuid);
-- drop policy if exists comments_admin_update on public.comments;
-- drop policy if exists guestbook_entries_admin_update on public.guestbook_entries;
-- drop policy if exists "Публичное чтение комментариев" on public.comments;
-- create policy "Публичное чтение комментариев" on public.comments for select using (true);
-- drop policy if exists "Публичное чтение гостевой книги" on public.guestbook_entries;
-- create policy "Публичное чтение гостевой книги" on public.guestbook_entries for select using (true);
-- alter table public.comments drop column if exists is_hidden;
-- alter table public.guestbook_entries drop column if exists is_hidden;
-- -- enforce_write_rate_limit() возвращается из 0007_reader_profiles.sql
-- =============================================================================
