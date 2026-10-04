-- =============================================================================
-- 0005_author_role.sql — роль автора, защита и бан в БД (блок E0 / TASK-011)
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Дата: 2026-10-04
-- Предшественники: 0001 (baseline), 0003 (комментарии/гостевая + rate limit),
--                  0004 (hardening created_at / is_author_reply) — все применены.
-- Бриф: tasks/consultant-block-E-brief.md (раздел 4, E0)
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor. Кодер в прод не деплоит.
-- После применения пользователь отдельно (шаг 2, вне миграции) выдаёт себе права
-- автора: insert into public.site_admins (user_id) select id from auth.users
-- where email = '<ваш email>';   -- email в миграции НЕ прописан намеренно.
--
-- ЧТО ДЕЛАЕТ:
--   1. Роль автора: site_admins + is_admin() (SECURITY DEFINER, search_path).
--   2. Права автора в БД: stories INSERT/UPDATE/DELETE, comments/guestbook DELETE.
--   3. Схема ответов автора: comments.parent_id (один уровень вложенности).
--   4. Расширение триггера из 0004: подпись/флаги ответа, бан, запрещённые имена,
--      rate limit только для читателей.
--   5. Бан: banned_users.
--   6. RPC модерации: счёт и удаление всех сообщений читателя.
--
-- ИДЕМПОТЕНТНОСТЬ: create table if not exists, create or replace function,
-- drop policy if exists + create policy, add column if not exists, seed с
-- on conflict do nothing. Повторный прогон безопасен.
--
-- ЧЕГО НЕ ДЕЛАЕТ: не ослабляет 0004 для читателей, не создаёт фронт /admin,
-- не трогает Storage и не удаляет существующие данные.
-- =============================================================================


-- =============================================================================
-- 1. РОЛЬ АВТОРА
-- =============================================================================

create table if not exists public.site_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.site_admins is
  'Аккаунты с правами автора сайта. Выдача прав = insert строки (SQL Editor, владелец).';

alter table public.site_admins enable row level security;

-- is_admin(): единственная точка проверки «автор ли я».
-- SECURITY DEFINER + search_path: читает site_admins в обход RLS (владелец таблицы),
-- поэтому политики на site_admins не мешают проверке и не возникает рекурсии.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1 from public.site_admins a where a.user_id = auth.uid()
  );
$function$;

comment on function public.is_admin() is
  'true, если auth.uid() есть в site_admins. Используется в RLS и триггерах.';


-- =============================================================================
-- 2. ПОДПИСЬ ОТВЕТА АВТОРА — одна константа в одном месте
-- =============================================================================
-- Для сайтов №2–3 меняется только эта строка.

create or replace function public.author_display_name()
returns text
language sql
immutable
as $function$
  select 'Александр Скрипник'::text;
$function$;

comment on function public.author_display_name() is
  'Подпись ответа автора. Единственное место правки для других сайтов.';


-- =============================================================================
-- 3. ЗАПРЕЩЁННЫЕ ИМЕНА ЧИТАТЕЛЕЙ (reserved_author_names)
-- =============================================================================
-- Список — решение пользователя (бриф §2). «александр» отдельно НЕ запрещён.

create table if not exists public.reserved_author_names (
  name       text primary key,
  created_at timestamptz not null default now()
);

comment on table public.reserved_author_names is
  'Имена, которые читатель не может использовать (выдаёт себя за автора/админа).';

alter table public.reserved_author_names enable row level security;
-- Политик нет: таблицу читает только триггер (SECURITY DEFINER). Читателям
-- список недоступен; при необходимости клиентской подсказки в TASK-012+ добавим
-- политику SELECT — сейчас не требуется.

insert into public.reserved_author_names (name) values
  ('скрипник'),
  ('skripnik'),
  ('александр борисович'),
  ('автор'),
  ('author'),
  ('администратор'),
  ('админ'),
  ('administrator'),
  ('admin')
on conflict (name) do nothing;


-- =============================================================================
-- 4. НОРМАЛИЗАЦИЯ ИМЕНИ ДЛЯ СРАВНЕНИЯ
-- =============================================================================
-- lower → ё→е → латинские двойники в кириллицу → обрезка пробелов.
-- Двойники: a c e o p x y k m t b h → а с е о р х у к м т в н (бриф §4.5).
-- Применяется И к имени читателя, И к списку запрещённых — поэтому «Cкрипник»
-- (латинская C) и «skripnik» ловятся одинаково.

create or replace function public.normalize_author_name(input text)
returns text
language sql
immutable
as $function$
  select translate(
           replace(lower(btrim(coalesce(input, ''))), 'ё', 'е'),
           'aceopxykmtbh',
           'асеорхукмтвн'
         );
$function$;

comment on function public.normalize_author_name(text) is
  'lower + ё→е + латинские двойники → кириллица + trim. Для сравнения с reserved_author_names.';


-- =============================================================================
-- 5. БАН (banned_users)
-- =============================================================================

create table if not exists public.banned_users (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  banned_at timestamptz not null default now(),
  reason    text
);

