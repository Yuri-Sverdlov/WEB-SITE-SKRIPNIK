import { useEffect, useState } from 'react'
import {
  fetchAdminGuestbook,
  deleteGuestbookEntry,
  banUser,
  countUserMessages,
  deleteAllUserMessages,
  fetchReaderEmails,
} from '../../api/adminModeration'
import type { AdminGuestbookEntry } from '../../api/adminModeration'
import { PAGE_SIZE } from '../../api/stories'

function fmt(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU') } catch { return d }
}

export default function AdminGuestbook() {
  const [items, setItems] = useState<AdminGuestbookEntry[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [emailMap, setEmailMap] = useState<Record<string, string>>({})

  function refetch() {
    setPage(0)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      const r = await fetchAdminGuestbook(page)
      if (cancelled) return
      if (r.error) { setError(r.error); setLoading(false); return }
      setItems(r.data); setCount(r.count)
      setHasMore(r.count !== null ? (page + 1) * PAGE_SIZE < r.count : r.data.length >= PAGE_SIZE)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [page])

  // Email читателей
  useEffect(() => {
    const ids = items.map(i => i.user_id).filter(Boolean) as string[]
    if (ids.length === 0) return
    fetchReaderEmails(ids).then(({ data, error }) => {
      if (error) return
      const map: Record<string, string> = {}
      for (const r of data) map[r.user_id] = r.email
      setEmailMap(map)
    })
  }, [items])

  async function handleDelete(item: AdminGuestbookEntry) {
    const ok = window.confirm(`Удалить запись «${item.body.substring(0, 80)}…»?`)
    if (!ok) return
    const { error: err } = await deleteGuestbookEntry(item.id)
    if (err) { setError(err); return }
    refetch()
  }

  async function handleBan(item: AdminGuestbookEntry) {
    if (!item.user_id) { setError('Невозможно: user_id отсутствует'); return }
    const reason = window.prompt('Причина блокировки (необязательно):') ?? undefined
    const { error: err } = await banUser(item.user_id, reason || undefined)
    if (err) { setError(err); return }
    refetch()
  }

  async function handleDeleteAll(item: AdminGuestbookEntry) {
    if (!item.user_id) { setError('Невозможно: user_id отсутствует'); return }
    const { data: counts, error: cntErr } = await countUserMessages(item.user_id)
    if (cntErr) { setError(cntErr); return }
    const c = counts!
    const msg =
      `Будет удалено ${c.comments_count} комментариев и ${c.guestbook_count} записей гостевой книги.` +
      (c.author_replies_count > 0 ? `\nОтветы автора (${c.author_replies_count}) тоже будут удалены.` : '') +
      '\nПродолжить?'
    if (!window.confirm(msg)) return
    const { error: delErr } = await deleteAllUserMessages(item.user_id)
    if (delErr) { setError(delErr); return }
    refetch()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">Гостевая книга</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3 text-sm">{error}</div>}
      {loading && <p className="text-gray-500 text-sm">Загрузка…</p>}
      {!loading && items.length === 0 && <p className="text-gray-500 text-sm">Записей нет.</p>}

      {!loading && items.map((it) => (
        <div key={it.id} className="border border-gray-200 rounded p-3 mb-2 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
            <span>{it.author_name}</span>
            <span>{fmt(it.created_at)}</span>
          </div>
          <p className="text-gray-800 mb-2 whitespace-pre-wrap">{it.body}</p>
          <div className="flex gap-2">
            <button onClick={() => void handleDelete(it)} className="text-red-600 hover:underline text-xs">Удалить</button>
            {it.user_id && <>
              <button onClick={() => void handleBan(it)} className="text-orange-600 hover:underline text-xs">Заблокировать</button>
              <button onClick={() => void handleDeleteAll(it)} className="text-red-700 hover:underline text-xs">Удалить все</button>
            </>}
          </div>
          <div className="text-[10px] text-gray-300 mt-1">ID: {it.user_id || '—'} {it.user_id && emailMap[it.user_id] ? <span className="text-gray-500">{emailMap[it.user_id]}</span> : ''}</div>
        </div>
      ))}

      {!loading && (
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">Назад</button>
          <span className="text-gray-500 py-1">Страница {page + 1}{count !== null ? ` (${count})` : ''}</span>
          <button disabled={!hasMore} onClick={() => setPage(p => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">Вперёд</button>
        </div>
      )}
    </div>
  )
}