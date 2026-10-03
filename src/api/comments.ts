import { supabase } from './supabaseClient'
import { mapReaderMessageError } from './messageErrors'

/** Границы, продублированные из CHECK-ограничений 0003 (клиентская валидация) */
export const AUTHOR_NAME_MIN = 2
export const AUTHOR_NAME_MAX = 40
export const BODY_MIN = 1
export const BODY_MAX = 2000

export type CommentItem = {
  id: string
  author_name: string
  body: string
  created_at: string
}

export type CommentsResult = {
  data: CommentItem[]
  error: string | null
}

export type InsertCommentResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Лента комментариев рассказа: старые сверху.
 * `is_author_reply` не запрашиваем и не показываем — ответы автора это этап 8-9.
 */
export async function fetchComments(storyId: string): Promise<CommentsResult> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, author_name, body, created_at')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [], error: mapReaderMessageError(error.message) }
  }

  return { data: (data ?? []) as CommentItem[], error: null }
}

/** Клиентская валидация имени и текста сообщения: комментарии и гостевая (TASK-009) */
export function validateReaderMessageInput(authorName: string, body: string): string | null {
  const name = authorName.trim()
  const text = body.trim()

  if (name.length < AUTHOR_NAME_MIN || name.length > AUTHOR_NAME_MAX) {
    return `Имя должно быть от ${AUTHOR_NAME_MIN} до ${AUTHOR_NAME_MAX} символов`
  }
  if (text.length < BODY_MIN || text.length > BODY_MAX) {
    return `Текст должен быть от ${BODY_MIN} до ${BODY_MAX} символов`
  }
  return null
}

/**
 * Вставка комментария от вошедшего читателя.
 * `user_id` передаём явно: RLS проверяет `auth.uid() = user_id`.
 * `is_author_reply` не передаём — остаётся default false.
 */
export async function insertComment(input: {
  storyId: string
  userId: string
  authorName: string
  body: string
}): Promise<InsertCommentResult> {
  const invalid = validateReaderMessageInput(input.authorName, input.body)
  if (invalid) {
    return { ok: false, message: invalid }
  }

  const { error } = await supabase.from('comments').insert({
    story_id: input.storyId,
    user_id: input.userId,
    author_name: input.authorName.trim(),
    body: input.body.trim(),
  })

  if (error) {
    return { ok: false, message: mapReaderMessageError(error.message) }
  }

  return { ok: true }
}
