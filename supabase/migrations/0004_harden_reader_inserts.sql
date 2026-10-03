-- =============================================================================
-- 0004_harden_reader_inserts.sql — hardening INSERT читателя + search_path
-- =============================================================================
-- Проект: WEB-SITE-SKRIPNIK · Задание: TASK-010 (D4, после брифа консультанта)
-- Дата: 2026-10-03 · Предшественник: 0003 (применён пользователем 2026-10-03)
--
-- ЗАЧЕМ (риск, который закрываем):
--   1. Триггер rate limit считает записи по `created_at`. Клиент через
--      PostgREST/консоль мог передать `created_at` в прошлом — и обойти лимит
--      3 записи в минуту. Теперь служебные поля записи задаёт ТОЛЬКО триггер.
--   2. `comments.is_author_reply` — служебный флаг (ответы автора, этап 8-9).
--      UI его не шлёт, но запросом из консоли его можно было выставить true.
--      На INSERT читателя принудительно ставится false.
--   3. `increment_story_views` — SECURITY DEFINER без зафиксированного
--      search_path (замечание в 0001_baseline.sql). Добавляем
--      `SET search_path = public, pg_temp`.
--
-- ПРИМЕНЯЕТ ТОЛЬКО ПОЛЬЗОВАТЕЛЬ в Supabase SQL Editor. Кодер в прод не деплоит
-- и SQL в базу не отправлял.
--
-- ИДЕМПОТЕНТНОСТЬ: только `CREATE OR REPLACE FUNCTION`, объекты не создаются
-- заново, повторный прогон безопасен. Триггеры (comments_rate_limit,
-- guestbook_entries_rate_limit) уже указывают на эту функцию из 0003 —
-- их пересоздавать НЕ нужно.
--
-- ЧТО НЕ МЕНЯЕТСЯ: RLS-политики (по-прежнему только `user_id = auth.uid()`),
-- тексты русских сообщений, сама логика лимита (>= 3 за последнюю минуту).
-- =============================================================================


-- =============================================================================
-- 1. enforce_write_rate_limit() — принудительные служебные поля + лимит 3/мин
-- =============================================================================
-- Изменения относительно 0003:
--   * `NEW.created_at := now();`  — до подсчёта, поэтому подделка даты не помогает;
--   * для comments дополнительно `NEW.is_author_reply := false;`
--     (в guestbook_entries такой колонки нет — ветка не выполняется).
-- Остальное — дословно как в 0003: вход обязателен, лимит по TG_TABLE_NAME,
-- русские тексты исключений.
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

  -- Служебные поля записи задаёт сервер, а не клиент.
  -- created_at — обязательно: от него зависит подсчёт лимита ниже.
  new.created_at := now();

  -- is_author_reply есть только у comments. Ответы автора — этап 8-9:
  -- пока любой INSERT читателя = не ответ автора.
  if tg_table_name = 'comments' then
    new.is_author_reply := false;
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


-- =============================================================================
-- 2. increment_story_views() — тот же код, но с безопасным search_path
-- =============================================================================
-- Тело UPDATE — как в 0001_baseline.sql (снимок фактического состояния БД).
-- Добавлено только `set search_path = public, pg_temp`: SECURITY DEFINER
-- не должен зависеть от search_path вызывающего.
-- =============================================================================

create or replace function public.increment_story_views(story_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  update stories
  set views_count = views_count + 1
  where id = story_id_input;
end;
$function$;


-- =============================================================================
-- Проверка после применения (выполнять в SQL Editor отдельно, по желанию)
-- =============================================================================
-- Ожидается: two функции с search_path = search_path=public, pg_temp
-- select p.proname,
--        p.prosecdef               as security_definer,
--        p.proconfig               as function_config,
--        pg_get_functiondef(p.oid) as definition
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('enforce_write_rate_limit', 'increment_story_views');
--
-- Ожидается: триггеры по-прежнему указывают на enforce_write_rate_limit
-- select c.relname as table_name, t.tgname, pg_get_triggerdef(t.oid)
-- from pg_trigger t
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and not t.tgisinternal
--   and c.relname in ('comments', 'guestbook_entries');


-- =============================================================================
-- Откат (если понадобится): вернуть версии функций из 0003
-- =============================================================================
-- enforce_write_rate_limit  — определение в supabase/migrations/0003_comments_guestbook.sql
-- increment_story_views     — определение в supabase/migrations/0001_baseline.sql
-- =============================================================================
