import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchStoryForEdit, createStory, updateStory } from '../../api/adminStories'
import {
  uploadStoryIllustration,
  removeStoryIllustration,
  validateImage,
} from '../../api/illustrations'

function toDatetimeLocal(iso: string | null): string {
  if (!iso) {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - offset * 60_000)
    return local.toISOString().substring(0, 16)
  }
  try {
    const d = new Date(iso)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60_000)
    return local.toISOString().substring(0, 16)
  } catch {
    return new Date().toISOString().substring(0, 16)
  }
}

function tagsToString(tags: string[] | null): string {
  return (tags ?? []).join(', ')
}

function stringToTags(input: string): string[] {
  return input.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
}

export default function AdminStoryForm() {
  const navigate = useNavigate()
  const params = useParams()
  const editId = params.id
  const isEdit = Boolean(editId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [viewsCount, setViewsCount] = useState(0)
  const [illustrations, setIllustrations] = useState<string[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Edit mode: загружаем данные
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false

    async function load() {
      const { data, error: err } = await fetchStoryForEdit(editId!)
      if (cancelled) return
      if (err) {
        setError(err)
        setLoading(false)
        return
      }
      if (!data) {
        setError('Рассказ не найден.')
        setLoading(false)
        return
      }

      setTitle(data.title)
      setContent(data.content ?? '')
      setPublishedAt(toDatetimeLocal(data.published_at))
      setTagsInput(tagsToString(data.tags))
      setViewsCount(data.views_count ?? 0)
      setIllustrations(data.illustrations ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [editId, isEdit])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    setError(null)

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Заголовок обязателен.')
      return
    }

    const tags = stringToTags(tagsInput)

    let publishedIso: string | null = null
    if (publishedAt) {
      try {
        const d = new Date(publishedAt)
        publishedIso = d.toISOString()
      } catch {
        publishedIso = publishedAt
      }
    }

    setSubmitting(true)

    if (isEdit) {
      const { error: err } = await updateStory(editId!, {
        title: cleanTitle,
        content: content || null,
        published_at: publishedIso,
        tags,
        views_count: viewsCount,
      })
      setSubmitting(false)
      if (err) { setError(err); return }
      navigate(`/stories/${editId}`)
    } else {
      const { id: newId, error: err } = await createStory({
        title: cleanTitle,
        content: content || null,
        published_at: publishedIso,
        tags,
        views_count: viewsCount,
      })
      setSubmitting(false)
      if (err) { setError(err); return }
      navigate(`/stories/${newId}`)
    }
  }

  /** Обработчик выбора файлов */
  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return

    setError(null)

    const file = files[0]
    const validationErr = validateImage(file)
    if (validationErr) {
      setError(validationErr)
      return
    }

    if (!isEdit) {
      setError('Сначала сохраните рассказ, затем добавьте иллюстрации.')
      return
    }

    setUploading(true)
    const { url, error: uploadErr } = await uploadStoryIllustration(editId!, file)
    setUploading(false)

    if (uploadErr) {
      setError(uploadErr)
      return
    }

    if (url) {
      setIllustrations((prev) => [...prev, url])
    }
  }

  /** Удалить иллюстрацию */
  async function handleRemoveIllustration(url: string) {
    if (uploading || submitting) return

    if (!isEdit) return

    setError(null)
    setUploading(true)
    const { error: err } = await removeStoryIllustration(editId!, url)
    setUploading(false)

    if (err) {
      setError(err)
      return
    }

    setIllustrations((prev) => prev.filter((u) => u !== url))
  }

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        {isEdit ? 'Редактировать рассказ' : 'Новый рассказ'}
      </h1>

      {loading && <p className="text-gray-500 text-sm">Загрузка…</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3 text-sm">
          {error}
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="af-title" className={labelClass}>
              Заголовок
            </label>
            <input
              id="af-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="af-content" className={labelClass}>
              Текст
            </label>
            <textarea
              id="af-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className={inputClass + ' font-mono'}
            />
            <p className="text-xs text-gray-400 mt-1">
              Абзацы — через пустую строку (сохраняется как plain text).
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="w-56">
              <label htmlFor="af-date" className={labelClass}>
                Дата публикации
              </label>
              <input
                id="af-date"
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="w-32">
              <label htmlFor="af-views" className={labelClass}>
                Просмотры
              </label>
              <input
                id="af-views"
                type="number"
                min={0}
                value={viewsCount}
                onChange={(e) => setViewsCount(Math.max(0, Number(e.target.value ?? 0)))}
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">Начальное значение</p>
            </div>
          </div>

          <div>
            <label htmlFor="af-tags" className={labelClass}>
              Теги
            </label>
            <input
              id="af-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="тег1, тег2, …"
              className={inputClass}
            />
          </div>

          {/* ---------- Иллюстрации ---------- */}
          <div>
            <label className={labelClass}>Иллюстрации</label>

            {illustrations.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {illustrations.map((url) => (
                  <div key={url} className="relative inline-block">
                    <img
                      src={url}
                      alt=""
                      className="w-24 h-24 object-cover rounded border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => void handleRemoveIllustration(url)}
                      disabled={uploading}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ lineHeight: 1 }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleFilesSelected(e.target.files)}
                disabled={uploading || !isEdit}
                className="text-sm text-gray-600"
              />
              {uploading && <span className="text-gray-500 text-xs">Загрузка…</span>}
              {!isEdit && (
                <span className="text-gray-400 text-xs">
                  Сначала сохраните рассказ
                </span>
              )}
              <span className="text-gray-400 text-xs" style={{ paddingLeft: 8 }}>
                &le; 5 МБ
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white rounded px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/stories')}
              className="border border-gray-300 rounded px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}