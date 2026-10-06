import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Contact from './pages/Contact'
import GuestBook from './pages/GuestBook'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import StoriesAll from './pages/StoriesAll'
import StoriesNew from './pages/StoriesNew'
import StoriesPopular from './pages/StoriesPopular'
import StoryDetail from './pages/StoryDetail'
import AdminLayout from './pages/admin/AdminLayout'
import AdminStoriesList from './pages/admin/AdminStoriesList'
import AdminStoryForm from './pages/admin/AdminStoryForm'
import AdminComments from './pages/admin/AdminComments'
import AdminGuestbook from './pages/admin/AdminGuestbook'
import AdminBanned from './pages/admin/AdminBanned'
import { useAuth } from './contexts/AuthProvider'
import { useIsAdmin } from './hooks/useIsAdmin'

const navLinkClass =
  'text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1'

export default function App() {
  const navigate = useNavigate()
  const { user, loading, signOut } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen p-6 font-sans">
      <nav className="mb-8 flex flex-wrap items-center gap-4 text-sm">
        <Link to="/" className={navLinkClass}>
          Home
        </Link>
        <Link to="/stories/new" className={navLinkClass}>
          StoriesNew
        </Link>
        <Link to="/stories/popular" className={navLinkClass}>
          StoriesPopular
        </Link>
        <Link to="/stories/all" className={navLinkClass}>
          StoriesAll
        </Link>
        <Link to="/stories/example" className={navLinkClass}>
          StoryDetail
        </Link>
        <Link to="/contact" className={navLinkClass}>
          Contact
        </Link>
        <Link to="/guestbook" className={navLinkClass}>
          GuestBook
        </Link>

        <span className="ml-auto flex flex-wrap items-center gap-3">
          {loading ? (
            <span className="text-gray-400">…</span>
          ) : user ? (
            <>
              {!adminLoading && isAdmin && (
                <Link to="/admin" className={navLinkClass}>
                  Кабинет
                </Link>
              )}
              <span className="text-gray-600">{user.email}</span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={navLinkClass}>
                Войти
              </Link>
              <Link to="/register" className={navLinkClass}>
                Регистрация
              </Link>
            </>
          )}
        </span>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stories/new" element={<StoriesNew />} />
          <Route path="/stories/popular" element={<StoriesPopular />} />
          <Route path="/stories/all" element={<StoriesAll />} />
          <Route path="/stories/:id" element={<StoryDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/guestbook" element={<GuestBook />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="stories" replace />} />
            <Route path="stories">
              <Route index element={<AdminStoriesList />} />
              <Route path="new" element={<AdminStoryForm />} />
              <Route path=":id/edit" element={<AdminStoryForm />} />
            </Route>
            <Route path="comments" element={<AdminComments />} />
                        <Route path="guestbook" element={<AdminGuestbook />} />
                        <Route path="banned" element={<AdminBanned />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}