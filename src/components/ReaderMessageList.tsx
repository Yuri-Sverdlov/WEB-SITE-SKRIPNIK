export type ReaderMessage = {
  id: string
  authorName: string
  body: string
  createdAt: string
}

type Props = {
  items: ReaderMessage[]
  loading?: boolean
  error?: string | null
  /** Текст при пустом списке */
  emptyText?: string
}

function formatDateTime(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

/** Лента сообщений читателей: комментарии (TASK-008) и гостевая (TASK-009). */
export default function ReaderMessageList({
  items,
  loading = false,
  error = null,
  emptyText = 'Пока сообщений нет.',
}: Props) {
  if (loading) {
    return <p className="text-muted text-sm">Загрузка сообщений...</p>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-muted text-sm">{emptyText}</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="border border-border-light rounded-lg p-3 bg-white"
        >
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-1">
            <span className="font-medium text-ink">{item.authorName}</span>
            <span>{formatDateTime(item.createdAt)}</span>
          </div>
          <p className="text-ink leading-relaxed whitespace-pre-wrap break-words">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  )
}
