import { Link, Route, Routes } from 'react-router-dom'
import Contact from './pages/Contact'
import GuestBook from './pages/GuestBook'
import Home from './pages/Home'
import StoriesAll from './pages/StoriesAll'
import StoriesNew from './pages/StoriesNew'
import StoriesPopular from './pages/StoriesPopular'
import StoryDetail from './pages/StoryDetail'

const navLinkClass =
  'text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1'

export default function App() {
  return (
    <div className="min-h-screen p-6 font-sans">
      <nav className="mb-8 flex flex-wrap gap-4 text-sm">
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
        </Routes>
      </main>
    </div>
  )
}
