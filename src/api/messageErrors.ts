/**
 * Перевод ошибок записи читателя (комментарии, гостевая) на русский.
 *
 * Вынесено отдельным модулем, потому что сообщения приходят из двух источников:
 *  1. триггер rate limit в БД (`enforce_write_rate_limit`) уже бросает русский текст
 *     через `RAISE EXCEPTION` — его надо показать ДОСЛОВНО, не подменяя диагнозом;
 *  2. PostgREST/RLS/CHECK отвечают по-английски — их маппим.
 */

const CYRILLIC = /[А-Яа-яЁё]/

/** Русское сообщение для пользователя по тексту ошибки Supabase/PostgREST. */
export function mapReaderMessageError(message: string): string {
  const raw = (message || '').trim()

  if (!raw) {
    return 'Не удалось отправить сообщение. Попробуйте ещё раз'
  }

  // Причина, записанная в БД (наш RAISE EXCEPTION), показывается как есть.
  if (CYRILLIC.test(raw)) {
    return raw
  }

  const m = raw.toLowerCase()

  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'Нет прав отправить сообщение. Войдите в аккаунт'
  }
  if (m.includes('author_name_len_check') || m.includes('name_len_check')) {
    return 'Имя должно быть от 2 до 40 символов'
  }
  if (m.includes('body_len_check')) {
    return 'Текст должен быть от 1 до 2000 символов'
  }
  if (m.includes('null value in column')) {
    return 'Заполните все поля формы'
  }
  if (m.includes('user_id_fkey') || m.includes('jwt')) {
    return 'Сессия устарела — войдите заново'
  }
  if (m.includes('story_id_fkey')) {
    return 'Рассказ не найден — обновите страницу'
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) {
    return 'Ошибка сети. Проверьте подключение к интернету'
  }

  return `Ошибка: ${raw}`
}
