import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StoriesTabNav from '../components/StoriesTabNav'
import { fetchStoryById, incrementViews } from '../api/stories'
import type { StoryDetail as StoryDetailType } from '../api/stories'

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const [story, setStory] = useState<StoryDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [displayedViews, setDisplayedViews] = useState<number | null>(null)

  useEffect(() => {
    const storyId = id
    if (!storyId) {
      setError('ID рассказа не указан')
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setNotFound(false)

      const { data, error: err } = await fetchStoryById(storyId!)

      if (cancelled) return

      if (err) {
        setError(err)
        setLoading(false)
        return
      }

      if (!data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setStory(data)

      // RPC increment — fire-and-forget, не блокирует UI
      const { error: rpcErr } = await incrementViews(storyId!)

      if (cancelled) return

      if (rpcErr) {
        console.warn('RPC increment_story_views failed:', rpcErr)
        // не фатально — показываем исходный счётчик
        setDisplayedViews(data.views_count ?? 0)
      } else {
        setDisplayedViews((data.views_count ?? 0) + 1)
      }

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

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
      <StoriesTabNav />

      {loading && <p className="text-gray-500">Загрузка...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded p-3 mb-4">
          Рассказ не найден.
        </div>
      )}

      {!loading && story && (
        <article>
          <Link
            to="/stories/all"
            className="text-sm text-blue-600 hover:underline mb-4 inline-block"
          >
            &larr; к списку
          </Link>

          <h1 className="text-3xl font-bold mb-3">{story.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-500">
            <span>{formatDate(story.published_at)}</span>
            <span>{displayedViews ?? story.views_count ?? 0} просмотров</span>
            {story.tags && story.tags.length > 0 && (
              <span className="flex flex-wrap gap-1">
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

          {story.illustrations && story.illustrations.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {story.illustrations.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Иллюстрация ${i + 1}`}
                  className="rounded-lg max-w-full h-auto max-h-96 object-contain"
                />
              ))}
            </div>
          )}

          {story.content && (
            <div className="prose text-gray-800 leading-relaxed whitespace-pre-wrap">
              {story.content}
            </div>
          )}
        </article>
      )}
    </div>
  )
}