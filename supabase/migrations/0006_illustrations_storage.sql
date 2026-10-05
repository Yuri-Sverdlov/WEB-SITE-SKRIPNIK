-- =============================================================================
-- 0006_illustrations_storage.sql — Storage bucket + RLS для иллюстраций (E3/TASK-014)
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Дата: 2026-10-05
-- Предшественники: 0005 (author role + is_admin) — применена.
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor. Кодер в прод не деплоит.
--
-- ЧТО ДЕЛАЕТ:
--   1. Создаёт bucket `illustrations` (public read).
--   2. Политики на `storage.objects` для bucket `illustrations`:
--      - SELECT: всем (публичный просмотр на сайте);
--      - INSERT/UPDATE/DELETE: только is_admin() (через форму /admin).
--
-- ИДЕМПОТЕНТНОСТЬ: create or replace policy + if not exists для bucket.
-- Повторный прогон безопасен.
-- =============================================================================


-- =============================================================================
-- 1. BUCKET
-- =============================================================================
-- Supabase не позволяет create bucket через SQL Editor; bucket создаётся
-- вручную через Dashboard → Storage → Create bucket.
--
-- Вместо DDL здесь — инструкция для пользователя (см. REPORT).
-- Если ваш Supabase Project поддерживает INSERT INTO storage.buckets через
-- владельца/администратора (pg_dump путь), раскомментируйте ниже —
-- но в типовом Supabase Dashboard это блокировано RLS для SQL-окна.
--
-- INSERT INTO storage.buckets (id, name, public, owner)
-- VALUES ('illustrations', 'illustrations', true, auth.uid())
-- ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 2. ПОЛИТИКИ STORAGE (применять ПОСЛЕ создания bucket через Dashboard)
-- =============================================================================

-- 2.1. Публичное чтение — любой может видеть картинки на сайте
drop policy if exists illustrations_select_public on storage.objects;
create policy illustrations_select_public on storage.objects
  for select
  using (bucket_id = 'illustrations');

-- 2.2. Загрузка — только автор (is_admin)
drop policy if exists illustrations_insert_admin on storage.objects;
create policy illustrations_insert_admin on storage.objects
  for insert
  with check (
    bucket_id = 'illustrations'
    and public.is_admin()
  );

-- 2.3. Обновление — только автор
drop policy if exists illustrations_update_admin on storage.objects;
create policy illustrations_update_admin on storage.objects
  for update
  using (
    bucket_id = 'illustrations'
    and public.is_admin()
  )
  with check (
    bucket_id = 'illustrations'
    and public.is_admin()
  );

-- 2.4. Удаление — только автор
drop policy if exists illustrations_delete_admin on storage.objects;
create policy illustrations_delete_admin on storage.objects
  for delete
  using (
    bucket_id = 'illustrations'
    and public.is_admin()
  );


-- =============================================================================
-- 3. ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ (выполнять отдельно, по желанию)
-- =============================================================================
-- select * from storage.buckets where id = 'illustrations';
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--  order by policyname;
--            (ожидаем > 0 политик на storage.objects для bucket illustrations)


-- =============================================================================
-- 4. ШАГИ ДЛЯ ПОЛЬЗОВАТЕЛЯ (в Dashboard)
-- =============================================================================
-- 1) Supabase Dashboard → Storage → «Create bucket»
--      Name: illustrations
--      Public bucket: ON
-- 2) SQL Editor → применить этот файл (политики)
--      Ожидается: «Success. No rows returned» (DDL политик не возвращает строк)
-- 3) Проверка:
--      select * from storage.buckets where id = 'illustrations';
--      select tablename, policyname, cmd from pg_policies
--       where schemaname = 'storage' and tablename = 'objects';
-- 4) Вернуться к кодеру — сообщить «Success / политики применены»


-- =============================================================================
-- 5. ОТКАТ (при необходимости)
-- =============================================================================
-- drop policy if exists illustrations_select_public on storage.objects;
-- drop policy if exists illustrations_insert_admin on storage.objects;
-- drop policy if exists illustrations_update_admin on storage.objects;
-- drop policy if exists illustrations_delete_admin on storage.objects;
-- -- Удалить bucket: Supabase Dashboard → Storage → bucket → Delete
-- =============================================================================