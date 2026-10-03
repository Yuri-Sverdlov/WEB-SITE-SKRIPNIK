import { useState } from 'react'
import type { FormEvent } from 'react'

type Props = {
  /** Вернуть true, если сообщение отправлено (тогда форма очищается) */
  onSubmit: (values: { authorName: string; body: string }) => Promise<boolean>
  submitting: boolean
  error: string | null
  /** Предзаполненное имя (например, из сессии) */
  initialAuthorName?: string
  submitLabel?: string
  authorNameMin?: number
  authorNameMax?: number
  bodyMin?: number
  bodyMax?: number
}

const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

/**
 * Форма нового сообщения читателя: имя (2-40) + текст (1-2000).
 * Переиспользуется: комментарии (TASK-008) и гостевая книга (TASK-009).
 */
export default function ReaderMessageForm({
  onSubmit,
  submitting,
  error,
  initialAuthorName = '',
  submitLabel = 'Отправить',
  authorNameMin = 2,
  authorNameMax = 40,
  bodyMin = 1,
  bodyMax = 2000,
}: Props) {
  const [authorName, setAuthorName] = useState(initialAuthorName)
  const [body, setBody] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    const name = authorName.trim()
    const text = body.trim()

    if (name.length < authorNameMin || name.length > authorNameMax) {
      setLocalError(`Имя должно быть от ${authorNameMin} до ${authorNameMax} символов`)
      return
    }
    if (text.length < bodyMin || text.length > bodyMax) {
      setLocalError(`Текст должен быть от ${bodyMin} до ${bodyMax} символов`)
      return
    }

    setLocalError(null)
    const sent = await onSubmit({ authorName: name, body: text })

    if (sent) {
      setBody('')
    }
  }

  const message = localError || error

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {message}
        </div>
      )}

      <div>
        <label htmlFor="reader-name" className={labelClass}>
          Имя
        </label>
        <input
          id="reader-name"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={authorNameMax}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="reader-body" className={labelClass}>
          Сообщение
        </label>
        <textarea
          id="reader-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className={`${inputClass} resize-y`}
        />
        <p className="text-xs text-gray-400 mt-1">
          {body.trim().length} / {bodyMax}
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Отправка...' : submitLabel}
      </button>
    </form>
  )
}
