import { Link, Route, Routes } from 'react-router-dom'
import Contact from './pages/Contact'
import GuestBook from './pages/GuestBook'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import StoriesAll from './pages/StoriesAll'
import StoriesNew from './pages/StoriesNew'
import StoriesPopular from './pages/StoriesPopular'
import StoryDetail from './pages/StoryDetail'
import { useAuth } from './contexts/AuthProvider'

const navLinkClass =
  'text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1'

export default function App() {
  const { user, loading, signOut } = useAuth()

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
              <span className="text-gray-600">{user.email}</span>
              <button
                type="button"
                onClick={() => void signOut()}
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
        </Routes>
      </main>
    </div>
  )
}