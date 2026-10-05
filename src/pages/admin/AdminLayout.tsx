import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import { useIsAdmin } from '../../hooks/useIsAdmin'

const adminNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded px-3 py-2 text-sm',
    isActive
      ? 'bg-blue-100 text-blue-900 font-medium'
      : 'text-gray-700 hover:bg-gray-100',
  ].join(' ')

const sections = [
  { to: 'stories', label: 'Рассказы' },
  { to: 'comments', label: 'Комментарии' },
  { to: 'guestbook', label: 'Гостевая книга' },
  { to: 'banned', label: 'Заблокированные' },
] as const

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  if (authLoading || (user && adminLoading)) {
    return <p className="text-gray-500 text-sm">Загрузка…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-2">Нет доступа</h1>
        <p className="text-gray-600 text-sm">
          Эта страница доступна только автору сайта.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <aside className="md:w-52 shrink-0">
        <h2 className="text-lg font-semibold mb-3">Кабинет автора</h2>
        <nav className="flex flex-col gap-1">
          {sections.map(({ to, label }) => (
            <NavLink key={to} to={to} className={adminNavLinkClass} end={false}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
