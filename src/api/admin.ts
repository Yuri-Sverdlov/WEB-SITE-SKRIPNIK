import { supabase } from './supabaseClient'

export async function fetchIsAdmin(): Promise<{
  isAdmin: boolean
  error: string | null
}> {
  const { data, error } = await supabase.rpc('is_admin')

  if (error) {
    return { isAdmin: false, error: error.message }
  }

  return { isAdmin: Boolean(data), error: null }
}