comment on table public.banned_users is
  'Заблокированные читатели. Блокировка НЕ удаляет их сообщения (решение пользователя).';

alter table public.banned_users enable row level security;

drop policy if exists banned_users_admin_all on public.banned_users;
create policy banned_users_admin_all on public.banned_users
  for all
  using (public.is_admin())
  with check (public.is_admin());


-- =============================================================================
-- 6. СХЕМА ОТВЕТОВ АВТОРА: comments.parent_id (один уровень вложенности)
-- =============================================================================

alter table public.comments
  add column if not exists parent_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'comments'
       and c.conname = 'comments_parent_id_fkey'
  ) then
    alter table public.comments
      add constraint comments_parent_id_fkey
      foreign key (parent_id) references public.comments(id) on delete cascade;
  end if;
end;
$$;

create index if not exists comments_parent_id_idx on public.comments (parent_id);


-- =============================================================================
-- 7. ПРАВА АВТОРА В БД (RLS)
-- =============================================================================
-- Существующие политики чтения не трогаем (stories/comments/guestbook SELECT
-- «всем» и INSERT читателей с auth.uid() = user_id остаются как были).

-- 7.1. site_admins: читатели не могут ничего; автор — может (нужно для E1/E4).
drop policy if exists site_admins_admin_all on public.site_admins;
create policy site_admins_admin_all on public.site_admins
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 7.2. stories: запись только автору. Чтение — как было (всем).
drop policy if exists stories_admin_insert on public.stories;
create policy stories_admin_insert on public.stories
  for insert
  with check (public.is_admin());

drop policy if exists stories_admin_update on public.stories;
create policy stories_admin_update on public.stories
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists stories_admin_delete on public.stories;
create policy stories_admin_delete on public.stories
  for delete
  using (public.is_admin());

-- 7.3. comments / guestbook_entries: удаление только автору.
drop policy if exists comments_admin_delete on public.comments;
create policy comments_admin_delete on public.comments
  for delete
  using (public.is_admin());

drop policy if exists guestbook_entries_admin_delete on public.guestbook_entries;
create policy guestbook_entries_admin_delete on public.guestbook_entries
  for delete
  using (public.is_admin());

-- 7.4. reserved_author_names: политик нет (см. §3).


-- =============================================================================
-- 8. ТРИГГЕР: enforce_write_rate_limit() — расширение версии из 0004
-- =============================================================================
-- Читатель (NOT is_admin()):
--   * бан → отказ;
--   * created_at := now(); на comments: is_author_reply := false, parent_id := null;
--   * запрещённые имена (по вхождению, с нормализацией) → отказ;
--   * лимит 3 сообщения в минуту.
-- Автор (is_admin()):
--   * без лимита, без проверки имён;
--   * is_author_reply / parent_id — как прислал;
--   * на ответе (is_author_reply или parent_id) author_name := author_display_name();
--   * parent_id обязан ссылаться на комментарий читателя (ответ на ответ — отказ).

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
begin
  if current_user_id is null then
    raise exception 'Нужно войти в аккаунт, чтобы оставить сообщение'
      using errcode = '42501';
  end if;

  is_author := public.is_admin();

  -- ---------------------------------------------------------------- читатель
  if not is_author then

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

    -- Запрещённые имена: сравнение по вхождению, обе стороны нормализуются.
    normalized_name := public.normalize_author_name(new.author_name);
    select r.name into matched_name
      from public.reserved_author_names r
     where normalized_name like '%' || public.normalize_author_name(r.name) || '%'
     limit 1;

    if matched_name is not null then
      raise exception 'Такое имя использовать нельзя: оно зарезервировано за автором сайта'
        using errcode = 'P0001';
    end if;

    -- Лимит 3 сообщения в минуту (по настоящему created_at).
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
      -- Один уровень вложенности: родитель должен быть комментарием читателя.
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

    -- Подпись ответа автора — из одного места (author_display_name()).
    if new.is_author_reply or new.parent_id is not null then
      new.is_author_reply := true;
      new.author_name := public.author_display_name();
    end if;
  end if;

  -- Автор освобождён от лимита и проверки имён; created_at не подменяется.
  return new;
end;
$function$;

comment on function public.enforce_write_rate_limit() is
  'BEFORE INSERT на comments/guestbook_entries: бан, hardening полей, запрещённые имена, лимит 3/мин. Автор (is_admin) освобождён от лимита и имён.';


-- =============================================================================
-- 9. RPC МОДЕРАЦИИ (только автор)
-- =============================================================================

