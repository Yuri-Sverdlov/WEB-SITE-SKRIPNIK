import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLatestStories } from '../api/stories'
import type { StoryListItem } from '../api/stories'
import {
  ABOUT_TITLE,
  AUTHOR_NAME,
  AUTHOR_PHOTO_ALT,
  AUTHOR_PHOTO_CAPTION,
  BIOGRAPHY,
} from '../config/site'

const LATEST_LIMIT = 5

function formatDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('ru-RU') } catch { return d }
}

export default function Home() {
  const [stories, setStories] = useState<StoryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      const { data, error: err } = await fetchLatestStories(LATEST_LIMIT)
      if (cancelled) return
      setStories(data); setError(err); setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl md:text-3xl font-ui text-ink font-semibold mb-8">{ABOUT_TITLE}</h1>

      {/* Фото автора — заглушка 1:1; заменить блок при появлении фото */}
      <div className="mb-8">
        <div
          className="aspect-square w-full max-w-xs rounded-lg border border-border-light bg-white
                     flex items-center justify-center text-muted text-sm text-center px-6"
          role="img"
          aria-label={AUTHOR_PHOTO_ALT}
        >
          {AUTHOR_PHOTO_CAPTION}
        </div>
      </div>

      <p className="text-2xl font-ui text-ink font-semibold mb-6">{AUTHOR_NAME}</p>

      <div className="prose font-story">
        <p>{BIOGRAPHY}</p>
      </div>

      <section className="mt-14 pt-8 border-t border-border-light">
        <h2 className="text-xl font-ui text-ink font-semibold mb-5">Последние рассказы</h2>

        {loading && <p className="text-muted text-sm">Загрузка...</p>}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>
        )}

        {!loading && !error && stories.length === 0 && (
          <p className="text-muted text-sm">Пока нет опубликованных рассказов.</p>
        )}

        {!loading && !error && stories.length > 0 && (
          <ul className="space-y-3">
            {stories.map(s => (
              <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link to={`/stories/${s.id}`} className="text-ink font-story text-lg hover:text-accent hover:underline">
                  {s.title}
                </Link>
                <span className="text-muted text-sm font-ui">{formatDate(s.published_at)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6">
          <Link to="/stories/all" className="text-accent hover:underline text-sm font-ui">
            Все рассказы &rarr;
          </Link>
        </p>
      </section>
    </div>
  )
}