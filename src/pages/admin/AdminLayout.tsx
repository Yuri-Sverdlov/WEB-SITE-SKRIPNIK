import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { SITE_TITLE } from '../../config/site'
import { usePageTitle } from '../../hooks/usePageTitle'

const adminNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded px-3 py-2 text-sm',
    isActive
      ? 'bg-border-light text-ink font-medium'
      : 'text-ink hover:bg-border-light/60',
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
  usePageTitle(`Кабинет — ${SITE_TITLE}`)

  if (authLoading || (user && adminLoading)) {
    return <p className="text-muted text-sm">Загрузка…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-ui text-ink font-bold mb-2">Нет доступа</h1>
        <p className="text-muted text-sm">
          Эта страница доступна только автору сайта.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-paper min-h-screen">
      <header className="border-b border-border-light">
        <div className="max-w-5xl mx-auto px-6 py-3 flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" className="text-ink font-ui font-semibold hover:text-accent">
            &larr; на сайт
          </Link>
          <span className="text-muted">Кабинет автора</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="md:w-52 shrink-0">
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
    </div>
  )
}