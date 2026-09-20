import { supabase } from './supabaseClient'

export const PAGE_SIZE = 15

export type StoryListItem = {
  id: string
  title: string
  published_at: string | null
  views_count: number | null
  tags: string[] | null
}

export type StoryDetail = StoryListItem & {
  content: string | null
  illustrations: string[] | null
}

export type StoriesPageResult = {
  data: StoryListItem[]
  count: number | null
  error: string | null
}

async function fetchPage(
  page: number,
  options: {
    orderColumn: string
    orderAscending: boolean
    dateCutoff?: string
  },
): Promise<StoriesPageResult> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('stories')
    .select('*', { count: 'exact' })
    .order(options.orderColumn, { ascending: options.orderAscending })
    .range(from, to)

  if (options.dateCutoff) {
    query = query.gte('published_at', options.dateCutoff)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: [], count: null, error: error.message }
  }

  return { data: data as StoryListItem[], count, error: null }
}

/** Новые: опубликованные за последние 365 дней, от новых к старым */
export function fetchStoriesNew(page: number): Promise<StoriesPageResult> {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  return fetchPage(page, {
    orderColumn: 'published_at',
    orderAscending: false,
    dateCutoff: cutoff,
  })
}

/** Популярные: все, сортировка по просмотрам (убывание) */
export function fetchStoriesPopular(page: number): Promise<StoriesPageResult> {
  return fetchPage(page, {
    orderColumn: 'views_count',
    orderAscending: false,
  })
}

/** Все: все рассказы, от новых к старым */
export function fetchStoriesAll(page: number): Promise<StoriesPageResult> {
  return fetchPage(page, {
    orderColumn: 'published_at',
    orderAscending: false,
  })
}

/** Поиск: по всей таблице, игнорирует вкладку, сортировка от новых к старым */
export async function searchStories(
  page: number,
  query: string,
): Promise<StoriesPageResult> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Экранирование спецсимволов ILIKE (% и _)
  const escaped = query.replace(/[%_\\]/g, '\\$&')
  const pattern = `%${escaped}%`

  const { data, error, count } = await supabase
    .from('stories')
    .select('*', { count: 'exact' })
    .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    .order('published_at', { ascending: false })
    .range(from, to)

  if (error) {
    return { data: [], count: null, error: error.message }
  }

  return { data: data as StoryListItem[], count, error: null }
}

/** Загрузка одного рассказа для страницы деталей */
export async function fetchStoryById(id: string): Promise<{
  data: StoryDetail | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as StoryDetail, error: null }
}

/** Инкремент просмотров через RPC */
export async function incrementViews(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('increment_story_views', {
    story_id_input: id,
  })
  if (error) return { error: error.message }
  return { error: null }
}