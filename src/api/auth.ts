import { supabase } from './supabaseClient'

export type AuthResult = {
  ok: boolean
  message: string | null
  /** true, если регистрация прошла, но Supabase требует подтверждения email */
  needsEmailConfirmation?: boolean
}

/** Перевод типовых ошибок Supabase Auth на русский */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('invalid login credentials')) {
    return 'Неверный email или пароль'
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Пользователь с таким email уже зарегистрирован'
  }
  if (m.includes('password should be at least') || m.includes('password is too short')) {
    return 'Пароль должен быть не короче 6 символов'
  }
  if (m.includes('email not confirmed')) {
    return 'Подтвердите email — проверьте почту'
  }
  if (
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('for security purposes')
  ) {
    return 'Слишком много попыток. Попробуйте позже'
  }
  if (
    m.includes('invalid format') ||
    m.includes('unable to validate email') ||
    (m.includes('email') && m.includes('is invalid'))
  ) {
    return 'Некорректный email'
  }
  if (m.includes('user not found')) {
    return 'Пользователь не найден'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Ошибка сети. Проверьте подключение к интернету'
  }

  return `Ошибка: ${message}`
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { ok: false, message: mapAuthError(error.message) }
  }

  // Supabase при включённом подтверждении email возвращает «фантомного» пользователя
  // с пустым списком identities, если email уже занят — отдельной ошибки нет.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { ok: false, message: 'Пользователь с таким email уже зарегистрирован' }
  }

  return {
    ok: true,
    message: null,
    needsEmailConfirmation: !data.session,
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, message: mapAuthError(error.message) }
  }

  return { ok: true, message: null }
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut()
  if (error) return { error: mapAuthError(error.message) }
  return { error: null }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })

  if (error) {
    return { ok: false, message: mapAuthError(error.message) }
  }

  return { ok: true, message: null }
}