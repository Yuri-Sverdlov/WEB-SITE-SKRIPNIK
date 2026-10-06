import { useEffect, useState } from 'react'
import { fetchBannedUsers, unbanUser } from '../../api/adminModeration'
import type { AdminBannedUser } from '../../api/adminModeration'

function fmt(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('ru-RU') } catch { return d }
}

export default function AdminBanned() {
  const [users, setUsers] = useState<AdminBannedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unbanning, setUnbanning] = useState(false)

  function refetch() {
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      const r = await fetchBannedUsers()
      if (cancelled) return
      if (r.error) { setError(r.error); setLoading(false); return }
      setUsers(r.data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleUnban(userId: string) {
    if (unbanning) return
    setUnbanning(true)
    const { error: err } = await unbanUser(userId)
    setUnbanning(false)
    if (err) { setError(err); return }
    refetch()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">Заблокированные</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3 text-sm">{error}</div>}

      {loading && <p className="text-gray-500 text-sm">Загрузка…</p>}

      {!loading && users.length === 0 && <p className="text-gray-500 text-sm">Нет заблокированных пользователей.</p>}

      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 px-2">Имя</th>
                <th className="py-2 px-2 w-36">Дата бана</th>
                <th className="py-2 px-2">Причина</th>
                <th className="py-2 px-2 w-28">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 max-w-48 truncate">{u.last_name}</td>
                  <td className="py-2 px-2 text-gray-500 text-xs">{fmt(u.banned_at)}</td>
                  <td className="py-2 px-2 text-gray-500 text-xs max-w-64 truncate">{u.reason || '—'}</td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => void handleUnban(u.user_id)}
                      disabled={unbanning}
                      className="text-blue-600 hover:underline text-xs disabled:opacity-40"
                    >
                      Разблокировать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}