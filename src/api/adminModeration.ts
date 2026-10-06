import { supabase } from './supabaseClient'
import { PAGE_SIZE } from './stories'

/* ============================================================
   Типы
   ============================================================ */

export type AdminComment = {
  id: string
  story_id: string
  user_id: string | null
  author_name: string
  body: string
  created_at: string
  story_title?: string
}

export type AdminGuestbookEntry = {
  id: string
  user_id: string | null
  author_name: string
  body: string
  created_at: string
}

export type AdminBannedUser = {
  user_id: string
  banned_at: string
  reason: string | null
  last_name: string
}

export type UserMessageCounts = {
  comments_count: number
  guestbook_count: number
  author_replies_count: number
}

function normalizeMessageCounts(data: unknown): UserMessageCounts {
  const row = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | undefined
  return {
    comments_count: Number(row?.comments_count ?? 0),
    guestbook_count: Number(row?.guestbook_count ?? 0),
    author_replies_count: Number(row?.author_replies_count ?? 0),
  }
}

/* ============================================================
   Хелперы
   ============================================================ */

function mapErr(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('row-level security') || m.includes('violates rls')) {
    return 'Недостаточно прав.'
  }
  if (m.includes('foreign key')) return 'Запись связана с другими данными.'
  if (m.includes('network') || m.includes('fetch')) return 'Ошибка сети.'
  return `Ошибка: ${message}`
}

/* ============================================================
   Комментарии
   ============================================================ */

export async function fetchAdminComments(
  page: number,
): Promise<{ data: AdminComment[]; count: number | null; error: string | null }> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('comments')
    .select('id, story_id, user_id, author_name, body, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: null, error: mapErr(error.message) }

  const comments = data as AdminComment[]

  // Дозагружаем заголовки рассказов
  const storyIds = [...new Set(comments.map((c) => c.story_id))]
  if (storyIds.length > 0) {
    const { data: stories } = await supabase
      .from('stories')
      .select('id, title')
      .in('id', storyIds)

    const titleMap = new Map((stories ?? []).map((s: { id: string; title: string }) => [s.id, s.title]))
    for (const c of comments) {
      c.story_title = titleMap.get(c.story_id) ?? '—'
    }
  }

  return { data: comments, count, error: null }
}

export async function deleteComment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) return { error: mapErr(error.message) }
  return { error: null }
}

/* ============================================================
   Гостевая книга
   ============================================================ */

export async function fetchAdminGuestbook(
  page: number,
): Promise<{ data: AdminGuestbookEntry[]; count: number | null; error: string | null }> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('guestbook_entries')
    .select('id, user_id, author_name, body, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: null, error: mapErr(error.message) }
  return { data: data as AdminGuestbookEntry[], count, error: null }
}

export async function deleteGuestbookEntry(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('guestbook_entries').delete().eq('id', id)
  if (error) return { error: mapErr(error.message) }
  return { error: null }
}

/* ============================================================
   Бан / разбан
   ============================================================ */

export async function banUser(
  userId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('banned_users').insert({
    user_id: userId,
    reason: reason ?? null,
  })
  if (error) return { error: mapErr(error.message) }
  return { error: null }
}

export async function unbanUser(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('banned_users').delete().eq('user_id', userId)
  if (error) return { error: mapErr(error.message) }
  return { error: null }
}

/** Список забаненных + последнее известное имя из comments/guestbook */
export async function fetchBannedUsers(): Promise<{
  data: AdminBannedUser[]
  error: string | null
}> {
  const { data: banned, error } = await supabase
    .from('banned_users')
    .select('user_id, banned_at, reason')
    .order('banned_at', { ascending: false })

  if (error) return { data: [], error: mapErr(error.message) }

  const users = banned as Pick<AdminBannedUser, 'user_id' | 'banned_at' | 'reason'>[]
  const result: AdminBannedUser[] = []

  for (const u of users) {
    // Последнее имя из comments
    const { data: lastComment } = await supabase
      .from('comments')
      .select('author_name')
      .eq('user_id', u.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let lastName = (lastComment as { author_name: string } | null)?.author_name

    if (!lastName) {
      const { data: lastGuest } = await supabase
        .from('guestbook_entries')
        .select('author_name')
        .eq('user_id', u.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      lastName = (lastGuest as { author_name: string } | null)?.author_name
    }

    result.push({
      user_id: u.user_id,
      banned_at: u.banned_at,
      reason: u.reason,
      last_name: lastName || '—',
    })
  }

  return { data: result, error: null }
}

/* ============================================================
   RPC — массовые операции
   ============================================================ */

export async function countUserMessages(
  userId: string,
): Promise<{ data: UserMessageCounts | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_count_user_messages', {
    target_user_id: userId,
  })
  if (error) return { data: null, error: mapErr(error.message) }
  return { data: normalizeMessageCounts(data), error: null }
}

export async function deleteAllUserMessages(
  userId: string,
): Promise<{ data: UserMessageCounts | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_delete_user_messages', {
    target_user_id: userId,
  })
  if (error) return { data: null, error: mapErr(error.message) }
  return { data: normalizeMessageCounts(data), error: null }
}