import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchAdminStories, deleteStory } from '../../api/adminStories'
import type { StoryDetail } from '../../api/stories'
import { PAGE_SIZE } from '../../api/stories'

function formatDate(d: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('ru-RU')
  } catch {
    return d
  }
}

export default function AdminStoriesList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = (searchParams.get('q') || '').trim()
  const [stories, setStories] = useState<StoryDetail[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = await fetchAdminStories(page, q)

      if (cancelled) return
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      setStories(result.data)
      setTotal(result.count)
      setHasMore(
        result.count !== null
          ? page * PAGE_SIZE + PAGE_SIZE < result.count
          : result.data.length >= PAGE_SIZE,
      )
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [page, q])

  function handleSearch(value: string) {
    setPage(0)
    if (value) setSearchParams({ q: value })
    else setSearchParams({})
  }

  async function handleDelete(story: StoryDetail) {
    if (deleting) return
    const ok = window.confirm(`Удалить рассказ «${story.title}»?\nЭто действие нельзя отменить.`)
    if (!ok) return

    setDeleting(true)
    const { error: err } = await deleteStory(story.id)
    setDeleting(false)

    if (err) {
      setError(err)
      return
    }

    window.location.reload()
  }

  return (
    <div>
      <h1 className="text-2xl font-ui text-ink font-semibold mb-3">Рассказы</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Поиск по заголовку и тексту…"
          className="border border-border-light rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Link
          to="/admin/stories/new"
          className="bg-accent text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          + Создать рассказ
        </Link>
      </div>

      {loading && <p className="text-muted text-sm">Загрузка…</p>}

      {!loading && !error && stories.length === 0 && (
        <p className="text-muted text-sm">
          {q ? 'Ничего не найдено.' : 'Нет рассказов.'}
        </p>
      )}

      {!loading && stories.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-light text-left text-muted">
                <th className="py-2 px-2">Заголовок</th>
                <th className="py-2 px-2 w-28">Дата</th>
                <th className="py-2 px-2 w-20 text-right">Просм.</th>
                <th className="py-2 px-2 w-44">Действия</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr key={story.id} className="border-b border-border-light hover:bg-white/60">
                  <td className="py-2 px-2 text-ink max-w-xs truncate">
                    {story.title}
                  </td>
                  <td className="py-2 px-2 text-muted text-xs">
                    {formatDate(story.published_at)}
                  </td>
                  <td className="py-2 px-2 text-muted text-right">
                    {story.views_count ?? 0}
                  </td>
                  <td className="py-2 px-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/stories/${story.id}/edit`)}
                      className="text-accent hover:underline text-xs"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(story)}
                      disabled={deleting}
                      className="text-red-600 hover:underline text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deleting ? '…' : 'Удалить'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className="flex justify-center gap-4 mt-6 text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-border-light px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 transition-colors"
          >
            Назад
          </button>

          <span className="text-muted py-1">
            Страница {page + 1}{total !== null ? ` (${total} всего)` : ''}
          </span>

          <button
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-border-light px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 transition-colors"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  )
}