import { supabase } from './supabaseClient'
import { PAGE_SIZE } from './stories'
import type { StoryDetail } from './stories'

export type CreateStoryPayload = {
  title: string
  content: string | null
  published_at: string | null
  tags: string[] | null
  views_count: number | null
}

export type UpdateStoryPayload = CreateStoryPayload

export type AdminStoriesPageResult = {
  data: StoryDetail[]
  count: number | null
  error: string | null
}

function mapAdminError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('violates row-level security') || m.includes('violates rls')) {
    return 'Недостаточно прав для выполнения операции.'
  }
  if (m.includes('violates foreign key')) {
    return 'Запись связана с другими данными. Сначала удалите их.'
  }
  if (m.includes('violates not-null') || m.includes('null value in column')) {
    return 'Не заполнены обязательные поля.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Ошибка сети. Проверьте подключение.'
  }
  if (m.includes('timeout')) {
    return 'Сервер не отвечает. Попробуйте позже.'
  }

  return `Ошибка: ${message}`
}

/** Поиск админки: по title+content ILIKE, сортировка published_at desc, пагинация */
export async function fetchAdminStories(
  page: number,
  searchQuery?: string,
): Promise<AdminStoriesPageResult> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const safe = (searchQuery ?? '').replace(/[%_\\]/g, '\\$&')
  const pattern = `%${safe}%`

  let query = supabase
    .from('stories')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(from, to)

  if (safe) {
    query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`)
  }

  const { data, error, count } = await query
  if (error) return { data: [], count: null, error: mapAdminError(error.message) }
  return { data: data as StoryDetail[], count, error: null }
}

/** Получить один рассказ для редактирования */
export async function fetchStoryForEdit(id: string): Promise<{
  data: StoryDetail | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { data: null, error: mapAdminError(error.message) }
  return { data: data as StoryDetail, error: null }
}

/** Создать рассказ */
export async function createStory(
  payload: CreateStoryPayload,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      title: payload.title,
      content: payload.content ?? '',
      published_at: payload.published_at ?? null,
      tags: payload.tags ?? [],
      views_count: payload.views_count ?? 0,
      illustrations: [],
    })
    .select('id')
    .single()

  if (error) return { id: null, error: mapAdminError(error.message) }
  return { id: data.id, error: null }
}

/** Обновить рассказ */
export async function updateStory(
  id: string,
  payload: UpdateStoryPayload,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('stories')
    .update({
      title: payload.title,
      content: payload.content ?? '',
      published_at: payload.published_at ?? null,
      tags: payload.tags ?? [],
      views_count: payload.views_count ?? 0,
    })
    .eq('id', id)

  if (error) return { error: mapAdminError(error.message) }
  return { error: null }
}

/** Удалить рассказ */
export async function deleteStory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) return { error: mapAdminError(error.message) }
  return { error: null }
}