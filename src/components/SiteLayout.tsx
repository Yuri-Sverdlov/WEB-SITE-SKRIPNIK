import { Outlet } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import { SITE_TITLE } from '../config/site'
import { usePageTitle } from '../hooks/usePageTitle'

export default function SiteLayout() {
  usePageTitle(SITE_TITLE)

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