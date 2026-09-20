import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StoriesTabNav from './StoriesTabNav'
import StoryCard from './StoryCard'
import { PAGE_SIZE, searchStories } from '../api/stories'
import type { StoriesPageResult } from '../api/stories'

type Props = {
  fetchPage: (page: number) => Promise<StoriesPageResult>
}

export default function StoryListPage({ fetchPage }: Props) {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const isSearch = query.length > 0

  const [stories, setStories] = useState<StoriesPageResult['data']>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    // Сброс страницы при смене поискового запроса
    if (!isSearch && page > 0) {
      // при выходе из поиска — сброс на первую страницу
    }
  }, [isSearch])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = isSearch
        ? await searchStories(page, query)
        : await fetchPage(page)

      if (cancelled) return

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      setStories(result.data)
      setHasMore(
        result.count !== null
          ? page * PAGE_SIZE + PAGE_SIZE < result.count
          : result.data.length >= PAGE_SIZE,
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // query и isSearch в зависимостях — при изменении поиска перезагружаем
  }, [page, fetchPage, query, isSearch])

  return (
    <div className="max-w-4xl mx-auto">
      <StoriesTabNav />

      {loading && <p className="text-gray-500">Загрузка...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {!loading && !error && stories.length === 0 && (
        <p className="text-gray-500">
          {isSearch ? 'Ничего не найдено.' : 'Нет рассказов.'}
        </p>
      )}

      {!loading && stories.length > 0 && (
        <div className="space-y-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded border border-gray-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Назад
          </button>
          <span className="px-2 py-2 text-sm text-gray-500">
            Страница {page + 1}
          </span>
          <button
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded border border-gray-300 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  )
}