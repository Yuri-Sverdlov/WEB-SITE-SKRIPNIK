import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminComments,
  deleteComment,
  setCommentHidden,
  banUser,
  countUserMessages,
  deleteAllUserMessages,
  fetchReaderEmails,
} from '../../api/adminModeration'
import type { AdminComment } from '../../api/adminModeration'
import { insertAuthorReply } from '../../api/comments'
import { useAuth } from '../../contexts/AuthProvider'
import { PAGE_SIZE } from '../../api/stories'

function fmt(d: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('ru-RU')
  } catch {
    return d
  }
}

export default function AdminComments() {
  const { user } = useAuth()
  const [items, setItems] = useState<AdminComment[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [emailMap, setEmailMap] = useState<Record<string, string>>({})
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  function refetch() {
    setPage(0)
    setError(null)
    setReloadKey((k) => k + 1)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const r = await fetchAdminComments(page)
      if (cancelled) return
      if (r.error) { setError(r.error); setLoading(false); return }
      setItems(r.data)
      setCount(r.count)
      setHasMore(r.count !== null ? (page + 1) * PAGE_SIZE < r.count : r.data.length >= PAGE_SIZE)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [page, reloadKey])

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

  async function handleDelete(item: AdminComment) {
    const ok = window.confirm(`Удалить комментарий «${item.body.substring(0, 80)}…»?`)
    if (!ok) return
    const { error: err } = await deleteComment(item.id)
    if (err) { setError(err); return }
    refetch()
  }

  async function handleToggleHidden(item: AdminComment) {
    if (busy) return
    setBusy(true)
    const { error: err } = await setCommentHidden(item.id, !item.is_hidden)
    setBusy(false)
    if (err) { setError(err); return }
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_hidden: !item.is_hidden } : i)))
  }

  async function handleBan(item: AdminComment) {
    if (!item.user_id) { setError('Невозможно: user_id отсутствует'); return }
    const reason = window.prompt('Причина блокировки (необязательно):') ?? undefined
    const { error: err } = await banUser(item.user_id, reason || undefined)
    if (err) { setError(err); return }
    refetch()
  }

  async function handleDeleteAll(item: AdminComment) {
    if (!item.user_id) { setError('Невозможно: user_id отсутствует'); return }
    const { data: counts, error: cntErr } = await countUserMessages(item.user_id)
    if (cntErr) { setError(cntErr); return }
    const c = counts!
    const msg =
      `Будет удалено ${c.comments_count} комментариев и ${c.guestbook_count} записей гостевой книги.` +
      (c.author_replies_count > 0
        ? `\nОтветы автора (${c.author_replies_count}) тоже будут удалены.`
        : '') +
      '\nПродолжить?'
    if (!window.confirm(msg)) return
    const { error: delErr } = await deleteAllUserMessages(item.user_id)
    if (delErr) { setError(delErr); return }
    refetch()
  }

  function openReply(id: string) { setReplyTo(id); setReplyText('') }
  function closeReply() { setReplyTo(null); setReplyText('') }

  async function handleReplySubmit(item: AdminComment) {
    if (!user || busy) return
    const text = replyText.trim()
    if (text.length < 1) { setError('Введите текст ответа.'); return }
    setBusy(true)
    const res = await insertAuthorReply({
      storyId: item.story_id, userId: user.id, body: text, parentId: item.id,
    })
    setBusy(false)
    if (!res.ok) { setError(res.message); return }
    closeReply()
    refetch()
  }

  // есть ли у корневого комментария ответ автора
  const hasAuthorReply = (id: string) =>
    items.some(i => i.parent_id === id && i.is_author_reply)

  return (
    <div>
      <h1 className="text-2xl font-ui text-ink font-semibold mb-3">Комментарии</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3 text-sm">{error}</div>}

      {loading && <p className="text-muted text-sm">Загрузка…</p>}

      {!loading && items.length === 0 && <p className="text-muted text-sm">Нет комментариев.</p>}

      {!loading && items.map((it) => {
        const isReply = it.is_author_reply || Boolean(it.parent_id)
        const canReply = !isReply && !hasAuthorReply(it.id)
        return (
          <div
            key={it.id}
            className={[
              'border border-border-light rounded p-3 mb-2 text-sm',
              it.is_hidden ? 'opacity-50 bg-white/40' : '',
              isReply ? 'ml-4 sm:ml-6 border-l-2 border-l-accent/50' : '',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-1">
              <span className="text-ink font-medium">{it.author_name}</span>
              {isReply && <span className="text-accent">Ответ автора</span>}
              {it.is_hidden && <span className="text-orange-600 font-medium">скрыт</span>}
              <span>{fmt(it.created_at)}</span>
              <Link to={`/stories/${it.story_id}`} className="text-accent hover:underline">
                → {it.story_title || 'рассказ'}
              </Link>
            </div>
            <p className="text-ink mb-2 whitespace-pre-wrap">{it.body}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void handleToggleHidden(it)} disabled={busy}
                className="text-ink hover:underline text-xs disabled:opacity-40">
                {it.is_hidden ? 'Показать' : 'Скрыть'}
              </button>
              {canReply && replyTo !== it.id && (
                <button onClick={() => openReply(it.id)} className="text-accent hover:underline text-xs">
                  Ответить
                </button>
              )}
              <button onClick={() => void handleDelete(it)} className="text-red-600 hover:underline text-xs">Удалить</button>
              {it.user_id && (
                <>
                  <button onClick={() => void handleBan(it)} className="text-orange-600 hover:underline text-xs">Заблокировать</button>
                  <button onClick={() => void handleDeleteAll(it)} className="text-red-700 hover:underline text-xs">Удалить все</button>
                </>
              )}
            </div>

            {replyTo === it.id && (
              <div className="mt-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Текст ответа…"
                  className="w-full border border-border-light rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={() => void handleReplySubmit(it)} disabled={busy}
                    className="bg-accent text-white rounded px-3 py-1 text-xs font-medium hover:bg-accent/80 disabled:opacity-50">
                    {busy ? '…' : 'Отправить'}
                  </button>
                  <button onClick={closeReply}
                    className="border border-border-light rounded px-2 py-1 text-xs text-muted hover:bg-white/60">
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted/70 mt-1">
              ID: {it.user_id || '—'} {it.user_id && emailMap[it.user_id] ? <span className="text-muted">{emailMap[it.user_id]}</span> : ''}
            </div>
          </div>
        )
      })}

      {!loading && (
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60">Назад</button>
          <span className="text-muted py-1">Страница {page + 1}{count !== null ? ` (${count})` : ''}</span>
          <button disabled={!hasMore} onClick={() => setPage(p => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60">Вперёд</button>
        </div>
      )}
    </div>
  )
}