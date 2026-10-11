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
import { AUTHOR_NAME } from '../config/site'
import { usePageTitle } from '../hooks/usePageTitle'

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

  usePageTitle(story ? `${story.title} — ${AUTHOR_NAME}` : null)

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

  /** Разбить текст на абзацы по пустым строкам (формат БД не меняем) */
  function renderParagraphs(text: string) {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)
  }

  return (
    <div className="bg-paper min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        {loading && <p className="text-muted">Загрузка...</p>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">{error}</div>}
        {!loading && notFound && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded p-3 mb-4">Рассказ не найден.</div>}

        {!loading && story && (
          <article>
            <Link to="/stories/all" className="text-sm text-accent hover:underline mb-6 inline-block">&larr; к списку</Link>

            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-ui text-ink font-bold mb-4 leading-tight">
                {story.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted font-ui">
                <span>{formatDate(story.published_at)}</span>
                <span>{displayedViews ?? story.views_count ?? 0} просмотров</span>
                {story.tags && story.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {story.tags.map(tag => (
                      <span key={tag} className="bg-border-light/60 text-muted rounded-full px-2.5 py-0.5 text-xs">{tag}</span>
                    ))}
                  </span>
                )}
              </div>
            </header>

            {story.illustrations && story.illustrations.length > 0 && (
              <div className="mb-8 space-y-4">
                {story.illustrations.map((url, i) => (
                  <img key={i} src={url} alt={`Илл. ${i + 1}`}
                    className="rounded-lg max-w-full h-auto mx-auto" />
                ))}
              </div>
            )}

            {story.content && (
              <div className="prose">
                {renderParagraphs(story.content)}
              </div>
            )}
          </article>
        )}

        {!loading && story && (
          <section className="mt-16 pt-8 border-t border-border-light">
            <h2 className="text-xl font-ui text-ink font-semibold mb-6">Комментарии</h2>

            {(() => {
              const { roots, replies } = buildCommentTree()
              return commentsLoading ? <p className="text-muted text-sm">Загрузка сообщений...</p>
                : commentsError ? <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{commentsError}</div>
                : roots.length === 0 ? <p className="text-muted text-sm">Комментариев пока нет — оставьте первый.</p>
                : <div className="space-y-4">
                    {roots.map(root => {
                      const children = replies.get(root.id) ?? []
                      return (
                        <div key={root.id} className="border border-border-light rounded-lg p-4 bg-white">
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-1 font-ui">
                            <span className="text-ink font-medium">{root.author_name}</span>
                            <span>{formatDateTime(root.created_at)}</span>
                          </div>
                          <p className="text-ink leading-relaxed whitespace-pre-wrap break-words">{root.body}</p>

                          {children.map(ch => (
                            <div key={ch.id} className="ml-4 sm:ml-6 pl-4 border-l-2 border-accent/50 mt-3 py-2 bg-paper/60 rounded">
                              <div className="flex flex-wrap items-center gap-2 text-xs mb-1 font-ui">
                                <span className={ch.is_author_reply ? 'text-accent font-semibold' : 'text-muted'}>
                                  {ch.is_author_reply ? 'Ответ автора' : ch.author_name}
                                </span>
                                <span className="text-muted">{formatDateTime(ch.created_at)}</span>
                              </div>
                              <p className="text-ink leading-relaxed whitespace-pre-wrap break-words text-sm">{ch.body}</p>
                            </div>
                          ))}

                          {isAdmin && children.length === 0 && (
                            replyForm === root.id ? (
                              <form onSubmit={e => void handleReplySubmit(e)} className="mt-3" noValidate>
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
                              <button onClick={() => openReply(root.id)} className="text-xs text-accent hover:underline mt-2 font-ui">Ответить</button>
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
            })()}

            <div className="mt-8">
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