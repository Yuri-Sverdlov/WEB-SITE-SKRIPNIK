import { Outlet } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

export default function SiteLayout() {
  return (
    <div className="bg-paper min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full px-8 md:px-12 py-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}