-- 9.1. Счёт сообщений читателя — для окна подтверждения (E4), без удаления.
create or replace function public.admin_count_user_messages(target_user_id uuid)
returns table (
  comments_count     bigint,
  guestbook_count    bigint,
  author_replies_count bigint
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
    (select count(*) from public.comments c where c.user_id = target_user_id),
    (select count(*) from public.guestbook_entries g where g.user_id = target_user_id),
    -- ответы автора на комментарии этого читателя: уйдут каскадом при удалении
    (select count(*)
       from public.comments r
      where r.parent_id in (select c2.id from public.comments c2 where c2.user_id = target_user_id));
end;
$function$;

comment on function public.admin_count_user_messages(uuid) is
  'Число комментариев, записей гостевой и ответов автора (каскад) для читателя. Только is_admin().';

-- 9.2. Удаление ВСЕХ сообщений читателя одним вызовом (E4).
create or replace function public.admin_delete_user_messages(target_user_id uuid)
returns table (
  comments_deleted     bigint,
  guestbook_deleted    bigint,
  author_replies_deleted bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  replies_to_delete bigint;
  comments_gone     bigint;
  guestbook_gone    bigint;
begin
  if not public.is_admin() then
    raise exception 'Доступно только автору сайта'
      using errcode = '42501';
  end if;

  -- Считаем заранее: после DELETE родительских строк связь уже не восстановить.
  select count(*)
    into replies_to_delete
    from public.comments r
   where r.parent_id in (select c.id from public.comments c where c.user_id = target_user_id);

  delete from public.comments where user_id = target_user_id;
  get diagnostics comments_gone = row_count;

  delete from public.guestbook_entries where user_id = target_user_id;
  get diagnostics guestbook_gone = row_count;

  return query select comments_gone, guestbook_gone, replies_to_delete;
end;
$function$;

comment on function public.admin_delete_user_messages(uuid) is
  'Удаляет все комментарии и записи гостевой читателя одним вызовом (ответы автора уходят каскадом). Только is_admin().';

-- Права на RPC: только вошедшим (authenticated). anon и PUBLIC отзываем —
-- внутренняя проверка is_admin() остаётся вторым барьером.
revoke all on function public.admin_count_user_messages(uuid) from public;
revoke all on function public.admin_count_user_messages(uuid) from anon;
grant execute on function public.admin_count_user_messages(uuid) to authenticated;

revoke all on function public.admin_delete_user_messages(uuid) from public;
revoke all on function public.admin_delete_user_messages(uuid) from anon;
grant execute on function public.admin_delete_user_messages(uuid) to authenticated;


-- =============================================================================
-- 10. ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ (выполнять в SQL Editor отдельно, по желанию)
-- =============================================================================
-- Ожидается: 2 политики на stories (insert/update/delete) + 1 на comments +
-- 1 на guestbook_entries + по 1 на site_admins/banned_users.
-- select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--  where schemaname = 'public'
--  order by tablename, cmd;
--
-- Ожидается: 9 строк — список запрещённых имён.
-- select name from public.reserved_author_names order by name;
--
-- Ожидается: функция с search_path и SECURITY DEFINER.
-- select proname, prosecdef, proconfig from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and proname in ('is_admin','author_display_name','normalize_author_name',
--                    'enforce_write_rate_limit','admin_count_user_messages',
--                    'admin_delete_user_messages');
--
-- Проверка нормализации (без записи в таблицы):
-- select public.normalize_author_name(' Cкрипник ') as a,   -- ожидаем 'скрипник'
--        public.normalize_author_name('SKRIPNIK') as b,     -- ожидаем 'sкriрniк'
--        public.normalize_author_name('АДМИН') as c;        -- ожидаем 'админ'


-- =============================================================================
-- 11. ШАГ 2 (ПОСЛЕ применения миграции) — выдать себе права автора
-- =============================================================================
-- Выполняет ПОЛЬЗОВАТЕЛЬ, подставив свой email. Email в исполняемой части миграции НЕ прописан.
--
-- ВАЖНО: auth.users сравнивает email как строку (точное совпадение), поэтому в команде должен быть
-- ровно тот email, который лежит в auth.users. «Точка в имени ящика» (sverdlov.y@ == sverdlovy@)
-- действует только на доставку почты у Яндекса, но НЕ в базе. Надёжный вариант — перечислить оба
-- написания: сработает то, которое реально существует (если строки нет — вставится 0 строк, и это
-- видно по контрольному select ниже).
--
-- insert into public.site_admins (user_id)
-- select id from auth.users
--  where email in ('sverdlov.y@yandex.ru', 'sverdlovy@yandex.ru')
-- on conflict (user_id) do nothing;
--
-- Проверка: select a.user_id, u.email, a.created_at
--             from public.site_admins a join auth.users u on u.id = a.user_id;
--            (ожидаем ровно 1 строку — ваш email, независимо от написания выше)


-- =============================================================================
-- 12. ОТКАТ (при необходимости)
-- =============================================================================
-- drop policy if exists stories_admin_insert on public.stories;
-- drop policy if exists stories_admin_update on public.stories;
-- drop policy if exists stories_admin_delete on public.stories;
-- drop policy if exists comments_admin_delete on public.comments;
-- drop policy if exists guestbook_entries_admin_delete on public.guestbook_entries;
-- drop policy if exists site_admins_admin_all on public.site_admins;
-- drop policy if exists banned_users_admin_all on public.banned_users;
-- alter table public.comments drop column if exists parent_id;   -- удалит и FK
-- -- триггерная функция возвращается из 0004_harden_reader_inserts.sql
-- =============================================================================
