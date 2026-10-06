import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ReaderProfile } from '../api/readerProfile'

type Props = {
  /** Вернуть true, если сообщение отправлено */
  onSubmit: (values: { authorName: string; body: string }) => Promise<boolean>
  submitting: boolean
  error: string | null
  /** Предзаполненное имя (только для читателя без профиля) */
  initialAuthorName?: string
  submitLabel?: string
  bodyMin?: number
  bodyMax?: number
  /** Профиль читателя (null = нет / автор) */
  profile?: ReaderProfile | null
  /** Создать профиль */
  onCreateProfile?: (name: string) => Promise<{ ok: boolean; message: string | null }>
  /** Является ли пользователь автором сайта (пропускает профиль) */
  isAdmin?: boolean
}

const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

/**
 * Форма отправки сообщения.
 * Три режима:
 *   1. Автор (isAdmin) — поле имени + текст (как было).
 *   2. Читатель с профилем — только текст; имя из профиля.
 *   3. Читатель без профиля — экран выбора имени + пояснение.
 */
export default function ReaderMessageForm({
  onSubmit,
  submitting,
  error,
  initialAuthorName = '',
  submitLabel = 'Отправить',
  bodyMin = 1,
  bodyMax = 2000,
  profile,
  onCreateProfile,
  isAdmin = false,
}: Props) {
  const [authorName, setAuthorName] = useState(initialAuthorName)
  const [body, setBody] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  // Режим создания профиля
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const displayError = localError || error

  if (!isAdmin && profile === undefined) {
    // ещё грузится — ничего не показываем
    return null
  }

  // ====== Режим: читатель без профиля ======
  if (!isAdmin && profile === null && onCreateProfile) {
    if (creating) {
      return <p className="text-gray-500 text-sm">Создание профиля…</p>
    }

    return (
      <div>
        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-3">
            {displayError}
          </div>
        )}
        <form
          onSubmit={async (e: FormEvent) => {
            e.preventDefault()
            setLocalError(null)
            const name = newName.trim()
            if (name.length < 2 || name.length > 40) {
              setLocalError('Имя должно быть от 2 до 40 символов.')
              return
            }
            setCreating(true)
            const result = await onCreateProfile(name)
            setCreating(false)
            if (!result.ok) {
              setLocalError(result.message)
            }
          }}
          className="space-y-3"
          noValidate
        >
          <p className="text-sm text-gray-600">
            Выберите имя, под которым вас будут видеть. <strong>Изменить его потом нельзя.</strong>
          </p>
          <div>
            <label htmlFor="profile-name" className={labelClass}>
              Отображаемое имя
            </label>
            <input
              id="profile-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Выбрать имя
          </button>
        </form>
      </div>
    )
  }

  // ====== Режим: читатель с профилем (без поля имени) ======
  const hideNameField = !isAdmin && profile !== null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    const name = isAdmin ? authorName.trim() : (profile?.display_name ?? authorName.trim())
    const text = body.trim()

    if (hideNameField) {
      // Имя уже из профиля — проверять не нужно
    } else if (name.length < 2 || name.length > 40) {
      setLocalError('Имя должно быть от 2 до 40 символов.')
      return
    }
    if (text.length < bodyMin || text.length > bodyMax) {
      setLocalError(`Текст должен быть от ${bodyMin} до ${bodyMax} символов.`)
      return
    }

    setLocalError(null)
    const sent = await onSubmit({ authorName: name, body: text })
    if (sent) setBody('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {displayError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {displayError}
        </div>
      )}

      {hideNameField && (
        <p className="text-sm text-gray-600">
          Вы пишете как: <strong>{profile!.display_name}</strong>
        </p>
      )}

      {!hideNameField && (
        <div>
          <label htmlFor="reader-name" className={labelClass}>
            Имя
          </label>
          <input
            id="reader-name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={40}
            className={inputClass}
          />
        </div>
      )}

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