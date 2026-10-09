import { Navigate, Route, Routes } from 'react-router-dom'
import Contact from './pages/Contact'
import GuestBook from './pages/GuestBook'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import StoriesAll from './pages/StoriesAll'
import StoriesNew from './pages/StoriesNew'
import StoriesPopular from './pages/StoriesPopular'
import StoryDetail from './pages/StoryDetail'
import SiteLayout from './components/SiteLayout'
import AdminLayout from './pages/admin/AdminLayout'
import AdminStoriesList from './pages/admin/AdminStoriesList'
import AdminStoryForm from './pages/admin/AdminStoryForm'
import AdminComments from './pages/admin/AdminComments'
import AdminGuestbook from './pages/admin/AdminGuestbook'
import AdminBanned from './pages/admin/AdminBanned'

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/stories/new" element={<StoriesNew />} />
        <Route path="/stories/popular" element={<StoriesPopular />} />
        <Route path="/stories/all" element={<StoriesAll />} />
        <Route path="/stories/:id" element={<StoryDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/guestbook" element={<GuestBook />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

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
  )
}