import { supabase } from './supabaseClient'

export type ReaderProfile = {
  user_id: string
  display_name: string
  created_at: string
}

function mapProfileError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('violates row-level security') || m.includes('violates rls')) {
    return 'Недостаточно прав.'
  }
  if (m.includes('already exists') || m.includes('duplicate key') || m.includes('unique')) {
    return 'Это имя уже занято, выберите другое.'
  }
  if (m.includes('reserved') || m.includes('зарезервировано')) {
    return 'Такое имя использовать нельзя: оно зарезервировано за автором сайта.'
  }
  if (m.includes('select') && m.includes('profile')) {
    return 'Сначала выберите имя, под которым вас будут видеть.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Ошибка сети. Проверьте подключение.'
  }
  return `Ошибка: ${message}`
}

/** Получить свой профиль (или null, если ещё не создан) */
export async function fetchMyProfile(): Promise<{
  profile: ReaderProfile | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('reader_profiles')
    .select('*')
    .maybeSingle()

  if (error) return { profile: null, error: mapProfileError(error.message) }
  return { profile: data as ReaderProfile | null, error: null }
}

/** Создать профиль (один раз, имя навсегда) */
export async function createProfile(
  displayName: string,
): Promise<{ ok: boolean; message: string | null }> {
  const name = displayName.trim()
  if (name.length < 2 || name.length > 40) {
    return { ok: false, message: 'Имя должно быть от 2 до 40 символов.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Нужно войти в аккаунт.' }

  const { error } = await supabase.from('reader_profiles').insert({
    user_id: user.id,
    display_name: name,
  })

  if (error) return { ok: false, message: mapProfileError(error.message) }
  return { ok: true, message: null }
}