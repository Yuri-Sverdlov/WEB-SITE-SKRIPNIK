import { supabase } from './supabaseClient'
import { mapReaderMessageError } from './messageErrors'
import { validateReaderMessageInput } from './comments'

export type GuestbookEntry = {
  id: string
  author_name: string
  body: string
  created_at: string
}

export type GuestbookResult = {
  data: GuestbookEntry[]
  error: string | null
}

export type InsertGuestbookResult =
  | { ok: true }
  | { ok: false; message: string }

/** Лента гостевой книги: старые сверху (как комментарии). */
export async function fetchGuestbookEntries(): Promise<GuestbookResult> {
  const { data, error } = await supabase
    .from('guestbook_entries')
    .select('id, author_name, body, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [], error: mapReaderMessageError(error.message) }
  }

  return { data: (data ?? []) as GuestbookEntry[], error: null }
}

/**
 * Запись в гостевой книге от вошедшего читателя.
 * `story_id` не передаём — записи не привязаны к рассказу.
 * Валидация 2-40 / 1-2000 общая с комментариями (`comments.ts`).
 */
export async function insertGuestbookEntry(input: {
  userId: string
  authorName: string
  body: string
}): Promise<InsertGuestbookResult> {
  const invalid = validateReaderMessageInput(input.authorName, input.body)
  if (invalid) {
    return { ok: false, message: invalid }
  }

  const { error } = await supabase.from('guestbook_entries').insert({
    user_id: input.userId,
    author_name: input.authorName.trim(),
    body: input.body.trim(),
  })

  if (error) {
    return { ok: false, message: mapReaderMessageError(error.message) }
  }

  return { ok: true }
}
