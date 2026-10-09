import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { SITE_TITLE } from '../config/site'
import { usePageTitle } from '../hooks/usePageTitle'

const navClass = ({ isActive }: { isActive: boolean }) =>
  ['text-sm', isActive ? 'text-ink font-semibold' : 'text-ink hover:text-accent'].join(' ')

const sections = [
  { to: '/', label: 'Об авторе', end: true },
  { to: '/stories/new', label: 'Рассказы', end: false },
  { to: '/guestbook', label: 'Гостевая книга', end: true },
  { to: '/contact', label: 'Связь', end: true },
] as const

export default function SiteHeader() {
  usePageTitle(SITE_TITLE)
  const { user, loading, signOut } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-border-light bg-paper">
      <nav className="max-w-4xl mx-auto px-8 md:px-12 py-4 flex flex-wrap items-center gap-5 text-sm">
        <NavLink to="/" end className="text-lg font-ui text-ink font-semibold tracking-tight">
          {SITE_TITLE}
        </NavLink>

        {sections.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={navClass}>
            {label}
          </NavLink>
        ))}

        <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          {loading ? (
            <span className="text-muted">…</span>
          ) : user ? (
            <>
              {!adminLoading && isAdmin && (
                <NavLink to="/admin/stories" end className={navClass}>
                  Кабинет
                </NavLink>
              )}
              <span className="text-muted">{user.email}</span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-accent hover:underline text-sm"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" end className={navClass}>
                Войти
              </NavLink>
              <NavLink to="/register" end className={navClass}>
                Регистрация
              </NavLink>
            </>
          )}
        </span>
      </nav>
    </header>
  )
}