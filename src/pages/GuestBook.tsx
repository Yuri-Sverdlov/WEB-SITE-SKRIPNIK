import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ReaderMessageList from '../components/ReaderMessageList'
import type { ReaderMessage } from '../components/ReaderMessageList'
import ReaderMessageForm from '../components/ReaderMessageForm'
import { useAuth } from '../contexts/AuthProvider'
import { fetchGuestbookEntries, insertGuestbookEntry } from '../api/guestbook'
import type { GuestbookEntry } from '../api/guestbook'

export default function GuestBook() {
  const location = useLocation()
  const { user } = useAuth()

  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const result = await fetchGuestbookEntries()

      if (cancelled) return

      setEntries(result.data)
      setError(result.error)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmitEntry(values: {
    authorName: string
    body: string
  }): Promise<boolean> {
    if (!user) {
      setFormError('Нужно войти в аккаунт, чтобы оставить запись')
      return false
    }

    setFormSubmitting(true)
    setFormError(null)

    const result = await insertGuestbookEntry({
      userId: user.id,
      authorName: values.authorName,
      body: values.body,
    })

    setFormSubmitting(false)

    if (!result.ok) {
      setFormError(result.message)
      return false
    }

    const refreshed = await fetchGuestbookEntries()
    setEntries(refreshed.data)
    setError(refreshed.error)
    return true
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Гостевая книга</h1>

      <ReaderMessageList
        items={entries.map(
          (entry): ReaderMessage => ({
            id: entry.id,
            authorName: entry.author_name,
            body: entry.body,
            createdAt: entry.created_at,
          }),
        )}
        loading={loading}
        error={error}
        emptyText="Записей пока нет — оставьте первую."
      />

      <div className="mt-6">
        {user ? (
          <ReaderMessageForm
            onSubmit={handleSubmitEntry}
            submitting={formSubmitting}
            error={formError}
            submitLabel="Отправить запись"
          />
        ) : (
          <p className="text-sm text-gray-600">
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="text-blue-600 hover:underline"
            >
              Войдите
            </Link>
            , чтобы оставить запись в гостевой книге.
          </p>
        )}
      </div>
    </div>
  )
}
