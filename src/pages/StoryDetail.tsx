import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import ReaderMessageForm from '../components/ReaderMessageForm'
import { useAuth } from '../contexts/AuthProvider'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { fetchComments, insertComment, insertAuthorReply } from '../api/comments'
import type { CommentItem } from '../api/comments'
import { fetchStoryById, incrementViews } from '../api/stories'
import type { StoryDetail as StoryDetailType } from '../api/stories'
import { fetchMyProfile, createProfile } from '../api/readerProfile'
import type { ReaderProfile } from '../api/readerProfile'

import { usePageTitle } from '../hooks/usePageTitle'
import { AUTHOR_NAME } from '../config/site'

function formatDateTime(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return value }
}

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()

  const [story, setStory] = useState<StoryDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [displayedViews, setDisplayedViews] = useState<number | null>(null)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [replyForm, setReplyForm] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replying, setReplying] = useState(false)
  const [readerProfile, setReaderProfile] = useState<ReaderProfile | null | undefined>(undefined)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    const storyId = id
    if (!storyId) { setError('ID рассказа не указан'); setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true); setError(null); setNotFound(false)
      const { data, error: err } = await fetchStoryById(storyId!)
      if (cancelled) return
      if (err) { setError(err); setLoading(false); return }
      if (!data) { setNotFound(true); setLoading(false); return }
      setStory(data)
            // Заголовок вкладки
            usePageTitle(`${data.title} — ${AUTHOR_NAME}`)
            const { error: rpcErr } = await incrementViews(storyId!)
      if (cancelled) return
      if (rpcErr) { console.warn('RPC increment failed:', rpcErr); setDisplayedViews(data.views_count ?? 0) }
      else { setDisplayedViews((data.views_count ?? 0) + 1) }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    let cancelled = false
    async function loadComments() {
      if (!id) { setCommentsLoading(false); return }
      setCommentsLoading(true); setCommentsError(null)
      const result = await fetchComments(id)
      if (cancelled) return
      setComments(result.data); setCommentsError(result.error); setCommentsLoading(false)
    }
    loadComments()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!user) { setReaderProfile(null); setProfileLoading(false); return }
    let cancelled = false
    async function load() {
      setProfileLoading(true)
      const { profile } = await fetchMyProfile()
      if (cancelled) return
      setReaderProfile(profile); setProfileLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function handleSubmitComment(values: { authorName: string; body: string }): Promise<boolean> {
    if (!id || !user) { setFormError('Нужно войти в аккаунт'); return false }
    setFormSubmitting(true); setFormError(null)
    const result = await insertComment({ storyId: id, userId: user.id, ...values })
    setFormSubmitting(false)
    if (!result.ok) { setFormError(result.message); return false }
    const refreshed = await fetchComments(id)
    setComments(refreshed.data); setCommentsError(refreshed.error)
    return true
  }

  async function handleCreateProfile(name: string): Promise<{ ok: boolean; message: string | null }> {
    const result = await createProfile(name)
    if (result.ok) {
      const { profile } = await fetchMyProfile()
      setReaderProfile(profile)
    }
    return result
  }

  function openReply(commentId: string) { setReplyForm(commentId); setReplyText(''); setReplyError(null) }
  function closeReply() { setReplyForm(null); setReplyText(''); setReplyError(null) }

  async function handleReplySubmit(e: FormEvent) {
    e.preventDefault()
    if (!id || !user || !replyForm) return
    setReplying(true); setReplyError(null)
    const result = await insertAuthorReply({ storyId: id, userId: user.id, body: replyText, parentId: replyForm })
    setReplying(false)
    if (!result.ok) { setReplyError(result.message); return }
    closeReply()
    const refreshed = await fetchComments(id)
    setComments(refreshed.data); setCommentsError(refreshed.error)
  }

  function buildCommentTree() {
    const roots: CommentItem[] = []
    const replies = new Map<string, CommentItem[]>()
    for (const c of comments) {
      if (c.parent_id) {
        const arr = replies.get(c.parent_id) ?? []; arr.push(c); replies.set(c.parent_id, arr)
      } else { roots.push(c) }
    }
    return { roots, replies }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('ru-RU') } catch { return d }
  }

  return (
    <div className="bg-paper min-h-screen">
          <div className="max-w-4xl mx-auto">
            {loading && <p className="text-muted">Загрузка...</p>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">{error}</div>}
        {!loading && notFound && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded p-3 mb-4">Рассказ не найден.</div>}

        {!loading && story && (
          <article className="font-story text-ink leading-relaxed">
            <Link to="/stories/all" className="text-sm text-accent hover:underline mb-4 inline-block">&larr; к списку</Link>
            <h1 className="text-3xl font-ui text-ink font-bold mb-3">{story.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted">
              <span>{formatDate(story.published_at)}</span>
              <span>{displayedViews ?? story.views_count ?? 0} просмотров</span>
              {story.tags && story.tags.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {story.tags.map(tag => <span key={tag} className="bg-gray-100 text-muted rounded-full px-2.5 py-0.5 text-xs">{tag}</span>)}
                </span>
              )}
            </div>
            {story.illustrations && story.illustrations.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                {story.illustrations.map((url, i) => <img key={i} src={url} alt={`Илл. ${i + 1}`} className="rounded-lg max-w-full h-auto max-h-96 object-contain" />)}
              </div>
            )}
            {story.content && <div className="font-story text-ink leading-relaxed whitespace-pre-wrap text-lg">{story.content}</div>}
          </article>
        )}

        {!loading && story && (
          <section className="mt-10 border-t border-border-light pt-6">
            <h2 className="text-xl font-ui text-ink font-semibold mb-4">Комментарии</h2>

            {(() => {
              const { roots, replies } = buildCommentTree()
              return commentsLoading ? <p className="text-muted text-sm">Загрузка сообщений...</p>
                : commentsError ? <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{commentsError}</div>
                : roots.length === 0 ? <p className="text-muted text-sm">Комментариев пока нет — оставьте первый.</p>
                : <div className="space-y-3">
                    {roots.map(root => {
                      const children = replies.get(root.id) ?? []
                      return (
                        <div key={root.id} className="border border-border-light rounded-lg p-3 bg-white">
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-1">
                            <span className="font-ui text-ink font-medium">{root.author_name}</span>
                            <span>{formatDateTime(root.created_at)}</span>
                          </div>
                          <p className="font-story text-ink leading-relaxed whitespace-pre-wrap break-words mb-2">{root.body}</p>

                          {children.map(ch => (
                            <div key={ch.id} className="ml-4 pl-3 border-l-2 border-accent mt-2 py-1 bg-blue-50 rounded">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-1">
                                <span className="font-ui text-accent font-medium">
                                  {ch.is_author_reply ? 'Ответ автора' : ch.author_name}
                                </span>
                                <span>{formatDateTime(ch.created_at)}</span>
                              </div>
                              <p className="font-story text-ink leading-relaxed whitespace-pre-wrap break-words text-sm">{ch.body}</p>
                            </div>
                          ))}

                          {isAdmin && children.length === 0 && (
                            replyForm === root.id ? (
                              <form onSubmit={e => void handleReplySubmit(e)} className="mt-2" noValidate>
                                {replyError && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-2 py-1 text-xs mb-1">{replyError}</div>}
                                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3}
                                  placeholder="Текст ответа..."
                                  className="w-full border border-border-light rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                <div className="flex gap-1 mt-1">
                                  <button type="submit" disabled={replying}
                                    className="bg-accent text-white rounded px-3 py-1.5 text-xs font-ui font-medium hover:bg-accent/80 disabled:opacity-50">
                                    {replying ? '…' : 'Отправить'}
                                  </button>
                                  <button type="button" onClick={closeReply}
                                    className="border border-border-light rounded px-2 py-1.5 text-xs text-muted hover:bg-gray-50">Отмена</button>
                                </div>
                              </form>
                            ) : (
                              <button onClick={() => openReply(root.id)} className="text-xs text-accent hover:underline mt-1">Ответить</button>
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
            })()}

            <div className="mt-6">
              {!user ? (
                <p className="text-sm text-muted">
                  <Link to="/login" state={{ from: location.pathname }} className="text-accent hover:underline">Войдите</Link>
                  , чтобы оставить комментарий.
                </p>
              ) : isAdmin ? (
                <ReaderMessageForm
                  onSubmit={handleSubmitComment} submitting={formSubmitting} error={formError}
                  submitLabel="Отправить комментарий" isAdmin={true}
                />
              ) : profileLoading ? null : (
                <ReaderMessageForm
                  onSubmit={handleSubmitComment} submitting={formSubmitting} error={formError}
                  submitLabel="Отправить комментарий"
                  profile={readerProfile} onCreateProfile={handleCreateProfile}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}