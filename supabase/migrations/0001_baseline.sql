-- =============================================================================
-- 0001_baseline.sql — BASELINE SNAPSHOT схемы Supabase (документ состояния)
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK
-- Дата снимка: 2026-10-02 (TASK-006, блок D0)
-- Источник: supabase/inspect.sql (запросы 1-5) + вывод SQL Editor пользователя,
--           сохранён в репозитории: supabase/Вывод inspect-sql.txt
--
-- ВАЖНО: это НЕ миграция «на будущее». Это снимок УЖЕ СУЩЕСТВУЮЩЕГО состояния
-- базы, зафиксированный в git, чтобы схема была в репозитории, а не только
-- в Dashboard. Все объекты ниже в проекте УЖЕ СОЗДАНЫ.
--
--   * НЕ применять вслепую на уже настроенную БД без сверки: повторный
--     CREATE TABLE / CREATE POLICY на существующих объектах упадёт с ошибкой
--     «already exists». Применять только на пустой базе или осознанно
--     редактируя (IF NOT EXISTS / DROP POLICY IF EXISTS).
--   * Что зафиксировать не удалось — помечено ниже как TODO (inspect не снял
--     эти факты, выдумывать их нельзя).
-- =============================================================================


-- =============================================================================
-- 1. Таблица stories
-- =============================================================================
-- Колонки, типы, NOT NULL и default — дословно из вывода inspect.sql, блок (3).
--
-- TODO (в inspect не запрашивалось, восстановить в TASK-007 при сверке схемы):
--   * PRIMARY KEY (по данным приложения — id; в выводе (3) ограничения не видны);
--   * прочие constraints: UNIQUE / CHECK / FOREIGN KEY;
--   * индексы (кроме неявного по PK).
-- Значения выше перечисленных фактов НЕ выдуманы — оставлены как TODO.
-- -----------------------------------------------------------------------------
create table if not exists public.stories (
  id            uuid                     not null default gen_random_uuid(),
  title         text                     not null,
  content       text                     not null,
  published_at  timestamp with time zone not null default now(),
  views_count   integer                  not null default 0,
  tags          text[]                            default '{}'::text[],
  illustrations text[]                            default '{}'::text[],
  created_at    timestamp with time zone not null default now()
  -- TODO: primary key (id), constraints, индексы — см. комментарий выше.
);

-- Факт из inspect, блок (1) и (5): RLS на stories ВКЛЮЧЁН, rls_forced = false.
alter table public.stories enable row level security;


-- =============================================================================
-- 2. Функция increment_story_views (счётчик просмотров)
-- =============================================================================
-- Дословно из вывода inspect.sql, блок (4): full_definition.
-- Переносы строк нормализованы (в выводе SQL Editor они были как <br>).
--
-- Факты из вывода (4): language plpgsql, RETURNS void, SECURITY DEFINER (true),
-- volatility = v (volatile), proconfig = null, owner = postgres.
-- ACL из вывода (4b): EXECUTE у anon, authenticated, service_role (+ postgres
-- и PUBLIC) — то есть счётчик может вызывать и неавторизованный посетитель.
--
-- ЗАМЕЧАНИЕ (не меняем в этом TASK): proconfig = null — безопасный search_path
-- не задан. Для SECURITY DEFINER это hardening-долг: при желании можно позже
-- добавить `set search_path = public, pg_temp` отдельной миграцией.
-- -----------------------------------------------------------------------------
create or replace function public.increment_story_views(story_id_input uuid)
returns void
language plpgsql
security definer
as $function$
begin
  update stories
  set views_count = views_count + 1
  where id = story_id_input;
end;
$function$;


-- =============================================================================
-- 3. Политики RLS — дословно из вывода inspect.sql, блок (2)
-- =============================================================================
-- Роль во всех политиках — PUBLIC (в pg_policies roles = {public}).
-- Проверено по выводу (2): политик INSERT/UPDATE/DELETE для anon НЕТ ни на
-- одной таблице; запись есть только под `auth.uid() = user_id` (INSERT).
--
-- ВНИМАНИЕ к именам политик: в выводе SQL Editor часть имён обрезана
-- (например «Авторизованные добавляют коммент», «Авторизованные добавляют
-- записи в »). Ниже они записаны РОВНО как в выводе — не «дописаны» по смыслу.
-- При сверке в TASK-007 уточнить полные имена (или писать политики заново).
-- -----------------------------------------------------------------------------

-- stories: только чтение для всех, записи нет ни у кого
create policy "Публичное чтение рассказов"
  on public.stories
  for select
  to public
  using (true);

-- comments: публичное чтение + вставка только от своего имени (auth.uid())
create policy "Публичное чтение комментариев"
  on public.comments
  for select
  to public
  using (true);

create policy "Авторизованные добавляют коммент"
  on public.comments
  for insert
  to public
  with check (auth.uid() = user_id);

-- guestbook_entries: то же самое
create policy "Публичное чтение гостевой книги"
  on public.guestbook_entries
  for select
  to public
  using (true);

-- Имя политики в выводе inspect обрезано: заканчивается на «Авторизованные
-- добавляют записи в » — воспроизведено как есть.
create policy "Авторизованные добавляют записи в "
  on public.guestbook_entries
  for insert
  to public
  with check (auth.uid() = user_id);


-- =============================================================================
-- 4. Таблицы comments и guestbook_entries — ТОЛЬКО политики
-- =============================================================================
-- Факты из вывода inspect:
--   * блок (1)/(5): обе таблицы существуют в схеме public, владелец postgres,
--     RLS ВКЛЮЧЁН (rls_enabled = true), rls_forced = false;
--   * блок (2): политики зафиксированы выше.
--
-- DDL колонок НЕТ: inspect.sql запрашивал колонки только для stories.
-- Поэтому CREATE TABLE для этих двух таблиц здесь НЕ пишется (это было бы
-- выдумыванием схемы). Состав колонок, constraints и индексы сверить отдельно
-- и зафиксировать в TASK-007 (в миграции 0003_comments_guestbook.sql), там же
-- создавать их «с нуля» только если БД пустая.
--
-- RLS на них уже включён (блок (1)); включать повторно не нужно:
--   alter table public.comments          enable row level security;  -- уже true
--   alter table public.guestbook_entries enable row level security;  -- уже true
-- =============================================================================


-- =============================================================================
-- Итог снимка (для сверки в TASK-007)
-- =============================================================================
-- public.stories            | RLS ON | SELECT всем; записи через политики нет
-- public.comments           | RLS ON | SELECT всем; INSERT с auth.uid() = user_id
-- public.guestbook_entries  | RLS ON | SELECT всем; INSERT с auth.uid() = user_id
-- public.increment_story_views(uuid) -> void | plpgsql | SECURITY DEFINER
--   (EXECUTE: anon, authenticated, service_role; search_path не задан)
-- =============================================================================
