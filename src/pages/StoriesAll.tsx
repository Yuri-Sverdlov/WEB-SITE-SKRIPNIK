import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

const PAGE_SIZE = 15

interface Story {
  id: string
  title: string
  published_at: string | null
  views_count: number | null
  tags: string[] | null
}

export default function StoriesAll() {
  const [stories, setStories] = useState<Story[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error: err, count } = await supabase
        .from('stories')
        .select('*', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(from, to)

      if (cancelled) return

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      setStories(data as Story[])
      setHasMore(count !== null ? from + PAGE_SIZE < count : data!.length >= PAGE_SIZE)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [page])

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('ru-RU')
    } catch {
      return d
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Все рассказы</h1>

      {loading && <p className="text-gray-500">Загрузка...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {!loading && !error && stories.length === 0 && (
        <p className="text-gray-500">Нет рассказов.</p>
      )}

      {!loading && stories.length > 0 && (
        <div className="space-y-4">
          {stories.map((story) => (
            <div
              key={story.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <Link
                to={`/stories/${story.id}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                {story.title}
              </Link>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                <span>{formatDate(story.published_at)}</span>
                <span>{story.views_count ?? 0} просмотров</span>
                {story.tags && story.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1 ml-1">
                    {story.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
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